import config from '../config';
import * as Ably from 'ably';

// Base API configuration
export const API_CONFIG = {
  baseUrl: config.api.baseUrl,
  endpoints: config.api.endpoints
};

// Message models based on your .NET controller
export interface MessageWrapperModel {
  classId: string;
  from: string;
  to: string;
  type: string;
  content: any;
}

export interface CursorData {
  userId?: string;
  userName?: string;
  x: number;
  y: number;
  timestamp?: number;
  [key: string]: any;
}

export interface ChatMessage {
  text: string;  // Changed from "message" to "text" to match backend
  timestamp?: number;
  messageType?: 'chat' | 'system' | 'hand-raise';
  [key: string]: any;
}

export interface PrivateChatRequest {
  classId: string;
  teacherId: string;
  teacherName: string;
  studentId: string;
  studentName: string;
}

// API Service class
export class ApiService {
  private baseUrl: string;
  private ably: Ably.Realtime | null = null;

  constructor(baseUrl: string = API_CONFIG.baseUrl) {
    this.baseUrl = baseUrl;
  }

  /**
   * Initialize Ably connection
   * @param clientId The client ID for Ably connection
   * @returns Promise<Ably.Realtime>
   */
  async initializeAbly(clientId: string): Promise<Ably.Realtime> {
    if (this.ably) {
      return this.ably;
    }

    // Validate API key before initializing
    if (!config.ably.apiKey) {
      throw new Error('Ably API key is not configured. Please set VITE_ABLY_API_KEY in your .env file.');
    }

    if (config.ably.apiKey === 'your-ably-api-key-here') {
      console.warn('⚠️ Using placeholder Ably API key. Please update VITE_ABLY_API_KEY in your .env file.');
    }

    this.ably = new Ably.Realtime({
      key: config.ably.apiKey,
      clientId: clientId,
      autoConnect: true
    });

    return new Promise((resolve, reject) => {
      this.ably!.connection.on('connected', () => {
        resolve(this.ably!);
      });

      this.ably!.connection.on('failed', (error) => {
        console.error('Ably connection failed:', error);
        reject(error);
      });

      this.ably!.connection.on('disconnected', () => {
      });
    });
  }

  /**
   * Subscribe to a class channel for real-time messages
   * @param classId The class ID
   * @param onMessage Callback for incoming messages
   * @param rewindFromTime Optional timestamp to rewind from (default: 2 minutes ago)
   * @returns Promise<Ably.RealtimeChannel>
   */
  async subscribeToClassChannel(
    classId: string, 
    onMessage: (message: any) => void,
    rewindFromTime?: number
  ): Promise<Ably.RealtimeChannel> {
    if (!this.ably) {
      throw new Error('Ably not initialized. Call initializeAbly() first.');
    }

    const channelName = `${config.ably.channelPrefix}${classId}`;
    
    // Calculate rewind time - use provided time or default to 2 minutes ago
    const rewindTime = rewindFromTime || (Date.now() - (2 * 60 * 1000));
    
    // Get channel without rewind options to avoid reattach issues
    // We'll rely on explicit history retrieval instead
    const channel = this.ably.channels.get(channelName);

    // Subscribe to all events on the channel to ensure we get all message types
    // This is more robust than subscribing to individual event types
    await channel.subscribe((message) => {
      onMessage(message.data);
    });

    // Explicitly request recent history to get missed messages
    try {
      const historyResult = await channel.history({
        limit: 50, // Get up to 50 recent messages
        start: rewindTime, // From the specified rewind time
        direction: 'forwards' // Get messages in chronological order
      });
      
      if (historyResult.items && historyResult.items.length > 0) {
        // Process historical messages in chronological order
        historyResult.items.reverse().forEach((message) => {
          onMessage(message.data);
        });
      }
    } catch (historyError) {
      console.warn('Failed to retrieve channel history:', historyError);
    }

    return channel;
  }

  /**
   * Unsubscribe from a class channel
   * @param classId The class ID
   */
  async unsubscribeFromClassChannel(classId: string): Promise<void> {
    if (!this.ably) {
      return;
    }

    const channelName = `${config.ably.channelPrefix}${classId}`;
    const channel = this.ably.channels.get(channelName);
    await channel.unsubscribe();
  }

  /**
   * Subscribe to a private channel for one-on-one chat
   * @param channelId The private channel ID (e.g., "teacher-123_student-456")
   * @param onMessage Callback for incoming messages
   * @returns Promise<Ably.RealtimeChannel>
   */
  async subscribeToPrivateChannel(
    channelId: string, 
    onMessage: (message: any) => void
  ): Promise<Ably.RealtimeChannel> {
    if (!this.ably) {
      throw new Error('Ably not initialized. Call initializeAbly() first.');
    }

    const channelName = `private-${channelId}`;
    
    const channel = this.ably.channels.get(channelName, {
      params: {
        rewind: '5m', // Fetch messages from the last 5 minutes on connect
      }
    });

    await channel.subscribe('private-chat', (message) => {
      onMessage(message.data);
    });

    return channel;
  }

  /**
   * Unsubscribe from a private channel
   * @param channelId The private channel ID
   */
  async unsubscribeFromPrivateChannel(channelId: string): Promise<void> {
    if (!this.ably) {
      return;
    }

    const channelName = `private-${channelId}`;
    const channel = this.ably.channels.get(channelName);
    await channel.unsubscribe();
  }

  /**
   * Disconnect Ably connection
   */
  disconnectAbly(): void {
    if (this.ably) {
      this.ably.close();
      this.ably = null;
    }
  }

