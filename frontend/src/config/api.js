/**
 * API Configuration
 * Centralizes backend API URL selection for local development and production
 */

// 1. Explicit override from environment (Highest Priority)
const ENV_API_URL = process.env.REACT_APP_API_URL;

// 2. Default Local URL
const LOCAL_DEFAULT = 'http://127.0.0.1:8000';

let resolvedUrl = LOCAL_DEFAULT;

if (ENV_API_URL) {
  // If the environment variable is set (Cloudflare), use it!
  resolvedUrl = ENV_API_URL;
} else if (typeof window !== 'undefined') {
  // Fallback logic for local dev without env vars
  const hostname = window.location.hostname;
  const isLocalHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.local');

  if (!isLocalHost) {
    // If we are NOT on localhost, and no env var is set, default to a placeholder or empty
    // But typically we should have an env var in production.
    console.warn("Hosted environment detected but REACT_APP_API_URL is missing!");
  }
}

const API_BASE_URL = resolvedUrl;

export { API_BASE_URL };
export default API_BASE_URL;
