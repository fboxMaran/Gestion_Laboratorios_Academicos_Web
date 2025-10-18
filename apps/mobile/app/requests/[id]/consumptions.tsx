
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Alert, StyleSheet, FlatList, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ControlApi } from '@/services/control';
import type { Consumption } from '@/types/control';

export default function ConsumptionsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const requestId = Number(id);

  const [items, setItems] = useState<Consumption[]>([]);
  const [consumableId, setConsumableId] = useState('');
  const [qty, setQty] = useState('1');
  const [notes, setNotes] = useState('');

  const pickError = (e:any) =>
    e?.response?.data?.error || e?.response?.data?.message || e?.message || 'No se pudo completar la acción';

  const load = async () => {
    try { setItems(await ControlApi.listConsumptions(requestId)); }
    catch (e:any) { Alert.alert('Atención', pickError(e)); }
  };
  useEffect(() => { load(); }, [requestId]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async () => {
    if (!consumableId || !qty) return Alert.alert('Completar', 'Debes indicar consumable_id y qty.');
    try {
      const row = await ControlApi.createConsumption(requestId, {
        consumable_id: Number(consumableId), qty: Number(qty), notes: notes || undefined
      });
      setConsumableId(''); setQty('1'); setNotes('');
      Alert.alert('Listo', `Consumo #${row.id} registrado.`);
      load();
    } catch (e:any) { Alert.alert('Atención', pickError(e)); }
  };

  return (
    <View style={s.screen}>
      <View style={s.card}>
        <Text style={s.h2}>Registrar consumo</Text>
        <TextInput
          style={s.input} placeholder="ID de consumible (consumable_id)" placeholderTextColor="#94a3b8"
          keyboardType="numeric" value={consumableId} onChangeText={setConsumableId}
        />
        <TextInput
          style={s.input} placeholder="Cantidad (qty)" placeholderTextColor="#94a3b8"
          keyboardType="numeric" value={qty} onChangeText={setQty}
        />
        <TextInput
          style={s.input} placeholder="Notas (opcional)" placeholderTextColor="#94a3b8"
          value={notes} onChangeText={setNotes}
        />
        <Pressable style={s.btn} onPress={add}><Text style={s.btnText}>Registrar</Text></Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i)=>String(i.id)}
        ListEmptyComponent={<Text style={s.empty}>No hay consumos.</Text>}
        renderItem={({item})=>(
          <View style={s.row}>
            <Text style={s.title}>#{item.id} · Consumible {item.consumable_id} · qty {item.qty}</Text>
            <Text style={s.sub}>{new Date(item.used_at).toLocaleString()}</Text>
            {!!item.notes && <Text style={s.sub}>{item.notes}</Text>}
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
