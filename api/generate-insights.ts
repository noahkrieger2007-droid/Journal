// Vercel Serverless Function: generate-insights
// Generates weekly review and pattern insights using Claude
import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    const { userId, language, type } = req.body;

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    const isDE = language === "de";
    const daysBack = type === "weekly" ? 7 : 30;
    const since = new Date();
    since.setDate(since.getDate() - daysBack);

    const [{ data: entries }, { data: goals }, { data: memories }] = await Promise.all([
      supabase
        .from("journal_entries")
        .select(`*, categories:entry_categories(*), achievements(*)`)
        .eq("user_id", userId)
        .eq("processing_status", "done")
        .gte("date", since.toISOString().split("T")[0])
        .order("date", { ascending: true }),
      supabase
        .from("goals")
        .select("title, category, status, deadline, progress")
        .eq("user_id", userId)
        .eq("status", "ACTIVE"),
      supabase
        .from("memories")
        .select("type, content, importance")
        .eq("user_id", userId)
        .order("importance", { ascending: false })
        .limit(20),
    ]);

    if (!entries || entries.length === 0) {
      return res.status(400).json({ error: "Not enough entries" });
    }

    const entrySummaries = entries.map((e: any) => {
      const cats = e.categories?.map((c: any) => c.category_name).join(", ") || "–";
      const achs = e.achievements?.map((a: any) => a.description).join("; ") || "–";
      return [
        `### ${e.date} | Mood: ${e.mood_score || "?"}/10 | Energy: ${e.energy_score || "?"}/10`,
        `Categories: ${cats}`,
        `Achievements: ${achs}`,
        e.highlights ? `Highlight: ${e.highlights}` : "",
        e.ai_summary ? e.ai_summary.slice(0, 400) : "",
      ].filter(Boolean).join("\n");
    }).join("\n\n---\n\n");

    const goalsContext = goals && goals.length > 0
      ? (isDE ? "\n\nAktive Ziele:\n" : "\n\nActive goals:\n") + goals.map((g: any) => `- [${g.category}] ${g.title} (${g.progress}%)`).join("\n")
      : "";

    const memoriesContext = memories && memories.length > 0
      ? (isDE ? "\n\nBekannte Fakten über den Nutzer:\n" : "\n\nKnown facts about user:\n") + memories.map((m: any) => `- ${m.content}`).join("\n")
      : "";

    let systemPrompt: string;
    let userPrompt: string;
    let jsonSchema: string;

    if (type === "weekly") {
      systemPrompt = isDE
        ? `Du bist NOVA, ein persönlicher KI-Lebensassistent. Erstelle einen tiefgründigen Wochenrückblick der wirklich hilfreich ist. Nicht generisch — erkenne echte Muster, Fortschritte und Baustellen. Antworte nur mit JSON.`
        : `You are NOVA, a personal AI life assistant. Create a genuinely helpful weekly review. Not generic — spot real patterns, progress and challenges. Respond only with JSON.`;
      userPrompt = isDE
        ? `Erstelle einen Wochenrückblick für die letzten ${entries.length} Einträge:${goalsContext}${memoriesContext}\n\n${entrySummaries}`
        : `Create a weekly review for these ${entries.length} entries:${goalsContext}${memoriesContext}\n\n${entrySummaries}`;
      jsonSchema = `{
  "ai_reflection": "string — 2 paragraphs, warm personal reflection",
  "mood_average": number,
  "energy_average": number,
  "best_day": "string — which day and why",
  "hardest_day": "string or null",
  "top_insight": "string — the most important observation",
  "patterns": ["string — 2-3 specific patterns"],
  "goal_progress": "string or null",
  "reflection_questions": ["3 personal, specific questions based on this week"]
}`;
    } else {
      systemPrompt = isDE
        ? `Du bist NOVA, ein persönlicher KI-Lebensassistent. Analysiere 30 Tage Tagebuchdaten und erkenne tiefe Muster. Sei spezifisch, ehrlich und hilfreich. Antworte nur mit JSON.`
        : `You are NOVA, a personal AI life assistant. Analyze 30 days of journal data and find deep patterns. Be specific, honest and helpful. Respond only with JSON.`;
      userPrompt = isDE
        ? `Analysiere 30 Tage und erkenne Muster:${goalsContext}${memoriesContext}\n\n${entrySummaries}`
        : `Analyze 30 days and detect patterns:${goalsContext}${memoriesContext}\n\n${entrySummaries}`;
      jsonSchema = `{
  "patterns": ["3-5 specific patterns like 'Your mood drops on Sundays'"],
  "correlations": ["2-3 correlations between activities, mood and energy"],
  "mood_trend": "string — is mood improving, declining or stable?",
  "biggest_win": "string — most impressive achievement of the 30 days",
  "biggest_challenge": "string — recurring challenge that needs attention",
  "recommendation": "string — ONE highly specific actionable recommendation",
  "highlight": "string — the single standout moment of the past month"
}`;
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: `${userPrompt}\n\nJSON schema:\n${jsonSchema}` }],
    });

    const content = message.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    const rawText = content.text.trim();
    let result: any;
    const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      result = JSON.parse(codeBlockMatch[1]);
    } else {
      const jsonStart = rawText.indexOf("{");
      const jsonEnd = rawText.lastIndexOf("}");
      if (jsonStart === -1 || jsonEnd === -1) throw new Error("No JSON found in response");
      result = JSON.parse(rawText.slice(jsonStart, jsonEnd + 1));
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("generate-insights error:", error);
    return res.status(500).json({ error: (error as Error).message });
  }
}
