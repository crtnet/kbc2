// frontend/src/services/bookService.js
import axios from 'axios';

// Configure a instância do Axios com a URL base do seu backend.
// Em ambiente de desenvolvimento, por exemplo, use "http://localhost:3000/api"
const API_BASE_URL = 'http://localhost:3000/api';

// Cria uma instância do Axios
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor para adicionar o header de autorização a cada requisição
api.interceptors.request.use((config) => {
  // Supondo que o token esteja armazenado no localStorage com a chave 'token'
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export async function getBooks() {
  try {
    const response = await api.get('/books');
    return response.data;
  } catch (error) {
    console.error('Erro ao obter livros:', error);
    throw error;
  }
}

export async function getBookPDFViewer(bookId) {
  try {
    const response = await api.get(`/books/${bookId}/pdf-viewer`);
    return response.data;
  } catch (error) {
    console.error('Erro ao obter visualizador de PDF:', error);
    throw error;
  }
}
