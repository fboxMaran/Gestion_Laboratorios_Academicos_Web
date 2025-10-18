import React, { useEffect, useState } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, RefreshControl, Alert } from 'react-native';
import { NotificationsApi, type NotificationRow } from '@/services/notifications';

export default function NotificationsScreen() {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const data = await NotificationsApi.list();
      setRows(data);
    } catch (e:any) {
      Alert.alert('Error', e?.response?.data?.error || e.message || 'No se pudo cargar notificaciones');
    }
  }

  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const markOne = async (id: number) => {
    try {
      await NotificationsApi.markSeen(id);
      await load();
    } catch (e:any) {
      Alert.alert('Error', e?.response?.data?.error || e.message || 'No se pudo marcar');
    }
  };

  const markAll = async () => {
    try {
      await NotificationsApi.markAllSeen();
      await load();
    } catch (e:any) {
      Alert.alert('Error', e?.response?.data?.error || e.message || 'No se pudo marcar todo');
    }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={s.header}>
        <Text style={s.h1}>Notificaciones</Text>
        <Pressable style={s.btnSmall} onPress={markAll}>
          <Text style={s.btnSmallText}>Marcar todas</Text>
        </Pressable>
      </View>

      {rows.map(n => (
        <View key={n.id} style={[s.item, !!n.sent_at && { opacity: 0.7 }]}>
          <Text style={s.title}>{n.title}</Text>
          <Text style={s.body}>{n.body}</Text>
          <Text style={s.meta}>{new Date(n.queued_at).toLocaleString()}</Text>
          {!n.sent_at && (
            <Pressable style={s.btn} onPress={() => markOne(n.id)}>
              <Text style={s.btnText}>Marcar visto</Text>
            </Pressable>
          )}
        </View>
      ))}

      {!rows.length && <Text style={s.empty}>Sin notificaciones.</Text>}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen:{ flex:1, backgroundColor:'#0b1220' },
  container:{ padding:16, gap:10 },
  header:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  h1:{ color:'#fff', fontSize:20, fontWeight:'800' },
  item:{ backgroundColor:'#111827', borderRadius:10, padding:12 },
  title:{ color:'#fff', fontWeight:'700' },
  body:{ color:'#cbd5e1', marginTop:4 },
  meta:{ color:'#94a3b8', fontSize:12, marginTop:6 },
  btn:{ backgroundColor:'#2563eb', alignSelf:'flex-start', borderRadius:8, paddingVertical:6, paddingHorizontal:10, marginTop:8 },
  btnText:{ color:'#fff', fontWeight:'700' },
  btnSmall:{ backgroundColor:'#334155', borderRadius:8, paddingVertical:6, paddingHorizontal:10 },
  btnSmallText:{ color:'#fff', fontWeight:'700' },
  empty:{ color:'#94a3b8', textAlign:'center', marginTop:12 }
});
