/**
 * Supabase client configuration for React frontend
 * Handles authentication and database operations
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables. Check your .env file.');
}

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Helper: Get auth token for API requests
 */
export const getAuthToken = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) {
    return null;
  }
  return session.access_token;
};

/**
 * Helper: Fetch with auth header
 */
export const authenticatedFetch = async (url, options = {}) => {
  const token = await getAuthToken();
  
  if (!token) {
    throw new Error('No authentication token available');
  }
  
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  return fetch(url, {
    ...options,
    headers
  });
};

export default supabase;
