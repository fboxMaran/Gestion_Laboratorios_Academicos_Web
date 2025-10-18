// app/dash/_layout.tsx
import { Stack } from "expo-router";

export default function DashLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTitleAlign: "center",
        headerStyle: { backgroundColor: "#0b1220" },
        headerTintColor: "#e5e7eb",
      }}
    >
      <Stack.Screen name="admin/index" options={{ title: "Panel · Admin" }} />
      <Stack.Screen name="tech/index" options={{ title: "Panel · Técnico" }} />
      <Stack.Screen name="teacher/index" options={{ title: "Panel · Docente" }} />
      <Stack.Screen name="student/index" options={{ title: "Panel · Estudiante" }} />
    </Stack>
  );
}
