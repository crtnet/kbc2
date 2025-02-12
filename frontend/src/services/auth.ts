import api from './api';

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  type: 'parent' | 'child';
}

export const register = async (data: RegisterData) => {
  const response = await api.post('/auth/register', data);
  return response.data;
};

export const login = async (email: string, password: string) => {
  const response = await api.post('/auth/login', { email, password });
  return response.data;
};