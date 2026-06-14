import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Exports a flag to verify if credentials are configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Fallback to a placeholder endpoint to prevent application crash during initialization
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
