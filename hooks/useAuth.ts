import { useEffect } from "react";
import { router } from "expo-router";
import { useAuthStore } from "@/store/authStore";

export function useRequireAuth() {
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/(auth)/login");
    }
  }, [user, isLoading]);

  return { user, isLoading };
}
