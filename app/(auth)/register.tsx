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

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || password.length < 8) {
      Alert.alert(t("common.error"), "Bitte alle Felder ausfüllen (Passwort min. 8 Zeichen).");
      return;
    }
    setIsLoading(true);
    try {
      await signUp(email.trim(), password, name.trim());
      Alert.alert(
        "NOVA",
        "Konto erstellt! Bitte bestätige deine E-Mail, dann kannst du dich anmelden.",
        [{ text: "OK", onPress: () => router.replace("/(auth)/login") }]
      );
    } catch (e: any) {
      Alert.alert(t("common.error"), e.message || t("auth.registerError"));
    } finally {
      setIsLoading(false);
    }
  };

  const field = (
    label: string,
    icon: string,
    value: string,
    onChange: (v: string) => void,
    opts?: {
      keyboardType?: any;
      secure?: boolean;
      showToggle?: boolean;
      onToggle?: () => void;
      autoCapitalize?: any;
    }
  ) => (
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
        {label}
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
          name={icon as any}
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
          value={value}
          onChangeText={onChange}
          secureTextEntry={opts?.secure}
          keyboardType={opts?.keyboardType}
          autoCapitalize={opts?.autoCapitalize ?? "none"}
          autoCorrect={false}
          placeholderTextColor={COLORS.muted}
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
    <LinearGradient colors={["#0A0F1E", "#141829", "#0A0F1E"]} style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ paddingHorizontal: 32, paddingVertical: 48 }}>
            <View style={{ alignItems: "center", marginBottom: 40 }}>
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
                <Text style={{ fontSize: 32, fontWeight: "800", color: "#fff" }}>N</Text>
              </View>
              <Text style={{ fontSize: 30, fontWeight: "800", color: COLORS.text, letterSpacing: -0.5 }}>
                {t("auth.registerTitle")}
              </Text>
              <Text style={{ fontSize: 15, color: COLORS.subtle, marginTop: 8 }}>
                {t("auth.registerSubtitle")}
              </Text>
            </View>

            {field(t("auth.name"), "person-outline", name, setName, {
              autoCapitalize: "words",
            })}
            {field(t("auth.email"), "mail-outline", email, setEmail, {
              keyboardType: "email-address",
            })}
            {field(t("auth.password"), "lock-closed-outline", password, setPassword, {
              secure: !showPassword,
              showToggle: true,
              onToggle: () => setShowPassword(!showPassword),
            })}

            <View style={{ height: 16 }} />

            <TouchableOpacity
              onPress={handleRegister}
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
                <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700" }}>
                  {t("auth.register")}
                </Text>
              )}
            </TouchableOpacity>

            <View style={{ flexDirection: "row", justifyContent: "center" }}>
              <Text style={{ color: COLORS.muted, fontSize: 14 }}>{t("auth.alreadyAccount")} </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={{ color: COLORS.violet, fontSize: 14, fontWeight: "600" }}>
                  {t("auth.login")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}
