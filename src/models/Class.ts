import mongoose, { Schema, Document } from 'mongoose';
import { z } from 'zod';

export interface IClass extends Document {
    className: string;
    teacherId: mongoose.Types.ObjectId;
    studentIds: mongoose.Types.ObjectId[];
}

const ClassSchema: Schema = new Schema({
    className: { type: String, required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    studentIds: [{ type: Schema.Types.ObjectId, ref: 'User' }]
});

export const Class = mongoose.model<IClass>('Class', ClassSchema);

// Zod Schemas
export const createClassSchema = z.object({
    className: z.string().min(1)
});

export const addStudentSchema = z.object({
    studentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId')
});
