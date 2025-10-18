import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Button, Alert, StyleSheet, FlatList,
  TouchableOpacity, Linking, ScrollView, ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { ResourceTypesApi, ResourcesApi, SubscriptionsApi, ChangeLogApi } from '@/services/availability';
import type { Resource, ResourceType, ChangeLog } from '@/types/availability';

type Category = 'EQUIPO'|'MATERIAL'|'SOFTWARE'|'OTRO';
type ResourceStatus = Resource['status'];

const pickError = (e:any) =>
  e?.response?.data?.error || e?.response?.data?.message || e?.message || 'No se pudo completar la acción';

function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ResourceCard({
  item, onAddPhoto, onSubscribe, onOpenRequest, onViewLog
}:{
  item: Resource;
  onAddPhoto: (resourceId:number, url:string) => void;
  onSubscribe: (resourceId:number) => void;
  onOpenRequest: (r:Resource) => void;
  onViewLog: (resourceId:number) => void;
}) {
  const [photoUrl, setPhotoUrl] = useState('');
  return (
    <View style={styles.resourceCard}>
      <Text style={styles.title}>{item.name}</Text>
      <Text style={styles.sub}>{item.type_name} · {item.status} · Cantidad {item.qty_available}</Text>
      {!!item.description && <Text style={styles.sub}>{item.description}</Text>}

      <View style={styles.row}>
        <View style={{flex:1}}>
          <TextInput
            style={styles.input}
            placeholder="URL de la foto"
            placeholderTextColor="#94a3b8"
            value={photoUrl}
            onChangeText={setPhotoUrl}
          />
        </View>
        <Button title="Agregar foto" onPress={()=>onAddPhoto(item.id, photoUrl)}/>
      </View>

      <View style={styles.row}>
        <Button title="Solicitar" onPress={()=>onOpenRequest(item)} />
        <View style={{width:8}} />
        <Button title="Suscribirme" onPress={()=>onSubscribe(item.id)} />
        <View style={{width:8}} />
        <Button title="Bitácora" onPress={()=>onViewLog(item.id)} />
      </View>
    </View>
  );
}

