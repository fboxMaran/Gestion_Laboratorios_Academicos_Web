// app/admin/reports/index.tsx
import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, Button, FlatList, Pressable,
  StyleSheet, Alert, ActivityIndicator, Platform, Linking,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import { AdminApi, type UsageRow, type InventoryRow, type ConsumptionRow, type PerformanceRow } from '@/services/admin';

type Tab = 'usage' | 'inventory' | 'consumption' | 'performance';

export default function AdminInstitutionalReports() {
  const [tab, setTab] = useState<Tab>('usage');

  // filtros comunes
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [labId, setLabId] = useState('');           // opcional
  const [deptId, setDeptId] = useState('');         // opcional

  // solo para uso global
  const [groupBy, setGroupBy] = useState<'day'|'week'|'month'>('month');

  const [loading, setLoading] = useState(false);

  const [usage, setUsage] = useState<UsageRow[] | null>(null);
  const [inv, setInv] = useState<InventoryRow[] | null>(null);
  const [cons, setCons] = useState<ConsumptionRow[] | null>(null);
  const [perf, setPerf] = useState<PerformanceRow[] | null>(null);

  const run = async () => {
    try {
      setLoading(true);
      const common = {
        from: from || undefined,
        to: to || undefined,
        lab_id: labId ? Number(labId) : undefined,
        department_id: deptId ? Number(deptId) : undefined,
      };

      if (tab === 'usage') {
        const data = await AdminApi.reports.usageGlobal({ ...common, group_by: groupBy });
        setUsage(data); setInv(null); setCons(null); setPerf(null);
      } else if (tab === 'inventory') {
        const data = await AdminApi.reports.inventoryInstitutional(common);
        setInv(data); setUsage(null); setCons(null); setPerf(null);
      } else if (tab === 'consumption') {
        const data = await AdminApi.reports.consumption(common);
        setCons(data); setUsage(null); setInv(null); setPerf(null);
      } else {
        const data = await AdminApi.reports.performance(common);
        setPerf(data); setUsage(null); setInv(null); setCons(null);
      }
    } catch (e:any) {
      Alert.alert('Error', e?.message ?? 'No se pudo cargar');
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = async () => {
    try {
      setLoading(true);
      const common = {
        from: from || undefined,
        to: to || undefined,
        lab_id: labId ? Number(labId) : undefined,
        department_id: deptId ? Number(deptId) : undefined,
      };
      let csv = '';
      if (tab === 'usage') {
        csv = await AdminApi.reports.usageGlobalCsv({ ...common, group_by: groupBy });
      } else if (tab === 'inventory') {
        csv = await AdminApi.reports.inventoryInstitutionalCsv(common);
      } else if (tab === 'consumption') {
        csv = await AdminApi.reports.consumptionCsv(common);
      } else {
        csv = await AdminApi.reports.performanceCsv(common);
      }

      const baseDir =
        (FileSystem as any).documentDirectory ??
        (FileSystem as any).cacheDirectory ??
        '';
      const filename = `${baseDir}report_${tab}_${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(filename, csv, { encoding: 'utf8' });

      if (Platform.OS === 'android') {
        // Intento de abrir con apps externas si soporta "file://" (depende del dispositivo)
        try { await Linking.openURL(filename); } catch {}
      }
      Alert.alert('CSV generado', `Guardado en:\n${filename}`);
    } catch (e:any) {
      Alert.alert('Error', e?.message ?? 'No se pudo exportar CSV');
    } finally {
      setLoading(false);
    }
  };

  const items = useMemo(() => {
    const rows: Array<{ key: string; text: string }> = [];
    if (tab === 'usage' && usage) {
      for (let i=0;i<usage.length;i++){
        const r = usage[i];
        rows.push({
          key: `u_${i}`,
          text: `• ${r.period_group ?? r.period_start}: reservas=${r.reservas}, préstamos=${r.prestamos}, mantenimientos=${r.mantenimientos}`,
        });
      }
    }
    if (tab === 'inventory' && inv) {
      for (let i=0;i<inv.length;i++){
        const r = inv[i];
        rows.push({
          key: `i_${i}`,
          text: `• [${r.department_name} / ${r.lab_name}] ${r.status}: ${r.total}`,
        });
      }
    }
    if (tab === 'consumption' && cons) {
      for (let i=0;i<cons.length;i++){
        const r = cons[i];
        rows.push({
          key: `c_${i}`,
          text: `• [${r.department_name} / ${r.lab_name}] ${r.consumable_name}: ${r.total_qty} ${r.unit}`,
        });
      }
    }
    if (tab === 'performance' && perf) {
      for (let i=0;i<perf.length;i++){
        const r = perf[i];
        const hrs = (n:number|null|undefined) => n==null ? '—' : (n/3600).toFixed(2)+'h';
        rows.push({
          key: `p_${i}`,
          text: `• [${r.department_name} / ${r.lab_name}] apr.avg=${hrs(r.avg_seconds_to_approve)}, rej.avg=${hrs(r.avg_seconds_to_reject)}, proc=${r.total_processed}, avail=${r.availability_ratio==null?'—':(r.availability_ratio*100).toFixed(1)+'%'}`,
        });
      }
    }
    return rows;
  }, [tab, usage, inv, cons, perf]);

  return (
    <FlatList
      data={items}
      keyExtractor={it => it.key}
      ListHeaderComponent={
        <View style={{ padding: 12 }}>
          <Text style={s.h1}>Reportes Institucionales (Admin)</Text>

          {/* Tabs */}
          <View style={s.tabs}>
            <Pressable onPress={() => setTab('usage')} style={[s.tab, tab === 'usage' && s.tabActive]}>
              <Text style={[s.tabTxt, tab === 'usage' && s.tabTxtActive]}>Uso global</Text>
            </Pressable>
            <Pressable onPress={() => setTab('inventory')} style={[s.tab, tab === 'inventory' && s.tabActive]}>
              <Text style={[s.tabTxt, tab === 'inventory' && s.tabTxtActive]}>Inventario</Text>
            </Pressable>
            <Pressable onPress={() => setTab('consumption')} style={[s.tab, tab === 'consumption' && s.tabActive]}>
              <Text style={[s.tabTxt, tab === 'consumption' && s.tabTxtActive]}>Consumo</Text>
            </Pressable>
            <Pressable onPress={() => setTab('performance')} style={[s.tab, tab === 'performance' && s.tabActive]}>
              <Text style={[s.tabTxt, tab === 'performance' && s.tabTxtActive]}>Desempeño</Text>
            </Pressable>
          </View>

          {/* Filtros */}
          <View style={[s.row, { marginTop: 10 }]}>
            <TextInput style={s.input} placeholder="from (YYYY-MM-DD)" value={from} onChangeText={setFrom} />
            <TextInput style={s.input} placeholder="to (YYYY-MM-DD)" value={to} onChangeText={setTo} />
          </View>
          <View style={[s.row, { marginTop: 8 }]}>
            <TextInput style={s.input} placeholder="lab_id (opcional)" keyboardType="numeric" value={labId} onChangeText={setLabId} />
            <TextInput style={s.input} placeholder="department_id (opcional)" keyboardType="numeric" value={deptId} onChangeText={setDeptId} />
          </View>
          {tab === 'usage' && (
            <View style={[s.row, { marginTop: 8 }]}>
              <TextInput
                style={s.input}
                placeholder="group_by: day|week|month"
                value={groupBy}
                onChangeText={(t)=>setGroupBy((t as any) || 'month')}
              />
            </View>
          )}

          <View style={[s.row, { marginTop: 10 }]}>
            <Button title="Buscar" onPress={run} />
            <View style={{ width: 8 }} />
            <Button title="Exportar CSV" onPress={exportCsv} />
          </View>

          {loading && <ActivityIndicator style={{ marginTop: 10 }} />}
        </View>
      }
      renderItem={({ item }) => (
        <View style={s.item}>
          <Text style={s.itemTxt}>{item.text}</Text>
        </View>
      )}
      contentContainerStyle={{ padding: 12 }}
    />
  );
}

const s = StyleSheet.create({
  h1: { fontSize: 20, fontWeight: '800', marginBottom: 8 },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' },
  tab: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#e5e7eb' },
  tabActive: { backgroundColor: '#2563eb' },
  tabTxt: { color: '#111827', fontWeight: '700' },
  tabTxtActive: { color: '#fff' },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, padding: 8, flex: 1 },
  item: { backgroundColor: '#fff', padding: 10, borderRadius: 8, marginBottom: 8, elevation: 1 },
  itemTxt: { color: '#111827' },
});
