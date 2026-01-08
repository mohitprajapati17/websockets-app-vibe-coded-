import express from 'express';
import { User, UserRole } from '../models/User';
import { authenticate, AuthRequest } from '../middleware/authMiddleware';

const router = express.Router();

// Middleware to Ensure Teacher
const ensureTeacher = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
    if (req.user?.role !== UserRole.TEACHER) {
        res.status(403).json({ error: 'Access denied. Teachers only.' });
        return;
    }
    next();
};

// List All Students
router.get('/', authenticate, ensureTeacher, async (req: AuthRequest, res): Promise<any> => {
    try {
        const students = await User.find({ role: UserRole.STUDENT }).select('name email _id');
        res.json(students);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
