import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  genre: {
    type: String,
    required: true,
  },
  theme: {
    type: String,
    required: true,
  },
  mainCharacter: {
    type: String,
    required: true,
  },
  setting: {
    type: String,
    required: true,
  },
  tone: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['generating', 'completed', 'error'],
    default: 'generating',
  },
  error: {
    type: String,
    default: '',
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

export const Book = mongoose.model('Book', bookSchema);