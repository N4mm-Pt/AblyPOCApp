<template>
  <div class="student-page">
    <h1>Student View</h1>
    
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
        <p>Status: {{ isConnected ? 'Connected' : 'Disconnected' }}</p>
        <p v-if="connectionError" class="error">{{ connectionError }}</p>
        <p>Student: <strong>{{ studentName }}</strong></p>
        <p>Class ID: <strong>{{ classId }}</strong></p>
      </div>

      <div class="actions">
        <button @click="raiseHand" :disabled="!isConnected" class="raise-hand-btn">
          🖐️ Raise Hand
        </button>
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
        <button @click="sendMessage" :disabled="!isConnected || !newMessage.trim()">
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
  classId
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

.student-page h1 {
  color: white;
  text-align: center;
  margin: 0 0 16px 0;
  font-size: 2.2rem;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
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

.connection-status p {
  margin: 8px 0;
  font-weight: 500;
  color: #065f46;
}

.connection-status p:first-child {
  font-size: 1.1rem;
  color: #10b981;
  font-weight: 600;
}

.connection-status .error {
  color: #dc2626;
  font-weight: 600;
  background: #fef2f2;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #fecaca;
}

.actions {
  margin-bottom: 12px;
  display: flex;
  justify-content: center;
  flex-shrink: 0;
}

.raise-hand-btn {
  padding: 16px 32px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  font-size: 18px;
  font-weight: 600;
  transition: all 0.3s ease;
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
  position: relative;
  overflow: hidden;
}

.raise-hand-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.raise-hand-btn:hover:not(:disabled)::before {
  left: 100%;
}

.raise-hand-btn:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(16, 185, 129, 0.4);
}

.raise-hand-btn:active:not(:disabled) {
  transform: translateY(-1px);
}

.raise-hand-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
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
  gap: 12px;
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

.chat-input button {
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

.chat-input button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4);
}

.chat-input button:active:not(:disabled) {
  transform: translateY(0);
}

.chat-input button:disabled {
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
  
  .student-page h1 {
    font-size: 1.8rem;
    margin-bottom: 12px;
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
  
  .raise-hand-btn {
    padding: 14px 24px;
    font-size: 16px;
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
  
  .student-page h1 {
    font-size: 1.6rem;
    margin-bottom: 10px;
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
  
  .raise-hand-btn {
    padding: 12px 20px;
    font-size: 15px;
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
</style>