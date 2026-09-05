// Vercel Serverless Function: process-journal
// Runs server-side — Anthropic API key never leaves this function
import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { entryId, userId, language } = req.body;

    if (!entryId || !userId) {
      return res.status(400).json({ error: "Missing entryId or userId" });
    }

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    // Fetch the entry
    const { data: entry, error: entryError } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("id", entryId)
      .single();

    if (entryError || !entry) {
      return res.status(404).json({ error: "Entry not found: " + entryError?.message });
    }

    // Fetch rich context
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

    let moodTrend = "";
    if (allEntries && allEntries.length > 0) {
      const withMood = allEntries.filter((e: any) => e.mood_score);
      const withEnergy = allEntries.filter((e: any) => e.energy_score);
      const avgMood = withMood.length > 0 ? withMood.reduce((s: number, e: any) => s + e.mood_score, 0) / withMood.length : 0;
      const avgEnergy = withEnergy.length > 0 ? withEnergy.reduce((s: number, e: any) => s + e.energy_score, 0) / withEnergy.length : 0;
      if (withMood.length > 0) {
        moodTrend = isDE
          ? `30-Tage-Durchschnitt: Stimmung ${avgMood.toFixed(1)}/10, Energie ${avgEnergy.toFixed(1)}/10\n`
          : `30-day average: Mood ${avgMood.toFixed(1)}/10, Energy ${avgEnergy.toFixed(1)}/10\n`;
      }
    }

    let contextBlock = "";
    if (memories && memories.length > 0) {
      contextBlock += isDE ? "## Persönliche Erinnerungen über den Nutzer:\n" : "## Known facts about the user:\n";
      const grouped: Record<string, string[]> = {};
      memories.forEach((m: any) => {
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
      goals.forEach((g: any) => {
        const deadline = g.deadline ? ` (${isDE ? "Frist" : "deadline"}: ${g.deadline})` : "";
        const progress = g.progress > 0 ? ` [${g.progress}%]` : "";
        contextBlock += `- [${g.category}] ${g.title}${deadline}${progress}\n`;
      });
      contextBlock += "\n";
    }

    if (recentEntries && recentEntries.length > 0) {
      contextBlock += isDE ? "## Letzte 7 Tage (Kontext):\n" : "## Past 7 days (context):\n";
      recentEntries.forEach((e: any) => {
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
      ? `Du bist NOVA, ein persönlicher KI-Lebensassistent und Journal-Analytiker. Du kennst den Nutzer aus früheren Einträgen gut.\n\n${contextBlock}\n\nDEINE AUFGABE ist es, diesen Tagebucheintrag TIEFGRÜNDIG zu analysieren — nicht nur zusammenzufassen. Sei wie ein kluger Freund, der Muster erkennt, ehrlich ist und konkrete Beobachtungen macht.\n\nWichtig:\n- Erkenne MUSTER (z.B. "Du hast wieder spät geschlafen", "Heute war deine Energie ungewöhnlich hoch")\n- Verweise auf ZIELE und ob der Nutzer darauf hinarbeitet oder abweicht\n- Bemerke VERÄNDERUNGEN im Vergleich zu letzter Woche\n- Gib KONKRETE Beobachtungen, keine generischen Phrasen\n- Die Zusammenfassung soll sich anfühlen als würde ein Freund den Tag reflektieren\n- Extrahiere alle FAKTEN, GEWOHNHEITEN und ERKENNTNISSE für das Gedächtnis\n\nAntworte NUR mit validem JSON, kein anderer Text.`
      : `You are NOVA, a personal AI life assistant and journal analyst. You know the user well from past entries.\n\n${contextBlock}\n\nYOUR TASK is to DEEPLY analyze this journal entry — not just summarize it. Be like a smart friend who spots patterns, is honest, and makes specific observations.\n\nImportant:\n- Recognize PATTERNS (e.g. "You slept late again", "Your energy was unusually high today")\n- Reference GOALS and whether the user is working toward or drifting from them\n- Note CHANGES compared to last week\n- Give SPECIFIC observations, not generic phrases\n- The summary should feel like a thoughtful friend reflecting on the day\n- Extract all FACTS, HABITS and INSIGHTS for memory\n\nRespond ONLY with valid JSON, no other text.`;

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
  "pattern_observation": "string or null — any notable pattern compared to recent entries",
  "goal_progress": "string or null — specific comment on goal progress if any goals were mentioned"
}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: `${userPrompt}\n\n${jsonSchema}` }],
    });

    const content = message.content[0];
    if (content.type !== "text") throw new Error("Unexpected Claude response type");

    const rawText = content.text.trim();
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
      const mentionedGoals = (goals as any[]).filter((g: any) =>
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
          .in("title", mentionedGoals.map((g: any) => g.title));
      }
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("process-journal error:", error);
    return res.status(500).json({ error: (error as Error).message });
  }
}
