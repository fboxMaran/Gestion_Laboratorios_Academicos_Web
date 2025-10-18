export type RequestRow = {
  id: number;
  lab_id: number;
  requester_name: string;
  requester_email: string;
  requester_role: string;
  requester_program: string | null;
  purpose: string;
  priority: 'NORMAL'|'ALTA';
  requested_from: string;
  requested_to: string;
  requirements_ok: boolean;
  status: 'PENDIENTE'|'APROBADA'|'RECHAZADA'|'NECESITA_INFO'|'CANCELADA';
  reviewer_note: string | null;
  reviewer_id: number | null;
  created_at: string;
  updated_at: string;
};

export type RequestItem = {
  id: number;
  request_id: number;
  resource_id: number | null;
  qty: number;
  // opcional en detail expandido
  resource_name?: string | null;
  type_id?: number | null;
};

export type RequestMessage = {
  id: number;
  request_id: number;
  sender: 'USUARIO'|'ENCARGADO';
  message: string;
  created_at: string;
};

export type RequestDetail = RequestRow & {
  items: RequestItem[];
  messages: RequestMessage[];
  policies?: any;
  availability?: any;
};

export type RequestCreatePayload = {
  lab_id: number;
  requester_name: string;
  requester_email: string;
  requester_role: string;
  requester_program?: string;
  purpose: string;
  priority?: 'NORMAL'|'ALTA';
  requested_from: string;
  requested_to: string;
  headcount?: number;
  items?: { resource_id?: number; qty?: number }[];
};
