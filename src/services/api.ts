import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3333',
});

api.interceptors.request.use(async (config) => {
  try {
    const token = localStorage.getItem('@App:token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  } catch (error) {
    return Promise.reject(error);
  }
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      const { useAuth } = require('../contexts/AuthContext');
      const auth = useAuth();
      
      // Deslogar o usuário
      auth.signOut();
    }
    
    return Promise.reject(error);
  }
);

export default api;