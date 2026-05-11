export type CategoryName =
  | "SPORT"
  | "SOCIAL"
  | "LEARNING"
  | "WORK"
  | "HEALTH"
  | "MINDSET"
  | "GOALS"
  | "OTHER";

export type MemoryType = "FACT" | "EVENT" | "GOAL" | "HABIT" | "INSIGHT";

export type GoalStatus = "ACTIVE" | "COMPLETED" | "PAUSED";

export interface User {
  id: string;
  email: string;
  name?: string;
  created_at: string;
  preferred_language: "de" | "en";
  face_id_enabled: boolean;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  raw_text: string;
  ai_summary: string | null;
  mood_score: number | null; // 1–10
  energy_score: number | null; // 1–10
  highlights: string | null;
  processing_status: "pending" | "processing" | "done" | "error";
  created_at: string;
  updated_at: string;
  // joined
  categories?: EntryCategory[];
  photos?: EntryPhoto[];
  achievements?: Achievement[];
}

export interface EntryCategory {
  id: string;
  entry_id: string;
  category_name: CategoryName;
  duration_minutes: number | null;
}

export interface EntryPhoto {
  id: string;
  entry_id: string;
  storage_url: string;
  created_at: string;
}

export interface Achievement {
  id: string;
  entry_id: string;
  description: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: CategoryName;
  deadline: string | null; // YYYY-MM-DD
  status: GoalStatus;
  progress: number; // 0–100
  created_at: string;
  updated_at: string;
  last_mentioned_at: string | null;
}

export interface Memory {
  id: string;
  user_id: string;
  type: MemoryType;
  content: string;
  importance: number; // 1–10
  source_entry_id: string | null;
  created_at: string;
  last_referenced_at: string;
}

export interface Intention {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  morning_text: string;
  evening_comparison: string | null;
  completion_score: number | null; // 1–10
  created_at: string;
}

// Claude API response shape (from Edge Function)
export interface ProcessedEntry {
  summary: string;
  categories: Array<{ name: CategoryName; duration_minutes: number | null }>;
  mood_score: number;
  energy_score: number;
  achievements: string[];
  key_topics: string[];
  new_memories: Array<{
    type: MemoryType;
    content: string;
    importance: number;
  }>;
  highlights: string;
  intention_comparison: string | null;
}

export interface WeeklyReview {
  week_start: string;
  week_end: string;
  summary: string;
  mood_average: number;
  energy_average: number;
  category_totals: Record<CategoryName, number>;
  achievements_count: number;
  reflection_questions: string[];
  ai_reflection: string;
}

export interface AppSettings {
  language: "de" | "en";
  face_id_enabled: boolean;
  notifications_enabled: boolean;
  evening_reminder_time: string; // "HH:MM"
  morning_reminder_time: string; // "HH:MM"
  theme: "dark"; // only dark for now
}
