// apps/mobile/app/admin/users.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import type { UserRole } from '@/services/admin';
import { AdminApi } from '@/services/admin';

const ROLES: UserRole[] = ['ADMIN', 'TECNICO', 'DOCENTE', 'ESTUDIANTE'];

export default function AdminUsersScreen() {
  // filtros
  const [q, setQ] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [active, setActive] = useState<'all' | 'true' | 'false'>('all');

  // lista
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // crear
  const [cRole, setCRole] = useState<UserRole>('ESTUDIANTE');
  const [cName, setCName] = useState('');
  const [cEmail, setCEmail] = useState('');
  const [cPass, setCPass] = useState('');
  const [cProgram, setCProgram] = useState('');
  const [cStudent, setCStudent] = useState('');
  const [cTeacher, setCTeacher] = useState('');
  const [cPhone, setCPhone] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await AdminApi.users.list({
        q: q || undefined,
        role: role || undefined,
        is_active: active === 'all' ? undefined : active === 'true',
      });
      setItems(data);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || e.message || 'No se pudo cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const createUser = async () => {
    if (!cName || !cEmail || !cPass) return Alert.alert('Completar', 'Nombre, correo y contraseña');
    try {
      await AdminApi.users.create({
        role: cRole, email: cEmail.trim(), password: cPass,
        full_name: cName,
        student_id: cRole === 'ESTUDIANTE' ? (cStudent || undefined) : undefined,
        teacher_code: cRole === 'DOCENTE' ? (cTeacher || undefined) : undefined,
        program_department: cProgram || undefined,
        phone: cPhone || undefined,
      });
      setCName(''); setCEmail(''); setCPass('');
      setCProgram(''); setCStudent(''); setCTeacher(''); setCPhone('');
      Alert.alert('OK', 'Usuario creado');
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || e.message || 'No se pudo crear usuario');
    }
  };

  const toggleActive = async (u: any) => {
    try {
      if (u.is_active) await AdminApi.users.deactivate(u.id);
      else await AdminApi.users.activate(u.id);
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || e.message || 'No se pudo cambiar estado');
    }
  };

  const setRoleFor = async (u: any, newRole: UserRole) => {
    try {
      await AdminApi.users.setRole(u.id, newRole);
      load();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || e.message || 'No se pudo cambiar rol');
    }
  };

  const filtered = useMemo(() => items, [items]);

  return (
    <FlatList
      ListHeaderComponent={
        <View style={{ padding: 12 }}>
          {/* Filtros */}
          <View style={s.card}>
            <Text style={s.h2}>Filtros</Text>
            <TextInput style={s.input} placeholder="Buscar (nombre/correo)" value={q} onChangeText={setQ}/>
            <TextInput style={s.input} placeholder="Rol (ADMIN/TECNICO/DOCENTE/ESTUDIANTE)" value={role} onChangeText={(t)=>setRole(t.toUpperCase() as UserRole || '' )}/>
            <TextInput style={s.input} placeholder="Activo (all/true/false)" value={active} onChangeText={(t)=>setActive((t as any) || 'all')}/>
            <Button title="Aplicar" onPress={load}/>
          </View>

          {/* Crear usuario */}
          <View style={s.card}>
            <Text style={s.h2}>Crear usuario</Text>
            <TextInput style={s.input} placeholder="Rol" value={cRole} onChangeText={(t)=>setCRole((t.toUpperCase() as UserRole) || 'ESTUDIANTE')}/>
            <TextInput style={s.input} placeholder="Nombre completo" value={cName} onChangeText={setCName}/>
            <TextInput style={s.input} placeholder="Correo institucional" autoCapitalize="none" keyboardType="email-address" value={cEmail} onChangeText={setCEmail}/>
            <TextInput style={s.input} placeholder="Contraseña" secureTextEntry value={cPass} onChangeText={setCPass}/>
            <TextInput style={s.input} placeholder="Carrera/Departamento" value={cProgram} onChangeText={setCProgram}/>
            {cRole === 'ESTUDIANTE' ? (
              <TextInput style={s.input} placeholder="Carné (opcional)" value={cStudent} onChangeText={setCStudent}/>
            ) : cRole === 'DOCENTE' ? (
              <TextInput style={s.input} placeholder="Código docente (opcional)" value={cTeacher} onChangeText={setCTeacher}/>
            ) : null}
            <TextInput style={s.input} placeholder="Teléfono" value={cPhone} onChangeText={setCPhone}/>
            <Button title="Crear" onPress={createUser}/>
          </View>
        </View>
      }
      data={filtered}
      keyExtractor={(u) => String(u.id)}
      refreshing={loading}
      onRefresh={load}
      renderItem={({ item: u }) => (
        <View style={s.row}>
          <Text style={s.title}>{u.full_name}</Text>
          <Text style={s.sub}>{u.email} · {u.role} · {u.is_active ? 'ACTIVO' : 'INACTIVO'}</Text>
          <View style={{ height: 6 }} />
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <TouchableOpacity onPress={() => toggleActive(u)} style={s.btnAction}>
              <Text style={s.btnText}>{u.is_active ? 'Desactivar' : 'Activar'}</Text>
            </TouchableOpacity>
            {ROLES.map(r => (
              <TouchableOpacity key={r} onPress={() => setRoleFor(u, r)} style={[s.btnAction, { backgroundColor: u.role === r ? '#2563eb' : '#9ca3af' }]}>
                <Text style={s.btnText}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
      contentContainerStyle={{ padding: 12 }}
    />
  );
}

const s = StyleSheet.create({
  card:{ backgroundColor:'#fff', padding:12, borderRadius:8, marginBottom:10, elevation:2 },
  h2:{ fontWeight:'800', marginBottom:6 },
  input:{ borderWidth:1, borderColor:'#ccc', borderRadius:6, padding:8, marginVertical:4 },
  row:{ backgroundColor:'#fff', padding:12, borderRadius:8, marginBottom:10, elevation:1 },
  title:{ fontWeight:'700' },
  sub:{ color:'#555', marginTop:2 },
  btnAction:{ backgroundColor:'#374151', paddingVertical:8, paddingHorizontal:12, borderRadius:8 },
  btnText:{ color:'#fff', fontWeight:'700' },
});
