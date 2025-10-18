// app/users/availability.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, Alert, StyleSheet, FlatList, Pressable, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import axios from 'axios';
import { useRouter } from 'expo-router';

const BASE = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');

type Lab = { id: number; name: string; code: string; location: string; description?: string; policies?: any };
type Type = { id: number; name: string };
type Resource = {
  id: number; lab_id: number; name: string; type_id: number;
  status: 'DISPONIBLE'|'RESERVADO'|'MANTENIMIENTO'|'INACTIVO'; qty_available?: number;
};
type Slot = {
  id?: number;
  lab_id?: number;
  resource_id?: number | null;
  starts_at: string;
  ends_at: string;
  status: 'DISPONIBLE'|'RESERVADO'|'MANTENIMIENTO'|'INACTIVO'|'BLOQUEADO'|'EXCLUSIVO';
  title?: string | null;
  reason?: string | null;
};

export default function UsersAvailability() {
  const router = useRouter();

  // filtros
  const [labId, setLabId] = useState<string>('1');
  const [typeId, setTypeId] = useState<string>('');
  const [from, setFrom] = useState<string>(() => new Date(Date.now()).toISOString().slice(0, 10) + 'T00:00:00Z');
  const [to, setTo] = useState<string>(() => new Date(Date.now() + 7*24*60*60*1000).toISOString().slice(0, 10) + 'T23:59:59Z');

  // datos
  const [labs, setLabs] = useState<Lab[]>([]);
  const [types, setTypes] = useState<Type[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);

  // UI
  const [loadingLabs, setLoadingLabs] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingResources, setLoadingResources] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const [selectedResourceId, setSelectedResourceId] = useState<string>('');

  const pickError = (e: any) => {
    if (e?.response?.status === 404) return 'No se encontraron datos para los filtros indicados.';
    return e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Error inesperado';
  };

  // ==== cargas base ====
  const loadLabs = async () => {
    try {
      setLoadingLabs(true);
      const { data } = await axios.get(`${BASE}/labs`);
      setLabs(Array.isArray(data) ? data : []);
    } catch (e:any) {
      Alert.alert('Atención', pickError(e));
    } finally {
      setLoadingLabs(false);
    }
  };

  const loadTypes = async () => {
    try {
      setLoadingTypes(true);
      const { data } = await axios.get(`${BASE}/resource-types`);
      setTypes(Array.isArray(data) ? data : []);
    } catch (e:any) {
      Alert.alert('Atención', pickError(e));
    } finally {
      setLoadingTypes(false);
    }
  };

  useEffect(() => {
    loadLabs();
    loadTypes();
  }, []);

  // ==== recursos disponibles ====
  const loadResources = async () => {
    if (!labId) return Alert.alert('Completar', 'El ID de laboratorio es obligatorio.');
    try {
      setLoadingResources(true);
      const params: any = { lab_id: Number(labId), status: 'DISPONIBLE' };
      if (typeId) params.type_id = Number(typeId);
      const { data } = await axios.get(`${BASE}/resources`, { params });
      setResources(Array.isArray(data) ? data : []);
    } catch (e:any) {
      Alert.alert('Atención', pickError(e));
    } finally {
      setLoadingResources(false);
    }
  };

  // ==== disponibilidad (slots) ====
  const fetchLabSlots = async (lab_id: number, fromISO: string, toISO: string) => {
    try {
      const { data } = await axios.get(`${BASE}/labs/${lab_id}/calendar`, {
        params: { from: fromISO, to: toISO, status: 'DISPONIBLE' }
      });
      return Array.isArray(data?.slots) ? (data.slots as Slot[]) :
             Array.isArray(data) ? (data as Slot[]) : [];
    } catch (_a) {
      const { data } = await axios.get(`${BASE}/calendar/slots`, {
        params: { lab_id, from: fromISO, to: toISO, status: 'DISPONIBLE' }
      });
      return Array.isArray(data) ? (data as Slot[]) : [];
    }
  };

  const fetchResourceSlots = async (resource_id: number, fromISO: string, toISO: string) => {
    try {
      const { data } = await axios.get(`${BASE}/resources/${resource_id}/availability`, {
        params: { from: fromISO, to: toISO }
      });
      return Array.isArray(data?.slots) ? (data.slots as Slot[]) :
             Array.isArray(data) ? (data as Slot[]) : [];
    } catch (_a) {
      const { data } = await axios.get(`${BASE}/calendar/slots`, {
        params: { resource_id, from: fromISO, to: toISO, status: 'DISPONIBLE' }
      });
      return Array.isArray(data) ? (data as Slot[]) : [];
    }
  };

  const viewSlots = async () => {
    if (!labId) return Alert.alert('Completar', 'El ID de laboratorio es obligatorio.');
    try {
      setLoadingSlots(true);
      const fromISO = from;
      const toISO = to;

      const rid = selectedResourceId ? Number(selectedResourceId) : undefined;
      let rows: Slot[] = [];
      rows = rid ? await fetchResourceSlots(rid, fromISO, toISO)
                 : await fetchLabSlots(Number(labId), fromISO, toISO);
      rows = rows.filter(s => s.status === 'DISPONIBLE');
      setSlots(rows);
    } catch (e:any) {
      Alert.alert('Atención', pickError(e));
    } finally {
      setLoadingSlots(false);
    }
  };

  // ==== políticas del lab ====
  const [labDetail, setLabDetail] = useState<any>(null);
  const loadLabDetail = async () => {
    if (!labId) return;
    try {
      const { data } = await axios.get(`${BASE}/labs/${Number(labId)}`);
      setLabDetail(data);
    } catch (_e) {
      setLabDetail(null);
    }
  };
  useEffect(() => { loadLabDetail(); }, [labId]);

  // ==== agrupar por día ====
  const grouped = useMemo(() => {
    const byDay: Record<string, Slot[]> = {};
    for (const s of slots) {
      const day = new Date(s.starts_at).toISOString().slice(0,10);
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(s);
    }
    const days = Object.keys(byDay).sort();
    return days.map(d => ({ day: d, rows: byDay[d].sort((a,b)=>+new Date(a.starts_at)-+new Date(b.starts_at)) }));
  }, [slots]);

  return (
    <SafeAreaView style={st.screen}>
      <FlatList
        data={grouped}
        keyExtractor={(x) => x.day}
        ListHeaderComponent={
          <View style={{ padding:16 }}>
            <Text style={st.h1}>Disponibilidad</Text>

            {/* Parámetros */}
            <View style={st.card}>
              <Text style={st.h2}>Parámetros</Text>

              <TextInput
                style={st.input}
                placeholder="ID de laboratorio"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={labId}
                onChangeText={setLabId}
              />
              <TextInput
                style={st.input}
                placeholder="ID de tipo (opcional)"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={typeId}
                onChangeText={setTypeId}
              />
              <TextInput
                style={st.input}
                placeholder="Desde (YYYY-MM-DDTHH:mm:ssZ)"
                placeholderTextColor="#94a3b8"
                value={from}
                onChangeText={setFrom}
              />
              <TextInput
                style={st.input}
                placeholder="Hasta (YYYY-MM-DDTHH:mm:ssZ)"
                placeholderTextColor="#94a3b8"
                value={to}
                onChangeText={setTo}
              />

              <View style={st.row}>
                <Pressable style={[st.btn, st.btnSuccess]} onPress={loadResources}>
                  <Text style={st.btnText}>Cargar recursos</Text>
                </Pressable>
                <View style={{ width:8 }} />
                <Pressable style={[st.btn, st.btnInfo]} onPress={viewSlots}>
                  <Text style={st.btnText}>Ver disponibilidad</Text>
                </Pressable>
              </View>

              {(loadingResources || loadingSlots || loadingLabs || loadingTypes) && (
                <ActivityIndicator style={{ marginTop:8 }} />
              )}
            </View>

            {/* Selector de recurso (opcional) */}
            <View style={st.card}>
              <Text style={st.h2}>Recursos DISPONIBLES en Lab {labId}{typeId ? ` · Tipo ${typeId}`:''}</Text>
              {resources.length === 0 && <Text style={st.muted}>Sin recursos listados. Toca “Cargar recursos”.</Text>}

              <View style={{ gap:8, marginTop:8 }}>
                {resources.map(r => (
                  <Pressable
                    key={r.id}
                    onPress={() => setSelectedResourceId(String(r.id))}
                    style={[
                      st.item,
                      String(r.id) === selectedResourceId && { borderColor: '#22c55e', backgroundColor:'#064e3b' }
                    ]}
                  >
                    <Text style={st.itemTitle}>#{r.id} · {r.name}</Text>
                    <Text style={st.sub}>Estado: {r.status} · Stock: {r.qty_available ?? '—'}</Text>
                  </Pressable>
                ))}
              </View>

              {selectedResourceId ? (
                <Text style={[st.muted, { marginTop:6 }]}>
                  Verás espacios solo del recurso #{selectedResourceId}. Toca otra vez para cambiar.
                </Text>
              ) : (
                <Text style={[st.muted, { marginTop:6 }]}>
                  Sin recurso seleccionado: verás espacios del laboratorio completo.
                </Text>
              )}
            </View>

            {/* Políticas del lab (si vienen) */}
            <View style={st.card}>
              <Text style={st.h2}>Políticas / Requisitos</Text>
              {labDetail?.policies ? (
                <View>
                  {!!labDetail.policies.academic_requirements && (
                    <Text style={st.p}>Académicos: {labDetail.policies.academic_requirements}</Text>
                  )}
                  {!!labDetail.policies.safety_requirements && (
                    <Text style={st.p}>Seguridad: {labDetail.policies.safety_requirements}</Text>
                  )}
                  {!!labDetail.policies.capacity_max && (
                    <Text style={st.p}>Capacidad: {labDetail.policies.capacity_max}</Text>
                  )}
                </View>
              ) : (
                <Text style={st.muted}>No hay políticas adjuntas o el endpoint del laboratorio no las incluye.</Text>
              )}
            </View>

            <Text style={[st.h2, { marginTop:8 }]}>Resultados</Text>
            {slots.length === 0 && <Text style={st.muted}>Sin resultados. Toca “Ver disponibilidad”.</Text>}
          </View>
        }
        renderItem={({ item }) => (
          <View style={st.card}>
            <Text style={st.day}>{new Date(item.day+'T00:00:00Z').toDateString()}</Text>
            <View style={{ gap:8, marginTop:8 }}>
              {item.rows.map((slt, i) => (
                <View key={`${item.day}-${i}`} style={st.slot}>
                  <Text style={st.slotTitle}>
                    {new Date(slt.starts_at).toLocaleTimeString()} – {new Date(slt.ends_at).toLocaleTimeString()}
                  </Text>
                  {!!slt.title && <Text style={st.sub}>{slt.title}</Text>}
                  <Text style={st.tag}>DISPONIBLE</Text>
                  <View style={st.row}>
                    <Pressable
                      style={[st.btn, st.btnWarn]}
                      onPress={() => router.push(`/requests/new?labId=${labId}` as any)}
                    >
                      <Text style={st.btnText}>Solicitar</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
        contentContainerStyle={{ padding:16 }}
      />
    </SafeAreaView>
  );
}

const COLORS = { bg:'#0b1220', card:'#111827', border:'#1f2937', text:'#e5e7eb', sub:'#94a3b8', primary:'#4f46e5', success:'#10b981', info:'#0ea5e9', warn:'#f59e0b' };

const st = StyleSheet.create({
  screen:{ flex:1, backgroundColor:COLORS.bg },
  h1:{ fontSize:20, fontWeight:'800', color:COLORS.text },
  h2:{ fontWeight:'800', color:COLORS.text },
  row:{ flexDirection:'row', alignItems:'center', marginTop:8, flexWrap:'wrap' },
  input:{ backgroundColor:COLORS.bg, borderWidth:1, borderColor:COLORS.border, borderRadius:10, padding:12, marginTop:8, color:COLORS.text },
  card:{ backgroundColor:COLORS.card, borderRadius:12, padding:12, marginBottom:10, borderWidth:1, borderColor:COLORS.border },
  item:{ borderWidth:1, borderColor:COLORS.border, borderRadius:10, padding:10, backgroundColor:'#0b1220' },
  itemTitle:{ fontWeight:'700', color:COLORS.text },
  sub:{ color:COLORS.sub },
  muted:{ color:COLORS.sub, fontStyle:'italic' },
  p:{ color:COLORS.text, marginTop:4 },
  day:{ fontWeight:'800', color:COLORS.text },
  slot:{ borderWidth:1, borderColor:COLORS.border, borderRadius:10, padding:10, backgroundColor:'#0b1220' },
  slotTitle:{ fontWeight:'700', color:COLORS.text },
  tag:{ marginTop:4, alignSelf:'flex-start', backgroundColor:'#166534', paddingHorizontal:8, paddingVertical:2, borderRadius:6, color:'#dcfce7', fontWeight:'700' },
  btn:{ borderRadius:10, paddingVertical:10, paddingHorizontal:14, alignItems:'center', marginTop:8 },
  btnText:{ color:'#fff', fontWeight:'800' },
  btnSuccess:{ backgroundColor:COLORS.success },
  btnInfo:{ backgroundColor:COLORS.info },
  btnWarn:{ backgroundColor:COLORS.warn },
});
