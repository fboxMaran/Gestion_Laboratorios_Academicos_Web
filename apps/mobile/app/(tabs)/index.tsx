import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const navigation = useNavigation();

  // Oculta header y TAB BAR solo en esta pantalla
  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
      // En TabNavigator: oculta barra inferior
      // @ts-ignore (según tipos del nav actual)
      tabBarStyle: { display: "none" },
      // Compat (algunas versiones)
      // @ts-ignore
      tabBarVisible: false,
    });
  }, [navigation]);

  const go = (p: string) => router.push(p as any);

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.container}>
        <View style={s.brand}>
          <Text style={s.brandIcon}>🔬</Text>
          <Text style={s.title}>LabTEC</Text>
          <Text style={s.subtitle}>Gestión de laboratorios, recursos y reservas</Text>
        </View>

        <View style={s.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => go("/auth/login")}
            style={({ pressed }) => [s.btn, s.btnPrimary, pressed && s.btnPressed]}
            android_ripple={{ borderless: false }}
            hitSlop={8}
          >
            <Text style={s.btnPrimaryText}>Iniciar sesión</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => go("/auth/register")}
            style={({ pressed }) => [s.btn, s.btnOutline, pressed && s.btnPressed]}
            android_ripple={{ borderless: false }}
            hitSlop={8}
          >
            <Text style={s.btnOutlineText}>Crear cuenta</Text>
          </Pressable>
        </View>

        <Text style={s.footer}>© {new Date().getFullYear()} TEC · Plataforma de Gestión</Text>
      </View>
    </SafeAreaView>
  );
}

const COLORS = {
  bg: "#0b1220",
  card: "#0f172a",
  primary: "#4f46e5",
  text: "#e5e7eb",
  subtext: "#94a3b8",
  outline: "#334155",
};

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 24 },
  brand: { alignItems: "center", gap: 8 },
  brandIcon: { fontSize: 48 },
  title: { color: COLORS.text, fontSize: 28, fontWeight: "800", letterSpacing: 0.3 },
  subtitle: { color: COLORS.subtext, fontSize: 14, textAlign: "center", maxWidth: 320 },
  actions: { width: "100%", maxWidth: 420, gap: 12 },
  btn: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 18, alignItems: "center", justifyContent: "center" },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 3 },
    }),
  },
  btnPrimaryText: { color: "white", fontWeight: "700", fontSize: 16 },
  btnOutline: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.outline },
  btnOutlineText: { color: COLORS.text, fontWeight: "700", fontSize: 16 },
  btnPressed: { transform: [{ scale: 0.98 }], opacity: 0.9 },
  footer: { color: COLORS.subtext, fontSize: 12, marginTop: 12 },
});
