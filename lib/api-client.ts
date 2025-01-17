export function getBaseUrl() {
  if (typeof window !== 'undefined') {
    // We're in the browser
    return window.location.origin;
  }
  
  // We're on the server
  if (process.env.NODE_ENV === 'production') {
    return `https://${process.env.VERCEL_URL}`;
  }
  
  // Development
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