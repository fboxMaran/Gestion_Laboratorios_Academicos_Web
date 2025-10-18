// apps/mobile/services/admin.ts
import axios from 'axios';

const BASE = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');

export type UserRole = 'ESTUDIANTE' | 'DOCENTE' | 'TECNICO' | 'ADMIN';

export type AdminUser = {
  id: number;
  role: UserRole;
  email: string;
  full_name: string;
  student_id?: string | null;
  teacher_code?: string | null;
  program_department?: string | null;
  phone?: string | null;
  is_active: boolean;
  created_at: string;
};

export type AuditQuery = {
  user_id?: number;
  module?: string;
  action?: string;
  from?: string;    // ISO o YYYY-MM-DD
  to?: string;      // ISO o YYYY-MM-DD
  q?: string;       // búsqueda libre
  limit?: number;
  offset?: number;
};

// ====== NUEVO: tipos para Reportes Institucionales (4.4) ======
export type UsageRow = {
  period_start: string;          // ISO
  period_group: string | null;   // bucket (day/week/month trunc)
  reservas: number;
  prestamos: number;
  mantenimientos: number;
};

export type InventoryRow = {
  department_id: number;
  department_name: string;
  lab_id: number;
  lab_name: string;
  status: string;
  total: number;
};

export type ConsumptionRow = {
  department_id: number;
  department_name: string;
  lab_id: number;
  lab_name: string;
  consumable_id: number;
  consumable_name: string;
  unit: string;
  total_qty: number;
};

export type PerformanceRow = {
  department_id: number;
  department_name: string;
  lab_id: number;
  lab_name: string;
  avg_seconds_to_approve: number | null;
  avg_seconds_to_reject: number | null;
  approved: number;
  rejected: number;
  total_processed: number;
  seconds_total: number;
  seconds_available: number;
  availability_ratio: number | null; // 0..1
};

export const AdminApi = {
  users: {
    list: async (params?: { q?: string; role?: UserRole; is_active?: boolean }) => {
      const { data } = await axios.get(`${BASE}/admin/users`, { params });
      return data as AdminUser[];
    },
    get: async (id: number) => {
      const { data } = await axios.get(`${BASE}/admin/users/${id}`);
      return data as AdminUser;
    },
    create: async (payload: {
      role: UserRole; email: string; full_name: string;
      student_id?: string; teacher_code?: string;
      program_department?: string; phone?: string;
      password?: string;
    }) => {
      const { data } = await axios.post(`${BASE}/admin/users`, payload);
      return data as AdminUser;
    },
    update: async (id: number, payload: Partial<{
      role: UserRole; full_name: string; student_id: string;
      teacher_code: string; program_department: string; phone: string; is_active: boolean;
    }>) => {
      const { data } = await axios.put(`${BASE}/admin/users/${id}`, payload);
      return data as AdminUser;
    },
    deactivate: async (id: number) => {
      const { data } = await axios.post(`${BASE}/admin/users/${id}/deactivate`);
      return data as { ok: true };
    },
  },

  roles: {
    list: async () => {
      const { data } = await axios.get(`${BASE}/admin/roles`);
      return data as UserRole[];
    },
    set: async (id: number, role: UserRole) => {
      const { data } = await axios.post(`${BASE}/admin/users/${id}/role`, { role });
      return data as AdminUser;
    },
  },

  settings: {
    get: async () => {
      const { data } = await axios.get(`${BASE}/admin/settings`);
      return data as any;
    },
    update: async (payload: any) => {
      const { data } = await axios.put(`${BASE}/admin/settings`, payload);
      return data as any;
    },
  },

  audit: {
    // (lo tuyo existente; lo mantengo igual)
    list: async (params: AuditQuery = {}) => {
      const { data } = await axios.get(`${BASE}/admin/audit`, { params });
      return data as any[];
    },
    csv: async (params: AuditQuery = {}) => {
      const { data } = await axios.get(`${BASE}/admin/audit/export`, {
        params,
        responseType: 'text',
      });
      return data as string; // CSV plano
    },
  },

  // ====== NUEVO: Reportes Institucionales (4.4) ======
  reports: {
    // 1) Uso global
    usageGlobal: async (params: {
      from?: string; to?: string; group_by?: 'day'|'week'|'month'; lab_id?: number; department_id?: number;
    } = {}) => {
      const { data } = await axios.get(`${BASE}/admin/reports/usage-global`, { params });
      return data as UsageRow[];
    },
    usageGlobalCsv: async (params: {
      from?: string; to?: string; group_by?: 'day'|'week'|'month'; lab_id?: number; department_id?: number;
    } = {}) => {
      const { data } = await axios.get(`${BASE}/admin/reports/usage-global`, {
        params: { ...params, format: 'csv' },
        responseType: 'text',
      });
      return data as string;
    },

    // 2) Inventario institucional
    inventoryInstitutional: async (params: { lab_id?: number; department_id?: number } = {}) => {
      const { data } = await axios.get(`${BASE}/admin/reports/inventory-institutional`, { params });
      return data as InventoryRow[];
    },
    inventoryInstitutionalCsv: async (params: { lab_id?: number; department_id?: number } = {}) => {
      const { data } = await axios.get(`${BASE}/admin/reports/inventory-institutional`, {
        params: { ...params, format: 'csv' },
        responseType: 'text',
      });
      return data as string;
    },

    // 3) Consumo de materiales
    consumption: async (params: { from?: string; to?: string; lab_id?: number; department_id?: number } = {}) => {
      const { data } = await axios.get(`${BASE}/admin/reports/consumption`, { params });
      return data as ConsumptionRow[];
    },
    consumptionCsv: async (params: { from?: string; to?: string; lab_id?: number; department_id?: number } = {}) => {
      const { data } = await axios.get(`${BASE}/admin/reports/consumption`, {
        params: { ...params, format: 'csv' },
        responseType: 'text',
      });
      return data as string;
    },

    // 4) Desempeño
    performance: async (params: { from?: string; to?: string; lab_id?: number; department_id?: number } = {}) => {
      const { data } = await axios.get(`${BASE}/admin/reports/performance`, { params });
      return data as PerformanceRow[];
    },
    performanceCsv: async (params: { from?: string; to?: string; lab_id?: number; department_id?: number } = {}) => {
      const { data } = await axios.get(`${BASE}/admin/reports/performance`, {
        params: { ...params, format: 'csv' },
        responseType: 'text',
      });
      return data as string;
    },
  },
};
