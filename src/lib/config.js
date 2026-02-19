// Centralized configuration for FleetWise
// Uses Vite's import.meta.env for environment variables

// Backend URL - empty for frontend-only mode (uses mock services)
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

// Supabase configuration
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 
  'https://dphydlneamkkmraxjuxi.supabase.co';

export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwaHlkbG5lYW1ra21yYXhqdXhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1NjM4NTQsImV4cCI6MjA3OTEzOTg1NH0.c00dqu0WYkGP_VQCHT8nsS3-JYw50BMXvxXV7NmYfuE';

// NOTE: OpenAI API keys should NEVER be stored in client-side code
// Use Supabase Edge Functions with server-side secrets for AI integrations

// Helper to build API URLs safely
export const getApiUrl = (endpoint) => {
  if (!BACKEND_URL) return '';
  const base = BACKEND_URL.replace(/\/$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
};

// Check if we're in mock/frontend-only mode
export const isMockMode = () => !BACKEND_URL;
