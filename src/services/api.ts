import axios from 'axios';
import { signOut } from '../contexts/AuthContext';

const api = axios.create({
  baseURL: 'http://localhost:3000' // Ajuste conforme necessário
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      // Deslogar o usuário em caso de não autorizado
      signOut();
    }
    return Promise.reject(error);
  }
);

export default api;