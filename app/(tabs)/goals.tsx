import { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput, Modal, Alert, RefreshControl } from "react-native";
import { useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/authStore";
import { useGoalsStore } from "@/store/goalsStore";
import { COLORS, CATEGORY_CONFIG } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import type { CategoryName, GoalStatus } from "@/types";

const CATEGORIES: CategoryName[] = ["SPORT", "SOCIAL", "LEARNING", "WORK", "HEALTH", "MINDSET", "GOALS", "OTHER"];

export default function GoalsScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const { goals, fetchGoals, createGoal, deleteGoal, markComplete, getStalledGoals } = useGoalsStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [filter, setFilter] = useState<GoalStatus | "ALL">("ALL");
  const [refreshing, setRefreshing] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState<CategoryName>("GOALS");
  const [newDeadline, setNewDeadline] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  useFocusEffect(useCallback(() => { if (user) fetchGoals(user.id); }, [user]));
  const onRefresh = async () => { setRefreshing(true); if (user) await fetchGoals(user.id); setRefreshing(false); };

  const handleCreate = async () => {
    if (!user || !newTitle.trim()) return;
    setIsSaving(true);
    await createGoal(user.id, { title: newTitle.trim(), description: newDesc.trim() || null, category: newCategory, deadline: newDeadline.trim() || null, progress: 0 });
    setNewTitle(""); setNewDesc(""); setNewCategory("GOALS"); setNewDeadline("");
    setModalVisible(false);
    setIsSaving(false);
  };

  const handleDelete = (id: string) =>
    Alert.alert(t("goals.deleteGoal"), t("common.confirm"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: () => deleteGoal(id) },
    ]);

  const stalledGoals = user ? getStalledGoals(user.id) : [];
  const filtered = filter === "ALL" ? goals : goals.filter((g) => g.status === filter);

  // Group by category
  const grouped: Record<string, typeof goals> = {};
  filtered.forEach((g) => { if (!grouped[g.category]) grouped[g.category] = []; grouped[g.category].push(g); });

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      {/* Header */}
      <View style={{ paddingTop: 64, paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <Text style={{ fontSize: 24, fontWeight: "800", color: COLORS.ink, letterSpacing: -0.6 }}>{t("goals.title")}</Text>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            activeOpacity={0.85}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.ink, alignItems: "center", justifyContent: "center" }}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        {/* Status filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 7 }}>
            {(["ALL", "ACTIVE", "COMPLETED", "PAUSED"] as const).map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={{
                  paddingHorizontal: 13,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: filter === f ? COLORS.ink : COLORS.cardAlt,
                  borderWidth: 1,
                  borderColor: filter === f ? COLORS.ink : COLORS.border,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: filter === f ? "#fff" : COLORS.subtle }}>
                  {f === "ALL" ? "Alle" : t(`goals.${f.toLowerCase()}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.muted} />}>
        <View style={{ paddingHorizontal: 24, paddingTop: 16 }}>

          {/* Stalled nudge */}
          {stalledGoals.length > 0 && (
            <View style={{ backgroundColor: COLORS.amberBg, borderRadius: 12, padding: 14, marginBottom: 16, flexDirection: "row", gap: 10, borderWidth: 1, borderColor: "#FCD34D" }}>
              <Text style={{ fontSize: 16 }}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: "#92400E", marginBottom: 3 }}>Vergessene Ziele</Text>
                {stalledGoals.map((g) => <Text key={g.id} style={{ fontSize: 12, color: "#92400E" }}>· {g.title}</Text>)}
              </View>
            </View>
          )}

          {filtered.length === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: COLORS.ink, marginBottom: 6 }}>{t("goals.noGoals")}</Text>
              <Text style={{ fontSize: 13, color: COLORS.muted, textAlign: "center", marginBottom: 20 }}>Setze dir Ziele und verfolge deinen Fortschritt.</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(true)}
                activeOpacity={0.85}
                style={{ backgroundColor: COLORS.ink, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24 }}
              >
                <Text style={{ color: "#fff", fontSize: 14, fontWeight: "700" }}>{t("goals.addGoal")}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            Object.entries(grouped).map(([cat, catGoals]) => {
              const cfg = CATEGORY_CONFIG[cat as CategoryName];
              return (
                <View key={cat} style={{ marginBottom: 24 }}>
                  {/* Category row */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10 }}>
                    <View style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: cfg.color + "16", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name={cfg.icon as any} size={13} color={cfg.color} />
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: "800", color: COLORS.ink }}>
                      {cfg[`label_${i18n.language as "de" | "en"}`]}
                    </Text>
                    <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: COLORS.cardAlt, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: COLORS.muted }}>{catGoals.length}</Text>
                    </View>
                  </View>

                  {catGoals.map((goal) => {
                    const stalled = stalledGoals.some((g) => g.id === goal.id);
                    return (
                      <View
                        key={goal.id}
                        style={{
                          backgroundColor: COLORS.card,
                          borderRadius: 12,
                          padding: 14,
                          marginBottom: 8,
                          borderWidth: 1,
                          borderColor: stalled ? "#FCD34D" : COLORS.border,
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.ink, marginBottom: goal.description ? 3 : 0 }}>
                              {goal.title}
                            </Text>
                            {goal.description && (
                              <Text style={{ fontSize: 13, color: COLORS.subtle, lineHeight: 18 }} numberOfLines={2}>{goal.description}</Text>
                            )}
                            {goal.deadline && (
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4 }}>
                                <Ionicons name="calendar-outline" size={11} color={COLORS.muted} />
                                <Text style={{ fontSize: 11, color: COLORS.muted }}>Bis {goal.deadline}</Text>
                              </View>
                            )}
                          </View>
                          <View
                            style={{
                              borderRadius: 6,
                              paddingHorizontal: 7,
                              paddingVertical: 3,
                              backgroundColor:
                                goal.status === "COMPLETED" ? COLORS.successBg
                                : goal.status === "PAUSED" ? COLORS.cardAlt
                                : COLORS.cardAlt,
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: "700", color: goal.status === "COMPLETED" ? COLORS.success : COLORS.subtle }}>
                              {t(`goals.${goal.status.toLowerCase()}`)}
                            </Text>
                          </View>
                        </View>

                        {/* Progress bar */}
                        <View style={{ marginBottom: goal.status === "ACTIVE" ? 10 : 0 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                            <Text style={{ fontSize: 11, color: COLORS.muted, fontWeight: "600" }}>Fortschritt</Text>
                            <Text style={{ fontSize: 12, fontWeight: "800", color: COLORS.ink }}>{goal.progress}%</Text>
                          </View>
                          <View style={{ height: 4, backgroundColor: COLORS.cardAlt, borderRadius: 2, overflow: "hidden" }}>
                            <View style={{ height: "100%", width: `${goal.progress}%`, backgroundColor: goal.status === "COMPLETED" ? COLORS.success : COLORS.ink, borderRadius: 2 }} />
                          </View>
                        </View>

                        {goal.status === "ACTIVE" && (
                          <View style={{ flexDirection: "row", gap: 8 }}>
                            <TouchableOpacity
                              onPress={() => markComplete(goal.id)}
                              style={{ flex: 1, backgroundColor: COLORS.successBg, borderRadius: 8, paddingVertical: 8, alignItems: "center", borderWidth: 1, borderColor: "#86EFAC" }}
                              activeOpacity={0.8}
                            >
                              <Text style={{ fontSize: 13, color: COLORS.success, fontWeight: "700" }}>✓ Abschließen</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDelete(goal.id)}
                              style={{ backgroundColor: COLORS.cardAlt, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: COLORS.border }}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="trash-outline" size={15} color={COLORS.muted} />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* New goal modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
          <View style={{ paddingTop: 24, paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 20, fontWeight: "800", color: COLORS.ink }}>{t("goals.addGoal")}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={COLORS.subtle} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 24 }}>
            {/* Title */}
            <Text style={{ fontSize: 12, fontWeight: "700", color: COLORS.subtle, marginBottom: 7, letterSpacing: 0.6, textTransform: "uppercase" }}>{t("goals.goalTitle")} *</Text>
            <View style={{ backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1.5, borderColor: focused === "title" ? COLORS.ink : COLORS.border, marginBottom: 16 }}>
              <TextInput style={{ fontSize: 16, color: COLORS.ink, padding: 14 }} placeholder={t("goals.titlePlaceholder")} placeholderTextColor={COLORS.muted} value={newTitle} onChangeText={setNewTitle} onFocus={() => setFocused("title")} onBlur={() => setFocused(null)} />
            </View>

            {/* Description */}
            <Text style={{ fontSize: 12, fontWeight: "700", color: COLORS.subtle, marginBottom: 7, letterSpacing: 0.6, textTransform: "uppercase" }}>{t("goals.description")}</Text>
            <View style={{ backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1.5, borderColor: focused === "desc" ? COLORS.ink : COLORS.border, marginBottom: 16 }}>
              <TextInput style={{ fontSize: 16, color: COLORS.ink, padding: 14, minHeight: 72, textAlignVertical: "top" }} placeholder={t("goals.descriptionPlaceholder")} placeholderTextColor={COLORS.muted} value={newDesc} onChangeText={setNewDesc} multiline onFocus={() => setFocused("desc")} onBlur={() => setFocused(null)} />
            </View>

            {/* Category */}
            <Text style={{ fontSize: 12, fontWeight: "700", color: COLORS.subtle, marginBottom: 10, letterSpacing: 0.6, textTransform: "uppercase" }}>{t("goals.category")}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 16 }}>
              {CATEGORIES.map((cat) => {
                const cfg = CATEGORY_CONFIG[cat];
                const sel = newCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setNewCategory(cat)}
                    style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: sel ? COLORS.ink : COLORS.cardAlt, borderWidth: 1, borderColor: sel ? COLORS.ink : COLORS.border, flexDirection: "row", alignItems: "center", gap: 5 }}
                  >
                    <Ionicons name={cfg.icon as any} size={12} color={sel ? "#fff" : cfg.color} />
                    <Text style={{ fontSize: 13, fontWeight: "700", color: sel ? "#fff" : COLORS.subtle }}>
                      {cfg[`label_${i18n.language as "de" | "en"}`]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Deadline */}
            <Text style={{ fontSize: 12, fontWeight: "700", color: COLORS.subtle, marginBottom: 7, letterSpacing: 0.6, textTransform: "uppercase" }}>Deadline (YYYY-MM-DD)</Text>
            <View style={{ backgroundColor: COLORS.card, borderRadius: 12, borderWidth: 1.5, borderColor: focused === "dl" ? COLORS.ink : COLORS.border, marginBottom: 32 }}>
              <TextInput style={{ fontSize: 16, color: COLORS.ink, padding: 14 }} placeholder="2026-12-31" placeholderTextColor={COLORS.muted} value={newDeadline} onChangeText={setNewDeadline} onFocus={() => setFocused("dl")} onBlur={() => setFocused(null)} />
            </View>

            <TouchableOpacity
              onPress={handleCreate}
              disabled={isSaving || !newTitle.trim()}
              activeOpacity={0.85}
              style={{ backgroundColor: newTitle.trim() ? COLORS.ink : COLORS.border, borderRadius: 12, paddingVertical: 17, alignItems: "center" }}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: newTitle.trim() ? "#fff" : COLORS.muted }}>{t("common.save")}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
