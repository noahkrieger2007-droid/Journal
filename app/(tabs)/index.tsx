import { useState, useCallback } from "react";
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/authStore";
import { useJournalStore } from "@/store/journalStore";
import { COLORS, CATEGORY_CONFIG } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import type { JournalEntry } from "@/types";

function getGreeting(t: (key: string) => string) {
  const h = new Date().getHours();
  if (h < 12) return t("home.greeting_morning");
  if (h < 18) return t("home.greeting_afternoon");
  return t("home.greeting_evening");
}

function moodEmoji(score: number) {
  if (score >= 8) return "😄";
  if (score >= 6) return "🙂";
  if (score >= 4) return "😐";
  return "😔";
}

function formatShortDate(dateStr: string, lang: string) {
  return new Date(dateStr).toLocaleDateString(lang === "de" ? "de-DE" : "en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
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
    const [entry, s] = await Promise.all([getTodaysEntry(user.id), getStreak(user.id)]);
    setTodaysEntry(entry);
    setStreak(s);
  }, [user]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const firstName = user?.name?.split(" ")[0] || "du";
  const recent = entries.slice(0, 4);
  const aiEntry = entries.find((e) => e.ai_summary);
  const todayFull = new Date().toLocaleDateString(i18n.language === "de" ? "de-DE" : "en-US", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.muted} />}
      >
        {/* Header */}
        <View style={{ paddingTop: 64, paddingHorizontal: 24, paddingBottom: 8 }}>
          <Text style={{ fontSize: 13, color: COLORS.muted, marginBottom: 3, letterSpacing: 0.2 }}>{todayFull}</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
            <View>
              <Text style={{ fontSize: 28, fontWeight: "800", color: COLORS.ink, letterSpacing: -0.8, lineHeight: 34 }}>
                {getGreeting(t)},
              </Text>
              <Text style={{ fontSize: 28, fontWeight: "800", color: COLORS.ink, letterSpacing: -0.8, lineHeight: 36 }}>
                {firstName}.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/journal")}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: COLORS.ink,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 4,
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ paddingHorizontal: 24, paddingTop: 24 }}>

          {/* Streak + today summary row */}
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
            {/* Streak tile */}
            <View
              style={{
                flex: 1,
                backgroundColor: streak > 0 ? COLORS.amberBg : COLORS.card,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: streak > 0 ? "#FCD34D" : COLORS.border,
              }}
            >
              <Text style={{ fontSize: 24 }}>{streak > 0 ? "🔥" : "📅"}</Text>
              <Text style={{ fontSize: 26, fontWeight: "800", color: streak > 0 ? COLORS.amber : COLORS.ink, marginTop: 4, letterSpacing: -0.5 }}>
                {streak}
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.subtle, marginTop: 1, fontWeight: "600" }}>
                {streak === 1 ? "Tag Streak" : "Tage Streak"}
              </Text>
            </View>

            {/* Today status tile */}
            <TouchableOpacity
              onPress={() => todaysEntry ? router.push(`/entry/${todaysEntry.id}`) : router.push("/(tabs)/journal")}
              style={{
                flex: 1.6,
                backgroundColor: todaysEntry ? COLORS.card : COLORS.cardAlt,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: todaysEntry ? COLORS.border : COLORS.border,
                justifyContent: "space-between",
              }}
              activeOpacity={0.75}
            >
              {todaysEntry ? (
                <>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.success }} />
                      <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.success, letterSpacing: 0.4 }}>HEUTE</Text>
                    </View>
                    {todaysEntry.mood_score && (
                      <Text style={{ fontSize: 18 }}>{moodEmoji(todaysEntry.mood_score)}</Text>
                    )}
                  </View>
                  <Text style={{ fontSize: 13, color: COLORS.inkLight, lineHeight: 19, marginTop: 6 }} numberOfLines={2}>
                    {todaysEntry.highlights || todaysEntry.ai_summary?.slice(0, 70) || "Eintrag vorhanden"}
                  </Text>
                  <Text style={{ fontSize: 11, color: COLORS.muted, marginTop: 6 }}>Tippen für Details →</Text>
                </>
              ) : (
                <>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.muted }} />
                    <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.muted, letterSpacing: 0.4 }}>HEUTE</Text>
                  </View>
                  <Text style={{ fontSize: 14, color: COLORS.inkLight, marginTop: 8, fontWeight: "600" }}>
                    {t("home.noEntryToday")}
                  </Text>
                  <Text style={{ fontSize: 12, color: COLORS.muted, marginTop: 4 }}>Jetzt schreiben →</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* AI insight */}
          {aiEntry?.ai_summary && (
            <TouchableOpacity
              onPress={() => router.push(`/entry/${aiEntry.id}`)}
              activeOpacity={0.8}
              style={{
                backgroundColor: COLORS.ink,
                borderRadius: 16,
                padding: 18,
                marginBottom: 24,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Text style={{ fontSize: 14 }}>✦</Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.55)", letterSpacing: 0.7, textTransform: "uppercase" }}>
                  NOVA Einblick
                </Text>
              </View>
              <Text style={{ fontSize: 15, color: "rgba(255,255,255,0.9)", lineHeight: 23, fontWeight: "400" }} numberOfLines={3}>
                {aiEntry.ai_summary}
              </Text>
              <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 10 }}>
                {formatShortDate(aiEntry.date, i18n.language)} · Vollständig lesen →
              </Text>
            </TouchableOpacity>
          )}

          {/* Recent entries */}
          {recent.length > 0 && (
            <View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: COLORS.ink }}>Letzte Einträge</Text>
                <TouchableOpacity onPress={() => router.push("/(tabs)/entries")}>
                  <Text style={{ fontSize: 13, color: COLORS.subtle, fontWeight: "600" }}>Alle ansehen</Text>
                </TouchableOpacity>
              </View>
              {recent.map((entry, i) => (
                <TouchableOpacity
                  key={entry.id}
                  onPress={() => router.push(`/entry/${entry.id}`)}
                  activeOpacity={0.75}
                  style={{
                    backgroundColor: COLORS.card,
                    borderRadius: 12,
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    marginBottom: 8,
                    flexDirection: "row",
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, color: COLORS.muted, marginBottom: 2 }}>
                      {formatShortDate(entry.date, i18n.language)}
                    </Text>
                    <Text style={{ fontSize: 14, color: COLORS.ink, fontWeight: "600" }} numberOfLines={1}>
                      {entry.highlights || entry.ai_summary?.slice(0, 55) || entry.raw_text.slice(0, 55)}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {entry.mood_score && (
                      <Text style={{ fontSize: 16 }}>{moodEmoji(entry.mood_score)}</Text>
                    )}
                    <Ionicons name="chevron-forward" size={14} color={COLORS.muted} />
                  </View>
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
