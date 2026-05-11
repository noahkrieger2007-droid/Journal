import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/authStore";
import { useJournalStore } from "@/store/journalStore";
import { supabase } from "@/lib/supabase";
import { COLORS, CATEGORY_CONFIG } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import type { CategoryName } from "@/types";

type Period = "weekly" | "monthly" | "yearly";

interface StatsData {
  totalEntries: number;
  avgMood: number;
  avgEnergy: number;
  streak: number;
  categoryTotals: Record<string, number>;
  moodHistory: Array<{ date: string; mood: number }>;
  topCategory: string | null;
}

async function loadStats(userId: string, period: Period): Promise<StatsData> {
  const daysBack = period === "weekly" ? 7 : period === "monthly" ? 30 : 365;
  const since = new Date();
  since.setDate(since.getDate() - daysBack);

  const { data: entries } = await supabase
    .from("journal_entries")
    .select(`*, categories:entry_categories(category_name, duration_minutes)`)
    .eq("user_id", userId)
    .eq("processing_status", "done")
    .gte("date", since.toISOString().split("T")[0])
    .order("date", { ascending: true });

  if (!entries || entries.length === 0) {
    return { totalEntries: 0, avgMood: 0, avgEnergy: 0, streak: 0, categoryTotals: {}, moodHistory: [], topCategory: null };
  }

  const withMood = entries.filter((e) => e.mood_score);
  const avgMood = withMood.length
    ? withMood.reduce((s, e) => s + e.mood_score, 0) / withMood.length
    : 0;

  const withEnergy = entries.filter((e) => e.energy_score);
  const avgEnergy = withEnergy.length
    ? withEnergy.reduce((s, e) => s + e.energy_score, 0) / withEnergy.length
    : 0;

  const categoryTotals: Record<string, number> = {};
  entries.forEach((e) => {
    e.categories?.forEach((c: any) => {
      categoryTotals[c.category_name] = (categoryTotals[c.category_name] || 0) + 1;
    });
  });

  const moodHistory = entries.filter((e) => e.mood_score).map((e) => ({ date: e.date, mood: e.mood_score }));
  const topCategory = Object.keys(categoryTotals).sort((a, b) => categoryTotals[b] - categoryTotals[a])[0] || null;

  return {
    totalEntries: entries.length,
    avgMood: Math.round(avgMood * 10) / 10,
    avgEnergy: Math.round(avgEnergy * 10) / 10,
    streak: 0,
    categoryTotals,
    moodHistory,
    topCategory,
  };
}

function getMoodBarColor(mood: number) {
  if (mood >= 8) return COLORS.success;
  if (mood >= 6) return "#F59E0B";
  if (mood >= 4) return COLORS.orange;
  return COLORS.danger;
}

