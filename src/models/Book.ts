import mongoose from 'mongoose';
import logger from '../utils/logger';

const bookSchema = new mongoose.Schema({
  title: String,
  userId: mongoose.Schema.Types.ObjectId,
  genre: String,
  theme: String,
  mainCharacter: String,
  setting: String,
  tone: String,
  ageRange: String,
  status: {
    type: String,
    enum: ['generating', 'processing_images', 'generating_pdf', 'completed', 'error'],
    default: 'generating'
  },
  pages: [{
    text: String,
    pageNumber: Number,
    imageUrl: String
  }],
  pdfUrl: String,
  language: {
    type: String,
    default: 'pt-BR'
  },
  wordCount: Number
}, {
  timestamps: true
});

// Middleware para logar mudanças de status
bookSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    logger.info(`[LIVRO ${this._id}] Mudança de status: ${this._original?.status || 'novo'} -> ${this.status}`);
  }
  if (this.isModified('pdfUrl')) {
    logger.info(`[LIVRO ${this._id}] PDF URL atualizada: ${this.pdfUrl}`);
  }
  next();
});

// Método para atualizar status
bookSchema.methods.updateStatus = async function(newStatus) {
  logger.info(`[INÍCIO] Atualizando status do livro ${this._id}`);
  logger.info(`[PROCESSO] Status anterior: ${this.status}`);
  logger.info(`[PROCESSO] Novo status: ${newStatus}`);
  
  this.status = newStatus;
  await this.save();
  
  logger.info(`[FIM] Status atualizado com sucesso`);
};

export const Book = mongoose.model('Book', bookSchema);