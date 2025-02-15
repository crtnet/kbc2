import mongoose, { Document, Schema } from 'mongoose';
import { logger } from '../utils/logger';

export type AgeRange = '1-2' | '3-4' | '5-6' | '7-8' | '9-10' | '11-12';

interface IPage {
  pageNumber: number;
  text: string;
  imageUrl: string;
}

interface IMetadata {
  wordCount: number;
  pageCount: number;
  createdAt: Date;
  lastModified: Date;
  error?: string;
}

export interface IBook extends Document {
  title: string;
  authorName: string;
  userId: string;
  ageRange: AgeRange;
  theme: string;
  language: string;
  pages: IPage[];
  status: 'processing' | 'completed' | 'error';
  pdfUrl?: string;
  metadata: IMetadata;
}

const pageSchema = new Schema<IPage>({
  pageNumber: { 
    type: Number, 
    required: [true, 'Número da página é obrigatório'],
    min: [1, 'Número da página deve ser maior que 0']
  },
  text: { 
    type: String, 
    required: [true, 'Texto da página é obrigatório'],
    trim: true
  },
  imageUrl: { 
    type: String, 
    default: '',
    trim: true
  }
});

const metadataSchema = new Schema<IMetadata>({
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
  createdAt: { 
    type: Date, 
    required: true,
    default: Date.now
  },
  lastModified: { 
    type: Date, 
    required: true,
    default: Date.now
  },
  error: { 
    type: String,
    trim: true
  }
});

const bookSchema = new Schema<IBook>({
  title: { 
    type: String, 
    required: [true, 'Título é obrigatório'],
    trim: true,
    minlength: [2, 'Título deve ter pelo menos 2 caracteres'],
    maxlength: [100, 'Título deve ter no máximo 100 caracteres']
  },
  authorName: { 
    type: String, 
    required: [true, 'Nome do autor é obrigatório'],
    trim: true,
    minlength: [2, 'Nome do autor deve ter pelo menos 2 caracteres'],
    maxlength: [100, 'Nome do autor deve ter no máximo 100 caracteres']
  },
  userId: { 
    type: String, 
    required: [true, 'ID do usuário é obrigatório'],
    trim: true
  },
  ageRange: { 
    type: String, 
    enum: {
      values: ['1-2', '3-4', '5-6', '7-8', '9-10', '11-12'],
      message: 'Faixa etária inválida'
    },
    required: [true, 'Faixa etária é obrigatória']
  },
  theme: { 
    type: String, 
    default: 'default',
    trim: true
  },
  language: { 
    type: String, 
    default: 'pt-BR',
    trim: true
  },
  pages: [pageSchema],
  status: { 
    type: String, 
    enum: {
      values: ['processing', 'completed', 'error'],
      message: 'Status inválido'
    },
    default: 'processing'
  },
  pdfUrl: { 
    type: String,
    trim: true
  },
  metadata: { 
    type: metadataSchema, 
    required: [true, 'Metadados são obrigatórios']
  }
}, {
  timestamps: true
});

// Índices
bookSchema.index({ userId: 1, 'metadata.createdAt': -1 });
bookSchema.index({ status: 1 });
bookSchema.index({ title: 'text', authorName: 'text' });

// Middleware de validação
bookSchema.pre('save', async function(next) {
  try {
    // Verifica conexão com o banco
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Sem conexão com o banco de dados');
    }

    // Validações adicionais
    if (this.pages.length === 0) {
      throw new Error('O livro deve ter pelo menos uma página');
    }

    if (!this.userId) {
      throw new Error('ID do usuário é obrigatório');
    }

    // Atualiza lastModified
    this.metadata.lastModified = new Date();

    next();
  } catch (error) {
    logger.error('Erro na validação do livro:', error);
    next(error);
  }
});

export const Book = mongoose.model<IBook>('Book', bookSchema);