export function getBaseUrl() {
  // In production, use the Railway URL
  if (process.env.NODE_ENV === 'production') {
    return 'https://chatgeniusv2-production.up.railway.app';
  }
  
  // In development, use the environment variable or localhost
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${endpoint}`;
  
  // Don't set Content-Type for FormData - let the browser handle it
  const headers = options.body instanceof FormData
    ? { ...options.headers }
    : {
        'Content-Type': 'application/json',
        ...options.headers,
      };
  
  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response;
} 