export interface Book {
  id: string;
  title: string;
  coverImage: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  pdfUrl?: string;
  language: string;
  theme?: string;
  status: 'draft' | 'published';
  pages: {
    text: string;
    image: string;
  }[];
}