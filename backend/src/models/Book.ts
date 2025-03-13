import mongoose, { Document, Schema } from 'mongoose';

interface IPage {
  pageNumber: number;
  text: string;
  imageUrl: string;
}

interface IStyleGuide {
  character: string;
  environment: string;
  artisticStyle: string;
}

export interface IBook extends Document {
  title: string;
  genre: 'adventure' | 'fantasy' | 'mystery';
  theme: 'friendship' | 'courage' | 'kindness';
  mainCharacter: string;
  mainCharacterDescription: string;
  secondaryCharacter?: string;
  secondaryCharacterDescription?: string;
  setting: string;
  environmentDescription: string;
  tone: 'fun' | 'adventurous' | 'calm';
  ageRange: '1-2' | '3-4' | '5-6' | '7-8' | '9-10' | '11-12';
  authorName: string;
  language: string;
  userId: mongoose.Types.ObjectId;
  pages: IPage[];
  pdfUrl?: string;
  status: 'processing' | 'completed' | 'error';
  prompt?: string;
  styleGuide?: IStyleGuide;
  metadata: {
    wordCount: number;
    pageCount: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const pageSchema = new Schema<IPage>({
  pageNumber: { type: Number, required: true },
  text: { type: String, required: true },
  imageUrl: { type: String, default: '' }
});

const styleGuideSchema = new Schema<IStyleGuide>({
  character: { type: String, required: true },
  environment: { type: String, required: true },
  artisticStyle: { type: String, required: true }
});

const bookSchema = new Schema<IBook>({
  title: { type: String, required: true },
  genre: { 
    type: String, 
    required: true,
    enum: ['adventure', 'fantasy', 'mystery']
  },
  theme: {
    type: String,
    required: true,
    enum: ['friendship', 'courage', 'kindness']
  },
  mainCharacter: { type: String, required: true },
  mainCharacterAvatar: { type: String },
  mainCharacterDescription: { type: String },
  secondaryCharacter: { type: String },
  secondaryCharacterAvatar: { type: String },
  secondaryCharacterDescription: { type: String },
  setting: { type: String, required: true },
  environmentDescription: { type: String },
  tone: {
    type: String,
    required: true,
    enum: ['fun', 'adventurous', 'calm']
  },
  ageRange: {
    type: String,
    required: true,
    enum: ['1-2', '3-4', '5-6', '7-8', '9-10', '11-12']
  },
  authorName: { type: String, required: true },
  language: { type: String, required: true, default: 'pt-BR' },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  pages: [pageSchema],
  pdfUrl: { type: String },
  status: {
    type: String,
    required: true,
    enum: ['processing', 'completed', 'error'],
    default: 'processing'
  },
  prompt: { type: String },
  styleGuide: styleGuideSchema,
  metadata: {
    wordCount: { type: Number, required: true },
    pageCount: { type: Number, required: true }
  }
}, {
  timestamps: true
});

export const Book = mongoose.model<IBook>('Book', bookSchema);