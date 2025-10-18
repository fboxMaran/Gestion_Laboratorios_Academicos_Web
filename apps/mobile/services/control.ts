// apps/app/services/control.ts
import axios from 'axios';

const BASE = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
const api = axios.create({ baseURL: `${BASE}/api` });

export const ControlApi = {
  // assignments
  async createAssignments(requestId: number, items: Array<{
    resource_id?: number; fixed_id?: number; qty?: number; due_at?: string; notes?: string; user_id?: number;
  }>) {
    const { data } = await api.post(`/requests/${requestId}/assignments`, { items });
    return data as any[];
  },
  async listAssignments(requestId: number) {
    const { data } = await api.get(`/requests/${requestId}/assignments`);
    return data as any[];
  },
  async returnAssignment(assignmentId: number, body: { returned_at?: string; status?: string; notes?: string }) {
    const { data } = await api.put(`/assignments/${assignmentId}/return`, body);
    return data as any;
  },

  // consumptions
  async createConsumption(requestId: number, body: { consumable_id: number; qty: number; used_at?: string; used_by?: number; notes?: string }) {
    const { data } = await api.post(`/requests/${requestId}/consumptions`, body);
    return data as any;
  },
  async listConsumptions(requestId: number) {
    const { data } = await api.get(`/requests/${requestId}/consumptions`);
    return data as any[];
  },

  // benefits
  async addBenefit(requestId: number, body: { user_id: number; hours?: number; credits?: number; certificate_url?: string; notes?: string }) {
    const { data } = await api.post(`/requests/${requestId}/benefits`, body);
    return data as any;
  },
  async listBenefits(requestId: number) {
    const { data } = await api.get(`/requests/${requestId}/benefits`);
    return data as any[];
  },

  // reports
  async reportUsage(lab_id: number, from: string, to: string) {
    const { data } = await api.get(`/reports/usage`, { params: { lab_id, from, to } });
    return data as { assignments: any[]; consumptions: any[] };
  }
};
