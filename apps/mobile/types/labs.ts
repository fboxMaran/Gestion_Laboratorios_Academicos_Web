// mobile/types/labs.ts
export type Department = { id: number; name: string; email_domain: string };

export type Lab = {
  id: number;
  department_id: number;
  code: string;
  name: string;
  location: string;
  description?: string | null;
  department_name?: string;
};

export type LabContact = {
  id: number;
  lab_id: number;
  name: string;
  role: string;
  phone?: string | null;
  email: string;
  created_at: string;
};

export type LabPolicies = {
  lab_id: number;
  academic_requirements?: string | null;
  safety_requirements?: string | null;
  capacity_max?: number | null;
  created_at?: string;
  updated_at?: string;
};

export type LabHour = {
  id: number;
  lab_id: number;
  day_of_week: number; // 0=Dom ... 6=Sáb
  opens: string;       // "08:00:00"
  closes: string;      // "12:00:00"
};

export type FixedResource = {
  id: number;
  lab_id: number;
  name: string;
  inventory_code: string;
  status: 'DISPONIBLE'|'RESERVADO'|'MANTENIMIENTO'|'INACTIVO';
  last_maintenance_date?: string | null;
};

export type Consumable = {
  id: number;
  lab_id: number;
  name: string;
  unit: string;
  reorder_point: number;
  qty_available: number;
};

export type LabHistory = {
  id: number;
  lab_id: number;
  user_id?: number | null;
  action: string;
  detail?: any;
  created_at: string;
};
