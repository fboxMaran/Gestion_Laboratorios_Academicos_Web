import React, { useState } from 'react';
import {
  View, Text, TextInput, FlatList, Alert, ActivityIndicator,
  StyleSheet, Switch, Pressable
} from 'react-native';
import { TechApi } from '@/services/tech';

type ApprovedRow = any;

export default function ApprovedRequestsScreen() {
  const [labId, setLabId] = useState('1');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [overdue, setOverdue] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<ApprovedRow[]>([]);
  const [openAssign, setOpenAssign] = useState<Record<number, boolean>>({});
  const [assignForm, setAssignForm] = useState<Record<number, {
    resource_id?: string; fixed_id?: string; qty?: string; due_at?: string; notes?: string; user_id?: string;
  }>>({});
  const [precheck, setPrecheck] = useState<Record<number, any>>({});

  const pickError = (e: any) =>
    e?.response?.data?.error || e?.response?.data?.message || e?.message || 'No se pudo completar la operación';

  const load = async () => {
    try {
      setLoading(true);
      const data = await TechApi.listApproved({
        lab_id: labId ? Number(labId) : undefined,
        from: from || undefined,
        to: to || undefined,
        overdue
      });
      setRows(data);
    } catch (e:any) {
      Alert.alert('Atención', pickError(e));
    } finally {
      setLoading(false);
    }
  };

  const doPrecheck = async (id: number) => {
    try {
      const r = await TechApi.precheck(id);
      setPrecheck(prev => ({ ...prev, [id]: r }));
      if (!r.request_ok) Alert.alert('Atención', 'La solicitud no está en estado APROBADA.');
      if (!r.requirements_ok) Alert.alert('Requisitos', 'El usuario no cumple los requisitos necesarios.');
    } catch (e:any) {
      Alert.alert('Atención', pickError(e));
    }
  };

  const toggleAssign = (id:number) => setOpenAssign(prev => ({ ...prev, [id]: !prev[id] }));
  const editAssign = (
    id:number,
    k:'resource_id'|'fixed_id'|'qty'|'due_at'|'notes'|'user_id',
    v:string
  ) => setAssignForm(prev => ({ ...prev, [id]: { ...(prev[id]||{}), [k]: v } }));

  const doAssign = async (r: ApprovedRow) => {
    const f = assignForm[r.id] || {};
    if (!f.resource_id && !f.fixed_id) {
      Alert.alert('Completar', 'Debes indicar un resource_id o un fixed_id.'); return;
    }
    try {
      const payload = {
        request_id: r.id,
        lab_id: r.lab_id,
        user_id: f.user_id ? Number(f.user_id) : undefined,
        resource_id: f.resource_id ? Number(f.resource_id) : undefined,
        fixed_id: f.fixed_id ? Number(f.fixed_id) : undefined,
        qty: f.qty ? Number(f.qty) : 1,
        due_at: f.due_at || undefined,
        notes: f.notes || undefined,
      };
      const res = await TechApi.createAssignment(payload);
      Alert.alert('Listo', `Asignación #${res.id} creada correctamente.`);
      setOpenAssign(prev => ({ ...prev, [r.id]: false }));
      setAssignForm(prev => ({ ...prev, [r.id]: {} }));
    } catch (e:any) {
      Alert.alert('Atención', pickError(e));
    }
  };

  return (
    <FlatList
      data={rows}
      keyExtractor={(x)=>String(x.id)}
      ListHeaderComponent={
        <View style={{ padding:12 }}>
          <Text style={s.h1}>Solicitudes aprobadas</Text>

          <View style={s.row}>
            <TextInput
              style={s.input}
              placeholder="ID de laboratorio (lab_id)"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={labId}
              onChangeText={setLabId}
            />
          </View>

          <View style={s.row}>
            <TextInput
              style={s.input}
              placeholder="Desde (YYYY-MM-DD)"
              placeholderTextColor="#94a3b8"
              value={from}
              onChangeText={setFrom}
            />
            <TextInput
              style={s.input}
              placeholder="Hasta (YYYY-MM-DD)"
              placeholderTextColor="#94a3b8"
              value={to}
              onChangeText={setTo}
            />
          </View>

          <View style={[s.row, { alignItems:'center', marginTop:8 }]}>
            <Text style={s.tag}>Solo vencidas</Text>
            <Switch value={overdue} onValueChange={setOverdue} />
            <View style={{ width:8 }} />
            <Pressable style={[s.btn, s.btnPrimary]} onPress={load}>
              <Text style={s.btnText}>Buscar</Text>
            </Pressable>
          </View>

          {loading && <ActivityIndicator style={{ marginTop:10 }} />}
        </View>
      }
      renderItem={({item}) => {
        const pc = precheck[item.id];
        return (
          <View style={s.card}>
            <Text style={s.h2}>#{item.id} · {item.requester_name} · {item.requester_email}</Text>
            <Text style={s.sub}>Lab {item.lab_id} · {new Date(item.requested_from).toLocaleString()} → {new Date(item.requested_to).toLocaleString()}</Text>
            {!!item.is_overdue && <Text style={s.badgeDanger}>VENCIDA</Text>}
            <Text style={s.p}>{item.purpose}</Text>
            <Text style={s.muted}>Ítems: {item.items?.length || 0}</Text>

            <View style={s.btnRow}>
              <Pressable style={[s.btn, s.btnInfo]} onPress={() => doPrecheck(item.id)}>
                <Text style={s.btnText}>Precheck</Text>
              </Pressable>
              <Pressable
                style={[s.btn, openAssign[item.id] ? s.btnMuted : s.btnOk]}
                onPress={() => toggleAssign(item.id)}
              >
                <Text style={s.btnText}>{openAssign[item.id] ? 'Cancelar' : 'Entregar…'}</Text>
              </Pressable>
            </View>

            {pc && (
              <View style={s.box}>
                <Text style={s.boxTitle}>Resultado de precheck</Text>
                <Text style={s.line}>
                  <Text style={s.tag}>Solicitud:</Text> {pc.request_ok ? 'OK' : 'No aprobada'}
                </Text>
                <Text style={s.line}>
                  <Text style={s.tag}>Requisitos:</Text> {pc.requirements_ok ? 'Cumplidos' : 'Faltantes'}
                </Text>
                {(pc.availability||[]).map((a:any)=>(
                  <Text key={a.item_id} style={s.li}>
                    • Ítem {a.item_id}: {a.reason} {a.resource ? `(stock ${a.resource.qty_available})` : ''}
                  </Text>
                ))}
              </View>
            )}

            {openAssign[item.id] && (
              <View style={s.box}>
                <Text style={s.boxTitle}>Crear asignación</Text>

                <TextInput
                  style={s.input}
                  placeholder="ID de usuario (opcional)"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={assignForm[item.id]?.user_id || ''}
                  onChangeText={(v)=>editAssign(item.id,'user_id',v)}
                />
                <TextInput
                  style={s.input}
                  placeholder="ID de recurso (resource_id)"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={assignForm[item.id]?.resource_id || ''}
                  onChangeText={(v)=>editAssign(item.id,'resource_id',v)}
                />
                <TextInput
                  style={s.input}
                  placeholder="ID de equipo fijo (fixed_id)"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={assignForm[item.id]?.fixed_id || ''}
                  onChangeText={(v)=>editAssign(item.id,'fixed_id',v)}
                />
                <TextInput
                  style={s.input}
                  placeholder="Cantidad (qty)"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={assignForm[item.id]?.qty || ''}
                  onChangeText={(v)=>editAssign(item.id,'qty',v)}
                />
                <TextInput
                  style={s.input}
                  placeholder="Fecha límite (YYYY-MM-DDTHH:mm)"
                  placeholderTextColor="#94a3b8"
                  value={assignForm[item.id]?.due_at || ''}
                  onChangeText={(v)=>editAssign(item.id,'due_at',v)}
                />
                <TextInput
                  style={s.input}
                  placeholder="Notas"
                  placeholderTextColor="#94a3b8"
                  value={assignForm[item.id]?.notes || ''}
                  onChangeText={(v)=>editAssign(item.id,'notes',v)}
                />

                <Pressable style={[s.btn, s.btnPrimary]} onPress={() => doAssign(item)}>
                  <Text style={s.btnText}>Crear</Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      }}
      ListEmptyComponent={!loading ? <Text style={s.empty}>Sin resultados para los filtros indicados.</Text> : null}
      contentContainerStyle={{ padding:12 }}
    />
  );
}

const COLORS = { bg:'#0b1220', card:'#111827', border:'#1f2937', text:'#e5e7eb', sub:'#94a3b8',
  primary:'#4f46e5', ok:'#22c55e', info:'#0ea5e9', warn:'#f59e0b', danger:'#ef4444', muted:'#334155' };

const s = StyleSheet.create({
  h1:{ fontSize:20, fontWeight:'800', color:COLORS.text },
  row:{ flexDirection:'row', gap:8, marginTop:8 },
  input:{ flex:1, backgroundColor:COLORS.bg, borderWidth:1, borderColor:COLORS.border, borderRadius:10, padding:10, color:COLORS.text },
  card:{ backgroundColor:COLORS.card, borderRadius:12, padding:12, marginBottom:10, borderWidth:1, borderColor:COLORS.border },
  h2:{ color:COLORS.text, fontWeight:'800' },
  sub:{ color:COLORS.sub, marginTop:2 },
  p:{ color:COLORS.text, marginTop:6 },
  muted:{ color:COLORS.sub, marginTop:4, fontStyle:'italic' },
  btnRow:{ flexDirection:'row', gap:8, marginTop:10 },
  btn:{ paddingVertical:10, paddingHorizontal:14, borderRadius:10, alignItems:'center' },
  btnPrimary:{ backgroundColor:COLORS.primary },
  btnOk:{ backgroundColor:COLORS.ok },
  btnInfo:{ backgroundColor:COLORS.info },
  btnMuted:{ backgroundColor:COLORS.muted },
  btnText:{ color:'#fff', fontWeight:'800' },
  box:{ marginTop:10, padding:10, backgroundColor:'#0f172a', borderRadius:10, borderWidth:1, borderColor:COLORS.border },
  boxTitle:{ color:COLORS.text, fontWeight:'800', marginBottom:6 },
  line:{ color:COLORS.text, marginTop:2 },
  li:{ color:COLORS.text, marginTop:4 },
  tag:{ color:COLORS.sub, fontWeight:'700' },
  badgeDanger:{ marginTop:6, alignSelf:'flex-start', backgroundColor:'#7f1d1d', color:'#fecaca', paddingHorizontal:8, paddingVertical:2, borderRadius:6, fontWeight:'800' },
  empty:{ color:COLORS.sub, textAlign:'center', marginTop:16 },
});
