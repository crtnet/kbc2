import mongoose from 'mongoose';

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

const pageSchema = new mongoose.Schema({
  pageNumber: { type: Number, required: true },
  text: { type: String, required: true },
  imageUrl: { type: String, default: '' }
});

const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    genre: { type: String, required: true },
    theme: { type: String, required: true },
    mainCharacter: { type: String, required: true },
    secondaryCharacter: { type: String, default: '' },
    setting: { type: String, required: true },
    tone: { type: String, required: true },
    prompt: { type: String, default: '' },
    pages: { type: [pageSchema], default: [] },
    pdfUrl: { type: String, default: '' },
    metadata: {
      wordCount: { type: Number, default: 0 },
      pageCount: { type: Number, default: 0 },
      error: { type: String, default: '' }
    },
    ageRange: { type: String, default: '' },
    authorName: { type: String, default: '' },
    language: { type: String, default: 'pt-BR' },
    coverStyle: { type: coverStyleSchema, default: () => ({}) },
    status: { 
      type: String, 
      enum: ['processing', 'completed', 'error'], 
      default: 'processing' 
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  {
    timestamps: true,
    strict: true
  }
);

export const Book = mongoose.model('Book', bookSchema);

export interface IBook extends mongoose.Document {
  title: string;
  genre: string;
  theme: string;
  mainCharacter: string;
  secondaryCharacter?: string;
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
  ageRange?: string;
  authorName?: string;
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
  status?: 'processing' | 'completed' | 'error';
  userId: mongoose.Types.ObjectId;
}