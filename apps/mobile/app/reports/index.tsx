import React, { useState } from 'react';
import {
  View, Text, TextInput, FlatList, Pressable,
  StyleSheet, Alert, Linking, ActivityIndicator
} from 'react-native';
import { ReportsApi } from '@/services/reports';
import { Link } from 'expo-router';

type Tab = 'usage' | 'inventory' | 'maintenance';

export default function ReportsScreen() {
  const [tab, setTab] = useState<Tab>('usage');
  const [labId, setLabId] = useState('1');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [limit, setLimit] = useState('20'); // solo para "usage"
  const [loading, setLoading] = useState(false);

  const [usage, setUsage] = useState<any | null>(null);
  const [inv, setInv] = useState<any | null>(null);
  const [maint, setMaint] = useState<any | null>(null);

  const pickError = (e:any) =>
    e?.response?.data?.error || e?.response?.data?.message || e?.message || 'No se pudo cargar el reporte';

  const load = async () => {
    if (!labId) return Alert.alert('Completar', 'Debes indicar el lab_id.');
    try {
      setLoading(true);
      if (tab === 'usage') {
        const data = await ReportsApi.usage({
          lab_id: Number(labId),
          from: from || undefined,
          to: to || undefined,
          limit: Number(limit || 20),
        });
        setUsage(data);
      } else if (tab === 'inventory') {
        const data = await ReportsApi.inventory({
          lab_id: Number(labId),
          from: from || undefined,
          to: to || undefined,
        });
        setInv(data);
      } else {
        const data = await ReportsApi.maintenance({
          lab_id: Number(labId),
          from: from || undefined,
          to: to || undefined,
        });
        setMaint(data);
      }
    } catch (e:any) {
      Alert.alert('Atención', pickError(e));
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!labId) return Alert.alert('Completar', 'Debes indicar el lab_id.');
    const url = ReportsApi.buildCsvUrl(tab, {
      lab_id: Number(labId),
      from: from || undefined,
      to: to || undefined,
      limit: Number(limit || 20),
    });
    Linking.openURL(url);
  };

  // ---- construir lista plana para el FlatList
  let items: Array<{ key: string; kind: 'title' | 'row'; text: string }> = [];

  if (tab === 'usage' && usage) {
    items.push({ key: 'u_t1', kind: 'title', text: 'Recursos más usados' });
    (usage.resources_top || []).forEach((r: any, i: number) => {
      items.push({
        key: `u_r_${i}`,
        kind: 'row',
        text: `• ${r.resource_name} (#${r.resource_id}) — asignaciones: ${r.assignments_count}, cantidad: ${r.qty_assigned}`,
      });
    });
    items.push({ key: 'u_t2', kind: 'title', text: 'Usuarios más frecuentes' });
    (usage.users_top || []).forEach((u: any, i: number) => {
      const label = u.name || u.email || `user_id:${u.user_id ?? '—'}`;
      items.push({
        key: `u_u_${i}`,
        kind: 'row',
        text: `• ${label} — asignaciones: ${u.assignments_count}, cantidad: ${u.qty_assigned}`,
      });
    });
  }

  if (tab === 'inventory' && inv) {
    items.push({ key: 'i_t1', kind: 'title', text: 'Recursos por estado' });
    (inv.resources_status || []).forEach((s: any, i: number) => {
      items.push({ key: `i_s_${i}`, kind: 'row', text: `• ${s.status}: ${s.count}` });
    });

    items.push({ key: 'i_t2', kind: 'title', text: 'Consumibles críticos (≤ punto de reorden)' });
    (inv.consumables_critical || []).forEach((c: any, i: number) => {
      items.push({
        key: `i_c_${i}`,
        kind: 'row',
        text: `• ${c.name}: ${c.qty_available}${c.unit} (reorden ${c.reorder_point})`,
      });
    });

    items.push({ key: 'i_t3', kind: 'title', text: 'Consumos en el período' });
    (inv.consumptions_period || []).forEach((c: any, i: number) => {
      items.push({
        key: `i_p_${i}`,
        kind: 'row',
        text: `• ${c.consumable_name}: ${c.qty_consumed}`,
      });
    });
  }

  if (tab === 'maintenance' && maint) {
    items.push({ key: 'm_t1', kind: 'title', text: 'Resumen' });
    if (maint.summary) {
      items.push({ key: 'm_s1', kind: 'row', text: `• Eventos: ${maint.summary.events_count}` });
      items.push({ key: 'm_s2', kind: 'row', text: `• Downtime prom.: ${(Number(maint.summary.avg_seconds) / 3600).toFixed(2)} h` });
      items.push({ key: 'm_s3', kind: 'row', text: `• Downtime total: ${(Number(maint.summary.total_seconds) / 3600).toFixed(2)} h` });
    }
    items.push({ key: 'm_t2', kind: 'title', text: 'Por recurso' });
    (maint.maintenance_by_resource || []).forEach((r: any, i: number) => {
      items.push({
        key: `m_r_${i}`,
        kind: 'row',
        text: `• resource_id: ${r.resource_id ?? 'LAB'} — eventos: ${r.events_count}, prom.: ${(Number(r.avg_seconds) / 3600).toFixed(2)} h, total: ${(Number(r.total_seconds) / 3600).toFixed(2)} h`,
      });
    });
  }

  return (
    <FlatList
      style={styles.screen}
      data={items}
      keyExtractor={(it) => it.key}
      ListHeaderComponent={
        <View style={{ padding: 12 }}>
          <Text style={styles.h1}>Reportes Operativos</Text>

          {/* atajo a tu reporte legacy ya existente */}
          <Link href="/reports/usage" asChild>
            <Pressable style={[styles.btn, { backgroundColor: '#334155' }]}>
              <Text style={styles.btnTxt}>Ir a “Reporte de uso (legacy)”</Text>
            </Pressable>
          </Link>

          {/* acceso a reportes institucionales (ADMIN) */}
          <Link href="/admin/reports" asChild>
            <Pressable style={[styles.btn, { backgroundColor: '#0ea5e9' }]}>
              <Text style={styles.btnTxt}>Ir a “Reportes Institucionales (ADMIN)”</Text>
            </Pressable>
          </Link>

          {/* tabs */}
          <View style={styles.tabs}>
            <Pressable onPress={() => setTab('usage')} style={[styles.tab, tab === 'usage' && styles.tabActive]}>
              <Text style={[styles.tabTxt, tab === 'usage' && styles.tabTxtActive]}>Uso</Text>
            </Pressable>
            <Pressable onPress={() => setTab('inventory')} style={[styles.tab, tab === 'inventory' && styles.tabActive]}>
              <Text style={[styles.tabTxt, tab === 'inventory' && styles.tabTxtActive]}>Inventario</Text>
            </Pressable>
            <Pressable onPress={() => setTab('maintenance')} style={[styles.tab, tab === 'maintenance' && styles.tabActive]}>
              <Text style={[styles.tabTxt, tab === 'maintenance' && styles.tabTxtActive]}>Mantenimiento</Text>
            </Pressable>
          </View>

          {/* filtros */}
          <View style={styles.row}>
            <TextInput
              style={styles.input}
              placeholder="ID de laboratorio (lab_id)"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={labId}
              onChangeText={setLabId}
            />
            <TextInput
              style={styles.input}
              placeholder="Desde (YYYY-MM-DD)"
              placeholderTextColor="#94a3b8"
              value={from}
              onChangeText={setFrom}
            />
            <TextInput
              style={styles.input}
              placeholder="Hasta (YYYY-MM-DD)"
              placeholderTextColor="#94a3b8"
              value={to}
              onChangeText={setTo}
            />
          </View>
          {tab === 'usage' && (
            <View style={[styles.row, { marginTop: 8 }]}>
              <TextInput
                style={styles.input}
                placeholder="Límite (top N)"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={limit}
                onChangeText={setLimit}
              />
            </View>
          )}

          <View style={[styles.row, { marginTop: 8 }]}>
            <Pressable onPress={load} style={[styles.btn, { backgroundColor: '#4f46e5', flex:1 }]}>
              {loading ? <ActivityIndicator /> : <Text style={styles.btnTxt}>Buscar</Text>}
            </Pressable>
            <View style={{ width: 8 }} />
            <Pressable onPress={exportCSV} style={[styles.btn, { backgroundColor: '#0891b2', flex:1 }]}>
              <Text style={styles.btnTxt}>Exportar CSV</Text>
            </Pressable>
          </View>
        </View>
      }
      renderItem={({ item }) =>
        item.kind === 'title' ? (
          <Text style={styles.section}>{item.text}</Text>
        ) : (
          <View style={styles.rowItem}>
            <Text style={styles.itemTxt}>{item.text}</Text>
          </View>
        )
      }
      ListEmptyComponent={!loading ? <Text style={styles.empty}>Sin datos para mostrar.</Text> : null}
      contentContainerStyle={{ padding: 12, paddingBottom: 16 }}
    />
  );
}

