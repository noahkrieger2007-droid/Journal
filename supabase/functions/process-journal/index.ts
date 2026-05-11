// Supabase Edge Function: process-journal
// Runs server-side — Anthropic API key never leaves this function
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { entryId, userId, language } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const anthropic = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
    });

    // Fetch the entry
    const { data: entry, error: entryError } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("id", entryId)
      .single();

    if (entryError || !entry) {
      throw new Error("Entry not found");
    }

    // Build memory context
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [{ data: recentEntries }, { data: memories }, { data: goals }] =
      await Promise.all([
        supabase
          .from("journal_entries")
          .select("date, ai_summary, mood_score, highlights")
          .eq("user_id", userId)
          .eq("processing_status", "done")
          .neq("id", entryId)
          .gte("date", sevenDaysAgo.toISOString().split("T")[0])
          .order("date", { ascending: false })
          .limit(7),

        supabase
          .from("memories")
          .select("type, content, importance")
          .eq("user_id", userId)
          .order("importance", { ascending: false })
          .order("last_referenced_at", { ascending: false })
          .limit(30),

        supabase
          .from("goals")
          .select("title, category, status, deadline")
          .eq("user_id", userId)
          .eq("status", "ACTIVE"),
      ]);

    const isDE = language === "de";

    // Format memory context block
    let memoryBlock = "";
    if (memories && memories.length > 0) {
      memoryBlock += isDE
        ? "## Was ich über den Nutzer weiß (aus früheren Einträgen):\n"
        : "## What I know about the user (from past entries):\n";
      memories.forEach((m) => {
        memoryBlock += `- [${m.type}] ${m.content}\n`;
      });
      memoryBlock += "\n";
    }

    if (goals && goals.length > 0) {
      memoryBlock += isDE
        ? "## Aktive Ziele des Nutzers:\n"
        : "## User's active goals:\n";
      goals.forEach((g) => {
        const deadline = g.deadline
          ? (isDE ? `, Frist: ${g.deadline}` : `, deadline: ${g.deadline}`)
          : "";
        memoryBlock += `- [${g.category}] ${g.title}${deadline}\n`;
      });
      memoryBlock += "\n";
    }

    if (recentEntries && recentEntries.length > 0) {
      memoryBlock += isDE
        ? "## Letzte Einträge (Kontext):\n"
        : "## Recent entries (context):\n";
      recentEntries.forEach((e) => {
        const mood = e.mood_score
          ? (isDE
              ? ` | Stimmung: ${e.mood_score}/10`
              : ` | Mood: ${e.mood_score}/10`)
          : "";
        memoryBlock += `**${e.date}**${mood}\n`;
        if (e.ai_summary) {
          memoryBlock += e.ai_summary.slice(0, 400) + "...\n";
        }
        memoryBlock += "\n";
      });
    }

    const systemPrompt = isDE
      ? `Du bist NOVA, ein persönlicher KI-Journal-Assistent. Du kennst den Nutzer gut und schreibst empathisch, präzise und auf Augenhöhe.
Du analysierst Tagebucheinträge und gibst strukturierte Antworten im JSON-Format zurück.

KONTEXT ÜBER DEN NUTZER:
${memoryBlock}

Deine Aufgabe:
1. Schreibe eine schöne, persönliche Zusammenfassung des Tages (2-3 Absätze, auf Deutsch, warm und reflektierend)
2. Erkenne Kategorien automatisch
3. Extrahiere Highlights, Errungenschaften, Stimmung und Energie
4. Extrahiere neue Erinnerungen die du über den Nutzer gelernt hast
5. Verweise auf Muster, Ziele oder frühere Einträge wenn sinnvoll

Antworte NUR mit validem JSON, kein Text außerhalb.`
      : `You are NOVA, a personal AI journal assistant. You know the user well and write empathetically, precisely, and on equal terms.
You analyze journal entries and return structured responses in JSON format.

USER CONTEXT:
${memoryBlock}

Your task:
1. Write a beautiful, personal summary of the day (2-3 paragraphs, warm and reflective)
2. Auto-detect categories
3. Extract highlights, achievements, mood, and energy
4. Extract new memories you learned about the user
5. Reference patterns, goals, or past entries when relevant

Respond ONLY with valid JSON, no text outside.`;

    const userPrompt = isDE
      ? `Analysiere diesen Tagebucheintrag vom ${entry.date}:\n\n"${entry.raw_text}"\n\nGib die Antwort als JSON zurück:`
      : `Analyze this journal entry from ${entry.date}:\n\n"${entry.raw_text}"\n\nReturn the response as JSON:`;

    const jsonSchema = `{
  "summary": "string (2-3 beautiful paragraphs about the day)",
  "categories": [{"name": "SPORT|SOCIAL|LEARNING|WORK|HEALTH|MINDSET|GOALS|OTHER", "duration_minutes": number|null}],
  "mood_score": "number 1-10",
  "energy_score": "number 1-10",
  "achievements": ["string array"],
  "key_topics": ["string array"],
  "highlights": "string (one-line highlight of the day)",
  "new_memories": [{"type": "FACT|EVENT|GOAL|HABIT|INSIGHT", "content": "string", "importance": "number 1-10"}],
  "intention_comparison": "string|null (only if there was a morning intention)"
}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: `${userPrompt}\n\nExpected JSON schema:\n${jsonSchema}`,
        },
      ],
      system: systemPrompt,
    });

    const content = message.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    // Extract JSON from response (handle markdown code blocks)
    const rawText = content.text.trim();
    const jsonMatch =
      rawText.match(/```(?:json)?\n?([\s\S]*?)\n?```/) ||
      rawText.match(/(\{[\s\S]*\})/);

    if (!jsonMatch) throw new Error("No JSON found in Claude response");

    const processed = JSON.parse(jsonMatch[1] || jsonMatch[0]);

    // Update goal last_mentioned_at for any mentioned goals
    if (processed.key_topics && goals) {
      const mentionedGoalIds = goals
        .filter((g) =>
          processed.key_topics.some(
            (t: string) =>
              g.title.toLowerCase().includes(t.toLowerCase()) ||
              t.toLowerCase().includes(g.title.toLowerCase())
          )
        )
        .map((g: { title: string }) => g.title);

      if (mentionedGoalIds.length > 0) {
        await supabase
          .from("goals")
          .update({ last_mentioned_at: new Date().toISOString() })
          .eq("user_id", userId)
          .in("title", mentionedGoalIds);
      }
    }

    return new Response(JSON.stringify(processed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("process-journal error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
