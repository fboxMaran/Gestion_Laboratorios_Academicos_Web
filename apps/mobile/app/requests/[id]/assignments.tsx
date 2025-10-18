import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Alert, StyleSheet, FlatList, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ControlApi } from '@/services/control';
import type { Assignment } from '@/types/control';

export default function AssignmentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const requestId = Number(id);

  const [items, setItems] = useState<Assignment[]>([]);
  const [resourceId, setResourceId] = useState('');
  const [fixedId, setFixedId] = useState('');
  const [qty, setQty] = useState('1');
  const [dueAt, setDueAt] = useState('');
  const [notes, setNotes] = useState('');

  const pickError = (e:any) =>
    e?.response?.data?.error || e?.response?.data?.message || e?.message || 'No se pudo completar la acción';

  const load = async () => {
    try {
      setItems(await ControlApi.listAssignments(requestId));
    } catch (e:any) { Alert.alert('Atención', pickError(e)); }
  };
  useEffect(() => { load(); }, [requestId]); // eslint-disable-line react-hooks/exhaustive-deps

  const assign = async () => {
    if (!resourceId && !fixedId) return Alert.alert('Completar', 'Indica resource_id o fixed_id.');
    if (resourceId && fixedId) return Alert.alert('Validación', 'No puedes enviar ambos a la vez.');
    try {
      const created = await ControlApi.createAssignments(requestId, [{
        resource_id: resourceId ? Number(resourceId) : undefined,
        fixed_id: fixedId ? Number(fixedId) : undefined,
        qty: Number(qty || 1),
        due_at: dueAt || undefined,
        notes: notes || undefined
      }]);
      setResourceId(''); setFixedId(''); setQty('1'); setDueAt(''); setNotes('');
      Alert.alert('Listo', `Asignación #${created[0].id} registrada.`);
      load();
    } catch (e:any) { Alert.alert('Atención', pickError(e)); }
  };

  const markReturn = async (a: Assignment) => {
    try {
      const upd = await ControlApi.returnAssignment(a.id, { status: 'DEVUELTO' });
      setItems(prev => prev.map(x => x.id === a.id ? upd : x));
    } catch (e:any) { Alert.alert('Atención', pickError(e)); }
  };

  return (
    <View style={s.screen}>
      <View style={s.card}>
        <Text style={s.h2}>Registrar asignación</Text>
        <TextInput
          style={s.input} placeholder="ID de recurso (resource_id) — opcional" placeholderTextColor="#94a3b8"
          keyboardType="numeric" value={resourceId} onChangeText={setResourceId}
        />
        <TextInput
          style={s.input} placeholder="ID de equipo fijo (fixed_id) — opcional" placeholderTextColor="#94a3b8"
          keyboardType="numeric" value={fixedId} onChangeText={setFixedId}
        />
        <TextInput
          style={s.input} placeholder="Cantidad (qty)" placeholderTextColor="#94a3b8"
          keyboardType="numeric" value={qty} onChangeText={setQty}
        />
        <TextInput
          style={s.input} placeholder="Vence (ISO: YYYY-MM-DDTHH:mm) — opcional" placeholderTextColor="#94a3b8"
          value={dueAt} onChangeText={setDueAt}
        />
        <TextInput
          style={s.input} placeholder="Notas (opcional)" placeholderTextColor="#94a3b8"
          value={notes} onChangeText={setNotes}
        />
        <Pressable style={s.btn} onPress={assign}><Text style={s.btnText}>Asignar</Text></Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i)=>String(i.id)}
        ListEmptyComponent={<Text style={s.empty}>No hay asignaciones.</Text>}
        renderItem={({item})=>(
          <View style={s.row}>
            <Text style={s.title}>
              #{item.id} · {item.resource_id ? `Recurso ${item.resource_id}` : `Fijo ${item.fixed_id}`} · qty {item.qty}
            </Text>
            <Text style={s.sub}>
              {item.status} · {item.due_at ? `vence ${new Date(item.due_at).toLocaleString()}` : 'sin vencimiento'}
            </Text>
            {item.status !== 'DEVUELTO' && (
              <Pressable style={[s.btn, { backgroundColor:'#22c55e', marginTop:8 }]} onPress={()=>markReturn(item)}>
                <Text style={s.btnText}>Marcar devolución</Text>
              </Pressable>
            )}
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 16 }}
      />
    </View>
  );
}

const COLORS = { bg:'#0b1220', card:'#111827', border:'#1f2937', text:'#e5e7eb', sub:'#94a3b8', primary:'#4f46e5' };

const s = StyleSheet.create({
  screen:{ flex:1, backgroundColor:COLORS.bg, padding:12 },
  card:{ backgroundColor:COLORS.card, padding:12, borderRadius:12, marginBottom:8, borderWidth:1, borderColor:COLORS.border },
  h2:{ color:COLORS.text, fontWeight:'800', marginBottom:6 },
  input:{ backgroundColor:COLORS.bg, borderWidth:1, borderColor:COLORS.border, borderRadius:10, padding:10, color:COLORS.text, marginVertical:4 },
  row:{ backgroundColor:COLORS.card, padding:12, borderRadius:12, marginVertical:6, borderWidth:1, borderColor:COLORS.border },
  title:{ color:COLORS.text, fontWeight:'800' },
  sub:{ color:COLORS.sub, marginTop:2 },
  btn:{ backgroundColor:COLORS.primary, paddingVertical:12, borderRadius:10, alignItems:'center', marginTop:6 },
  btnText:{ color:'#fff', fontWeight:'800' },
  empty:{ color:COLORS.sub, textAlign:'center', marginTop:16 },
});
