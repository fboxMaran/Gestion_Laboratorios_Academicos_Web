import React, { useState } from 'react';
import { View, Text, TextInput, Switch, FlatList, StyleSheet, Alert, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrowseApi } from '@/services/browse';

export default function BrowseResourcesScreen() {
  const [labId, setLabId] = useState('');
  const [typeId, setTypeId] = useState('');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [onlyEligible, setOnlyEligible] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const pickError = (e: any) => {
    if (e?.response?.status === 404) return 'No se encontraron recursos con esos filtros.';
    return e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Error inesperado';
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await BrowseApi.resources({
        lab_id: labId ? Number(labId) : undefined,
        type_id: typeId ? Number(typeId) : undefined,
        q: q || undefined,
        from: from || undefined, to: to || undefined,
        show_all: showAll, only_eligible: onlyEligible,
      });
      setRows(Array.isArray(data) ? data : []);
      if (!Array.isArray(data) || data.length === 0) {
        Alert.alert('Sin resultados', 'No se encontraron recursos con esos filtros.');
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
            <Text style={s.h1}>Buscar recursos</Text>

            <TextInput
              style={s.input}
              placeholder="ID de laboratorio (opcional)"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={labId}
              onChangeText={setLabId}
            />
            <TextInput
              style={s.input}
              placeholder="ID de tipo de recurso (opcional)"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={typeId}
              onChangeText={setTypeId}
            />
            <TextInput
              style={s.input}
              placeholder="Texto de búsqueda (nombre, descripción)"
              placeholderTextColor="#94a3b8"
              value={q}
              onChangeText={setQ}
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

            <View style={s.row}>
              <View style={s.switchRow}>
                <Text style={s.label}>Mostrar todos</Text>
                <Switch value={showAll} onValueChange={setShowAll} />
              </View>
              <View style={s.switchRow}>
                <Text style={s.label}>Solo elegibles</Text>
                <Switch value={onlyEligible} onValueChange={setOnlyEligible} />
              </View>
            </View>

            <Pressable onPress={load} style={({ pressed }) => [s.btn, pressed && s.btnPressed]}>
              {loading ? <ActivityIndicator /> : <Text style={s.btnText}>Buscar</Text>}
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <Text style={s.h2}>{item.name}</Text>
            <Text style={s.sub}>Lab #{item.lab_id} · Estado: {item.status} · Cantidad: {item.qty_available}</Text>

            {'eligible' in item && (
              <Text style={[s.badge, item.eligible ? s.badgeOk : s.badgeBad]}>
                {item.eligible ? 'Elegible' : 'No elegible'}
              </Text>
            )}

            {item.next_available_slot && (
              <Text style={s.p}>
                Siguiente disponibilidad:{' '}
                {new Date(item.next_available_slot.starts_at).toLocaleString()} →{' '}
                {new Date(item.next_available_slot.ends_at).toLocaleString()}
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
  row: { flexDirection: 'row', gap: 12, justifyContent: 'space-between' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { color: COLORS.text },
  btn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  btnText: { color: '#fff', fontWeight: '800' },
  card: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, padding: 12, borderRadius: 12, marginVertical: 6 },
  empty: { color: COLORS.sub, textAlign: 'center', marginTop: 12 },
  badge: { alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, fontWeight: '700' },
  badgeOk: { backgroundColor: '#14532d', color: '#86efac' },
  badgeBad: { backgroundColor: '#7f1d1d', color: '#fecaca' },
});
