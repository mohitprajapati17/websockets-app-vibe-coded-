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
exports.initSocket = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const state_1 = require("../state");
const Attendance_1 = require("../models/Attendance");
const Class_1 = require("../models/Class");
const initSocket = (io) => {
    // Authentication Middleware
    io.use((socket, next) => {
        const token = socket.handshake.query.token;
        if (!token) {
            return next(new Error('Authentication error'));
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            next();
        }
        catch (err) {
            next(new Error('Authentication error'));
        }
    });
    io.on('connection', (socket) => {
        var _a;
        console.log(`User connected: ${(_a = socket.user) === null || _a === void 0 ? void 0 : _a.userId}`);
        // Join room for class if we have one? Or just global?
        // Requirement doesn't specify rooms, but broadcasting to everyone might be noisy if multiple classes.
        // But "Only one session can be active at a time globally". So global broadcast is fine.
        // MARK_ATTENDANCE (Teacher Only)
        socket.on('MARK_ATTENDANCE', (data) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            if (((_a = socket.user) === null || _a === void 0 ? void 0 : _a.role) !== 'TEACHER')
                return;
            if (!state_1.activeSession)
                return;
            const { studentId } = data;
            // In a real app, verify studentId is in the class.
            state_1.activeSession.attendance[studentId] = 'present';
            io.emit('ATTENDANCE_MARKED', { studentId, status: 'present' });
        }));
        // GET_TODAY_SUMMARY (Teacher Only)
        socket.on('GET_TODAY_SUMMARY', () => {
            var _a;
            if (((_a = socket.user) === null || _a === void 0 ? void 0 : _a.role) !== 'TEACHER')
                return;
            if (!state_1.activeSession) {
                socket.emit('TODAY_SUMMARY', { presentCount: 0, presentStudentIds: [] });
                return;
            }
            const presentStudentIds = Object.keys(state_1.activeSession.attendance);
            const presentCount = presentStudentIds.length;
            socket.emit('TODAY_SUMMARY', { presentCount, presentStudentIds });
        });
        // CHECK_MY_STATUS (Student Only)
        socket.on('CHECK_MY_STATUS', () => {
            var _a;
            if (((_a = socket.user) === null || _a === void 0 ? void 0 : _a.role) !== 'STUDENT')
                return;
            // Unicast to sender
            if (!state_1.activeSession) {
                socket.emit('MY_STATUS', { status: null });
                return;
            }
            const status = state_1.activeSession.attendance[socket.user.userId] ? 'present' : null;
            socket.emit('MY_STATUS', { status });
        });
        // DONE (Teacher Only)
        socket.on('DONE', () => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            if (((_a = socket.user) === null || _a === void 0 ? void 0 : _a.role) !== 'TEACHER')
                return;
            if (!state_1.activeSession)
                return;
            console.log('Ending session for class:', state_1.activeSession.classId);
            try {
                const { classId, attendance, startedAt } = state_1.activeSession;
                // Find Class to get all students
                const classDoc = yield Class_1.Class.findById(classId);
                if (!classDoc) {
                    console.error('Class not found');
                    return;
                }
                const attendanceRecords = classDoc.studentIds.map((studentId) => {
                    const sId = studentId.toString();
                    return {
                        classId,
                        studentId,
                        status: attendance[sId] ? 'present' : 'absent',
                        date: new Date() // or startedAt? Requirement says "Date.now" default.
                    };
                });
                // Bulk insert
                yield Attendance_1.Attendance.insertMany(attendanceRecords);
                // Broadcast SESSION_ENDED with final list
                const summary = {
                    classId,
                    totalStudents: classDoc.studentIds.length,
                    presentCount: Object.keys(attendance).length,
                    attendance: attendanceRecords.map(r => ({ studentId: r.studentId, status: r.status }))
                };
                io.emit('SESSION_ENDED', summary);
                // Clear Session
                (0, state_1.setActiveSession)(null);
            }
            catch (e) {
                console.error('Error closing session:', e);
            }
        }));
        socket.on('disconnect', () => {
            // console.log('User disconnected');
        });
    });
};
exports.initSocket = initSocket;
