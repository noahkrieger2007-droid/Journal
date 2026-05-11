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

export default function EntriesScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const { entries, fetchEntries, isLoading } = useJournalStore();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

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
          borderRadius: 16,
          padding: 16,
          marginBottom: 10,
          marginHorizontal: 24,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
        activeOpacity={0.7}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
          <View>
            <Text style={{ fontSize: 12, color: COLORS.muted, marginBottom: 2, textTransform: "capitalize" }}>
              {dateStr}
            </Text>
            {item.highlights && (
              <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.text }} numberOfLines={1}>
                {item.highlights}
              </Text>
            )}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            {item.mood_score && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="happy-outline" size={13} color={COLORS.violet} />
                <Text style={{ fontSize: 13, color: COLORS.violet, fontWeight: "700" }}>
                  {item.mood_score}
                </Text>
              </View>
            )}
            {item.energy_score && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="flash-outline" size={13} color={COLORS.amber} />
                <Text style={{ fontSize: 13, color: COLORS.amber, fontWeight: "700" }}>
                  {item.energy_score}
                </Text>
              </View>
            )}
          </View>
        </View>

        {item.ai_summary && (
          <Text style={{ fontSize: 13, color: COLORS.subtle, lineHeight: 19 }} numberOfLines={2}>
            {item.ai_summary}
          </Text>
        )}

        {item.categories && item.categories.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {item.categories.slice(0, 4).map((c) => {
              const cfg = CATEGORY_CONFIG[c.category_name];
              return (
                <View
                  key={c.id}
                  style={{
                    backgroundColor: cfg.color + "20",
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Ionicons name={cfg.icon as any} size={10} color={cfg.color} />
                  <Text style={{ fontSize: 11, color: cfg.color, fontWeight: "600" }}>
                    {cfg[`label_${i18n.language as "de" | "en"}`]}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {item.processing_status === "pending" || item.processing_status === "processing" ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.amber }} />
            <Text style={{ fontSize: 12, color: COLORS.amber }}>
              {t("entry.processingPending")}
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <LinearGradient
        colors={["#141829", "#0A0F1E"]}
        style={{ paddingTop: 64, paddingHorizontal: 24, paddingBottom: 20 }}
      >
        <Text style={{ fontSize: 26, fontWeight: "800", color: COLORS.text, letterSpacing: -0.5, marginBottom: 16 }}>
          {t("entries.title")}
        </Text>

        {/* Search */}
        <View
          style={{
            backgroundColor: COLORS.card2,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: COLORS.border,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 14,
          }}
        >
          <Ionicons name="search-outline" size={16} color={COLORS.muted} style={{ marginRight: 8 }} />
          <TextInput
            style={{ flex: 1, color: COLORS.text, fontSize: 15, paddingVertical: 12 }}
            placeholder={t("entries.searchPlaceholder")}
            placeholderTextColor={COLORS.muted}
            value={search}
            onChangeText={setSearch}
            keyboardAppearance="dark"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={16} color={COLORS.muted} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <FlatList
        data={filtered}
        renderItem={renderEntry}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.violet}
          />
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingTop: 80, paddingHorizontal: 48 }}>
            <Text style={{ fontSize: 40, marginBottom: 16 }}>📖</Text>
            <Text style={{ fontSize: 17, fontWeight: "700", color: COLORS.text, marginBottom: 8 }}>
              {t("entries.noEntries")}
            </Text>
            <Text style={{ fontSize: 14, color: COLORS.subtle, textAlign: "center" }}>
              {t("entries.startJourney")}
            </Text>
          </View>
        }
      />
    </View>
  );
}
