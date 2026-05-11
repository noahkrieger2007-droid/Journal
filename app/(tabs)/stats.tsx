import { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { useFocusEffect } from "expo-router";
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

  if (!entries?.length) return { totalEntries: 0, avgMood: 0, avgEnergy: 0, categoryTotals: {}, moodHistory: [], topCategory: null };

  const moodArr = entries.filter((e) => e.mood_score);
  const energyArr = entries.filter((e) => e.energy_score);
  const categoryTotals: Record<string, number> = {};
  entries.forEach((e) => e.categories?.forEach((c: any) => {
    categoryTotals[c.category_name] = (categoryTotals[c.category_name] || 0) + 1;
  }));
  const topCategory = Object.keys(categoryTotals).sort((a, b) => categoryTotals[b] - categoryTotals[a])[0] || null;

  return {
    totalEntries: entries.length,
    avgMood: moodArr.length ? Math.round(moodArr.reduce((s, e) => s + e.mood_score, 0) / moodArr.length * 10) / 10 : 0,
    avgEnergy: energyArr.length ? Math.round(energyArr.reduce((s, e) => s + e.energy_score, 0) / energyArr.length * 10) / 10 : 0,
    categoryTotals,
    moodHistory: moodArr.map((e) => ({ date: e.date, mood: e.mood_score })),
    topCategory,
  };
}

