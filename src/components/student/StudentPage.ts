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

  // Handle incoming chat messages
  const handleChatMessage = (message: ChatMessageReceived) => {
    // Don't add duplicate messages from self
    if (student && message.from !== student.id) {
      messages.value.push(message);
      
      // Show notifications for student join/leave
      if (message.type === 'system') {
        if (message.message && message.message.includes('joined the class')) {
          const studentName = message.fromName || 'Unknown Student';
          showNotification(`👋 ${studentName} joined the class`);
        } else if (message.message && message.message.includes('left the class')) {
          const studentName = message.fromName || 'Unknown Student';
          showNotification(`👋 ${studentName} left the class`);
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
      
      await classService.joinClass(classId, student);
      
      // Set up message handler
      classService.onMessageReceived(handleChatMessage);
      
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
      
      // Add to local messages
      const localMessage: ChatMessageReceived = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        classId,
        from: student.id,
        fromName: student.name,
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
    await classService.leaveClass();
    isConnected.value = false;
    teacherCursor.value = null;
    connectionError.value = null;
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
    classId // Add classId directly for template access
  };
}