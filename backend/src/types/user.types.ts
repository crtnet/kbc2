import { Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  password: string;
  name?: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface UserModel extends Document {
  findByEmail(email: string): Promise<IUser | null>;
}

export interface UserResponse {
  id: string;
  email: string;
  name?: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserCreate {
  email: string;
  password: string;
  name?: string;
  type?: string;
}

export interface UserUpdate {
  email?: string;
  name?: string;
  password?: string;
} 