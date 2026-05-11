import { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, RefreshControl } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/authStore";
import { useJournalStore } from "@/store/journalStore";
import { COLORS, CATEGORY_CONFIG } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import type { JournalEntry } from "@/types";

function moodEmoji(s: number) {
  if (s >= 8) return "😄";
  if (s >= 6) return "🙂";
  if (s >= 4) return "😐";
  return "😔";
}

export default function EntriesScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const { entries, fetchEntries } = useJournalStore();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [focused, setFocused] = useState(false);

  useFocusEffect(useCallback(() => { if (user) fetchEntries(user.id, 100); }, [user]));

  const onRefresh = async () => { setRefreshing(true); if (user) await fetchEntries(user.id, 100); setRefreshing(false); };

  const filtered = search
    ? entries.filter((e) =>
        e.raw_text.toLowerCase().includes(search.toLowerCase()) ||
        e.ai_summary?.toLowerCase().includes(search.toLowerCase()) ||
        e.highlights?.toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  const renderItem = ({ item, index }: { item: JournalEntry; index: number }) => {
    const dateStr = new Date(item.date).toLocaleDateString(i18n.language === "de" ? "de-DE" : "en-US", {
      weekday: "short", day: "numeric", month: "short",
    });
    const isFirst = index === 0;
    const prevItem = filtered[index - 1];
    const sameMonth = !isFirst && new Date(prevItem.date).getMonth() === new Date(item.date).getMonth()
      && new Date(prevItem.date).getFullYear() === new Date(item.date).getFullYear();
    const monthLabel = new Date(item.date).toLocaleDateString(i18n.language === "de" ? "de-DE" : "en-US", { month: "long", year: "numeric" });

    return (
      <>
        {!sameMonth && (
          <Text style={{ fontSize: 12, fontWeight: "700", color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.8, paddingHorizontal: 24, paddingTop: isFirst ? 12 : 20, paddingBottom: 8 }}>
            {monthLabel}
          </Text>
        )}
        <TouchableOpacity
          onPress={() => router.push(`/entry/${item.id}`)}
          activeOpacity={0.75}
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            paddingHorizontal: 24,
            paddingVertical: 14,
            backgroundColor: COLORS.bg,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.borderLight,
            gap: 14,
          }}
        >
          {/* Date column */}
          <View style={{ width: 36, alignItems: "center", paddingTop: 2 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: COLORS.ink, lineHeight: 22 }}>
              {new Date(item.date).getDate()}
            </Text>
            <Text style={{ fontSize: 10, color: COLORS.muted, fontWeight: "600", textTransform: "uppercase" }}>
              {new Date(item.date).toLocaleDateString(i18n.language === "de" ? "de-DE" : "en-US", { weekday: "short" })}
            </Text>
          </View>

          {/* Content */}
          <View style={{ flex: 1 }}>
            {item.highlights && (
              <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.ink, marginBottom: 3, lineHeight: 20 }} numberOfLines={1}>
                {item.highlights}
              </Text>
            )}
            {item.ai_summary && (
              <Text style={{ fontSize: 13, color: COLORS.subtle, lineHeight: 19 }} numberOfLines={2}>
                {item.ai_summary}
              </Text>
            )}
            {item.categories && item.categories.length > 0 && (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 7 }}>
                {item.categories.slice(0, 4).map((c) => {
                  const cfg = CATEGORY_CONFIG[c.category_name];
                  return (
                    <View
                      key={c.id}
                      style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: cfg.color + "14", borderRadius: 5, paddingHorizontal: 7, paddingVertical: 2 }}
                    >
                      <Ionicons name={cfg.icon as any} size={10} color={cfg.color} />
                      <Text style={{ fontSize: 11, color: cfg.color, fontWeight: "700" }}>
                        {cfg[`label_${i18n.language as "de" | "en"}`]}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
            {(item.processing_status === "pending" || item.processing_status === "processing") && (
              <Text style={{ fontSize: 11, color: COLORS.amber, marginTop: 5, fontWeight: "600" }}>● Wird analysiert…</Text>
            )}
          </View>

          {/* Right side */}
          <View style={{ alignItems: "flex-end", gap: 4, paddingTop: 2 }}>
            {item.mood_score && <Text style={{ fontSize: 17 }}>{moodEmoji(item.mood_score)}</Text>}
            <Ionicons name="chevron-forward" size={13} color={COLORS.muted} />
          </View>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Header */}
      <View style={{ paddingTop: 64, paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
        <Text style={{ fontSize: 24, fontWeight: "800", color: COLORS.ink, letterSpacing: -0.6, marginBottom: 14 }}>
          {t("entries.title")}
        </Text>
        {/* Search */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: COLORS.cardAlt,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: focused ? COLORS.ink + "40" : COLORS.border,
            paddingHorizontal: 12,
            gap: 8,
          }}
        >
          <Ionicons name="search-outline" size={16} color={COLORS.muted} />
          <TextInput
            style={{ flex: 1, fontSize: 15, color: COLORS.ink, paddingVertical: 11 }}
            placeholder={t("entries.searchPlaceholder")}
            placeholderTextColor={COLORS.muted}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={15} color={COLORS.muted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.muted} />}
        ListHeaderComponent={
          filtered.length > 0 ? (
            <Text style={{ fontSize: 12, color: COLORS.muted, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 2, fontWeight: "600" }}>
              {filtered.length} {filtered.length === 1 ? "Eintrag" : "Einträge"}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: 80, paddingHorizontal: 48 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: COLORS.ink, marginBottom: 6 }}>
              {t("entries.noEntries")}
            </Text>
            <Text style={{ fontSize: 13, color: COLORS.muted, textAlign: "center", lineHeight: 20 }}>
              {t("entries.startJourney")}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/journal")}
              activeOpacity={0.85}
              style={{ marginTop: 20, backgroundColor: COLORS.ink, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24 }}
            >
              <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>Jetzt schreiben</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}
