import { createClient } from '@supabase/supabase-js';
import { supabaseFetch } from '@/lib/cleanFetch';

const SUPABASE_URL = "https://jdiowphmzsqvpizlwlzn.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkaW93cGhtenNxdnBpemx3bHpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3ODcxOTIsImV4cCI6MjA4MTM2MzE5Mn0.t2aOo0bUrWtdFEBCeHbGcjn-IAQvoPqDm-PPnOR5D44";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    // Use clean fetch to bypass rrweb/preview instrumentation
    // that causes "Response body is already used" errors
    fetch: supabaseFetch,
  },
});