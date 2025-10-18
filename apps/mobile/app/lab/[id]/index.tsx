import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';

export default function LabHome() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <View style={s.container}>
      <Text style={s.h1}>Laboratorio #{id}</Text>

      <Pressable style={[s.btn, { backgroundColor:'#2563eb' }]} onPress={() => router.push(`/lab/${id}/calendar` as any)}>
        <Text style={s.btnTxt}>Calendario</Text>
      </Pressable>

      <Pressable style={[s.btn, { backgroundColor:'#10b981' }]} onPress={() => router.push(`/lab/${id}/catalog` as any)}>
        <Text style={s.btnTxt}>Catálogo de recursos</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  container:{ flex:1, padding:16, backgroundColor:'#0b1220', gap:12, justifyContent:'center' },
  h1:{ color:'#fff', fontSize:22, fontWeight:'800', textAlign:'center', marginBottom:8 },
  btn:{ paddingVertical:14, borderRadius:12, alignItems:'center' },
  btnTxt:{ color:'#fff', fontWeight:'800' },
});
