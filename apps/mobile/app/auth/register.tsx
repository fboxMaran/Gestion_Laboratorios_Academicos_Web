import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AuthApi } from "@/services/auth";

const COLORS = {
  bg: "#0b1220",
  card: "#0f172a",
  text: "#e5e7eb",
  subtext: "#94a3b8",
  input: "#111827",
  border: "#334155",
  primary: "#4f46e5",
  neutral: "#334155",
  danger: "#ef4444",
};

type Role = "ESTUDIANTE" | "DOCENTE";

export default function RegisterScreen() {
  const router = useRouter();

  const [role, setRole] = useState<Role>("ESTUDIANTE");
  const [full, setFull] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [program, setProgram] = useState("");
  const [studentId, setStudentId] = useState("");
  const [teacherCode, setTeacherCode] = useState("");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const doReg = async () => {
    setErr(null);
    if (!full || !email || !pass) {
      setErr("Completa nombre, correo y contraseña.");
      return;
    }
    setLoading(true);
    try {
      await AuthApi.register({
        role,
        email: email.trim(),
        password: pass,
        full_name: full,
        student_id: role === "ESTUDIANTE" ? (studentId || undefined) : undefined,
        teacher_code: role === "DOCENTE" ? (teacherCode || undefined) : undefined,
        program_department: program || undefined,
        phone: phone || undefined,
      });
      // No guardamos token aquí: flujo que pediste → volver a login
      router.replace("/auth/login" as any);
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || "No se pudo registrar.");
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (r: Role) => {
    setRole(r);
    // Limpia campos contrarios para no enviar ruido
    if (r === "ESTUDIANTE") setTeacherCode("");
    if (r === "DOCENTE") setStudentId("");
  };

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.container}>
        <Text style={s.title}>Crear cuenta</Text>
        <Text style={s.subtitle}>Regístrate con tu correo institucional</Text>

        {/* Selector simple de rol */}
        <View style={s.roleRow}>
          <Pressable onPress={() => toggleRole("ESTUDIANTE")} style={[s.roleBtn, role === "ESTUDIANTE" ? s.roleBtnActive : null]}>
            <Text style={[s.roleText, role === "ESTUDIANTE" ? s.roleTextActive : null]}>Estudiante</Text>
          </Pressable>
          <Pressable onPress={() => toggleRole("DOCENTE")} style={[s.roleBtn, role === "DOCENTE" ? s.roleBtnActive : null]}>
            <Text style={[s.roleText, role === "DOCENTE" ? s.roleTextActive : null]}>Docente</Text>
          </Pressable>
        </View>

        <View style={s.form}>
          <TextInput
            style={s.input}
            placeholder="Nombre completo"
            placeholderTextColor={COLORS.subtext}
            value={full}
            onChangeText={setFull}
          />
          <TextInput
            style={s.input}
            placeholder="correo institucional"
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
          <TextInput
            style={s.input}
            placeholder={role === "ESTUDIANTE" ? "carrera" : "departamento"}
            placeholderTextColor={COLORS.subtext}
            value={program}
            onChangeText={setProgram}
          />

          {role === "ESTUDIANTE" ? (
            <TextInput
              style={s.input}
              placeholder="carné"
              placeholderTextColor={COLORS.subtext}
              value={studentId}
              onChangeText={setStudentId}
            />
          ) : (
            <TextInput
              style={s.input}
              placeholder="código docente"
              placeholderTextColor={COLORS.subtext}
              value={teacherCode}
              onChangeText={setTeacherCode}
            />
          )}

          <TextInput
            style={s.input}
            placeholder="teléfono"
            placeholderTextColor={COLORS.subtext}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          {err ? <Text style={s.error}>{err}</Text> : null}

          <Pressable disabled={loading} onPress={doReg} style={({ pressed }) => [s.btn, pressed && s.btnPressed, loading && s.btnDisabled]}>
            {loading ? <ActivityIndicator /> : <Text style={s.btnText}>Registrar</Text>}
          </Pressable>

          <Pressable onPress={() => router.push("/auth/login" as any)} style={s.linkWrap}>
            <Text style={s.link}>¿Ya tienes cuenta? Inicia sesión</Text>
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
  roleRow: { flexDirection: "row", gap: 8, justifyContent: "center", marginTop: 8 },
  roleBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: COLORS.neutral, backgroundColor: "#0f172a" },
  roleBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  roleText: { color: COLORS.text, fontWeight: "700", fontSize: 12 },
  roleTextActive: { color: "white" },
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
  btn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  btnText: { color: "white", fontWeight: "700", fontSize: 16 },
  btnPressed: { transform: [{ scale: 0.98 }], opacity: 0.95 },
  btnDisabled: { opacity: 0.6 },
  error: { color: COLORS.danger, fontSize: 13, textAlign: "center" },
  linkWrap: { alignItems: "center", marginTop: 8 },
  link: { color: COLORS.text, textDecorationLine: "underline" },
});
