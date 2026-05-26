/** Dev: `/api` qua Vite proxy → backend. Prod: set `VITE_API_BASE_URL`. */
export const API_BASE_URL =
  (import.meta as any).env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? '/api' : 'http://localhost:3000/api');

function formatFetchFailure(err: unknown): Error {
  if (err instanceof Error) {
    if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
      return new Error(
        'Không kết nối được server. Chạy «npm run dev» trong thư mục server (cổng 3000) và tải lại trang.',
      );
    }
    return err;
  }
  if (typeof err === 'string' && err.trim()) return new Error(err.trim());
  return new Error('Lỗi kết nối server');
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      response.ok
        ? 'Phản hồi server không hợp lệ (không phải JSON).'
        : `Lỗi server HTTP ${response.status}`,
    );
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, init);
    if (!response.ok) {
      const body = await parseJsonResponse<{ error?: string; message?: string }>(response).catch(
        () => ({} as { error?: string }),
      );
      throw new Error(body.error || body.message || `HTTP ${response.status}`);
    }
    return parseJsonResponse<T>(response);
  } catch (err) {
    throw formatFetchFailure(err);
  }
}

export const api = {
  async get(endpoint: string) {
    return requestJson(`${API_BASE_URL}${endpoint}`);
  },

  async post(endpoint: string, data: unknown) {
    return requestJson(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async put(endpoint: string, data: unknown) {
    return requestJson(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async delete(endpoint: string) {
    await requestJson(`${API_BASE_URL}${endpoint}`, { method: 'DELETE' });
    return true;
  },
};
