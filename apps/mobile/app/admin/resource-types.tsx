import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, Alert } from 'react-native';
import { ResourceTypesApi } from '@/services/availability';
import type { ResourceType } from '@/types/availability';

type Category = 'EQUIPO'|'MATERIAL'|'SOFTWARE'|'OTRO';

export default function ResourceTypesAdmin() {
  const [items, setItems] = useState<ResourceType[]>([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<Category>('EQUIPO');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const ts = await ResourceTypesApi.list();
      setItems(ts);
    } catch (e:any) {
      Alert.alert('Error', e.message ?? 'No se pudo cargar tipos');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name) return Alert.alert('Completar', 'Nombre requerido');
    try {
      const t = await ResourceTypesApi.create({ name, category });
      setItems(prev => [t, ...prev]);
      setName('');
      Alert.alert('OK', 'Tipo creado');
    } catch (e:any) {
      Alert.alert('Error', e.message ?? 'No se pudo crear tipo');
    }
  };

  return (
    <View style={{ flex:1, padding:12 }}>
      <Text style={s.h1}>Tipos de Recurso</Text>

      <View style={s.card}>
        <Text style={s.h2}>Crear</Text>
        <TextInput style={s.input} placeholder="Nombre (p.ej. Microscopio)" value={name} onChangeText={setName} />
        <TextInput
          style={s.input}
          placeholder="Categoría (EQUIPO/MATERIAL/SOFTWARE/OTRO)"
          value={category}
          onChangeText={(t)=>setCategory((t.toUpperCase() as Category) || 'EQUIPO')}
        />
        <Button title="Crear" onPress={create} />
      </View>

      <FlatList
        refreshing={loading}
        onRefresh={load}
        data={items}
        keyExtractor={(i)=>String(i.id)}
        renderItem={({item})=>(
          <View style={s.row}>
            <Text style={s.title}>{item.name}</Text>
            <Text style={s.sub}>{item.category ?? '—'}</Text>
          </View>
        )}
        ListEmptyComponent={<Text>No hay tipos</Text>}
      />
    </View>
  );
}

const s = StyleSheet.create({
  h1:{ fontSize:20, fontWeight:'700', marginBottom:8 },
  h2:{ fontWeight:'700', marginBottom:6 },
  card:{ backgroundColor:'#fff', borderRadius:10, padding:12, marginBottom:10, elevation:2 },
  input:{ borderWidth:1, borderColor:'#d4d4d8', borderRadius:8, padding:10, marginVertical:4 },
  row:{ backgroundColor:'#fff', borderRadius:8, padding:12, marginVertical:6, elevation:1 },
  title:{ fontWeight:'700' },
  sub:{ color:'#555' }
});
