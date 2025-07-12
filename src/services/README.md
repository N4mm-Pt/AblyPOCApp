# API Services Documentation

This project includes centralized API services to communicate with your .NET API controller. The services are organized into modular, reusable components.

## Files Structure

```
src/
├── services/
│   ├── api.service.ts      # Base API service with HTTP and WebSocket functionality
│   └── class.service.ts    # High-level classroom operations service
├── config/
│   └── index.ts           # Configuration settings
└── components/
    ├── teacher/
    │   ├── TeacherPage.ts  # Teacher page composable using the services
    │   └── TeacherPage.vue # Teacher UI component
    └── student/
        ├── StudentPage.ts  # Student page composable using the services
        └── StudentPage.vue # Student UI component
```

## Configuration

Update the API URL in `src/config/index.ts`:

```typescript
// For development
baseUrl: 'http://localhost:5000/api'

// For production
baseUrl: 'https://your-api-domain.com/api'
```

## Services Overview

### 1. ApiService (`api.service.ts`)

Low-level service that handles:
- HTTP requests to `/api/class/chat`
- Direct Ably real-time communication for cursor streaming
- Student join/leave notifications
- Cursor streaming toggle control
- Message serialization/deserialization

#### Key Methods:
- `sendChatMessage(message)` - Send chat messages
- `sendCursorDataViaAbly(classId, cursorData)` - Send cursor data via Ably
- `toggleCursorStream(classId, teacherId, teacherName, enabled)` - Toggle cursor streaming
- `notifyStudentJoin(classId, studentId, studentName)` - Notify student join
- `notifyStudentLeave(classId, studentId, studentName)` - Notify student leave

### 2. ClassService (`class.service.ts`)

High-level service that provides:
- Class session management
- User management
- Simplified chat and cursor operations

#### Key Methods:
- `joinClass(classId, user)` - Join a classroom
- `sendMessage(message, to)` - Send chat messages
- `connectCursor(callbacks)` - Connect to cursor streaming
- `sendCursorPosition(x, y, data)` - Send cursor coordinates
- `leaveClass()` - Leave classroom and cleanup

## Usage Examples

### Teacher Component

```typescript
import { classService } from '../../services/class.service';
import type { User } from '../../services/class.service';

const teacher: User = {
  id: 'teacher-123',
  name: 'Teacher Name',
  role: 'teacher'
};

// Join class
classService.joinClass('demo-class-001', teacher);

// Send message
await classService.sendMessage('Hello students!');

// Connect cursor tracking
classService.connectCursor(
  (userId, cursor) => {
    console.log(`Student ${userId} cursor at:`, cursor);
  }
);

// Send cursor position
classService.sendCursorPosition(100, 200);
```

### Student Component

```typescript
import { classService } from '../../services/class.service';
import type { User } from '../../services/class.service';

const student: User = {
  id: 'student-456',
  name: 'Student Name',
  role: 'student'
};

// Join class
classService.joinClass('demo-class-001', student);

// Send message
await classService.sendMessage('I have a question');

// Raise hand (special message to teacher)
await classService.sendMessage('🖐️ Hand raised', 'teacher');
```

## API Endpoints Mapping

The services map to your .NET controller endpoints:

| Service Method | HTTP Method | Endpoint | Description |
|----------------|-------------|----------|-------------|
| `sendChatMessage()` | POST | `/api/class/chat` | Send chat messages |
| `notifyStudentJoin()` | POST | `/api/class/join` | Notify when student joins |
| `notifyStudentLeave()` | POST | `/api/class/leave` | Notify when student leaves |
| `toggleCursorStream()` | POST | `/api/class/toggle-cursor` | Toggle cursor streaming mode |

**Note:** Cursor data is sent directly via Ably for optimal performance, bypassing the backend API.

## Message Format

Messages sent to your .NET API follow this structure:

```typescript
interface MessageWrapperModel {
  classId: string;    // Class identifier
  from: string;       // Sender user ID
  to: string;         // Recipient ('all' or specific user ID)
  type: string;       // Message type ('chat' or 'cursor')
  content: any;       // Message payload
}
```

### Chat Message Content:
```typescript
{
  message: "Hello world",
  timestamp: 1641024000000
}
```

### Cursor Message Content:
```typescript
{
  x: 150,
  y: 200,
  timestamp: 1641024000000,
  element: "teacher-board"
}
```

## Error Handling

The services include built-in error handling:

- HTTP errors are caught and re-thrown with detailed messages
- WebSocket connection errors are handled via callbacks
- TypeScript types ensure compile-time safety

## WebSocket Connection Management

The cursor WebSocket connection:
- Automatically reconnects on connection loss
- Handles JSON message parsing
- Provides callbacks for connection events
- Properly cleans up when leaving class

## Getting Started

1. Update the API URL in `src/config/index.ts`
2. Ensure your .NET API is running and accessible
3. Use the `classService` in your Vue components
4. The TeacherPage and StudentPage components provide working examples

## Development Notes

- The services use Vue 3 Composition API patterns
- TypeScript provides full type safety
- Services are designed as singletons for state management
- CORS must be configured on your .NET API for cross-origin requests
- WebSocket upgrades must be enabled on your .NET server
