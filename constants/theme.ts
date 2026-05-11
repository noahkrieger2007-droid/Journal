export const COLORS = {
  bg: "#F8F7F4",
  card: "#FFFFFF",
  cardAlt: "#F2F0EC",
  ink: "#1A1814",
  inkLight: "#3D3830",
  subtle: "#6B6560",
  muted: "#B0A89F",
  border: "#E8E5E0",
  borderLight: "#F0EDE8",
  accent: "#1A1814",
  amber: "#D97706",
  amberBg: "#FEF3C7",
  success: "#16A34A",
  successBg: "#DCFCE7",
  danger: "#DC2626",
  dangerBg: "#FEE2E2",
  blue: "#2563EB",
  // Legacy aliases
  orange: "#1A1814",
  violet: "#1A1814",
  violetLight: "#3D3830",
  text: "#1A1814",
} as const;

export const CATEGORY_CONFIG = {
  SPORT: {
    label_de: "Sport",
    label_en: "Sport",
    icon: "fitness-outline",
    color: "#16A34A",
  },
  SOCIAL: {
    label_de: "Soziales",
    label_en: "Social",
    icon: "people-outline",
    color: "#2563EB",
  },
  LEARNING: {
    label_de: "Lernen",
    label_en: "Learning",
    icon: "book-outline",
    color: "#7C3AED",
  },
  WORK: {
    label_de: "Arbeit",
    label_en: "Work",
    icon: "briefcase-outline",
    color: "#D97706",
  },
  HEALTH: {
    label_de: "Gesundheit",
    label_en: "Health",
    icon: "heart-outline",
    color: "#DC2626",
  },
  MINDSET: {
    label_de: "Mindset",
    label_en: "Mindset",
    icon: "bulb-outline",
    color: "#DB2777",
  },
  GOALS: {
    label_de: "Ziele",
    label_en: "Goals",
    icon: "flag-outline",
    color: "#EA580C",
  },
  OTHER: {
    label_de: "Sonstiges",
    label_en: "Other",
    icon: "ellipsis-horizontal-outline",
    color: "#6B7280",
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
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
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
