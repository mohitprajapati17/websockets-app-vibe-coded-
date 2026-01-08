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
const User_1 = require("../models/User");
const authMiddleware_1 = require("../middleware/authMiddleware");
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
// List All Students
router.get('/', authMiddleware_1.authenticate, ensureTeacher, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const students = yield User_1.User.find({ role: User_1.UserRole.STUDENT }).select('name email _id');
        res.json(students);
    }
    catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}));
exports.default = router;
