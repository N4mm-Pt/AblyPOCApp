import { apiService, createChatMessage } from './api.service';
import type { CursorData, ChatMessage } from './api.service';
import type * as Ably from 'ably';

// Re-export types for convenience
export type { CursorData, ChatMessage } from './api.service';

export interface ChatMessageReceived {
  id: string;
  classId: string;
  from: string;
  fromName: string;
  to: string;
  message: string;
  timestamp: number;
  type: 'chat' | 'system' | 'hand-raise';
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
  private ablyChannel: Ably.RealtimeChannel | null = null;
  private userDisplayNames: Map<string, string> = new Map(); // Track user ID to display name mapping
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
        apiService.disconnectAbly();
      } catch (error) {
        console.error('Error unsubscribing from Ably:', error);
      }
    }
    
    this.currentClassId = null;
    this.currentUser = null;
    this.ablyChannel = null;
    this.userDisplayNames.clear(); // Clear stored display names when leaving class
    console.log('Left the classroom');
  }

  /**
   * Handle incoming Ably messages
   */
  private handleAblyMessage(data: any): void {
    try {
      // Handle student join/leave notifications
      if (data.type === 'student-join' && data.content && this.currentClassId && this.currentUser) {
        const joinData = data.content;
        
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
        
        // Only emit if it's not from the current user (avoid duplicates)
        if (joinMessage.from !== this.currentUser.id) {
          this.emitMessage(joinMessage);
        }
        return;
      }

      if (data.type === 'student-leave' && data.content && this.currentClassId && this.currentUser) {
        const leaveData = data.content;
        
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
        
        // Only emit if it's not from the current user (avoid duplicates)
        if (leaveMessage.from !== this.currentUser.id) {
          this.emitMessage(leaveMessage);
        }
        
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

        const message: ChatMessageReceived = {
          id: `ably-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          classId: this.currentClassId,
          from: data.from,
          fromName: displayName || data.from, // Use displayName or fallback to ID
          to: data.to,
          message: data.content.text || data.content.Text, // Backend sends "Text" field
          timestamp: data.content.timestamp || Date.now(),
          type: data.content.messageType || 'chat'
        };

        // Only emit if it's not from the current user (avoid duplicates)
        if (message.from !== this.currentUser.id) {
          this.emitMessage(message);
        }
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
      
      // Emit the message locally for immediate UI update
      const localMessage: ChatMessageReceived = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        classId: this.currentClassId,
        from: this.currentUser.id,
        fromName: this.currentUser.name,
        to,
        message,
        timestamp: Date.now(),
        type: messageType
      };
      
      this.emitMessage(localMessage);
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
}

// Singleton instance
export const classService = new ClassService();
