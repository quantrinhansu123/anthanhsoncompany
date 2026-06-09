import { supabase } from './supabase';
import { API_BASE_URL } from './api';

export function sanitizeStoragePath(rawPath: string): string {
  const parts = String(rawPath || '')
    .split('/')
    .filter(Boolean)
    .map((part) => {
      const normalized = part.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return normalized
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '') || 'file';
    });
  return parts.join('/');
}

async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

async function uploadViaApi(
  bucket: string,
  path: string,
  file: File,
): Promise<string | null> {
  try {
    const fileBase64 = await fileToBase64(file);
    const response = await fetch(`${API_BASE_URL}/storage/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bucket,
        path,
        fileBase64,
        contentType: file.type || 'application/octet-stream',
      }),
    });

    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(body.error || body.message || `HTTP ${response.status}`);
    }
    if (body.publicUrl) return String(body.publicUrl);
    return null;
  } catch (err) {
    console.warn(`[storageUpload] API upload to "${bucket}" failed:`, err);
    return null;
  }
}

async function uploadViaSupabase(
  bucket: string,
  path: string,
  file: File,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });
    if (error) throw error;
    if (!data?.path) throw new Error('Không nhận được dữ liệu sau khi upload');

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return urlData.publicUrl;
  } catch (err) {
    console.warn(`[storageUpload] Direct upload to "${bucket}" failed:`, err);
    return null;
  }
}

export async function uploadStorageFile(
  bucket: string,
  path: string,
  file: File,
  options?: { fallbackBuckets?: string[] },
): Promise<string> {
  const safePath = sanitizeStoragePath(path);
  const buckets = [bucket, ...(options?.fallbackBuckets ?? [])].filter(
    (name, index, arr) => Boolean(name?.trim()) && arr.indexOf(name) === index,
  );

  let lastError = 'Upload file thất bại';

  for (const bucketName of buckets) {
    const viaApi = await uploadViaApi(bucketName, safePath, file);
    if (viaApi) return viaApi;

    const viaSupabase = await uploadViaSupabase(bucketName, safePath, file);
    if (viaSupabase) return viaSupabase;

    lastError = `Không upload được vào bucket "${bucketName}". Kiểm tra server đang chạy và cấu hình Supabase Storage.`;
  }

  throw new Error(lastError);
}
