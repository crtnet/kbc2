import api from './api';

interface Book {
  _id: string;
  title: string;
  content: string;
  coverImage?: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateBookData {
  title: string;
  content: string;
  coverImage?: string;
}

export const createBook = async (bookData: CreateBookData): Promise<{ book: Book }> => {
  const response = await api.post('/api/books', bookData);
  return response.data;
};

export const getBook = async (bookId: string): Promise<Book> => {
  const response = await api.get(`/api/books/${bookId}`);
  return response.data;
};

export const getBooks = async (): Promise<Book[]> => {
  const response = await api.get('/api/books');
  return response.data;
};

export const getBookPDFViewer = async (bookId: string): Promise<string> => {
  const response = await api.get(`/api/books/${bookId}/pdf-viewer`);
  return response.data.url;
};