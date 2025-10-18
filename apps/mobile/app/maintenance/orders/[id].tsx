import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { MaintenanceApi } from '@/services/maintenance';

const pickError = (e:any) =>
  e?.response?.data?.error || e?.response?.data?.message || e?.message || 'No se pudo completar la acción';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = Number(id);
  const [row, setRow] = useState<any>(null);
  const [resStat, setResStat] = useState('');
  const [parts, setParts] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const r = await MaintenanceApi.getOrder(orderId);
      setRow(r);
    } catch (e:any) {
      Alert.alert('Atención', pickError(e));
    } finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{ load(); }, [id]);

  const start = async () => {
    try { await MaintenanceApi.start(orderId, {}); Alert.alert('OK','Orden iniciada'); load(); }
    catch(e:any){ Alert.alert('Atención', pickError(e)); }
  };
  const cancel = async () => {
    try { await MaintenanceApi.cancel(orderId, {}); Alert.alert('OK','Orden cancelada'); load(); }
    catch(e:any){ Alert.alert('Atención', pickError(e)); }
  };
  const complete = async () => {
    try{
      await MaintenanceApi.complete(orderId, {
        result_status: resStat as any,
        used_parts: parts || undefined,
        notes: notes || undefined
      });
      Alert.alert('OK','Orden completada');
      setResStat(''); setParts(''); setNotes(''); load();
    }catch(e:any){ Alert.alert('Atención', pickError(e)); }
  };

  if (loading) {
    return (
      <SafeAreaView style={[s.screen, s.center]}>
        <ActivityIndicator />
        <Text style={s.sub}>Cargando orden…</Text>
      </SafeAreaView>
    );
  }
  if (!row) {
    return (
      <SafeAreaView style={[s.screen, s.center]}>
        <Text style={s.sub}>No se encontró la orden.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={s.container}>
        <Text style={s.h1}>Orden #{row.id}</Text>
        <Text style={s.sub}>Lab {row.lab_id} · {row.type} · {row.status}</Text>
        {row.resource_id ? <Text style={s.p}>Recurso: #{row.resource_id}</Text> : row.fixed_id ? <Text style={s.p}>Equipo fijo: #{row.fixed_id}</Text> : null}
        {!!row.scheduled_at && <Text style={s.p}>Programado: {new Date(row.scheduled_at).toLocaleString()}</Text>}
        {!!row.technician_name && <Text style={s.p}>Técnico: {row.technician_name}</Text>}
        {!!row.description && <Text style={s.p}>{row.description}</Text>}

        <View style={[s.row, { marginTop: 10 }]}>
          <View style={{ flex:1, marginRight:6 }}>
            <Button title="Iniciar" onPress={start} />
          </View>
          <View style={{ flex:1, marginLeft:6 }}>
            <Button title="Cancelar" color="#ef4444" onPress={cancel} />
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.h2}>Completar orden</Text>
          <TextInput
            style={s.input}
            placeholder="Resultado (DISPONIBLE / INACTIVO / MANTENIMIENTO / RESERVADO)"
            placeholderTextColor="#94a3b8"
            value={resStat}
            onChangeText={setResStat}
          />
          <TextInput
            style={s.input}
            placeholder="Repuestos usados (opcional)"
            placeholderTextColor="#94a3b8"
            value={parts}
            onChangeText={setParts}
          />
          <TextInput
            style={s.input}
            placeholder="Notas (opcional)"
            placeholderTextColor="#94a3b8"
            value={notes}
            onChangeText={setNotes}
          />
          <Button title="Completar" onPress={complete} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const COLORS = { bg:'#0b1220', card:'#111827', border:'#1f2937', text:'#e5e7eb', sub:'#94a3b8' };
const s = StyleSheet.create({
  screen:{ flex:1, backgroundColor:COLORS.bg },
  center:{ alignItems:'center', justifyContent:'center' },
  container:{ padding:12, gap:10 },
  h1:{ color:COLORS.text, fontSize:20, fontWeight:'800' },
  h2:{ color:COLORS.text, fontWeight:'800', marginBottom:6 },
  sub:{ color:COLORS.sub },
  p:{ color:COLORS.text, marginTop:4 },
  row:{ flexDirection:'row', alignItems:'center' },
  card:{ backgroundColor:COLORS.card, borderWidth:1, borderColor:COLORS.border, borderRadius:12, padding:12, marginTop:12, gap:8 },
  input:{ backgroundColor:COLORS.bg, borderWidth:1, borderColor:COLORS.border, borderRadius:10, padding:10, color:COLORS.text },
});
