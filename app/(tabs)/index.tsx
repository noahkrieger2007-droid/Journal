import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/authStore";
import { useJournalStore } from "@/store/journalStore";
import { COLORS, CATEGORY_CONFIG } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import type { JournalEntry } from "@/types";

function getGreeting(t: (key: string) => string): string {
  const hour = new Date().getHours();
  if (hour < 12) return t("home.greeting_morning");
  if (hour < 18) return t("home.greeting_afternoon");
  return t("home.greeting_evening");
}

function formatDate(lang: string): string {
  return new Date().toLocaleDateString(lang === "de" ? "de-DE" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function getMoodEmoji(score: number) {
  if (score >= 8) return "😄";
  if (score >= 6) return "🙂";
  if (score >= 4) return "😐";
  return "😔";
}

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const { fetchEntries, entries, getTodaysEntry, getStreak } = useJournalStore();
  const [todaysEntry, setTodaysEntry] = useState<JournalEntry | null>(null);
  const [streak, setStreak] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    await fetchEntries(user.id, 20);
    const [entry, s] = await Promise.all([
      getTodaysEntry(user.id),
      getStreak(user.id),
    ]);
    setTodaysEntry(entry);
    setStreak(s);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const firstName = user?.name?.split(" ")[0] || "du";
  const recentEntries = entries.slice(0, 3);

  // Derive a simple AI insight from recent entries
  const latestWithSummary = entries.find((e) => e.ai_summary);
  const aiInsight = latestWithSummary?.ai_summary
    ? latestWithSummary.ai_summary.slice(0, 120) + (latestWithSummary.ai_summary.length > 120 ? "…" : "")
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.orange}
          />
        }
      >
        {/* Header with gradient */}
        <LinearGradient
          colors={["#FF6330", "#FF8555", "#FFAA80"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: 64,
            paddingHorizontal: 24,
            paddingBottom: 36,
            borderBottomLeftRadius: 32,
            borderBottomRightRadius: 32,
          }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, color: "rgba(255,255,255,0.8)", marginBottom: 4 }}>
                {formatDate(i18n.language)}
              </Text>
              <Text style={{ fontSize: 26, fontWeight: "800", color: "#fff", letterSpacing: -0.5 }}>
                {getGreeting(t)},{"\n"}{firstName} 👋
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/journal")}
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                backgroundColor: "rgba(255,255,255,0.3)",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.5)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="add" size={26} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Streak pill */}
          <View
            style={{
              marginTop: 20,
              backgroundColor: "rgba(255,255,255,0.2)",
              borderRadius: 14,
              paddingHorizontal: 16,
              paddingVertical: 10,
              flexDirection: "row",
              alignItems: "center",
              alignSelf: "flex-start",
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 18 }}>🔥</Text>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>
              {streak} {streak === 1 ? "Tag" : "Tage"} am Stück
            </Text>
            {streak >= 7 && <Text style={{ fontSize: 16 }}>⚡</Text>}
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
          {/* Today's entry or quick add */}
          {todaysEntry ? (
            <TouchableOpacity
              onPress={() => router.push(`/entry/${todaysEntry.id}`)}
              style={{
                backgroundColor: COLORS.card,
                borderRadius: 20,
                padding: 20,
                marginBottom: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.08,
                shadowRadius: 10,
                elevation: 3,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success }} />
                  <Text style={{ fontSize: 12, fontWeight: "700", color: COLORS.success, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Heute
                  </Text>
                </View>
                {todaysEntry.mood_score && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ fontSize: 18 }}>{getMoodEmoji(todaysEntry.mood_score)}</Text>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: COLORS.orange }}>
                      {todaysEntry.mood_score}/10
                    </Text>
                  </View>
                )}
              </View>
              {todaysEntry.highlights && (
                <Text style={{ fontSize: 16, color: COLORS.text, fontWeight: "700", marginBottom: 6 }}>
                  {todaysEntry.highlights}
                </Text>
              )}
              {todaysEntry.ai_summary && (
                <Text style={{ fontSize: 14, color: COLORS.subtle, lineHeight: 21 }} numberOfLines={3}>
                  {todaysEntry.ai_summary}
                </Text>
              )}
              {todaysEntry.categories && todaysEntry.categories.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                  {todaysEntry.categories.slice(0, 4).map((c) => {
                    const cfg = CATEGORY_CONFIG[c.category_name];
                    return (
                      <View
                        key={c.id}
                        style={{
                          backgroundColor: cfg.color + "18",
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Ionicons name={cfg.icon as any} size={11} color={cfg.color} />
                        <Text style={{ fontSize: 11, color: cfg.color, fontWeight: "700" }}>
                          {cfg[`label_${i18n.language as "de" | "en"}`]}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
              <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 10 }}>
                <Text style={{ fontSize: 12, color: COLORS.muted }}>Tippen für Details →</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/journal")}
              style={{
                backgroundColor: COLORS.card,
                borderRadius: 20,
                padding: 24,
                marginBottom: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.07,
                shadowRadius: 10,
                elevation: 3,
                borderWidth: 1.5,
                borderColor: COLORS.orange + "40",
                borderStyle: "dashed",
                alignItems: "center",
              }}
            >
              <LinearGradient
                colors={[COLORS.orange + "20", COLORS.orange + "10"]}
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <Ionicons name="create-outline" size={26} color={COLORS.orange} />
              </LinearGradient>
              <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.text, marginBottom: 4 }}>
                {t("home.noEntryToday")}
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.muted }}>
                {t("home.quickAdd")} →
              </Text>
            </TouchableOpacity>
          )}

          {/* AI Insight card */}
          {aiInsight && (
            <View
              style={{
                borderRadius: 20,
                marginBottom: 16,
                overflow: "hidden",
                shadowColor: COLORS.orange,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 4,
              }}
            >
              <LinearGradient
                colors={["#FF6330", "#FF8C5A"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ padding: 20 }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 10,
                      backgroundColor: "rgba(255,255,255,0.25)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>✨</Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.9)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    NOVA Einblick
                  </Text>
                </View>
                <Text style={{ fontSize: 15, color: "#fff", lineHeight: 22, fontWeight: "500" }}>
                  {aiInsight}
                </Text>
                {latestWithSummary && (
                  <TouchableOpacity
                    onPress={() => router.push(`/entry/${latestWithSummary.id}`)}
                    style={{ marginTop: 12 }}
                  >
                    <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", fontWeight: "600" }}>
                      Vollständigen Eintrag lesen →
                    </Text>
                  </TouchableOpacity>
                )}
              </LinearGradient>
            </View>
          )}

          {/* Recent entries */}
          {recentEntries.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Text style={{ fontSize: 17, fontWeight: "800", color: COLORS.text }}>
                  Letzte Einträge
                </Text>
                <TouchableOpacity onPress={() => router.push("/(tabs)/entries")}>
                  <Text style={{ fontSize: 13, color: COLORS.orange, fontWeight: "700" }}>Alle →</Text>
                </TouchableOpacity>
              </View>
              {recentEntries.map((entry) => (
                <TouchableOpacity
                  key={entry.id}
                  onPress={() => router.push(`/entry/${entry.id}`)}
                  style={{
                    backgroundColor: COLORS.card,
                    borderRadius: 16,
                    padding: 16,
                    marginBottom: 8,
                    flexDirection: "row",
                    alignItems: "center",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 6,
                    elevation: 2,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                >
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 12,
                      backgroundColor: COLORS.bg,
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>
                      {entry.mood_score ? getMoodEmoji(entry.mood_score) : "📝"}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: COLORS.muted, marginBottom: 2 }}>
                      {new Date(entry.date).toLocaleDateString(
                        i18n.language === "de" ? "de-DE" : "en-US",
                        { weekday: "short", day: "numeric", month: "short" }
                      )}
                    </Text>
                    <Text style={{ fontSize: 14, color: COLORS.text, fontWeight: "600" }} numberOfLines={1}>
                      {entry.highlights || entry.ai_summary?.slice(0, 60) || entry.raw_text.slice(0, 60)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.muted} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </View>
  );
}
