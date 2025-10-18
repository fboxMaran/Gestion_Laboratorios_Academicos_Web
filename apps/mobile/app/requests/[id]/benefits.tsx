import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Alert, StyleSheet, FlatList, Pressable } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ControlApi } from '@/services/control';
import type { Benefit } from '@/types/control';

export default function BenefitsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const requestId = Number(id);

  const [items, setItems] = useState<Benefit[]>([]);
  const [userId, setUserId] = useState('1');
  const [hours, setHours] = useState('0');
  const [credits, setCredits] = useState('0');
  const [certUrl, setCertUrl] = useState('');
  const [notes, setNotes] = useState('');

  const pickError = (e:any) =>
    e?.response?.data?.error || e?.response?.data?.message || e?.message || 'No se pudo completar la acción';

  const load = async () => {
    try { setItems(await ControlApi.listBenefits(requestId)); }
    catch (e:any) { Alert.alert('Atención', pickError(e)); }
  };
  useEffect(() => { load(); }, [requestId]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async () => {
    if (!userId) return Alert.alert('Completar','Debes indicar user_id.');
    try {
      const row = await ControlApi.addBenefit(requestId, {
        user_id: Number(userId),
        hours: Number(hours || 0),
        credits: Number(credits || 0),
        certificate_url: certUrl || undefined,
        notes: notes || undefined
      });
      setUserId('1'); setHours('0'); setCredits('0'); setCertUrl(''); setNotes('');
      Alert.alert('Listo', `Beneficio #${row.id} agregado.`);
      load();
    } catch (e:any) { Alert.alert('Atención', pickError(e)); }
  };

  return (
    <View style={s.screen}>
      <View style={s.card}>
        <Text style={s.h2}>Registrar beneficio</Text>
        <TextInput style={s.input} placeholder="ID de usuario (user_id)" placeholderTextColor="#94a3b8" keyboardType="numeric" value={userId} onChangeText={setUserId}/>
        <TextInput style={s.input} placeholder="Horas" placeholderTextColor="#94a3b8" keyboardType="numeric" value={hours} onChangeText={setHours}/>
        <TextInput style={s.input} placeholder="Créditos" placeholderTextColor="#94a3b8" keyboardType="numeric" value={credits} onChangeText={setCredits}/>
        <TextInput style={s.input} placeholder="URL de constancia/certificado (opcional)" placeholderTextColor="#94a3b8" value={certUrl} onChangeText={setCertUrl}/>
        <TextInput style={s.input} placeholder="Notas (opcional)" placeholderTextColor="#94a3b8" value={notes} onChangeText={setNotes}/>
        <Pressable style={s.btn} onPress={add}><Text style={s.btnText}>Agregar</Text></Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i)=>String(i.id)}
        ListEmptyComponent={<Text style={s.empty}>No hay beneficios.</Text>}
        renderItem={({item})=>(
          <View style={s.row}>
            <Text style={s.title}>#{item.id} · usuario {item.user_id}</Text>
            <Text style={s.sub}>Horas: {item.hours} · Créditos: {item.credits}</Text>
            {!!item.certificate_url && <Text style={s.link}>{item.certificate_url}</Text>}
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
  link:{ color:'#93c5fd', marginTop:4 },
  btn:{ backgroundColor:COLORS.primary, paddingVertical:12, borderRadius:10, alignItems:'center', marginTop:6 },
  btnText:{ color:'#fff', fontWeight:'800' },
  empty:{ color:COLORS.sub, textAlign:'center', marginTop:16 },
});
