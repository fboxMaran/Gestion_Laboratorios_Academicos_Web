// services/maintenance.ts
import axios from "axios";
const BASE = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "") + "/api";

export const MaintenanceApi = {
  createOrder: async (payload: {
    lab_id: number; resource_id?: number; fixed_id?: number; type: 'PREVENTIVO'|'CORRECTIVO';
    scheduled_at?: string; technician_id?: number; technician_name?: string;
    description?: string; notify_on_disponible?: boolean;
  }) => {
    const { data } = await axios.post(`${BASE}/maintenance/orders`, payload);
    return data as any;
  },
  listOrders: async (params: { lab_id?: number; status?: string; resource_id?: number; fixed_id?: number }) => {
    const { data } = await axios.get(`${BASE}/maintenance/orders`, { params });
    return data as any[];
  },
  getOrder: async (id: number) => {
    const { data } = await axios.get(`${BASE}/maintenance/orders/${id}`);
    return data as any;
  },
  start: async (id: number, payload: { started_at?: string }) => {
    const { data } = await axios.put(`${BASE}/maintenance/orders/${id}/start`, payload);
    return data as any;
  },
  cancel: async (id: number, payload: { reason?: string }) => {
    const { data } = await axios.put(`${BASE}/maintenance/orders/${id}/cancel`, payload);
    return data as any;
  },
  complete: async (id: number, payload: { result_status?: 'DISPONIBLE'|'INACTIVO'|'MANTENIMIENTO'|'RESERVADO'; used_parts?: string; notes?: string }) => {
    const { data } = await axios.put(`${BASE}/maintenance/orders/${id}/complete`, payload);
    return data as any;
  },
};
