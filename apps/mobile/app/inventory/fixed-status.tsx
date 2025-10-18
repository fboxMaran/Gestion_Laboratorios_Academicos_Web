import React, { useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, Pressable } from 'react-native';
import { InventoryApi } from '@/services/inventory';

export default function FixedStatusScreen() {
  const [labId, setLabId] = useState('1');
  const [fixedId, setFixedId] = useState('');
  const [status, setStatus] = useState<'DISPONIBLE'|'RESERVADO'|'MANTENIMIENTO'|'INACTIVO'>('DISPONIBLE');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const pickError = (e:any) =>
    e?.response?.data?.error || e?.response?.data?.message || e?.message || 'No se pudo completar la acción';

  const save = async () => {
    if (!fixedId) return Alert.alert('Completar', 'Debes indicar el fixed_id');
    try {
      await InventoryApi.updateFixedStatus(Number(fixedId), {
        lab_id: Number(labId), status, reason: reason || undefined, notes: notes || undefined
      });
      Alert.alert('OK', 'Estado actualizado');
      setReason(''); setNotes('');
    } catch (e:any) {
      Alert.alert('Atención', pickError(e));
    }
  };

  const StatChip = ({ v }:{ v:'DISPONIBLE'|'RESERVADO'|'MANTENIMIENTO'|'INACTIVO' }) => (
    <Pressable onPress={()=>setStatus(v)} style={[s.chip, status===v && s.chipActive]}>
      <Text style={[s.chipTxt, status===v && s.chipTxtActive]}>{v}</Text>
    </Pressable>
  );

  return (
    <View style={{ padding:12 }}>
      <Text style={s.h1}>Estado de equipo fijo</Text>
      <TextInput style={s.input} placeholder="ID del laboratorio (lab_id)" keyboardType="numeric" value={labId} onChangeText={setLabId}/>
      <TextInput style={s.input} placeholder="ID del equipo fijo (fixed_id)" keyboardType="numeric" value={fixedId} onChangeText={setFixedId}/>

      <Text style={s.label}>Nuevo estado</Text>
      <View style={s.row}>
        <StatChip v="DISPONIBLE" />
        <StatChip v="RESERVADO" />
        <StatChip v="MANTENIMIENTO" />
        <StatChip v="INACTIVO" />
      </View>

      <TextInput style={s.input} placeholder="Motivo (opcional)" value={reason} onChangeText={setReason}/>
      <TextInput style={s.input} placeholder="Notas (opcional)" value={notes} onChangeText={setNotes}/>
      <Button title="Guardar" onPress={save} />
    </View>
  );
}

const s = StyleSheet.create({
  h1:{ fontSize:20, fontWeight:'800', marginBottom:6 },
  label:{ marginTop:8, fontWeight:'700' },
  row:{ flexDirection:'row', gap:8, marginVertical:8, flexWrap:'wrap' },
  input:{ borderWidth:1, borderColor:'#cbd5e1', borderRadius:8, padding:8, marginVertical:6 },
  chip:{ paddingVertical:6, paddingHorizontal:10, borderRadius:999, backgroundColor:'#eef2ff' },
  chipActive:{ backgroundColor:'#2563eb' },
  chipTxt:{ color:'#334155', fontWeight:'700' },
  chipTxtActive:{ color:'#fff' },
});
