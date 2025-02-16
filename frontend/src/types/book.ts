export type BookStatus = 'draft' | 'processing' | 'completed' | 'error';
export type AgeRange = '1-2' | '3-4' | '5-6' | '7-8' | '9-10' | '11-12';

export interface BookPage {
  pageNumber: number;
  text: string;
  imageUrl: string;
}

export interface BookMetadata {
  wordCount: number;
  pageCount: number;
  createdAt: Date;
  lastModified: Date;
  error?: string;
}

export interface Book {
  id: string;
  title: string;
  authorName: string;
  userId: string;
  ageRange: AgeRange;
  pages: BookPage[];
  status: BookStatus;
  language: string;
  theme: string;
  pdfUrl?: string;
  metadata: BookMetadata;
  createdAt: Date;
  updatedAt: Date;
}