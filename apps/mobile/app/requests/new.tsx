import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Alert, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RequestsApi } from '@/services/requests';

export default function NewRequest() {
  const router = useRouter();
  const { labId } = useLocalSearchParams<{ labId?: string }>();

  const [lab_id, setLabId] = useState<string>(labId ?? '');
  const [requester_name, setName] = useState('');
  const [requester_email, setEmail] = useState('');
  const [requester_role, setRole] = useState('ESTUDIANTE');
  const [requester_program, setProgram] = useState('');
  const [purpose, setPurpose] = useState('');
  const [priority, setPriority] = useState<'NORMAL'|'ALTA'>('NORMAL');
  const [requested_from, setFrom] = useState('');
  const [requested_to, setTo] = useState('');
  const [headcount, setHeadcount] = useState('1');

  const [resourceIds, setResourceIds] = useState('');
  const items = useMemo(() => {
    if (!resourceIds.trim()) return [{ qty: 1 }];
    return resourceIds.split(',').map(s => s.trim()).filter(Boolean).map(n => ({ resource_id: Number(n), qty: 1 }));
  }, [resourceIds]);

  const [preview, setPreview] = useState<null | {
    availability_ok: boolean;
    availability_conflicts: any[];
    requirements_ok: boolean;
    missing_requirements: any[];
  }>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);

  const pickError = (e:any) =>
    e?.response?.data?.error || e?.response?.data?.message || e?.message || 'No se pudo completar la operación.';

  const doPreview = async () => {
    if (!lab_id || !requested_from || !requested_to) {
      return Alert.alert('Completar', 'Debes indicar: laboratorio, fecha desde y hasta (ISO).');
    }
    try {
      setLoadingPreview(true);
      const data = await RequestsApi.preview({
        lab_id: Number(lab_id),
        from: requested_from,
        to: requested_to,
        items,
      } as any);
      setPreview(data);
      if (!data.availability_ok) Alert.alert('Atención', 'Hay conflictos de disponibilidad. Revisa el detalle.');
      if (!data.requirements_ok) Alert.alert('Atención', 'No cumples algunos requisitos. Revisa el detalle.');
    } catch (e:any) {
      Alert.alert('Atención', pickError(e));
    } finally {
      setLoadingPreview(false);
    }
  };

  const submit = async () => {
    if (!lab_id || !requester_name || !requester_email || !requester_role || !purpose || !requested_from || !requested_to) {
      return Alert.alert('Completar', 'Llena todos los campos obligatorios.');
    }
    try {
      setLoadingCreate(true);
      const payload = {
        lab_id: Number(lab_id),
        requester_name, requester_email, requester_role, requester_program,
        purpose, priority,
        requested_from, requested_to,
        headcount: Number(headcount || 1),
        items
      };
      const r: any = await RequestsApi.create(payload);
      const newId = r?.id ?? r?.request?.id;
      if (!newId) return Alert.alert('Creado', 'Solicitud creada, pero no se obtuvo el ID.');
      Alert.alert('Listo', 'Solicitud creada', [
        { text: 'Ver', onPress: () => router.replace(`/requests/${newId}` as any) },
      ]);
    } catch (e:any) {
      Alert.alert('Atención', pickError(e));
    } finally {
      setLoadingCreate(false);
    }
  };

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={s.h1}>Nueva solicitud</Text>

        <View style={s.card}>
          <Text style={s.h2}>Datos generales</Text>
          <TextInput style={s.input} placeholder="ID de laboratorio" placeholderTextColor="#94a3b8" keyboardType="numeric" value={lab_id} onChangeText={setLabId} />
          <TextInput style={s.input} placeholder="Nombre del solicitante" placeholderTextColor="#94a3b8" value={requester_name} onChangeText={setName} />
          <TextInput style={s.input} placeholder="Correo del solicitante" placeholderTextColor="#94a3b8" value={requester_email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={s.input} placeholder="Rol (ESTUDIANTE / DOCENTE / ...)" placeholderTextColor="#94a3b8" value={requester_role} onChangeText={setRole} />
          <TextInput style={s.input} placeholder="Carrera / Programa (opcional)" placeholderTextColor="#94a3b8" value={requester_program} onChangeText={setProgram} />
          <TextInput style={s.input} placeholder="Objetivo de uso" placeholderTextColor="#94a3b8" value={purpose} onChangeText={setPurpose} />
          <TextInput style={s.input} placeholder="Prioridad (NORMAL / ALTA)" placeholderTextColor="#94a3b8" value={priority} onChangeText={t => setPriority((t as any) || 'NORMAL')} />
          <TextInput style={s.input} placeholder="Desde (ISO: YYYY-MM-DDTHH:mm:ss)" placeholderTextColor="#94a3b8" value={requested_from} onChangeText={setFrom} />
          <TextInput style={s.input} placeholder="Hasta (ISO: YYYY-MM-DDTHH:mm:ss)" placeholderTextColor="#94a3b8" value={requested_to} onChangeText={setTo} />
          <TextInput style={s.input} placeholder="Cantidad de personas" placeholderTextColor="#94a3b8" keyboardType="numeric" value={headcount} onChangeText={setHeadcount} />
        </View>

        <View style={s.card}>
          <Text style={s.h2}>Recursos (opcional)</Text>
          <Text style={s.sub}>IDs de recursos separados por coma. Déjalo vacío para reservar solo el espacio del laboratorio.</Text>
          <TextInput style={s.input} placeholder="Ej: 2,5,7" placeholderTextColor="#94a3b8" value={resourceIds} onChangeText={setResourceIds} />
        </View>

        <Pressable onPress={doPreview} style={({ pressed }) => [s.btn, s.btnInfo, pressed && s.btnPressed]} disabled={loadingPreview}>
          {loadingPreview ? <ActivityIndicator /> : <Text style={s.btnText}>Previsualizar (validar)</Text>}
        </Pressable>

        {!!preview && (
          <View style={s.card}>
            <Text style={s.h2}>Resultado de validación</Text>

            <View style={[s.badge, preview.availability_ok ? s.badgeOk : s.badgeBad]}>
              <Text style={s.badgeText}>Disponibilidad: {preview.availability_ok ? 'OK' : 'Conflictos'}</Text>
            </View>
            {!preview.availability_ok && (
              <Text style={s.prejson}>{JSON.stringify(preview.availability_conflicts, null, 2)}</Text>
            )}

            <View style={[s.badge, preview.requirements_ok ? s.badgeOk : s.badgeBad]}>
              <Text style={s.badgeText}>Requisitos: {preview.requirements_ok ? 'OK' : 'Faltantes'}</Text>
            </View>
            {!preview.requirements_ok && (
              <Text style={s.prejson}>{JSON.stringify(preview.missing_requirements, null, 2)}</Text>
            )}
          </View>
        )}

        <Pressable onPress={submit} style={({ pressed }) => [s.btn, s.btnPrimary, pressed && s.btnPressed]} disabled={loadingCreate}>
          {loadingCreate ? <ActivityIndicator /> : <Text style={s.btnText}>Crear solicitud</Text>}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const COLORS = { bg:'#0b1220', card:'#111827', border:'#1f2937', text:'#e5e7eb', sub:'#94a3b8', primary:'#4f46e5', info:'#0ea5e9' };

const s = StyleSheet.create({
  screen:{ flex:1, backgroundColor:COLORS.bg },
  h1:{ color:COLORS.text, fontWeight:'800', fontSize:22, marginBottom:6 },
  h2:{ color:COLORS.text, fontWeight:'800', marginBottom:6 },
  sub:{ color:COLORS.sub, marginBottom:6 },
  card:{ backgroundColor:COLORS.card, borderRadius:12, padding:12, marginBottom:10, borderWidth:1, borderColor:COLORS.border },
  input:{ backgroundColor:COLORS.bg, borderWidth:1, borderColor:COLORS.border, borderRadius:10, padding:12, marginVertical:4, color:COLORS.text },
  btn:{ borderRadius:12, paddingVertical:12, alignItems:'center', marginTop:6 },
  btnPrimary:{ backgroundColor:COLORS.primary },
  btnInfo:{ backgroundColor:COLORS.info },
  btnText:{ color:'#fff', fontWeight:'800' },
  btnPressed:{ opacity:0.9, transform:[{ scale:0.98 }] },
  badge:{ alignSelf:'flex-start', paddingHorizontal:10, paddingVertical:4, borderRadius:999, marginTop:6 },
  badgeOk:{ backgroundColor:'#14532d' },
  badgeBad:{ backgroundColor:'#7f1d1d' },
  badgeText:{ color:'#fff', fontWeight:'800' },
  prejson:{ color:COLORS.text, fontSize:12, marginTop:6 },
});
