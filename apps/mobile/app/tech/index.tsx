import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function TechHome() {
  const router = useRouter();
  const go = (p: string) => router.push(p as any);

  return (
    <View style={s.container}>
      <Text style={s.h1}>Panel técnico</Text>

      <Pressable style={[s.btn, { backgroundColor: '#0ea5e9' }]} onPress={() => go('/tech/approved')}>
        <Text style={s.txt}>Solicitudes aprobadas</Text>
      </Pressable>

      <Pressable style={[s.btn, { backgroundColor: '#22c55e' }]} onPress={() => go('/tech/assignments')}>
        <Text style={s.txt}>Asignaciones</Text>
      </Pressable>

      <Pressable style={[s.btn, { backgroundColor: '#f59e0b' }]} onPress={() => go('/inventory/consumables')}>
        <Text style={s.txt}>Consumibles</Text>
      </Pressable>

      <Pressable style={[s.btn, { backgroundColor: '#6366f1' }]} onPress={() => go('/inventory/movements')}>
        <Text style={s.txt}>Movimientos</Text>
      </Pressable>

      <Pressable style={[s.btn, { backgroundColor: '#8b5cf6' }]} onPress={() => go('/inventory/fixed-status')}>
        <Text style={s.txt}>Estado equipo fijo</Text>
      </Pressable>

      <Pressable style={[s.btn, { backgroundColor: '#14b8a6' }]} onPress={() => go('/maintenance/orders')}>
        <Text style={s.txt}>Órdenes de mantenimiento</Text>
      </Pressable>

      <Pressable style={[s.btn, { backgroundColor: '#10b981' }]} onPress={() => go('/maintenance/orders/new')}>
        <Text style={s.txt}>Nueva orden</Text>
      </Pressable>

      <Pressable style={[s.btn, { backgroundColor: '#0ea5e9' }]} onPress={() => go('/reports')}>
        <Text style={s.txt}>Reportes</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container:{ flex:1, padding:16, backgroundColor:'#0b1220', justifyContent:'center' },
  h1:{ color:'#fff', fontWeight:'800', fontSize:22, textAlign:'center', marginBottom:18 },
  btn:{ padding:14, borderRadius:10, marginVertical:6, alignItems:'center' },
  txt:{ color:'#fff', fontWeight:'700' },
});
