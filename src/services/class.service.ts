import { apiService, createChatMessage, createPrivateChatMessage } from './api.service';
import type { CursorData, ChatMessage, PrivateChatRequest } from './api.service';
import type * as Ably from 'ably';

// Re-export types for convenience
export type { CursorData, ChatMessage, PrivateChatRequest } from './api.service';

export interface ChatMessageReceived {
  id: string;
  classId: string;
  from: string;
  fromName: string;
  to: string;
  message: string;
  timestamp: number;
  type: 'chat' | 'system' | 'hand-raise' | 'private-chat';
}

export interface ClassRoom {
  id: string;
  name: string;
  teacherId: string;
  students: string[];
}

export interface User {
  id: string;
  name: string;
  role: 'teacher' | 'student';
}

/**
 * Service for handling classroom-specific operations
 */
export class ClassService {
  private currentClassId: string | null = null;
  private currentUser: User | null = null;
  private messageHandlers: ((message: ChatMessageReceived) => void)[] = [];
  private cursorHandlers: ((data: any) => void)[] = [];
  private cursorToggleHandlers: ((data: any) => void)[] = [];
  private privateChatHandlers: ((data: any) => void)[] = [];
  private ablyChannel: Ably.RealtimeChannel | null = null;
  private privateChannel: Ably.RealtimeChannel | null = null;
  private userDisplayNames: Map<string, string> = new Map(); // Track user ID to display name mapping
  private isInPrivateChat: boolean = false;
  private currentPrivateChannelId: string | null = null;
  // Note: WebSocket properties removed to save quotas - will be added back when needed

  /**
   * Join a classroom
   * @param classId The class ID to join
   * @param user The user joining the class
   */
  async joinClass(classId: string, user: User): Promise<void> {
    this.currentClassId = classId;
    this.currentUser = user;
    
    // Store the user's display name for message header display
    this.userDisplayNames.set(user.id, user.name);
    
    try {
      // Initialize Ably connection
      await apiService.initializeAbly(user.id);
      
      // Subscribe to class channel for real-time messages
      // The rewind functionality is handled automatically by Ably
      this.ablyChannel = await apiService.subscribeToClassChannel(classId, (data: any) => {
        this.handleAblyMessage(data);
      });
      
      // If student, also auto-subscribe to their private channel for potential teacher messages
      if (user.role === 'student') {
        const privateChannelId = `${user.id}`;
        this.privateChannel = await apiService.subscribeToPrivateChannel(privateChannelId, (data: any) => {
          this.handlePrivateMessage(data);
        });
      }
      
      // Notify the server that this student has joined the class
      await apiService.notifyStudentJoin(classId, user.id, user.name);
      
      console.log(`User ${user.name} joined class ${classId} with Ably subscription and auto-rewind`);
    } catch (error) {
      console.error('Failed to subscribe to Ably channel:', error);
      throw error;
    }
  }

  /**
   * Leave the current classroom
   */
  async leaveClass(): Promise<void> {
    if (this.currentClassId && this.currentUser) {
      try {
        // Notify the server that this student is leaving the class
        await apiService.notifyStudentLeave(this.currentClassId, this.currentUser.id, this.currentUser.name);
        
        await apiService.unsubscribeFromClassChannel(this.currentClassId);
        
        // Also unsubscribe from private channel if connected
        if (this.currentPrivateChannelId) {
          await apiService.unsubscribeFromPrivateChannel(this.currentPrivateChannelId);
        }
        
        apiService.disconnectAbly();
      } catch (error) {
        console.error('Error unsubscribing from Ably:', error);
      }
    }
    
    this.currentClassId = null;
    this.currentUser = null;
    this.ablyChannel = null;
    this.privateChannel = null;
    this.currentPrivateChannelId = null;
    this.isInPrivateChat = false;
    this.userDisplayNames.clear(); // Clear stored display names when leaving class
    console.log('Left the classroom');
  }

  /**
   * Handle incoming private messages
   */
  private handlePrivateMessage(data: any): void {
    try {
      // Handle private chat requests
      if (data.type === 'private-chat-request' && data.content) {
        this.emitPrivateChatRequest(data);
        return;
      }

      // Handle private chat messages
      if (data.type === 'private-chat' && data.content) {
        this.emitPrivateChatMessage(data);
        return;
      }
    } catch (error) {
      console.error('Error handling private message:', error);
    }
  }

