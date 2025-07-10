<template>
  <div class="teacher-page">
    <h1>Teacher Dashboard</h1>
    
    <!-- Notification popup -->
    <div v-if="notification" class="notification">
      {{ notification }}
    </div>
    
    <div class="connection-status">
      <p>Status: {{ isConnected ? 'Connected' : 'Disconnected' }}</p>
      <p v-if="connectionError" class="error">{{ connectionError }}</p>
      <p>Class ID: <strong>{{ classId }}</strong></p>
      <p>Connected Students: <strong>{{ connectedStudents.size }}</strong></p>
      <div v-if="connectedStudents.size > 0" class="student-list">
        <small>Students: {{ Array.from(connectedStudents).join(', ') }}</small>
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
          No messages yet. Start the conversation!
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
        <button 
          @click="sendAnnouncement('📢 Class has started!')" 
          :disabled="!isConnected"
          class="announcement-btn"
        >
          📢 Announce
        </button>
      </div>
    </div>

    <div class="cursor-display" style="display: none;">
      <!-- Cursor display disabled to save quotas - will be implemented later -->
      <h2>Student Cursors (Coming Soon)</h2>
      <p>Real-time cursor tracking will be implemented when needed to save quotas.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import useTeacherPage from './TeacherPage'

const {
  messages,
  newMessage,
  connectedStudents,
  // cursors, // Disabled to save quotas
  isConnected,
  connectionError,
  notification,
  sendMessage,
  sendAnnouncement,
  classId
} = useTeacherPage()

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
.teacher-page {
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
}

.teacher-page h1 {
  color: white;
  text-align: center;
  margin: 0 0 16px 0;
  font-size: 2.2rem;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
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

.connection-status {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  padding: 12px 16px;
  border-radius: 10px;
  margin-bottom: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  flex-shrink: 0;
}

.connection-status p {
  margin: 8px 0;
  font-weight: 500;
  color: #374151;
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

.connection-status .student-list {
  margin-top: 8px;
  padding: 8px 12px;
  background: #f0f9ff;
  border-radius: 8px;
  border-left: 3px solid #0ea5e9;
}

.connection-status .student-list small {
  color: #0369a1;
  font-weight: 500;
}

.chat-section {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
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
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 12px;
  background: #f9fafb;
  scrollbar-width: thin;
  scrollbar-color: #d1d5db transparent;
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
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border-left: 4px solid #3b82f6;
  transition: all 0.2s ease;
}

.message:hover {
  transform: translateX(2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.message-from {
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
}

.message-time {
  font-size: 0.8rem;
  color: #6b7280;
}

.message-content {
  color: #1f2937 !important;
  line-height: 1.5;
  font-size: 1rem;
  font-weight: 500;
}

.message-teacher {
  border-left-color: #3b82f6;
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
}

.message-teacher .message-from {
  color: #1d4ed8;
}

.message-student {
  border-left-color: #10b981;
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
}

.message-student .message-from {
  color: #059669;
}

.message-system {
  border-left-color: #f59e0b;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
}

.message-system .message-from {
  color: #d97706;
}

.message-hand-raise {
  border-left-color: #dc2626;
  background: linear-gradient(135deg, #fef2f2 0%, #fecaca 100%);
}

.message-hand-raise .message-from {
  color: #dc2626;
}

.no-messages {
  text-align: center;
  color: #6b7280;
  font-style: italic;
  padding: 40px 20px;
}

.chat-input {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
  align-items: flex-end;
}

.chat-input input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  font-size: 16px;
  transition: all 0.2s ease;
  background: white !important;
  color: #1f2937 !important;
  min-height: 48px;
}

.chat-input input::placeholder {
  color: #6b7280 !important;
  opacity: 1;
}

.chat-input input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  background: white !important;
}

.chat-input input:disabled {
  background: #f3f4f6;
  cursor: not-allowed;
}

.chat-input button {
  padding: 12px 24px;
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  font-size: 16px;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.chat-input button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
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

.announcement-btn {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
  color: white;
  padding: 12px 20px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
  white-space: nowrap;
}

.announcement-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(245, 158, 11, 0.4);
}

.announcement-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.cursor-display {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.cursor-display h2 {
  margin: 0 0 20px 0;
  color: #1f2937;
  font-size: 1.5rem;
  font-weight: 600;
}

.cursor-info {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}

.cursor-item {
  padding: 16px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px solid #0ea5e9;
  border-radius: 12px;
  font-weight: 500;
  color: #0c4a6e;
  box-shadow: 0 2px 8px rgba(14, 165, 233, 0.1);
  transition: all 0.2s ease;
}

.cursor-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(14, 165, 233, 0.2);
}

/* Responsive design */
@media (max-width: 768px) {
  .teacher-page {
    padding: 12px;
  }
  
  .teacher-page h1 {
    font-size: 1.8rem;
    margin-bottom: 12px;
  }
  
  .connection-status {
    padding: 10px 12px;
    margin-bottom: 12px;
  }
  
  .chat-section {
    padding: 12px;
  }
  
  .chat-input {
    flex-direction: column;
    gap: 8px;
  }
  
  .chat-input button,
  .announcement-btn {
    width: 100%;
    margin: 0;
  }
  
  .cursor-info {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .teacher-page {
    padding: 8px;
  }
  
  .teacher-page h1 {
    font-size: 1.6rem;
    margin-bottom: 10px;
  }
  
  .connection-status {
    padding: 8px 10px;
    margin-bottom: 10px;
  }
  
  .chat-section {
    padding: 10px;
  }
  
  .chat-input input {
    font-size: 16px; /* Prevent zoom on iOS */
  }
}
</style>