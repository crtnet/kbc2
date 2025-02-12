import mongoose, { Document, Schema } from 'mongoose';

export interface IPage {
  _id?: string | mongoose.Types.ObjectId;
  text: string;
  pageNumber: number;
  imageUrl: string;
}

export type AgeRange = '1-2' | '3-4' | '5-6' | '7-8' | '9-10' | '11-12';

export interface IBook extends Document {
  _id: string | mongoose.Types.ObjectId;
  title: string;
  userId: string | mongoose.Types.ObjectId;
  genre: string;
  theme: string;
  mainCharacter: string;
  setting: string;
  tone: string;
  ageRange: AgeRange;
  content: string;
  wordCount: number;
  status: 'generating' | 'completed' | 'error';
  error?: string;
  generationTime?: number;
  pages: IPage[];
  language: string;
  createdAt: Date;
  updatedAt: Date;

  // Método para converter para objeto plano com IDs como strings
  toPlainObject(): any;
}

const PageSchema = new Schema({
  text: { type: String, required: true },
  pageNumber: { type: Number, required: true },
  imageUrl: { type: String, required: true }
});

const BookSchema = new Schema({
  title: { 
    type: String, 
    required: true 
  },
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User',
    required: true,
    index: true
  },
  genre: { 
    type: String, 
    required: true 
  },
  theme: { 
    type: String, 
    required: true 
  },
  mainCharacter: { 
    type: String, 
    required: true 
  },
  setting: { 
    type: String, 
    required: true 
  },
  tone: { 
    type: String, 
    required: true 
  },
  ageRange: {
    type: String,
    required: true,
    enum: ['1-2', '3-4', '5-6', '7-8', '9-10', '11-12'],
    validate: {
      validator: function(v: string) {
        return ['1-2', '3-4', '5-6', '7-8', '9-10', '11-12'].includes(v);
      },
      message: props => `${props.value} não é uma faixa etária válida`
    }
  },
  content: {
    type: String,
    required: false // Será preenchido após a geração
  },
  wordCount: {
    type: Number,
    required: false
  },
  status: {
    type: String,
    required: true,
    enum: ['generating', 'completed', 'error'],
    default: 'generating'
  },
  error: {
    type: String,
    required: false
  },
  generationTime: {
    type: Number,
    required: false
  },
  pages: {
    type: [PageSchema],
    required: false, // Será preenchido após a geração do conteúdo
    default: []
  },
  language: { 
    type: String, 
    required: true,
    default: 'pt-BR'
  }
}, {
  timestamps: true
});

// Método para converter ObjectIds para strings
BookSchema.methods.toPlainObject = function() {
  const obj = this.toObject();
  
  // Converter _id para string
  obj._id = obj._id.toString();
  
  // Converter userId para string
  obj.userId = obj.userId.toString();
  
  // Converter IDs das páginas para string
  if (obj.pages && Array.isArray(obj.pages)) {
    obj.pages = obj.pages.map(page => ({
      ...page,
      _id: page._id ? page._id.toString() : undefined
    }));
  }
  
  return obj;
};

// Índices
BookSchema.index({ userId: 1, createdAt: -1 });
BookSchema.index({ title: 'text' });

// Middleware pre-save para validação adicional
BookSchema.pre('save', function(next) {
  if (!this.isModified('pages')) return next();

  // Verificar se as páginas estão em ordem
  const pages = this.pages as IPage[];
  const isSequential = pages.every((page, index) => page.pageNumber === index + 1);
  
  if (!isSequential) {
    next(new Error('Números das páginas devem ser sequenciais'));
  }

  next();
});

export default mongoose.model<IBook>('Book', BookSchema);