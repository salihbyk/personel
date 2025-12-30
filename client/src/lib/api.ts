// API Base URL - Production'da backend URL'ini kullan
export const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status >= 500) {
      throw new Error(`${response.status}: ${response.statusText}`);
    }
    throw new Error(`${response.status}: ${await response.text()}`);
  }

  return response.json();
}
