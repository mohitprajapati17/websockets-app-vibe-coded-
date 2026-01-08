# Backend WebSocket Live Attendance System

A backend system for live student attendance tracking using WebSockets, built with TypeScript, Express, MongoDB, and Socket.io.

## Features

- **Authentication**: JWT-based signup and login for Teachers and Students.
- **Class Management**: Teachers can create classes and add students.
- **Live Attendance**: Real-time attendance tracking using WebSockets.
- **Persistence**: Attendance records are saved to MongoDB after the session ends.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB (Mongoose)
- **Validation**: Zod
- **Real-time**: Socket.io

## Setup

1.  **Clone the repository**:
    ```bash
    git clone <repo-url>
    cd <repo-name>
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Variables**:
    Create a `.env` file in the root directory:
    ```env
    PORT=3000
    MONGO_URI=mongodb://localhost:27017/attendance_system
    JWT_SECRET=your_secret_key
    ```

4.  **Run the server**:
    ```bash
    npm run dev  # Development
    npm run start # Production
    ```

## API Endpoints

### Authentication

*   `POST /auth/signup`: Register a new user.
    *   Body: `{ "name": "John Doe", "email": "john@example.com", "password": "password123", "role": "TEACHER" | "STUDENT" }`
*   `POST /auth/login`: Login and receive JWT.
    *   Body: `{ "email": "john@example.com", "password": "password123" }`
*   `GET /auth/me`: Get current user profile. (Requires Bearer Token)

### Class Management (Teacher Only)

*   `POST /class`: Create a new class.
    *   Body: `{ "className": "Math 101" }`
*   `POST /class/:id/add-student`: Add a student to a class.
    *   Body: `{ "studentId": "student_user_id" }`
*   `GET /class/:id`: Get class details.
*   `GET /students`: List all users with role `STUDENT`.

### Attendance (HTTP)

*   `POST /attendance/start` (Teacher): Start a live session.
    *   Body: `{ "classId": "class_id" }`
*   `GET /attendance/:id/my-attendance` (Student): Check status in a class.

## WebSocket Flow

Connect to the WebSocket server at `ws://localhost:3000` with the query parameter `token`.
Example: `const socket = io('http://localhost:3000', { query: { token: 'YOUR_JWT_TOKEN' } });`

### Events

| Event | Source | Payload | Description |
| :--- | :--- | :--- | :--- |
| `MARK_ATTENDANCE` | Teacher | `{ studentId: string }` | Marks a student as present in the active session. |
| `GET_TODAY_SUMMARY` | Teacher | None | Requests the current count and list of present students. |
| `TODAY_SUMMARY` | Server | `{ presentCount: number, presentStudentIds: string[] }` | Response to `GET_TODAY_SUMMARY`. |
| `CHECK_MY_STATUS` | Student | None | Checks if the student is marked present in the active session. |
| `MY_STATUS` | Server | `{ status: 'present' \| null }` | Response to `CHECK_MY_STATUS`. |
| `ATTENDANCE_MARKED` | Server | `{ studentId: string, status: 'present' }` | Broadcast when a teacher marks attendance. |
| `DONE` | Teacher | None | Ends the session, saves records to DB, and broadcasts results. |
| `SESSION_ENDED` | Server | `{ classId, totalStudents, presentCount, attendance[] }` | Final summary sent when session ends. |

## Project Structure

*   `src/server.ts`: Entry point.
*   `src/models`: Mongoose models (User, Class, Attendance).
*   `src/routes`: Express routes.
*   `src/socket`: Socket.io logic.
*   `src/middleware`: Authentication middleware.
*   `src/state.ts`: In-memory active session state.
