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

export default function LoginScreen() {
  const { t } = useTranslation();
  const { signIn } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) return;
    setIsLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace("/(tabs)");
    } catch {
      Alert.alert(t("common.error"), t("auth.loginError"));
    } finally {
      setIsLoading(false);
    }
  };

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
                {t("auth.loginTitle")}
              </Text>
              <Text style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", marginTop: 8, textAlign: "center" }}>
                {t("auth.loginSubtitle")}
              </Text>
            </View>
          </LinearGradient>

          <View style={{ paddingHorizontal: 28, paddingTop: 36 }}>
            {/* Email field */}
            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: COLORS.subtle, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 }}>
                {t("auth.email")}
              </Text>
              <View
                style={{
                  backgroundColor: COLORS.card,
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: focusedField === "email" ? COLORS.orange : COLORS.border,
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  shadowColor: focusedField === "email" ? COLORS.orange : "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: focusedField === "email" ? 0.15 : 0.04,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <Ionicons name="mail-outline" size={18} color={focusedField === "email" ? COLORS.orange : COLORS.muted} style={{ marginRight: 10 }} />
                <TextInput
                  style={{ flex: 1, color: COLORS.text, fontSize: 16, paddingVertical: 16 }}
                  placeholder={t("auth.emailPlaceholder")}
                  placeholderTextColor={COLORS.muted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {/* Password field */}
            <View style={{ marginBottom: 32 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: COLORS.subtle, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 }}>
                {t("auth.password")}
              </Text>
              <View
                style={{
                  backgroundColor: COLORS.card,
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: focusedField === "password" ? COLORS.orange : COLORS.border,
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  shadowColor: focusedField === "password" ? COLORS.orange : "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: focusedField === "password" ? 0.15 : 0.04,
                  shadowRadius: 8,
                  elevation: 2,
                }}
              >
                <Ionicons name="lock-closed-outline" size={18} color={focusedField === "password" ? COLORS.orange : COLORS.muted} style={{ marginRight: 10 }} />
                <TextInput
                  style={{ flex: 1, color: COLORS.text, fontSize: 16, paddingVertical: 16 }}
                  placeholder={t("auth.passwordPlaceholder")}
                  placeholderTextColor={COLORS.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={COLORS.muted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Login button */}
            <TouchableOpacity
              onPress={handleLogin}
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
                  <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700", letterSpacing: 0.3 }}>
                    {t("auth.login")}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={{ flexDirection: "row", justifyContent: "center" }}>
              <Text style={{ color: COLORS.muted, fontSize: 14 }}>{t("auth.noAccount")} </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
                <Text style={{ color: COLORS.orange, fontSize: 14, fontWeight: "700" }}>
                  {t("auth.register")}
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