function moodBarColor(mood: number) {
  if (mood >= 8) return COLORS.success;
  if (mood >= 6) return COLORS.amber;
  if (mood >= 4) return "#EA580C";
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
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const PERIOD_LABELS: Record<Period, string> = { weekly: "7 Tage", monthly: "30 Tage", yearly: "12 Monate" };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Header */}
      <View style={{ paddingTop: 64, paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
        <Text style={{ fontSize: 24, fontWeight: "800", color: COLORS.ink, letterSpacing: -0.6, marginBottom: 14 }}>
          {t("stats.title")}
        </Text>
        {/* Period tabs */}
        <View style={{ flexDirection: "row", backgroundColor: COLORS.cardAlt, borderRadius: 10, padding: 3 }}>
          {(["weekly", "monthly", "yearly"] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 8,
                alignItems: "center",
                backgroundColor: period === p ? COLORS.card : "transparent",
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: period === p ? COLORS.ink : COLORS.muted }}>
                {t(`stats.${p}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={COLORS.ink} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.muted} />}
        >
          {!stats || stats.totalEntries === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <Text style={{ fontSize: 36, marginBottom: 12 }}>📊</Text>
              <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.ink, marginBottom: 6 }}>{t("stats.noData")}</Text>
              <Text style={{ fontSize: 13, color: COLORS.muted, textAlign: "center" }}>
                Schreibe mehr Einträge um Statistiken zu sehen.
              </Text>
            </View>
          ) : (
            <>
              {/* Key metrics row */}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
                <View style={{ flex: 1, backgroundColor: COLORS.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border }}>
                  <Text style={{ fontSize: 28, fontWeight: "800", color: COLORS.ink, letterSpacing: -0.5 }}>{stats.totalEntries}</Text>
                  <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 2, fontWeight: "600" }}>Einträge</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: streak > 0 ? COLORS.amberBg : COLORS.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: streak > 0 ? "#FCD34D" : COLORS.border }}>
                  <Text style={{ fontSize: 28, fontWeight: "800", color: streak > 0 ? COLORS.amber : COLORS.ink, letterSpacing: -0.5 }}>
                    {streak > 0 ? `🔥 ${streak}` : streak}
                  </Text>
                  <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 2, fontWeight: "600" }}>Tage Streak</Text>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
                <View style={{ flex: 1, backgroundColor: stats.avgMood >= 7 ? COLORS.successBg : COLORS.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: stats.avgMood >= 7 ? "#86EFAC" : COLORS.border }}>
                  <Text style={{ fontSize: 28, fontWeight: "800", color: stats.avgMood >= 7 ? COLORS.success : COLORS.ink, letterSpacing: -0.5 }}>
                    {stats.avgMood || "–"}
                  </Text>
                  <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 2, fontWeight: "600" }}>⌀ Stimmung</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: COLORS.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border }}>
                  <Text style={{ fontSize: 28, fontWeight: "800", color: COLORS.ink, letterSpacing: -0.5 }}>{stats.avgEnergy || "–"}</Text>
                  <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 2, fontWeight: "600" }}>⌀ Energie</Text>
                </View>
              </View>

              {/* Mood chart */}
              {stats.moodHistory.length > 1 && (
                <View style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <Text style={{ fontSize: 14, fontWeight: "800", color: COLORS.ink }}>Stimmungsverlauf</Text>
                    <Text style={{ fontSize: 12, color: COLORS.muted }}>{PERIOD_LABELS[period]}</Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4 }}>
                    <View style={{ width: 14, height: 72, justifyContent: "space-between", paddingBottom: 1 }}>
                      {[10, 5].map((n) => (
                        <Text key={n} style={{ fontSize: 9, color: COLORS.muted, textAlign: "right" }}>{n}</Text>
                      ))}
                    </View>
                    {stats.moodHistory.slice(-21).map((item, i) => (
                      <View key={i} style={{ flex: 1, height: 72, justifyContent: "flex-end" }}>
                        <View style={{ height: Math.max(3, (item.mood / 10) * 68), backgroundColor: moodBarColor(item.mood), borderRadius: 3 }} />
                      </View>
                    ))}
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 5 }}>
                    <Text style={{ fontSize: 10, color: COLORS.muted }}>{stats.moodHistory.slice(-21)[0]?.date.slice(5)}</Text>
                    <Text style={{ fontSize: 10, color: COLORS.muted }}>{stats.moodHistory.slice(-1)[0]?.date.slice(5)}</Text>
                  </View>
                </View>
              )}

              {/* Category breakdown */}
              {Object.keys(stats.categoryTotals).length > 0 && (
                <View style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border }}>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: COLORS.ink, marginBottom: 16 }}>Kategorien</Text>
                  {Object.entries(stats.categoryTotals)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, count]) => {
                      const cfg = CATEGORY_CONFIG[cat as CategoryName];
                      const total = Object.values(stats.categoryTotals).reduce((a, b) => a + b, 0);
                      const pct = Math.round((count / total) * 100);
                      return (
                        <View key={cat} style={{ marginBottom: 13 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                              <View style={{ width: 24, height: 24, borderRadius: 6, backgroundColor: cfg.color + "16", alignItems: "center", justifyContent: "center" }}>
                                <Ionicons name={cfg.icon as any} size={13} color={cfg.color} />
                              </View>
                              <Text style={{ fontSize: 13, color: COLORS.ink, fontWeight: "700" }}>
                                {cfg[`label_${i18n.language as "de" | "en"}`]}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 12, color: COLORS.muted, fontWeight: "600" }}>{pct}%</Text>
                          </View>
                          <View style={{ height: 5, backgroundColor: COLORS.cardAlt, borderRadius: 3, overflow: "hidden" }}>
                            <View style={{ height: "100%", width: `${pct}%`, backgroundColor: cfg.color, borderRadius: 3 }} />
                          </View>
                        </View>
                      );
                    })}
                </View>
              )}

              {/* Top category */}
              {stats.topCategory && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 14,
                    backgroundColor: COLORS.ink,
                    borderRadius: 16,
                    padding: 18,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: "rgba(255,255,255,0.12)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name={CATEGORY_CONFIG[stats.topCategory as CategoryName].icon as any} size={20} color="#fff" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" }}>
                      Dein Schwerpunkt
                    </Text>
                    <Text style={{ fontSize: 17, fontWeight: "800", color: "#fff", marginTop: 2 }}>
                      {CATEGORY_CONFIG[stats.topCategory as CategoryName][`label_${i18n.language as "de" | "en"}`]}
                    </Text>
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}
