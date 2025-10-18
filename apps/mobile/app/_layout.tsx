import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* Labs */}
        <Stack.Screen name="lab/[id]/details" options={{ title: 'Detalle del Laboratorio' }} />
        <Stack.Screen name="lab/[id]/calendar" options={{ title: 'Calendario' }} />
        <Stack.Screen name="lab/[id]/catalog" options={{ title: 'Catálogo' }} />

        {/* Solicitudes */}
        <Stack.Screen name="requests/index" options={{ title: 'Solicitudes' }} />
        <Stack.Screen name="requests/new" options={{ title: 'Nueva Solicitud' }} />
        <Stack.Screen name="requests/[id]" options={{ title: 'Solicitud' }} />

        {/* Control 1.4 */}
        <Stack.Screen name="requests/[id]/assignments" options={{ title: 'Asignaciones/Devoluciones' }} />
        <Stack.Screen name="requests/[id]/consumptions" options={{ title: 'Consumo de Materiales' }} />
        <Stack.Screen name="requests/[id]/benefits" options={{ title: 'Beneficios Académicos' }} />
        <Stack.Screen name="reports/usage" options={{ title: 'Reporte de Uso' }} />

        {/* Admin */}
        <Stack.Screen name="admin/departments" options={{ title: 'Departamentos' }} />
        <Stack.Screen name="admin/resource-types" options={{ title: 'Tipos de Recurso' }} />
        {/* NUEVO 4.1–4.3 */}
        <Stack.Screen name="admin/users" options={{ title: 'Usuarios' }} />
        <Stack.Screen name="admin/settings" options={{ title: 'Parámetros Globales' }} />
        <Stack.Screen name="admin/audit" options={{ title: 'Auditoría' }} />
        {/* NUEVO 4.4 */}
        <Stack.Screen name="admin/reports" options={{ title: 'Reportes Institucionales' }} />

        {/* Técnico */}
        <Stack.Screen name="tech/index" options={{ title: 'Panel Técnico' }} />
        <Stack.Screen name="tech/approved" options={{ title: 'Solicitudes Aprobadas' }} />
        <Stack.Screen name="tech/assignments" options={{ title: 'Asignaciones' }} />

        {/* Inventario */}
        <Stack.Screen name="inventory/consumables" options={{ title: 'Consumibles' }} />
        <Stack.Screen name="inventory/movements" options={{ title: 'Movimientos de Inventario' }} />
        <Stack.Screen name="inventory/fixed-status" options={{ title: 'Estado de Equipo Fijo' }} />

        {/* Mantenimiento */}
        <Stack.Screen name="maintenance/orders/index" options={{ title: 'Órdenes de Mantenimiento' }} />
        <Stack.Screen name="maintenance/orders/new" options={{ title: 'Nueva Orden' }} />
        <Stack.Screen name="maintenance/orders/[id]" options={{ title: 'Detalle Orden' }} />

        {/* Reportes */}
        <Stack.Screen name="reports/index" options={{ title: 'Reportes Operativos' }} />

        {/* Auth / Users */}
        <Stack.Screen name="auth/login" options={{ title: 'Iniciar sesión' }} />
        <Stack.Screen name="auth/register" options={{ title: 'Crear cuenta' }} />
        <Stack.Screen name="users/profile" options={{ title: 'Mi perfil' }} />
        <Stack.Screen name="users/trainings" options={{ title: 'Mis capacitaciones' }} />
        <Stack.Screen name="users/availability" options={{ title: 'Disponibilidad' }} />

        {/* 3.4 y 3.5 */}
        <Stack.Screen name="users/history" options={{ title: 'Mi historial' }} />
        <Stack.Screen name="users/notifications" options={{ title: 'Notificaciones' }} />

        {/* Browse */}
        <Stack.Screen name="browse/labs" options={{ title: 'Buscar Laboratorios' }} />
        <Stack.Screen name="browse/resources" options={{ title: 'Buscar Recursos' }} />
        <Stack.Screen name="browse/calendar" options={{ title: 'Calendario' }} />

        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