export default function Catalog() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const labId = Number(id);
  const router = useRouter();
  const DEMO_USER_ID = 1;

  const toTypes = '/admin/resource-types' as Href;

  const [types, setTypes] = useState<ResourceType[]>([]);
  const [typeId, setTypeId] = useState<number|undefined>(undefined);
  const [items, setItems] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(false);

  // Crear recurso
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [qty, setQty] = useState('1');
  const [status, setStatus] = useState<ResourceStatus>('DISPONIBLE');

  // Changelog modal simple
  const [activeLogId, setActiveLogId] = useState<number|null>(null);
  const [logs, setLogs] = useState<ChangeLog[]>([]);

  const load = async () => {
    setLoading(true);
    try {
      const ts = await ResourceTypesApi.list();
      setTypes(ts);

      if (!ts.length) {
        setItems([]); setTypeId(undefined);
      } else {
        const selected = typeof typeId === 'number' ? typeId : ts[0].id;
        setTypeId(selected);
        const rs = await ResourcesApi.listByLab(labId, { type_id: selected });
        setItems(rs);
      }
    } catch (e:any) {
      Alert.alert('Atención', pickError(e));
    } finally { setLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [labId]);

  const refetchByType = async (tid: number) => {
    setTypeId(tid);
    try {
      const rs = await ResourcesApi.listByLab(labId, { type_id: tid });
      setItems(rs);
    } catch (e:any) {
      Alert.alert('Atención', pickError(e));
    }
  };

  const createResource = async () => {
    if (!typeId || !name) return Alert.alert('Completar', 'Tipo y nombre son obligatorios');
    try {
      const r = await ResourcesApi.create(labId, {
        type_id: typeId,
        name,
        description: desc || undefined,
        qty_available: Number(qty||1),
        status,
      });
      setItems(prev => [r, ...prev]);
      setName(''); setDesc(''); setQty('1'); setStatus('DISPONIBLE');
      Alert.alert('OK','Recurso creado');
    } catch (e:any) {
      Alert.alert('Atención', pickError(e));
    }
  };

  const addPhoto = async (resourceId: number, url: string) => {
    if (!url) return Alert.alert('Completar','Ingresa la URL de la foto');
    try {
      await ResourcesApi.addPhoto(resourceId, url);
      Alert.alert('OK','Foto agregada');
    } catch (e:any) {
      Alert.alert('Atención', pickError(e));
    }
  };

  const subscribeLab = async () => {
    try {
      await SubscriptionsApi.subscribeLab(DEMO_USER_ID, labId);
      Alert.alert('OK','Suscripción al laboratorio creada');
    } catch (e:any) {
      Alert.alert('Atención', pickError(e));
    }
  };

  const subscribeResource = async (resourceId: number) => {
    try {
      await SubscriptionsApi.subscribeResource(DEMO_USER_ID, resourceId);
      Alert.alert('OK','Suscripción creada');
    } catch (e:any) {
      Alert.alert('Atención', pickError(e));
    }
  };

  const openRequest = (r: Resource) => {
    if (!r.request_url) return Alert.alert('Sin enlace','Este recurso no tiene un enlace de solicitud configurado');
    Linking.openURL(r.request_url).catch(()=>Alert.alert('Atención','No se pudo abrir el enlace'));
  };

  const viewLog = async (resourceId: number) => {
    try {
      const l = await ChangeLogApi.list('resource', resourceId);
      setLogs(l); setActiveLogId(resourceId);
    } catch (e:any) {
      Alert.alert('Atención', pickError(e));
    }
  };

  return (
    <View style={{flex:1, padding:12}}>
      <View style={styles.rowBetween}>
        <Text style={styles.h1}>Catálogo</Text>
        <Button title="Suscribirme al LAB" onPress={subscribeLab}/>
      </View>

      {!types.length ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No hay tipos de recurso</Text>
          <Text style={styles.emptySub}>
            Primero crea tipos (Microscopio, Multímetro, Software…) para poder registrar recursos.
          </Text>
          <View style={{height:8}} />
          <Button title="Crear tipos ahora" onPress={() => router.push(toTypes)} />
        </View>
      ) : (
        <>
          {/* Chips de tipos */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:8}}>
            {types.map(t => (
              <Chip key={t.id} label={`${t.name}`} active={t.id === typeId} onPress={() => refetchByType(t.id)} />
            ))}
          </ScrollView>

          {/* Crear recurso rápido */}
          <View style={styles.card}>
            <Text style={styles.h2}>Crear recurso</Text>
            <Text style={styles.sub}>Tipo seleccionado: {types.find(t=>t.id===typeId)?.name}</Text>
            <TextInput style={styles.input} placeholder="Nombre" placeholderTextColor="#94a3b8" value={name} onChangeText={setName}/>
            <TextInput style={styles.input} placeholder="Descripción (opcional)" placeholderTextColor="#94a3b8" value={desc} onChangeText={setDesc}/>
            <TextInput style={styles.input} placeholder="Cantidad disponible" placeholderTextColor="#94a3b8" keyboardType="numeric" value={qty} onChangeText={setQty}/>
            <TextInput
              style={styles.input}
              placeholder="Estado (DISPONIBLE/RESERVADO/MANTENIMIENTO/INACTIVO)"
              placeholderTextColor="#94a3b8"
              value={status}
              onChangeText={(t)=>setStatus((t.toUpperCase() as ResourceStatus) || 'DISPONIBLE')}
            />
            <Button title="Crear" onPress={createResource}/>
          </View>

          {loading && (
            <View style={{ paddingVertical:8, alignItems:'center' }}>
              <ActivityIndicator />
              <Text style={{ color:'#6b7280', marginTop:6 }}>Cargando recursos…</Text>
            </View>
          )}

          {/* Lista */}
          <FlatList
            refreshing={loading}
            onRefresh={() => typeId && refetchByType(typeId)}
            data={items}
            keyExtractor={(i)=>String(i.id)}
            ListEmptyComponent={<Text>No hay recursos de este tipo</Text>}
            renderItem={({item})=>(
              <ResourceCard
                item={item}
                onAddPhoto={addPhoto}
                onSubscribe={subscribeResource}
                onOpenRequest={openRequest}
                onViewLog={viewLog}
              />
            )}
          />
        </>
      )}

      {/* Bitácora simple */}
      {activeLogId !== null && (
        <View style={styles.modal}>
          <View style={styles.modalInner}>
            <View style={styles.rowBetween}>
              <Text style={styles.h2}>Bitácora recurso #{activeLogId}</Text>
              <TouchableOpacity onPress={()=>setActiveLogId(null)}><Text style={{fontSize:18}}>✕</Text></TouchableOpacity>
            </View>
            <FlatList
              data={logs}
              keyExtractor={(l)=>String(l.id)}
              renderItem={({item})=>(
                <View style={{paddingVertical:6}}>
                  <Text style={{fontWeight:'800'}}>{item.action}</Text>
                  <Text style={{color:'#6b7280'}}>{new Date(item.created_at).toLocaleString('es-ES')}</Text>
                  {!!item.detail && <Text style={{color:'#111'}} numberOfLines={2}>{JSON.stringify(item.detail)}</Text>}
                </View>
              )}
              ListEmptyComponent={<Text>No hay entradas</Text>}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  rowBetween:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8 },
  row:{ flexDirection:'row', alignItems:'center' },
  h1:{ fontSize:20, fontWeight:'800' },
  h2:{ fontWeight:'800', marginBottom:6 },
  sub:{ color:'#6b7280', marginTop:2 },
  card:{ backgroundColor:'#fff', padding:12, borderRadius:10, marginBottom:10, elevation:2 },
  input:{ borderWidth:1, borderColor:'#d4d4d8', borderRadius:8, padding:10, marginVertical:4, color:'#111' },
  resourceCard:{ backgroundColor:'#fff', padding:12, borderRadius:10, marginVertical:6, elevation:1 },
  title:{ fontWeight:'800' },

  chip:{ paddingVertical:8, paddingHorizontal:12, borderRadius:999, backgroundColor:'#eef2ff', marginRight:8 },
  chipActive:{ backgroundColor:'#2d6cdf' },
  chipText:{ color:'#334155', fontWeight:'700' },
  chipTextActive:{ color:'#fff' },

  emptyBox:{ backgroundColor:'#fff', borderRadius:12, padding:16, elevation:2, marginTop:6 },
  emptyTitle:{ fontSize:16, fontWeight:'800' },
  emptySub:{ color:'#6b7280', marginTop:4 },

  modal:{ position:'absolute', left:0, right:0, top:0, bottom:0, backgroundColor:'rgba(0,0,0,0.4)', justifyContent:'center', alignItems:'center' },
  modalInner:{ backgroundColor:'#fff', width:'90%', maxHeight:'70%', borderRadius:12, padding:12 }
});
