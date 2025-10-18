// apps/mobile/app/admin/settings.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, FlatList } from 'react-native';
import { AdminApi, AdminSetting } from '@/services/admin';

export default function AdminSettingsScreen() {
  const [items, setItems] = useState<AdminSetting[]>([]);
  const [loading, setLoading] = useState(false);

  // form upsert
  const [keyName, setKeyName] = useState('');
  const [type, setType] = useState<AdminSetting['type']>('text');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await AdminApi.settings.list();
      setItems(data);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || e.message || 'No se pudo cargar settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const upsert = async () => {
    if (!keyName) return Alert.alert('Completar', 'Ingresa la clave');
    let parsed: any = value;
    try {
      if (type === 'json') parsed = value ? JSON.parse(value) : {};
      if (type === 'number') parsed = Number(value);
      if (type === 'bool') parsed = String(value).toLowerCase() === 'true';
    } catch (e) {
      return Alert.alert('Valor inválido', 'No se pudo interpretar el valor según el tipo');
    }
    try {
      await AdminApi.settings.upsert({ key: keyName, type, value: parsed, description: description || undefined });
      setKeyName(''); setType('text'); setValue(''); setDescription('');
      Alert.alert('OK', 'Guardado');
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || e.message || 'No se pudo guardar');
    }
  };

  return (
    <View style={{ flex:1, padding:12 }}>
      <View style={s.card}>
        <Text style={s.h2}>Configuraciones</Text>
        <FlatList
          data={items}
          keyExtractor={(i)=>String(i.id)}
          refreshing={loading}
          onRefresh={load}
          renderItem={({ item }) => (
            <View style={s.row}>
              <Text style={s.title}>{item.key}</Text>
              <Text style={s.sub}>({item.type}) • {item.description || ''}</Text>
              <Text numberOfLines={3} style={{ marginTop:4 }}>{typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value)}</Text>
            </View>
          )}
          ListEmptyComponent={<Text>(sin configuraciones)</Text>}
        />
      </View>

      <View style={s.card}>
        <Text style={s.h2}>Crear / Actualizar</Text>
        <TextInput style={s.input} placeholder="key" value={keyName} onChangeText={setKeyName}/>
        <TextInput style={s.input} placeholder="type (text/json/number/bool)" value={type} onChangeText={(t)=>setType((t as any) || 'text')}/>
        <TextInput style={s.input} placeholder="value (texto o JSON)" value={value} onChangeText={setValue}/>
        <TextInput style={s.input} placeholder="description (opcional)" value={description} onChangeText={setDescription}/>
        <Button title="Guardar" onPress={upsert}/>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card:{ backgroundColor:'#fff', padding:12, borderRadius:8, marginBottom:10, elevation:2 },
  h2:{ fontWeight:'800', marginBottom:6 },
  input:{ borderWidth:1, borderColor:'#ccc', borderRadius:6, padding:8, marginVertical:4 },
  row:{ backgroundColor:'#fff', padding:12, borderRadius:8, marginVertical:6, borderWidth:1, borderColor:'#eee' },
  title:{ fontWeight:'700' },
  sub:{ color:'#555', marginTop:2 },
});
