export type AgeRange = '1-2' | '3-4' | '5-6' | '7-8' | '9-10' | '11-12';

export interface BookPage {
  pageNumber: number;
  text: string;
  imageUrl?: string;
}

export interface BookMetadata {
  wordCount: number;
  pageCount: number;
  error?: string;
  createdAt?: Date;
  lastModified?: Date;
}

export interface CoverStyle {
  backgroundColor?: string;
  titleColor?: string;
  authorColor?: string;
  titleFontSize?: number;
  authorFontSize?: number;
  coverImageStyle?: {
    width?: number;
    height?: number;
    opacity?: number;
  };
}

export interface CreateBookDTO {
  title: string;
  genre?: string;
  theme: string;
  mainCharacter: string;
  mainCharacterAvatar: string;
  secondaryCharacter?: string;
  secondaryCharacterAvatar?: string;
  setting: string;
  tone: string;
  prompt: string;
  ageRange: AgeRange;
  authorName: string;
  userId: string;
  language?: string;
  coverStyle?: CoverStyle;
}

export type BookStatus = 'processing' | 'completed' | 'error';

// Validadores para os campos
export const validateBookFields = {
  title: (title: string) => {
    if (!title || title.trim().length === 0) {
      throw new Error('Título é obrigatório');
    }
    return true;
  },
  mainCharacterAvatar: (avatar: string) => {
    if (!avatar || !(avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:image/'))) {
      throw new Error('URL do avatar do personagem principal inválida');
    }
    return true;
  },
  ageRange: (range: AgeRange) => {
    const validRanges: AgeRange[] = ['1-2', '3-4', '5-6', '7-8', '9-10', '11-12'];
    if (!validRanges.includes(range)) {
      throw new Error('Faixa etária inválida');
    }
    return true;
  }
};