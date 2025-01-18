export function getBaseUrl() {
  if (!process.env.NEXT_PUBLIC_API_URL) {
    console.error('NEXT_PUBLIC_API_URL is not defined');
    return '';
  }
  return process.env.NEXT_PUBLIC_API_URL;
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