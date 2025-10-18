import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Alert, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UsersApi } from '@/services/users';

export default function MeScreen() {
  const [me, setMe] = useState<any>(null);
  const [full, setFull] = useState('');
  const [prog, setProg] = useState('');
  const [phone, setPhone] = useState('');
  const [studentId, setStudentId] = useState('');
  const [teacher, setTeacher] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const pickError = (e: any) =>
    e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Error inesperado';

  const load = async () => {
    try {
      setLoading(true);
      const r = await UsersApi.me();
      setMe(r);
      setFull(r.full_name || '');
      setProg(r.program_department || '');
      setPhone(r.phone || '');
      setStudentId(r.student_id || '');
      setTeacher(r.teacher_code || '');
    } catch (e: any) {
      Alert.alert('Atención', pickError(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      setSaving(true);
      await UsersApi.updateMe({
        full_name: full || undefined,
        program_department: prog || undefined,
        phone: phone || undefined,
        student_id: studentId || undefined,
        teacher_code: teacher || undefined,
      });
      Alert.alert('Listo', 'Perfil actualizado');
      load();
    } catch (e: any) {
      Alert.alert('Atención', pickError(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !me) {
    return (
      <SafeAreaView style={[s.screen, s.center]}>
        <ActivityIndicator />
        <Text style={s.sub}>Cargando perfil…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.container}>
        <Text style={s.h1}>Mi perfil</Text>
        <Text style={s.sub}>{me.email} · {me.role}</Text>

        <View style={s.card}>
          <TextInput
            style={s.input}
            placeholder="Nombre completo"
            placeholderTextColor="#94a3b8"
            value={full}
            onChangeText={setFull}
          />
          <TextInput
            style={s.input}
            placeholder="Carrera / Departamento"
            placeholderTextColor="#94a3b8"
            value={prog}
            onChangeText={setProg}
          />
          <TextInput
            style={s.input}
            placeholder="Teléfono de contacto"
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <TextInput
            style={s.input}
            placeholder="Carné (si eres estudiante)"
            placeholderTextColor="#94a3b8"
            value={studentId}
            onChangeText={setStudentId}
          />
          <TextInput
            style={s.input}
            placeholder="Código docente (si eres profesor)"
            placeholderTextColor="#94a3b8"
            value={teacher}
            onChangeText={setTeacher}
          />

          <Pressable onPress={save} style={({ pressed }) => [s.btn, pressed && s.btnPressed]} disabled={saving}>
            {saving ? <ActivityIndicator /> : <Text style={s.btnText}>Guardar cambios</Text>}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const COLORS = { bg:'#0b1220', card:'#111827', border:'#1f2937', text:'#e5e7eb', sub:'#94a3b8', primary:'#4f46e5' };

const s = StyleSheet.create({
  screen:{ flex:1, backgroundColor:COLORS.bg },
  center:{ alignItems:'center', justifyContent:'center' },
  container:{ padding:16, gap:10 },
  h1:{ color:COLORS.text, fontWeight:'800', fontSize:22 },
  sub:{ color:COLORS.sub },
  card:{ backgroundColor:COLORS.card, borderWidth:1, borderColor:COLORS.border, borderRadius:12, padding:12, gap:8 },
  input:{ backgroundColor:COLORS.bg, borderWidth:1, borderColor:COLORS.border, borderRadius:10, padding:12, color:COLORS.text },
  btn:{ backgroundColor:COLORS.primary, borderRadius:12, paddingVertical:12, alignItems:'center', marginTop:6 },
  btnPressed:{ opacity:0.9, transform:[{ scale:0.98 }] },
  btnText:{ color:'#fff', fontWeight:'800' },
});
