const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const api = {
  async request(path: string, options: RequestInit = {}) {
    const token = localStorage.getItem('discord_token');
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || 'Request failed');
    }
    return res.json();
  },
  get: (path: string) => api.request(path),
  post: (path: string, body: any) => api.request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path: string, body: any) => api.request(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path: string) => api.request(path, { method: 'DELETE' }),
};
