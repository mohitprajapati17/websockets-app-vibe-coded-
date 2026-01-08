import mongoose, { Schema, Document } from 'mongoose';

export interface IAttendance extends Document {
    classId: mongoose.Types.ObjectId;
    studentId: mongoose.Types.ObjectId;
    status: 'present' | 'absent';
    date: Date;
}

const AttendanceSchema: Schema = new Schema({
    classId: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['present', 'absent'], required: true },
    date: { type: Date, default: Date.now }
});

export const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);