  /**
   * Handle incoming Ably messages
   */
  private handleAblyMessage(data: any): void {
    try {
      // Handle private chat requests (these come through main channel)
      if (data.type === 'private-chat-request' && data.content) {
        this.emitPrivateChatRequest(data);
        return;
      }

      // Handle cursor streaming data
      if (data.type === 'cursor' && data.content) {
        this.emitCursorData(data);
        return;
      }

      // Handle cursor toggle messages
      if (data.type === 'cursor-toggle' && data.content) {
        this.emitCursorToggle(data);
        return;
      }

      // Handle student join/leave notifications
      if (data.type === 'student-join' && data.content && this.currentClassId && this.currentUser) {
        const joinData = data.content;
        
        // Skip invalid content (like {ValueKind: 1})
        if (joinData.ValueKind !== undefined) {
          console.log('Skipping student-join message with invalid content:', joinData);
          return;
        }
        
        // Try to extract student info from the original message if content parsing fails
        let studentId = joinData.studentId || data.from;
        let studentName = joinData.studentName;
        
        // If we can't get the name from content, try to extract from the ID
        if (!studentName && studentId) {
          // Extract name from ID format: student-name-randomstring
          if (studentId.startsWith('student-')) {
            const parts = studentId.split('-');
            if (parts.length >= 2) {
              // Take everything between 'student-' and the last random part
              const nameParts = parts.slice(1, -1);
              studentName = nameParts.join(' ');
              // Capitalize first letter of each word
              studentName = studentName.split(' ').map((word: string) => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ');
            }
          }
        }
        
        // Store the new student's display name
        this.userDisplayNames.set(studentId, studentName);
        
        // Emit a special join message for UI updates
        const joinMessage: ChatMessageReceived = {
          id: `join-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          classId: this.currentClassId,
          from: studentId,
          fromName: studentName,
          to: 'all',
          message: `${studentName} joined the class`,
          timestamp: joinData.timestamp || Date.now(),
          type: 'system'
        };
        
        // Emit the join message - duplicate handling is done in the components
        this.emitMessage(joinMessage);
        return;
      }

      if (data.type === 'student-leave' && data.content && this.currentClassId && this.currentUser) {
        const leaveData = data.content;
        
        // Skip invalid content (like {ValueKind: 1})
        if (leaveData.ValueKind !== undefined) {
          console.log('Skipping student-leave message with invalid content:', leaveData);
          return;
        }
        
        // Emit a special leave message for UI updates
        const leaveMessage: ChatMessageReceived = {
          id: `leave-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          classId: this.currentClassId,
          from: leaveData.studentId,
          fromName: leaveData.studentName,
          to: 'all',
          message: `${leaveData.studentName} left the class`,
          timestamp: leaveData.timestamp || Date.now(),
          type: 'system'
        };
        
        // Emit the leave message - duplicate handling is done in the components
        this.emitMessage(leaveMessage);
        
        // Remove the student's display name from mapping
        this.userDisplayNames.delete(leaveData.studentId);
        return;
      }

      // Handle regular chat messages
      if (data.type === 'chat' && data.content && this.currentClassId && this.currentUser) {
        // Get display name from stored mapping, fallback to extracting from ID
        let displayName = this.userDisplayNames.get(data.from);
        if (!displayName) {
          // If not found in mapping, try to extract from ID format
          if (data.from.startsWith('teacher-')) {
            displayName = 'Teacher';
          } else if (data.from.startsWith('student-')) {
            // Extract name from ID format: student-john-doe-abc123 -> John Doe
            const parts = data.from.split('-');
            if (parts.length >= 3) {
              const nameParts = parts.slice(1, -1); // Remove 'student' prefix and random suffix
              displayName = nameParts.map((part: string) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
            } else {
              displayName = data.from; // Fallback to ID
            }
          } else {
            displayName = data.from; // Fallback to ID
          }
          // Store the extracted name for future use
          if (displayName) {
            this.userDisplayNames.set(data.from, displayName);
          }
        }

        // Use backend timestamp if available, fallback to current time
        const messageTimestamp = data.content.Timestamp || data.content.timestamp || Date.now();
        const messageText = data.content.Text || data.content.text || '';
        
        // Create a simple hash of the message for better ID uniqueness
        const messageHash = messageText.split('').reduce((a: number, b: string) => {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0);
        
        const message: ChatMessageReceived = {
          id: `${data.from}-${messageTimestamp}-${Math.abs(messageHash)}`,
          classId: this.currentClassId,
          from: data.from,
          fromName: displayName || data.from,
          to: data.to,
          message: messageText,
          timestamp: messageTimestamp,
          type: data.content.MessageType || data.content.messageType || 'chat'
        };

        // Emit all messages - duplicate handling is done in the components
        this.emitMessage(message);
      }
    } catch (error) {
      console.error('Error handling Ably message:', error);
    }
  }

  /**
   * Send a chat message in the current class
   * @param message The message content
   * @param to Recipient (default: 'all')
   * @param messageType Type of message (default: 'chat')
   */
  async sendMessage(
    message: string, 
    to: string = 'all', 
    messageType: 'chat' | 'system' | 'hand-raise' = 'chat'
  ): Promise<void> {
    if (!this.currentClassId || !this.currentUser) {
      throw new Error('Must join a class before sending messages');
    }

    const chatMessage: ChatMessage = {
      text: message,  // Changed from "message" to "text" to match backend
      timestamp: Date.now(),
      messageType
    };

    const messageWrapper = createChatMessage(
      this.currentClassId,
      this.currentUser.id,
      to,
      chatMessage
    );

    try {
      await apiService.sendChatMessage(messageWrapper);
      
      // Don't emit locally - the message will be received via Ably subscription
      // This prevents duplication
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Connect to cursor streaming for the current class
   * Currently disabled to save quotas - will be implemented later
   */
  connectCursor(
    _onCursorUpdate?: (userId: string, cursor: CursorData) => void,
    _onError?: (error: Event) => void,
    _onDisconnect?: (event: CloseEvent) => void
  ): void {
    console.log('Cursor streaming disabled to save quotas');
    // Implementation will be added later when needed
    return;
  }

  /**
   * Send cursor position data
   * Currently disabled to save quotas - will be implemented later
   */
  sendCursorPosition(_x: number, _y: number, _additionalData?: Record<string, any>): void {
    console.log('Cursor position tracking disabled to save quotas');
    // Implementation will be added later when needed
    return;
  }

  /**
   * Disconnect cursor streaming
   * Currently disabled to save quotas - will be implemented later
   */
  disconnectCursor(): void {
    // Implementation will be added later when needed
    return;
  }

  /**
   * Get current class information
   */
  getCurrentClass(): { classId: string | null; user: User | null } {
    return {
      classId: this.currentClassId,
      user: this.currentUser
    };
  }

  /**
   * Send cursor data to the class channel
   */
  async sendCursorData(cursorData: CursorData): Promise<void> {
    if (!this.currentClassId || !this.currentUser) {
      throw new Error('Not connected to a class');
    }

    try {
      // Send cursor data directly via Ably (bypassing backend API for efficiency)
      // This avoids overwhelming the backend with hundreds of cursor position updates
      await apiService.sendCursorDataViaAbly(this.currentClassId, cursorData);
    } catch (error) {
      console.error('Failed to send cursor data:', error);
      throw error;
    }
  }

  /**
   * Check if user is connected to a class
   */
  isConnected(): boolean {
    return this.currentClassId !== null && this.currentUser !== null;
  }

  /**
   * Check if cursor streaming is active
   * Currently always returns false since cursor streaming is disabled
   */
  isCursorConnected(): boolean {
    return false; // Always false since cursor streaming is disabled
  }

  /**
   * Add a message handler for incoming chat messages
   */
  onMessageReceived(handler: (message: ChatMessageReceived) => void): void {
    this.messageHandlers.push(handler);
  }

  /**
   * Add a cursor handler for incoming cursor data
   */
  onCursorReceived(handler: (data: any) => void): void {
    this.cursorHandlers.push(handler);
  }

  /**
   * Remove a cursor handler
   */
  removeCursorHandler(handler: (data: any) => void): void {
    const index = this.cursorHandlers.indexOf(handler);
    if (index > -1) {
      this.cursorHandlers.splice(index, 1);
    }
  }

  /**
   * Add a cursor toggle handler for incoming cursor toggle events
   */
  onCursorToggle(handler: (data: any) => void): void {
    this.cursorToggleHandlers.push(handler);
  }

  /**
   * Remove a cursor toggle handler
   */
  removeCursorToggleHandler(handler: (data: any) => void): void {
    const index = this.cursorToggleHandlers.indexOf(handler);
    if (index > -1) {
      this.cursorToggleHandlers.splice(index, 1);
    }
  }

  /**
   * Add a private chat handler for incoming private chat requests and messages
   */
  onPrivateChatReceived(handler: (data: any) => void): void {
    this.privateChatHandlers.push(handler);
  }

  /**
   * Remove a private chat handler
   */
  removePrivateChatHandler(handler: (data: any) => void): void {
    const index = this.privateChatHandlers.indexOf(handler);
    if (index > -1) {
      this.privateChatHandlers.splice(index, 1);
    }
  }

  /**
   * Emit cursor data to all handlers
   */
  private emitCursorData(data: any): void {
    this.cursorHandlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error('Error in cursor handler:', error);
      }
    });
  }

  /**
   * Emit cursor toggle data to all handlers
   */
  private emitCursorToggle(data: any): void {
    this.cursorToggleHandlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error('Error in cursor toggle handler:', error);
      }
    });
  }

  /**
   * Emit private chat request to all handlers
   */
  private emitPrivateChatRequest(data: any): void {
    this.privateChatHandlers.forEach(handler => {
      try {
        // Try to get the teacher name from stored display names or current user
        let fromName = data.fromName;
        if (!fromName && this.currentUser && data.from === this.currentUser.id) {
          fromName = this.currentUser.name;
        }
        if (!fromName && this.userDisplayNames.has(data.from)) {
          fromName = this.userDisplayNames.get(data.from);
        }
        if (!fromName && data.from && data.from.startsWith('teacher-')) {
          fromName = 'Teacher'; // Fallback name
        }
        
        handler({ 
          type: 'private-chat-request', 
          content: data.content,
          from: data.from,
          fromName: fromName 
        });
      } catch (error) {
        console.error('Error in private chat request handler:', error);
      }
    });
  }

  /**
   * Emit private chat message to all handlers
   */
  private emitPrivateChatMessage(data: any): void {
    this.privateChatHandlers.forEach(handler => {
      try {
        // Try to get the sender name from stored display names or current user
        let fromName = data.fromName;
        if (!fromName && this.currentUser && data.from === this.currentUser.id) {
          fromName = this.currentUser.name;
        }
        if (!fromName && this.userDisplayNames.has(data.from)) {
          fromName = this.userDisplayNames.get(data.from);
        }
        if (!fromName && data.from) {
          if (data.from.startsWith('teacher-')) {
            fromName = 'Teacher'; // Fallback name for teachers
          } else if (data.from.startsWith('student-')) {
            fromName = 'Student'; // Fallback name for students
          }
        }
        
        handler({ 
          type: 'private-chat', 
          content: data.content,
          from: data.from,
          fromName: fromName 
        });
      } catch (error) {
        console.error('Error in private chat message handler:', error);
      }
    });
  }

  /**
   * Remove a message handler
   */
  removeMessageHandler(handler: (message: ChatMessageReceived) => void): void {
    const index = this.messageHandlers.indexOf(handler);
    if (index > -1) {
      this.messageHandlers.splice(index, 1);
    }
  }

  /**
   * Emit message to all handlers
   */
  private emitMessage(message: ChatMessageReceived): void {
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });
  }

  /**
   * Start a private chat with a student (teacher initiated)
   * @param studentId The student's ID
   * @param studentName The student's name
   */
  async startPrivateChat(studentId: string, studentName: string): Promise<string> {
    if (!this.currentUser || !this.currentClassId) {
      throw new Error('Not connected to a class');
    }

    if (this.currentUser.role !== 'teacher') {
      throw new Error('Only teachers can initiate private chats');
    }

    try {
      // Leave main channel
      if (this.ablyChannel) {
        await apiService.unsubscribeFromClassChannel(this.currentClassId);
        this.ablyChannel = null;
      }

      // Generate private channel ID
      const privateChannelId = `${this.currentUser.id}_${studentId}`;
      
      // Join private channel
      this.privateChannel = await apiService.subscribeToPrivateChannel(privateChannelId, (data: any) => {
        this.handlePrivateMessage(data);
      });
      
      this.isInPrivateChat = true;
      this.currentPrivateChannelId = privateChannelId;

      // Send API request to notify student
      const request: PrivateChatRequest = {
        classId: this.currentClassId,
        teacherId: this.currentUser.id,
        teacherName: this.currentUser.name,
        studentId,
        studentName
      };

      await apiService.requestPrivateChat(request);
      
      return privateChannelId;
    } catch (error) {
      console.error('Failed to start private chat:', error);
      throw error;
    }
  }

  /**
   * Accept a private chat request (student response)
   */
  async acceptPrivateChat(teacherId: string, _teacherName: string): Promise<void> {
    if (!this.currentUser || !this.currentClassId) {
      throw new Error('Not connected to a class');
    }

    if (this.currentUser.role !== 'student') {
      throw new Error('Only students can accept private chat requests');
    }

    try {
      // Leave main channel
      if (this.ablyChannel) {
        await apiService.unsubscribeFromClassChannel(this.currentClassId);
        this.ablyChannel = null;
      }

      // Generate private channel ID (same format as teacher)
      const privateChannelId = `${teacherId}_${this.currentUser.id}`;
      
      // Subscribe to private channel
      this.privateChannel = await apiService.subscribeToPrivateChannel(privateChannelId, (data: any) => {
        this.handlePrivateMessage(data);
      });
      
      // Join private channel (student was already subscribed but now actively participating)
      this.isInPrivateChat = true;
      this.currentPrivateChannelId = privateChannelId;

    } catch (error) {
      console.error('Failed to accept private chat:', error);
      throw error;
    }
  }

  /**
   * Send a private message
   * @param message The message to send
   * @param recipientId The recipient's ID
   */
  async sendPrivateMessage(message: string, recipientId: string): Promise<void> {
    if (!this.currentUser || !this.currentPrivateChannelId) {
      throw new Error('Not in a private chat');
    }

    if (!message.trim()) {
      throw new Error('Message cannot be empty');
    }

    try {
      const chatMessage: ChatMessage = {
        text: message.trim(),
        timestamp: Date.now(),
        messageType: 'chat'
      };

      const messageWrapper = createPrivateChatMessage(
        this.currentPrivateChannelId,
        this.currentUser.id,
        recipientId,
        chatMessage
      );

      await apiService.sendPrivateMessageViaAbly(this.currentPrivateChannelId, messageWrapper);
    } catch (error) {
      console.error('Failed to send private message:', error);
      throw error;
    }
  }

  /**
   * End private chat and return to main channel
   */
  async endPrivateChat(): Promise<void> {
    if (!this.currentClassId || !this.currentUser) {
      throw new Error('Not connected to a class');
    }

    try {
      // Leave private channel if connected
      if (this.currentPrivateChannelId) {
        await apiService.unsubscribeFromPrivateChannel(this.currentPrivateChannelId);
        this.privateChannel = null;
        this.currentPrivateChannelId = null;
      }

      // Rejoin main channel
      this.ablyChannel = await apiService.subscribeToClassChannel(this.currentClassId, (data: any) => {
        this.handleAblyMessage(data);
      });

      this.isInPrivateChat = false;
    } catch (error) {
      console.error('Failed to end private chat:', error);
      throw error;
    }
  }

  /**
   * Check if currently in a private chat
   */
  isInPrivateChatMode(): boolean {
    return this.isInPrivateChat;
  }

  /**
   * Get current private channel ID
   */
  getCurrentPrivateChannelId(): string | null {
    return this.currentPrivateChannelId;
  }
}

// Singleton instance
export const classService = new ClassService();
