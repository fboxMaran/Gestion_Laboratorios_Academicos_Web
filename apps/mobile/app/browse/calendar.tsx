import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Alert, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrowseApi } from '@/services/browse';

export default function BrowseCalendarScreen() {
  const [labId, setLabId] = useState('');
  const [resId, setResId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const pickError = (e: any) => {
    if (e?.response?.status === 404) return 'No se encontraron bloques en el rango indicado.';
    return e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Error inesperado';
  };

  const load = async () => {
    if (!labId) return Alert.alert('Completar', 'Debes indicar el ID de laboratorio.');
    setLoading(true);
    try {
      const data = await BrowseApi.calendar({
        lab_id: Number(labId),
        resource_id: resId ? Number(resId) : undefined,
        from: from || undefined,
        to: to || undefined,
      });
      setRows(Array.isArray(data) ? data : []);
      if (!Array.isArray(data) || data.length === 0) {
        Alert.alert('Sin resultados', 'No se encontraron bloques para esos parámetros.');
      }
    } catch (e: any) {
      Alert.alert('Atención', pickError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.screen}>
      <FlatList
        data={rows}
        keyExtractor={(x) => String(x.id)}
        ListHeaderComponent={
          <View style={{ padding: 16, gap: 10 }}>
            <Text style={s.h1}>Calendario</Text>

            <TextInput
              style={s.input}
              placeholder="ID de laboratorio (obligatorio)"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={labId}
              onChangeText={setLabId}
            />
            <TextInput
              style={s.input}
              placeholder="ID de recurso (opcional)"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={resId}
              onChangeText={setResId}
            />
            <TextInput
              style={s.input}
              placeholder="Desde (ISO: YYYY-MM-DDTHH:mm:ssZ) — opcional"
              placeholderTextColor="#94a3b8"
              value={from}
              onChangeText={setFrom}
            />
            <TextInput
              style={s.input}
              placeholder="Hasta (ISO: YYYY-MM-DDTHH:mm:ssZ) — opcional"
              placeholderTextColor="#94a3b8"
              value={to}
              onChangeText={setTo}
            />

            <Pressable onPress={load} style={({ pressed }) => [s.btn, pressed && s.btnPressed]}>
              {loading ? <ActivityIndicator /> : <Text style={s.btnText}>Cargar</Text>}
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.title}>
              #{item.id} · {item.title || 'Sin título'}
            </Text>
            <Text style={s.sub}>
              {new Date(item.starts_at).toLocaleString()} → {new Date(item.ends_at).toLocaleString()}
            </Text>
            <Text style={[s.badge, badgeStyle(item.status)]}>{item.status}</Text>
            {!!item.resource_id && <Text style={s.p}>Recurso: #{item.resource_id}</Text>}
            {!!item.reason && <Text style={s.p}>Motivo: {item.reason}</Text>}
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={s.empty}>Carga el calendario para ver resultados.</Text> : null}
        contentContainerStyle={{ padding: 16 }}
      />
    </SafeAreaView>
  );
}

const badgeStyle = (status: string) => {
  switch (status) {
    case 'DISPONIBLE': return { backgroundColor: '#14532d', color: '#86efac' };
    case 'RESERVADO': return { backgroundColor: '#1e3a8a', color: '#bfdbfe' };
    case 'MANTENIMIENTO': return { backgroundColor: '#7c2d12', color: '#fed7aa' };
    case 'INACTIVO': return { backgroundColor: '#374151', color: '#e5e7eb' };
    default: return { backgroundColor: '#4b5563', color: '#fff' };
  }
};

const COLORS = { bg: '#0b1220', card: '#111827', border: '#1f2937', text: '#e5e7eb', sub: '#94a3b8', primary: '#4f46e5' };

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  h1: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  title: { color: COLORS.text, fontWeight: '800' },
  p: { color: COLORS.text, marginTop: 4 },
  sub: { color: COLORS.sub, marginTop: 2 },
  input: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, color: COLORS.text },
  btn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  btnText: { color: '#fff', fontWeight: '800' },
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, padding: 12, borderRadius: 12, marginVertical: 6 },
  empty: { color: COLORS.sub, textAlign: 'center', marginTop: 12 },
  badge: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, fontWeight: '700' },
});
