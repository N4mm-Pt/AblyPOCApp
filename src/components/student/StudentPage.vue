<template>
  <div class="student-page">
    <!-- Name input form - shown when not joined -->
    <div v-if="!hasJoinedClass" class="name-input-section">
      <div class="name-card">
        <h2>Enter Your Name</h2>
        <p>Please enter your name to join the classroom</p>
        <div class="name-input-form">
          <input 
            v-model="studentName" 
            @keyup.enter="handleJoinClass"
            placeholder="Your name..."
            class="name-input"
            :disabled="isConnected"
          />
          <button 
            @click="handleJoinClass" 
            :disabled="!studentName.trim() || isConnected"
            class="join-btn"
          >
            Join Class
          </button>
        </div>
        <p v-if="connectionError" class="error">{{ connectionError }}</p>
      </div>
    </div>

    <!-- Main classroom interface - shown when joined -->
    <div v-else class="classroom-interface">
      <!-- Notification popup -->
      <div v-if="notification" class="notification">
        {{ notification }}
      </div>
      
      <div class="connection-status">
        <div class="status-row">
          <div class="status-info">
            <p>Status: {{ isConnected ? 'Connected' : 'Disconnected' }}</p>
            <p v-if="connectionError" class="error">{{ connectionError }}</p>
            <p>Student: <strong>{{ studentName }}</strong> | Class: <strong>{{ classId }}</strong></p>
          </div>
          <div class="cursor-status-compact" v-if="isTeacherCursorStreaming">
            <span class="cursor-indicator">🎯 Teacher Streaming</span>
          </div>
        </div>
      </div>

      <div class="chat-section">
      <h2>Chat</h2>
      <div class="messages">
        <div 
          v-for="message in messages" 
          :key="message.id" 
          class="message"
          :class="{
            'message-teacher': message.from && message.from.startsWith('teacher-'),
            'message-student': message.from && message.from.startsWith('student-'),
            'message-system': message.type === 'system',
            'message-hand-raise': message.type === 'hand-raise'
          }"
        >
          <div class="message-header">
            <span class="message-from">{{ message.fromName }}</span>
            <span class="message-time">{{ formatTime(message.timestamp) }}</span>
          </div>
          <div class="message-content">
            {{ message.message }}
          </div>
        </div>
        <div v-if="messages.length === 0" class="no-messages">
          No messages yet. Join the conversation!
        </div>
      </div>
      <div class="chat-input">
        <input 
          v-model="newMessage" 
          @keyup.enter="sendMessage"
          placeholder="Type a message..."
          :disabled="!isConnected"
        />
        <button @click="raiseHand" :disabled="!isConnected" class="raise-hand-btn-compact" title="Raise hand">
          🖐️
        </button>
        <button @click="sendMessage" :disabled="!isConnected || !newMessage.trim()" class="send-btn">
          Send
        </button>
      </div>
    </div>

      <div class="teacher-cursor" style="display: none;">
        <!-- Teacher cursor display disabled to save quotas - will be implemented later -->
        <h2>Teacher Activity (Coming Soon)</h2>
        <p>Real-time teacher cursor tracking will be implemented when needed to save quotas.</p>
      </div>
    </div> <!-- classroom-interface -->

    <!-- Student Whiteboard Overlay (when teacher is streaming) -->
    <div v-if="isTeacherCursorStreaming" class="student-whiteboard" ref="studentWhiteboard">
      <div class="whiteboard-overlay">
        <div class="whiteboard-header">
          <h3>Teacher is demonstrating</h3>
          <button @click="hideWhiteboard" class="close-whiteboard-btn">✕ Close</button>
        </div>
        <div class="whiteboard-canvas" ref="whiteboardCanvas">
          <!-- Teacher cursor will be rendered here -->
          <div 
            v-if="teacherCursor && teacherCursor.x >= 0 && teacherCursor.y >= 0"
            class="teacher-cursor-pointer"
            :style="{
              left: teacherCursor.x + '%',
              top: teacherCursor.y + '%'
            }"
          >
            <div class="cursor-dot"></div>
            <div class="cursor-label">{{ teacherCursor.userName || 'Teacher' }}</div>
          </div>
        </div>
      </div>
    </div>
  </div> <!-- student-page -->
</template>

<script setup lang="ts">
import useStudentPage from './StudentPage.ts'

const {
  messages,
  newMessage,
  // teacherCursor, // Disabled to save quotas
  isConnected,
  connectionError,
  studentName,
  hasJoinedClass,
  notification,
  sendMessage,
  raiseHand,
  joinClass,
  classId,
  // Cursor streaming functionality
  isTeacherCursorStreaming,
  teacherCursor,
  hideWhiteboard,
  studentWhiteboard,
  whiteboardCanvas
} = useStudentPage()

