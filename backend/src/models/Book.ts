import mongoose, { Document, Schema } from 'mongoose';

export interface IPage {
  text: string;
  pageNumber: number;
  imageUrl: string;
}

export type AgeRange = '1-2' | '3-4' | '5-6' | '7-8' | '9-10' | '11-12';

export interface IBook extends Document {
  title: string;
  userId: string;
  genre: string;
  theme: string;
  mainCharacter: string;
  setting: string;
  tone: string;
  ageRange: AgeRange;
  pages: IPage[];
  language: string;
  createdAt: Date;
  updatedAt: Date;
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
  pages: {
    type: [PageSchema],
    required: true,
    validate: [
      {
        validator: function(pages: IPage[]) {
          return pages.length > 0;
        },
        message: 'O livro deve ter pelo menos uma página'
      }
    ]
  },
  language: { 
    type: String, 
    required: true,
    default: 'pt-BR'
  }
}, {
  timestamps: true
});

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