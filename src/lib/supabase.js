import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing! Make sure to create a .env.local file with these variables.');
}

// Initialize the Supabase client
// By default, this uses browser localStorage to persist the user's session.
// This is exactly what we need for the PWA to stay logged in while offline.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder_key', 
  {
    auth: {
      persistSession: true, // Crucial for our offline-login requirement
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);
