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

  // New goal form
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState<CategoryName>("GOALS");
  const [newDeadline, setNewDeadline] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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
  const filtered = filter === "ALL" ? goals : goals.filter((g) => g.status === filter);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <LinearGradient
        colors={["#141829", "#0A0F1E"]}
        style={{ paddingTop: 64, paddingHorizontal: 24, paddingBottom: 20 }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <Text style={{ fontSize: 26, fontWeight: "800", color: COLORS.text, letterSpacing: -0.5 }}>
            {t("goals.title")}
          </Text>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={{
              backgroundColor: COLORS.violet,
              borderRadius: 12,
              padding: 10,
              shadowColor: COLORS.violet,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 6,
            }}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Filter tabs */}
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
                  backgroundColor: filter === f ? COLORS.violet : COLORS.card2,
                  borderWidth: 1,
                  borderColor: filter === f ? COLORS.violet : COLORS.border,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: filter === f ? "#fff" : COLORS.subtle }}>
                  {f === "ALL" ? t("entries.filterAll") : t(`goals.${f.toLowerCase()}`)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.violet} />
        }
      >
        {/* Stalled goals nudge */}
        {stalledGoals.length > 0 && (
          <View
            style={{
              backgroundColor: COLORS.amber + "15",
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: COLORS.amber + "40",
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <Text style={{ fontSize: 20 }}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: COLORS.amber, marginBottom: 4 }}>
                Vergessene Ziele
              </Text>
              {stalledGoals.map((g) => (
                <Text key={g.id} style={{ fontSize: 13, color: COLORS.subtle }}>
                  • {g.title}
                </Text>
              ))}
            </View>
          </View>
        )}

        {filtered.length === 0 ? (
          <View style={{ alignItems: "center", paddingTop: 60 }}>
            <Text style={{ fontSize: 40, marginBottom: 16 }}>🎯</Text>
            <Text style={{ fontSize: 17, fontWeight: "700", color: COLORS.text, marginBottom: 8 }}>
              {t("goals.noGoals")}
            </Text>
            <TouchableOpacity
              onPress={() => setModalVisible(true)}
              style={{
                backgroundColor: COLORS.violet,
                borderRadius: 14,
                paddingVertical: 14,
                paddingHorizontal: 28,
                marginTop: 8,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 15, fontWeight: "700" }}>
                {t("goals.addGoal")}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          filtered.map((goal) => {
            const cfg = CATEGORY_CONFIG[goal.category as CategoryName];
            const isStalled = stalledGoals.some((g) => g.id === goal.id);
            return (
              <View
                key={goal.id}
                style={{
                  backgroundColor: COLORS.card,
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 12,
                  borderWidth: 1,
                  borderColor: isStalled ? COLORS.amber + "40" : COLORS.border,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      backgroundColor: cfg.color + "20",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name={cfg.icon as any} size={16} color={cfg.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: COLORS.text, marginBottom: 2 }}>
                      {goal.title}
                    </Text>
                    {goal.description && (
                      <Text style={{ fontSize: 13, color: COLORS.subtle }} numberOfLines={2}>
                        {goal.description}
                      </Text>
                    )}
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                      backgroundColor:
                        goal.status === "COMPLETED"
                          ? COLORS.success + "20"
                          : goal.status === "PAUSED"
                          ? COLORS.muted + "20"
                          : COLORS.violet + "20",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color:
                          goal.status === "COMPLETED"
                            ? COLORS.success
                            : goal.status === "PAUSED"
                            ? COLORS.muted
                            : COLORS.violet,
                      }}
                    >
                      {t(`goals.${goal.status.toLowerCase()}`)}
                    </Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text style={{ fontSize: 12, color: COLORS.muted }}>{t("goals.progress")}</Text>
                    <Text style={{ fontSize: 12, color: COLORS.violet, fontWeight: "700" }}>{goal.progress}%</Text>
                  </View>
                  <View style={{ height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: "hidden" }}>
                    <View
                      style={{
                        height: "100%",
                        width: `${goal.progress}%`,
                        backgroundColor: goal.status === "COMPLETED" ? COLORS.success : COLORS.violet,
                        borderRadius: 2,
                      }}
                    />
                  </View>
                </View>

                {/* Actions */}
                {goal.status === "ACTIVE" && (
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => markComplete(goal.id)}
                      style={{
                        flex: 1,
                        backgroundColor: COLORS.success + "15",
                        borderRadius: 10,
                        paddingVertical: 8,
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: COLORS.success + "30",
                      }}
                    >
                      <Text style={{ fontSize: 13, color: COLORS.success, fontWeight: "600" }}>
                        ✓ {t("goals.markComplete")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(goal.id)}
                      style={{
                        backgroundColor: COLORS.danger + "15",
                        borderRadius: 10,
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderWidth: 1,
                        borderColor: COLORS.danger + "30",
                      }}
                    >
                      <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* New Goal Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
          <View
            style={{
              paddingTop: 24,
              paddingHorizontal: 24,
              paddingBottom: 20,
              borderBottomWidth: 1,
              borderBottomColor: COLORS.border,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: "800", color: COLORS.text }}>
              {t("goals.addGoal")}
            </Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={COLORS.subtle} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 24 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.subtle, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {t("goals.goalTitle")} *
            </Text>
            <TextInput
              style={{
                backgroundColor: COLORS.card,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: COLORS.border,
                color: COLORS.text,
                fontSize: 16,
                padding: 16,
                marginBottom: 16,
              }}
              placeholder={t("goals.titlePlaceholder")}
              placeholderTextColor={COLORS.muted}
              value={newTitle}
              onChangeText={setNewTitle}
              keyboardAppearance="dark"
            />

            <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.subtle, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {t("goals.description")}
            </Text>
            <TextInput
              style={{
                backgroundColor: COLORS.card,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: COLORS.border,
                color: COLORS.text,
                fontSize: 16,
                padding: 16,
                marginBottom: 16,
                minHeight: 80,
                textAlignVertical: "top",
              }}
              placeholder={t("goals.descriptionPlaceholder")}
              placeholderTextColor={COLORS.muted}
              value={newDesc}
              onChangeText={setNewDesc}
              multiline
              keyboardAppearance="dark"
            />

            <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.subtle, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {t("goals.category")}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {CATEGORIES.map((cat) => {
                const cfg = CATEGORY_CONFIG[cat];
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setNewCategory(cat)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 10,
                      backgroundColor: newCategory === cat ? cfg.color : COLORS.card,
                      borderWidth: 1,
                      borderColor: newCategory === cat ? cfg.color : COLORS.border,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Ionicons name={cfg.icon as any} size={13} color={newCategory === cat ? "#fff" : cfg.color} />
                    <Text style={{ fontSize: 13, fontWeight: "600", color: newCategory === cat ? "#fff" : COLORS.subtle }}>
                      {cfg[`label_${i18n.language as "de" | "en"}`]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.subtle, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
              {t("goals.deadline")} (YYYY-MM-DD)
            </Text>
            <TextInput
              style={{
                backgroundColor: COLORS.card,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: COLORS.border,
                color: COLORS.text,
                fontSize: 16,
                padding: 16,
                marginBottom: 32,
              }}
              placeholder="2025-12-31"
              placeholderTextColor={COLORS.muted}
              value={newDeadline}
              onChangeText={setNewDeadline}
              keyboardAppearance="dark"
            />

            <TouchableOpacity
              onPress={handleCreate}
              disabled={isSaving || !newTitle.trim()}
              style={{
                backgroundColor: newTitle.trim() ? COLORS.violet : COLORS.card,
                borderRadius: 14,
                paddingVertical: 18,
                alignItems: "center",
              }}
            >
              <Text style={{ color: newTitle.trim() ? "#fff" : COLORS.muted, fontSize: 17, fontWeight: "700" }}>
                {t("common.save")}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
