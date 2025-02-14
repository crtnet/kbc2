import { Db } from 'mongodb';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email?: string;
        type?: string;
      };
      db: Db;
    }
  }
}

export {};