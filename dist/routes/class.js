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
const Class_1 = require("../models/Class");
const User_1 = require("../models/User");
const authMiddleware_1 = require("../middleware/authMiddleware");
const mongoose_1 = __importDefault(require("mongoose"));
const router = express_1.default.Router();
// Middleware to Ensure Teacher
const ensureTeacher = (req, res, next) => {
    var _a;
    if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) !== User_1.UserRole.TEACHER) {
        res.status(403).json({ error: 'Access denied. Teachers only.' });
        return;
    }
    next();
};
// Create Class
router.post('/', authMiddleware_1.authenticate, ensureTeacher, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const parseResult = Class_1.createClassSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.errors });
        }
        const { className } = parseResult.data;
        const newClass = new Class_1.Class({
            className,
            teacherId: req.user.userId,
            studentIds: []
        });
        yield newClass.save();
        res.status(201).json(newClass);
    }
    catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}));
// Add Student to Class
router.post('/:id/add-student', authMiddleware_1.authenticate, ensureTeacher, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const parseResult = Class_1.addStudentSchema.safeParse(req.body);
        if (!parseResult.success) {
            return res.status(400).json({ error: parseResult.error.errors });
        }
        const { studentId } = parseResult.data;
        const classId = req.params.id;
        if (!mongoose_1.default.isValidObjectId(classId)) {
            return res.status(400).json({ error: 'Invalid Class ID' });
        }
        const student = yield User_1.User.findById(studentId);
        if (!student || student.role !== User_1.UserRole.STUDENT) {
            return res.status(404).json({ error: 'Student not found' });
        }
        const classDoc = yield Class_1.Class.findOne({ _id: classId, teacherId: req.user.userId });
        if (!classDoc) {
            return res.status(404).json({ error: 'Class not found or unauthorized' });
        }
        if (classDoc.studentIds.includes(student._id)) {
            return res.status(400).json({ error: 'Student already in class' });
        }
        classDoc.studentIds.push(student._id);
        yield classDoc.save();
        res.json({ message: 'Student added successfully', class: classDoc });
    }
    catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}));
// Get Class Details
router.get('/:id', authMiddleware_1.authenticate, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const classId = req.params.id;
        if (!mongoose_1.default.isValidObjectId(classId)) {
            return res.status(400).json({ error: 'Invalid Class ID' });
        }
        const classDoc = yield Class_1.Class.findById(classId).populate('studentIds', 'name email');
        if (!classDoc) {
            return res.status(404).json({ error: 'Class not found' });
        }
        // Allow Teacher or Student in class
        // actually requirement says "Class & Student Routes (Teacher Only)" for GET /class/:id
        // But let's check if user is the teacher
        if (classDoc.teacherId.toString() !== req.user.userId) {
            return res.status(403).json({ error: 'Access denied. You are not the teacher of this class' });
        }
        res.json(classDoc);
    }
    catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}));
exports.default = router;
