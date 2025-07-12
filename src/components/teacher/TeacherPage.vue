<template>
  <div class="teacher-page">
    <!-- Notification popup -->
    <div v-if="notification" class="notification">
      {{ notification }}
    </div>
    
    <div class="connection-status">
      <div class="status-row">
        <div class="status-info">
          <p>Status: {{ isConnected ? 'Connected' : 'Disconnected' }}</p>
          <p v-if="connectionError" class="error">{{ connectionError }}</p>
          <p>Class ID: <strong>{{ classId }}</strong> | Students: <strong>{{ connectedStudents.size }}</strong></p>
          <div v-if="connectedStudents.size > 0" class="student-list">
            <small>{{ Array.from(connectedStudents).join(', ') }}</small>
          </div>
        </div>
        <div class="cursor-control-compact">
          <button 
            @click="toggleCursorStream" 
            :disabled="!isConnected"
            :class="['cursor-btn-compact', { active: isCursorStreamEnabled }]"
            :title="isCursorStreamEnabled ? 'Disable cursor streaming' : 'Enable cursor streaming'"
          >
            {{ isCursorStreamEnabled ? '🔴 Stop Stream' : '🎯 Stream Cursor' }}
          </button>
          <small v-if="isCursorStreamEnabled" class="stream-indicator">Streaming to students</small>
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

    <!-- Cursor Whiteboard for Teacher (when stream is enabled) -->
    <div v-if="isCursorStreamEnabled" class="teacher-whiteboard" ref="teacherWhiteboard">
      <div class="whiteboard-overlay">
        <div class="whiteboard-header">
          <h3>Teacher Whiteboard - Your cursor is being streamed to students</h3>
          <button class="close-button" @click="toggleCursorStream" title="End cursor streaming">
            ✕
          </button>
        </div>
        <div class="whiteboard-canvas" @mousemove="handleMouseMove" @mouseleave="handleMouseLeave">
          <!-- This is where the teacher cursor will be tracked -->
        </div>
      </div>
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
  classId,
  // Cursor stream functionality
  isCursorStreamEnabled,
  toggleCursorStream,
  handleMouseMove,
  handleMouseLeave,
  teacherWhiteboard
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
  color: #374151;
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

.connection-status .student-list {
  margin-top: 6px;
  padding: 6px 10px;
  background: #f0f9ff;
  border-radius: 6px;
  border-left: 3px solid #0ea5e9;
}

.connection-status .student-list small {
  color: #0369a1;
  font-weight: 500;
  font-size: 0.8rem;
}

/* Compact Cursor Control */
.cursor-control-compact {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.cursor-btn-compact {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
  white-space: nowrap;
}

.cursor-btn-compact:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.cursor-btn-compact:disabled {
  background: #9ca3af;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.cursor-btn-compact.active {
  background: linear-gradient(135deg, #dc2626, #f59e0b);
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
  animation: pulse 2s infinite;
}

.cursor-btn-compact.active:hover {
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
}

.stream-indicator {
  color: #dc2626;
  font-weight: 600;
  font-size: 0.75rem;
  animation: blink 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
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

/* Teacher Whiteboard Styles */
.teacher-whiteboard {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.whiteboard-overlay {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  width: 90%;
  height: 80%;
  max-width: 1200px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.whiteboard-header {
  background: #1e293b;
  color: white;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.whiteboard-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 600;
}

.close-button {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  transition: all 0.2s ease;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  transform: scale(1.05);
}

.whiteboard-canvas {
  flex: 1;
  background: white;
  cursor: crosshair;
  position: relative;
  border: 2px solid #e2e8f0;
}

.whiteboard-canvas::before {
  content: "Move your cursor here - students can see it in real-time";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #94a3b8;
  font-size: 18px;
  text-align: center;
  pointer-events: none;
}
</style>