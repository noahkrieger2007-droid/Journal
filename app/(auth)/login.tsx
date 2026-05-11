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
    <LinearGradient
      colors={["#0A0F1E", "#141829", "#0A0F1E"]}
      style={{ flex: 1 }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ paddingHorizontal: 32, paddingVertical: 48 }}>
            {/* Logo */}
            <View style={{ alignItems: "center", marginBottom: 48 }}>
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 20,
                  backgroundColor: COLORS.violet,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 20,
                  shadowColor: COLORS.violet,
                  shadowOffset: { width: 0, height: 8 },
                  shadowOpacity: 0.4,
                  shadowRadius: 16,
                  elevation: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: "800",
                    color: "#fff",
                    letterSpacing: -1,
                  }}
                >
                  N
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 30,
                  fontWeight: "800",
                  color: COLORS.text,
                  letterSpacing: -0.5,
                }}
              >
                {t("auth.loginTitle")}
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  color: COLORS.subtle,
                  marginTop: 8,
                  textAlign: "center",
                }}
              >
                {t("auth.loginSubtitle")}
              </Text>
            </View>

            {/* Email */}
            <View style={{ marginBottom: 16 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: COLORS.subtle,
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {t("auth.email")}
              </Text>
              <View
                style={{
                  backgroundColor: COLORS.card,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                }}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={COLORS.muted}
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  style={{
                    flex: 1,
                    color: COLORS.text,
                    fontSize: 16,
                    paddingVertical: 16,
                  }}
                  placeholder={t("auth.emailPlaceholder")}
                  placeholderTextColor={COLORS.muted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password */}
            <View style={{ marginBottom: 32 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: COLORS.subtle,
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {t("auth.password")}
              </Text>
              <View
                style={{
                  backgroundColor: COLORS.card,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 16,
                }}
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={COLORS.muted}
                  style={{ marginRight: 10 }}
                />
                <TextInput
                  style={{
                    flex: 1,
                    color: COLORS.text,
                    fontSize: 16,
                    paddingVertical: 16,
                  }}
                  placeholder={t("auth.passwordPlaceholder")}
                  placeholderTextColor={COLORS.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={COLORS.muted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Login button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={isLoading}
              style={{
                backgroundColor: COLORS.violet,
                borderRadius: 14,
                paddingVertical: 18,
                alignItems: "center",
                shadowColor: COLORS.violet,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.35,
                shadowRadius: 12,
                elevation: 8,
                marginBottom: 24,
              }}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text
                  style={{
                    color: "#fff",
                    fontSize: 17,
                    fontWeight: "700",
                    letterSpacing: 0.3,
                  }}
                >
                  {t("auth.login")}
                </Text>
              )}
            </TouchableOpacity>

            {/* Register link */}
            <View style={{ flexDirection: "row", justifyContent: "center" }}>
              <Text style={{ color: COLORS.muted, fontSize: 14 }}>
                {t("auth.noAccount")}{" "}
              </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
                <Text
                  style={{
                    color: COLORS.violet,
                    fontSize: 14,
                    fontWeight: "600",
                  }}
                >
                  {t("auth.register")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
