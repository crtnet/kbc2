import mongoose, { Document, Schema } from 'mongoose';

interface Page {
  pageNumber: number;
  text: string;
  imageUrl: string;
}

export interface Book extends Document {
  title: string;
  author: string;
  pages: Page[];
  status: 'draft' | 'generated';
  pdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PageSchema = new Schema({
  pageNumber: {
    type: Number,
    required: true
  },
  text: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  }
});

const BookSchema = new Schema({
  title: {
    type: String,
    required: true
  },
  author: {
    type: String,
    required: true
  },
  pages: {
    type: [PageSchema],
    default: []
  },
  status: {
    type: String,
    enum: ['draft', 'generated'],
    default: 'draft'
  },
  pdfUrl: {
    type: String
  }
}, {
  timestamps: true
});

export default mongoose.model<Book>('Book', BookSchema);