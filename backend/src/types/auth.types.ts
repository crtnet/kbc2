import { Request } from 'express';

export interface User {
  id: string;
  email: string;
  type: string;
  name?: string;
}

export interface AuthRequest extends Request {
  user?: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
} 