  /**
   * Set the client ID for Ably connection
   * @param clientId The client ID to set
   */
  setClientId(_clientId: string): void {
    if (this.ably) {
      // Note: clientId should be set during initialization
      // This is for future use if we need dynamic client IDs
    }
  }

  /**
   * Send a chat message to the API
   * @param message The message wrapper to send
   * @returns Promise with the API response
   */
  async sendChatMessage(message: MessageWrapperModel): Promise<Response> {
    try {
      const response = await fetch(`${this.baseUrl}${API_CONFIG.endpoints.chat}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
      }

      return response;
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }
  }

  /**
   * Send cursor data via Ably to the class channel
   * @param classId The class ID
   * @param cursorData The cursor data to send
   */
  async sendCursorDataViaAbly(classId: string, cursorData: CursorData): Promise<void> {
    if (!this.ably) {
      throw new Error('Ably not initialized. Call initializeAbly() first.');
    }

    const channelName = `${config.ably.channelPrefix}${classId}`;
    const channel = this.ably.channels.get(channelName);

    const cursorMessage = createCursorMessage(classId, cursorData.userId || 'unknown', cursorData);
    
    try {
      await channel.publish('cursor-stream', cursorMessage);
    } catch (error) {
      console.error('Failed to send cursor data via Ably:', error);
      throw error;
    }
  }

  /**
   * Notify the server that a student has joined the class
   * @param classId The class ID
   * @param studentId The student's unique ID
   * @param studentName The student's display name
   * @returns Promise<Response>
   */
  async notifyStudentJoin(classId: string, studentId: string, studentName: string): Promise<Response> {
    try {
      const response = await fetch(`${this.baseUrl}${API_CONFIG.endpoints.studentJoin}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classId,
          studentId,
          studentName
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
      }

      return response;
    } catch (error) {
      console.error('Error notifying student join:', error);
      throw error;
    }
  }

  /**
   * Toggle cursor streaming mode and notify all students
   * @param classId The class ID
   * @param teacherId The teacher's unique ID
   * @param teacherName The teacher's display name
   * @param enabled Whether cursor streaming is enabled or disabled
   * @returns Promise<Response>
   */
  async toggleCursorStream(classId: string, teacherId: string, teacherName: string, enabled: boolean): Promise<Response> {
    try {
      const response = await fetch(`${this.baseUrl}/class/toggle-cursor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classId,
          teacherId,
          teacherName,
          enabled
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
      }

      return response;
    } catch (error) {
      console.error('Error toggling cursor stream:', error);
      throw error;
    }
  }

  /**
   * Notify the server that a student has left the class
   * @param classId The class ID
   * @param studentId The student's unique ID
   * @param studentName The student's display name
   * @returns Promise<Response>
   */
  async notifyStudentLeave(classId: string, studentId: string, studentName: string): Promise<Response> {
    try {
      const response = await fetch(`${this.baseUrl}${API_CONFIG.endpoints.studentLeave}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          classId,
          studentId,
          studentName
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
      }

      return response;
    } catch (error) {
      console.error('Error notifying student leave:', error);
      throw error;
    }
  }

  /**
   * Send a private message via Ably
   * @param channelId The private channel ID
   * @param messageData The message data to send
   */
  async sendPrivateMessageViaAbly(channelId: string, messageData: MessageWrapperModel): Promise<void> {
    if (!this.ably) {
      throw new Error('Ably not initialized. Call initializeAbly() first.');
    }

    const channelName = `private-${channelId}`;
    const channel = this.ably.channels.get(channelName);

    try {
      await channel.publish('private-chat', messageData);
    } catch (error) {
      console.error('Failed to send private message via Ably:', error);
      throw error;
    }
  }

  /**
   * Request private chat with a student (teacher initiated)
   * @param request The private chat request data
   * @returns Promise<Response>
   */
  async requestPrivateChat(request: PrivateChatRequest): Promise<Response> {
    try {
      const response = await fetch(`${this.baseUrl}/class/private-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`);
      }

      return response;
    } catch (error) {
      console.error('Error requesting private chat:', error);
      throw error;
    }
  }

  /**
   * Reconnect to Ably with exponential backoff
   * @param clientId The client ID for Ably connection
   * @param attempt The current attempt number
   */
  async reconnectAbly(clientId: string, attempt: number = 1): Promise<void> {
    const maxAttempts = 5;
    const retryDelay = Math.min(1000 * Math.pow(2, attempt), 30000); // Exponential backoff

    setTimeout(async () => {
      try {
        await this.initializeAbly(clientId);
      } catch (error) {
        console.error('Ably reconnection failed:', error);

        if (attempt < maxAttempts) {
          this.reconnectAbly(clientId, attempt + 1);
        } else {
          console.error('Max reconnection attempts reached. Ably connection failed.');
        }
      }
    }, retryDelay);
  }
}

// Singleton instance
export const apiService = new ApiService();

// Utility functions for common operations
export const createChatMessage = (
  classId: string,
  from: string,
  to: string,
  message: ChatMessage
): MessageWrapperModel => ({
  classId,
  from,
  to,
  type: 'chat',
  content: message
});

export const createCursorMessage = (
  classId: string,
  from: string,
  cursor: CursorData
): MessageWrapperModel => ({
  classId,
  from,
  to: 'all',
  type: 'cursor',
  content: cursor
});

export const createPrivateChatMessage = (
  channelId: string,
  from: string,
  to: string,
  message: ChatMessage
): MessageWrapperModel => ({
  classId: channelId,
  from,
  to,
  type: 'private-chat',
  content: message
});
