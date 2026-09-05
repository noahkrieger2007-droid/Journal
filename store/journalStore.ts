import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { storeNewMemories } from "@/lib/memory";
import type { JournalEntry, ProcessedEntry, EntryPhoto } from "@/types";

interface JournalState {
  entries: JournalEntry[];
  isLoading: boolean;
  isProcessing: boolean;
  processingStep: number;
  currentEntry: JournalEntry | null;
  fetchEntries: (userId: string, limit?: number) => Promise<void>;
  fetchEntry: (entryId: string) => Promise<JournalEntry | null>;
  createEntry: (
    userId: string,
    rawText: string,
    date: string,
    photoUris?: string[]
  ) => Promise<JournalEntry>;
  processEntry: (
    entryId: string,
    userId: string,
    language: "de" | "en"
  ) => Promise<void>;
  deleteEntry: (entryId: string) => Promise<void>;
  getTodaysEntry: (userId: string) => Promise<JournalEntry | null>;
  getStreak: (userId: string) => Promise<number>;
}

export const useJournalStore = create<JournalState>((set, get) => ({
  entries: [],
  isLoading: false,
  isProcessing: false,
  processingStep: 0,
  currentEntry: null,

  fetchEntries: async (userId, limit = 50) => {
    set({ isLoading: true });
    const { data, error } = await supabase
      .from("journal_entries")
      .select(
        `
        *,
        categories:entry_categories(*),
        photos:entry_photos(*),
        achievements(*)
      `
      )
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .limit(limit);

    if (!error && data) {
      set({ entries: data as JournalEntry[] });
    }
    set({ isLoading: false });
  },

  fetchEntry: async (entryId) => {
    const { data, error } = await supabase
      .from("journal_entries")
      .select(
        `
        *,
        categories:entry_categories(*),
        photos:entry_photos(*),
        achievements(*)
      `
      )
      .eq("id", entryId)
      .single();

    if (error || !data) return null;
    const entry = data as JournalEntry;
    set({ currentEntry: entry });
    return entry;
  },

  createEntry: async (userId, rawText, date, photoUris = []) => {
    const { data: entry, error } = await supabase
      .from("journal_entries")
      .insert({
        user_id: userId,
        date,
        raw_text: rawText,
        processing_status: "pending",
      })
      .select()
      .single();

    if (error || !entry) throw new Error(error?.message || "Insert failed");

    // Upload photos
    if (photoUris.length > 0) {
      await uploadPhotos(entry.id, userId, photoUris);
    }

    return entry as JournalEntry;
  },

  processEntry: async (entryId, userId, language) => {
    set({ isProcessing: true, processingStep: 0 });

    try {
      await supabase
        .from("journal_entries")
        .update({ processing_status: "processing" })
        .eq("id", entryId);

      set({ processingStep: 1 });

      // Call Vercel API route (works on web without Supabase CLI)
      const apiBase =
        typeof window !== "undefined" && window.location.origin
          ? window.location.origin
          : process.env.EXPO_PUBLIC_APP_URL || "";

      const response = await fetch(`${apiBase}/api/process-journal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId, userId, language }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error ${response.status}`);
      }

      const processed = (await response.json()) as ProcessedEntry;
      set({ processingStep: 4 });

      // Build enriched summary including pattern observations
      let fullSummary = processed.summary || "";
      if (processed.pattern_observation) {
        fullSummary += `\n\n✦ ${processed.pattern_observation}`;
      }
      if (processed.goal_progress) {
        fullSummary += `\n\n🎯 ${processed.goal_progress}`;
      }

      // Persist AI output
      await supabase
        .from("journal_entries")
        .update({
          ai_summary: fullSummary,
          mood_score: processed.mood_score,
          energy_score: processed.energy_score,
          highlights: processed.highlights,
          processing_status: "done",
          updated_at: new Date().toISOString(),
        })
        .eq("id", entryId);

      // Persist categories
      if (processed.categories.length > 0) {
        await supabase.from("entry_categories").insert(
          processed.categories.map((c) => ({
            entry_id: entryId,
            category_name: c.name,
            duration_minutes: c.duration_minutes,
          }))
        );
      }

      // Persist achievements
      if (processed.achievements.length > 0) {
        await supabase.from("achievements").insert(
          processed.achievements.map((a) => ({
            entry_id: entryId,
            description: a,
          }))
        );
      }

      set({ processingStep: 5 });

      // Store new memories
      if (processed.new_memories.length > 0) {
        await storeNewMemories(userId, entryId, processed.new_memories);
      }

      // Refresh the entry
      await get().fetchEntry(entryId);
    } catch (err) {
      await supabase
        .from("journal_entries")
        .update({ processing_status: "error" })
        .eq("id", entryId);
      throw err;
    } finally {
      set({ isProcessing: false, processingStep: 0 });
    }
  },

  deleteEntry: async (entryId) => {
    await supabase.from("journal_entries").delete().eq("id", entryId);
    set((state) => ({
      entries: state.entries.filter((e) => e.id !== entryId),
    }));
  },

  getTodaysEntry: async (userId) => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("journal_entries")
      .select(
        `*, categories:entry_categories(*), photos:entry_photos(*), achievements(*)`
      )
      .eq("user_id", userId)
      .eq("date", today)
      .single();
    return (data as JournalEntry) || null;
  },

  getStreak: async (userId) => {
    const { data } = await supabase
      .from("journal_entries")
      .select("date")
      .eq("user_id", userId)
      .eq("processing_status", "done")
      .order("date", { ascending: false })
      .limit(365);

    if (!data || data.length === 0) return 0;

    const dates = data.map((e) => e.date as string);
    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split("T")[0];
      if (dates.includes(dateStr)) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    return streak;
  },
}));

async function uploadPhotos(
  entryId: string,
  userId: string,
  uris: string[]
): Promise<void> {
  const uploadPromises = uris.slice(0, 5).map(async (uri) => {
    const fileName = `${userId}/${entryId}/${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}.jpg`;

    const response = await fetch(uri);
    const blob = await response.blob();

    const { error } = await supabase.storage
      .from("entry-photos")
      .upload(fileName, blob, { contentType: "image/jpeg" });

    if (error) {
      console.error("Photo upload failed:", error);
      return;
    }

    const { data: urlData } = supabase.storage
      .from("entry-photos")
      .getPublicUrl(fileName);

    await supabase.from("entry_photos").insert({
      entry_id: entryId,
      storage_url: urlData.publicUrl,
    });
  });

  await Promise.all(uploadPromises);
}
