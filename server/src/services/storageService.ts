import { getSupabase } from '../config/supabase';

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

async function ensurePublicBucket(bucketName: string): Promise<void> {
  const supabase = getSupabase();
  const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
  if (listErr) {
    console.warn('[storageService] listBuckets:', listErr.message);
    return;
  }
  if (buckets?.some((b) => b.name === bucketName)) return;

  const { error: createErr } = await supabase.storage.createBucket(bucketName, {
    public: true,
  });
  if (createErr && !String(createErr.message || '').toLowerCase().includes('already exists')) {
    console.warn(`[storageService] createBucket "${bucketName}":`, createErr.message);
  }
}

export async function uploadStorageObject(
  bucket: string,
  path: string,
  body: Buffer,
  contentType?: string,
): Promise<{ path: string; publicUrl: string }> {
  const bucketName = String(bucket || '').trim();
  if (!bucketName) throw new Error('Thiếu tên bucket');

  const safePath = sanitizeStoragePath(path);
  if (!safePath) throw new Error('Đường dẫn file không hợp lệ');

  await ensurePublicBucket(bucketName);

  const supabase = getSupabase();
  const { data, error } = await supabase.storage.from(bucketName).upload(safePath, body, {
    contentType: contentType || 'application/octet-stream',
    upsert: true,
    cacheControl: '3600',
  });

  if (error) {
    throw new Error(error.message || 'Upload file thất bại');
  }
  if (!data?.path) {
    throw new Error('Không nhận được dữ liệu sau khi upload');
  }

  const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(data.path);
  return { path: data.path, publicUrl: urlData.publicUrl };
}
