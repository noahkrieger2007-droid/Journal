export const COLORS = {
  bg: "#F9F6F0",
  card: "#FFFFFF",
  card2: "#F4EFE8",
  orange: "#FF6330",
  orangeLight: "#FF8555",
  orangeGlow: "#FF633020",
  amber: "#F59E0B",
  amberLight: "#FCD34D",
  text: "#1C1410",
  muted: "#AFA098",
  subtle: "#7A6960",
  border: "#EDE7DF",
  success: "#22C55E",
  danger: "#EF4444",
  // Legacy aliases used in existing code
  violet: "#FF6330",
  violetLight: "#FF8555",
} as const;

export const CATEGORY_CONFIG = {
  SPORT: {
    label_de: "Sport",
    label_en: "Sport",
    icon: "fitness-outline",
    color: "#22C55E",
  },
  SOCIAL: {
    label_de: "Soziales",
    label_en: "Social",
    icon: "people-outline",
    color: "#3B82F6",
  },
  LEARNING: {
    label_de: "Lernen",
    label_en: "Learning",
    icon: "book-outline",
    color: "#8B5CF6",
  },
  WORK: {
    label_de: "Arbeit",
    label_en: "Work",
    icon: "briefcase-outline",
    color: "#F59E0B",
  },
  HEALTH: {
    label_de: "Gesundheit",
    label_en: "Health",
    icon: "heart-outline",
    color: "#EF4444",
  },
  MINDSET: {
    label_de: "Mindset",
    label_en: "Mindset",
    icon: "bulb-outline",
    color: "#EC4899",
  },
  GOALS: {
    label_de: "Ziele",
    label_en: "Goals",
    icon: "flag-outline",
    color: "#F97316",
  },
  OTHER: {
    label_de: "Sonstiges",
    label_en: "Other",
    icon: "ellipsis-horizontal-outline",
    color: "#64748B",
  },
} as const;

export const MEMORY_TYPE_CONFIG = {
  FACT: { label_de: "Fakt", label_en: "Fact", icon: "information-circle-outline" },
  EVENT: { label_de: "Ereignis", label_en: "Event", icon: "calendar-outline" },
  GOAL: { label_de: "Ziel", label_en: "Goal", icon: "flag-outline" },
  HABIT: { label_de: "Gewohnheit", label_en: "Habit", icon: "repeat-outline" },
  INSIGHT: { label_de: "Erkenntnis", label_en: "Insight", icon: "bulb-outline" },
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
  hero: 38,
} as const;
