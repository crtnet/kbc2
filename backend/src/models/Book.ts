import mongoose from 'mongoose';
import { AgeRange } from '../types/book';

const pageSchema = new mongoose.Schema({
  pageNumber: { 
    type: Number, 
    required: [true, 'Número da página é obrigatório'],
    min: [1, 'Número da página deve ser maior que 0']
  },
  text: { 
    type: String, 
    required: [true, 'Texto da página é obrigatório'],
    trim: true,
    minlength: [1, 'Texto da página não pode estar vazio']
  },
  imageUrl: { 
    type: String, 
    default: '',
    trim: true,
    validate: {
      validator: function(v: string) {
        return !v || v.startsWith('http://') || v.startsWith('https://') || v.startsWith('data:image/');
      },
      message: 'URL da imagem inválida'
    }
  }
});

const coverStyleSchema = new mongoose.Schema({
  backgroundColor: { type: String, default: '#F0F0F0' },
  titleColor: { type: String, default: '#333333' },
  authorColor: { type: String, default: '#666666' },
  titleFontSize: { type: Number, default: 24 },
  authorFontSize: { type: Number, default: 12 },
  coverImageStyle: {
    width: { type: Number, default: 0.8 },
    height: { type: Number, default: 0.6 },
    opacity: { type: Number, default: 1 }
  }
});

const styleGuideSchema = new mongoose.Schema({
  character: { type: String, default: '' },
  environment: { type: String, default: '' },
  artisticStyle: { type: String, default: 'ilustração cartoon, cores vibrantes, traços suaves' }
});

const bookSchema = new mongoose.Schema(
  {
    title: { 
      type: String, 
      required: [true, 'Título é obrigatório'],
      trim: true,
      minlength: [1, 'Título não pode estar vazio']
    },
    genre: { 
      type: String, 
      required: [true, 'Gênero é obrigatório'],
      trim: true
    },
    theme: { 
      type: String, 
      required: [true, 'Tema é obrigatório'],
      trim: true
    },
    mainCharacter: { 
      type: String, 
      required: [true, 'Personagem principal é obrigatório'],
      trim: true
    },
    mainCharacterAvatar: { 
      type: String, 
      required: [true, 'Avatar do personagem principal é obrigatório'],
      trim: true
    },
    secondaryCharacter: { 
      type: String, 
      default: '',
      trim: true
    },
    secondaryCharacterAvatar: { 
      type: String, 
      default: '',
      trim: true
    },
    setting: { 
      type: String, 
      required: [true, 'Cenário é obrigatório'],
      trim: true
    },
    tone: { 
      type: String, 
      required: [true, 'Tom é obrigatório'],
      trim: true
    },
    prompt: { 
      type: String, 
      default: '',
      trim: true
    },
    pages: { 
      type: [pageSchema], 
      validate: {
        validator: function(v: any[]) {
          return v.length > 0;
        },
        message: 'Livro deve ter pelo menos uma página'
      }
    },
    pdfUrl: { 
      type: String, 
      default: '',
      trim: true,
      validate: {
        validator: function(v: string) {
          return !v || v.startsWith('http://') || v.startsWith('https://') || v.startsWith('/');
        },
        message: 'URL do PDF inválida'
      }
    },
    metadata: {
      wordCount: { 
        type: Number, 
        required: [true, 'Contagem de palavras é obrigatória'],
        min: [1, 'Contagem de palavras deve ser maior que 0']
      },
      pageCount: { 
        type: Number, 
        required: [true, 'Contagem de páginas é obrigatória'],
        min: [1, 'Contagem de páginas deve ser maior que 0']
      },
      error: { 
        type: String, 
        default: '',
        trim: true
      }
    },
    ageRange: { 
      type: String, 
      required: [true, 'Faixa etária é obrigatória'],
      trim: true,
      enum: {
        values: ['1-2', '3-4', '5-6', '7-8', '9-10', '11-12'],
        message: 'Faixa etária inválida'
      }
    },
    authorName: { 
      type: String, 
      required: [true, 'Nome do autor é obrigatório'],
      trim: true,
      minlength: [1, 'Nome do autor não pode estar vazio']
    },
    language: { 
      type: String, 
      default: 'pt-BR',
      trim: true
    },
    coverStyle: { 
      type: coverStyleSchema, 
      default: () => ({})
    },
    // **NOVO**: Campo para armazenar o estilo visual
    styleGuide: {
      type: styleGuideSchema,
      default: () => ({})
    },
    status: { 
      type: String, 
      enum: {
        values: ['processing', 'generating', 'completed', 'error'],
        message: 'Status inválido'
      },
      default: 'processing'
    },
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User', 
      required: [true, 'ID do usuário é obrigatório']
    }
  },
  {
    timestamps: true,
    strict: true
  }
);

