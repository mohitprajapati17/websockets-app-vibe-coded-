import mongoose, { Schema, Document } from 'mongoose';
import { z } from 'zod';

export enum UserRole {
    TEACHER = 'TEACHER',
    STUDENT = 'STUDENT'
}

export interface IUser extends Document {
    name: string;
    email: string;
    password: string;
    role: UserRole;
}

const UserSchema: Schema = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: Object.values(UserRole), required: true }
});

export const User = mongoose.model<IUser>('User', UserSchema);

// Zod Schemas
export const registerSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    role: z.enum([UserRole.TEACHER, UserRole.STUDENT])
});

export const loginSchema = z.object({
    email: z.string().email(),
    password: z.string()
});
