// Safe environment variable access with fallbacks
// Prevents crashes from missing env vars in production

export const getEnvVar = (key, defaultValue = '') => {
  // In Vite, environment variables are accessed via import.meta.env
  // Variables must be prefixed with VITE_
  const viteKey = key.replace('REACT_APP_', 'VITE_');
  const value = import.meta.env[viteKey] || import.meta.env[key];
  return value !== undefined && value !== null ? value : defaultValue;
};

// Backend URL - not needed for frontend-only mode
export const BACKEND_URL = getEnvVar('VITE_BACKEND_URL', '');

// Supabase - will be configured by Lovable
export const SUPABASE_URL = getEnvVar(
  'VITE_SUPABASE_URL',
  'https://dphydlneamkkmraxjuxi.supabase.co'
);

export const SUPABASE_ANON_KEY = getEnvVar(
  'VITE_SUPABASE_ANON_KEY',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwaHlkbG5lYW1ra21yYXhqdXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjM4NTQsImV4cCI6MjA3OTEzOTg1NH0.c00dqu0WYkGP_VQCHT8nsS3-JYw50BMXvxXV7NmYfuE'
);

// Helper to build API URLs safely
export const getApiUrl = (endpoint) => {
  // For frontend-only mode, return empty string (will use mock services)
  if (!BACKEND_URL) {
    return '';
  }
  // Remove trailing slash from BACKEND_URL and leading slash from endpoint
  const base = BACKEND_URL.replace(/\/$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
};
