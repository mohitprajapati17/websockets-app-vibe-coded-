import io from 'socket.io-client';
import axios from 'axios';

const API_URL = 'http://localhost:3000';
const WS_URL = 'http://localhost:3000';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
    try {
        console.log('--- Starting Verification ---');

        // 1. Register Teacher
        const teacherEmail = `teacher_${Date.now()}@test.com`;
        console.log(`Registering Teacher: ${teacherEmail}`);
        await axios.post(`${API_URL}/auth/signup`, {
            name: 'Teacher One',
            email: teacherEmail,
            password: 'password123',
            role: 'TEACHER'
        });

        // 2. Login Teacher
        const teacherLogin = await axios.post(`${API_URL}/auth/login`, {
            email: teacherEmail,
            password: 'password123'
        });
        const teacherToken = teacherLogin.data.token;
        console.log('Teacher Logged In');

        // 3. Register Student
        const studentEmail = `student_${Date.now()}@test.com`;
        console.log(`Registering Student: ${studentEmail}`);
        await axios.post(`${API_URL}/auth/signup`, {
            name: 'Student One',
            email: studentEmail,
            password: 'password123',
            role: 'STUDENT'
        });

        // 4. Login Student
        const studentLogin = await axios.post(`${API_URL}/auth/login`, {
            email: studentEmail,
            password: 'password123'
        });
        const studentToken = studentLogin.data.token;
        const studentId = studentLogin.data.user.id;
        console.log(`Student Logged In (ID: ${studentId})`);

        // 5. Create Class
        console.log('Creating Class...');
        const classRes = await axios.post(`${API_URL}/class`, {
            className: 'Physics 101'
        }, { headers: { Authorization: `Bearer ${teacherToken}` } });
        const classId = classRes.data._id;
        console.log(`Class Created: ${classId}`);

        // 6. Add Student to Class
        console.log('Adding Student to Class...');
        await axios.post(`${API_URL}/class/${classId}/add-student`, {
            studentId
        }, { headers: { Authorization: `Bearer ${teacherToken}` } });
        console.log('Student Added');

        // 7. Start Session
        console.log('Starting Session...');
        await axios.post(`${API_URL}/attendance/start`, {
            classId
        }, { headers: { Authorization: `Bearer ${teacherToken}` } });
        console.log('Session Started');

        // 8. Connect WebSockets
        console.log('Connecting WebSockets...');
        const teacherSocket = io(WS_URL, { query: { token: teacherToken } });
        const studentSocket = io(WS_URL, { query: { token: studentToken } });

        await new Promise<void>(resolve => {
            let connected = 0;
            const check = () => { connected++; if (connected === 2) resolve(); };
            teacherSocket.on('connect', check);
            studentSocket.on('connect', check);
        });
        console.log('WebSockets Connected');

        // 9. Student Check Status (Initial)
        studentSocket.emit('CHECK_MY_STATUS');
        await new Promise<void>(resolve => {
            studentSocket.once('MY_STATUS', (data) => {
                console.log('Initial Student Status:', data); // Should be null
                resolve();
            });
        });

        // 10. Teacher Marks Attendance
        console.log('Teacher Marking Attendance...');
        teacherSocket.emit('MARK_ATTENDANCE', { studentId });

        // Check for broadcast
        await new Promise<void>(resolve => {
            studentSocket.once('ATTENDANCE_MARKED', (data) => {
                console.log('Broadcast Received:', data);
                resolve();
            });
        });

        // 11. Student Check Status (After Mark)
        studentSocket.emit('CHECK_MY_STATUS');
        await new Promise<void>(resolve => {
            studentSocket.once('MY_STATUS', (data) => {
                console.log('Updated Student Status:', data); // Should be 'present'
                resolve();
            });
        });

        // 12. End Session
        console.log('Ending Session...');
        teacherSocket.emit('DONE');

        await new Promise<void>(resolve => {
            teacherSocket.once('SESSION_ENDED', (data) => {
                console.log('Session Ended Summary:', data);
                resolve();
            });
        });

        console.log('--- Verification Complete ---');
        teacherSocket.disconnect();
        studentSocket.disconnect();
        process.exit(0);

    } catch (err: any) {
        console.error('Test Failed:', err.response?.data || err.message);
        process.exit(1);
    }
}

runTest();
