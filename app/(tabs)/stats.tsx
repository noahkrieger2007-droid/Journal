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
    return {
      totalEntries: 0,
      avgMood: 0,
      avgEnergy: 0,
      streak: 0,
      categoryTotals: {},
      moodHistory: [],
      topCategory: null,
    };
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
      categoryTotals[c.category_name] =
        (categoryTotals[c.category_name] || 0) + 1;
    });
  });

  const moodHistory = entries
    .filter((e) => e.mood_score)
    .map((e) => ({ date: e.date, mood: e.mood_score }));

  const topCategory =
    Object.keys(categoryTotals).sort(
      (a, b) => categoryTotals[b] - categoryTotals[a]
    )[0] || null;

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
    const [data, s] = await Promise.all([
      loadStats(user.id, period),
      getStreak(user.id),
    ]);
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

  const statCard = (
    icon: string,
    value: string | number,
    label: string,
    color: string,
    emoji?: string
  ) => (
    <View
      style={{
        flex: 1,
        backgroundColor: COLORS.card,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: color + "30",
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 22, marginBottom: 6 }}>{emoji || ""}</Text>
      <Text style={{ fontSize: 26, fontWeight: "800", color }}>{value}</Text>
      <Text style={{ fontSize: 12, color: COLORS.muted, textAlign: "center", marginTop: 2 }}>{label}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <LinearGradient
        colors={["#141829", "#0A0F1E"]}
        style={{ paddingTop: 64, paddingHorizontal: 24, paddingBottom: 20 }}
      >
        <Text style={{ fontSize: 26, fontWeight: "800", color: COLORS.text, letterSpacing: -0.5, marginBottom: 16 }}>
          {t("stats.title")}
        </Text>

        {/* Period selector */}
        <View style={{ flexDirection: "row", backgroundColor: COLORS.card2, borderRadius: 12, padding: 3 }}>
          {(["weekly", "monthly", "yearly"] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 10,
                alignItems: "center",
                backgroundColor: period === p ? COLORS.violet : "transparent",
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: "600", color: period === p ? "#fff" : COLORS.muted }}>
                {t(`stats.${p}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={COLORS.violet} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.violet} />
          }
        >
          {stats && stats.totalEntries === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <Text style={{ fontSize: 40, marginBottom: 16 }}>📊</Text>
              <Text style={{ fontSize: 17, fontWeight: "700", color: COLORS.text, marginBottom: 8 }}>
                {t("stats.noData")}
              </Text>
            </View>
          ) : stats ? (
            <>
              {/* Key stats */}
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
                {statCard("📝", stats.totalEntries, t("stats.totalEntries"), COLORS.violet, "📝")}
                {statCard("🔥", streak, t("stats.streak"), COLORS.amber, "🔥")}
              </View>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
                {statCard("😊", stats.avgMood || "-", t("stats.avgMood"), COLORS.success, "😊")}
                {statCard("⚡", stats.avgEnergy || "-", t("stats.avgEnergy"), "#3B82F6", "⚡")}
              </View>

              {/* Mood history */}
              {stats.moodHistory.length > 1 && (
                <View
                  style={{
                    backgroundColor: COLORS.card,
                    borderRadius: 20,
                    padding: 20,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.text, marginBottom: 16 }}>
                    {t("stats.moodTrend")}
                  </Text>
                  {/* Simple bar chart */}
                  <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 4, height: 60 }}>
                    {stats.moodHistory.slice(-14).map((item, index) => (
                      <View
                        key={index}
                        style={{
                          flex: 1,
                          height: (item.mood / 10) * 56,
                          backgroundColor: item.mood >= 7 ? COLORS.success : item.mood >= 5 ? COLORS.amber : COLORS.danger,
                          borderRadius: 3,
                          opacity: 0.8,
                        }}
                      />
                    ))}
                  </View>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
                    <Text style={{ fontSize: 10, color: COLORS.muted }}>
                      {stats.moodHistory.slice(-14)[0]?.date}
                    </Text>
                    <Text style={{ fontSize: 10, color: COLORS.muted }}>
                      {stats.moodHistory.slice(-1)[0]?.date}
                    </Text>
                  </View>
                </View>
              )}

              {/* Categories */}
              {Object.keys(stats.categoryTotals).length > 0 && (
                <View
                  style={{
                    backgroundColor: COLORS.card,
                    borderRadius: 20,
                    padding: 20,
                    marginBottom: 16,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.text, marginBottom: 16 }}>
                    {t("stats.categoryBreakdown")}
                  </Text>
                  {Object.entries(stats.categoryTotals)
                    .sort(([, a], [, b]) => b - a)
                    .map(([cat, count]) => {
                      const cfg = CATEGORY_CONFIG[cat as CategoryName];
                      const total = Object.values(stats.categoryTotals).reduce((a, b) => a + b, 0);
                      const pct = Math.round((count / total) * 100);
                      return (
                        <View key={cat} style={{ marginBottom: 12 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
                              <Text style={{ fontSize: 13, color: COLORS.text, fontWeight: "600" }}>
                                {cfg[`label_${i18n.language as "de" | "en"}`]}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 13, color: COLORS.muted }}>{pct}%</Text>
                          </View>
                          <View style={{ height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: "hidden" }}>
                            <View
                              style={{
                                height: "100%",
                                width: `${pct}%`,
                                backgroundColor: cfg.color,
                                borderRadius: 3,
                              }}
                            />
                          </View>
                        </View>
                      );
                    })}
                </View>
              )}
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
