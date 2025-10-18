// apps/mobile/services/auth.ts
import { api } from './api';

export type Role = 'ESTUDIANTE' | 'DOCENTE' | 'TECNICO' | 'ADMIN';

export interface User {
  id: number;
  role: Role;
  email: string;
  full_name: string;
  student_id?: string | null;
  teacher_code?: string | null;
  program_department?: string | null;
  phone?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export const AuthApi = {
  async register(payload: {
    role: 'ESTUDIANTE' | 'DOCENTE';
    email: string;
    password: string;
    full_name: string;
    program_department?: string;
    student_id?: string;
    teacher_code?: string;
    phone?: string;
  }): Promise<AuthResponse> {
    const { data } = await api.post('/auth/register', payload);
    return data;
  },

  async login(payload: { email: string; password: string }): Promise<AuthResponse> {
    const { data } = await api.post('/auth/login', payload);
    return data;
  },

  async me(): Promise<User> {
    const { data } = await api.get('/auth/me');
    return data?.user ?? data;
  },

  setToken(token: string) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  },

  clearToken() {
    delete api.defaults.headers.common['Authorization'];
  },
};
