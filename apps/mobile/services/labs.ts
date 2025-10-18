// mobile/services/labs.ts
import { api } from './api';
import {
  Lab, Department, LabContact, LabPolicies, LabHour,
  FixedResource, Consumable, LabHistory
} from '@/types/labs';

export const DepartmentsApi = {
  list: async (): Promise<Department[]> => {
    const { data } = await api.get('/departments');
    return data;
  },
  create: async (payload: { name: string; email_domain: string }): Promise<Department> => {
    const { data } = await api.post('/departments', payload);
    return data;
  },
};

export const LabsApi = {
  list: async (): Promise<Lab[]> => {
    const { data } = await api.get('/labs');
    return data;
  },
  create: async (payload: {
    department_id: number; code: string; name: string; location: string; description?: string;
  }): Promise<Lab> => {
    const { data } = await api.post('/labs', payload);
    return data;
  },
  get: async (id: number): Promise<Lab> => {
    const { data } = await api.get(`/labs/${id}`);
    return data;
  },
  update: async (id: number, payload: Partial<Lab>): Promise<Lab> => {
    const { data } = await api.put(`/labs/${id}`, payload);
    return data;
  },

  // Contacts
  addContact: async (id: number, payload: Omit<LabContact,'id'|'lab_id'|'created_at'>): Promise<LabContact> => {
    const { data } = await api.post(`/labs/${id}/contacts`, payload);
    return data;
  },
  listContacts: async (id: number): Promise<LabContact[]> => {
    const { data } = await api.get(`/labs/${id}/contacts`);
    return data;
  },

  // Policies
  upsertPolicies: async (id: number, payload: Omit<LabPolicies,'lab_id'>): Promise<LabPolicies> => {
    const { data } = await api.put(`/labs/${id}/policies`, payload);
    return data;
  },
  getPolicies: async (id: number): Promise<LabPolicies | null> => {
    const { data } = await api.get(`/labs/${id}/policies`);
    return data ?? null;
  },

  // Hours
  setHours: async (id: number, hours: Omit<LabHour,'id'|'lab_id'>[]): Promise<LabHour[]> => {
    const { data } = await api.put(`/labs/${id}/hours`, { hours });
    return data;
  },
  getHours: async (id: number): Promise<LabHour[]> => {
    const { data } = await api.get(`/labs/${id}/hours`);
    return data;
  },

  // Fixed resources
  addFixedResource: async (id: number, payload: Omit<FixedResource,'id'|'lab_id'>): Promise<FixedResource> => {
    const { data } = await api.post(`/labs/${id}/resources-fixed`, payload);
    return data;
  },
  listFixedResources: async (id: number): Promise<FixedResource[]> => {
    const { data } = await api.get(`/labs/${id}/resources-fixed`);
    return data;
  },

  // Consumables
  addConsumable: async (id: number, payload: Omit<Consumable,'id'|'lab_id'>): Promise<Consumable> => {
    const { data } = await api.post(`/labs/${id}/consumables`, payload);
    return data;
  },
  listConsumables: async (id: number): Promise<Consumable[]> => {
    const { data } = await api.get(`/labs/${id}/consumables`);
    return data;
  },

  // History
  history: async (id: number): Promise<LabHistory[]> => {
    const { data } = await api.get(`/labs/${id}/history`);
    return data;
  },
};
