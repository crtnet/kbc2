import api from './api';

export interface BookData {
  title: string;
  genre: string;
  theme: string;
  mainCharacter: string;
  setting: string;
  tone: string;
}

export interface Book extends BookData {
  _id: string;
  author: string;
  status: 'draft' | 'generating' | 'completed' | 'failed';
  content?: {
    story: string;
    pages: Array<{
      text: string;
      imageUrl: string;
    }>;
  };
  createdAt: string;
  updatedAt: string;
}

export const createBook = async (bookData: BookData) => {
  const response = await api.post<{ message: string; bookId: string }>('/books', bookData);
  return response.data;
};

export const getBook = async (bookId: string) => {
  const response = await api.get<Book>(`/books/${bookId}`);
  return response.data;
};

export const getUserBooks = async () => {
  const response = await api.get<Book[]>('/books');
  return response.data;
};