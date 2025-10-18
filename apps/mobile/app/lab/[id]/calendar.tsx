import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Alert, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { CalendarApi, ResourcesApi } from '@/services/availability';
import type { Slot, SlotStatus, Resource } from '@/types/availability';

type ViewMode = 'week'|'month';

function addDays(date: Date, days: number) { const d = new Date(date); d.setDate(d.getDate()+days); return d; }
function startOfWeek(d: Date) { const t = new Date(d); const day = t.getDay(); t.setHours(0,0,0,0); return addDays(t, -day); }
function endOfWeek(d: Date) { return addDays(startOfWeek(d), 7); }
function startOfMonth(d: Date) { const t=new Date(d.getFullYear(), d.getMonth(), 1); t.setHours(0,0,0,0); return t; }
function endOfMonth(d: Date) { const t=new Date(d.getFullYear(), d.getMonth()+1, 0, 23,59,59,999); return t; }

const statusColors: Record<SlotStatus,string> = {
  DISPONIBLE:'#4CAF50',
  RESERVADO:'#FF9800',
  MANTENIMIENTO:'#9C27B0',
  INACTIVO:'#9E9E9E',
  BLOQUEADO:'#F44336',
  EXCLUSIVO:'#3F51B5'
};

const pickError = (e:any) =>
  e?.response?.data?.error || e?.response?.data?.message || e?.message || 'No se pudo completar la acción';

