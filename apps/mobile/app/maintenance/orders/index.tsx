import React, { useState } from 'react';
import { View, Text, TextInput, Button, FlatList, Alert, StyleSheet } from 'react-native';
import { MaintenanceApi } from '@/services/maintenance';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const pickError = (e:any) =>
  e?.response?.data?.error || e?.response?.data?.message || e?.message || 'No se pudo cargar la lista';

export default function OrdersListScreen() {
  const router = useRouter();
  const [labId, setLabId] = useState('1');
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [completeForm, setCompleteForm] = useState<Record<number,{ result_status?: string; used_parts?: string; notes?: string }>>({});

  const load = async () => {
    try {
      const data = await MaintenanceApi.listOrders({
        lab_id: labId ? Number(labId) : undefined,
        status: status || undefined
      });
      setRows(data);
    } catch (e:any) {
      Alert.alert('Atención', pickError(e));
    }
  };

  const start = async (id:number) => {
    try { await MaintenanceApi.start(id, {}); Alert.alert('OK','Orden iniciada'); load(); }
    catch (e:any){ Alert.alert('Atención', pickError(e)); }
  };
  const cancel = async (id:number) => {
    try { await MaintenanceApi.cancel(id, {}); Alert.alert('OK','Orden cancelada'); load(); }
    catch (e:any){ Alert.alert('Atención', pickError(e)); }
  };
  const complete = async (id:number) => {
    const f = completeForm[id] || {};
    try {
      await MaintenanceApi.complete(id, {
        result_status: f.result_status as any,
        used_parts: f.used_parts,
        notes: f.notes
      });
      Alert.alert('OK','Orden completada');
      setCompleteForm(prev => ({ ...prev, [id]: {} }));
      load();
    } catch (e:any){ Alert.alert('Atención', pickError(e)); }
  };

  const edit = (id:number, k:keyof (typeof completeForm)[number], v:string) =>
    setCompleteForm(prev => ({ ...prev, [id]: { ...(prev[id]||{}), [k]: v } }));

  return (
    <SafeAreaView style={s.screen}>
      <FlatList
        data={rows}
        keyExtractor={(x)=>String(x.id)}
        ListHeaderComponent={
          <View style={{ padding:12 }}>
            <Text style={s.h1}>Órdenes de mantenimiento</Text>
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
                placeholder="Estado (PENDIENTE / EN_PROCESO / ...)"
                placeholderTextColor="#94a3b8"
                value={status}
                onChangeText={setStatus}
              />
            </View>
            <View style={{ marginTop:8 }}>
              <Button title="Buscar" onPress={load} />
            </View>
          </View>
        }
        renderItem={({item})=>(
          <View style={s.card}>
            <Text style={s.h2}>#{item.id} · {item.type} · {item.status}</Text>
            <Text style={s.sub}>Lab {item.lab_id} · {new Date(item.created_at).toLocaleString()}</Text>
            {item.resource_id ? <Text style={s.p}>Recurso: #{item.resource_id}</Text> : item.fixed_id ? <Text style={s.p}>Equipo fijo: #{item.fixed_id}</Text> : null}
            {!!item.scheduled_at && <Text style={s.p}>Programado: {new Date(item.scheduled_at).toLocaleString()}</Text>}
            {!!item.technician_name && <Text style={s.p}>Técnico: {item.technician_name}</Text>}
            {!!item.description && <Text style={s.p}>{item.description}</Text>}

            <View style={s.row}>
              <View style={{ flex:1, marginRight:6 }}>
                <Button title="Detalle" onPress={()=>router.push({ pathname:'/maintenance/orders/[id]', params:{ id:String(item.id)} } as any)} />
              </View>
              <View style={{ flex:1, marginRight:6 }}>
                <Button title="Iniciar" onPress={()=>start(item.id)} />
              </View>
              <View style={{ flex:1, marginLeft:6 }}>
                <Button title="Cancelar" color="#ef4444" onPress={()=>cancel(item.id)} />
              </View>
            </View>

            <View style={s.cardInner}>
              <Text style={s.h3}>Completar</Text>
              <TextInput
                style={s.input}
                placeholder="Resultado (DISPONIBLE / INACTIVO / MANTENIMIENTO / RESERVADO)"
                placeholderTextColor="#94a3b8"
                value={completeForm[item.id]?.result_status || ''}
                onChangeText={(v)=>edit(item.id,'result_status',v)}
              />
              <TextInput
                style={s.input}
                placeholder="Repuestos usados (opcional)"
                placeholderTextColor="#94a3b8"
                value={completeForm[item.id]?.used_parts || ''}
                onChangeText={(v)=>edit(item.id,'used_parts',v)}
              />
              <TextInput
                style={s.input}
                placeholder="Notas (opcional)"
                placeholderTextColor="#94a3b8"
                value={completeForm[item.id]?.notes || ''}
                onChangeText={(v)=>edit(item.id,'notes',v)}
              />
              <Button title="Completar" onPress={()=>complete(item.id)} />
            </View>
          </View>
        )}
        contentContainerStyle={{ padding:12 }}
      />
    </SafeAreaView>
  );
}

const COLORS = { bg:'#0b1220', card:'#111827', border:'#1f2937', text:'#e5e7eb', sub:'#94a3b8' };
const s = StyleSheet.create({
  screen:{ flex:1, backgroundColor:COLORS.bg },
  h1:{ color:COLORS.text, fontSize:20, fontWeight:'800' },
  h2:{ color:COLORS.text, fontWeight:'800' },
  h3:{ color:COLORS.text, fontWeight:'800', marginBottom:6 },
  sub:{ color:COLORS.sub, marginTop:2 },
  p:{ color:COLORS.text, marginTop:2 },
  row:{ flexDirection:'row', gap:8, alignItems:'center', marginTop:8 },
  input:{ backgroundColor:COLORS.card, borderWidth:1, borderColor:COLORS.border, borderRadius:10, padding:10, color:COLORS.text, flex:1 },
  card:{ backgroundColor:COLORS.card, borderRadius:12, padding:12, marginBottom:10, borderWidth:1, borderColor:COLORS.border },
  cardInner:{ marginTop:10, gap:8, backgroundColor:'#0f172a', borderRadius:10, padding:10, borderWidth:1, borderColor:COLORS.border },
});
