// Supabase Edge Function: generate-insights
// Generates weekly review and pattern insights using Claude
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
    const { userId, language, type } = await req.json();
    // type: "weekly" | "insights"

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

    const { data: entries } = await supabase
      .from("journal_entries")
      .select(
        `*, categories:entry_categories(*), achievements(*)`
      )
      .eq("user_id", userId)
      .eq("processing_status", "done")
      .gte("date", since.toISOString().split("T")[0])
      .order("date", { ascending: true });

    if (!entries || entries.length === 0) {
      return new Response(
        JSON.stringify({ error: "Not enough entries" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const entrySummaries = entries
      .map((e) => {
        const cats = e.categories?.map((c: any) => c.category_name).join(", ");
        return `${e.date} | Stimmung: ${e.mood_score}/10 | Energie: ${e.energy_score}/10 | Kategorien: ${cats}\n${e.ai_summary?.slice(0, 300)}`;
      })
      .join("\n\n---\n\n");

    let prompt = "";
    let jsonSchema = "";

    if (type === "weekly") {
      prompt = isDE
        ? `Erstelle einen Wochenrückblick basierend auf diesen ${entries.length} Einträgen:\n\n${entrySummaries}\n\nJSON-Schema:`
        : `Create a weekly review based on these ${entries.length} entries:\n\n${entrySummaries}\n\nJSON schema:`;

      jsonSchema = `{
  "ai_reflection": "string (2 paragraphs, warm personal reflection on the week)",
  "reflection_questions": ["3 personal questions based on actual week"],
  "mood_average": number,
  "energy_average": number,
  "top_insight": "string (most important pattern or observation)"
}`;
    } else {
      prompt = isDE
        ? `Analysiere die letzten 30 Tage und erkenne Muster:\n\n${entrySummaries}\n\nJSON-Schema:`
        : `Analyze the last 30 days and detect patterns:\n\n${entrySummaries}\n\nJSON schema:`;

      jsonSchema = `{
  "patterns": ["string array, 3-5 patterns like 'Du trainierst mehr wenn...'"],
  "correlations": ["string array, 2-3 correlations between mood/energy/activities"],
  "recommendation": "string (one specific actionable recommendation)",
  "highlight": "string (best achievement of the period)"
}`;
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: `${prompt}\n\n${jsonSchema}` }],
      system: isDE
        ? "Du bist NOVA, ein KI-Journal-Assistent. Antworte nur mit validem JSON."
        : "You are NOVA, an AI journal assistant. Respond only with valid JSON.",
    });

    const content = message.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    const rawText = content.text.trim();
    const jsonMatch =
      rawText.match(/```(?:json)?\n?([\s\S]*?)\n?```/) ||
      rawText.match(/(\{[\s\S]*\})/);

    if (!jsonMatch) throw new Error("No JSON in response");

    const result = JSON.parse(jsonMatch[1] || jsonMatch[0]);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
