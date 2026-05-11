import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { Goal, CategoryName, GoalStatus } from "@/types";

interface GoalsState {
  goals: Goal[];
  isLoading: boolean;
  fetchGoals: (userId: string) => Promise<void>;
  createGoal: (
    userId: string,
    data: Omit<Goal, "id" | "user_id" | "created_at" | "updated_at" | "last_mentioned_at" | "status" | "progress">
  ) => Promise<void>;
  updateGoal: (goalId: string, data: Partial<Goal>) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  markComplete: (goalId: string) => Promise<void>;
  getStalledGoals: (userId: string, daysThreshold?: number) => Goal[];
}

export const useGoalsStore = create<GoalsState>((set, get) => ({
  goals: [],
  isLoading: false,

  fetchGoals: async (userId) => {
    set({ isLoading: true });
    const { data } = await supabase
      .from("goals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    set({ goals: (data as Goal[]) || [], isLoading: false });
  },

  createGoal: async (userId, data) => {
    const { data: goal, error } = await supabase
      .from("goals")
      .insert({
        user_id: userId,
        ...data,
        status: "ACTIVE",
        progress: 0,
      })
      .select()
      .single();
    if (!error && goal) {
      set((state) => ({ goals: [goal as Goal, ...state.goals] }));
    }
  },

  updateGoal: async (goalId, data) => {
    await supabase
      .from("goals")
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq("id", goalId);
    set((state) => ({
      goals: state.goals.map((g) =>
        g.id === goalId ? { ...g, ...data } : g
      ),
    }));
  },

  deleteGoal: async (goalId) => {
    await supabase.from("goals").delete().eq("id", goalId);
    set((state) => ({ goals: state.goals.filter((g) => g.id !== goalId) }));
  },

  markComplete: async (goalId) => {
    await get().updateGoal(goalId, {
      status: "COMPLETED",
      progress: 100,
    });
  },

  getStalledGoals: (userId, daysThreshold = 7) => {
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - daysThreshold);
    return get().goals.filter((g) => {
      if (g.status !== "ACTIVE") return false;
      if (!g.last_mentioned_at) {
        const created = new Date(g.created_at);
        return created < threshold;
      }
      return new Date(g.last_mentioned_at) < threshold;
    });
  },
}));
