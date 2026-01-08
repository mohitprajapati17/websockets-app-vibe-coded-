"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});
exports.io = io;
const auth_1 = __importDefault(require("./routes/auth"));
const class_1 = __importDefault(require("./routes/class"));
const student_1 = __importDefault(require("./routes/student"));
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/auth', auth_1.default);
app.use('/class', class_1.default);
app.use('/students', student_1.default);
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/attendance_system';
// Database Connection
mongoose_1.default.connect(MONGO_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch((err) => console.error('MongoDB connection error:', err));
const socket_1 = require("./socket");
(0, socket_1.initSocket)(io);
// Basic Route
app.get('/', (req, res) => {
    res.send('WebSocket Attendance System Server is Running');
});
// Start Server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
