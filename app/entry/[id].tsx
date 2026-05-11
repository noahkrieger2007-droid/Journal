import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useJournalStore } from "@/store/journalStore";
import { COLORS, CATEGORY_CONFIG } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import type { JournalEntry } from "@/types";

function MoodBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
        <Text style={{ fontSize: 12, color: COLORS.muted }}>{label}</Text>
        <Text style={{ fontSize: 14, fontWeight: "700", color }}>{value}/10</Text>
      </View>
      <View style={{ height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: "hidden" }}>
        <View style={{ height: "100%", width: `${(value / 10) * 100}%`, backgroundColor: color, borderRadius: 3 }} />
      </View>
    </View>
  );
}

export default function EntryDetailScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { fetchEntry, deleteEntry } = useJournalStore();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showRaw, setShowRaw] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchEntry(id).then((e) => {
        setEntry(e);
        setIsLoading(false);
      });
    }
  }, [id]);

  const handleDelete = () => {
    Alert.alert(t("entry.deleteEntry"), t("entry.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          if (entry) {
            await deleteEntry(entry.id);
            router.back();
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={COLORS.violet} size="large" />
      </View>
    );
  }

  if (!entry) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: COLORS.subtle }}>Eintrag nicht gefunden.</Text>
      </View>
    );
  }

  const dateStr = new Date(entry.date).toLocaleDateString(
    i18n.language === "de" ? "de-DE" : "en-US",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" }
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Full-screen photo viewer */}
      {selectedPhoto && (
        <TouchableOpacity
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 100,
            backgroundColor: "#000",
            alignItems: "center",
            justifyContent: "center",
          }}
          onPress={() => setSelectedPhoto(null)}
          activeOpacity={1}
        >
          <Image source={{ uri: selectedPhoto }} style={{ width: "100%", height: "80%" }} resizeMode="contain" />
          <Text style={{ color: COLORS.subtle, marginTop: 16, fontSize: 13 }}>Tippen zum Schließen</Text>
        </TouchableOpacity>
      )}

      {/* Header */}
      <LinearGradient colors={["#141829", "#0A0F1E"]} style={{ paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 16 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }}>
            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, color: COLORS.subtle, textTransform: "capitalize" }}>{dateStr}</Text>
            {entry.highlights && (
              <Text style={{ fontSize: 17, fontWeight: "700", color: COLORS.text }} numberOfLines={1}>
                {entry.highlights}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={handleDelete} style={{ padding: 8 }}>
            <Ionicons name="trash-outline" size={20} color={COLORS.danger} />
          </TouchableOpacity>
        </View>

        {/* Mood & Energy */}
        {(entry.mood_score || entry.energy_score) && (
          <View style={{ flexDirection: "row", gap: 16 }}>
            {entry.mood_score && (
              <MoodBar label={t("entry.mood")} value={entry.mood_score} color={COLORS.violet} />
            )}
            {entry.energy_score && (
              <MoodBar label={t("entry.energy")} value={entry.energy_score} color={COLORS.amber} />
            )}
          </View>
        )}
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {/* Categories */}
        {entry.categories && entry.categories.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: COLORS.subtle, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
              {t("entry.categories")}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {entry.categories.map((c) => {
                const cfg = CATEGORY_CONFIG[c.category_name];
                return (
                  <View
                    key={c.id}
                    style={{
                      backgroundColor: cfg.color + "20",
                      borderRadius: 10,
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      borderWidth: 1,
                      borderColor: cfg.color + "40",
                    }}
                  >
                    <Ionicons name={cfg.icon as any} size={14} color={cfg.color} />
                    <Text style={{ fontSize: 13, color: cfg.color, fontWeight: "700" }}>
                      {cfg[`label_${i18n.language as "de" | "en"}`]}
                    </Text>
                    {c.duration_minutes && (
                      <Text style={{ fontSize: 12, color: cfg.color + "CC" }}>
                        {c.duration_minutes}min
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* AI Summary */}
        {entry.ai_summary && (
          <View
            style={{
              backgroundColor: COLORS.card,
              borderRadius: 20,
              padding: 20,
              marginBottom: 20,
              borderWidth: 1,
              borderColor: COLORS.violet + "30",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: COLORS.violet + "20", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 14 }}>✨</Text>
              </View>
              <Text style={{ fontSize: 13, fontWeight: "700", color: COLORS.violet, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {t("entry.summary")}
              </Text>
            </View>
            <Text style={{ fontSize: 15, color: COLORS.text, lineHeight: 24 }}>
              {entry.ai_summary}
            </Text>
          </View>
        )}

        {/* Achievements */}
        {entry.achievements && entry.achievements.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: COLORS.subtle, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
              {t("entry.achievements")} 🏆
            </Text>
            {entry.achievements.map((a) => (
              <View
                key={a.id}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 10,
                  backgroundColor: COLORS.card,
                  borderRadius: 12,
                  padding: 14,
                  marginBottom: 8,
                  borderWidth: 1,
                  borderColor: COLORS.amber + "30",
                }}
              >
                <Text style={{ fontSize: 16 }}>⭐</Text>
                <Text style={{ fontSize: 14, color: COLORS.text, flex: 1, lineHeight: 20 }}>
                  {a.description}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Photos */}
        {entry.photos && entry.photos.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: COLORS.subtle, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 10 }}>
              {t("entry.photos")}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {entry.photos.map((p) => (
                <TouchableOpacity key={p.id} onPress={() => setSelectedPhoto(p.storage_url)}>
                  <Image
                    source={{ uri: p.storage_url }}
                    style={{ width: 100, height: 100, borderRadius: 12 }}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Raw text toggle */}
        <TouchableOpacity
          onPress={() => setShowRaw(!showRaw)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            backgroundColor: COLORS.card,
            borderRadius: 12,
            padding: 14,
            marginBottom: showRaw ? 10 : 0,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <Ionicons name={showRaw ? "chevron-up" : "chevron-down"} size={16} color={COLORS.muted} />
          <Text style={{ fontSize: 14, color: COLORS.muted, fontWeight: "600" }}>
            {showRaw ? t("entry.hideRaw") : t("entry.showRaw")}
          </Text>
        </TouchableOpacity>

        {showRaw && (
          <View
            style={{
              backgroundColor: COLORS.card,
              borderRadius: 12,
              padding: 16,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            <Text style={{ fontSize: 14, color: COLORS.subtle, lineHeight: 22 }}>
              {entry.raw_text}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
