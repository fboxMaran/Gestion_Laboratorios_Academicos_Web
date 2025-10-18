// apps/app/services/availability.ts
import { api } from './api';
import {
  ResourceType, Resource, ResourcePhoto,
  Slot, SlotStatus, Subscription, ChangeLog
} from '@/types/availability';

// Util para listas que podrían devolver 404 (trátalo como vacío)
const swallow404Array = async <T>(fn: () => Promise<T[]>): Promise<T[]> => {
  try { return await fn(); }
  catch (e: any) { if (e?.response?.status === 404) return []; throw e; }
};

// ======= Resource Types
export const ResourceTypesApi = {
  list: async (): Promise<ResourceType[]> =>
    swallow404Array(() => api.get('/resource-types').then(r => r.data)),
  create: async (body: { name: string; category?: 'EQUIPO'|'MATERIAL'|'SOFTWARE'|'OTRO' }): Promise<ResourceType> =>
    (await api.post('/resource-types', body)).data,
};

// ======= Resources (catálogo por lab)
export const ResourcesApi = {
  listByLab: async (labId: number, params?: { type_id?: number }): Promise<Resource[]> =>
    swallow404Array(() => api.get(`/labs/${labId}/resources`, { params }).then(r => r.data)),

  create: async (
    labId: number,
    payload: {
      type_id: number; name: string; description?: string; specs?: any;
      status?: Resource['status']; qty_available?: number;
    }
  ): Promise<Resource> =>
    (await api.post(`/labs/${labId}/resources`, payload)).data,

  update: async (id: number, payload: Partial<Resource>): Promise<Resource> =>
    (await api.put(`/resources/${id}`, payload)).data,

  photos: async (id: number): Promise<ResourcePhoto[]> =>
    swallow404Array(() => api.get(`/resources/${id}/photos`).then(r => r.data)),

  addPhoto: async (id: number, url: string): Promise<ResourcePhoto> =>
    (await api.post(`/resources/${id}/photos`, { url })).data,
};

// ======= Calendar (slots)
export const CalendarApi = {
  list: async (
    labId: number,
    params?: { from?: string; to?: string; resource_id?: number }
  ): Promise<Slot[]> =>
    swallow404Array(() => api.get(`/labs/${labId}/slots`, { params }).then(r => r.data)),

  create: async (labId: number, payload: {
    resource_id?: number | null;
    starts_at: string; ends_at: string;
    status: SlotStatus; title?: string; reason?: string; user_id?: number;
  }): Promise<Slot> =>
    (await api.post(`/labs/${labId}/slots`, payload)).data,

  setStatus: async (slotId: number, status: SlotStatus, user_id?: number): Promise<Slot> =>
    (await api.put(`/slots/${slotId}/status`, { status, user_id })).data,

  remove: async (slotId: number, user_id?: number): Promise<void> => {
    await api.delete(`/slots/${slotId}`, { data: { user_id } });
  },
};

// ======= Subscriptions & Changelog
export const SubscriptionsApi = {
  subscribeLab: async (user_id: number, lab_id: number): Promise<Subscription> =>
    (await api.post('/subscriptions', { user_id, lab_id })).data,

  subscribeResource: async (user_id: number, resource_id: number): Promise<Subscription> =>
    (await api.post('/subscriptions', { user_id, resource_id })).data,

  listByUser: async (user_id: number): Promise<Subscription[]> =>
    swallow404Array(() => api.get('/subscriptions', { params: { user_id } }).then(r => r.data)),
};

export const ChangeLogApi = {
  list: async (entity_type: 'resource'|'slot', entity_id: number): Promise<ChangeLog[]> =>
    swallow404Array(() => api.get('/changelog', { params: { entity_type, entity_id } }).then(r => r.data)),
};
