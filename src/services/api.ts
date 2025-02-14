import axios from 'axios';
import { signOut } from '../contexts/AuthContext';

const api = axios.create({
  baseURL: 'http://localhost:3000' // Ajuste conforme sua API
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      // Deslogar o usuário em caso de resposta 401
      signOut();
    }
    return Promise.reject(error);
  }
);

export default api;