import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Link, type Href } from 'expo-router';
import { RequestsApi } from '@/services/requests';
import type { RequestRow } from '@/types/requests';


export default function RequestsList() {
  const [items, setItems] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [labId, setLabId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');
  const [reqOk, setReqOk] = useState<'true'|'false'|''>('');

  const load = async () => {
    setLoading(true);
    try {
      const rows = await RequestsApi.list({
        lab_id: labId ? Number(labId) : undefined,
        from: from || undefined,
        to: to || undefined,
        status: status || undefined,
        requirements_ok: reqOk ? reqOk === 'true' : undefined
      });
      setItems(rows);
    } catch (e:any) {
      Alert.alert('Error', e.message ?? 'No se pudo cargar');
    } finally {
      setLoading(false);
    }
  };

  //eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);

  return (
    <View style={{ flex:1, padding:12 }}>
      <View style={s.card}>
        <Text style={s.h2}>Filtros</Text>
        <TextInput style={s.input} placeholder="lab_id (opcional)" keyboardType="numeric" value={labId} onChangeText={setLabId}/>
        <TextInput style={s.input} placeholder="Desde ISO (opcional)" value={from} onChangeText={setFrom}/>
        <TextInput style={s.input} placeholder="Hasta ISO (opcional)" value={to} onChangeText={setTo}/>
        <TextInput style={s.input} placeholder="Estado (PENDIENTE/APROBADA/...)" value={status} onChangeText={setStatus}/>
        <TextInput style={s.input} placeholder="requirements_ok (true/false)" value={reqOk} onChangeText={(t)=>setReqOk(t as any)}/>
        <Button title="Aplicar" onPress={load}/>
      </View>

      <FlatList
        refreshing={loading}
        onRefresh={load}
        data={items}
        keyExtractor={(i)=>String(i.id)}
        ListEmptyComponent={<Text>No hay solicitudes</Text>}
        renderItem={({item})=>{
          const href = `/requests/${item.id}` as Href;
          return (
            <Link href={href} asChild>
              <TouchableOpacity style={s.row}>
                <Text style={s.title}>#{item.id} · {item.requester_name} · {item.purpose}</Text>
                <Text style={s.sub}>{new Date(item.requested_from).toLocaleString()} — {new Date(item.requested_to).toLocaleString()}</Text>
                <Text style={s.badge}>{item.status}{item.requirements_ok ? '' : ' · (requiere validación)'}</Text>
              </TouchableOpacity>
            </Link>
          );
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  card:{ backgroundColor:'#fff', padding:12, borderRadius:8, marginBottom:8, elevation:2 },
  h2:{ fontWeight:'700', marginBottom:6 },
  input:{ borderWidth:1, borderColor:'#ccc', borderRadius:6, padding:8, marginVertical:4 },
  row:{ backgroundColor:'#fff', padding:12, borderRadius:8, marginVertical:6, elevation:1 },
  title:{ fontWeight:'700' },
  sub:{ color:'#555', marginTop:2 },
  badge:{ marginTop:4, fontSize:12, color:'#111' }
});
