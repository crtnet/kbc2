import mongoose from 'mongoose';

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
    // Se preferir, você pode manter o campo "error" fora do objeto metadata
    // mas aqui iremos armazenar informações extras dentro de "metadata"
    metadata: {
      wordCount: { type: Number, default: 0 },
      pageCount: { type: Number, default: 0 },
      error: { type: String, default: '' }
    },
    // Campos extras que o controller envia (opcionais, ajuste conforme necessário)
    ageRange: { type: String, default: '' },
    authorName: { type: String, default: '' },
    language: { type: String, default: 'pt-BR' },
    // O campo "content" original pode ser removido se não for utilizado
  },
  {
    timestamps: true, // Cria automaticamente "createdAt" e "updatedAt"
    strict: true
  }
);

export const Book = mongoose.model('Book', bookSchema);