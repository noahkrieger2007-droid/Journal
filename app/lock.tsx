import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "@/store/authStore";
import { COLORS } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";

export default function LockScreen() {
  const { t } = useTranslation();
  const { setLocked } = useAuthStore();
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  useEffect(() => {
    checkBiometrics();
    tryBiometric();
  }, []);

  const checkBiometrics = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setHasBiometrics(compatible && enrolled);
  };

  const tryBiometric = async () => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!compatible || !enrolled) return;

    setIsAuthenticating(true);
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: t("lock.biometricPrompt"),
      cancelLabel: t("common.cancel"),
      fallbackLabel: t("lock.usePin"),
    });

    setIsAuthenticating(false);
    if (result.success) {
      setLocked(false);
      router.replace("/(tabs)");
    }
  };

  return (
    <LinearGradient colors={["#0A0F1E", "#141829"]} style={{ flex: 1 }}>
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 32,
        }}
      >
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: 24,
            backgroundColor: COLORS.violet,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 32,
            shadowColor: COLORS.violet,
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.4,
            shadowRadius: 20,
            elevation: 12,
          }}
        >
          <Ionicons name="lock-closed" size={36} color="#fff" />
        </View>

        <Text
          style={{
            fontSize: 26,
            fontWeight: "800",
            color: COLORS.text,
            marginBottom: 8,
          }}
        >
          {t("lock.title")}
        </Text>
        <Text
          style={{ fontSize: 15, color: COLORS.subtle, marginBottom: 48 }}
        >
          {t("lock.subtitle")}
        </Text>

        {isAuthenticating ? (
          <ActivityIndicator color={COLORS.violet} size="large" />
        ) : (
          hasBiometrics && (
            <TouchableOpacity
              onPress={tryBiometric}
              style={{
                backgroundColor: COLORS.violet,
                borderRadius: 16,
                paddingVertical: 18,
                paddingHorizontal: 40,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                shadowColor: COLORS.violet,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.35,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <Ionicons name="finger-print-outline" size={22} color="#fff" />
              <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700" }}>
                {t("lock.useFaceId")}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>
    </LinearGradient>
  );
}
