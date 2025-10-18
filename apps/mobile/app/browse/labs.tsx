import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Alert, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrowseApi } from '@/services/browse';

export default function BrowseLabsScreen() {
  const [q, setQ] = useState('');
  const [loc, setLoc] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const pickError = (e: any) => {
    if (e?.response?.status === 404) return 'No se encontraron laboratorios con esos filtros.';
    return e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Error inesperado';
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await BrowseApi.labs({ q: q || undefined, location: loc || undefined });
      setRows(Array.isArray(data) ? data : []);
      if (!Array.isArray(data) || data.length === 0) {
        Alert.alert('Sin resultados', 'No se encontraron laboratorios con esos filtros.');
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
            <Text style={s.h1}>Buscar laboratorios</Text>

            <TextInput
              style={s.input}
              placeholder="Texto a buscar (nombre o código)"
              placeholderTextColor="#94a3b8"
              value={q}
              onChangeText={setQ}
            />
            <TextInput
              style={s.input}
              placeholder="Ubicación (opcional)"
              placeholderTextColor="#94a3b8"
              value={loc}
              onChangeText={setLoc}
            />

            <Pressable onPress={load} style={({ pressed }) => [s.btn, pressed && s.btnPressed]}>
              {loading ? <ActivityIndicator /> : <Text style={s.btnText}>Buscar</Text>}
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.h2}>{item.name} · {item.code}</Text>
            <Text style={s.sub}>{item.location}</Text>
            {!!item.description && <Text style={s.p}>{item.description}</Text>}
            {'eligible' in item && (
              <Text style={[s.badge, item.eligible ? s.badgeOk : s.badgeBad]}>
                {item.eligible ? 'Elegible' : 'No elegible'}
              </Text>
            )}
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={s.empty}>Empieza una búsqueda para ver resultados.</Text> : null}
        contentContainerStyle={{ padding: 16 }}
      />
    </SafeAreaView>
  );
}

const COLORS = { bg: '#0b1220', card: '#111827', border: '#1f2937', text: '#e5e7eb', sub: '#94a3b8', primary: '#4f46e5' };

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  h1: { color: COLORS.text, fontSize: 20, fontWeight: '800' },
  h2: { color: COLORS.text, fontWeight: '800' },
  p: { color: COLORS.text, marginTop: 4 },
  sub: { color: COLORS.sub, marginTop: 2 },
  input: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, color: COLORS.text },
  btn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  btnText: { color: '#fff', fontWeight: '800' },
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, padding: 12, borderRadius: 12, marginVertical: 6 },
  empty: { color: COLORS.sub, textAlign: 'center', marginTop: 12 },
  badge: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, fontWeight: '700' },
  badgeOk: { backgroundColor: '#14532d', color: '#86efac' },
  badgeBad: { backgroundColor: '#7f1d1d', color: '#fecaca' },
});
