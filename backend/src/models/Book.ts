import mongoose, { Document, Schema } from 'mongoose';

export interface IPage {
  pageNumber: number;
  text: string;
  imageUrl: string;
  imageType: 'cover' | 'fullPage' | 'spreadPage' | 'inlineImage';
  imagePosition?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface IStyleGuide {
  character: string;
  environment: string;
  artisticStyle: string;
}

interface IMetadata {
  wordCount: number;
  pageCount: number;
  currentPage?: number;
  totalPages?: number;
  imagesCompleted?: boolean;
  pdfGenerationStarted?: boolean;
  pdfCompleted?: boolean;
  error?: string;
  pdfError?: string;
  lastUpdated?: Date;
  ageRange?: string;
  complexity?: string;
  progress?: number;
  estimatedTimeRemaining?: string;
  queueError?: boolean;
  queueErrorMessage?: string;
  stalledAt?: Date;
  stalledJobId?: string;
  failedAt?: Date;
}

export interface IBook extends Document {
  title: string;
  genre: 'adventure' | 'fantasy' | 'mystery' | string;
  theme: 'friendship' | 'courage' | 'kindness' | string;
  mainCharacter: string;
  mainCharacterAvatar?: string;
  mainCharacterDescription?: string;
  secondaryCharacter?: string;
  secondaryCharacterAvatar?: string;
  secondaryCharacterDescription?: string;
  setting: string;
  environmentDescription?: string;
  tone: 'fun' | 'adventurous' | 'calm' | string;
  ageRange: '1-2' | '3-4' | '5-6' | '7-8' | '9-10' | '11-12' | string;
  authorName: string;
  language: string;
  userId: mongoose.Types.ObjectId;
  pages: IPage[];
  pdfUrl?: string;
  status: 'processing' | 'generating_images' | 'images_completed' | 'generating_pdf' | 'completed' | 'failed' | 'error' | 'images_error';
  prompt?: string;
  styleGuide?: IStyleGuide;
  metadata: IMetadata;
  characterDescription?: string;
  createdAt: Date;
  updatedAt: Date;
}

const pageSchema = new Schema<IPage>({
  pageNumber: { type: Number, required: true },
  text: { type: String, required: true },
  imageUrl: { type: String, required: true },
  imageType: { 
    type: String, 
    enum: ['cover', 'fullPage', 'spreadPage', 'inlineImage'],
    required: true 
  },
  imagePosition: {
    x: Number,
    y: Number,
    width: Number,
    height: Number
  }
});

const styleGuideSchema = new Schema<IStyleGuide>({
  character: { type: String, required: true },
  environment: { type: String, required: true },
  artisticStyle: { type: String, required: true }
});

const metadataSchema = new Schema<IMetadata>({
  wordCount: { type: Number, required: true, default: 0 },
  pageCount: { type: Number, required: true, default: 0 },
  currentPage: { type: Number },
  totalPages: { type: Number },
  imagesCompleted: { type: Boolean },
  pdfGenerationStarted: { type: Boolean },
  pdfCompleted: { type: Boolean },
  error: { type: String },
  pdfError: { type: String },
  lastUpdated: { type: Date },
  ageRange: { type: String },
  complexity: { type: String },
  progress: { type: Number, default: 0 },
  estimatedTimeRemaining: { type: String },
  queueError: { type: Boolean },
  queueErrorMessage: { type: String },
  stalledAt: { type: Date },
  stalledJobId: { type: String },
  failedAt: { type: Date }
});

const bookSchema = new Schema<IBook>({
  title: { type: String, required: true },
  genre: { 
    type: String, 
    required: true
  },
  theme: {
    type: String,
    required: true
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
    required: true
  },
  ageRange: {
    type: String,
    required: true
  },
  authorName: { type: String, required: true },
  language: { type: String, required: true, default: 'pt-BR' },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  pages: [pageSchema],
  pdfUrl: { type: String },
  status: {
    type: String,
    required: true,
    enum: ['processing', 'generating_images', 'images_completed', 'generating_pdf', 'completed', 'failed', 'error', 'images_error'],
    default: 'processing'
  },
  prompt: { type: String },
  styleGuide: styleGuideSchema,
  metadata: {
    type: metadataSchema,
    default: () => ({
      wordCount: 0,
      pageCount: 0,
      progress: 0,
      estimatedTimeRemaining: '10-15 minutos'
    }),
    required: true
  },
  characterDescription: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

bookSchema.pre('save', function(next) {
  if (this.pages && this.pages.length > 0) {
    this.metadata.pageCount = this.pages.length;
    
    const totalWords = this.pages.reduce((acc, page) => {
      return acc + (page.text ? page.text.split(/\s+/).length : 0);
    }, 0);
    
    this.metadata.wordCount = totalWords;
  }
  
  this.updatedAt = new Date();
  next();
});

export const Book = mongoose.model<IBook>('Book', bookSchema);