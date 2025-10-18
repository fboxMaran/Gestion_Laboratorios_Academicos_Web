import React, { useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { InventoryApi } from '@/services/inventory';

export default function MovementsScreen() {
  const [labId, setLabId] = useState('1');
  const [fixedId, setFixedId] = useState('');
  const [consumableId, setConsumableId] = useState('');
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const pickError = (e:any) =>
    e?.response?.data?.error || e?.response?.data?.message || e?.message || 'No se pudo cargar los datos';

  const load = async () => {
    try {
      setLoading(true);
      const data = await InventoryApi.listMovements({
        lab_id: labId ? Number(labId) : undefined,
        fixed_id: fixedId ? Number(fixedId) : undefined,
        consumable_id: consumableId ? Number(consumableId) : undefined,
        limit: 200
      });
      setRows(data);
    } catch (e:any) {
      Alert.alert('Atención', pickError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <FlatList
      data={rows}
      keyExtractor={(x)=>String(x.id)}
      ListHeaderComponent={
        <View style={{ padding:12 }}>
          <Text style={s.h1}>Movimientos de inventario</Text>
          <View style={s.row}>
            <TextInput style={s.input} placeholder="lab_id (opcional)" keyboardType="numeric" value={labId} onChangeText={setLabId}/>
            <TextInput style={s.input} placeholder="fixed_id (opcional)" keyboardType="numeric" value={fixedId} onChangeText={setFixedId}/>
            <TextInput style={s.input} placeholder="consumable_id (opcional)" keyboardType="numeric" value={consumableId} onChangeText={setConsumableId}/>
          </View>
          <View style={{ marginTop:8 }}>
            <Button title="Buscar" onPress={load} />
          </View>
          {loading && <ActivityIndicator style={{ marginTop:8 }} />}
        </View>
      }
      refreshing={loading}
      onRefresh={load}
      ListEmptyComponent={!loading ? <Text style={{ paddingHorizontal:12 }}>No hay movimientos que coincidan con los filtros.</Text> : null}
      renderItem={({item})=>(
        <View style={s.card}>
          <Text style={s.title}>#{item.id} · {item.type}{item.qty != null ? ` · ${item.qty}` : ''}</Text>
          <Text style={s.sub}>Lab {item.lab_id} · {new Date(item.created_at).toLocaleString()}</Text>
          {!!item.consumable_id && <Text style={s.rowTxt}>Consumible: {item.consumable_id}</Text>}
          {!!item.fixed_id && <Text style={s.rowTxt}>Equipo fijo: {item.fixed_id}</Text>}
          {!!item.reason && <Text style={s.rowTxt}>Motivo: {item.reason}</Text>}
          {!!item.notes && <Text style={s.rowTxt}>Notas: {item.notes}</Text>}
        </View>
      )}
      contentContainerStyle={{ padding:12 }}
    />
  );
}

const s = StyleSheet.create({
  h1:{ fontSize:20, fontWeight:'800' },
  row:{ flexDirection:'row', gap:8, marginTop:8 },
  input:{ borderWidth:1, borderColor:'#cbd5e1', borderRadius:8, padding:8, flex:1 },
  card:{ backgroundColor:'#fff', padding:12, borderRadius:10, marginBottom:10, elevation:2 },
  title:{ fontWeight:'800' },
  sub:{ color:'#64748b', marginTop:2 },
  rowTxt:{ color:'#111827', marginTop:2 },
});
