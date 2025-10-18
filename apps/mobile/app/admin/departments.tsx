import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, Alert } from 'react-native';
import { DepartmentsApi } from '@/services/labs';
import type { Department } from '@/types/labs';

export default function DepartmentsAdmin() {
  const [items, setItems] = useState<Department[]>([]);
  const [name, setName] = useState('');
  const [emailDomain, setEmailDomain] = useState('itcr.ac.cr');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const ds = await DepartmentsApi.list();
      setItems(ds);
    } catch (e:any) {
      Alert.alert('Error', e.message ?? 'No se pudo cargar departamentos');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!name || !emailDomain) return Alert.alert('Completar', 'Nombre y dominio requeridos');
    try {
      const d = await DepartmentsApi.create({ name, email_domain: emailDomain });
      setItems(prev => [d, ...prev]);
      setName('');
      Alert.alert('OK', 'Departamento creado');
    } catch (e:any) {
      Alert.alert('Error', e.message ?? 'No se pudo crear');
    }
  };

  return (
    <View style={{ flex:1, padding:12 }}>
      <Text style={s.h1}>Departamentos</Text>

      <View style={s.card}>
        <Text style={s.h2}>Crear</Text>
        <TextInput style={s.input} placeholder="Nombre" value={name} onChangeText={setName} />
        <TextInput style={s.input} placeholder="Dominio institucional (itcr.ac.cr / tec.ac.cr)" value={emailDomain} onChangeText={setEmailDomain} />
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
            <Text style={s.sub}>{item.email_domain}</Text>
          </View>
        )}
        ListEmptyComponent={<Text>No hay departamentos</Text>}
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
