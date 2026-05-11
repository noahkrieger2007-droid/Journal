import { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/authStore";
import { useJournalStore } from "@/store/journalStore";
import { useSettingsStore } from "@/store/settingsStore";
import { COLORS, CATEGORY_CONFIG } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import type { JournalEntry } from "@/types";

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
        <Text style={{ fontSize: 11, color: COLORS.muted, fontWeight: "600" }}>{label}</Text>
        <Text style={{ fontSize: 13, fontWeight: "800", color }}>{value}/10</Text>
      </View>
      <View style={{ height: 5, backgroundColor: COLORS.cardAlt, borderRadius: 3, overflow: "hidden" }}>
        <View style={{ height: "100%", width: `${(value / 10) * 100}%`, backgroundColor: color, borderRadius: 3 }} />
      </View>
    </View>
  );
}

export default function EntryDetailScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const { settings } = useSettingsStore();
  const { fetchEntry, deleteEntry, processEntry } = useJournalStore();
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    const e = await fetchEntry(id);
    setEntry(e);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const handleDelete = () => {
    Alert.alert(t("entry.deleteEntry"), t("entry.deleteConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          if (entry) { await deleteEntry(entry.id); router.back(); }
        },
      },
    ]);
  };

  const handleRetry = async () => {
    if (!entry || !user) return;
    setIsRetrying(true);
    try {
      await processEntry(entry.id, user.id, settings.language || "de");
      await load();
    } catch (e: any) {
      Alert.alert("Fehler", e.message || "Verarbeitung fehlgeschlagen. Prüfe ob der API-Key in Supabase gesetzt ist.");
    } finally {
      setIsRetrying(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={COLORS.ink} />
      </View>
    );
  }

  if (!entry) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: COLORS.subtle, fontSize: 14 }}>Eintrag nicht gefunden.</Text>
      </View>
    );
  }

  const dateStr = new Date(entry.date).toLocaleDateString(
    i18n.language === "de" ? "de-DE" : "en-US",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" }
  );

  const isPending = entry.processing_status === "pending" || entry.processing_status === "processing";
  const isError = entry.processing_status === "error";

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Full-screen photo viewer */}
      {selectedPhoto && (
        <TouchableOpacity
          style={{ position: "absolute", inset: 0, zIndex: 100, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}
          onPress={() => setSelectedPhoto(null)}
          activeOpacity={1}
        >
          <Image source={{ uri: selectedPhoto }} style={{ width: "100%", height: "80%" }} resizeMode="contain" />
          <Text style={{ color: "rgba(255,255,255,0.5)", marginTop: 16, fontSize: 13 }}>Tippen zum Schließen</Text>
        </TouchableOpacity>
      )}

      {/* Header */}
      <View style={{ paddingTop: 60, paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 14 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={22} color={COLORS.ink} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: COLORS.muted, marginBottom: 2 }}>{dateStr}</Text>
            {entry.highlights && (
              <Text style={{ fontSize: 17, fontWeight: "800", color: COLORS.ink, letterSpacing: -0.3 }} numberOfLines={1}>
                {entry.highlights}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={handleDelete} style={{ padding: 6 }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={18} color={COLORS.muted} />
          </TouchableOpacity>
        </View>

        {/* Score bars */}
        {(entry.mood_score || entry.energy_score) && (
          <View style={{ flexDirection: "row", gap: 16 }}>
            {entry.mood_score && <ScoreBar label={t("entry.mood")} value={entry.mood_score} color={COLORS.success} />}
            {entry.energy_score && <ScoreBar label={t("entry.energy")} value={entry.energy_score} color={COLORS.amber} />}
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>

        {/* Processing status */}
        {isPending && (
          <View style={{ backgroundColor: COLORS.amberBg, borderRadius: 12, padding: 14, marginBottom: 16, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderColor: "#FCD34D" }}>
            <ActivityIndicator size="small" color={COLORS.amber} />
            <Text style={{ fontSize: 14, color: "#92400E", fontWeight: "600", flex: 1 }}>
              NOVA analysiert deinen Eintrag…
            </Text>
          </View>
        )}

        {isError && (
          <View style={{ backgroundColor: COLORS.dangerBg, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: COLORS.danger + "40" }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: COLORS.danger, marginBottom: 4 }}>
              Analyse fehlgeschlagen
            </Text>
            <Text style={{ fontSize: 13, color: COLORS.danger, marginBottom: 10, lineHeight: 19 }}>
              Mögliche Ursachen: ANTHROPIC_API_KEY nicht gesetzt oder Edge Function nicht deployed.
            </Text>
            <TouchableOpacity
              onPress={handleRetry}
              disabled={isRetrying}
              style={{ backgroundColor: COLORS.ink, borderRadius: 8, paddingVertical: 10, alignItems: "center" }}
            >
              {isRetrying
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>Erneut versuchen</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Categories */}
        {entry.categories && entry.categories.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>
              {t("entry.categories")}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
              {entry.categories.map((c) => {
                const cfg = CATEGORY_CONFIG[c.category_name];
                return (
                  <View
                    key={c.id}
                    style={{
                      backgroundColor: cfg.color + "14",
                      borderRadius: 8,
                      paddingHorizontal: 11,
                      paddingVertical: 6,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Ionicons name={cfg.icon as any} size={13} color={cfg.color} />
                    <Text style={{ fontSize: 13, color: cfg.color, fontWeight: "700" }}>
                      {cfg[`label_${i18n.language as "de" | "en"}`]}
                    </Text>
                    {c.duration_minutes && (
                      <Text style={{ fontSize: 11, color: cfg.color + "AA" }}>{c.duration_minutes}min</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* AI Summary — the main analysis from NOVA */}
        {entry.ai_summary && (
          <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
              <Text style={{ fontSize: 14 }}>✦</Text>
              <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.7 }}>
                NOVA Analyse
              </Text>
            </View>
            <View style={{ backgroundColor: COLORS.ink, borderRadius: 16, padding: 18 }}>
              <Text style={{ fontSize: 15, color: "rgba(255,255,255,0.92)", lineHeight: 25, fontWeight: "400" }}>
                {entry.ai_summary}
              </Text>
            </View>
          </View>
        )}

        {/* Achievements */}
        {entry.achievements && entry.achievements.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>
              {t("entry.achievements")}
            </Text>
            {entry.achievements.map((a) => (
              <View
                key={a.id}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 10,
                  backgroundColor: COLORS.successBg,
                  borderRadius: 10,
                  padding: 13,
                  marginBottom: 7,
                  borderWidth: 1,
                  borderColor: "#86EFAC",
                }}
              >
                <Text style={{ fontSize: 14 }}>⭐</Text>
                <Text style={{ fontSize: 14, color: COLORS.inkLight, flex: 1, lineHeight: 20 }}>
                  {a.description}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Photos */}
        {entry.photos && entry.photos.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 10 }}>
              {t("entry.photos")}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {entry.photos.map((p) => (
                <TouchableOpacity key={p.id} onPress={() => setSelectedPhoto(p.storage_url)} activeOpacity={0.85}>
                  <Image source={{ uri: p.storage_url }} style={{ width: 96, height: 96, borderRadius: 10 }} />
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
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: COLORS.border,
          }}
          activeOpacity={0.7}
        >
          <Ionicons name={showRaw ? "chevron-up" : "chevron-down"} size={14} color={COLORS.muted} />
          <Text style={{ fontSize: 13, color: COLORS.muted, fontWeight: "600" }}>
            {showRaw ? "Originaltext ausblenden" : "Originaltext anzeigen"}
          </Text>
        </TouchableOpacity>

        {showRaw && (
          <View style={{ backgroundColor: COLORS.cardAlt, borderRadius: 10, padding: 16, marginTop: 4 }}>
            <Text style={{ fontSize: 14, color: COLORS.subtle, lineHeight: 23 }}>{entry.raw_text}</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
