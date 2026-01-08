import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { activeSession, setActiveSession } from '../state';
import { Attendance } from '../models/Attendance';
import { Class } from '../models/Class';

interface AuthSocket extends Socket {
    user?: {
        userId: string;
        role: string;
    };
}

export const initSocket = (io: Server) => {
    // Authentication Middleware
    io.use((socket: AuthSocket, next) => {
        const token = socket.handshake.query.token as string;
        if (!token) {
            return next(new Error('Authentication error'));
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string, role: string };
            socket.user = decoded;
            next();
        } catch (err) {
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket: AuthSocket) => {
        console.log(`User connected: ${socket.user?.userId}`);

        // Join room for class if we have one? Or just global?
        // Requirement doesn't specify rooms, but broadcasting to everyone might be noisy if multiple classes.
        // But "Only one session can be active at a time globally". So global broadcast is fine.

        // MARK_ATTENDANCE (Teacher Only)
        socket.on('MARK_ATTENDANCE', async (data: { studentId: string }) => {
            if (socket.user?.role !== 'TEACHER') return;
            if (!activeSession) return;

            const { studentId } = data;
            // In a real app, verify studentId is in the class.
            activeSession.attendance[studentId] = 'present';

            io.emit('ATTENDANCE_MARKED', { studentId, status: 'present' });
        });

        // GET_TODAY_SUMMARY (Teacher Only)
        socket.on('GET_TODAY_SUMMARY', () => {
            if (socket.user?.role !== 'TEACHER') return;
            if (!activeSession) {
                socket.emit('TODAY_SUMMARY', { presentCount: 0, presentStudentIds: [] });
                return;
            }

            const presentStudentIds = Object.keys(activeSession.attendance);
            const presentCount = presentStudentIds.length;
            socket.emit('TODAY_SUMMARY', { presentCount, presentStudentIds });
        });

        // CHECK_MY_STATUS (Student Only)
        socket.on('CHECK_MY_STATUS', () => {
            if (socket.user?.role !== 'STUDENT') return;
            // Unicast to sender
            if (!activeSession) {
                socket.emit('MY_STATUS', { status: null });
                return;
            }

            const status = activeSession.attendance[socket.user.userId] ? 'present' : null;
            socket.emit('MY_STATUS', { status });
        });

        // DONE (Teacher Only)
        socket.on('DONE', async () => {
            if (socket.user?.role !== 'TEACHER') return;
            if (!activeSession) return;

            console.log('Ending session for class:', activeSession.classId);

            try {
                const { classId, attendance, startedAt } = activeSession;

                // Find Class to get all students
                const classDoc = await Class.findById(classId);
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
                await Attendance.insertMany(attendanceRecords);

                // Broadcast SESSION_ENDED with final list
                const summary = {
                    classId,
                    totalStudents: classDoc.studentIds.length,
                    presentCount: Object.keys(attendance).length,
                    attendance: attendanceRecords.map(r => ({ studentId: r.studentId, status: r.status }))
                };
                io.emit('SESSION_ENDED', summary);

                // Clear Session
                setActiveSession(null);

            } catch (e) {
                console.error('Error closing session:', e);
            }
        });

        socket.on('disconnect', () => {
            // console.log('User disconnected');
        });
    });
};
