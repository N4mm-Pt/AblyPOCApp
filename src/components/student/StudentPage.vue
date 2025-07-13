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
        <!-- Private chat request notification -->
        <div v-if="privateChatRequest" class="private-chat-request">
          <div class="request-header">
            <h3>Private Chat Request</h3>
            <p><strong>{{ privateChatRequest.teacherName }}</strong> wants to start a private chat with you</p>
          </div>
          <div class="request-actions">
            <button @click="acceptPrivateChat" class="accept-btn">Accept</button>
            <button @click="declinePrivateChat" class="decline-btn">Decline</button>
          </div>
        </div>

        <!-- Private Chat Interface -->
        <div v-if="isInPrivateChat" class="private-chat-interface">
          <div class="private-chat-header">
            <h2>Private Chat with {{ privateChatPartnerName }}</h2>
            <button @click="endPrivateChat" class="end-chat-btn">End Chat</button>
          </div>
          
          <div class="private-messages">
            <div 
              v-for="message in privateMessages" 
              :key="message.id" 
              class="message"
              :class="{
                'message-teacher': message.from && message.from.startsWith('teacher-'),
                'message-student': message.from && message.from.startsWith('student-')
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
              Private chat started. Say hello!
            </div>
          </div>
          
          <div class="chat-input">
            <input 
              v-model="newPrivateMessage" 
              @keyup.enter="sendPrivateMessage"
              placeholder="Type a private message..."
              :disabled="!isConnected"
            />
            <button @click="sendPrivateMessage" :disabled="!isConnected || !newPrivateMessage.trim()" class="send-btn">
              Send
            </button>
          </div>
        </div>

        <!-- Main Chat Interface (when not in private chat) -->
        <div v-else class="main-chat-interface">
          <h2>Class Chat</h2>
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
import './StudentPage.css'
import './StudentWhiteboard.css'
import './StudentPrivateChat.css'
import './StudentResponsive.css'

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
  whiteboardCanvas,
  // Private chat functionality
  isInPrivateChat,
  privateChatPartnerName,
  privateMessages,
  newPrivateMessage,
  privateChatRequest,
  acceptPrivateChat,
  declinePrivateChat,
  sendPrivateMessage,
  endPrivateChat
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