// Handle joining the class with a name
const handleJoinClass = () => {
  if (studentName.value.trim()) {
    joinClass(studentName.value.trim())
  }
}

// Helper function to format timestamp
const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}
</script>

<script lang="ts">
export default {};
</script>

<style scoped>
.student-page {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  position: relative;
}

.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #10b981;
  color: white;
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 9999;
  font-weight: 600;
  font-size: 14px;
  min-width: 200px;
  animation: slideIn 0.3s ease-out;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Name Input Section */
.name-input-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.name-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 40px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  text-align: center;
  max-width: 500px;
  width: 100%;
}

.name-card h2 {
  color: #1f2937;
  margin: 0 0 12px 0;
  font-size: 2rem;
  font-weight: 700;
}

.name-card p {
  color: #6b7280;
  margin: 0 0 24px 0;
  font-size: 1.1rem;
}

.name-input-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.name-input {
  padding: 16px 20px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 500;
  transition: all 0.2s ease;
  background: white;
  color: #1f2937;
  text-align: center;
}

.name-input::placeholder {
  color: #9ca3af;
}

.name-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.join-btn {
  padding: 16px 32px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
}

.join-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
}

.join-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.classroom-interface {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.connection-status {
  background: rgba(16, 185, 129, 0.15);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(16, 185, 129, 0.3);
  padding: 12px 16px;
  border-radius: 10px;
  margin-bottom: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.status-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.status-info {
  flex: 1;
}

.connection-status p {
  margin: 4px 0;
  font-weight: 500;
  color: #065f46;
  font-size: 0.9rem;
}

.connection-status p:first-child {
  font-size: 1rem;
  color: #10b981;
  font-weight: 600;
}

.connection-status .error {
  color: #dc2626;
  font-weight: 600;
  background: #fef2f2;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid #fecaca;
  font-size: 0.85rem;
}

/* Compact Cursor Status */
.cursor-status-compact {
  display: flex;
  align-items: center;
}

.cursor-indicator {
  background: linear-gradient(135deg, #dc2626, #f59e0b);
  color: white;
  padding: 6px 12px;
  border-radius: 16px;
  font-size: 0.8rem;
  font-weight: 600;
  animation: pulse 2s infinite;
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
}

.chat-section {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.chat-section h2 {
  margin: 0 0 16px 0;
  color: #1f2937;
  font-size: 1.5rem;
  font-weight: 600;
  flex-shrink: 0;
}

.messages {
  flex: 1;
  overflow-y: auto;
  border: 2px solid #d1d5db;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  background: #ffffff !important;
  scrollbar-width: thin;
  scrollbar-color: #d1d5db transparent;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
  min-height: 0;
}

.messages::-webkit-scrollbar {
  width: 6px;
}

.messages::-webkit-scrollbar-track {
  background: transparent;
}

.messages::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.messages::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.message {
  margin-bottom: 12px;
  padding: 12px 16px;
  background: #ffffff !important;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
  border-left: 4px solid #10b981;
  transition: all 0.2s ease;
}

.message:hover {
  transform: translateX(2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.message-from {
  font-weight: 700;
  color: #1f2937 !important;
  font-size: 0.95rem;
}

.message-time {
  font-size: 0.8rem;
  color: #6b7280 !important;
  font-weight: 500;
}

.message-content {
  color: #111827 !important;
  line-height: 1.6;
  font-size: 1rem;
  font-weight: 500;
  text-shadow: none;
}

.message-teacher {
  border-left-color: #3b82f6;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%) !important;
  box-shadow: 0 2px 6px rgba(59, 130, 246, 0.15);
}

.message-teacher .message-from {
  color: #1d4ed8 !important;
  font-weight: 700;
}

.message-student {
  border-left-color: #10b981;
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%) !important;
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.15);
}

.message-student .message-from {
  color: #059669 !important;
  font-weight: 700;
}

.message-system {
  border-left-color: #f59e0b;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%) !important;
  box-shadow: 0 2px 6px rgba(245, 158, 11, 0.15);
}

.message-system .message-from {
  color: #d97706 !important;
  font-weight: 700;
}

.message-hand-raise {
  border-left-color: #dc2626;
  background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%) !important;
  box-shadow: 0 2px 6px rgba(220, 38, 38, 0.15);
}

.message-hand-raise .message-from {
  color: #dc2626 !important;
  font-weight: 700;
}

.no-messages {
  text-align: center;
  color: #374151 !important;
  font-style: italic;
  font-weight: 500;
  font-size: 1.1rem;
  padding: 40px 20px;
  background: #f8fafc;
  border-radius: 8px;
  border: 2px dashed #d1d5db;
}

.chat-input {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.chat-input input {
  flex: 1;
  padding: 14px 18px;
  border: 3px solid #d1d5db;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  transition: all 0.2s ease;
  background: #ffffff !important;
  color: #111827 !important;
  min-height: 52px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.chat-input input::placeholder {
  color: #6b7280 !important;
  opacity: 1;
  font-weight: 400;
}

.chat-input input:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1);
  background: #ffffff !important;
  color: #111827 !important;
}

.chat-input input:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
}

/* Compact Raise Hand Button */
.raise-hand-btn-compact {
  padding: 12px;
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 18px;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
  min-width: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.raise-hand-btn-compact:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(245, 158, 11, 0.4);
}

.raise-hand-btn-compact:active:not(:disabled) {
  transform: translateY(0);
}

.raise-hand-btn-compact:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Send Button */
.send-btn {
  padding: 12px 24px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  font-size: 16px;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
}

.send-btn:active:not(:disabled) {
  transform: translateY(0);
}

.send-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.teacher-cursor {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.teacher-cursor h2 {
  margin: 0 0 20px 0;
  color: #1f2937;
  font-size: 1.5rem;
  font-weight: 600;
}

.teacher-cursor p {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  padding: 16px;
  border-radius: 12px;
  font-weight: 500;
  color: #92400e;
  border: 1px solid #f59e0b;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.1);
}

.cursor-indicator {
  position: fixed;
  pointer-events: none;
  z-index: 1000;
  font-size: 24px;
  transform: translate(-50%, -50%);
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.1);
  }
}

/* Responsive design */
@media (max-width: 768px) {
  .student-page {
    padding: 12px;
  }
  
  .connection-status {
    padding: 10px 12px;
    margin-bottom: 12px;
  }
  
  .actions {
    margin-bottom: 12px;
  }
  
  .chat-section {
    padding: 12px;
  }
  
  .chat-input {
    flex-direction: column;
    gap: 8px;
  }
  
  .chat-input button {
    width: 100%;
  }
  
  /* Mobile responsive improvements for name input */
  .name-card {
    padding: 30px 20px;
  }
  
  .name-card h2 {
    font-size: 1.8rem;
  }
  
  .name-input {
    font-size: 16px; /* Prevent zoom on iOS */
  }
  
  .join-btn {
    font-size: 16px;
  }
}

@media (max-width: 480px) {
  .student-page {
    padding: 8px;
  }
  
  .connection-status {
    padding: 8px 10px;
    margin-bottom: 10px;
  }
  
  .actions {
    margin-bottom: 10px;
  }
  
  .chat-section {
    padding: 10px;
  }
  
  .chat-input input {
    font-size: 16px; /* Prevent zoom on iOS */
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .student-page {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  }
  
  .connection-status,
  .chat-section,
  .teacher-cursor {
    background: rgba(30, 41, 59, 0.9);
    border-color: rgba(148, 163, 184, 0.2);
  }
  
  .connection-status p,
  .chat-section h2,
  .teacher-cursor h2 {
    color: #f1f5f9;
  }
  
  .messages {
    background: #0f172a;
    border-color: #334155;
  }
  
  .message {
    background: #1e293b;
    color: #f1f5f9;
  }
}

/* Student Whiteboard Overlay Styles */
.student-whiteboard {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.student-whiteboard .whiteboard-overlay {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  width: 95%;
  height: 90%;
  max-width: 1400px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.whiteboard-header {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  padding: 15px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.whiteboard-header h3 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 600;
}

.close-whiteboard-btn {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.close-whiteboard-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.student-whiteboard .whiteboard-canvas {
  flex: 1;
  background: #fafafa;
  position: relative;
  border: none;
  overflow: hidden;
}

/* Teacher cursor pointer */
.teacher-cursor-pointer {
  position: absolute;
  pointer-events: none;
  z-index: 10;
  transition: all 0.1s ease-out;
}

.cursor-dot {
  width: 12px;
  height: 12px;
  background: #ef4444;
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  position: relative;
}

.cursor-dot::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  width: 16px;
  height: 16px;
  border: 2px solid #ef4444;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

.cursor-label {
  background: #ef4444;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  position: absolute;
  top: 20px;
  left: -10px;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.cursor-label::before {
  content: '';
  position: absolute;
  top: -4px;
  left: 15px;
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-bottom: 4px solid #ef4444;
}

@keyframes pulse {
  0% {
    opacity: 0.7;
    transform: scale(1);
  }
  50% {
    opacity: 0.3;
    transform: scale(1.5);
  }
  100% {
    opacity: 0.7;
    transform: scale(1);
  }
}

/* Responsive design for student whiteboard */
@media (max-width: 768px) {
  .student-whiteboard .whiteboard-overlay {
    width: 98%;
    height: 95%;
  }
  
  .whiteboard-header {
    padding: 12px 15px;
  }
  
  .whiteboard-header h3 {
    font-size: 1.1rem;
  }
  
  .close-whiteboard-btn {
    padding: 6px 12px;
    font-size: 13px;
  }
}
</style>