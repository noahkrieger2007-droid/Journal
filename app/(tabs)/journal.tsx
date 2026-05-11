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

const STEPS_DE = ["Analysiere...", "Erkenne Kategorien...", "Extrahiere Highlights...", "Erstelle Zusammenfassung...", "Fertigstellen..."];
const STEPS_EN = ["Analysing...", "Detecting categories...", "Extracting highlights...", "Writing summary...", "Finalising..."];

export default function JournalScreen() {
  const { t, i18n } = useTranslation();
  const { user } = useAuthStore();
  const { createEntry, processEntry, isProcessing, processingStep } = useJournalStore();
  const { settings } = useSettingsStore();

  const [text, setText] = useState("");
  const [interim, setInterim] = useState(""); // live preview while speaking
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepLabel, setStepLabel] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const recognitionRef = useRef<any>(null);

  const steps = i18n.language === "de" ? STEPS_DE : STEPS_EN;

  useEffect(() => {
    if (isProcessing) {
      setStepLabel(steps[Math.min(processingStep, steps.length - 1)]);
      Animated.timing(progressAnim, {
        toValue: (processingStep + 1) / steps.length,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [isProcessing, processingStep]);

  useEffect(() => {
    return () => { recognitionRef.current?.stop(); };
  }, []);

  const startVoice = () => {
    if (typeof window === "undefined") { Alert.alert("", t("journal.voiceNotAvailable")); return; }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { Alert.alert("", "Spracheingabe ist in diesem Browser nicht verfügbar."); return; }
    const r = new SR();
    r.lang = i18n.language === "de" ? "de-DE" : "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e: any) => {
      let finalPart = "";
      let interimPart = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          finalPart += result[0].transcript;
        } else {
          interimPart += result[0].transcript;
        }
      }
      if (finalPart) {
        setText((p) => p ? p.trimEnd() + " " + finalPart.trim() : finalPart.trim());
        setInterim("");
      } else {
        setInterim(interimPart);
      }
    };
    r.onerror = (e: any) => {
      setIsRecording(false);
      setInterim("");
      if (e.error !== "aborted" && e.error !== "no-speech") Alert.alert("", "Sprachfehler: " + e.error);
    };
    r.onend = () => { setIsRecording(false); setInterim(""); };
    r.start();
    recognitionRef.current = r;
    setIsRecording(true);
  };

  const stopVoice = () => { recognitionRef.current?.stop(); recognitionRef.current = null; setIsRecording(false); setInterim(""); };

  const pickImages = async () => {
    if (photos.length >= 5) { Alert.alert("", t("journal.maxPhotos")); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5 - photos.length,
    });
    if (!result.canceled) setPhotos((p) => [...p, ...result.assets.map((a) => a.uri)].slice(0, 5));
  };

  const handleSubmit = async () => {
    if (!user || text.trim().length < 50) { Alert.alert("", t("journal.minLength")); return; }
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

  const today = new Date().toLocaleDateString(i18n.language === "de" ? "de-DE" : "en-US", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const charOk = text.length >= 50;

  if (isProcessing || isSubmitting) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center", paddingHorizontal: 36 }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            backgroundColor: COLORS.ink,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 28,
          }}
        >
          <Text style={{ fontSize: 32 }}>✦</Text>
        </View>
        <Text style={{ fontSize: 20, fontWeight: "800", color: COLORS.ink, marginBottom: 6, textAlign: "center" }}>
          NOVA analysiert…
        </Text>
        <Text style={{ fontSize: 14, color: COLORS.subtle, marginBottom: 32, textAlign: "center" }}>{stepLabel}</Text>
        <View style={{ width: "100%", height: 3, backgroundColor: COLORS.border, borderRadius: 2, overflow: "hidden" }}>
          <Animated.View
            style={{
              height: "100%",
              backgroundColor: COLORS.ink,
              borderRadius: 2,
              width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>

        {/* Header */}
        <View style={{ paddingTop: 64, paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
          <Text style={{ fontSize: 12, color: COLORS.muted, marginBottom: 2, letterSpacing: 0.2 }}>{today}</Text>
          <Text style={{ fontSize: 24, fontWeight: "800", color: COLORS.ink, letterSpacing: -0.6 }}>
            {t("journal.newEntry")}
          </Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 24 }} keyboardShouldPersistTaps="handled">

          {/* Recording pill */}
          {isRecording && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: COLORS.dangerBg,
                borderRadius: 10,
                paddingHorizontal: 14,
                paddingVertical: 10,
                marginBottom: 14,
              }}
            >
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.danger }} />
              <Text style={{ fontSize: 13, color: COLORS.danger, fontWeight: "600", flex: 1 }}>
                Aufnahme läuft — tippe "Stoppen" wenn fertig
              </Text>
            </View>
          )}

          {/* Text area */}
          <TextInput
            style={{
              fontSize: 17,
              color: COLORS.ink,
              lineHeight: 28,
              minHeight: 220,
              textAlignVertical: "top",
              backgroundColor: COLORS.card,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: text.length > 0 ? COLORS.ink + "30" : COLORS.border,
              padding: 18,
              marginBottom: 10,
            }}
            placeholder={t("journal.placeholder")}
            placeholderTextColor={COLORS.muted}
            value={text}
            onChangeText={setText}
            multiline
            autoFocus
          />

          {/* Live interim speech preview */}
          {interim.length > 0 && (
            <View style={{ backgroundColor: COLORS.cardAlt, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border }}>
              <Text style={{ fontSize: 15, color: COLORS.muted, fontStyle: "italic", lineHeight: 22 }}>
                {interim}
              </Text>
            </View>
          )}

          {/* Char count */}
          <Text style={{ fontSize: 12, color: charOk ? COLORS.success : COLORS.muted, textAlign: "right", marginBottom: 16, fontWeight: charOk ? "700" : "400" }}>
            {text.length} Zeichen{!charOk ? " (min. 50)" : " ✓"}
          </Text>

          {/* Photos */}
          {photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {photos.map((uri) => (
                <View key={uri} style={{ marginRight: 10, position: "relative" }}>
                  <Image source={{ uri }} style={{ width: 84, height: 84, borderRadius: 10 }} />
                  <TouchableOpacity
                    onPress={() => setPhotos((p) => p.filter((x) => x !== uri))}
                    style={{
                      position: "absolute", top: -6, right: -6,
                      width: 20, height: 20, borderRadius: 10,
                      backgroundColor: COLORS.ink,
                      alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Ionicons name="close" size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Action buttons */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={pickImages}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                backgroundColor: COLORS.card,
                borderRadius: 10,
                paddingVertical: 13,
                borderWidth: 1,
                borderColor: COLORS.border,
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="image-outline" size={17} color={COLORS.subtle} />
              <Text style={{ fontSize: 14, color: COLORS.subtle, fontWeight: "600" }}>
                Fotos{photos.length > 0 ? ` (${photos.length})` : ""}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={isRecording ? stopVoice : startVoice}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                backgroundColor: isRecording ? COLORS.dangerBg : COLORS.card,
                borderRadius: 10,
                paddingVertical: 13,
                borderWidth: 1,
                borderColor: isRecording ? COLORS.danger + "50" : COLORS.border,
              }}
              activeOpacity={0.75}
            >
              <Ionicons name={isRecording ? "stop-circle-outline" : "mic-outline"} size={17} color={isRecording ? COLORS.danger : COLORS.subtle} />
              <Text style={{ fontSize: 14, fontWeight: "600", color: isRecording ? COLORS.danger : COLORS.subtle }}>
                {isRecording ? "Stoppen" : "Sprechen"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Submit */}
        <View style={{ paddingHorizontal: 24, paddingBottom: Platform.OS === "ios" ? 40 : 24, paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.bg }}>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!charOk}
            activeOpacity={0.85}
            style={{
              backgroundColor: charOk ? COLORS.ink : COLORS.border,
              borderRadius: 12,
              paddingVertical: 17,
              alignItems: "center",
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: charOk ? "#fff" : COLORS.muted, letterSpacing: 0.2 }}>
              {t("journal.submit")}
            </Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </View>
  );
}
