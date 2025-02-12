import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  genre: {
    type: String,
    required: true,
    enum: ['adventure', 'fantasy', 'mystery', 'educational']
  },
  theme: {
    type: String,
    required: true,
    enum: ['friendship', 'courage', 'kindness', 'responsibility']
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
    required: true,
    enum: ['fun', 'adventurous', 'calm', 'educational']
  },
  content: {
    story: String,
    pages: [{
      text: String,
      imageUrl: String
    }]
  },
  status: {
    type: String,
    enum: ['draft', 'generating', 'completed', 'failed'],
    default: 'draft'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Book', bookSchema);