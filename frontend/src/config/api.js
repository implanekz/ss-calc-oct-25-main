/**
 * API Configuration
 * Centralizes backend API URL selection for local development and production
 */

const REMOTE_API_URL =
  process.env.REACT_APP_API_URL_REMOTE ||
  process.env.REACT_APP_API_URL ||
  'https://api.ret1re.com';

const LOCAL_API_URL = process.env.REACT_APP_API_URL_LOCAL || 'http://127.0.0.1:8000';

const forceRemote = process.env.REACT_APP_API_URL_FORCE_REMOTE === 'true';
const forceLocal = process.env.REACT_APP_API_URL_FORCE_LOCAL === 'true';
const nodeEnv = process.env.NODE_ENV;

let resolvedApiUrl = REMOTE_API_URL;

if (typeof window !== 'undefined') {
  const hostname = window.location.hostname;
  const isLocalHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.local');
  const isDevBuild = nodeEnv !== 'production';

  if ((isLocalHost || isDevBuild || forceLocal) && !forceRemote) {
    resolvedApiUrl = LOCAL_API_URL;
  }

  if (isDevBuild) {
    console.info(
      `[api] Using ${resolvedApiUrl} (host=${hostname}, env=${nodeEnv}, forceRemote=${forceRemote}, forceLocal=${forceLocal})`
    );
  }
}

const API_BASE_URL = resolvedApiUrl;

export { API_BASE_URL, LOCAL_API_URL, REMOTE_API_URL };
export default API_BASE_URL;