import mongoose from 'mongoose';
import { AgeRange } from '../types/book';
import { config } from '../config/config';
import { logger } from '../utils/logger';

// ... resto do código ...

// Função para normalizar URL do avatar
function normalizeAvatarUrl(url: string): string {
  try {
    // Se já é uma URL completa com o servidor correto, retorna como está
    if (url.startsWith(config.avatarServer)) {
      return url;
    }

    // Extrai o caminho relativo de qualquer URL (incluindo IPs internos)
    const assetsMatch = url.match(/assets\/(.+?)(\?|$)/);
    if (!assetsMatch) {
      throw new Error(`URL inválida: ${url}`);
    }

    // Remove qualquer parâmetro de query
    const relativePath = assetsMatch[1].split('?')[0];

    // Combina com a URL do servidor configurada
    const serverUrl = config.avatarServer.replace(/\/+$/, '');
    const normalizedUrl = `${serverUrl}/assets/${relativePath}`;

    logger.info('URL do avatar normalizada:', {
      original: url,
      normalized: normalizedUrl
    });

    return normalizedUrl;
  } catch (error) {
    logger.error('Erro ao normalizar URL do avatar:', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      url
    });
    throw error;
  }
}

// Middleware para normalizar URLs antes de salvar
bookSchema.pre('save', function(next) {
  try {
    // Normalizar mainCharacterAvatar
    if (this.mainCharacterAvatar) {
      this.mainCharacterAvatar = normalizeAvatarUrl(this.mainCharacterAvatar);
    }

    // Normalizar secondaryCharacterAvatar se existir
    if (this.secondaryCharacter && this.secondaryCharacterAvatar) {
      this.secondaryCharacterAvatar = normalizeAvatarUrl(this.secondaryCharacterAvatar);
    }

    next();
  } catch (error) {
    logger.error('Erro ao normalizar URLs dos avatares:', {
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      mainAvatar: this.mainCharacterAvatar,
      secondaryAvatar: this.secondaryCharacterAvatar
    });
    next(error instanceof Error ? error : new Error('Erro ao normalizar URLs dos avatares'));
  }
});

export const Book = mongoose.model('Book', bookSchema);

export interface IBook extends mongoose.Document {
  title: string;
  genre: string;
  theme: string;
  mainCharacter: string;
  mainCharacterAvatar: string;
  secondaryCharacter?: string;
  secondaryCharacterAvatar?: string;
  setting: string;
  tone: string;
  prompt?: string;
  pages: Array<{
    pageNumber: number;
    text: string;
    imageUrl?: string;
  }>;
  pdfUrl?: string;
  metadata: {
    wordCount: number;
    pageCount: number;
    error?: string;
  };
  ageRange: AgeRange;
  authorName: string;
  language?: string;
  coverStyle?: {
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
  };
  // **NOVO**: Interface para o guia de estilo
  styleGuide?: {
    character?: string;
    environment?: string;
    artisticStyle?: string;
  };
  status?: 'processing' | 'generating' | 'completed' | 'error';
  userId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}