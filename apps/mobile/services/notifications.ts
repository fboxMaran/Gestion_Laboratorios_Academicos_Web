// services/notifications.ts
import axios from 'axios';

const BASE = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
const API = `${BASE}/notifications`;

export type NotificationRow = {
  id: number;
  title: string;
  body: string;
  meta?: any;
  queued_at: string;
  sent_at?: string | null;
};

export const NotificationsApi = {
  async list(params?: { since?: string }): Promise<NotificationRow[]> {
    const { data } = await axios.get(API, { params });
    return data;
    // GET /api/notifications?since=YYYY-MM-DD
  },
  async markSeen(id: number) {
    const { data } = await axios.post(`${API}/${id}/seen`);
    return data;
  },
  async markAllSeen() {
    const { data } = await axios.post(`${API}/mark-all-seen`);
    return data;
  },
};
