import { Router } from 'express';
import { uploadStorageObject } from '../services/storageService';

const router = Router();
const MAX_BYTES = 50 * 1024 * 1024;

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

    const result = await uploadStorageObject(
      String(bucket),
      String(path),
      buffer,
      contentType ? String(contentType) : undefined,
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Upload file thất bại' });
  }
});

export default router;
