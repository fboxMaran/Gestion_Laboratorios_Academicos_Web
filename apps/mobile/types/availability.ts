export type ResourceType = { id: number; code: string; name: string; category: 'EQUIPO'|'MATERIAL'|'SOFTWARE'|'OTRO' };

export type Resource = {
  id: number;
  lab_id: number;
  type_id: number;
  name: string;
  description?: string | null;
  specs?: any;
  status: 'DISPONIBLE'|'RESERVADO'|'MANTENIMIENTO'|'INACTIVO';
  qty_available: number;
  type_name?: string;
  type_code?: string;
  request_url?: string | null; // enlace directo a solicitud
  
};

export type ResourcePhoto = {
  id: number;
  resource_id: number;
  url: string;
  created_at: string;
};

export type SlotStatus =
  | 'DISPONIBLE'
  | 'RESERVADO'
  | 'MANTENIMIENTO'
  | 'INACTIVO'
  | 'BLOQUEADO'
  | 'EXCLUSIVO';

export type Slot = {
  id: number;
  lab_id: number;
  resource_id?: number | null;
  starts_at: string; // ISO
  ends_at: string;   // ISO
  status: SlotStatus;
  title?: string | null;
  reason?: string | null;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
};

export type Subscription = {
  id: number;
  user_id: number;
  lab_id?: number | null;
  resource_id?: number | null;
  trigger_status: 'DISPONIBLE';
  created_at: string;
};

export type ChangeLog = {
  id: number;
  entity_type: 'resource'|'slot';
  entity_id: number;
  user_id?: number | null;
  action: 'CREATE'|'UPDATE'|'DELETE'|'STATUS_CHANGE';
  detail?: any;
  created_at: string;
};

