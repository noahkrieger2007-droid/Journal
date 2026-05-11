import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "@/lib/i18n";
import type { AppSettings } from "@/types";

const SETTINGS_KEY = "nova_settings";

const defaultSettings: AppSettings = {
  language: "de",
  face_id_enabled: false,
  notifications_enabled: true,
  evening_reminder_time: "21:00",
  morning_reminder_time: "08:00",
  theme: "dark",
};

interface SettingsState {
  settings: AppSettings;
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  setLanguage: (lang: "de" | "en") => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  isLoaded: false,

  loadSettings: async () => {
    try {
      const raw = await AsyncStorage.getItem(SETTINGS_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as Partial<AppSettings>;
        const merged = { ...defaultSettings, ...stored };
        set({ settings: merged, isLoaded: true });
        await i18n.changeLanguage(merged.language);
      } else {
        set({ isLoaded: true });
        await i18n.changeLanguage(defaultSettings.language);
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  updateSettings: async (partial) => {
    const updated = { ...get().settings, ...partial };
    set({ settings: updated });
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  },

  setLanguage: async (lang) => {
    await get().updateSettings({ language: lang });
    await i18n.changeLanguage(lang);
  },
}));