export default function StatsScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const { getStreak } = useJournalStore();
  const [period, setPeriod] = useState<Period>("weekly");
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [streak, setStreak] = useState(0);

  const load = useCallback(async () => {
    if (!user) return;
    const [data, s] = await Promise.all([loadStats(user.id, period), getStreak(user.id)]);
    setStats(data);
    setStreak(s);
    setIsLoading(false);
  }, [user, period]);

  useFocusEffect(useCallback(() => { setIsLoading(true); load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const periodLabel = { weekly: "7 Tage", monthly: "30 Tage", yearly: "12 Monate" };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Header */}
      <LinearGradient
        colors={["#FF6330", "#FF8555", "#FFAA80"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: 64,
          paddingHorizontal: 24,
          paddingBottom: 24,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
        }}
      >
        <Text style={{ fontSize: 26, fontWeight: "800", color: "#fff", letterSpacing: -0.5, marginBottom: 16 }}>
          {t("stats.title")}
        </Text>

        {/* Period selector */}
        <View style={{ flexDirection: "row", backgroundColor: "rgba(0,0,0,0.12)", borderRadius: 12, padding: 3 }}>
          {(["weekly", "monthly", "yearly"] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: period === p ? "rgba(255,255,255,0.9)" : "transparent",
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: period === p ? COLORS.orange : "rgba(255,255,255,0.8)" }}>
                {t(`stats.${p}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={COLORS.orange} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.orange} />}
        >
          {stats && stats.totalEntries === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <Text style={{ fontSize: 44, marginBottom: 16 }}>📊</Text>
              <Text style={{ fontSize: 17, fontWeight: "700", color: COLORS.text, marginBottom: 8 }}>
                {t("stats.noData")}
              </Text>
              <Text style={{ fontSize: 14, color: COLORS.subtle, textAlign: "center" }}>
                Schreibe mehr Einträge um Statistiken zu sehen.
              </Text>
            </View>
          ) : stats ? (
            <>
              {/* Hero stat cards */}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                <View
                  style={{
                    flex: 1,
                    borderRadius: 18,
                    overflow: "hidden",
                    shadowColor: COLORS.orange,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 10,
                    elevation: 4,
                  }}
                >
                  <LinearGradient colors={["#FF6330", "#FF8555"]} style={{ padding: 18, alignItems: "center" }}>
                    <Text style={{ fontSize: 32, fontWeight: "800", color: "#fff" }}>{stats.totalEntries}</Text>
                    <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2, fontWeight: "600" }}>
                      {t("stats.totalEntries")}
                    </Text>
                  </LinearGradient>
                </View>
                <View
                  style={{
                    flex: 1,
                    borderRadius: 18,
                    overflow: "hidden",
                    shadowColor: "#F59E0B",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.2,
                    shadowRadius: 10,
                    elevation: 4,
                  }}
                >
                  <LinearGradient colors={["#F59E0B", "#FBBF24"]} style={{ padding: 18, alignItems: "center" }}>
                    <Text style={{ fontSize: 32, fontWeight: "800", color: "#fff" }}>🔥 {streak}</Text>
                    <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2, fontWeight: "600" }}>
                      {t("stats.streak")}
                    </Text>
                  </LinearGradient>
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: COLORS.card,
                    borderRadius: 18,
                    padding: 18,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <Text style={{ fontSize: 28 }}>😊</Text>
                  <Text style={{ fontSize: 26, fontWeight: "800", color: COLORS.success, marginTop: 4 }}>
                    {stats.avgMood || "–"}
                  </Text>
                  <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 2, fontWeight: "600" }}>
                    {t("stats.avgMood")}
                  </Text>
                </View>
                <View
                  style={{
                    flex: 1,
                    backgroundColor: COLORS.card,
                    borderRadius: 18,
                    padding: 18,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <Text style={{ fontSize: 28 }}>⚡</Text>
                  <Text style={{ fontSize: 26, fontWeight: "800", color: "#3B82F6", marginTop: 4 }}>
                    {stats.avgEnergy || "–"}
                  </Text>
                  <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 2, fontWeight: "600" }}>
                    {t("stats.avgEnergy")}
                  </Text>
                </View>
              </View>

              {/* Mood chart */}
              {stats.moodHistory.length > 1 && (
                <View
                  style={{
                    backgroundColor: COLORS.card,
                    borderRadius: 20,
                    padding: 20,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: COLORS.text }}>
                      {t("stats.moodTrend")}
                    </Text>
                    <Text style={{ fontSize: 12, color: COLORS.muted }}>{periodLabel[period]}</Text>
                  </View>

                  {/* Y-axis labels + bars */}
                  <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
                    {/* Y labels */}
                    <View style={{ justifyContent: "space-between", height: 80, marginRight: 6, paddingBottom: 2 }}>
                      {[10, 5, 1].map((n) => (
                        <Text key={n} style={{ fontSize: 9, color: COLORS.muted, textAlign: "right" }}>{n}</Text>
                      ))}
                    </View>
                    {/* Bars */}
                    <View style={{ flex: 1, flexDirection: "row", alignItems: "flex-end", gap: 3, height: 80 }}>
                      {stats.moodHistory.slice(-14).map((item, index) => (
                        <View
                          key={index}
                          style={{ flex: 1, justifyContent: "flex-end", height: 80 }}
                        >
                          <View
                            style={{
                              height: Math.max(4, (item.mood / 10) * 72),
                              backgroundColor: getMoodBarColor(item.mood),
                              borderRadius: 4,
                            }}
                          />
                        </View>
                      ))}
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                    <Text style={{ fontSize: 10, color: COLORS.muted }}>
                      {stats.moodHistory.slice(-14)[0]?.date.slice(5)}
                    </Text>
                    <Text style={{ fontSize: 10, color: COLORS.muted }}>
                      {stats.moodHistory.slice(-1)[0]?.date.slice(5)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Category breakdown */}
              {Object.keys(stats.categoryTotals).length > 0 && (
                <View
                  style={{
                    backgroundColor: COLORS.card,
                    borderRadius: 20,
                    padding: 20,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: "800", color: COLORS.text, marginBottom: 16 }}>
                    {t("stats.categoryBreakdown")}
                  </Text>
                  {Object.entries(stats.categoryTotals)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, count]) => {
                      const cfg = CATEGORY_CONFIG[cat as CategoryName];
                      const total = Object.values(stats.categoryTotals).reduce((a, b) => a + b, 0);
                      const pct = Math.round((count / total) * 100);
                      return (
                        <View key={cat} style={{ marginBottom: 14 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                              <View
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: 8,
                                  backgroundColor: cfg.color + "18",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
                              </View>
                              <Text style={{ fontSize: 14, color: COLORS.text, fontWeight: "700" }}>
                                {cfg[`label_${i18n.language as "de" | "en"}`]}
                              </Text>
                            </View>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Text style={{ fontSize: 12, color: COLORS.muted }}>{count}x</Text>
                              <Text style={{ fontSize: 13, color: cfg.color, fontWeight: "700" }}>{pct}%</Text>
                            </View>
                          </View>
                          <View style={{ height: 8, backgroundColor: COLORS.bg, borderRadius: 4, overflow: "hidden" }}>
                            <View
                              style={{
                                height: "100%",
                                width: `${pct}%`,
                                backgroundColor: cfg.color,
                                borderRadius: 4,
                              }}
                            />
                          </View>
                        </View>
                      );
                    })}
                </View>
              )}

              {/* Top category highlight */}
              {stats.topCategory && (
                <View
                  style={{
                    borderRadius: 18,
                    overflow: "hidden",
                    shadowColor: COLORS.orange,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                    elevation: 3,
                  }}
                >
                  <LinearGradient
                    colors={[CATEGORY_CONFIG[stats.topCategory as CategoryName].color, CATEGORY_CONFIG[stats.topCategory as CategoryName].color + "CC"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ padding: 18, flexDirection: "row", alignItems: "center", gap: 12 }}
                  >
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        backgroundColor: "rgba(255,255,255,0.25)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name={CATEGORY_CONFIG[stats.topCategory as CategoryName].icon as any} size={22} color="#fff" />
                    </View>
                    <View>
                      <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 }}>
                        Dein Schwerpunkt
                      </Text>
                      <Text style={{ fontSize: 18, color: "#fff", fontWeight: "800" }}>
                        {CATEGORY_CONFIG[stats.topCategory as CategoryName][`label_${i18n.language as "de" | "en"}`]}
                      </Text>
                    </View>
                  </LinearGradient>
                </View>
              )}
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
