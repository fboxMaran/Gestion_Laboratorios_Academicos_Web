// apps/mobile/app/admin/audit.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, Alert, RefreshControl, TouchableOpacity, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { AdminApi } from '@/services/admin';

type AuditRow = {
  id: number;
  at: string;                 // ISO date
  user_id: number | null;
  user_email?: string | null;
  user_name?: string | null;
  module: string;
  action: string;
  ip?: string | null;
  detail?: any;
};

const PAGE = 50;

export default function AuditScreen() {
  // Filtros
  const [userId, setUserId] = useState<string>('');
  const [moduleF, setModuleF] = useState<string>('');
  const [actionF, setActionF] = useState<string>('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [q, setQ] = useState<string>('');

  // Datos
  const [items, setItems] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const params = useMemo(() => {
    return {
      user_id: userId ? Number(userId) : undefined,
      module: moduleF || undefined,
      action: actionF || undefined,
      from: from || undefined,
      to: to || undefined,
      q: q || undefined,
      limit: PAGE,
      offset
    };
  }, [userId, moduleF, actionF, from, to, q, offset]);

  const load = useCallback(async (mode: 'refresh' | 'append' = 'refresh') => {
    if (loading) return;
    setLoading(true);
    try {
      const nextOffset = mode === 'refresh' ? 0 : offset;
      const rows = await AdminApi.audit.list({
        ...params,
        offset: nextOffset,
      });

      if (mode === 'refresh') {
        setItems(rows as AuditRow[]);
        setOffset(PAGE);
        setHasMore((rows as AuditRow[]).length === PAGE);
      } else {
        setItems(prev => [...prev, ...(rows as AuditRow[])]);
        setOffset(nextOffset + PAGE);
        setHasMore((rows as AuditRow[]).length === PAGE);
      }
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || e?.message || 'No se pudo cargar auditoría');
    } finally {
      setLoading(false);
      if (refreshing) setRefreshing(false);
    }
  }, [loading, offset, refreshing, params]);

  useEffect(() => {
    load('refresh');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => {
    setRefreshing(true);
    setOffset(0);
    load('refresh');
  };

  const clearFilters = () => {
    setUserId('');
    setModuleF('');
    setActionF('');
    setFrom('');
    setTo('');
    setQ('');
    setRefreshing(true);
    setOffset(0);
    load('refresh');
  };

  const exportCsv = async () => {
    try {
      const csv: string = await AdminApi.audit.csv({
        user_id: userId ? Number(userId) : undefined,
        module: moduleF || undefined,
        action: actionF || undefined,
        from: from || undefined,
        to: to || undefined,
        q: q || undefined,
      });
      const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      await WebBrowser.openBrowserAsync(dataUrl);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || e?.message || 'No se pudo exportar CSV');
    }
  };

  const renderItem = ({ item }: { item: AuditRow }) => {
    const when = fmtLocal(item.at);
    const who = item.user_name || item.user_email || (item.user_id ? `User #${item.user_id}` : '—');
    const modAct = `${item.module} · ${item.action}`;
    const ip = item.ip ? ` · ${item.ip}` : '';
    const detailStr = safeDetail(item.detail);

    return (
      <TouchableOpacity style={s.row} activeOpacity={0.8}>
        <Text style={s.title}>{when}{ip}</Text>
        <Text style={s.sub}>{who}</Text>
        <Text style={s.badge}>{modAct}</Text>
        {!!detailStr && <Text style={s.detail} numberOfLines={4}>{detailStr}</Text>}
      </TouchableOpacity>
    );
  };

  const onEndReached = () => {
    if (!loading && hasMore) {
      load('append');
    }
  };

  return (
    <View style={{ flex: 1, padding: 12 }}>
      {/* Filtros */}
      <View style={s.card}>
        <Text style={s.h2}>Filtros</Text>
        <TextInput
          style={s.input}
          placeholder="user_id (num)"
          keyboardType="numeric"
          value={userId}
          onChangeText={setUserId}
        />
        <TextInput
          style={s.input}
          placeholder="módulo (ej. AUTH/REQUESTS/INVENTORY/...)"
          value={moduleF}
          onChangeText={setModuleF}
        />
        <TextInput
          style={s.input}
          placeholder="acción (ej. LOGIN/CREATE/UPDATE/DELETE/...)"
          value={actionF}
          onChangeText={setActionF}
        />
        <TextInput
          style={s.input}
          placeholder="Desde (YYYY-MM-DD o ISO)"
          value={from}
          onChangeText={setFrom}
        />
        <TextInput
          style={s.input}
          placeholder="Hasta (YYYY-MM-DD o ISO)"
          value={to}
          onChangeText={setTo}
        />
        <TextInput
          style={s.input}
          placeholder="Búsqueda libre (q)"
          value={q}
          onChangeText={setQ}
        />

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
          <View style={{ flex: 1 }}>
            <Button title="Aplicar" onPress={applyFilters} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Limpiar" onPress={clearFilters} />
          </View>
        </View>
      </View>

      {/* Acciones */}
      <View style={[s.card, { marginTop: 6 }]}>
        <Text style={s.h2}>Acciones</Text>
        <Button title="Exportar CSV" onPress={exportCsv} />
      </View>

      {/* Lista */}
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load('refresh'); }} />
        }
        onEndReachedThreshold={0.35}
        onEndReached={onEndReached}
        ListEmptyComponent={
          !loading ? <Text style={{ textAlign: 'center', marginTop: 24 }}>No hay registros</Text> : null
        }
      />
    </View>
  );
}

function fmtLocal(s?: string) {
  if (!s) return '';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

function safeDetail(detail: any) {
  try {
    if (detail == null) return '';
    if (typeof detail === 'string') return detail;
    return JSON.stringify(detail, null, 2);
  } catch {
    return '';
  }
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8, elevation: 2 },
  h2: { fontWeight: '800', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 8, marginVertical: 4 },
  row: { backgroundColor: '#fff', padding: 12, borderRadius: 8, marginVertical: 6, elevation: 1 },
  title: { fontWeight: '700' },
  sub: { color: '#555', marginTop: 2 },
  badge: { marginTop: 4, fontSize: 12, color: '#111' },
  detail: { marginTop: 6, fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }) as any },
});
