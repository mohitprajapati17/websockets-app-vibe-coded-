import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

import authRoutes from './routes/auth';
import classRoutes from './routes/class';
import studentRoutes from './routes/student';
import attendanceRoutes from './routes/attendance';

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/class', classRoutes);
app.use('/students', studentRoutes);
app.use('/attendance', attendanceRoutes);

const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/attendance_system';


// Database Connection
mongoose.connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));

import { initSocket } from './socket';
initSocket(io);

// Basic Route
app.get('/', (req, res) => {
    res.send('WebSocket Attendance System Server is Running');
});

// Start Server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

export { io };
