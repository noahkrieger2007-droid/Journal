/**
 * Memory system: fetches relevant context (recent entries + stored memories)
 * that gets injected into every Claude prompt to create continuity.
 */
import { supabase } from "./supabase";
import type { Memory, JournalEntry } from "@/types";

export interface MemoryContext {
  recentEntries: Array<{
    date: string;
    summary: string;
    mood_score: number | null;
    highlights: string | null;
  }>;
  memories: Memory[];
}

export async function buildMemoryContext(userId: string): Promise<MemoryContext> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [entriesResult, memoriesResult] = await Promise.all([
    supabase
      .from("journal_entries")
      .select("date, ai_summary, mood_score, highlights")
      .eq("user_id", userId)
      .eq("processing_status", "done")
      .gte("date", sevenDaysAgo.toISOString().split("T")[0])
      .order("date", { ascending: false })
      .limit(7),

    supabase
      .from("memories")
      .select("*")
      .eq("user_id", userId)
      .order("importance", { ascending: false })
      .order("last_referenced_at", { ascending: false })
      .limit(30),
  ]);

  return {
    recentEntries: (entriesResult.data || []).map((e) => ({
      date: e.date,
      summary: e.ai_summary || "",
      mood_score: e.mood_score,
      highlights: e.highlights,
    })),
    memories: memoriesResult.data || [],
  };
}

export function formatMemoryContextForPrompt(
  ctx: MemoryContext,
  language: "de" | "en"
): string {
  const lines: string[] = [];

  if (ctx.memories.length > 0) {
    lines.push(language === "de" ? "## Was ich über den Nutzer weiß:" : "## What I know about the user:");
    ctx.memories.forEach((m) => {
      lines.push(`- [${m.type}] ${m.content}`);
    });
    lines.push("");
  }

  if (ctx.recentEntries.length > 0) {
    lines.push(
      language === "de"
        ? "## Letzte Journal-Einträge (zur Kontinuität):"
        : "## Recent journal entries (for continuity):"
    );
    ctx.recentEntries.forEach((e) => {
      const mood = e.mood_score ? ` | Stimmung: ${e.mood_score}/10` : "";
      lines.push(`**${e.date}**${mood}`);
      if (e.summary) lines.push(e.summary.slice(0, 300) + "...");
      lines.push("");
    });
  }

  return lines.join("\n");
}

export async function storeNewMemories(
  userId: string,
  sourceEntryId: string,
  newMemories: Array<{ type: string; content: string; importance: number }>
): Promise<void> {
  if (!newMemories.length) return;

  const rows = newMemories.map((m) => ({
    user_id: userId,
    type: m.type,
    content: m.content,
    importance: m.importance,
    source_entry_id: sourceEntryId,
    last_referenced_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("memories").insert(rows);
  if (error) console.error("Failed to store memories:", error);
}

export async function touchMemories(
  userId: string,
  contents: string[]
): Promise<void> {
  // Update last_referenced_at for memories that were used in a prompt
  if (!contents.length) return;
  await supabase
    .from("memories")
    .update({ last_referenced_at: new Date().toISOString() })
    .eq("user_id", userId)
    .in("content", contents);
}
