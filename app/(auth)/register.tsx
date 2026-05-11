import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/authStore";
import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { signUp } = useAuthStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || password.length < 8) {
      Alert.alert(t("common.error"), "Bitte alle Felder ausfüllen (Passwort min. 8 Zeichen).");
      return;
    }
    setIsLoading(true);
    try {
      await signUp(email.trim(), password, name.trim());
      const { user } = useAuthStore.getState();
      if (user) {
        router.replace("/(tabs)");
      } else {
        Alert.alert(
          "NOVA",
          "Fast fertig! Bitte bestätige deine E-Mail und melde dich dann an.",
          [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
        );
      }
    } catch (e: any) {
      Alert.alert(t("common.error"), e.message || t("auth.registerError"));
    } finally {
      setIsLoading(false);
    }
  };

  const field = (
    label: string,
    icon: string,
    fieldKey: string,
    value: string,
    onChange: (v: string) => void,
    opts?: { keyboardType?: any; secure?: boolean; showToggle?: boolean; onToggle?: () => void; autoCapitalize?: any }
  ) => (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: COLORS.subtle, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 }}>
        {label}
      </Text>
      <View
        style={{
          backgroundColor: COLORS.card,
          borderRadius: 16,
          borderWidth: 1.5,
          borderColor: focusedField === fieldKey ? COLORS.orange : COLORS.border,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          shadowColor: focusedField === fieldKey ? COLORS.orange : "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: focusedField === fieldKey ? 0.15 : 0.04,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        <Ionicons
          name={icon as any}
          size={18}
          color={focusedField === fieldKey ? COLORS.orange : COLORS.muted}
          style={{ marginRight: 10 }}
        />
        <TextInput
          style={{ flex: 1, color: COLORS.text, fontSize: 16, paddingVertical: 16 }}
          value={value}
          onChangeText={onChange}
          secureTextEntry={opts?.secure}
          keyboardType={opts?.keyboardType}
          autoCapitalize={opts?.autoCapitalize ?? "none"}
          autoCorrect={false}
          placeholderTextColor={COLORS.muted}
          onFocus={() => setFocusedField(fieldKey)}
          onBlur={() => setFocusedField(null)}
        />
        {opts?.showToggle && (
          <TouchableOpacity onPress={opts.onToggle}>
            <Ionicons
              name={opts.secure ? "eye-outline" : "eye-off-outline"}
              size={18}
              color={COLORS.muted}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Warm gradient header */}
          <LinearGradient
            colors={["#FF6330", "#FF8555", "#FFAA80"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingTop: 80,
              paddingBottom: 48,
              paddingHorizontal: 32,
              borderBottomLeftRadius: 40,
              borderBottomRightRadius: 40,
            }}
          >
            <View style={{ alignItems: "center" }}>
              <View
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 22,
                  backgroundColor: "rgba(255,255,255,0.25)",
                  borderWidth: 2,
                  borderColor: "rgba(255,255,255,0.5)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 20,
                }}
              >
                <Text style={{ fontSize: 36, fontWeight: "800", color: "#fff" }}>N</Text>
              </View>
              <Text style={{ fontSize: 32, fontWeight: "800", color: "#fff", letterSpacing: -0.5 }}>
                {t("auth.registerTitle")}
              </Text>
              <Text style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", marginTop: 8, textAlign: "center" }}>
                {t("auth.registerSubtitle")}
              </Text>
            </View>
          </LinearGradient>

          <View style={{ paddingHorizontal: 28, paddingTop: 36 }}>
            {field(t("auth.name"), "person-outline", "name", name, setName, { autoCapitalize: "words" })}
            {field(t("auth.email"), "mail-outline", "email", email, setEmail, { keyboardType: "email-address" })}
            {field(t("auth.password"), "lock-closed-outline", "password", password, setPassword, {
              secure: !showPassword,
              showToggle: true,
              onToggle: () => setShowPassword(!showPassword),
            })}

            <View style={{ height: 16 }} />

            <TouchableOpacity
              onPress={handleRegister}
              disabled={isLoading}
              style={{
                borderRadius: 16,
                overflow: "hidden",
                shadowColor: COLORS.orange,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.35,
                shadowRadius: 12,
                elevation: 8,
                marginBottom: 24,
              }}
            >
              <LinearGradient
                colors={["#FF6330", "#FF8555"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 18, alignItems: "center" }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700" }}>
                    {t("auth.register")}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={{ flexDirection: "row", justifyContent: "center" }}>
              <Text style={{ color: COLORS.muted, fontSize: 14 }}>{t("auth.alreadyAccount")} </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={{ color: COLORS.orange, fontSize: 14, fontWeight: "700" }}>
                  {t("auth.login")}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
