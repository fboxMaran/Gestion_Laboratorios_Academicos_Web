import React, { useState } from 'react';
import {
  View, Text, TextInput, Button, FlatList, Alert,
  StyleSheet, ActivityIndicator, Pressable
} from 'react-native';
import { InventoryApi } from '@/services/inventory';

export default function ConsumablesScreen() {
  const [labId, setLabId] = useState('1');
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [form, setForm] = useState<Record<number, { type?: 'IN'|'OUT'|'ADJUST'; qty?: string; reason?: string; notes?: string }>>({});
  const [loading, setLoading] = useState(false);

  const pickError = (e:any) =>
    e?.response?.data?.error || e?.response?.data?.message || e?.message || 'No se pudo completar la acción';

  const load = async () => {
    try {
      setLoading(true);
      const data = await InventoryApi.listConsumables({ lab_id: Number(labId) });
      setRows(data);
    } catch (e:any) {
      Alert.alert('Atención', pickError(e));
    } finally {
      setLoading(false);
    }
  };

  const toggle = (id:number) => setOpen(prev => ({ ...prev, [id]: !prev[id] }));
  const edit = (id:number, k:keyof (typeof form)[number], v:string) =>
    setForm(prev => ({ ...prev, [id]: { ...(prev[id]||{}), [k]: v as any } }));

  const move = async (it:any) => {
    const f = form[it.id] || {};
    if (!f.type) { Alert.alert('Completar', 'Indica el tipo de movimiento (IN/OUT/ADJUST)'); return; }
    try {
      const r = await InventoryApi.moveConsumable(it.id, {
        lab_id: Number(labId),
        type: f.type,
        qty: f.qty ? Number(f.qty) : undefined,
        reason: f.reason,
        notes: f.notes
      });
      Alert.alert('OK', `Movimiento registrado. Nuevo stock: ${r.qty_available}`);
      setOpen(prev => ({ ...prev, [it.id]: false }));
      setForm(prev => ({ ...prev, [it.id]: {} }));
      load();
    } catch (e:any) {
      Alert.alert('Atención', pickError(e));
    }
  };

  const TypeChip = ({ label, onPress, active }:{ label:'IN'|'OUT'|'ADJUST'; onPress:()=>void; active?:boolean }) => (
    <Pressable onPress={onPress} style={[s.chip, active && s.chipActive]}>
      <Text style={[s.chipTxt, active && s.chipTxtActive]}>{label}</Text>
    </Pressable>
  );

  return (
    <FlatList
      data={rows}
      keyExtractor={(x)=>String(x.id)}
      ListHeaderComponent={
        <View style={{ padding:12 }}>
          <Text style={s.h1}>Consumibles</Text>
          <View style={s.row}>
            <TextInput
              style={s.input}
              placeholder="ID del laboratorio (lab_id)"
              keyboardType="numeric"
              value={labId}
              onChangeText={setLabId}
            />
            <Button title="Cargar" onPress={load} />
          </View>
          {loading && <ActivityIndicator style={{ marginTop:8 }} />}
        </View>
      }
      refreshing={loading}
      onRefresh={load}
      ListEmptyComponent={!loading ? <Text style={{ paddingHorizontal:12 }}>No hay consumibles para mostrar.</Text> : null}
      renderItem={({item})=>{
        const low = typeof item.reorder_point === 'number' && typeof item.qty_available === 'number'
          ? item.qty_available <= item.reorder_point : false;
        return (
          <View style={s.card}>
            <View style={s.headerRow}>
              <Text style={s.h2}>{item.name}</Text>
              {low && <Text style={s.badgeDanger}>CRÍTICO</Text>}
            </View>
            <Text style={s.sub}>
              Stock: {item.qty_available}{item.unit} · Punto de reorden: {item.reorder_point}
            </Text>

            <Button title={open[item.id] ? 'Cancelar' : 'Registrar movimiento…'} onPress={()=>toggle(item.id)} />

            {open[item.id] && (
              <View style={s.box}>
                <Text style={s.boxTitle}>Movimiento</Text>

                <View style={[s.row, { marginTop:0 }]}>
                  <TypeChip
                    label="IN"
                    active={form[item.id]?.type === 'IN'}
                    onPress={()=>edit(item.id,'type','IN')}
                  />
                  <TypeChip
                    label="OUT"
                    active={form[item.id]?.type === 'OUT'}
                    onPress={()=>edit(item.id,'type','OUT')}
                  />
                  <TypeChip
                    label="ADJUST"
                    active={form[item.id]?.type === 'ADJUST'}
                    onPress={()=>edit(item.id,'type','ADJUST')}
                  />
                </View>

                <TextInput
                  style={s.input}
                  placeholder="Cantidad (qty)"
                  keyboardType="numeric"
                  value={form[item.id]?.qty || ''}
                  onChangeText={(v)=>edit(item.id,'qty',v)}
                />
                <TextInput
                  style={s.input}
                  placeholder="Motivo (opcional)"
                  value={form[item.id]?.reason || ''}
                  onChangeText={(v)=>edit(item.id,'reason',v)}
                />
                <TextInput
                  style={s.input}
                  placeholder="Notas (opcional)"
                  value={form[item.id]?.notes || ''}
                  onChangeText={(v)=>edit(item.id,'notes',v)}
                />
                <Button title="Guardar movimiento" onPress={()=>move(item)} />
              </View>
            )}
          </View>
        );
      }}
      contentContainerStyle={{ padding:12 }}
    />
  );
}

const s = StyleSheet.create({
  h1:{ fontSize:20, fontWeight:'800' },
  headerRow:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  row:{ flexDirection:'row', gap:8, marginTop:8, alignItems:'center' },
  input:{ borderWidth:1, borderColor:'#cbd5e1', borderRadius:8, padding:8, flex:1 },
  card:{ backgroundColor:'#fff', padding:12, borderRadius:10, marginBottom:10, elevation:2 },
  h2:{ fontWeight:'800' }, sub:{ color:'#64748b', marginTop:2 },
  box:{ marginTop:10, gap:8, backgroundColor:'#f8fafc', borderWidth:1, borderColor:'#e5e7eb', borderRadius:10, padding:10 },
  boxTitle:{ fontWeight:'700' },
  chip:{ paddingVertical:6, paddingHorizontal:12, borderRadius:999, backgroundColor:'#eef2ff' },
  chipActive:{ backgroundColor:'#2563eb' },
  chipTxt:{ color:'#334155', fontWeight:'700' },
  chipTxtActive:{ color:'#fff' },
  badgeDanger:{ backgroundColor:'#fee2e2', color:'#991b1b', paddingHorizontal:8, paddingVertical:2, borderRadius:8, fontWeight:'800' },
});
