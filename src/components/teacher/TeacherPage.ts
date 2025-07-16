import { ref, onMounted, onUnmounted } from 'vue';
import { classService } from '../../services/class.service';
import { apiService } from '../../services/api.service';
import type { User, CursorData, ChatMessageReceived } from '../../services/class.service';

// Cursor stream batch configuration - optimized for efficiency
const CURSOR_BATCH_INTERVAL = 100; // Send every 100ms for 10 messages per second maximum

export default function useTeacherPage() {
  const messages = ref<ChatMessageReceived[]>([]);
  const newMessage = ref('');
  const connectedStudents = ref<Map<string, string>>(new Map()); // Store student ID -> name mapping
  const cursors = ref<Map<string, CursorData>>(new Map());
  const isConnected = ref(false);
  const connectionError = ref<string | null>(null);
  const notification = ref<string | null>(null);
  
  // Cursor stream mode state
  const isCursorStreamEnabled = ref(false);
  const teacherWhiteboard = ref<HTMLElement | null>(null);
  const cursorBatch = ref<CursorData[]>([]);
  const batchTimer = ref<number | null>(null);
  const lastSentPosition = ref<{ x: number; y: number } | null>(null);

  // Private chat state
  const isInPrivateChat = ref(false);
  const privateChatStudent = ref<{ id: string; name: string } | null>(null);
  const privateMessages = ref<ChatMessageReceived[]>([]);
  const newPrivateMessage = ref('');

  // Auto-hide notification after 3 seconds
  const showNotification = (message: string) => {
    notification.value = message;
    setTimeout(() => {
      notification.value = null;
    }, 3000);
  };

  // Teacher user data
  const teacher: User = {
    id: 'teacher-' + Math.random().toString(36).substr(2, 9),
    name: 'Teacher',
    role: 'teacher'
  };

  const classId = 'demo-class-001'; // You can make this dynamic

  // Handle incoming chat messages
  const handleChatMessage = (message: ChatMessageReceived) => {
    
    // Check if we already have this message (prevent duplicates)
    const messageExists = messages.value.some(m => m.id === message.id);
    if (messageExists) {
      return;
    }

    // Add the message to our local messages array
    messages.value.push(message);
    
    // Handle system messages for student join/leave (but not for our own messages)
    if (message.type === 'system' && message.from !== teacher.id) {
      if (message.message && message.message.includes('joined the class')) {
        // Only add to connected list if it's actually a student (not a teacher)
        const userId = message.from;
        const isStudent = userId && userId.startsWith('student-');
        
        if (isStudent) {
          const studentName = message.fromName || 'Unknown Student';
          const studentId = message.from; // This is the actual student ID
          connectedStudents.value.set(studentId, studentName);
          showNotification(`🎉 ${studentName} joined the class`);
        }
      } else if (message.message && message.message.includes('left the class')) {
        // Only remove from connected list if it's actually a student
        const userId = message.from;
        const isStudent = userId && userId.startsWith('student-');
        
        if (isStudent) {
          const studentId = message.from;
          const studentName = message.fromName || 'Unknown Student';
          connectedStudents.value.delete(studentId);
          showNotification(`👋 ${studentName} left the class`);
        }
      }
    } else if (message.from !== teacher.id) {
      // Track connected students based on regular messages using their display names
      // Add student to connected list when they send any message
      if (message.from.startsWith('student-') && message.fromName) {
        connectedStudents.value.set(message.from, message.fromName);
      }
    }
  };

  // Handle private chat messages
  const handlePrivateChatMessage = (data: any) => {
    if (data.type === 'private-chat-message' || data.type === 'private-chat') {
      // Handle both old format (data.data) and new format (data.content)
      const messageData = data.data || data;
      const content = messageData.content || data.content;
      
      if (content && (content.text || content.message)) {
        // Extract sender name based on the from field
        let senderName = messageData.fromName || data.fromName;
        
        if (!senderName) {
          if (messageData.from && messageData.from.startsWith('student-')) {
            const parts = messageData.from.split('-');
            if (parts.length >= 2) {
              senderName = parts[1] || 'Student';
              senderName = senderName.charAt(0).toUpperCase() + senderName.slice(1);
            } else {
              senderName = 'Student';
            }
            // Use the stored student name if available
            if (!senderName || senderName === 'Student') {
              senderName = privateChatStudent.value?.name || 'Student';
            }
          } else if (messageData.from && messageData.from.startsWith('teacher-')) {
            // Handle teacher messages (own messages)
            senderName = teacher.name || 'Teacher';
          } else {
            // Fallback
            senderName = privateChatStudent.value?.name || 'Unknown';
          }
        }
        
        const privateMessage: ChatMessageReceived = {
          id: `private-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          classId: messageData.classId || classId,
          from: messageData.from || data.from,
          fromName: senderName,
          to: messageData.to || data.to,
          message: content.text || content.message || '',
          timestamp: content.timestamp || Date.now(),
          type: 'chat'
        };
        privateMessages.value.push(privateMessage);
      }
    }
  };

  // Start private chat with a student
  const startPrivateChat = async (studentId: string, studentName: string) => {
    try {
      await classService.startPrivateChat(studentId, studentName);
      isInPrivateChat.value = true;
      privateChatStudent.value = { id: studentId, name: studentName };
      privateMessages.value = []; // Clear previous private messages
      showNotification(`📱 Started private chat with ${studentName}`);
    } catch (error) {
      console.error('Failed to start private chat:', error);
      showNotification('❌ Failed to start private chat');
    }
  };

  // Send private message
  const sendPrivateMessage = async () => {
    if (!newPrivateMessage.value.trim() || !privateChatStudent.value) return;

    const messageText = newPrivateMessage.value;
    
    try {
      newPrivateMessage.value = ''; // Clear input immediately
      
      await classService.sendPrivateMessage(messageText, privateChatStudent.value.id);
      
      // Don't add to local messages - it will be received via the private chat handler
      // This prevents message duplication on the teacher side
      
    } catch (error) {
      console.error('Failed to send private message:', error);
      newPrivateMessage.value = messageText; // Restore message on error
    }
  };

  // End private chat and return to main channel
  const endPrivateChat = async () => {
    try {
      await classService.endPrivateChat();
      isInPrivateChat.value = false;
      privateChatStudent.value = null;
      privateMessages.value = [];
      showNotification('📱 Ended private chat - returned to main channel');
    } catch (error) {
      console.error('Failed to end private chat:', error);
      showNotification('❌ Failed to end private chat');
    }
  };

  // Join the class when component mounts
  const joinClass = async () => {
    try {
      connectionError.value = null;
      
      // Set up message handlers BEFORE joining to catch rewind messages
      classService.onMessageReceived(handleChatMessage);
      classService.onPrivateChatReceived(handlePrivateChatMessage);
      
      await classService.joinClass(classId, teacher);
      
      isConnected.value = true;
      
    } catch (error) {
      console.error('Failed to join class:', error);
      connectionError.value = 'Failed to join class';
      isConnected.value = false;
    }
  };

  // Send a chat message
  const sendMessage = async () => {
    if (!newMessage.value.trim()) return;

    const messageText = newMessage.value;
    
    try {
      newMessage.value = ''; // Clear input immediately for better UX
      
      await classService.sendMessage(messageText, 'all', 'chat');
      
      // Don't add to local messages - it will be received via the message handler
      // This prevents message duplication
      
    } catch (error) {
      console.error('Failed to send message:', error);
      connectionError.value = 'Failed to send message';
      // Restore the message if sending failed
      newMessage.value = messageText;
    }
  };

  // Send a system announcement
  const sendAnnouncement = async (announcement: string) => {
    try {
      await classService.sendMessage(announcement, 'all', 'system');
    } catch (error) {
      console.error('Failed to send announcement:', error);
    }
  };

  // Leave the class
  const leaveClass = async () => {
    classService.removeMessageHandler(handleChatMessage);
    await classService.leaveClass();
    isConnected.value = false;
    connectedStudents.value.clear();
    cursors.value.clear();
    connectionError.value = null;
    
    // Cleanup cursor stream
    if (isCursorStreamEnabled.value) {
      toggleCursorStream();
    }
  };

  // Cursor stream functionality
  const toggleCursorStream = async () => {
    isCursorStreamEnabled.value = !isCursorStreamEnabled.value;

    try {
      // Notify all students about cursor stream toggle
      await apiService.toggleCursorStream(classId, teacher.id, teacher.name, isCursorStreamEnabled.value);

      if (isCursorStreamEnabled.value) {
        showNotification('🔴 Cursor stream enabled - Your cursor is being shared with students');
        startCursorBatching();
      } else {
        showNotification('⚫ Cursor stream disabled');
        stopCursorBatching();
      }
    } catch (error) {
      console.error('Failed to toggle cursor stream:', error);
      // Revert the toggle if API call failed
      isCursorStreamEnabled.value = !isCursorStreamEnabled.value;
      showNotification('❌ Failed to toggle cursor stream');
    }
  };

  const startCursorBatching = () => {
    // Start the batch timer to send cursor updates every 100ms (10 FPS)
    // This provides smooth cursor movement while limiting to ~10 messages per second
    batchTimer.value = window.setInterval(sendCursorBatch, CURSOR_BATCH_INTERVAL);
  };

  const stopCursorBatching = () => {
    if (batchTimer.value) {
      clearInterval(batchTimer.value);
      batchTimer.value = null;
    }
    cursorBatch.value = [];
    lastSentPosition.value = null; // Reset throttling
  };

  const sendCursorBatch = async () => {
    if (cursorBatch.value.length > 0) {
      try {
        // Send only the latest cursor position to avoid flooding
        // This dramatically reduces the number of messages sent
        const latestCursor = cursorBatch.value[cursorBatch.value.length - 1];
        await classService.sendCursorData(latestCursor);
        
        // Clear the batch
        cursorBatch.value = [];
      } catch (error) {
        console.error('Failed to send cursor data:', error);
      }
    }
  };

  const handleMouseMove = (event: MouseEvent) => {
    if (!isCursorStreamEnabled.value || !teacherWhiteboard.value) return;

    const rect = teacherWhiteboard.value.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100; // Percentage position
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    // Throttle: only add to batch if position changed significantly (reduces noise)
    const threshold = 0.5; // 0.5% threshold
    if (lastSentPosition.value) {
      const deltaX = Math.abs(x - lastSentPosition.value.x);
      const deltaY = Math.abs(y - lastSentPosition.value.y);
      if (deltaX < threshold && deltaY < threshold) {
        return; // Skip if movement is too small
      }
    }

    const cursorData: CursorData = {
      userId: teacher.id,
      userName: teacher.name,
      x,
      y,
      timestamp: Date.now()
    };

    // Update last position for throttling
    lastSentPosition.value = { x, y };

    // Add to batch (only keep the latest few positions to avoid memory buildup)
    if (cursorBatch.value.length < 5) {
      cursorBatch.value.push(cursorData);
    } else {
      // Replace the oldest position to maintain a sliding window
      cursorBatch.value.shift();
      cursorBatch.value.push(cursorData);
    }
  };

  const handleMouseLeave = () => {
    if (!isCursorStreamEnabled.value) return;
    
    // Send a "cursor left" signal
    const cursorData: CursorData = {
      userId: teacher.id,
      userName: teacher.name,
      x: -1, // Use -1 to indicate cursor left the area
      y: -1,
      timestamp: Date.now()
    };

    cursorBatch.value.push(cursorData);
  };

  // Setup and cleanup
  onMounted(() => {
    joinClass();
    // Mouse movement tracking disabled to save quotas
    // document.addEventListener('mousemove', handleMouseMove);
  });

  onUnmounted(() => {
    leaveClass();
    // document.removeEventListener('mousemove', handleMouseMove);
  });

  return {
    messages,
    newMessage,
    connectedStudents,
    cursors,
    isConnected,
    connectionError,
    notification,
    sendMessage,
    sendAnnouncement,
    joinClass,
    leaveClass,
    showNotification,
    classId, // Add classId directly for template access
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
  };
}