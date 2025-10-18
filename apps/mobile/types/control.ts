// apps/app/types/control.ts
export type AssignmentStatus = 'ASIGNADO'|'DEVUELTO'|'PERDIDO'|'DANADO';

export interface Assignment {
  id: number;
  request_id: number;
  lab_id: number;
  user_id: number | null;
  resource_id: number | null;
  fixed_id: number | null;
  qty: number;
  status: AssignmentStatus;
  assigned_at: string;
  due_at: string | null;
  returned_at: string | null;
  notes: string | null;
}

export interface Consumption {
  id: number;
  request_id: number;
  lab_id: number;
  consumable_id: number;
  qty: number;
  used_at: string;
  used_by: number | null;
  notes: string | null;
}

export interface Benefit {
  id: number;
  request_id: number;
  lab_id: number;
  user_id: number;
  hours: number;
  credits: number;
  certificate_url: string | null;
  notes: string | null;
  created_at: string;
}
