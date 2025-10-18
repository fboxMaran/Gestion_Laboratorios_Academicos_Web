import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TextInput, Button, Alert, ScrollView,
  StyleSheet, ActivityIndicator, Pressable
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter  } from 'expo-router';
import { LabsApi } from '../../../services/labs';   // 👈 relativo
import type {
  Lab, LabContact, LabPolicies, LabHour,
  FixedResource, Consumable, LabHistory
} from '../../../types/labs';                       // 👈 relativo

const pickError = (e:any) =>
  e?.response?.data?.error || e?.response?.data?.message || e?.message || 'No se pudo completar la acción';

const dayNames = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

export default function LabDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const labId = Number(id);

  const [lab, setLab] = useState<Lab | null>(null);
  const [loading, setLoading] = useState(true);

  // Contactos
  const [contacts, setContacts] = useState<LabContact[]>([]);
  const [cName, setCName] = useState(''); const [cRole, setCRole] = useState('');
  const [cPhone, setCPhone] = useState(''); const [cEmail, setCEmail] = useState('');

  // Políticas
  const [pol, setPol] = useState<LabPolicies | null>(null);
  const [reqAcad, setReqAcad] = useState(''); const [reqSafe, setReqSafe] = useState(''); const [capMax, setCapMax] = useState('');

  // Horarios
  const [hours, setHours] = useState<LabHour[]>([]);
  const [hDay, setHDay] = useState('1'); const [hOpen, setHOpen] = useState('08:00'); const [hClose, setHClose] = useState('12:00');

  // Recursos fijos
  const [fixed, setFixed] = useState<FixedResource[]>([]);
  const [frName, setFrName] = useState(''); const [frCode, setFrCode] = useState(''); const [frStatus, setFrStatus] = useState('DISPONIBLE'); const [frDate, setFrDate] = useState('');

  // Consumibles
  const [cons, setCons] = useState<Consumable[]>([]);
  const [cnName, setCnName] = useState(''); const [cnUnit, setCnUnit] = useState('unid'); const [cnReorder, setCnReorder] = useState('0'); const [cnQty, setCnQty] = useState('0');

  // Historial
  const [history, setHistory] = useState<LabHistory[]>([]);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [labD, cts, p, hs, fr, co, hi] = await Promise.all([
        LabsApi.get(labId),
        LabsApi.listContacts(labId),
        LabsApi.getPolicies(labId),
        LabsApi.getHours(labId),
        LabsApi.listFixedResources(labId),
        LabsApi.listConsumables(labId),
        LabsApi.history(labId),
      ]);
      setLab(labD);
      setContacts(cts);
      setPol(p);
      setReqAcad(p?.academic_requirements || '');
      setReqSafe(p?.safety_requirements || '');
      setCapMax(p?.capacity_max ? String(p.capacity_max) : '');
      setHours(hs);
      setFixed(fr);
      setCons(co);
      setHistory(hi);
    } catch (e:any) {
      Alert.alert('Atención', pickError(e));
    } finally {
      setLoading(false);
    }
  }, [labId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Actions (solo UI/errores, lógica intacta)
  const addContact = async () => {
    if (!cName || !cRole || !cEmail) return Alert.alert('Completar', 'Nombre, cargo y correo son obligatorios');
    try {
      const r = await LabsApi.addContact(labId, { name: cName, role: cRole, phone: cPhone || undefined, email: cEmail });
      setContacts(prev => [r, ...prev]);
      setCName(''); setCRole(''); setCPhone(''); setCEmail('');
      Alert.alert('OK', 'Contacto agregado');
    } catch (e:any) { Alert.alert('Atención', pickError(e)); }
  };

  const savePolicies = async () => {
    try {
      const r = await LabsApi.upsertPolicies(labId, {
        academic_requirements: reqAcad || undefined,
        safety_requirements: reqSafe || undefined,
        capacity_max: capMax ? Number(capMax) : undefined,
      });
      setPol(r);
      Alert.alert('OK', 'Políticas guardadas');
    } catch (e:any) { Alert.alert('Atención', pickError(e)); }
  };

  const addHour = async () => {
    try {
      const updated = await LabsApi.setHours(labId, [
        ...hours.map(h => ({ day_of_week: h.day_of_week, opens: h.opens, closes: h.closes })),
        { day_of_week: Number(hDay), opens: hOpen.length===5?`${hOpen}:00`:hOpen, closes: hClose.length===5?`${hClose}:00`:hClose }
      ]);
      setHours(updated);
      Alert.alert('OK', 'Horario actualizado');
    } catch (e:any) { Alert.alert('Atención', pickError(e)); }
  };

  const addFixed = async () => {
    if (!frName || !frCode) return Alert.alert('Completar', 'Nombre y código de inventario obligatorios');
    try {
      const r = await LabsApi.addFixedResource(labId, {
        name: frName, inventory_code: frCode, status: frStatus as any, last_maintenance_date: frDate || undefined
      });
      setFixed(prev => [r, ...prev]); setFrName(''); setFrCode(''); setFrStatus('DISPONIBLE'); setFrDate('');
      Alert.alert('OK', 'Recurso fijo agregado');
    } catch (e:any) { Alert.alert('Atención', pickError(e)); }
  };

  const addConsumable = async () => {
    if (!cnName || !cnUnit) return Alert.alert('Completar', 'Nombre y unidad obligatorios');
    try {
      const r = await LabsApi.addConsumable(labId, {
        name: cnName, unit: cnUnit, reorder_point: Number(cnReorder||0), qty_available: Number(cnQty||0)
      });
      setCons(prev => [r, ...prev]); setCnName(''); setCnUnit('unid'); setCnReorder('0'); setCnQty('0');
      Alert.alert('OK', 'Consumible agregado');
    } catch (e:any) { Alert.alert('Atención', pickError(e)); }
  };

  if (loading || !lab) {
    return (
      <SafeAreaView style={[s.screen, s.center]}>
        <ActivityIndicator />
        <Text style={s.muted}>Cargando laboratorio…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.screen}>
      <ScrollView contentContainerStyle={s.container}>
        {/* Header / accesos rápidos */}
        <View style={s.headerCard}>
          <Text style={s.h1}>{lab.name}</Text>
          <Text style={s.sub}>{lab.code} · {lab.location}</Text>

          <View style={s.row}>
            <Pressable style={[s.btn, { backgroundColor:'#2563eb' }]} onPress={() => router.push(`/lab/${labId}/calendar` as any)}>
              <Text style={s.btnTxt}>Calendario</Text>
            </Pressable>
            <Pressable style={[s.btn, { backgroundColor:'#10b981' }]} onPress={() => router.push(`/lab/${labId}/catalog` as any)}>
              <Text style={s.btnTxt}>Catálogo</Text>
            </Pressable>
          </View>
        </View>

        {/* CONTACTOS */}
        <View style={s.card}>
          <Text style={s.h2}>Contactos</Text>
          <TextInput style={s.input} placeholder="Nombre completo" value={cName} onChangeText={setCName} />
          <TextInput style={s.input} placeholder="Cargo / Rol" value={cRole} onChangeText={setCRole} />
          <TextInput style={s.input} placeholder="Teléfono (opcional)" value={cPhone} onChangeText={setCPhone} keyboardType="phone-pad" />
          <TextInput style={s.input} placeholder="Correo" autoCapitalize="none" keyboardType="email-address" value={cEmail} onChangeText={setCEmail} />
          <Button title="Agregar contacto" onPress={addContact}/>
          {contacts.length === 0 ? (
            <Text style={s.empty}>No hay contactos registrados.</Text>
          ) : contacts.map(c => (
            <Text key={c.id} style={s.li}>• {c.name} ({c.role}) – {c.email}</Text>
          ))}
        </View>

        {/* POLÍTICAS */}
        <View style={s.card}>
          <Text style={s.h2}>Políticas</Text>
          <TextInput style={s.input} placeholder="Requisitos académicos" value={reqAcad} onChangeText={setReqAcad}/>
          <TextInput style={s.input} placeholder="Requisitos de seguridad" value={reqSafe} onChangeText={setReqSafe}/>
          <TextInput style={s.input} placeholder="Capacidad máxima (personas)" keyboardType="numeric" value={capMax} onChangeText={setCapMax}/>
          <Button title="Guardar políticas" onPress={savePolicies}/>
          {pol ? <Text style={s.muted}>Última actualización guardada.</Text> : null}
        </View>

        {/* HORARIOS */}
        <View style={s.card}>
          <Text style={s.h2}>Horarios</Text>
          <TextInput style={s.input} placeholder="Día (0=Dom ... 6=Sáb)" keyboardType="numeric" value={hDay} onChangeText={setHDay}/>
          <TextInput style={s.input} placeholder="Abre (HH:mm)" value={hOpen} onChangeText={setHOpen}/>
          <TextInput style={s.input} placeholder="Cierra (HH:mm)" value={hClose} onChangeText={setHClose}/>
          <Button title="Agregar / Actualizar día" onPress={addHour}/>
          {hours.length === 0 ? (
            <Text style={s.empty}>No hay horarios cargados.</Text>
          ) : hours.map(h => (
            <Text key={h.id} style={s.li}>• {dayNames[h.day_of_week] ?? h.day_of_week}: {h.opens} – {h.closes}</Text>
          ))}
        </View>

        {/* RECURSOS FIJOS */}
        <View style={s.card}>
          <Text style={s.h2}>Recursos fijos</Text>
          <TextInput style={s.input} placeholder="Nombre" value={frName} onChangeText={setFrName}/>
          <TextInput style={s.input} placeholder="Código de inventario" value={frCode} onChangeText={setFrCode}/>
          <TextInput style={s.input} placeholder="Estado (DISPONIBLE/RESERVADO/MANTENIMIENTO/INACTIVO)" value={frStatus} onChangeText={setFrStatus}/>
          <TextInput style={s.input} placeholder="Último mantenimiento (YYYY-MM-DD)" value={frDate} onChangeText={setFrDate}/>
          <Button title="Agregar recurso" onPress={addFixed}/>
          {fixed.length === 0 ? (
            <Text style={s.empty}>No hay recursos fijos registrados.</Text>
          ) : fixed.map(f => (
            <Text key={f.id} style={s.li}>• {f.inventory_code} {f.name} [{f.status}]</Text>
          ))}
        </View>

        {/* CONSUMIBLES */}
        <View style={s.card}>
          <Text style={s.h2}>Consumibles</Text>
          <TextInput style={s.input} placeholder="Nombre" value={cnName} onChangeText={setCnName}/>
          <TextInput style={s.input} placeholder="Unidad (ml/g/unid)" value={cnUnit} onChangeText={setCnUnit}/>
          <TextInput style={s.input} placeholder="Punto de reorden" keyboardType="numeric" value={cnReorder} onChangeText={setCnReorder}/>
          <TextInput style={s.input} placeholder="Cantidad disponible" keyboardType="numeric" value={cnQty} onChangeText={setCnQty}/>
          <Button title="Agregar consumible" onPress={addConsumable}/>
          {cons.length === 0 ? (
            <Text style={s.empty}>No hay consumibles registrados.</Text>
          ) : cons.map(c => (
            <Text key={c.id} style={s.li}>• {c.name} {c.qty_available}{c.unit} (reorden {c.reorder_point})</Text>
          ))}
        </View>

        {/* HISTORIAL */}
        <View style={s.card}>
          <Text style={s.h2}>Historial</Text>
          {history.length === 0 ? (
            <Text style={s.empty}>No hay eventos en el historial.</Text>
          ) : history.map(h => (
            <Text key={h.id} style={s.li}>• {h.action} – {new Date(h.created_at).toLocaleString()}</Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:{ flex:1, backgroundColor:'#0b1220' },
  center:{ alignItems:'center', justifyContent:'center' },
  container:{ padding:16, gap:12 },
  headerCard:{ backgroundColor:'#111827', borderRadius:12, padding:12, borderWidth:1, borderColor:'#1f2937' },
  h1:{ color:'#fff', fontSize:22, fontWeight:'800' },
  sub:{ color:'#9ca3af', marginTop:4 },
  row:{ flexDirection:'row', gap:8, marginTop:10 },
  btn:{ flex:1, paddingVertical:10, borderRadius:10, alignItems:'center' },
  btnTxt:{ color:'#fff', fontWeight:'800' },

  card:{ backgroundColor:'#111827', borderRadius:12, padding:12, gap:6, borderWidth:1, borderColor:'#1f2937' },
  h2:{ color:'#e5e7eb', fontWeight:'800', marginBottom:4 },
  input:{ backgroundColor:'#0b1220', borderWidth:1, borderColor:'#334155', borderRadius:10, padding:10, color:'#e5e7eb' },
  li:{ color:'#e5e7eb', marginTop:6 },
  muted:{ color:'#94a3b8', marginTop:6 },
  empty:{ color:'#94a3b8', fontStyle:'italic', marginTop:6 },
});
