import express from 'express';
import { Class, createClassSchema, addStudentSchema } from '../models/Class';
import { User, UserRole } from '../models/User';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';
import mongoose from 'mongoose';

const router = express.Router();

// Middleware to Ensure Teacher
const ensureTeacher = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    if (req.user?.role !== UserRole.TEACHER) {
        res.status(403).json({ error: 'Access denied. Teachers only.' });
        return;
    }
    next();
};

// Create Class
router.post('/', authenticate, ensureTeacher, async (req: AuthRequest, res): Promise<any> => {
    try {
        const parseResult = createClassSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: (parseResult.error as any).errors });
        }

        const { className } = parseResult.data;
        const newClass = new Class({
            className,
            teacherId: req.user!.userId,
            studentIds: []
        });

        await newClass.save();
        res.status(201).json(newClass);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Add Student to Class
router.post('/:id/add-student', authenticate, ensureTeacher, async (req: AuthRequest, res): Promise<any> => {
    try {
        const parseResult = addStudentSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: (parseResult.error as any).errors });
        }

        const { studentId } = parseResult.data;
        const classId = req.params.id;

        if (!mongoose.isValidObjectId(classId)) {
            return res.status(400).json({ error: 'Invalid Class ID' });
        }

        const student = await User.findById(studentId);
        if (!student || student.role !== UserRole.STUDENT) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const classDoc = await Class.findOne({ _id: classId, teacherId: req.user!.userId });
        if (!classDoc) {
            return res.status(404).json({ error: 'Class not found or unauthorized' });
        }

        if (classDoc.studentIds.includes(student._id as any)) {
            return res.status(400).json({ error: 'Student already in class' });
        }

        classDoc.studentIds.push(student._id as any);
        await classDoc.save();

        res.json({ message: 'Student added successfully', class: classDoc });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Class Details
router.get('/:id', authenticate, async (req: AuthRequest, res): Promise<any> => {
    try {
        const classId = req.params.id;
        if (!mongoose.isValidObjectId(classId)) {
            return res.status(400).json({ error: 'Invalid Class ID' });
        }

        const classDoc = await Class.findById(classId).populate('studentIds', 'name email');
        if (!classDoc) {
            return res.status(404).json({ error: 'Class not found' });
        }

        // Allow Teacher or Student in class
        // actually requirement says "Class & Student Routes (Teacher Only)" for GET /class/:id
        // But let's check if user is the teacher
        if (classDoc.teacherId.toString() !== req.user!.userId) {
            return res.status(403).json({ error: 'Access denied. You are not the teacher of this class' });
        }

        res.json(classDoc);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
