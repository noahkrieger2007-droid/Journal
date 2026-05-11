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

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { signUp } = useAuthStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

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
        Alert.alert("NOVA", "Fast fertig! Bitte bestätige deine E-Mail und melde dich dann an.", [
          { text: "OK", onPress: () => router.replace("/(auth)/login") },
        ]);
      }
    } catch (e: any) {
      Alert.alert(t("common.error"), e.message || t("auth.registerError"));
    } finally {
      setIsLoading(false);
    }
  };

  const inputField = (
    label: string,
    icon: string,
    key: string,
    value: string,
    onChange: (v: string) => void,
    opts?: { keyboard?: any; secure?: boolean; toggle?: boolean; onToggle?: () => void; capitalize?: any }
  ) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 12, fontWeight: "700", color: COLORS.subtle, marginBottom: 7, letterSpacing: 0.6, textTransform: "uppercase" }}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: COLORS.card,
          borderRadius: 12,
          borderWidth: 1.5,
          borderColor: focused === key ? COLORS.ink : COLORS.border,
          paddingHorizontal: 14,
        }}
      >
        <Ionicons name={icon as any} size={17} color={focused === key ? COLORS.ink : COLORS.muted} style={{ marginRight: 10 }} />
        <TextInput
          style={{ flex: 1, fontSize: 16, color: COLORS.ink, paddingVertical: 15 }}
          value={value}
          onChangeText={onChange}
          secureTextEntry={opts?.secure}
          keyboardType={opts?.keyboard}
          autoCapitalize={opts?.capitalize ?? "none"}
          autoCorrect={false}
          placeholderTextColor={COLORS.muted}
          onFocus={() => setFocused(key)}
          onBlur={() => setFocused(null)}
        />
        {opts?.toggle && (
          <TouchableOpacity onPress={opts.onToggle} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name={opts.secure ? "eye-outline" : "eye-off-outline"} size={17} color={COLORS.muted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 28, paddingTop: 80, paddingBottom: 48 }}>

            <View style={{ marginBottom: 44 }}>
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
                {t("auth.registerTitle")}
              </Text>
              <Text style={{ fontSize: 15, color: COLORS.subtle, lineHeight: 22 }}>
                {t("auth.registerSubtitle")}
              </Text>
            </View>

            {inputField(t("auth.name"), "person-outline", "name", name, setName, { capitalize: "words" })}
            {inputField(t("auth.email"), "mail-outline", "email", email, setEmail, { keyboard: "email-address" })}
            {inputField(t("auth.password"), "lock-closed-outline", "pw", password, setPassword, {
              secure: !showPassword,
              toggle: true,
              onToggle: () => setShowPassword(!showPassword),
            })}

            <View style={{ height: 18 }} />

            <TouchableOpacity
              onPress={handleRegister}
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
                : <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff", letterSpacing: 0.2 }}>{t("auth.register")}</Text>
              }
            </TouchableOpacity>

            <View style={{ flexDirection: "row", justifyContent: "center" }}>
              <Text style={{ fontSize: 14, color: COLORS.muted }}>{t("auth.alreadyAccount")} </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: COLORS.ink }}>{t("auth.login")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
