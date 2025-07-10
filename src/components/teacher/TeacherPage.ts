import { ref, onMounted, onUnmounted } from 'vue';
import { classService } from '../../services/class.service';
import type { User, CursorData, ChatMessageReceived } from '../../services/class.service';

export default function useTeacherPage() {
  const messages = ref<ChatMessageReceived[]>([]);
  const newMessage = ref('');
  const connectedStudents = ref<Set<string>>(new Set()); // Store student names, not IDs
  const cursors = ref<Map<string, CursorData>>(new Map());
  const isConnected = ref(false);
  const connectionError = ref<string | null>(null);
  const notification = ref<string | null>(null);

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
    // Don't add duplicate messages from self
    if (message.from !== teacher.id) {
      messages.value.push(message);
      
      // Handle system messages for student join/leave
      if (message.type === 'system') {
        if (message.message && message.message.includes('joined the class')) {
          // Add student to connected list when they join
          const studentName = message.fromName || 'Unknown Student';
          connectedStudents.value.add(studentName);
          showNotification(`🎉 ${studentName} joined the class`);
        } else if (message.message && message.message.includes('left the class')) {
          // Remove student from connected list when they leave
          const studentName = message.fromName || 'Unknown Student';
          connectedStudents.value.delete(studentName);
          showNotification(`👋 ${studentName} left the class`);
        }
      } else {
        // Track connected students based on regular messages using their display names
        // Add student to connected list when they send any message
        if (message.from.startsWith('student-') && message.fromName) {
          connectedStudents.value.add(message.fromName);
        }
      }
    }
  };

  // Join the class when component mounts
  const joinClass = async () => {
    try {
      connectionError.value = null;
      await classService.joinClass(classId, teacher);
      
      // Set up message handler
      classService.onMessageReceived(handleChatMessage);
      
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
      
      // Add to local messages since emitMessage is called in sendMessage
      const localMessage: ChatMessageReceived = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        classId,
        from: teacher.id,
        fromName: teacher.name,
        to: 'all',
        message: messageText,
        timestamp: Date.now(),
        type: 'chat'
      };
      messages.value.push(localMessage);
      
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
    classId // Add classId directly for template access
  };
}