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
  const [focused, setFocused] = useState<string | null>(null);

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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ flex: 1, paddingHorizontal: 28, paddingTop: 100, paddingBottom: 48 }}>

            {/* Logo mark */}
            <View style={{ marginBottom: 52 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 16,
                  backgroundColor: COLORS.ink,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 24,
                }}
              >
                <Text style={{ fontSize: 26, fontWeight: "800", color: "#fff", letterSpacing: -1 }}>N</Text>
              </View>
              <Text style={{ fontSize: 30, fontWeight: "800", color: COLORS.ink, letterSpacing: -0.8, marginBottom: 6 }}>
                {t("auth.loginTitle")}
              </Text>
              <Text style={{ fontSize: 15, color: COLORS.subtle, lineHeight: 22 }}>
                {t("auth.loginSubtitle")}
              </Text>
            </View>

            {/* Email */}
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: COLORS.subtle, marginBottom: 7, letterSpacing: 0.6, textTransform: "uppercase" }}>
                {t("auth.email")}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: COLORS.card,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: focused === "email" ? COLORS.ink : COLORS.border,
                  paddingHorizontal: 14,
                }}
              >
                <Ionicons name="mail-outline" size={17} color={focused === "email" ? COLORS.ink : COLORS.muted} style={{ marginRight: 10 }} />
                <TextInput
                  style={{ flex: 1, fontSize: 16, color: COLORS.ink, paddingVertical: 15 }}
                  placeholder={t("auth.emailPlaceholder")}
                  placeholderTextColor={COLORS.muted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setFocused("email")}
                  onBlur={() => setFocused(null)}
                />
              </View>
            </View>

            {/* Password */}
            <View style={{ marginBottom: 32 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: COLORS.subtle, marginBottom: 7, letterSpacing: 0.6, textTransform: "uppercase" }}>
                {t("auth.password")}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: COLORS.card,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: focused === "pw" ? COLORS.ink : COLORS.border,
                  paddingHorizontal: 14,
                }}
              >
                <Ionicons name="lock-closed-outline" size={17} color={focused === "pw" ? COLORS.ink : COLORS.muted} style={{ marginRight: 10 }} />
                <TextInput
                  style={{ flex: 1, fontSize: 16, color: COLORS.ink, paddingVertical: 15 }}
                  placeholder={t("auth.passwordPlaceholder")}
                  placeholderTextColor={COLORS.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  onFocus={() => setFocused("pw")}
                  onBlur={() => setFocused(null)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={17} color={COLORS.muted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
              style={{
                backgroundColor: COLORS.ink,
                borderRadius: 12,
                paddingVertical: 17,
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              {isLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff", letterSpacing: 0.2 }}>{t("auth.login")}</Text>
              }
            </TouchableOpacity>

            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center" }}>
              <Text style={{ fontSize: 14, color: COLORS.muted }}>{t("auth.noAccount")} </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: COLORS.ink }}>{t("auth.register")}</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
