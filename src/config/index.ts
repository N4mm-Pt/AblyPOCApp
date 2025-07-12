/**
 * Configuration file for the application
 */

// API Configuration
export const config = {
  // Adjust these URLs to match your .NET API server
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5165/api',
    
    endpoints: {
      chat: '/class/chat',
      studentJoin: '/class/join',
      studentLeave: '/class/leave'
    },
    
    // WebSocket configuration
    websocket: {
      reconnectAttempts: 5,
      reconnectDelay: 3000, // milliseconds
      heartbeatInterval: 30000 // milliseconds
    }
  },
  
  // Application settings
  app: {
    defaultClassId: 'demo-class-001',
    cursorUpdateThrottle: 50, // milliseconds
    messageMaxLength: 1000
  },

  // Ably configuration
  ably: {
    // Replace with your actual Ably API key
    apiKey: import.meta.env.VITE_ABLY_API_KEY || '',
    channelPrefix: 'class-', // Backend uses "class-{classId}" format
    clientId: undefined // Will be set dynamically based on user
  }
};

// Environment-specific overrides
export const getApiUrl = (): string => {
  // You can add logic here to determine the API URL based on environment
  // For example, reading from environment variables or detecting the hostname
  return config.api.baseUrl;
};

// Validation function to check if environment variables are loaded
export const validateConfig = (): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  // Check if Ably API key is loaded
  if (!config.ably.apiKey || config.ably.apiKey === 'your-ably-api-key-here') {
    errors.push('VITE_ABLY_API_KEY is not set or using placeholder value');
  }
  
  // Check if API base URL is set
  if (!config.api.baseUrl) {
    errors.push('API base URL is not configured');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Log configuration status in development
if (import.meta.env.DEV) {
  const validation = validateConfig();
  if (validation.isValid) {
    console.log('✅ Configuration loaded successfully');
    console.log('🔑 Ably API Key:', config.ably.apiKey ? `${config.ably.apiKey.substring(0, 10)}...` : 'Not set');
    console.log('🌐 API Base URL:', config.api.baseUrl);
  } else {
    console.warn('⚠️ Configuration issues found:', validation.errors);
  }
}

export default config;
