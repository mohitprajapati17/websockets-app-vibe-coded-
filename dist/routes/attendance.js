"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const state_1 = require("../state");
const Class_1 = require("../models/Class");
const User_1 = require("../models/User");
const authMiddleware_1 = require("../middleware/authMiddleware");
const mongoose_1 = __importDefault(require("mongoose"));
const zod_1 = require("zod");
const Attendance_1 = require("../models/Attendance");
const router = express_1.default.Router();
const startSessionSchema = zod_1.z.object({
    classId: zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/)
});
// Middleware to Ensure Teacher
const ensureTeacher = (req, res, next) => {
    var _a;
    if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== User_1.UserRole.TEACHER) {
        res.status(403).json({ error: 'Access denied. Teachers only.' });
        return;
    }
    next();
};
// Start Session
router.post('/start', authMiddleware_1.authenticate, ensureTeacher, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const parseResult = startSessionSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.errors });
        }
        const { classId } = parseResult.data;
        // Check if class exists and belongs to teacher
        const classDoc = yield Class_1.Class.findOne({ _id: classId, teacherId: req.user.userId });
        if (!classDoc) {
            return res.status(404).json({ error: 'Class not found or unauthorized' });
        }
        // Set Active Session
        const newSession = {
            classId,
            startedAt: new Date().toISOString(),
            attendance: {} // studentId -> status (e.g. "present")
        };
        (0, state_1.setActiveSession)(newSession);
        res.json({ message: 'Session started', session: newSession });
    }
    catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}));
// Student Check Status
router.get('/:id/my-attendance', authMiddleware_1.authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const classId = req.params.id;
        if (!mongoose_1.default.isValidObjectId(classId)) {
            return res.status(400).json({ error: 'Invalid Class ID' });
        }
        // Check if student in class
        const classDoc = yield Class_1.Class.findById(classId);
        if (!classDoc) {
            return res.status(404).json({ error: 'Class not found' });
        }
        // We optionally verify if student is registered in class, but sticking to logic:
        let status = null;
        // 1. Check Active Session
        if (state_1.activeSession && state_1.activeSession.classId === classId) {
            if (state_1.activeSession.attendance[req.user.userId]) {
                status = 'present';
            }
        }
        else {
            // 2. Check Database (Historic)
            // Requirement says "or in the database if the session is over"
            // Actually requirement says "Checks if the student is marked 'present' in the activeSession OR in the database if the session is over."
            // But how do we know which session? Assuming today/latest or just IF there is a record?
            // Let's assume we check if there is an attendance record for today or generally?
            // The prompt says "Checks if the student is marked 'present'".
            // I'll check if there is an attendance record for this class & student.
            const record = yield Attendance_1.Attendance.findOne({ classId, studentId: req.user.userId });
            if (record && record.status === 'present') {
                status = 'present';
            }
        }
        res.json({ status });
    }
    catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}));
exports.default = router;
