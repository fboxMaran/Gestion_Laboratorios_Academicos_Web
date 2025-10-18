// services/browse.ts
import axios from "axios";
const BASE = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "") + "/api";

export const BrowseApi = {
  labs: async (params: { q?: string; location?: string }) => {
    const { data } = await axios.get(`${BASE}/browse/labs`, { params });
    return data as any[];
  },
  resources: async (params: {
    lab_id?: number; type_id?: number; q?: string;
    from?: string; to?: string;
    show_all?: boolean; only_eligible?: boolean;
  }) => {
    const { data } = await axios.get(`${BASE}/browse/resources`, { params });
    return data as any[];
  },
  calendar: async (params: { lab_id: number; resource_id?: number; from?: string; to?: string }) => {
    const { data } = await axios.get(`${BASE}/browse/calendar`, { params });
    return data as any[];
  },
};
