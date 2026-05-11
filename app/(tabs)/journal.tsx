import { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  ActivityIndicator,
  Animated,
} from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/authStore";
import { useJournalStore } from "@/store/journalStore";
import { useSettingsStore } from "@/store/settingsStore";
import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const PROCESSING_STEPS_DE = [
  "Analysiere deinen Tag...",
  "Erkenne Kategorien...",
  "Extrahiere Highlights...",
  "Erstelle Zusammenfassung...",
  "Aktualisiere Erinnerungen...",
];
const PROCESSING_STEPS_EN = [
  "Analysing your day...",
  "Detecting categories...",
  "Extracting highlights...",
  "Writing summary...",
  "Updating memories...",
];

export default function JournalScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const { createEntry, processEntry, isProcessing, processingStep } = useJournalStore();
  const { settings } = useSettingsStore();

  const [text, setText] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingStepLabel, setProcessingStepLabel] = useState("");

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  const steps = i18n.language === "de" ? PROCESSING_STEPS_DE : PROCESSING_STEPS_EN;

  useEffect(() => {
    if (isProcessing) {
      setProcessingStepLabel(steps[Math.min(processingStep, steps.length - 1)]);
      Animated.timing(progressAnim, {
        toValue: (processingStep + 1) / steps.length,
        duration: 600,
        useNativeDriver: false,
      }).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
    }
  }, [isProcessing, processingStep]);

  const pickImages = async () => {
    if (photos.length >= 5) {
      Alert.alert("", t("journal.maxPhotos"));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5 - photos.length,
    });
    if (!result.canceled) {
      const newUris = result.assets.map((a) => a.uri);
      setPhotos((prev) => [...prev, ...newUris].slice(0, 5));
    }
  };

  const removePhoto = (uri: string) => {
    setPhotos((prev) => prev.filter((p) => p !== uri));
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (text.trim().length < 50) {
      Alert.alert("", t("journal.minLength"));
      return;
    }

    setIsSubmitting(true);
    progressAnim.setValue(0);

    try {
      const today = new Date().toISOString().split("T")[0];
      const entry = await createEntry(user.id, text.trim(), today, photos);
      await processEntry(entry.id, user.id, settings.language);
      setText("");
      setPhotos([]);
      router.push(`/entry/${entry.id}`);
    } catch (err: any) {
      Alert.alert(t("common.error"), err.message || "Verarbeitung fehlgeschlagen.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date().toLocaleDateString(
    i18n.language === "de" ? "de-DE" : "en-US",
    { weekday: "long", day: "numeric", month: "long", year: "numeric" }
  );

  if (isProcessing || isSubmitting) {
    return (
      <LinearGradient colors={["#0A0F1E", "#141829"]} style={{ flex: 1 }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Animated.View
            style={{
              transform: [{ scale: pulseAnim }],
              width: 88,
              height: 88,
              borderRadius: 24,
              backgroundColor: COLORS.violet + "30",
              borderWidth: 2,
              borderColor: COLORS.violet,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 32,
            }}
          >
            <Text style={{ fontSize: 36 }}>✨</Text>
          </Animated.View>

          <Text style={{ fontSize: 20, fontWeight: "800", color: COLORS.text, marginBottom: 8, textAlign: "center" }}>
            {t("journal.processing")}
          </Text>
          <Text style={{ fontSize: 15, color: COLORS.subtle, marginBottom: 32, textAlign: "center" }}>
            {processingStepLabel}
          </Text>

          {/* Progress bar */}
          <View style={{ width: "100%", height: 4, backgroundColor: COLORS.border, borderRadius: 2, overflow: "hidden" }}>
            <Animated.View
              style={{
                height: "100%",
                backgroundColor: COLORS.violet,
                borderRadius: 2,
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              }}
            />
          </View>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <LinearGradient
          colors={["#141829", "#0A0F1E"]}
          style={{ paddingTop: 64, paddingHorizontal: 24, paddingBottom: 20 }}
        >
          <Text style={{ fontSize: 13, color: COLORS.subtle, marginBottom: 4 }}>{today}</Text>
          <Text style={{ fontSize: 26, fontWeight: "800", color: COLORS.text, letterSpacing: -0.5 }}>
            {t("journal.newEntry")}
          </Text>
        </LinearGradient>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Main text input */}
          <View
            style={{
              backgroundColor: COLORS.card,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: text.length > 0 ? COLORS.violet + "60" : COLORS.border,
              padding: 20,
              marginBottom: 16,
              minHeight: 240,
            }}
          >
            <TextInput
              style={{
                color: COLORS.text,
                fontSize: 17,
                lineHeight: 28,
                flex: 1,
                minHeight: 200,
                textAlignVertical: "top",
              }}
              placeholder={t("journal.placeholder")}
              placeholderTextColor={COLORS.muted}
              value={text}
              onChangeText={setText}
              multiline
              autoFocus
              keyboardAppearance="dark"
            />
          </View>

          {/* Character count */}
          <Text style={{ fontSize: 12, color: COLORS.muted, textAlign: "right", marginBottom: 16 }}>
            {text.length} Zeichen{text.length < 50 ? ` (min. 50)` : " ✓"}
          </Text>

          {/* Photos */}
          {photos.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16 }}
            >
              {photos.map((uri) => (
                <View key={uri} style={{ marginRight: 10, position: "relative" }}>
                  <Image
                    source={{ uri }}
                    style={{ width: 90, height: 90, borderRadius: 12 }}
                  />
                  <TouchableOpacity
                    onPress={() => removePhoto(uri)}
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: COLORS.danger,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="close" size={13} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Action row */}
          <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
            <TouchableOpacity
              onPress={pickImages}
              style={{
                flex: 1,
                backgroundColor: COLORS.card,
                borderRadius: 14,
                padding: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
            >
              <Ionicons name="image-outline" size={18} color={COLORS.subtle} />
              <Text style={{ fontSize: 14, color: COLORS.subtle, fontWeight: "600" }}>
                {t("journal.addPhotos")} {photos.length > 0 && `(${photos.length})`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: COLORS.card,
                borderRadius: 14,
                padding: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
              onPress={() => Alert.alert("", t("journal.voiceNotAvailable"))}
            >
              <Ionicons name="mic-outline" size={18} color={COLORS.subtle} />
              <Text style={{ fontSize: 14, color: COLORS.subtle, fontWeight: "600" }}>
                {t("journal.voiceInput")}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Submit button */}
        <View
          style={{
            paddingHorizontal: 24,
            paddingBottom: Platform.OS === "ios" ? 40 : 24,
            paddingTop: 16,
            backgroundColor: COLORS.bg,
            borderTopWidth: 1,
            borderTopColor: COLORS.border,
          }}
        >
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={text.length < 50}
            style={{
              backgroundColor: text.length >= 50 ? COLORS.violet : COLORS.card,
              borderRadius: 16,
              paddingVertical: 18,
              alignItems: "center",
              shadowColor: text.length >= 50 ? COLORS.violet : "transparent",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 12,
              elevation: text.length >= 50 ? 8 : 0,
            }}
          >
            <Text
              style={{
                color: text.length >= 50 ? "#fff" : COLORS.muted,
                fontSize: 17,
                fontWeight: "700",
                letterSpacing: 0.3,
              }}
            >
              {t("journal.submit")} ✨
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
