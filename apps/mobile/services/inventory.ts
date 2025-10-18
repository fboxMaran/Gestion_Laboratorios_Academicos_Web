// services/inventory.ts
import axios from "axios";
const BASE = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "") + "/api";

export const InventoryApi = {
  listConsumables: async (params: { lab_id?: number }) => {
    const { data } = await axios.get(`${BASE}/inventory/consumables`, { params });
    return data as any[];
  },
  moveConsumable: async (id: number, payload: {
    lab_id: number; user_id?: number; type: 'IN'|'OUT'|'ADJUST';
    qty?: number; reason?: string; notes?: string;
  }) => {
    const { data } = await axios.post(`${BASE}/inventory/consumables/${id}/movements`, payload);
    return data as any;
  },
  updateFixedStatus: async (id: number, payload: {
    lab_id: number; status: 'DISPONIBLE'|'RESERVADO'|'MANTENIMIENTO'|'INACTIVO';
    notes?: string; reason?: string; user_id?: number;
  }) => {
    const { data } = await axios.put(`${BASE}/inventory/resources-fixed/${id}/status`, payload);
    return data as any;
  },
  listMovements: async (params: { lab_id?: number; fixed_id?: number; consumable_id?: number; limit?: number }) => {
    const { data } = await axios.get(`${BASE}/inventory/movements`, { params });
    return data as any[];
  },
};
