import mongoose, { Schema } from 'mongoose';
import { IUser, UserModel } from '../types/user.types';

const UserSchema: Schema = new Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { 
    type: String, 
    required: true 
  },
  name: { 
    type: String,
    trim: true
  },
  type: { 
    type: String, 
    required: true,
    default: 'user',
    enum: ['user', 'admin']
  }
}, {
  timestamps: true
});

// Índices
UserSchema.index({ email: 1 });

// Métodos de instância
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error('Erro ao comparar senha:', error);
    return false;
  }
};

// Métodos estáticos
UserSchema.statics.findByEmail = function(email: string): Promise<IUser | null> {
  return this.findOne({ email: email.toLowerCase() });
};

export const User = mongoose.model<IUser, UserModel>('User', UserSchema);