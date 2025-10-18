// services/apiBase.ts
export const API_BASE = (() => {
  const raw = process.env.EXPO_PUBLIC_API_URL ?? "";
  // Normaliza: quita "/" finales y un posible "/api" final, y luego agrega "/api"
  return raw.replace(/\/+$/, "").replace(/\/api$/i, "") + "/api";
})();