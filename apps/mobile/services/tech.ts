// services/tech.ts
import axios from "axios";
const BASE = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "") + "/api";

export const TechApi = {
  listApproved: async (params: { lab_id?: number; from?: string; to?: string; overdue?: boolean }) => {
    const { data } = await axios.get(`${BASE}/requests/approved`, { params });
    return data as any[];
  },
  precheck: async (id: number) => {
    const { data } = await axios.get(`${BASE}/requests/${id}/precheck`);
    return data as any;
  },
  createAssignment: async (payload: {
    request_id: number; lab_id: number; user_id?: number;
    resource_id?: number; fixed_id?: number; qty?: number;
    due_at?: string; notes?: string; actor_user_id?: number;
  }) => {
    const { data } = await axios.post(`${BASE}/assignments`, payload);
    return data as any;
  },
  returnAssignment: async (id: number, payload: { notes?: string; actor_user_id?: number; notify_user_id?: number }) => {
    const { data } = await axios.put(`${BASE}/assignments/${id}/return`, payload);
    return data as any;
  },
  markLost: async (id: number, payload: { notes?: string; actor_user_id?: number; notify_user_id?: number }) => {
    const { data } = await axios.put(`${BASE}/assignments/${id}/lost`, payload);
    return data as any;
  },
  markDamaged: async (id: number, payload: { notes?: string; actor_user_id?: number; notify_user_id?: number }) => {
    const { data } = await axios.put(`${BASE}/assignments/${id}/damaged`, payload);
    return data as any;
  },
  listAssignments: async (params: { request_id?: number; lab_id?: number }) => {
    const { data } = await axios.get(`${BASE}/assignments`, { params });
    return data as any[];
  },
};
