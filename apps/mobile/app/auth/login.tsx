import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AuthApi } from "@/services/auth";
import { UsersApi } from "@/services/users";

const COLORS = {
  bg: "#0b1220",
  card: "#0f172a",
  text: "#e5e7eb",
  subtext: "#94a3b8",
  input: "#111827",
  border: "#334155",
  primary: "#4f46e5",
  danger: "#ef4444",
};

function routeForRole(role?: string) {
  const r = (role || "").toUpperCase();
  if (r === "ADMIN") return "/dash/admin";
  if (r === "TECNICO") return "/dash/tech";
  if (r === "DOCENTE") return "/dash/teacher";
  if (r === "ESTUDIANTE") return "/dash/student";
  return null;
}

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const doLogin = async () => {
    setErr(null);
    if (!email || !pass) {
      setErr("Completa correo y contraseña.");
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await AuthApi.login({ email: email.trim(), password: pass });
      AuthApi.setToken(token);

      let role = user?.role;
      if (!role) {
        try {
          const me = await UsersApi.me();
          role = me?.role;
        } catch {
          // si falla, seguimos con null y mostramos error abajo
        }
      }
      const to = routeForRole(role);
      if (!to) {
        setErr("No se pudo determinar el rol. Contacta al administrador.");
        return;
      }
      router.replace(to as any);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.container}>
        <Text style={s.title}>Iniciar sesión</Text>
        <Text style={s.subtitle}>Accede con tu correo institucional TEC</Text>

        <View style={s.form}>
          <TextInput
            style={s.input}
            placeholder="correo@estudiantec.cr"
            placeholderTextColor={COLORS.subtext}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={s.input}
            placeholder="contraseña"
            placeholderTextColor={COLORS.subtext}
            secureTextEntry
            value={pass}
            onChangeText={setPass}
          />

          {err ? <Text style={s.error}>{err}</Text> : null}

          <Pressable disabled={loading} onPress={doLogin} style={({ pressed }) => [s.btn, pressed && s.btnPressed, loading && s.btnDisabled]}>
            {loading ? <ActivityIndicator /> : <Text style={s.btnText}>Entrar</Text>}
          </Pressable>

          <Pressable onPress={() => router.push("/auth/register" as any)} style={s.linkWrap}>
            <Text style={s.link}>¿No tienes cuenta? Crear una</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  container: { flex: 1, padding: 20, gap: 16, justifyContent: "center" },
  title: { color: COLORS.text, fontSize: 24, fontWeight: "800", textAlign: "center" },
  subtitle: { color: COLORS.subtext, fontSize: 14, textAlign: "center" },
  form: { marginTop: 8, gap: 12 },
  input: {
    backgroundColor: COLORS.input,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  btnText: { color: "white", fontWeight: "700", fontSize: 16 },
  btnPressed: { transform: [{ scale: 0.98 }], opacity: 0.95 },
  btnDisabled: { opacity: 0.6 },
  error: { color: COLORS.danger, fontSize: 13, textAlign: "center" },
  linkWrap: { alignItems: "center", marginTop: 8 },
  link: { color: COLORS.text, textDecorationLine: "underline" },
});
