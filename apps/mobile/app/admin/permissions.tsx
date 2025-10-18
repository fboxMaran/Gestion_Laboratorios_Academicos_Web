// apps/mobile/app/admin/permissions.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, Alert, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { AdminApi, UserRole } from '@/services/admin';

const ROLES: UserRole[] = ['ADMIN', 'TECNICO', 'DOCENTE', 'ESTUDIANTE'];

export default function RolePermissionsScreen() {
  const [role, setRole] = useState<UserRole>('TECNICO');
  const [perms, setPerms] = useState<string[]>([]);
  const [newPerm, setNewPerm] = useState('');

  const load = async () => {
    try {
      const data = await AdminApi.roles.getPermissions(role);
      setPerms(data.permissions || []);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || e.message || 'No se pudo cargar permisos');
    }
  };

  useEffect(() => { load(); }, [role]); // eslint-disable-line

  const addPerm = async () => {
    if (!newPerm.trim()) return;
    try {
      const updated = Array.from(new Set([...(perms || []), newPerm.trim()]));
      await AdminApi.roles.setPermissions(role, updated);
      setNewPerm('');
      setPerms(updated);
      Alert.alert('OK', 'Permiso agregado');
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || e.message || 'No se pudo guardar');
    }
  };

  const removePerm = async (p: string) => {
    try {
      const updated = (perms || []).filter(x => x !== p);
      await AdminApi.roles.setPermissions(role, updated);
      setPerms(updated);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || e.message || 'No se pudo eliminar');
    }
  };

  return (
    <View style={{ flex:1, padding:12 }}>
      <View style={s.card}>
        <Text style={s.h2}>Rol</Text>
        <TextInput style={s.input} placeholder="ADMIN/TECNICO/DOCENTE/ESTUDIANTE" value={role} onChangeText={(t)=>setRole((t.toUpperCase() as UserRole) || 'TECNICO')}/>
      </View>

      <View style={s.card}>
        <Text style={s.h2}>Permisos ({perms.length})</Text>
        <FlatList
          data={perms}
          keyExtractor={(p)=>p}
          renderItem={({ item }) => (
            <View style={s.row}>
              <Text style={{ flex:1 }}>{item}</Text>
              <TouchableOpacity onPress={() => removePerm(item)} style={s.btnDanger}>
                <Text style={s.btnText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<Text style={{ color:'#555' }}>(sin permisos)</Text>}
        />
      </View>

      <View style={s.card}>
        <Text style={s.h2}>Agregar permiso</Text>
        <TextInput style={s.input} placeholder="ej. requests:approve" value={newPerm} onChangeText={setNewPerm}/>
        <Button title="Agregar" onPress={addPerm}/>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card:{ backgroundColor:'#fff', padding:12, borderRadius:8, marginBottom:10, elevation:2 },
  h2:{ fontWeight:'800', marginBottom:6 },
  input:{ borderWidth:1, borderColor:'#ccc', borderRadius:6, padding:8, marginVertical:4 },
  row:{ flexDirection:'row', gap:8, alignItems:'center', backgroundColor:'#fff', padding:8, borderRadius:8, marginVertical:4, borderWidth:1, borderColor:'#eee' },
  btnDanger:{ backgroundColor:'#dc2626', paddingVertical:8, paddingHorizontal:12, borderRadius:8 },
  btnText:{ color:'#fff', fontWeight:'700' },
});
