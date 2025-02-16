import mongoose, { Document, Schema } from 'mongoose';

export type AgeRange = '1-2' | '3-4' | '5-6' | '7-8' | '9-10' | '11-12';

export interface IPage {
  pageNumber: number;
  text: string;
  imageUrl: string;
}

export interface IBookMetadata {
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
  pages: IPage[];
  status: 'draft' | 'processing' | 'completed' | 'error';
  language: string;
  theme: string;
  pdfUrl?: string;
  metadata: IBookMetadata;
  createdAt: Date;
  updatedAt: Date;
}

const PageSchema = new Schema<IPage>({
  pageNumber: { type: Number, required: true },
  text: { type: String, required: true },
  imageUrl: { type: String, default: '' }
});

const BookMetadataSchema = new Schema<IBookMetadata>({
  wordCount: { type: Number, required: true },
  pageCount: { type: Number, required: true },
  createdAt: { type: Date, required: true },
  lastModified: { type: Date, required: true },
  error: { type: String }
});

const BookSchema = new Schema<IBook>({
  title: { type: String, required: true },
  authorName: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  ageRange: { 
    type: String, 
    enum: ['1-2', '3-4', '5-6', '7-8', '9-10', '11-12'],
    required: true 
  },
  pages: [PageSchema],
  status: { 
    type: String, 
    enum: ['draft', 'processing', 'completed', 'error'], 
    default: 'draft',
    required: true 
  },
  language: { 
    type: String, 
    required: true,
    default: 'pt-BR'
  },
  theme: { 
    type: String, 
    required: true,
    default: 'default'
  },
  pdfUrl: { type: String },
  metadata: { type: BookMetadataSchema, required: true }
}, {
  timestamps: true
});

export const BookModel = mongoose.model<IBook>('Book', BookSchema);