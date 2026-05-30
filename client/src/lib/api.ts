/** Dev: `/api` qua Vite proxy. Prod (Vercel): `/api` qua Serverless; hoặc set `VITE_API_BASE_URL`. */
const envApiBase = String((import.meta as any).env.VITE_API_BASE_URL ?? '').trim().replace(/\/$/, '');

export const API_BASE_URL =
  envApiBase || '/api';

function formatFetchFailure(err: unknown): Error {
  if (err instanceof Error) {
    if (err.message === 'Failed to fetch' || err.name === 'TypeError') {
      if (import.meta.env.DEV) {
        return new Error(
          'Không kết nối được API local (cổng 3000). Chạy «npm run dev» trong thư mục server hoặc «npm run dev» ở thư mục gốc dự án, rồi tải lại trang.',
        );
      }
      return new Error(
        'Không kết nối được API. Trên Vercel: kiểm tra đã deploy lại sau khi có thư mục client/api, và thêm biến môi trường SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (Settings → Environment Variables).',
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
