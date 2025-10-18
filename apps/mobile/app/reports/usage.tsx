import React, { useState } from 'react';
import { View, Text, TextInput, Alert, StyleSheet, FlatList, Pressable } from 'react-native';
import { ControlApi } from '@/services/control';

type Row = { kind: 'resources'|'consumables', item_name: string, total_qty: number };
type Report = { assignments: Row[]; consumptions: Row[] };

export default function UsageReport() {
  const [labId, setLabId] = useState('');
  const [from, setFrom] = useState('2025-10-01T00:00:00Z');
  const [to, setTo] = useState('2025-10-31T23:59:59Z');
  const [data, setData] = useState<Report | null>(null);

  const pickError = (e:any) =>
    e?.response?.data?.error || e?.response?.data?.message || e?.message || 'No se pudo generar el reporte';

  const run = async () => {
    if (!labId || !from || !to) return Alert.alert('Completar','Debes indicar lab_id, from y to.');
    try { setData(await ControlApi.reportUsage(Number(labId), from, to)); }
    catch (e:any) { Alert.alert('Atención', pickError(e)); }
  };

  return (
    <View style={s.screen}>
      <View style={s.card}>
        <Text style={s.h2}>Parámetros</Text>
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
          placeholder="Desde (ISO: YYYY-MM-DDTHH:mm:ssZ)"
          placeholderTextColor="#94a3b8"
          value={from}
          onChangeText={setFrom}
        />
        <TextInput
          style={s.input}
          placeholder="Hasta (ISO: YYYY-MM-DDTHH:mm:ssZ)"
          placeholderTextColor="#94a3b8"
          value={to}
          onChangeText={setTo}
        />
        <Pressable style={s.btn} onPress={run}>
          <Text style={s.btnTxt}>Generar</Text>
        </Pressable>
      </View>

      {data && (
        <View style={{gap:12}}>
          <View style={s.card}>
            <Text style={s.h2}>Equipos asignados</Text>
            <FlatList
              data={data.assignments}
              keyExtractor={(r, i)=>`a-${i}`}
              ListEmptyComponent={<Text style={s.empty}>(sin datos)</Text>}
              renderItem={({item})=>(
                <View style={s.row}>
                  <Text style={s.title}>{item.item_name}</Text>
                  <Text style={s.sub}>Total: {item.total_qty}</Text>
                </View>
              )}
            />
          </View>
          <View style={s.card}>
            <Text style={s.h2}>Consumos de materiales</Text>
            <FlatList
              data={data.consumptions}
              keyExtractor={(r, i)=>`c-${i}`}
              ListEmptyComponent={<Text style={s.empty}>(sin datos)</Text>}
              renderItem={({item})=>(
                <View style={s.row}>
                  <Text style={s.title}>{item.item_name}</Text>
                  <Text style={s.sub}>Total: {item.total_qty}</Text>
                </View>
              )}
            />
          </View>
        </View>
      )}
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
  btnTxt:{ color:'#fff', fontWeight:'800' },
  empty:{ color:COLORS.sub, textAlign:'center', marginTop:4 },
});
