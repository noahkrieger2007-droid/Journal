import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  session: import("@supabase/supabase-js").Session | null;
  isLoading: boolean;
  isLocked: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  setLocked: (locked: boolean) => void;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isLocked: false,

  initialize: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      const profile = await fetchProfile(session.user.id);
      set({ session, user: profile, isLoading: false });
    } else {
      set({ isLoading: false });
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        const profile = await fetchProfile(session.user.id);
        set({ session, user: profile });
      } else {
        set({ session: null, user: null });
      }
    });
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (data.session) {
      const profile = await fetchProfile(data.session.user.id);
      set({ session: data.session, user: profile });
    }
  },

  signUp: async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (data.user) {
      await supabase.from("users").upsert({
        id: data.user.id,
        email,
        name,
        preferred_language: "de",
        face_id_enabled: false,
      });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null });
  },

  setLocked: (locked) => set({ isLocked: locked }),

  refreshUser: async () => {
    const { user } = get();
    if (!user) return;
    const profile = await fetchProfile(user.id);
    if (profile) set({ user: profile });
  },
}));

async function fetchProfile(userId: string): Promise<User | null> {
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  return data as User | null;
}
