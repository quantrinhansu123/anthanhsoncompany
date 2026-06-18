const DEFAULT_FOLDER_ID = '1bFKgBpAr6iDRnykOsmQ5MZkJ1RQFFOhG';

export interface GoogleDriveUploadResult {
  fileId: string;
  fileUrl: string;
  viewUrl: string;
}

function driveBuckets(): Set<string> {
  const raw = String(process.env.GOOGLE_DRIVE_BUCKETS ?? 'hop_dong').trim();
  return new Set(
    raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export function isGoogleDriveUploadEnabled(bucket: string): boolean {
  const url = String(process.env.GOOGLE_DRIVE_UPLOAD_URL ?? '').trim();
  if (!url) return false;
  return driveBuckets().has(String(bucket || '').trim());
}

export function googleDriveFolderId(): string {
  return String(process.env.GOOGLE_DRIVE_FOLDER_ID ?? DEFAULT_FOLDER_ID).trim() || DEFAULT_FOLDER_ID;
}

export async function uploadToGoogleDrive(
  fileName: string,
  buffer: Buffer,
  contentType?: string,
): Promise<GoogleDriveUploadResult> {
  const scriptUrl = String(process.env.GOOGLE_DRIVE_UPLOAD_URL ?? '').trim();
  if (!scriptUrl) {
    throw new Error('GOOGLE_DRIVE_UPLOAD_URL chưa cấu hình trên server');
  }

  const folderId = googleDriveFolderId();
  const secret = String(process.env.GOOGLE_DRIVE_UPLOAD_SECRET ?? '').trim();

  const response = await fetch(scriptUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'uploadFile',
      folderId,
      fileName,
      mimeType: contentType || 'application/octet-stream',
      fileBase64: buffer.toString('base64'),
      ...(secret ? { secret } : {}),
    }),
  });

  const text = await response.text();
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`Google Drive trả về dữ liệu không hợp lệ: ${text.slice(0, 200)}`);
  }

  if (!response.ok || body.success === false) {
    throw new Error(
      String(body.error || body.message || `Google Drive upload HTTP ${response.status}`),
    );
  }

  const fileId = String(body.fileId ?? '').trim();
  const viewUrl = String(body.viewUrl ?? '').trim();
  const fileUrl = String(body.fileUrl ?? '').trim();

  if (!fileId && !viewUrl && !fileUrl) {
    throw new Error('Google Drive không trả về fileId hoặc URL');
  }

  const resolvedViewUrl = viewUrl || (fileId ? `https://drive.google.com/file/d/${fileId}/view` : fileUrl);

  return {
    fileId: fileId || resolvedViewUrl,
    fileUrl: fileUrl || resolvedViewUrl,
    viewUrl: resolvedViewUrl,
  };
}
