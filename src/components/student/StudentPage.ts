import { ref, onMounted, onUnmounted } from 'vue';
import { classService } from '../../services/class.service';
import type { User, CursorData, ChatMessageReceived } from '../../services/class.service';

export default function useStudentPage() {
  const messages = ref<ChatMessageReceived[]>([]);
  const newMessage = ref('');
  const teacherCursor = ref<CursorData | null>(null);
  const isConnected = ref(false);
  const connectionError = ref<string | null>(null);
  const studentName = ref('');
  const hasJoinedClass = ref(false);
  const notification = ref<string | null>(null);
  
  // Cursor streaming state
  const isTeacherCursorStreaming = ref(false);
  const studentWhiteboard = ref<HTMLElement | null>(null);
  const whiteboardCanvas = ref<HTMLElement | null>(null);

  // Private chat state
  const isInPrivateChat = ref(false);
  const privateChatPartnerId = ref<string | null>(null);
  const privateChatPartnerName = ref<string | null>(null);
  const privateMessages = ref<ChatMessageReceived[]>([]);
  const newPrivateMessage = ref('');
  const privateChatRequest = ref<{ teacherId: string; teacherName: string; channelId: string } | null>(null);

  // Auto-hide notification after 3 seconds
  const showNotification = (message: string) => {
    notification.value = message;
    setTimeout(() => {
      notification.value = null;
    }, 3000);
  };

  // Student user data - will be created when name is entered
  let student: User | null = null;

  const classId = 'demo-class-001'; // Should match the teacher's class ID

  // Handle incoming chat messages and cursor data
  const handleChatMessage = (message: ChatMessageReceived) => {
    // Check if we already have this message (prevent duplicates)
    const messageExists = messages.value.some(m => m.id === message.id);
    if (messageExists) {
      return;
    }

    // Add the message to our local messages array
    messages.value.push(message);
    
    // Show notifications for student join/leave (but not for our own messages)
    if (message.type === 'system' && student && message.from !== student.id) {
      if (message.message && message.message.includes('joined the class')) {
        const studentName = message.fromName || 'Unknown Student';
        showNotification(`👋 ${studentName} joined the class`);
      } else if (message.message && message.message.includes('left the class')) {
        const studentName = message.fromName || 'Unknown Student';
        showNotification(`👋 ${studentName} left the class`);
      }
    }
  };

  // Handle cursor toggle messages from teacher
  const handleCursorToggle = (data: any) => {
    if (data.type === 'cursor-toggle' && data.content) {
      const toggleData = data.content;
      if (data.from && data.from.startsWith('teacher-')) {
        if (toggleData.enabled) {
          isTeacherCursorStreaming.value = true;
          showNotification('🎯 Teacher started cursor streaming - Whiteboard opened');
        } else {
          isTeacherCursorStreaming.value = false;
          teacherCursor.value = null;
          showNotification('⚫ Teacher stopped cursor streaming - Whiteboard closed');
        }
      }
    }
  };

  // Handle incoming cursor data from teacher
  const handleCursorData = (data: any) => {
    if (data.type === 'cursor' && data.content) {
      const cursorData = data.content as CursorData;
      
      // Only show teacher cursor
      if (data.from && data.from.startsWith('teacher-')) {
        teacherCursor.value = cursorData;
        
        // Auto-show whiteboard when teacher starts streaming
        if (cursorData.x >= 0 && cursorData.y >= 0 && !isTeacherCursorStreaming.value) {
          isTeacherCursorStreaming.value = true;
          showNotification('🎯 Teacher is demonstrating - whiteboard opened');
        }
        
        // Hide cursor when teacher stops streaming
        if (cursorData.x < 0 || cursorData.y < 0) {
          setTimeout(() => {
            if (teacherCursor.value && (teacherCursor.value.x < 0 || teacherCursor.value.y < 0)) {
              teacherCursor.value = null;
            }
          }, 1000); // Small delay to avoid flickering
        }
      }
    }
  };

  // Join the class with provided name
  const joinClass = async (name: string) => {
    if (!name.trim()) {
      connectionError.value = 'Please enter your name';
      return;
    }

    try {
      connectionError.value = null;
      
      // Create student user with display name and unique ID that includes the name
      const sanitizedName = name.trim().toLowerCase().replace(/[^a-z0-9]/g, '-');
      const uniqueId = `student-${sanitizedName}-${Math.random().toString(36).substr(2, 6)}`;
      student = {
        id: uniqueId,
        name: name.trim(),
        role: 'student'
      };
      
      // Set up handlers BEFORE joining to catch rewind messages
      classService.onMessageReceived(handleChatMessage);
      classService.onCursorReceived(handleCursorData);
      classService.onCursorToggle(handleCursorToggle);
      classService.onPrivateChatReceived(handlePrivateChatMessage);
      
      await classService.joinClass(classId, student);
      
      isConnected.value = true;
      hasJoinedClass.value = true;
      studentName.value = name.trim();
      
      // Test notification system
      showNotification(`✅ You joined the class as ${name.trim()}`);
      
      console.log('Student joined class:', classId, 'as:', name);
      
    } catch (error) {
      console.error('Failed to join class:', error);
      connectionError.value = 'Failed to join class';
      isConnected.value = false;
      student = null;
    }
  };

  // Send a chat message
  const sendMessage = async () => {
    if (!student || !newMessage.value.trim()) return;

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

  // Raise hand (send special message)
  const raiseHand = async () => {
    if (!student) return;
    
    try {
      await classService.sendMessage('🖐️ Hand raised', 'all', 'hand-raise');
      
      // Add to local messages
      const localMessage: ChatMessageReceived = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        classId,
        from: student.id,
        fromName: student.name,
        to: 'all',
        message: '🖐️ Hand raised',
        timestamp: Date.now(),
        type: 'hand-raise'
      };
      messages.value.push(localMessage);
      
    } catch (error) {
      console.error('Failed to raise hand:', error);
      connectionError.value = 'Failed to raise hand';
    }
  };

  // Leave the class
  const leaveClass = async () => {
    classService.removeMessageHandler(handleChatMessage);
    classService.removeCursorHandler(handleCursorData);
    classService.removeCursorToggleHandler(handleCursorToggle);
    classService.removePrivateChatHandler(handlePrivateChatMessage);
    await classService.leaveClass();
    isConnected.value = false;
    teacherCursor.value = null;
    connectionError.value = null;
    
    // Reset cursor streaming state
    isTeacherCursorStreaming.value = false;
  };

  // Hide the whiteboard overlay
  const hideWhiteboard = () => {
    isTeacherCursorStreaming.value = false;
    teacherCursor.value = null;
    showNotification('📋 Whiteboard closed');
  };

  // Handle private chat messages
  const handlePrivateChatMessage = (data: any) => {
    if (data.type === 'private-chat-request') {
      // Extract teacher info from message metadata since backend might not send it in content
      const teacherId = data.from;
      let teacherName = data.fromName;
      
      // Extract teacher name from ID if not provided
      if (!teacherName && teacherId && teacherId.startsWith('teacher-')) {
        // Extract name from ID format: teacher-name or teacher-randomstring
        const parts = teacherId.split('-');
        if (parts.length >= 2) {
          teacherName = parts[1] || 'Teacher';
          // Capitalize first letter
          teacherName = teacherName.charAt(0).toUpperCase() + teacherName.slice(1);
        } else {
          teacherName = 'Teacher';
        }
      }
      
      if (!teacherName) {
        teacherName = 'Teacher'; // Final fallback
      }
      
      // Create the private chat request object
      const privateChatRequestData = {
        teacherId: teacherId,
        teacherName: teacherName,
        studentId: student?.id || '',
        studentName: student?.name || '',
        channelId: `${teacherId}_${student?.id}` // Generate channel ID
      };
      
      privateChatRequest.value = privateChatRequestData;
      
      showNotification(`${teacherName} wants to start a private chat`);
    } else if (data.type === 'private-chat') {
      // Extract sender name based on the from field
      let senderName = data.fromName;
      
      if (!senderName) {
        if (data.from && data.from.startsWith('teacher-')) {
          const parts = data.from.split('-');
          if (parts.length >= 2) {
            senderName = parts[1] || 'Teacher';
            senderName = senderName.charAt(0).toUpperCase() + senderName.slice(1);
          } else {
            senderName = 'Teacher';
          }
          // Use the stored teacher name if available
          if (!senderName || senderName === 'Teacher') {
            senderName = privateChatPartnerName.value || 'Teacher';
          }
        } else if (data.from && data.from.startsWith('student-')) {
          // Handle student messages (own messages)
          senderName = student?.name || 'Student';
        } else {
          // Fallback
          senderName = privateChatPartnerName.value || 'Unknown';
        }
      }
      
      privateMessages.value.push({
        id: `private-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        classId,
        from: data.from,
        fromName: senderName,
        to: student?.id || '',
        message: data.content.text || data.content.message || '', // Handle both 'text' and 'message' fields
        timestamp: data.content.timestamp || Date.now(),
        type: 'private-chat'
      });
    }
  };

  // Accept private chat request
  const acceptPrivateChat = async () => {
    if (!privateChatRequest.value || !student) return;
    
    try {
      // Accept the private chat (pass teacherId and teacherName)
      await classService.acceptPrivateChat(
        privateChatRequest.value.teacherId, 
        privateChatRequest.value.teacherName
      );
      
      // Set up private chat state
      isInPrivateChat.value = true;
      privateChatPartnerId.value = privateChatRequest.value.teacherId;
      privateChatPartnerName.value = privateChatRequest.value.teacherName;
      
      // Clear the request
      privateChatRequest.value = null;
      
      showNotification(`Private chat started with ${privateChatPartnerName.value}`);
    } catch (error) {
      console.error('Failed to accept private chat:', error);
      showNotification('Failed to accept private chat');
    }
  };

  // Decline private chat request
  const declinePrivateChat = () => {
    privateChatRequest.value = null;
    showNotification('Private chat request declined');
  };

  // Send private message
  const sendPrivateMessage = async () => {
    if (!student || !newPrivateMessage.value.trim() || !privateChatPartnerId.value) return;

    const messageText = newPrivateMessage.value;

    try {
      newPrivateMessage.value = ''; // Clear input immediately
      
      // Fix parameter order: message first, then recipientId
      await classService.sendPrivateMessage(messageText, privateChatPartnerId.value);
      
      // Don't add to local messages - it will be received via the private chat handler
      // This prevents message duplication on the student side
      
    } catch (error) {
      console.error('Failed to send private message:', error);
      showNotification('Failed to send private message');
      // Restore the message if sending failed
      newPrivateMessage.value = messageText;
    }
  };

  // End private chat
  const endPrivateChat = async () => {
    if (!student || !privateChatPartnerId.value) return;
    
    try {
      await classService.endPrivateChat();
      
      // Reset private chat state
      isInPrivateChat.value = false;
      privateChatPartnerId.value = null;
      privateChatPartnerName.value = null;
      privateMessages.value = [];
      
      showNotification('Private chat ended');
    } catch (error) {
      console.error('Failed to end private chat:', error);
      showNotification('Failed to end private chat');
    }
  };

  // Setup and cleanup
  onMounted(() => {
    // Don't auto-join, wait for user to enter their name
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
    teacherCursor,
    isConnected,
    connectionError,
    studentName,
    hasJoinedClass,
    notification,
    sendMessage,
    raiseHand,
    joinClass,
    leaveClass,
    showNotification,
    classId, // Add classId directly for template access
    // Cursor streaming functionality
    isTeacherCursorStreaming,
    hideWhiteboard,
    studentWhiteboard,
    whiteboardCanvas,
    handleCursorData,
    handleCursorToggle,
    // Private chat functionality
    isInPrivateChat,
    privateChatPartnerId,
    privateChatPartnerName,
    privateMessages,
    newPrivateMessage,
    privateChatRequest,
    handlePrivateChatMessage,
    acceptPrivateChat,
    declinePrivateChat,
    sendPrivateMessage,
    endPrivateChat
  };
}