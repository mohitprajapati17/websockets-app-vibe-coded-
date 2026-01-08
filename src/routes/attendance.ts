import express from 'express';
import { activeSession, setActiveSession } from '../state';
import { Class } from '../models/Class';
import { UserRole } from '../models/User';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Attendance } from '../models/Attendance';

const router = express.Router();

const startSessionSchema = z.object({
    classId: z.string().regex(/^[0-9a-fA-F]{24}$/)
});

// Middleware to Ensure Teacher
const ensureTeacher = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    if (req.user?.role !== UserRole.TEACHER) {
        res.status(403).json({ error: 'Access denied. Teachers only.' });
        return;
    }
    next();
};

// Start Session
router.post('/start', authenticate, ensureTeacher, async (req: AuthRequest, res): Promise<any> => {
    try {
        const parseResult = startSessionSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: (parseResult.error as any).errors });
        }

        const { classId } = parseResult.data;

        // Check if class exists and belongs to teacher
        const classDoc = await Class.findOne({ _id: classId, teacherId: req.user!.userId });
        if (!classDoc) {
            return res.status(404).json({ error: 'Class not found or unauthorized' });
        }

        // Set Active Session
        const newSession = {
            classId,
            startedAt: new Date().toISOString(),
            attendance: {} // studentId -> status (e.g. "present")
        };

        setActiveSession(newSession);

        res.json({ message: 'Session started', session: newSession });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Student Check Status
router.get('/:id/my-attendance', authenticate, async (req: AuthRequest, res): Promise<any> => {
    try {
        const classId = req.params.id;
        if (!mongoose.isValidObjectId(classId)) {
            return res.status(400).json({ error: 'Invalid Class ID' });
        }

        // Check if student in class
        const classDoc = await Class.findById(classId);
        if (!classDoc) {
            return res.status(404).json({ error: 'Class not found' });
        }
        // We optionally verify if student is registered in class, but sticking to logic:

        let status = null;

        // 1. Check Active Session
        if (activeSession && activeSession.classId === classId) {
            if (activeSession.attendance[req.user!.userId]) {
                status = 'present';
            }
        } else {
            // 2. Check Database (Historic)
            // Requirement says "or in the database if the session is over"
            // Actually requirement says "Checks if the student is marked 'present' in the activeSession OR in the database if the session is over."
            // But how do we know which session? Assuming today/latest or just IF there is a record?
            // Let's assume we check if there is an attendance record for today or generally?
            // The prompt says "Checks if the student is marked 'present'".
            // I'll check if there is an attendance record for this class & student.
            const record = await Attendance.findOne({ classId, studentId: req.user!.userId });
            if (record && record.status === 'present') {
                status = 'present';
            }
        }

        res.json({ status });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
