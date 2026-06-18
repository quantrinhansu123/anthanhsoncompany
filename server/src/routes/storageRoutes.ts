import { Router } from 'express';
import { uploadStorageObject } from '../services/storageService';
import { isGoogleDriveUploadEnabled, uploadToGoogleDrive } from '../services/googleDriveService';

const router = Router();
const MAX_BYTES = 50 * 1024 * 1024;

function fileNameFromPath(path: string): string {
  const parts = String(path || '')
    .split('/')
    .filter(Boolean);
  return parts[parts.length - 1] || 'file';
}

router.post('/upload', async (req, res) => {
  try {
    const { bucket, path, fileBase64, contentType } = req.body ?? {};
    if (!bucket || !path || !fileBase64) {
      return res.status(400).json({ error: 'Thiếu bucket, path hoặc fileBase64' });
    }

    const buffer = Buffer.from(String(fileBase64), 'base64');
    if (!buffer.length) {
      return res.status(400).json({ error: 'File rỗng hoặc mã hóa base64 không hợp lệ' });
    }
    if (buffer.length > MAX_BYTES) {
      return res.status(413).json({ error: 'File quá lớn (tối đa 50MB)' });
    }

    const bucketName = String(bucket).trim();
    const safePath = String(path);

    if (isGoogleDriveUploadEnabled(bucketName)) {
      try {
        const driveResult = await uploadToGoogleDrive(
          fileNameFromPath(safePath),
          buffer,
          contentType ? String(contentType) : undefined,
        );
        try {
          await uploadStorageObject(
            bucketName,
            safePath,
            buffer,
            contentType ? String(contentType) : undefined,
          );
        } catch (backupErr: any) {
          console.warn('[storage/upload] Supabase backup:', backupErr?.message || backupErr);
        }
        return res.json({
          path: driveResult.fileId,
          publicUrl: driveResult.viewUrl,
          driveFileId: driveResult.fileId,
          storage: 'google_drive',
        });
      } catch (driveErr: any) {
        console.error('[storage/upload] Google Drive failed, fallback Supabase:', driveErr?.message || driveErr);
      }
    }

    const result = await uploadStorageObject(
      bucketName,
      safePath,
      buffer,
      contentType ? String(contentType) : undefined,
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Upload file thất bại' });
  }
});

export default router;
