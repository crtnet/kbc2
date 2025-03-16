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
}

export interface Character {
  name: string;
  description: string;
  type: 'main' | 'secondary';
}

export interface GenerateStoryParams {
  title: string;
  genre: string;
  theme: string;
  mainCharacter: string;
  mainCharacterDescription: string;
  secondaryCharacter?: string;
  secondaryCharacterDescription?: string;
  setting: string;
  tone: string;
  ageRange: string;
  styleGuide: StyleGuide;
}