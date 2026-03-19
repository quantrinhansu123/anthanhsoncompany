const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export const api = {
  async get(endpoint: string) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Network response was not ok');
    }
    return response.json();
  },

  async post(endpoint: string, data: any) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Network response was not ok');
    }
    return response.json();
  },

  async put(endpoint: string, data: any) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Network response was not ok');
    }
    return response.json();
  },

  async delete(endpoint: string) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Network response was not ok');
    }
    return true;
  },
};
