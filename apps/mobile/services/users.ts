// apps/mobile/services/users.ts
import { api } from "./api";  // ✅ usa la instancia con token

export type UserHistoryRow = {
  kind: 'RESERVA' | 'ASIGNACION' | 'CONSUMO' | 'BENEFICIO' | 'CAPACITACION';
  ref_id: number;
  lab_id: number | null;
  at: string | null;
  state: string | null;
  purpose: string | null;
  resource_id: number | null;
  qty: number | null;
  hours: number | null;
  credits: number | null;
};

export const UsersApi = {
  me: async () => (await api.get('/users/me')).data,
  updateMe: async (payload: {
    full_name?: string; student_id?: string; teacher_code?: string;
    program_department?: string; phone?: string;
  }) => (await api.put('/users/me', payload)).data,
  myTrainings: async () => (await api.get('/users/me/trainings')).data,
  upsertTraining: async (payload: { training_id: number; completed_at?: string; expires_at?: string }) =>
    (await api.post('/users/me/trainings', payload)).data,
  labRequirements: async (lab_id: number) =>
    (await api.get('/users/me/lab-requirements', { params: { lab_id } })).data,
  history: async () => (await api.get('/users/me/history')).data,
  historyCsv: async (): Promise<string> =>
    (await api.get('/users/me/history', { params: { format: 'csv' }, responseType: 'text' })).data,
};
