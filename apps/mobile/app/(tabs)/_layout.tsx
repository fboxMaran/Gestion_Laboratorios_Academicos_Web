// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" }, // Oculta la barra inferior en TODO el grupo (tabs)
      }}
    >
      {/* Ocultamos Home de la barra (accesible por ruta igual) */}
      <Tabs.Screen name="index" options={{ href: null }} />
      {/* Si tienes otras pantallas dentro de (tabs) y quieres ocultarlas también del tab bar:
          <Tabs.Screen name="labs" options={{ href: null }} />
          <Tabs.Screen name="inicio" options={{ href: null }} />
      */}
    </Tabs>
  );
}
