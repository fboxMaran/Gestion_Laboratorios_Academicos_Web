import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, TextInput, Alert, StyleSheet, FlatList, RefreshControl, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter  } from 'expo-router';
import { RequestsApi } from '@/services/requests';
import type { RequestDetail, RequestMessage } from '@/types/requests';

export default function RequestDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const reqId = Number(id);

  const [data, setData] = useState<RequestDetail | any | null>(null);
  const [reviewer_note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const pickError = (e:any) =>
    e?.response?.data?.error || e?.response?.data?.message || e?.message || 'No se pudo completar la operación.';

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r: any = await RequestsApi.get(reqId);
      if (!r?.messages) {
        try { r.messages = await RequestsApi.messages(reqId); } catch {}
      }
      setData(r);
    } catch (e:any) {
      Alert.alert('Atención', pickError(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [reqId]);

  useEffect(() => { load(); }, [load]);

  const approve = async () => {
    try {
      setBusy(true);
      await RequestsApi.approve(reqId, { reviewer_id: 1, reviewer_note });
      setNote('');
      Alert.alert('Listo', 'Solicitud aprobada');
      load();
    } catch (e:any) { Alert.alert('Atención', pickError(e)); }
    finally { setBusy(false); }
  };

  const reject = async () => {
    try {
      setBusy(true);
      await RequestsApi.reject(reqId, { reviewer_id: 1, reviewer_note });
      setNote('');
      Alert.alert('Listo', 'Solicitud rechazada');
      load();
    } catch (e:any) { Alert.alert('Atención', pickError(e)); }
    finally { setBusy(false); }
  };

  const needInfo = async () => {
    try {
      setBusy(true);
      await RequestsApi.needInfo(reqId, { reviewer_id: 1, reviewer_note, message });
      setNote(''); setMessage('');
      Alert.alert('Listo', 'Se solicitó información al usuario');
      load();
    } catch (e:any) { Alert.alert('Atención', pickError(e)); }
    finally { setBusy(false); }
  };

  const addMsg = async () => {
    if (!message) return;
    try {
      setBusy(true);
      const m: RequestMessage = await RequestsApi.addMessage(reqId, { sender: 'USUARIO', message });
      setData((prev:any) => prev ? ({ ...prev, messages: [...(prev.messages || []), m] }) : prev);
      setMessage('');
    } catch (e:any) { Alert.alert('Atención', pickError(e)); }
    finally { setBusy(false); }
  };

  const canCancel = useMemo(() => {
    if (!data) return false;
    const start = new Date(data.requested_from);
    const now = new Date();
    return data.status === 'PENDIENTE' && start.getTime() > now.getTime();
  }, [data]);

  const doCancel = async () => {
    try {
      setBusy(true);
      await RequestsApi.cancel(reqId);
      Alert.alert('Listo', 'Solicitud cancelada');
      load();
    } catch (e:any) { Alert.alert('Atención', pickError(e)); }
    finally { setBusy(false); }
  };

  const messages = data?.messages ?? [];

  if (loading && !data) {
    return (
      <SafeAreaView style={[st.screen, { alignItems:'center', justifyContent:'center' }]}>
        <ActivityIndicator />
        <Text style={st.sub}>Cargando solicitud…</Text>
      </SafeAreaView>
    );
  }

  if (!data) {
    return (
      <SafeAreaView style={[st.screen, { alignItems:'center', justifyContent:'center' }]}>
        <Text style={st.sub}>No se pudo cargar la solicitud.</Text>
      </SafeAreaView>
    );
  }

  const Header = (
    <View>
      <View style={st.card}>
        <Text style={st.h1}>Solicitud #{data.id}</Text>
        <Text style={st.sub}>
          Laboratorio #{data.lab_id} · <Text style={[st.badge, st.badgePlain]}>{data.status}</Text> {data.requirements_ok ? '' : '· (revisar requisitos)'}
        </Text>
        <Text style={st.sub}>
          {data.requester_name} ({data.requester_role}) · {data.requester_email}
        </Text>
        {!!data.requester_program && <Text style={st.sub}>{data.requester_program}</Text>}
        <Text style={{ marginTop:6, color:'#e5e7eb' }}>{data.purpose}</Text>
        <Text style={st.sub}>
          {new Date(data.requested_from).toLocaleString()} — {new Date(data.requested_to).toLocaleString()} · {data.priority}
        </Text>
      </View>

      <View style={st.card}>
        <Text style={st.h2}>Recursos</Text>
        {(data.items ?? []).length === 0 ? (
          <Text style={st.sub}>(Sin ítems)</Text>
        ) : (
          (data.items ?? []).map((it:any) => (
            <Text key={it.id ?? `${it.resource_id}-${it.qty}`} style={{ color:'#e5e7eb' }}>
              • {it.resource_id ? `Recurso #${it.resource_id}` : 'Espacio del laboratorio'}  (cant. {it.qty})
            </Text>
          ))
        )}
      </View>

      <View style={st.card}>
        <Text style={st.h2}>Acciones del revisor</Text>
        <TextInput
          style={st.input}
          placeholder="Nota del revisor / motivo"
          placeholderTextColor="#94a3b8"
          value={reviewer_note}
          onChangeText={setNote}
        />
        <View style={st.row}>
          <Pressable style={[st.btn, st.btnOk]} onPress={approve} disabled={busy}><Text style={st.btnText}>{busy ? '...' : 'Aprobar'}</Text></Pressable>
          <Pressable style={[st.btn, st.btnBad]} onPress={reject} disabled={busy}><Text style={st.btnText}>{busy ? '...' : 'Rechazar'}</Text></Pressable>
        </View>

        <TextInput
          style={st.input}
          placeholder="Mensaje para solicitar información"
          placeholderTextColor="#94a3b8"
          value={message}
          onChangeText={setMessage}
        />
        <Pressable style={[st.btn, st.btnInfo]} onPress={needInfo} disabled={busy}>
          <Text style={st.btnText}>{busy ? '...' : 'Solicitar información'}</Text>
        </Pressable>

        {canCancel && (
          <Pressable style={[st.btn, st.btnWarn]} onPress={doCancel} disabled={busy}>
            <Text style={st.btnText}>{busy ? '...' : 'Cancelar solicitud (usuario)'}</Text>
          </Pressable>
        )}
      </View>

      <View style={{height:8}} />
      <View style={{flexDirection:'row', gap:8, flexWrap:'wrap'}}>
        <Pressable style={[st.btn, st.btnOutline]} onPress={() => router.push(`/requests/${reqId}/assignments` as const)}><Text style={st.btnOutlineText}>Asignaciones</Text></Pressable>
        <Pressable style={[st.btn, st.btnOutline]} onPress={() => router.push(`/requests/${reqId}/consumptions` as const)}><Text style={st.btnOutlineText}>Consumos</Text></Pressable>
        <Pressable style={[st.btn, st.btnOutline]} onPress={() => router.push(`/requests/${reqId}/benefits` as const)}><Text style={st.btnOutlineText}>Beneficios</Text></Pressable>
      </View>

      <View style={st.card}>
        <Text style={st.h2}>Mensajes</Text>
        {messages.length === 0 && <Text style={st.sub}>(No hay mensajes aún)</Text>}
      </View>
    </View>
  );

  const Footer = (
    <View style={[st.card, { marginBottom: 24 }]}>
      <TextInput
        style={st.input}
        placeholder="Escribe un mensaje"
        placeholderTextColor="#94a3b8"
        value={message}
        onChangeText={setMessage}
      />
      <Pressable style={[st.btn, st.btnPrimary]} onPress={addMsg} disabled={busy}>
        <Text style={st.btnText}>{busy ? '...' : 'Enviar mensaje'}</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeAreaView style={st.screen}>
      <FlatList
        data={messages}
        keyExtractor={(m:any) => String(m.id)}
        renderItem={({ item }) => (
          <View style={[st.card, { paddingVertical: 10 }]}>
            <Text style={{fontWeight:'800', color:'#e5e7eb'}}>{item.sender}</Text>
            <Text style={{ color:'#e5e7eb' }}>{item.message}</Text>
            <Text style={{color:'#94a3b8', fontSize:12}}>{new Date(item.created_at).toLocaleString()}</Text>
          </View>
        )}
        ListHeaderComponent={Header}
        ListFooterComponent={Footer}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
      />
    </SafeAreaView>
  );
}

const COLORS = { bg:'#0b1220', card:'#111827', border:'#1f2937', text:'#e5e7eb', sub:'#94a3b8', primary:'#4f46e5', ok:'#16a34a', bad:'#dc2626', info:'#0ea5e9', warn:'#f59e0b' };

const st = StyleSheet.create({
  screen:{ flex:1, backgroundColor:COLORS.bg },
  h1:{ fontSize:20, fontWeight:'800', color:COLORS.text },
  h2:{ fontWeight:'800', color:COLORS.text, marginBottom:6 },
  sub:{ color:COLORS.sub, marginTop:2 },
  card:{ backgroundColor:COLORS.card, padding:12, borderRadius:12, marginBottom:10, borderWidth:1, borderColor:COLORS.border },
  input:{ backgroundColor:COLORS.bg, borderWidth:1, borderColor:COLORS.border, borderRadius:10, padding:12, marginVertical:6, color:COLORS.text },
  row:{ flexDirection:'row', gap:8, marginTop:6, flexWrap:'wrap' },
  btn:{ borderRadius:10, paddingVertical:10, paddingHorizontal:14, alignItems:'center' },
  btnPrimary:{ backgroundColor:COLORS.primary, marginTop:6 },
  btnOk:{ backgroundColor:COLORS.ok, flex:1 },
  btnBad:{ backgroundColor:COLORS.bad, flex:1 },
  btnInfo:{ backgroundColor:COLORS.info, marginTop:6 },
  btnWarn:{ backgroundColor:COLORS.warn, marginTop:6 },
  btnText:{ color:'#fff', fontWeight:'800' },
  btnOutline:{ backgroundColor:'transparent', borderWidth:1, borderColor:COLORS.border },
  btnOutlineText:{ color:COLORS.text, fontWeight:'800' },
  badge:{ paddingHorizontal:8, paddingVertical:2, borderRadius:999 },
  badgePlain:{ backgroundColor:'#1f2937', color:'#e5e7eb' },
});
