// Supabase Edge Function: generate-insights
// Generates weekly review and pattern insights using Claude
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
    const { userId, language, type } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const anthropic = new Anthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
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
      return new Response(
        JSON.stringify({ error: "Not enough entries" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const entrySummaries = entries.map(e => {
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
      ? (isDE ? "\n\nAktive Ziele:\n" : "\n\nActive goals:\n") + goals.map(g => `- [${g.category}] ${g.title} (${g.progress}%)`).join("\n")
      : "";

    const memoriesContext = memories && memories.length > 0
      ? (isDE ? "\n\nBekannte Fakten über den Nutzer:\n" : "\n\nKnown facts about user:\n") + memories.map(m => `- ${m.content}`).join("\n")
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
  "ai_reflection": "string — 2 paragraphs, warm personal reflection. Reference specific days and events. Connect to goals if relevant.",
  "mood_average": number,
  "energy_average": number,
  "best_day": "string — which day and why",
  "hardest_day": "string or null — which day was hardest",
  "top_insight": "string — the most important observation about this week",
  "patterns": ["string — 2-3 specific patterns observed this week"],
  "goal_progress": "string or null — how are active goals going?",
  "reflection_questions": ["3 personal, specific questions based on THIS week's actual content"]
}`;
    } else {
      systemPrompt = isDE
        ? `Du bist NOVA, ein persönlicher KI-Lebensassistent. Analysiere 30 Tage Tagebuchdaten und erkenne tiefe Muster im Leben des Nutzers. Sei spezifisch, ehrlich und hilfreich. Antworte nur mit JSON.`
        : `You are NOVA, a personal AI life assistant. Analyze 30 days of journal data and find deep patterns in the user's life. Be specific, honest and helpful. Respond only with JSON.`;

      userPrompt = isDE
        ? `Analysiere 30 Tage und erkenne Muster:${goalsContext}${memoriesContext}\n\n${entrySummaries}`
        : `Analyze 30 days and detect patterns:${goalsContext}${memoriesContext}\n\n${entrySummaries}`;

      jsonSchema = `{
  "patterns": ["3-5 specific patterns like 'Your mood drops on Sundays', 'You train more when you slept well'"],
  "correlations": ["2-3 correlations between activities, mood and energy with specific examples"],
  "mood_trend": "string — is mood improving, declining or stable over the period?",
  "biggest_win": "string — most impressive achievement of the 30 days",
  "biggest_challenge": "string — recurring challenge that needs attention",
  "recommendation": "string — ONE highly specific actionable recommendation based on the data",
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

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("generate-insights error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
