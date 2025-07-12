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

    console.log('🔑 Initializing Ably with API key:', config.ably.apiKey.substring(0, 10) + '...');

    this.ably = new Ably.Realtime({
      key: config.ably.apiKey,
      clientId: clientId,
      autoConnect: true
    });

    return new Promise((resolve, reject) => {
      this.ably!.connection.on('connected', () => {
        console.log('Ably connected successfully');
        resolve(this.ably!);
      });

      this.ably!.connection.on('failed', (error) => {
        console.error('Ably connection failed:', error);
        reject(error);
      });

      this.ably!.connection.on('disconnected', () => {
        console.log('Ably disconnected');
      });
    });
  }

  /**
   * Subscribe to a class channel for real-time messages
   * @param classId The class ID
   * @param onMessage Callback for incoming messages
   * @returns Promise<Ably.RealtimeChannel>
   */
  async subscribeToClassChannel(
    classId: string, 
    onMessage: (message: any) => void
  ): Promise<Ably.RealtimeChannel> {
    if (!this.ably) {
      throw new Error('Ably not initialized. Call initializeAbly() first.');
    }

    const channelName = `${config.ably.channelPrefix}${classId}`;
    
    // Get channel with rewind parameter to fetch recent messages on connect
    const channel = this.ably.channels.get(channelName, {
      params: {
        rewind: '1m', // Fetch messages from the last 1 minute on connect
      }
    });

    await channel.subscribe('chat', (message) => {
      console.log('Received chat message:', message.data);
      onMessage(message.data);
    });

    // Also subscribe to cursor-stream events for real-time cursor tracking
    await channel.subscribe('cursor-stream', (message) => {
      onMessage(message.data);
    });

    console.log(`Subscribed to channel: ${channelName} with 1-minute rewind for chat and cursor events`);
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
    console.log(`Unsubscribed from channel: ${channelName}`);
  }

  /**
   * Disconnect Ably connection
   */
  disconnectAbly(): void {
    if (this.ably) {
      this.ably.close();
      this.ably = null;
      console.log('Ably connection closed');
    }
  }

  /**
   * Set the client ID for Ably connection
   * @param clientId The client ID to set
   */
  setClientId(clientId: string): void {
    if (this.ably) {
      // Note: clientId should be set during initialization
      // This is for future use if we need dynamic client IDs
      console.log('Client ID set:', clientId);
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
   * Reconnect to Ably with exponential backoff
   * @param clientId The client ID for Ably connection
   * @param attempt The current attempt number
   */
  async reconnectAbly(clientId: string, attempt: number = 1): Promise<void> {
    const maxAttempts = 5;
    const retryDelay = Math.min(1000 * Math.pow(2, attempt), 30000); // Exponential backoff

    console.log(`Reconnecting to Ably in ${retryDelay / 1000} seconds... (Attempt ${attempt}/${maxAttempts})`);

    setTimeout(async () => {
      try {
        await this.initializeAbly(clientId);
        console.log('Reconnected to Ably successfully');
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
