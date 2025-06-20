/**
 * Configuration for ovara-agent integration
 */

export const OVARA_CONFIG = {
  // WebSocket URL for ovara-agent
  WEBSOCKET_URL: process.env.NEXT_PUBLIC_OVARA_WS_URL || 'ws://localhost:8000',
  
  // HTTP API URL for ovara-agent (for REST endpoints)
  API_URL: process.env.NEXT_PUBLIC_OVARA_API_URL || 'http://localhost:8000',
  
  // Connection settings
  RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 1000,
  
  // Message settings
  MAX_MESSAGE_LENGTH: 10000,
  TYPING_TIMEOUT: 100000,
} as const;

/**
 * Get the WebSocket URL for a specific client
 */
export function getWebSocketUrl(clientId: string): string {
  return `${OVARA_CONFIG.WEBSOCKET_URL}/ws/${clientId}`;
}

/**
 * Get the API URL for memory and personalization endpoints
 */
export function getMemoryApiUrl(): string {
  return `${OVARA_CONFIG.API_URL}/api/memory`;
}

/**
 * Get the API URL for REST endpoints
 */
export function getApiUrl(endpoint: string = ''): string {
  return `${OVARA_CONFIG.API_URL}${endpoint}`;
}
