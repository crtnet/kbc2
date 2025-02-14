// Define a estrutura de um objeto Book utilizado no aplicativo
export interface Book {
  id: string;
  title: string;
  coverImage: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  pdfUrl?: string; // URL do PDF (opcional)
  language: string;
  theme?: string;  // Tema do livro (opcional)
  status: 'draft' | 'published'; // Status: rascunho ou publicado
  pages: {
    text: string;
    image: string;
  }[];
}