const COLORS = { bg:'#0b1220', card:'#111827', border:'#1f2937', text:'#e5e7eb', sub:'#94a3b8' };

const styles = StyleSheet.create({
  screen:{ flex:1, backgroundColor:COLORS.bg },
  h1: { color:COLORS.text, fontSize: 20, fontWeight: '800', marginBottom: 8 },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 8 },
  tab: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#1f2937', borderWidth:1, borderColor:'#334155' },
  tabActive: { backgroundColor: '#2563eb', borderColor:'#2563eb' },
  tabTxt: { color: '#e5e7eb', fontWeight: '700' },
  tabTxtActive: { color: '#fff' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { backgroundColor:COLORS.card, color:COLORS.text, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 10, flex: 1 },
  section: { color:COLORS.text, fontWeight: '800', marginTop: 14, marginBottom: 6 },
  rowItem: { backgroundColor:COLORS.card, padding: 10, borderRadius: 10, marginBottom: 8, borderWidth:1, borderColor:COLORS.border },
  itemTxt: { color: '#e5e7eb' },
  btn: { padding: 12, borderRadius: 10, alignItems: 'center' },
  btnTxt: { color: '#fff', fontWeight: '800' },
  empty:{ color:COLORS.sub, textAlign:'center', marginTop:16 },
});
