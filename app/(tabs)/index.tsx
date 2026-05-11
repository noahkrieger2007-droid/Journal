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

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.violet}
          />
        }
      >
        {/* Header */}
        <LinearGradient
          colors={["#141829", "#0A0F1E"]}
          style={{ paddingTop: 64, paddingHorizontal: 24, paddingBottom: 32 }}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, color: COLORS.subtle, marginBottom: 4 }}>
                {formatDate(i18n.language)}
              </Text>
              <Text style={{ fontSize: 28, fontWeight: "800", color: COLORS.text, letterSpacing: -0.5 }}>
                {getGreeting(t)},{"\n"}{firstName} 👋
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/journal")}
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                backgroundColor: COLORS.violet,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: COLORS.violet,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <Ionicons name="add" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 24, paddingTop: 8 }}>
          {/* Streak card */}
          <View
            style={{
              backgroundColor: COLORS.card,
              borderRadius: 20,
              padding: 20,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: streak > 0 ? COLORS.amber + "40" : COLORS.border,
              flexDirection: "row",
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                backgroundColor: COLORS.amber + "20",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 16,
              }}
            >
              <Text style={{ fontSize: 24 }}>🔥</Text>
            </View>
            <View>
              <Text style={{ fontSize: 32, fontWeight: "800", color: COLORS.amber }}>
                {streak}
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.subtle }}>
                {t("home.streak")}
              </Text>
            </View>
            {streak >= 7 && (
              <View style={{ marginLeft: "auto" }}>
                <Text style={{ fontSize: 28 }}>⚡</Text>
              </View>
            )}
          </View>

          {/* Today's entry or quick add */}
          {todaysEntry ? (
            <TouchableOpacity
              onPress={() => router.push(`/entry/${todaysEntry.id}`)}
              style={{
                backgroundColor: COLORS.card,
                borderRadius: 20,
                padding: 20,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: COLORS.violet + "40",
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: COLORS.success,
                    }}
                  />
                  <Text style={{ fontSize: 12, fontWeight: "600", color: COLORS.success, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    Heute
                  </Text>
                </View>
                {todaysEntry.mood_score && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Text style={{ fontSize: 13, color: COLORS.subtle }}>Stimmung</Text>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.violet }}>
                      {todaysEntry.mood_score}/10
                    </Text>
                  </View>
                )}
              </View>
              {todaysEntry.highlights && (
                <Text style={{ fontSize: 16, color: COLORS.text, fontWeight: "600", marginBottom: 8 }}>
                  {todaysEntry.highlights}
                </Text>
              )}
              {todaysEntry.ai_summary && (
                <Text style={{ fontSize: 14, color: COLORS.subtle, lineHeight: 20 }} numberOfLines={3}>
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
                          backgroundColor: cfg.color + "20",
                          borderRadius: 8,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
                        <Text style={{ fontSize: 12, color: cfg.color, fontWeight: "600" }}>
                          {cfg[`label_${i18n.language as "de" | "en"}`]}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/journal")}
              style={{
                backgroundColor: COLORS.card,
                borderRadius: 20,
                padding: 24,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: COLORS.border,
                borderStyle: "dashed",
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  backgroundColor: COLORS.violet + "20",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                }}
              >
                <Ionicons name="create-outline" size={24} color={COLORS.violet} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.text, marginBottom: 4 }}>
                {t("home.noEntryToday")}
              </Text>
              <Text style={{ fontSize: 13, color: COLORS.subtle }}>
                {t("home.quickAdd")} →
              </Text>
            </TouchableOpacity>
          )}

          {/* Recent entries */}
          {recentEntries.length > 0 && (
            <View style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Text style={{ fontSize: 17, fontWeight: "700", color: COLORS.text }}>
                  Letzte Einträge
                </Text>
                <TouchableOpacity onPress={() => router.push("/(tabs)/entries")}>
                  <Text style={{ fontSize: 13, color: COLORS.violet, fontWeight: "600" }}>Alle →</Text>
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
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: COLORS.muted, marginBottom: 4 }}>
                      {new Date(entry.date).toLocaleDateString(
                        i18n.language === "de" ? "de-DE" : "en-US",
                        { weekday: "short", day: "numeric", month: "short" }
                      )}
                    </Text>
                    <Text style={{ fontSize: 14, color: COLORS.text, fontWeight: "600" }} numberOfLines={1}>
                      {entry.highlights || entry.ai_summary?.slice(0, 60) || entry.raw_text.slice(0, 60)}
                    </Text>
                  </View>
                  {entry.mood_score && (
                    <View style={{ alignItems: "center", marginLeft: 12 }}>
                      <Text style={{ fontSize: 18 }}>
                        {entry.mood_score >= 8 ? "😊" : entry.mood_score >= 5 ? "🙂" : "😐"}
                      </Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={16} color={COLORS.muted} style={{ marginLeft: 8 }} />
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
