// src/models/book.model.ts
import mongoose from 'mongoose';

export type AgeRange = '1-2' | '3-4' | '5-6' | '7-8' | '9-10' | '11-12';

// Schema para cada página do livro
const pageSchema = new mongoose.Schema({
  pageNumber: { type: Number, required: true },
  text: { type: String, required: true },
  imageUrl: { type: String, default: '' }
});

// Schema do livro atualizado
const bookSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    genre: { type: String, required: true },
    theme: { type: String, required: true },
    mainCharacter: { type: String, required: true },
    setting: { type: String, required: true },
    tone: { type: String, required: true },
    prompt: { type: String, default: '' },
    pages: { type: [pageSchema], default: [] },
    pdfUrl: { type: String, default: '' },
    status: { 
      type: String, 
      enum: ['generating', 'completed', 'error'], 
      default: 'generating' 
    },
    metadata: {
      wordCount: { type: Number, default: 0 },
      pageCount: { type: Number, default: 0 },
      error: { type: String, default: '' },
    },
    // Campos extras enviados pelo controller
    ageRange: { type: String, default: '' },
    authorName: { type: String, default: '' },
    language: { type: String, default: 'pt-BR' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  {
    timestamps: true, // Cria automaticamente os campos createdAt e updatedAt
    strict: true    // Garante que somente os campos definidos no schema sejam salvos
  }
);

export const Book = mongoose.model('Book', bookSchema);