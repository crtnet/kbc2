// src/models/CustomAvatar.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomAvatar extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  avatarUrl: string;
  avatarData: any;
  createdAt: Date;
  updatedAt?: Date;
}

const CustomAvatarSchema = new Schema<ICustomAvatar>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  avatarUrl: {
    type: String,
    required: true
  },
  avatarData: {
    type: Schema.Types.Mixed,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date
  }
});

// Índice composto para garantir que um usuário não tenha dois avatares com o mesmo nome
CustomAvatarSchema.index({ userId: 1, name: 1 }, { unique: true });

export const CustomAvatar = mongoose.model<ICustomAvatar>('CustomAvatar', CustomAvatarSchema);