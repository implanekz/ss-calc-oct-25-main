/**
 * API Configuration
 * Centralizes backend API URL configuration
 */

// Use environment variable in production, fallback to localhost in development
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export { API_BASE_URL };
export default API_BASE_URL;
