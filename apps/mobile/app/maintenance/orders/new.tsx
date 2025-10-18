import React, { useState } from 'react';
import { View, Text, TextInput, Button, Switch, Alert, StyleSheet, ScrollView } from 'react-native';
import { MaintenanceApi } from '@/services/maintenance';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const pickError = (e:any) =>
  e?.response?.data?.error || e?.response?.data?.message || e?.message || 'No se pudo crear la orden';

export default function NewOrderScreen() {
  const router = useRouter();
  const [labId, setLabId] = useState('1');
  const [resourceId, setResourceId] = useState('');
  const [fixedId, setFixedId] = useState('');
  const [type, setType] = useState<'PREVENTIVO'|'CORRECTIVO'>('PREVENTIVO');
  const [scheduledAt, setScheduledAt] = useState('');
  const [techName, setTechName] = useState('');
  const [desc, setDesc] = useState('');
  const [notify, setNotify] = useState(true);

  const save = async () => {
    if (!labId || (!resourceId && !fixedId)) {
      Alert.alert('Completar', 'Debes indicar lab_id y (resource_id o fixed_id).');
      return;
    }
    try {
      const row = await MaintenanceApi.createOrder({
        lab_id: Number(labId),
        resource_id: resourceId ? Number(resourceId) : undefined,
        fixed_id: fixedId ? Number(fixedId) : undefined,
        type,
        scheduled_at: scheduledAt || undefined,
        technician_name: techName || undefined,
        description: desc || undefined,
        notify_on_disponible: notify
      });
      Alert.alert('OK', `Orden #${row.id} creada`);
      router.replace({ pathname:'/maintenance/orders/[id]', params:{ id:String(row.id) } } as any);
    } catch (e:any) {
      Alert.alert('Atención', pickError(e));
    }
  };

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={{ padding:12 }}>
        <Text style={s.h1}>Nueva Orden de Mantenimiento</Text>

        <View style={s.card}>
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
            placeholder="ID de recurso (resource_id) — opcional"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            value={resourceId}
            onChangeText={setResourceId}
          />
          <TextInput
            style={s.input}
            placeholder="ID equipo fijo (fixed_id) — opcional"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            value={fixedId}
            onChangeText={setFixedId}
          />
          <TextInput
            style={s.input}
            placeholder="Tipo (PREVENTIVO / CORRECTIVO)"
            placeholderTextColor="#94a3b8"
            value={type}
            onChangeText={(v)=>setType(v as any)}
          />
          <TextInput
            style={s.input}
            placeholder="Programado para (YYYY-MM-DDTHH:mm) — opcional"
            placeholderTextColor="#94a3b8"
            value={scheduledAt}
            onChangeText={setScheduledAt}
          />
          <TextInput
            style={s.input}
            placeholder="Nombre del técnico — opcional"
            placeholderTextColor="#94a3b8"
            value={techName}
            onChangeText={setTechName}
          />
          <TextInput
            style={s.input}
            placeholder="Descripción — opcional"
            placeholderTextColor="#94a3b8"
            value={desc}
            onChangeText={setDesc}
          />

          <View style={s.switchRow}>
            <Text style={s.sub}>Notificar si vuelve “DISPONIBLE”</Text>
            <Switch value={notify} onValueChange={setNotify} />
          </View>

          <Button title="Crear" onPress={save} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const COLORS = { bg:'#0b1220', card:'#111827', border:'#1f2937', text:'#e5e7eb', sub:'#94a3b8' };
const s = StyleSheet.create({
  screen:{ flex:1, backgroundColor:COLORS.bg },
  h1:{ color:COLORS.text, fontSize:20, fontWeight:'800', marginBottom:8 },
  card:{ backgroundColor:COLORS.card, borderRadius:12, padding:12, borderWidth:1, borderColor:COLORS.border },
  input:{ backgroundColor:COLORS.bg, borderWidth:1, borderColor:COLORS.border, borderRadius:10, padding:10, color:COLORS.text, marginVertical:6 },
  sub:{ color:COLORS.sub },
  switchRow:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginVertical:8 },
});
