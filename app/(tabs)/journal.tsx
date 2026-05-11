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
  const [isRecording, setIsRecording] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const micPulse = useRef(new Animated.Value(1)).current;
  const recognitionRef = useRef<any>(null);

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

  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(micPulse, { toValue: 1.2, duration: 600, useNativeDriver: true }),
          Animated.timing(micPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      micPulse.stopAnimation();
      micPulse.setValue(1);
    }
  }, [isRecording]);

  // Stop recording when component unmounts
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const startVoice = () => {
    if (typeof window === "undefined") {
      Alert.alert("", t("journal.voiceNotAvailable"));
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      Alert.alert("", "Spracheingabe ist in diesem Browser nicht verfügbar. Bitte Safari oder Chrome verwenden.");
      return;
    }
    const recognition = new SR();
    recognition.lang = i18n.language === "de" ? "de-DE" : "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results as any[])
        .slice((e as any).resultIndex)
        .map((r: any) => r[0].transcript)
        .join(" ");
      setText((prev) => (prev ? prev + " " + transcript : transcript));
    };

    recognition.onerror = (e: any) => {
      setIsRecording(false);
      if (e.error !== "aborted") {
        Alert.alert("", "Sprachfehler: " + e.error);
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsRecording(true);
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsRecording(false);
  };

  const toggleVoice = () => {
    if (isRecording) {
      stopVoice();
    } else {
      startVoice();
    }
  };

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
    if (isRecording) stopVoice();
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

  const charOk = text.length >= 50;

  if (isProcessing || isSubmitting) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 }}>
          <Animated.View
            style={{
              transform: [{ scale: pulseAnim }],
              width: 96,
              height: 96,
              borderRadius: 28,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 32,
              overflow: "hidden",
            }}
          >
            <LinearGradient
              colors={["#FF6330", "#FF8555"]}
              style={{ width: "100%", height: "100%", alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontSize: 40 }}>✨</Text>
            </LinearGradient>
          </Animated.View>

          <Text style={{ fontSize: 22, fontWeight: "800", color: COLORS.text, marginBottom: 8, textAlign: "center" }}>
            {t("journal.processing")}
          </Text>
          <Text style={{ fontSize: 15, color: COLORS.subtle, marginBottom: 36, textAlign: "center" }}>
            {processingStepLabel}
          </Text>

          <View style={{ width: "100%", height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: "hidden" }}>
            <Animated.View
              style={{
                height: "100%",
                backgroundColor: COLORS.orange,
                borderRadius: 3,
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              }}
            />
          </View>
        </View>
      </View>
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
          <Text style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 4 }}>{today}</Text>
          <Text style={{ fontSize: 26, fontWeight: "800", color: "#fff", letterSpacing: -0.5 }}>
            {t("journal.newEntry")}
          </Text>
        </LinearGradient>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Voice recording banner */}
          {isRecording && (
            <View
              style={{
                backgroundColor: COLORS.danger + "15",
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 12,
                marginBottom: 12,
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                borderWidth: 1,
                borderColor: COLORS.danger + "40",
              }}
            >
              <Animated.View
                style={{
                  transform: [{ scale: micPulse }],
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: COLORS.danger,
                }}
              />
              <Text style={{ fontSize: 14, color: COLORS.danger, fontWeight: "600", flex: 1 }}>
                Aufnahme läuft... Tippe nochmal auf das Mikrofon zum Stoppen.
              </Text>
            </View>
          )}

          {/* Main text input */}
          <View
            style={{
              backgroundColor: COLORS.card,
              borderRadius: 20,
              borderWidth: 1.5,
              borderColor: text.length > 0 ? COLORS.orange + "60" : COLORS.border,
              padding: 20,
              marginBottom: 12,
              minHeight: 220,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 10,
              elevation: 2,
            }}
          >
            <TextInput
              style={{
                color: COLORS.text,
                fontSize: 17,
                lineHeight: 28,
                flex: 1,
                minHeight: 180,
                textAlignVertical: "top",
              }}
              placeholder={t("journal.placeholder")}
              placeholderTextColor={COLORS.muted}
              value={text}
              onChangeText={setText}
              multiline
              autoFocus
            />
          </View>

          {/* Char count */}
          <Text
            style={{
              fontSize: 12,
              color: charOk ? COLORS.success : COLORS.muted,
              textAlign: "right",
              marginBottom: 14,
              fontWeight: charOk ? "700" : "400",
            }}
          >
            {text.length} Zeichen{!charOk ? ` (min. 50)` : " ✓"}
          </Text>

          {/* Photos row */}
          {photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {photos.map((uri) => (
                <View key={uri} style={{ marginRight: 10, position: "relative" }}>
                  <Image source={{ uri }} style={{ width: 90, height: 90, borderRadius: 14 }} />
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
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
            {/* Photo button */}
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
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <Ionicons name="image-outline" size={18} color={COLORS.subtle} />
              <Text style={{ fontSize: 14, color: COLORS.subtle, fontWeight: "600" }}>
                Fotos {photos.length > 0 && `(${photos.length})`}
              </Text>
            </TouchableOpacity>

            {/* Voice button */}
            <TouchableOpacity
              onPress={toggleVoice}
              style={{
                flex: 1,
                borderRadius: 14,
                padding: 14,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderWidth: 1,
                backgroundColor: isRecording ? COLORS.danger + "15" : COLORS.card,
                borderColor: isRecording ? COLORS.danger + "50" : COLORS.border,
                shadowColor: isRecording ? COLORS.danger : "#000",
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isRecording ? 0.12 : 0.04,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <Ionicons
                name={isRecording ? "stop-circle-outline" : "mic-outline"}
                size={18}
                color={isRecording ? COLORS.danger : COLORS.subtle}
              />
              <Text style={{ fontSize: 14, color: isRecording ? COLORS.danger : COLORS.subtle, fontWeight: "600" }}>
                {isRecording ? "Stoppen" : "Sprache"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Submit bar */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingBottom: Platform.OS === "ios" ? 40 : 24,
            paddingTop: 14,
            backgroundColor: COLORS.bg,
            borderTopWidth: 1,
            borderTopColor: COLORS.border,
          }}
        >
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!charOk}
            style={{
              borderRadius: 16,
              overflow: "hidden",
              opacity: charOk ? 1 : 0.5,
              shadowColor: COLORS.orange,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: charOk ? 0.35 : 0,
              shadowRadius: 12,
              elevation: charOk ? 8 : 0,
            }}
          >
            <LinearGradient
              colors={charOk ? ["#FF6330", "#FF8555"] : [COLORS.border, COLORS.border]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ paddingVertical: 18, alignItems: "center" }}
            >
              <Text style={{ color: charOk ? "#fff" : COLORS.muted, fontSize: 17, fontWeight: "700", letterSpacing: 0.3 }}>
                {t("journal.submit")} ✨
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
