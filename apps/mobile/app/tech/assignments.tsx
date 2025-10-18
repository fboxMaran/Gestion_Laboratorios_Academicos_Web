import React, { useState } from 'react';
import { View, Text, TextInput, Alert, StyleSheet, FlatList, Pressable } from 'react-native';
import { TechApi } from '@/services/tech';

export default function AssignmentsScreen() {
  const [labId, setLabId] = useState('1');
  const [requestId, setRequestId] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<number,string>>({});

  const pickError = (e:any) =>
    e?.response?.data?.error || e?.response?.data?.message || e?.message || 'No se pudo completar la operación';

  const load = async () => {
    try {
      const data = await TechApi.listAssignments({
        lab_id: labId ? Number(labId) : undefined,
        request_id: requestId ? Number(requestId) : undefined
      });
      setRows(data);
    } catch (e:any) {
      Alert.alert('Atención', pickError(e));
    }
  };

  const setNote = (id:number, v:string) => setNotes(prev => ({ ...prev, [id]: v }));

  const act = async (kind:'return'|'lost'|'damaged', id:number) => {
    try {
      const n = notes[id] || '';
      if (kind === 'return') await TechApi.returnAssignment(id, { notes: n });
      if (kind === 'lost') await TechApi.markLost(id, { notes: n });
      if (kind === 'damaged') await TechApi.markDamaged(id, { notes: n });
      Alert.alert('Listo', 'Estado de la asignación actualizado.');
      setNotes(prev => ({ ...prev, [id]: '' }));
      load();
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
          <Text style={s.h1}>Asignaciones</Text>
          <View style={s.row}>
            <TextInput
              style={s.input}
              placeholder="ID de laboratorio (lab_id)"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={labId}
              onChangeText={setLabId}
            />
            <TextInput
              style={s.input}
              placeholder="ID de solicitud (request_id) — opcional"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={requestId}
              onChangeText={setRequestId}
            />
          </View>
          <Pressable style={[s.btn, s.btnPrimary]} onPress={load}>
            <Text style={s.btnText}>Buscar</Text>
          </Pressable>
        </View>
      }
      renderItem={({item})=>(
        <View style={s.card}>
          <Text style={s.h2}>Asignación #{item.id} · {item.status}</Text>
          <Text style={s.sub}>Solicitud #{item.request_id} · Lab {item.lab_id}</Text>
          <Text style={s.line}>
            {item.resource_name
              ? `Recurso: ${item.resource_name}`
              : item.fixed_name
                ? `Equipo fijo: ${item.fixed_name}`
                : '—'}
          </Text>
          <Text style={s.sub}>Cantidad: {item.qty} · {new Date(item.assigned_at).toLocaleString()}</Text>
          {!!item.due_at && <Text style={s.sub}>Fecha límite: {new Date(item.due_at).toLocaleString()}</Text>}

          <TextInput
            style={[s.input, { marginTop:8 }]}
            placeholder="Notas (opcional)"
            placeholderTextColor="#94a3b8"
            value={notes[item.id] || ''}
            onChangeText={(v)=>setNote(item.id, v)}
          />

          <View style={s.btnRow}>
            <Pressable style={[s.btn, s.btnOk]} onPress={() => act('return', item.id)}>
              <Text style={s.btnText}>Devolver</Text>
            </Pressable>
            <Pressable style={[s.btn, s.btnWarn]} onPress={() => act('lost', item.id)}>
              <Text style={s.btnText}>Perdido</Text>
            </Pressable>
            <Pressable style={[s.btn, s.btnDanger]} onPress={() => act('damaged', item.id)}>
              <Text style={s.btnText}>Dañado</Text>
            </Pressable>
          </View>
        </View>
      )}
      ListEmptyComponent={<Text style={s.empty}>No hay asignaciones para los filtros indicados.</Text>}
      contentContainerStyle={{ padding:12 }}
    />
  );
}

const COLORS = { bg:'#0b1220', card:'#111827', border:'#1f2937', text:'#e5e7eb', sub:'#94a3b8',
  primary:'#4f46e5', ok:'#22c55e', warn:'#f59e0b', danger:'#ef4444' };

const s = StyleSheet.create({
  h1:{ fontSize:20, fontWeight:'800', color:COLORS.text },
  h2:{ fontWeight:'800', color:COLORS.text },
  sub:{ color:COLORS.sub, marginTop:2 },
  line:{ color:COLORS.text, marginTop:4 },
  row:{ flexDirection:'row', gap:8, marginTop:8 },
  input:{ flex:1, backgroundColor:COLORS.bg, borderWidth:1, borderColor:COLORS.border, borderRadius:10, padding:10, color:COLORS.text },
  card:{ backgroundColor:COLORS.card, padding:12, borderRadius:12, marginBottom:10, borderWidth:1, borderColor:COLORS.border },
  btnRow:{ flexDirection:'row', gap:8, marginTop:10 },
  btn:{ flex:1, paddingVertical:10, borderRadius:10, alignItems:'center' },
  btnPrimary:{ backgroundColor:COLORS.primary },
  btnOk:{ backgroundColor:COLORS.ok },
  btnWarn:{ backgroundColor:COLORS.warn },
  btnDanger:{ backgroundColor:COLORS.danger },
  btnText:{ color:'#fff', fontWeight:'800' },
  empty:{ color:COLORS.sub, textAlign:'center', marginTop:16 },
});
