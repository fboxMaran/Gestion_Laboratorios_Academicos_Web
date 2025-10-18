import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Alert, FlatList, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UsersApi } from '@/services/users';

export default function TrainingsScreen() {
  const [rows, setRows] = useState<any[]>([]);
  const [trainingId, setTrainingId] = useState('');
  const [completedAt, setCompletedAt] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [labReqLabId, setLabReqLabId] = useState('');
  const [labReq, setLabReq] = useState<any|null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const pickError = (e:any) => {
    if (e?.response?.status === 404) return 'No hay registros aún.';
    return e?.response?.data?.error || e?.response?.data?.message || e?.message || 'Error inesperado';
  };

  const load = async () => {
    try {
      setLoading(true);
      const data = await UsersApi.myTrainings();
      setRows(Array.isArray(data) ? data : []);
    } catch (e:any) {
      Alert.alert('Atención', pickError(e));
    } finally {
      setLoading(false);
    }
  };
  useEffect(()=>{ load(); }, []);

  const add = async () => {
    if (!trainingId) return Alert.alert('Completar','Debes indicar el ID de capacitación.');
    try {
      setSaving(true);
      await UsersApi.upsertTraining({
        training_id: Number(trainingId),
        completed_at: completedAt || undefined,
        expires_at: expiresAt || undefined
      });
      Alert.alert('Listo','Capacitación registrada/actualizada');
      setCompletedAt(''); setExpiresAt(''); setTrainingId('');
      load();
    } catch(e:any){ Alert.alert('Atención', pickError(e)); }
    finally { setSaving(false); }
  };

  const checkLab = async () => {
    if (!labReqLabId) return;
    try {
      setLabReq(await UsersApi.labRequirements(Number(labReqLabId)));
    } catch(e:any){ Alert.alert('Atención', pickError(e)); }
  };

  return (
    <SafeAreaView style={s.screen}>
      <FlatList
        data={rows}
        keyExtractor={(x,i)=>String(x.id || i)}
        ListHeaderComponent={
          <View style={{ padding:16, gap:10 }}>
            <Text style={s.h1}>Mis capacitaciones</Text>

            <View style={s.card}>
              <Text style={s.h2}>Agregar / Actualizar</Text>
              <TextInput
                style={s.input}
                placeholder="ID de capacitación (numérico)"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={trainingId}
                onChangeText={setTrainingId}
              />
              <TextInput
                style={s.input}
                placeholder="Fecha de finalización (ISO opcional)"
                placeholderTextColor="#94a3b8"
                value={completedAt}
                onChangeText={setCompletedAt}
              />
              <TextInput
                style={s.input}
                placeholder="Fecha de vencimiento (ISO opcional)"
                placeholderTextColor="#94a3b8"
                value={expiresAt}
                onChangeText={setExpiresAt}
              />
              <Pressable onPress={add} style={({ pressed }) => [s.btn, pressed && s.btnPressed]} disabled={saving}>
                {saving ? <ActivityIndicator /> : <Text style={s.btnText}>Guardar</Text>}
              </Pressable>
            </View>

            <View style={s.card}>
              <Text style={s.h2}>Requisitos por laboratorio</Text>
              <TextInput
                style={s.input}
                placeholder="ID de laboratorio"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={labReqLabId}
                onChangeText={setLabReqLabId}
              />
              <Pressable onPress={checkLab} style={({ pressed }) => [s.btnAlt, pressed && s.btnPressed]}>
                <Text style={s.btnAltText}>Verificar elegibilidad</Text>
              </Pressable>

              {labReq && (
                <View style={{ marginTop:8, gap:6 }}>
                  <Text style={s.kv}><Text style={s.k}>Elegible:</Text> {labReq.eligible ? 'Sí' : 'No'}</Text>
                  {labReq.items?.map((it:any)=>(
                    <View key={it.training_id} style={[s.reqItem, it.valid ? s.ok : s.bad]}>
                      <Text style={s.reqText}>
                        {it.code} {it.name} — {it.valid ? 'OK' : 'FALTA/EXPIRADO'}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        }
        renderItem={({item})=>(
          <View style={s.item}>
            <Text style={s.itemTitle}>{item.code} {item.name}</Text>
            <Text style={s.meta}>Completado: {item.completed_at ? new Date(item.completed_at).toLocaleString() : '—'}</Text>
            <Text style={s.meta}>Vence: {item.expires_at ? new Date(item.expires_at).toLocaleString() : '—'}</Text>
          </View>
        )}
        ListEmptyComponent={!loading ? <Text style={s.empty}>Sin capacitaciones registradas.</Text> : null}
        contentContainerStyle={{ padding:16 }}
      />
    </SafeAreaView>
  );
}

const COLORS = { bg:'#0b1220', card:'#111827', border:'#1f2937', text:'#e5e7eb', sub:'#94a3b8', primary:'#4f46e5', info:'#0ea5e9' };

const s = StyleSheet.create({
  screen:{ flex:1, backgroundColor:COLORS.bg },
  h1:{ color:COLORS.text, fontSize:20, fontWeight:'800' },
  h2:{ color:COLORS.text, fontWeight:'800', marginBottom:6 },
  card:{ backgroundColor:COLORS.card, borderWidth:1, borderColor:COLORS.border, borderRadius:12, padding:12, gap:8 },
  input:{ backgroundColor:COLORS.bg, borderWidth:1, borderColor:COLORS.border, borderRadius:10, padding:12, color:COLORS.text },
  btn:{ backgroundColor:COLORS.primary, borderRadius:12, paddingVertical:12, alignItems:'center' },
  btnAlt:{ backgroundColor:COLORS.info, borderRadius:12, paddingVertical:12, alignItems:'center' },
  btnAltText:{ color:'#fff', fontWeight:'800' },
  btnPressed:{ opacity:0.9, transform:[{ scale:0.98 }] },
  btnText:{ color:'#fff', fontWeight:'800' },
  item:{ backgroundColor:COLORS.card, borderWidth:1, borderColor:COLORS.border, borderRadius:12, padding:12, marginVertical:6 },
  itemTitle:{ color:COLORS.text, fontWeight:'700' },
  meta:{ color:COLORS.sub, marginTop:4, fontSize:12 },
  empty:{ color:COLORS.sub, textAlign:'center', marginTop:12 },
  kv:{ color:COLORS.text },
  k:{ fontWeight:'800' },
  reqItem:{ borderRadius:8, paddingVertical:6, paddingHorizontal:10 },
  ok:{ backgroundColor:'#14532d' },
  bad:{ backgroundColor:'#7f1d1d' },
  reqText:{ color:'#fff', fontWeight:'600' },
});
