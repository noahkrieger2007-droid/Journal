import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/authStore";
import { useGoalsStore } from "@/store/goalsStore";
import { COLORS, CATEGORY_CONFIG } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import type { CategoryName, GoalStatus } from "@/types";

const CATEGORIES: CategoryName[] = [
  "SPORT", "SOCIAL", "LEARNING", "WORK", "HEALTH", "MINDSET", "GOALS", "OTHER",
];

export default function GoalsScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const { goals, fetchGoals, createGoal, deleteGoal, markComplete, getStalledGoals } = useGoalsStore();
  const [modalVisible, setModalVisible] = useState(false);
  const [filter, setFilter] = useState<GoalStatus | "ALL">("ALL");
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryName | "ALL">("ALL");

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState<CategoryName>("GOALS");
  const [newDeadline, setNewDeadline] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (user) fetchGoals(user.id);
    }, [user])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    if (user) await fetchGoals(user.id);
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (!user || !newTitle.trim()) return;
    setIsSaving(true);
    await createGoal(user.id, {
      title: newTitle.trim(),
      description: newDesc.trim() || null,
      category: newCategory,
      deadline: newDeadline.trim() || null,
      progress: 0,
    });
    setNewTitle("");
    setNewDesc("");
    setNewCategory("GOALS");
    setNewDeadline("");
    setModalVisible(false);
    setIsSaving(false);
  };

  const handleDelete = (goalId: string) => {
    Alert.alert(t("goals.deleteGoal"), t("common.confirm"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: () => deleteGoal(goalId) },
    ]);
  };

  const stalledGoals = user ? getStalledGoals(user.id) : [];

  const filtered = goals.filter((g) => {
    const statusOk = filter === "ALL" || g.status === filter;
    const catOk = activeCategory === "ALL" || g.category === activeCategory;
    return statusOk && catOk;
  });

  // Group by category
  const grouped: Record<string, typeof goals> = {};
  filtered.forEach((g) => {
    if (!grouped[g.category]) grouped[g.category] = [];
    grouped[g.category].push(g);
  });

  const usedCategories = [...new Set(goals.map((g) => g.category))] as CategoryName[];

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
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text style={{ fontSize: 26, fontWeight: "800", color: "#fff", letterSpacing: -0.5 }}>
            {t("goals.title")}
          </Text>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={{
              backgroundColor: "rgba(255,255,255,0.3)",
              borderRadius: 12,
              padding: 10,
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.5)",
            }}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Status filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["ALL", "ACTIVE", "COMPLETED", "PAUSED"] as const).map((f) => (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 10,
                  backgroundColor: filter === f ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.12)",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: filter === f ? COLORS.orange : "rgba(255,255,255,0.85)" }}>
                  {f === "ALL" ? t("entries.filterAll") : t(`goals.${f.toLowerCase()}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.orange} />}
      >
        {/* Category filter chips */}
        {usedCategories.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingVertical: 14, paddingLeft: 20 }}>
            <View style={{ flexDirection: "row", gap: 8, paddingRight: 20 }}>
              <TouchableOpacity
                onPress={() => setActiveCategory("ALL")}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 10,
                  backgroundColor: activeCategory === "ALL" ? COLORS.orange : COLORS.card,
                  borderWidth: 1,
                  borderColor: activeCategory === "ALL" ? COLORS.orange : COLORS.border,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: activeCategory === "ALL" ? "#fff" : COLORS.subtle }}>
                  Alle
                </Text>
              </TouchableOpacity>
              {usedCategories.map((cat) => {
                const cfg = CATEGORY_CONFIG[cat];
                const isActive = activeCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setActiveCategory(cat)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 10,
                      backgroundColor: isActive ? cfg.color : COLORS.card,
                      borderWidth: 1,
                      borderColor: isActive ? cfg.color : COLORS.border,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Ionicons name={cfg.icon as any} size={13} color={isActive ? "#fff" : cfg.color} />
                    <Text style={{ fontSize: 13, fontWeight: "700", color: isActive ? "#fff" : COLORS.subtle }}>
                      {cfg[`label_${i18n.language as "de" | "en"}`]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}

        <View style={{ paddingHorizontal: 20, paddingTop: usedCategories.length > 1 ? 0 : 16 }}>
          {/* Stalled goals nudge */}
          {stalledGoals.length > 0 && (
            <View
              style={{
                backgroundColor: "#FEF3C7",
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: "#F59E0B40",
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 10,
              }}
            >
              <Text style={{ fontSize: 20 }}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#92400E", marginBottom: 4 }}>
                  Vergessene Ziele
                </Text>
                {stalledGoals.map((g) => (
                  <Text key={g.id} style={{ fontSize: 13, color: "#92400E" }}>• {g.title}</Text>
                ))}
              </View>
            </View>
          )}

          {filtered.length === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <Text style={{ fontSize: 44, marginBottom: 16 }}>🎯</Text>
              <Text style={{ fontSize: 17, fontWeight: "700", color: COLORS.text, marginBottom: 8 }}>
                {t("goals.noGoals")}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(true)}
                style={{ borderRadius: 14, overflow: "hidden", marginTop: 8 }}
              >
                <LinearGradient
                  colors={["#FF6330", "#FF8555"]}
                  style={{ paddingVertical: 14, paddingHorizontal: 28 }}
                >
                  <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
                    {t("goals.addGoal")}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            // Render grouped by category
            Object.entries(grouped).map(([cat, catGoals]) => {
              const cfg = CATEGORY_CONFIG[cat as CategoryName];
              return (
                <View key={cat} style={{ marginBottom: 20 }}>
                  {/* Category header */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        backgroundColor: cfg.color + "20",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Ionicons name={cfg.icon as any} size={15} color={cfg.color} />
                    </View>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: COLORS.text }}>
                      {cfg[`label_${i18n.language as "de" | "en"}`]}
                    </Text>
                    <View
                      style={{
                        backgroundColor: cfg.color + "18",
                        borderRadius: 6,
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: cfg.color, fontWeight: "700" }}>{catGoals.length}</Text>
                    </View>
                  </View>

                  {catGoals.map((goal) => {
                    const isStalled = stalledGoals.some((g) => g.id === goal.id);
                    return (
                      <View
                        key={goal.id}
                        style={{
                          backgroundColor: COLORS.card,
                          borderRadius: 16,
                          padding: 16,
                          marginBottom: 10,
                          borderWidth: 1,
                          borderColor: isStalled ? "#F59E0B40" : COLORS.border,
                          shadowColor: "#000",
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.05,
                          shadowRadius: 8,
                          elevation: 2,
                        }}
                      >
                        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.text, marginBottom: 2 }}>
                              {goal.title}
                            </Text>
                            {goal.description && (
                              <Text style={{ fontSize: 13, color: COLORS.subtle }} numberOfLines={2}>
                                {goal.description}
                              </Text>
                            )}
                            {goal.deadline && (
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
                                <Ionicons name="calendar-outline" size={12} color={COLORS.muted} />
                                <Text style={{ fontSize: 11, color: COLORS.muted }}>Bis {goal.deadline}</Text>
                              </View>
                            )}
                          </View>
                          <View
                            style={{
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 8,
                              backgroundColor:
                                goal.status === "COMPLETED" ? COLORS.success + "18"
                                : goal.status === "PAUSED" ? COLORS.muted + "18"
                                : COLORS.orange + "18",
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: "700",
                                color:
                                  goal.status === "COMPLETED" ? COLORS.success
                                  : goal.status === "PAUSED" ? COLORS.muted
                                  : COLORS.orange,
                              }}
                            >
                              {t(`goals.${goal.status.toLowerCase()}`)}
                            </Text>
                          </View>
                        </View>

                        {/* Progress bar */}
                        <View style={{ marginBottom: goal.status === "ACTIVE" ? 10 : 0 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 5 }}>
                            <Text style={{ fontSize: 11, color: COLORS.muted, fontWeight: "600" }}>{t("goals.progress")}</Text>
                            <Text style={{ fontSize: 12, color: cfg.color, fontWeight: "800" }}>{goal.progress}%</Text>
                          </View>
                          <View style={{ height: 8, backgroundColor: COLORS.bg, borderRadius: 4, overflow: "hidden" }}>
                            <View
                              style={{
                                height: "100%",
                                width: `${goal.progress}%`,
                                backgroundColor: goal.status === "COMPLETED" ? COLORS.success : cfg.color,
                                borderRadius: 4,
                              }}
                            />
                          </View>
                        </View>

                        {goal.status === "ACTIVE" && (
                          <View style={{ flexDirection: "row", gap: 8 }}>
                            <TouchableOpacity
                              onPress={() => markComplete(goal.id)}
                              style={{
                                flex: 1,
                                backgroundColor: COLORS.success + "12",
                                borderRadius: 10,
                                paddingVertical: 9,
                                alignItems: "center",
                                borderWidth: 1,
                                borderColor: COLORS.success + "30",
                              }}
                            >
                              <Text style={{ fontSize: 13, color: COLORS.success, fontWeight: "700" }}>
                                ✓ {t("goals.markComplete")}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => handleDelete(goal.id)}
                              style={{
                                backgroundColor: COLORS.danger + "10",
                                borderRadius: 10,
                                paddingVertical: 9,
                                paddingHorizontal: 12,
                                borderWidth: 1,
                                borderColor: COLORS.danger + "25",
                              }}
                            >
                              <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
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

      {/* New Goal Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
          {/* Modal header */}
          <LinearGradient
            colors={["#FF6330", "#FF8555"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              paddingTop: 24,
              paddingHorizontal: 24,
              paddingBottom: 24,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: "800", color: "#fff" }}>
              {t("goals.addGoal")}
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                backgroundColor: "rgba(255,255,255,0.25)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={18} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView contentContainerStyle={{ padding: 24 }}>
            {/* Title */}
            <Text style={{ fontSize: 13, fontWeight: "700", color: COLORS.subtle, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 }}>
              {t("goals.goalTitle")} *
            </Text>
            <View
              style={{
                backgroundColor: COLORS.card,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: focusedField === "title" ? COLORS.orange : COLORS.border,
                marginBottom: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <TextInput
                style={{ color: COLORS.text, fontSize: 16, padding: 16 }}
                placeholder={t("goals.titlePlaceholder")}
                placeholderTextColor={COLORS.muted}
                value={newTitle}
                onChangeText={setNewTitle}
                onFocus={() => setFocusedField("title")}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Description */}
            <Text style={{ fontSize: 13, fontWeight: "700", color: COLORS.subtle, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 }}>
              {t("goals.description")}
            </Text>
            <View
              style={{
                backgroundColor: COLORS.card,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: focusedField === "desc" ? COLORS.orange : COLORS.border,
                marginBottom: 16,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <TextInput
                style={{ color: COLORS.text, fontSize: 16, padding: 16, minHeight: 80, textAlignVertical: "top" }}
                placeholder={t("goals.descriptionPlaceholder")}
                placeholderTextColor={COLORS.muted}
                value={newDesc}
                onChangeText={setNewDesc}
                multiline
                onFocus={() => setFocusedField("desc")}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            {/* Category */}
            <Text style={{ fontSize: 13, fontWeight: "700", color: COLORS.subtle, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.6 }}>
              {t("goals.category")}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {CATEGORIES.map((cat) => {
                const cfg = CATEGORY_CONFIG[cat];
                const isSelected = newCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setNewCategory(cat)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: isSelected ? cfg.color : COLORS.card,
                      borderWidth: 1,
                      borderColor: isSelected ? cfg.color : COLORS.border,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Ionicons name={cfg.icon as any} size={13} color={isSelected ? "#fff" : cfg.color} />
                    <Text style={{ fontSize: 13, fontWeight: "700", color: isSelected ? "#fff" : COLORS.subtle }}>
                      {cfg[`label_${i18n.language as "de" | "en"}`]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Deadline */}
            <Text style={{ fontSize: 13, fontWeight: "700", color: COLORS.subtle, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 }}>
              {t("goals.deadline")} (YYYY-MM-DD)
            </Text>
            <View
              style={{
                backgroundColor: COLORS.card,
                borderRadius: 14,
                borderWidth: 1.5,
                borderColor: focusedField === "deadline" ? COLORS.orange : COLORS.border,
                marginBottom: 32,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <TextInput
                style={{ color: COLORS.text, fontSize: 16, padding: 16 }}
                placeholder="2026-12-31"
                placeholderTextColor={COLORS.muted}
                value={newDeadline}
                onChangeText={setNewDeadline}
                onFocus={() => setFocusedField("deadline")}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <TouchableOpacity
              onPress={handleCreate}
              disabled={isSaving || !newTitle.trim()}
              style={{
                borderRadius: 14,
                overflow: "hidden",
                opacity: newTitle.trim() ? 1 : 0.5,
              }}
            >
              <LinearGradient
                colors={["#FF6330", "#FF8555"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 18, alignItems: "center" }}
              >
                <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700" }}>
                  {t("common.save")}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
