// Tipos para o livro
export interface BookType {
  _id?: string;
  title: string;
  author: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  pages: PageType[];
  styleGuide: StyleGuide;
  status: 'draft' | 'published';
  coverImageUrl: string;
  pdfUrl?: string;
}

export interface PageType {
  pageNumber: number;
  text: string;
  imageUrl: string;
}

export interface StyleGuide {
  character: string;
  environment: string;
  artisticStyle: string;
  complexity: string;
}

export interface Character {
  name: string;
  description: string;
  role: string;
}

export interface GenerateStoryParams {
  title: string;
  genre: string;
  theme: string;
  mainCharacter: string;
  mainCharacterDescription: string;
  environmentDescription: string;
  ageRange: string;
}

export interface ImagePosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Page {
  pageNumber: number;
  text: string;
  imageUrl: string;
  imageType: 'cover' | 'fullPage' | 'spreadPage' | 'inlineImage';
  imagePosition?: ImagePosition;
}

export interface Book {
  title: string;
  author: string;
  genre: string;
  theme: string;
  mainCharacter: string;
  mainCharacterDescription: string;
  environmentDescription: string;
  ageRange: string;
  pages: Page[];
  createdAt: Date;
  updatedAt: Date;
}