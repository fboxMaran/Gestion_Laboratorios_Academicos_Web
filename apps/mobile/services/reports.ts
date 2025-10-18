// services/reports.ts
import axios from "axios";
const BASE = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "") + "/api";

export const ReportsApi = {
  usage: async (params: { lab_id: number; from?: string; to?: string; limit?: number }) => {
    const { data } = await axios.get(`${BASE}/reports/usage`, { params });
    return data as any;
  },
  inventory: async (params: { lab_id: number; from?: string; to?: string }) => {
    const { data } = await axios.get(`${BASE}/reports/inventory`, { params });
    return data as any;
  },
  maintenance: async (params: { lab_id: number; from?: string; to?: string }) => {
    const { data } = await axios.get(`${BASE}/reports/maintenance`, { params });
    return data as any;
  },
  buildCsvUrl: (kind: 'usage'|'inventory'|'maintenance', params: { lab_id: number; from?: string; to?: string; limit?: number }) => {
    const usp = new URLSearchParams({ ...params as any, format: 'csv' }).toString();
    return `${BASE}/reports/${kind}?${usp}`;
  }
};
