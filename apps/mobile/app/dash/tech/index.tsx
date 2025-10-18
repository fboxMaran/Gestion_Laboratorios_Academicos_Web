import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export default function TechDashboard() {
  const router = useRouter();
  const go = (p: string) => router.push(p as any);
  const logout = () => router.replace("/auth/login" as any);

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={s.container}>
        <Text style={s.title}>Dashboard TECH</Text>
        <Text style={s.subtitle}>Operación diaria, inventario y mantenimiento</Text>

        {/* ---- Operación diaria (Mód. 2.1) ---- */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Operación</Text>
          <View style={s.grid}>
            <Tile label="Aprobadas"        emoji="✅" onPress={() => go("/tech/approved")} />
            <Tile label="Asignaciones"     emoji="📦" onPress={() => go("/tech/assignments")} />
          </View>
        </View>

        {/* ---- Inventario (Mód. 2.2) ---- */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Inventario</Text>
          <View style={s.grid}>
            <Tile label="Consumibles"      emoji="🧪" onPress={() => go("/inventory/consumables")} />
            <Tile label="Movimientos"      emoji="🔁" onPress={() => go("/inventory/movements")} />
            <Tile label="Estado fijo"      emoji="🖥️" onPress={() => go("/inventory/fixed-status")} />
          </View>
        </View>

        {/* ---- Mantenimiento (Mód. 2.3) ---- */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Mantenimiento</Text>
          <View style={s.grid}>
            <Tile label="Órdenes"          emoji="🛠️" onPress={() => go("/maintenance/orders")} />
            <Tile label="Nueva orden"      emoji="➕"  onPress={() => go("/maintenance/orders/new")} />
          </View>
        </View>

        {/* ---- Reportes (Mód. 2.4) ---- */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Reportes</Text>
          <View style={s.grid}>
            <Tile label="Operativos"       emoji="📊" onPress={() => go("/reports")} />
          </View>
        </View>

        {/* ---- Monitoreo (Mód. 1.2 lectura) ---- */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Monitoreo</Text>
          <View style={s.grid}>
            <Tile label="Laboratorios"     emoji="🏫" onPress={() => go("/browse/labs")} />
            <Tile label="Calendario"       emoji="🗓️" onPress={() => go("/browse/calendar")} />
          </View>
        </View>

        {/* ---- Cuenta ---- */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Mi cuenta</Text>
          <View style={s.grid}>
            <Tile label="Mi perfil"        emoji="👤" onPress={() => go("/users/me")} />
          </View>
        </View>

        {/* ---- Logout ---- */}
        <Pressable style={[s.btn, s.btnPrimary]} onPress={logout}>
          <Text style={s.btnText}>Cerrar sesión</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Tile({ label, emoji, onPress }: { label: string; emoji?: string; onPress: ()=>void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s.tile, pressed && s.tilePressed]}>
      <Text style={s.tileEmoji}>{emoji ?? "•"}</Text>
      <Text style={s.tileText}>{label}</Text>
    </Pressable>
  );
}

const COLORS = {
  bg: "#0b1220",
  card: "#0f172a",
  text: "#e5e7eb",
  subtext: "#94a3b8",
  primary: "#4f46e5",
  border: "#1f2937",
};

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  container: { padding: 20, gap: 16 },
  title: { color: COLORS.text, fontSize: 22, fontWeight: "800", textAlign: "center" },
  subtitle: { color: COLORS.subtext, textAlign: "center" },

  section: { marginTop: 10, gap: 10 },
  sectionTitle: { color: COLORS.text, fontWeight: "800" },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    width: "48%",
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 6,
  },
  tilePressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  tileEmoji: { fontSize: 22 },
  tileText: { color: COLORS.text, fontWeight: "700", textAlign: "center" },

  btn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 12 },
  btnPrimary: { backgroundColor: COLORS.primary },
  btnText: { color: "#fff", fontWeight: "800" },
});
