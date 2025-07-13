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
            <small>Connected Students:</small>
            <div class="student-names">
              <button 
                v-for="[studentId, studentName] in Array.from(connectedStudents)" 
                :key="studentId"
                @click="startPrivateChat(studentId, studentName)"
                class="student-name-btn"
                :title="`Start private chat with ${studentName}`"
              >
                👤 {{ studentName }}
              </button>
            </div>
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
      <!-- Main Chat View -->
      <div v-if="!isInPrivateChat">
        <h2>Main Chat</h2>
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

      <!-- Private Chat View -->
      <div v-else class="private-chat">
        <div class="private-chat-header">
          <h2>💬 Private Chat with {{ privateChatStudent?.name }}</h2>
          <button @click="endPrivateChat" class="end-chat-btn" title="End private chat">
            ✕ End Chat
          </button>
        </div>
        <div class="messages">
          <div 
            v-for="message in privateMessages" 
            :key="message.id" 
            class="message"
            :class="{
              'message-teacher': message.from && message.from.startsWith('teacher-'),
              'message-student': message.from && message.from.startsWith('student-'),
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
          <div v-if="privateMessages.length === 0" class="no-messages">
            Private conversation started. Say hello!
          </div>
        </div>
        <div class="chat-input">
          <input 
            v-model="newPrivateMessage" 
            @keyup.enter="sendPrivateMessage"
            placeholder="Type a private message..."
            :disabled="!isConnected"
          />
          <button @click="sendPrivateMessage" :disabled="!isConnected || !newPrivateMessage.trim()">
            Send Private
          </button>
        </div>
      </div>
    </div>

    <!-- Cursor display removed to give more space to chat -->

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
import './TeacherPage.css'
import './TeacherWhiteboard.css'
import './TeacherResponsive.css'

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
  teacherWhiteboard,
  // Private chat functionality
  isInPrivateChat,
  privateChatStudent,
  privateMessages,
  newPrivateMessage,
  startPrivateChat,
  sendPrivateMessage,
  endPrivateChat
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