export default function LabCalendar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const labId = Number(id);

  const [view, setView] = useState<ViewMode>('week');
  const [anchor, setAnchor] = useState<Date>(new Date());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [filterResourceId, setFilterResourceId] = useState<string>('');

  // Form crear slot
  const [sTitle, setSTitle] = useState('');
  const [sStatus, setSStatus] = useState<SlotStatus>('DISPONIBLE');
  const [sResourceId, setSResourceId] = useState<string>(''); // opcional
  const [sStart, setSStart] = useState('');
  const [sEnd, setSEnd] = useState('');

  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const range = useMemo(() => {
    if (view==='week') return { from: startOfWeek(anchor), to: endOfWeek(anchor) };
    return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
  }, [view, anchor]);

  const load = async () => {
    if (!labId || Number.isNaN(labId)) {
      setSlots([]); setResources([]); setNotFound(true);
      return;
    }
    try {
      setLoading(true);
      setNotFound(false);

      const params:any = {
        from: range.from.toISOString(),
        to: range.to.toISOString()
      };
      if (filterResourceId) params.resource_id = Number(filterResourceId);

      const [ss, rs] = await Promise.all([
        CalendarApi.list(labId, params),
        ResourcesApi.listByLab(labId)
      ]);

      setSlots(ss);
      setResources(rs);
    } catch (e:any) {
      if (e?.response?.status === 404) {
        // Lab sin calendario / recursos: tratamos como vacío y mostramos aviso
        setSlots([]); setResources([]); setNotFound(true);
      } else {
        Alert.alert('Atención', pickError(e));
      }
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [labId, view, anchor, filterResourceId]);

  const prev = () => setAnchor(view==='week' ? addDays(anchor, -7) : addDays(anchor, -30));
  const next = () => setAnchor(view==='week' ? addDays(anchor, 7) : addDays(anchor, 30));

  const createSlot = async () => {
    try {
      if (!sStart || !sEnd) return Alert.alert('Completar', 'Debes indicar inicio y fin (ISO).');
      await CalendarApi.create(labId, {
        resource_id: sResourceId ? Number(sResourceId) : undefined,
        starts_at: sStart, ends_at: sEnd, status: sStatus, title: sTitle || undefined
      });
      setSTitle(''); setSResourceId(''); setSStart(''); setSEnd('');
      Alert.alert('OK','Slot creado');
      load();
    } catch (e:any) {
      const st = e?.response?.status;
      if (st === 404) Alert.alert('No encontrado', 'El laboratorio o el recurso indicado no existe.');
      else if (st === 409) Alert.alert('Conflicto', 'El horario se traslapa con otro slot existente.');
      else Alert.alert('Atención', pickError(e));
    }
  };

  const cycleStatus = (st: SlotStatus): SlotStatus => {
    const order: SlotStatus[] = ['DISPONIBLE','RESERVADO','MANTENIMIENTO','INACTIVO','BLOQUEADO','EXCLUSIVO'];
    const i = order.indexOf(st); return order[(i+1)%order.length];
  };

  const changeStatus = async (slot: Slot) => {
    try {
      const next = cycleStatus(slot.status);
      const updated = await CalendarApi.setStatus(slot.id, next, 1);
      setSlots(prev => prev.map(s => s.id===slot.id ? updated : s));
    } catch (e:any) {
      const st = e?.response?.status;
      if (st === 404) Alert.alert('No encontrado', 'El slot ya no existe.');
      else Alert.alert('Atención', pickError(e));
    }
  };

  return (
    <View style={{flex:1, padding:12}}>
      {/* Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={prev} style={styles.navBtn}><Text style={styles.navBtnText}>‹</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>
            {view==='week'
              ? `Semana del ${range.from.toLocaleDateString()}`
              : range.from.toLocaleDateString('es-ES', { month:'long', year:'numeric' })
            }
          </Text>
          <TouchableOpacity onPress={next} style={styles.navBtn}><Text style={styles.navBtnText}>›</Text></TouchableOpacity>
        </View>

        <View style={styles.segment}>
          <TouchableOpacity onPress={() => setView('week')} style={[styles.segmentItem, view==='week' && styles.segmentItemActive]}>
            <Text style={[styles.segmentText, view==='week' && styles.segmentTextActive]}>Semana</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setView('month')} style={[styles.segmentItem, view==='month' && styles.segmentItemActive]}>
            <Text style={[styles.segmentText, view==='month' && styles.segmentTextActive]}>Mes</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filtro por recurso */}
      <View style={styles.card}>
        <Text style={styles.h2}>Filtro por recurso (opcional)</Text>
        <Text>Recursos: {resources.map(r => `${r.id}:${r.name}`).slice(0,3).join('  ')}{resources.length>3?' …':''}</Text>
        <TextInput
          placeholder="resource_id (vacío = todos)"
          placeholderTextColor="#94a3b8"
          value={filterResourceId} onChangeText={setFilterResourceId}
          style={styles.input}
          keyboardType="numeric"
        />
      </View>

      {/* Crear Slot */}
      <View style={styles.card}>
        <Text style={styles.h2}>Crear slot</Text>
        <TextInput style={styles.input} placeholder="Título (opcional)" placeholderTextColor="#94a3b8" value={sTitle} onChangeText={setSTitle}/>
        <TextInput style={styles.input} placeholder="resource_id (opcional)" placeholderTextColor="#94a3b8" keyboardType="numeric" value={sResourceId} onChangeText={setSResourceId}/>
        <TextInput style={styles.input} placeholder="Inicio ISO (YYYY-MM-DDTHH:mm:ss)" placeholderTextColor="#94a3b8" value={sStart} onChangeText={setSStart}/>
        <TextInput style={styles.input} placeholder="Fin ISO (YYYY-MM-DDTHH:mm:ss)" placeholderTextColor="#94a3b8" value={sEnd} onChangeText={setSEnd}/>
        <TextInput style={styles.input} placeholder="Estado (DISPONIBLE/RESERVADO/...)" placeholderTextColor="#94a3b8" value={sStatus} onChangeText={(t)=>setSStatus(t as SlotStatus)}/>
        <TouchableOpacity onPress={createSlot} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>Crear</Text>
        </TouchableOpacity>
      </View>

      {/* Avisos / cargas */}
      {loading && (
        <View style={{ paddingVertical:8, alignItems:'center' }}>
          <ActivityIndicator /><Text style={{ color:'#6b7280', marginTop:6 }}>Cargando calendario…</Text>
        </View>
      )}
      {notFound && !loading && (
        <View style={[styles.card, { borderColor:'#fee2e2', borderWidth:1 }]}>
          <Text style={{ fontWeight:'800', color:'#991b1b' }}>No se encontró calendario o recursos para este laboratorio.</Text>
          <Text style={{ color:'#6b7280', marginTop:4 }}>Si el lab es nuevo, aún no tendrá slots. Crea uno arriba y vuelve a intentar.</Text>
        </View>
      )}

      {/* Lista de slots (rango) */}
      <FlatList
        data={slots}
        keyExtractor={(i)=>String(i.id)}
        ListEmptyComponent={!loading ? <Text style={{ paddingHorizontal:12 }}>No hay slots en el rango seleccionado.</Text> : null}
        renderItem={({item})=>(
          <TouchableOpacity onLongPress={()=>changeStatus(item)} style={[styles.slot, { borderLeftColor: statusColors[item.status] }]}>
            <Text style={styles.slotTitle}>{item.title || '(sin título)'}  •  {item.status}</Text>
            <Text style={styles.slotSub}>
              {new Date(item.starts_at).toLocaleString()} — {new Date(item.ends_at).toLocaleString()}
              {item.resource_id ? `  ·  Recurso #${item.resource_id}` : `  ·  LAB`}
            </Text>
            <Text style={styles.slotHint}>Mantén presionado para cambiar estado en ciclo</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerCard:{ backgroundColor:'#fff', borderRadius:12, padding:12, marginBottom:10, elevation:2 },
  headerRow:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:10 },
  headerTitle:{ fontSize:16, fontWeight:'700' },
  navBtn:{ width:36, height:36, borderRadius:10, backgroundColor:'#f1f4ff', alignItems:'center', justifyContent:'center' },
  navBtnText:{ fontSize:20, fontWeight:'700', color:'#2d6cdf' },
  segment:{ flexDirection:'row', backgroundColor:'#eff2f7', borderRadius:10, padding:4 },
  segmentItem:{ flex:1, paddingVertical:8, borderRadius:8, alignItems:'center' },
  segmentItemActive:{ backgroundColor:'#2d6cdf' },
  segmentText:{ fontWeight:'600', color:'#334155' },
  segmentTextActive:{ color:'#fff' },
  card:{ backgroundColor:'#fff', padding:12, borderRadius:8, marginBottom:8, elevation:2 },
  h2:{ fontWeight:'600', marginBottom:6 },
  input:{ borderWidth:1, borderColor:'#d4d4d8', borderRadius:8, padding:10, marginVertical:4, color:'#111' },
  primaryBtn:{ backgroundColor:'#2d6cdf', paddingVertical:10, borderRadius:10, alignItems:'center', marginTop:6 },
  primaryBtnText:{ color:'#fff', fontWeight:'700' },
  slot:{ backgroundColor:'#fff', padding:12, borderRadius:8, marginVertical:6, elevation:1, borderLeftWidth:4 },
  slotTitle:{ fontWeight:'700' },
  slotSub:{ color:'#555', marginTop:2 },
  slotHint:{ color:'#999', fontSize:12, marginTop:4 }
});
