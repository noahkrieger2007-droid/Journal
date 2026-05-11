import { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
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

function getMoodEmoji(score: number) {
  if (score >= 8) return "😄";
  if (score >= 6) return "🙂";
  if (score >= 4) return "😐";
  return "😔";
}

function getMoodColor(score: number) {
  if (score >= 8) return COLORS.success;
  if (score >= 6) return "#F59E0B";
  if (score >= 4) return COLORS.orange;
  return COLORS.danger;
}

export default function EntriesScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const { entries, fetchEntries } = useJournalStore();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [focused, setFocused] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (user) fetchEntries(user.id, 100);
    }, [user])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    if (user) await fetchEntries(user.id, 100);
    setRefreshing(false);
  };

  const filtered = search
    ? entries.filter(
        (e) =>
          e.raw_text.toLowerCase().includes(search.toLowerCase()) ||
          e.ai_summary?.toLowerCase().includes(search.toLowerCase()) ||
          e.highlights?.toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  const renderEntry = ({ item }: { item: JournalEntry }) => {
    const dateStr = new Date(item.date).toLocaleDateString(
      i18n.language === "de" ? "de-DE" : "en-US",
      { weekday: "long", day: "numeric", month: "long" }
    );

    return (
      <TouchableOpacity
        onPress={() => router.push(`/entry/${item.id}`)}
        style={{
          backgroundColor: COLORS.card,
          borderRadius: 18,
          padding: 16,
          marginBottom: 10,
          marginHorizontal: 20,
          borderWidth: 1,
          borderColor: COLORS.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        }}
        activeOpacity={0.75}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
          {/* Mood circle */}
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: item.mood_score ? getMoodColor(item.mood_score) + "18" : COLORS.bg,
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Text style={{ fontSize: 22 }}>
              {item.mood_score ? getMoodEmoji(item.mood_score) : "📝"}
            </Text>
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
              <Text style={{ fontSize: 12, color: COLORS.muted, textTransform: "capitalize", flex: 1 }}>
                {dateStr}
              </Text>
              {item.mood_score && (
                <Text style={{ fontSize: 13, fontWeight: "700", color: getMoodColor(item.mood_score) }}>
                  {item.mood_score}/10
                </Text>
              )}
            </View>

            {item.highlights && (
              <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.text, marginBottom: 4 }} numberOfLines={1}>
                {item.highlights}
              </Text>
            )}

            {item.ai_summary && (
              <Text style={{ fontSize: 13, color: COLORS.subtle, lineHeight: 19 }} numberOfLines={2}>
                {item.ai_summary}
              </Text>
            )}

            {item.categories && item.categories.length > 0 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                {item.categories.slice(0, 3).map((c) => {
                  const cfg = CATEGORY_CONFIG[c.category_name];
                  return (
                    <View
                      key={c.id}
                      style={{
                        backgroundColor: cfg.color + "18",
                        borderRadius: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      <Ionicons name={cfg.icon as any} size={10} color={cfg.color} />
                      <Text style={{ fontSize: 11, color: cfg.color, fontWeight: "700" }}>
                        {cfg[`label_${i18n.language as "de" | "en"}`]}
                      </Text>
                    </View>
                  );
                })}
                {item.categories.length > 3 && (
                  <View style={{ backgroundColor: COLORS.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 11, color: COLORS.muted, fontWeight: "600" }}>+{item.categories.length - 3}</Text>
                  </View>
                )}
              </View>
            )}

            {(item.processing_status === "pending" || item.processing_status === "processing") && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.amber }} />
                <Text style={{ fontSize: 11, color: COLORS.amber, fontWeight: "600" }}>
                  {t("entry.processingPending")}
                </Text>
              </View>
            )}
          </View>

          <Ionicons name="chevron-forward" size={16} color={COLORS.muted} style={{ marginTop: 4 }} />
        </View>
      </TouchableOpacity>
    );
  };

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
          {t("entries.title")}
        </Text>

        {/* Search bar */}
        <View
          style={{
            backgroundColor: "rgba(255,255,255,0.9)",
            borderRadius: 14,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 14,
            borderWidth: 1,
            borderColor: focused ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.5)",
          }}
        >
          <Ionicons name="search-outline" size={16} color={COLORS.muted} style={{ marginRight: 8 }} />
          <TextInput
            style={{ flex: 1, color: COLORS.text, fontSize: 15, paddingVertical: 12 }}
            placeholder={t("entries.searchPlaceholder")}
            placeholderTextColor={COLORS.muted}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color={COLORS.muted} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Count chip */}
      {filtered.length > 0 && (
        <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 }}>
          <Text style={{ fontSize: 13, color: COLORS.muted, fontWeight: "600" }}>
            {filtered.length} {filtered.length === 1 ? "Eintrag" : "Einträge"}
          </Text>
        </View>
      )}

      <FlatList
        data={filtered}
        renderItem={renderEntry}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: 10, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.orange}
          />
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: 80, paddingHorizontal: 48 }}>
            <Text style={{ fontSize: 44, marginBottom: 16 }}>📖</Text>
            <Text style={{ fontSize: 17, fontWeight: "700", color: COLORS.text, marginBottom: 8 }}>
              {t("entries.noEntries")}
            </Text>
            <Text style={{ fontSize: 14, color: COLORS.subtle, textAlign: "center", lineHeight: 22 }}>
              {t("entries.startJourney")}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/journal")}
              style={{
                marginTop: 20,
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              <LinearGradient
                colors={["#FF6330", "#FF8555"]}
                style={{ paddingVertical: 14, paddingHorizontal: 28 }}
              >
                <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
                  Ersten Eintrag schreiben →
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}
