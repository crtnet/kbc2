import { ObjectId } from 'mongodb';

export interface IUser {
  _id?: ObjectId;
  name: string;
  email: string;
  password: string;
  type: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

export class UserModel {
  static async findOne(query: Partial<IUser>, db: any) {
    return db.collection('users').findOne(query);
  }

  static async findById(id: string, db: any) {
    return db.collection('users').findOne({ _id: new ObjectId(id) });
  }

  static async create(userData: Partial<IUser>, db: any) {
    const now = new Date();
    const user = {
      ...userData,
      createdAt: now,
      updatedAt: now
    };
    
    const result = await db.collection('users').insertOne(user);
    return { ...user, _id: result.insertedId };
  }

  static async update(id: string, updateData: Partial<IUser>, db: any) {
    const result = await db.collection('users').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { 
        $set: { 
          ...updateData,
          updatedAt: new Date()
        }
      },
      { returnDocument: 'after' }
    );
    return result.value;
  }
}

export default UserModel;