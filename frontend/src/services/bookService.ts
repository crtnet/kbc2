import api from './api';

export interface BookData {
  title: string;
  genre: string;
  theme: string;
  mainCharacter: string;
  setting: string;
  tone: string;
  ageRange: string;
}

export interface Page {
  text: string;
  imageUrl: string;
}

export interface BookContent {
  story: string;
  pages: Page[];
}

export interface Book {
  _id: string;
  title: string;
  genre: string;
  theme: string;
  mainCharacter: string;
  setting: string;
  tone: string;
  ageRange: string;
  author: string;
  status: 'draft' | 'generating' | 'completed' | 'failed';
  content?: BookContent;
  createdAt: string;
  updatedAt: string;
}

export const createBook = async (bookData: BookData) => {
  const response = await api.post<{ message: string; book: Book }>('/books', bookData);
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