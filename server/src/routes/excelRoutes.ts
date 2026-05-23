import { Router } from 'express';
import { randomUUID } from 'crypto';
import * as XLSX from 'xlsx';

const router = Router();

type ExcelDownloadBody = {
  filename?: string;
  sheetName?: string;
  rows?: unknown[][];
};

type PendingExcel = {
  filename: string;
  sheetName: string;
  rows: unknown[][];
  expires: number;
};

/** Bộ nhớ tạm: id → dữ liệu xuất (GET /file/:id tải xuống, không cần blob client). */
const pendingById = new Map<string, PendingExcel>();
const PENDING_TTL_MS = 5 * 60 * 1000;

function parseExcelDownloadBody(body: unknown): ExcelDownloadBody {
  if (!body || typeof body !== 'object') return {};
  const raw = body as Record<string, unknown>;
  if (typeof raw.payload === 'string') {
    try {
      return JSON.parse(raw.payload) as ExcelDownloadBody;
    } catch {
      return {};
    }
  }
  return raw as ExcelDownloadBody;
}

function cleanupExpiredPending(): void {
  const now = Date.now();
  for (const [id, item] of pendingById) {
    if (item.expires < now) pendingById.delete(id);
  }
}

function buildXlsxBuffer(rows: unknown[][], sheetName: string, filename: string) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  const safeSheet = String(sheetName).slice(0, 31).replace(/[:\\/?*[\]]/g, '_');
  XLSX.utils.book_append_sheet(wb, ws, safeSheet || 'Sheet1');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const name = String(filename).toLowerCase().endsWith('.xlsx') ? String(filename) : `${filename}.xlsx`;
  return { buf: Buffer.from(buf), name };
}

/** Bước 1: lưu dữ liệu, trả id để client mở GET tải file (ổn định trên HTTP/LAN). */
router.post('/prepare', (req, res) => {
  cleanupExpiredPending();
  try {
    const { filename = 'export.xlsx', sheetName = 'Du lieu', rows } = parseExcelDownloadBody(req.body);
    const rowCount = Array.isArray(rows) ? rows.length : 0;
    const colCount =
      rowCount > 0 && Array.isArray(rows![0]) ? (rows![0] as unknown[]).length : 0;

    if (!Array.isArray(rows) || rows.length === 0) {
      console.warn('[ExcelExport] server_prepare_reject', { rowCount });
      res.status(400).json({ error: 'Thiếu dữ liệu rows.' });
      return;
    }

    const id = randomUUID();
    pendingById.set(id, {
      filename: String(filename),
      sheetName: String(sheetName),
      rows,
      expires: Date.now() + PENDING_TTL_MS,
    });

    console.log('[ExcelExport] server_prepare_ok', {
      id,
      filename,
      sheetName,
      rowCount,
      colCount,
    });

    res.json({ id, filePath: `/api/excel/file/${id}` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Excel prepare failed';
    console.error('[ExcelExport] server_prepare_error', { message });
    res.status(500).json({ error: message });
  }
});

/** Bước 2: trình duyệt điều hướng GET → tải .xlsx (Content-Disposition). */
router.get('/file/:id', (req, res) => {
  const id = String(req.params.id ?? '');
  const item = pendingById.get(id);
  if (!item || item.expires < Date.now()) {
    pendingById.delete(id);
    console.warn('[ExcelExport] server_file_missing', { id });
    res.status(404).send('Link tải hết hạn. Bấm «Tải file Excel» lại.');
    return;
  }
  pendingById.delete(id);

  try {
    const { buf, name } = buildXlsxBuffer(item.rows, item.sheetName, item.filename);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
    res.send(buf);
    console.log('[ExcelExport] server_file_ok', {
      id,
      filename: name,
      byteLength: buf.length,
      rowCount: item.rows.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Excel file failed';
    console.error('[ExcelExport] server_file_error', { id, message });
    res.status(500).send(message);
  }
});

/** POST trực tiếp (giữ tương thích). */
router.post('/download', (req, res) => {
  const started = Date.now();
  const contentType = String(req.headers['content-type'] ?? '');
  const viaFormPayload = Boolean(
    req.body && typeof req.body === 'object' && typeof (req.body as { payload?: unknown }).payload === 'string',
  );

  try {
    const { filename = 'export.xlsx', sheetName = 'Du lieu', rows } = parseExcelDownloadBody(req.body);
    const rowCount = Array.isArray(rows) ? rows.length : 0;
    const colCount =
      rowCount > 0 && Array.isArray(rows![0]) ? (rows![0] as unknown[]).length : 0;

    console.log('[ExcelExport] server_download_post', {
      contentType,
      viaFormPayload,
      filename,
      sheetName,
      rowCount,
      colCount,
    });

    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).send('Thiếu dữ liệu rows.');
      return;
    }

    const { buf, name } = buildXlsxBuffer(rows, String(sheetName), String(filename));
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
    res.send(buf);

    console.log('[ExcelExport] server_download_post_ok', {
      filename: name,
      byteLength: buf.length,
      elapsedMs: Date.now() - started,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Excel export failed';
    console.error('[ExcelExport] server_download_post_error', { message });
    res.status(500).json({ error: message });
  }
});

export default router;
