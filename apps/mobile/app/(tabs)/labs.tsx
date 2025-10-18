import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Link, type Href } from 'expo-router';          // 👈 importa Href
import { DepartmentsApi, LabsApi } from '@/services/labs';
import type { Department, Lab } from '@/types/labs';

export default function LabsScreen() {
  const [labs, setLabs] = useState<Lab[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);

  const [departmentId, setDepartmentId] = useState<string>('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [ls, ds] = await Promise.all([LabsApi.list(), DepartmentsApi.list()]);
      setLabs(ls);
      setDepts(ds);
      if (!ds.length) {
        const d = await DepartmentsApi.create({ name: 'Escuela de Ing. en Computación', email_domain: 'itcr.ac.cr' });
        setDepts([d]);
      }
    } catch (e:any) {
      Alert.alert('Error', e.message ?? 'No se pudo cargar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createLab = async () => {
    if (!departmentId || !code || !name || !location) {
      return Alert.alert('Completar', 'Departamento, código, nombre y ubicación son obligatorios');
    }
    try {
      const lab = await LabsApi.create({
        department_id: Number(departmentId),
        code, name, location, description: description || undefined,
      });
      setLabs(prev => [lab, ...prev]);
      setCode(''); setName(''); setLocation(''); setDescription('');
      Alert.alert('OK', 'Laboratorio creado');
    } catch (e:any) {
      Alert.alert('Error', e.message ?? 'No se pudo crear');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Laboratorios</Text>

      <View style={styles.card}>
        <Text style={styles.h2}>Crear laboratorio</Text>
        <Text>Departamentos: {depts.map(d => `${d.id}:${d.name}`).join('  ')}</Text>
        <TextInput placeholder="department_id" keyboardType="numeric" value={departmentId} onChangeText={setDepartmentId} style={styles.input}/>
        <TextInput placeholder="Código (ej LAB-CI-101)" value={code} onChangeText={setCode} style={styles.input}/>
        <TextInput placeholder="Nombre" value={name} onChangeText={setName} style={styles.input}/>
        <TextInput placeholder="Ubicación" value={location} onChangeText={setLocation} style={styles.input}/>
        <TextInput placeholder="Descripción" value={description} onChangeText={setDescription} style={styles.input}/>
        <Button title="Crear" onPress={createLab}/>
      </View>

      <FlatList
        refreshing={loading}
        onRefresh={load}
        data={labs}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => {
          const href = `/lab/${item.id}/details` as Href;        // 👈 string + cast a Href
          return (
            <Link href={href} asChild>
              <TouchableOpacity style={styles.row}>
                <Text style={styles.title}>{item.name}</Text>
                <Text style={styles.sub}>{item.code} · {item.location}</Text>
                {item.department_name ? <Text style={styles.sub}>{item.department_name}</Text> : null}
              </TouchableOpacity>
            </Link>
          );
        }}
        ListEmptyComponent={<Text>No hay laboratorios</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container:{ flex:1, padding:16 },
  h1:{ fontSize:22, fontWeight:'700', marginBottom:12 },
  h2:{ fontSize:16, fontWeight:'600', marginBottom:8 },
  card:{ backgroundColor:'#fff', borderRadius:8, padding:12, marginBottom:12, elevation:2 },
  input:{ borderWidth:1, borderColor:'#ccc', borderRadius:6, padding:8, marginTop:6, marginBottom:6 },
  row:{ backgroundColor:'#fff', padding:12, borderRadius:8, marginBottom:8, elevation:1 },
  title:{ fontWeight:'700' },
  sub:{ color:'#555' },
});
