// Safe fetch utility for frontend-only mode
// Prevents crashes from missing backend URLs

import { BACKEND_URL } from './config';

/**
 * Safe fetch that handles missing backend URLs gracefully
 * Returns mock response for frontend-only mode
 */
export const safeFetch = async (endpoint, options = {}) => {
  // If no backend URL, return mock response
  if (!BACKEND_URL) {
    console.log(`[Mock] ${endpoint} - No backend URL, using mock response`);
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: [], message: 'Mock response' }),
      text: async () => 'Mock response',
      blob: async () => new Blob(),
    };
  }
  
  // Build full URL
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${BACKEND_URL.replace(/\/$/, '')}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  try {
    return await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    console.error(`[SafeFetch] Error fetching ${url}:`, error);
    // Return mock response on error
    return {
      ok: false,
      status: 500,
      json: async () => ({ error: 'Network error', message: error.message }),
      text: async () => 'Network error',
      blob: async () => new Blob(),
    };
  }
};

/**
 * Get backend URL safely
 */
export const getBackendUrl = () => {
  return BACKEND_URL || '';
};

/**
 * Check if backend is available
 */
export const hasBackend = () => {
  return !!BACKEND_URL;
};
