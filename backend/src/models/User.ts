import mongoose, { Schema, Document } from 'mongoose';
import { ObjectId } from 'mongodb';

export interface IUser extends Document {
  _id: ObjectId;
  name: string;
  email: string;
  password: string;
  type: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { 
    type: String, 
    required: true 
  },
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
  type: { 
    type: String, 
    enum: ['admin', 'user'], 
    default: 'user' 
  }
}, {
  timestamps: true,
  collection: 'users'
});

// Índices
UserSchema.index({ email: 1 }, { unique: true });

export const UserModel = mongoose.model<IUser>('User', UserSchema);

export default UserModel;