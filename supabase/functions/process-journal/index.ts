// Supabase Edge Function: process-journal
// Runs server-side — Anthropic API key never leaves this function
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Anthropic from "https://esm.sh/@anthropic-ai/sdk@0.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    if (entryError || !entry) throw new Error("Entry not found: " + entryError?.message);

    // Fetch rich context: recent entries, stored memories, active goals
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [
      { data: recentEntries },
      { data: memories },
      { data: goals },
      { data: allEntries },
    ] = await Promise.all([
      supabase
        .from("journal_entries")
        .select("date, ai_summary, mood_score, energy_score, highlights, raw_text")
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
        .limit(40),

      supabase
        .from("goals")
        .select("title, category, status, deadline, progress")
        .eq("user_id", userId)
        .in("status", ["ACTIVE", "PAUSED"]),

      // Mood trend over 30 days
      supabase
        .from("journal_entries")
        .select("date, mood_score, energy_score")
        .eq("user_id", userId)
        .eq("processing_status", "done")
        .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
        .order("date", { ascending: true })
        .limit(30),
    ]);

    const isDE = language === "de";

    // Build mood trend context
    let moodTrend = "";
    if (allEntries && allEntries.length > 0) {
      const avgMood = allEntries.filter(e => e.mood_score).reduce((s, e) => s + e.mood_score, 0) / allEntries.filter(e => e.mood_score).length;
      const avgEnergy = allEntries.filter(e => e.energy_score).reduce((s, e) => s + e.energy_score, 0) / allEntries.filter(e => e.energy_score).length;
      moodTrend = isDE
        ? `30-Tage-Durchschnitt: Stimmung ${avgMood.toFixed(1)}/10, Energie ${avgEnergy.toFixed(1)}/10\n`
        : `30-day average: Mood ${avgMood.toFixed(1)}/10, Energy ${avgEnergy.toFixed(1)}/10\n`;
    }

    // Build context block
    let contextBlock = "";

    if (memories && memories.length > 0) {
      contextBlock += isDE ? "## Persönliche Erinnerungen über den Nutzer:\n" : "## Known facts about the user:\n";
      const grouped: Record<string, string[]> = {};
      memories.forEach(m => {
        if (!grouped[m.type]) grouped[m.type] = [];
        grouped[m.type].push(m.content);
      });
      for (const [type, items] of Object.entries(grouped)) {
        contextBlock += `**${type}**: ${items.join(" | ")}\n`;
      }
      contextBlock += "\n";
    }

    if (goals && goals.length > 0) {
      contextBlock += isDE ? "## Aktive Ziele:\n" : "## Active goals:\n";
      goals.forEach(g => {
        const deadline = g.deadline ? ` (${isDE ? "Frist" : "deadline"}: ${g.deadline})` : "";
        const progress = g.progress > 0 ? ` [${g.progress}% abgeschlossen]` : "";
        contextBlock += `- [${g.category}] ${g.title}${deadline}${progress}\n`;
      });
      contextBlock += "\n";
    }

    if (recentEntries && recentEntries.length > 0) {
      contextBlock += isDE ? "## Letzte 7 Tage (Kontext):\n" : "## Past 7 days (context):\n";
      recentEntries.forEach(e => {
        const mood = e.mood_score ? ` | ${isDE ? "Stimmung" : "Mood"}: ${e.mood_score}/10` : "";
        const energy = e.energy_score ? ` | ${isDE ? "Energie" : "Energy"}: ${e.energy_score}/10` : "";
        contextBlock += `**${e.date}**${mood}${energy}\n`;
        if (e.highlights) contextBlock += `  → ${e.highlights}\n`;
        if (e.ai_summary) contextBlock += `  ${e.ai_summary.slice(0, 200)}…\n`;
        contextBlock += "\n";
      });
    }

    if (moodTrend) contextBlock += moodTrend;

    const systemPrompt = isDE
      ? `Du bist NOVA, ein persönlicher KI-Lebensassistent und Journal-Analytiker. Du kennst den Nutzer aus früheren Einträgen gut.

${contextBlock}

DEINE AUFGABE ist es, diesen Tagebucheintrag TIEFGRÜNDIG zu analysieren — nicht nur zusammenzufassen. Sei wie ein kluger Freund, der Muster erkennt, ehrlich ist und konkrete Beobachtungen macht.

Wichtig:
- Erkenne MUSTER (z.B. "Du hast wieder spät geschlafen", "Heute war deine Energie ungewöhnlich hoch")
- Verweise auf ZIELE und ob der Nutzer darauf hinarbeitet oder abweicht
- Bemerke VERÄNDERUNGEN im Vergleich zu letzter Woche
- Gib KONKRETE Beobachtungen, keine generischen Phrasen
- Die Zusammenfassung soll sich anfühlen als würde ein Freund den Tag reflektieren
- Extrahiere alle FAKTEN, GEWOHNHEITEN und ERKENNTNISSE für das Gedächtnis

Antworte NUR mit validem JSON, kein anderer Text.`
      : `You are NOVA, a personal AI life assistant and journal analyst. You know the user well from past entries.

${contextBlock}

YOUR TASK is to DEEPLY analyze this journal entry — not just summarize it. Be like a smart friend who spots patterns, is honest, and makes specific observations.

Important:
- Recognize PATTERNS (e.g. "You slept late again", "Your energy was unusually high today")
- Reference GOALS and whether the user is working toward or drifting from them
- Note CHANGES compared to last week
- Give SPECIFIC observations, not generic phrases
- The summary should feel like a thoughtful friend reflecting on the day
- Extract all FACTS, HABITS and INSIGHTS for memory

Respond ONLY with valid JSON, no other text.`;

    const userPrompt = isDE
      ? `Analysiere diesen Tagebucheintrag vom ${entry.date}:\n\n${entry.raw_text}\n\nGib die Antwort als JSON zurück mit genau diesem Schema:`
      : `Analyze this journal entry from ${entry.date}:\n\n${entry.raw_text}\n\nReturn the response as JSON with exactly this schema:`;

    const jsonSchema = `{
  "summary": "string — 2-3 paragraphs, personal and reflective, like a thoughtful friend summarizing the day. Reference past entries or goals if relevant. NOT a copy of the raw text.",
  "highlights": "string — ONE sentence: the single most important thing about this day",
  "mood_score": number between 1-10,
  "energy_score": number between 1-10,
  "mood_reasoning": "string — brief reason for the mood score (what caused it?)",
  "categories": [
    {"name": "SPORT|SOCIAL|LEARNING|WORK|HEALTH|MINDSET|GOALS|OTHER", "duration_minutes": number or null}
  ],
  "achievements": ["string — concrete accomplishments, not vague"],
  "challenges": ["string — what was difficult or unresolved"],
  "key_topics": ["string array — main topics/keywords"],
  "new_memories": [
    {"type": "FACT|EVENT|GOAL|HABIT|INSIGHT", "content": "specific fact about the user", "importance": number 1-10}
  ],
  "pattern_observation": "string or null — any notable pattern compared to recent entries (e.g. 'You've mentioned poor sleep 3 times this week')",
  "goal_progress": "string or null — specific comment on goal progress if any goals were mentioned"
}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `${userPrompt}\n\n${jsonSchema}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") throw new Error("Unexpected Claude response type");

    const rawText = content.text.trim();

    // Extract JSON robustly
    let parsed: any;
    const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      parsed = JSON.parse(codeBlockMatch[1]);
    } else {
      const jsonStart = rawText.indexOf("{");
      const jsonEnd = rawText.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON found in Claude response");
      parsed = JSON.parse(rawText.slice(jsonStart, jsonEnd + 1));
    }

    // Enrich the response with extra fields
    const result = {
      summary: parsed.summary || "",
      highlights: parsed.highlights || "",
      mood_score: Number(parsed.mood_score) || null,
      energy_score: Number(parsed.energy_score) || null,
      mood_reasoning: parsed.mood_reasoning || null,
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
      challenges: Array.isArray(parsed.challenges) ? parsed.challenges : [],
      key_topics: Array.isArray(parsed.key_topics) ? parsed.key_topics : [],
      new_memories: Array.isArray(parsed.new_memories) ? parsed.new_memories : [],
      pattern_observation: parsed.pattern_observation || null,
      goal_progress: parsed.goal_progress || null,
    };

    // Update goal last_mentioned_at
    if (result.key_topics.length > 0 && goals && goals.length > 0) {
      const mentionedGoals = goals.filter(g =>
        result.key_topics.some((t: string) =>
          g.title.toLowerCase().includes(t.toLowerCase()) ||
          t.toLowerCase().includes(g.title.toLowerCase())
        )
      );
      if (mentionedGoals.length > 0) {
        await supabase
          .from("goals")
          .update({ last_mentioned_at: new Date().toISOString() })
          .eq("user_id", userId)
          .in("title", mentionedGoals.map(g => g.title));
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("process-journal error:", error);
    const message = (error as Error).message || "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
