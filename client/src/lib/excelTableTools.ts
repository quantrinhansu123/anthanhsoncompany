import * as XLSX from 'xlsx';
import { API_BASE_URL } from './api';

export type ExcelColumnDef = {
    /** Khóa nội bộ sau khi parse */
    key: string;
    /** Tiêu đề cột dòng 1 file mẫu — dùng để khớp khi nhập (không gắn dấu *) */
    header: string;
    /** Tiêu đề khác trên file Excel thực tế (chỉ dùng khi nhập, không ghi vào mẫu tải về). */
    matchHeaders?: string[];
    /** Trường trên bản ghi DB khi xuất (hoặc hàm format) — mặc định dùng `key`. */
    exportKey?: string | ((row: Record<string, any>) => unknown);
    /** Gợi ý dòng 2 trong mẫu */
    example?: string;
    /** Nếu true, file mẫu gắn " *" sau tiêu đề; ô ví dụ mặc định "Bắt buộc" khi không có example/hint */
    required?: boolean;
    /** Chú thích ô ví dụ khi không khai báo example */
    hint?: string;
};

const EXCEL_MEANINGFUL_ROW_KEYS = [
    'so_ho_plhd',
    'so_hop_dong',
    'ten_khach_hang',
    'ten_don_vi',
    'ten_da',
    'gia_xuat_hd',
    'gia_hd_plhd',
    'ten_goi_thau',
    'thong_tin_kh',
    'cdt_thanh_toan',
    'cdt_tam_ung',
] as const;

/** Có ít nhất một trường nghiệp vụ — tránh bỏ sót dòng chỉ có số tiền / TT. */
export function excelRowHasMeaningfulData(obj: Record<string, string>): boolean {
    for (const k of EXCEL_MEANINGFUL_ROW_KEYS) {
        if (String(obj[k] ?? '').trim()) return true;
    }
    return Object.keys(obj).some(
        (k) => k !== '__rowNumber' && String(obj[k] ?? '').trim() !== '',
    );
}

/** Bỏ dòng ví dụ ngay dưới tiêu đề trong file mẫu tải về. */
export function isLikelyExcelTemplateExampleRow(
    obj: Record<string, string>,
    columns: ExcelColumnDef[],
): boolean {
    let matchExamples = 0;
    let definedExamples = 0;
    for (const col of columns) {
        if (!col.example || String(col.example).trim() === '') continue;
        definedExamples += 1;
        const cell = normalizeKey(obj[col.key] ?? '');
        const ex = normalizeKey(col.example);
        if (cell && ex && cell === ex) matchExamples += 1;
    }
    if (definedExamples === 0) return false;
    return matchExamples >= Math.min(3, definedExamples);
}

/** Khớp tiêu đề ô Excel với cột cấu hình (ưu tiên khớp dài / chính xác — tránh lệch «Số HĐ» vs «Số HĐ & PLHĐ»). */
export function resolveExcelHeaderKey(
    headerCell: string,
    columns: ExcelColumnDef[],
): string | null {
    const nh = normalizeHeaderForMatch(headerCell);
    if (!nh) return null;

    let bestKey: string | null = null;
    let bestScore = 0;

    for (const col of columns) {
        const labels = [col.header, ...(col.matchHeaders ?? [])];
        for (const label of labels) {
            const nl = normalizeHeaderForMatch(label);
            if (!nl) continue;

            let score = 0;
            if (nh === nl) {
                score = 1000 + nl.length;
            } else if (nl.length >= 6 && nh.startsWith(nl)) {
                score = 500 + nl.length;
            } else if (nh.length >= 6 && nl.startsWith(nh)) {
                score = 400 + nh.length;
            }

            if (score > bestScore) {
                bestScore = score;
                bestKey = col.key;
            }
        }
    }

    return bestKey;
}

function minHeaderMatchesRequired(columnCount: number): number {
    return Math.max(3, Math.min(6, Math.ceil(columnCount * 0.25)));
}

/** Tiêu đề hiển thị trên file tải về (có dấu * nếu bắt buộc). */
export function templateColumnHeader(c: ExcelColumnDef): string {
    return c.required ? `${c.header} *` : c.header;
}

function templateExampleCell(c: ExcelColumnDef): string {
    if (c.example !== undefined && String(c.example).length > 0) return c.example;
    if (c.hint) return c.hint;
    if (c.required) return 'Bắt buộc';
    return '';
}

function normalizeHeader(s: string): string {
    return String(s ?? '')
        .replace(/\u00a0/g, ' ')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'd')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

/** Chuẩn hóa tiêu đề cột trên file Excel để khớp với `header` trong code (bỏ dấu * / (bắt buộc) ở mẫu tải về). */
export function normalizeHeaderForMatch(s: string): string {
    let n = normalizeHeader(s);
    n = n.replace(/\s*\*+$/g, '').trim();
    n = n.replace(/\s*\(\s*bat\s*buoc\)\s*$/g, '').trim();
    return n;
}

/** Làm sạch chuỗi để LƯU TRỮ: NFC, cắt khoảng trắng, gộp khoảng trắng thừa. Giữ nguyên hoa thường. */
export function cleanString(s: any): string {
    return String(s || '')
        .trim()
        .normalize('NFC')
        .replace(/\s+/g, ' ');
}

/** Tạo khóa để SO KHỚP: cleanString + toLowerCase. */
export function normalizeKey(s: any): string {
    return cleanString(s).toLowerCase();
}

function excelFilename(filename: string): string {
    return filename.toLowerCase().endsWith('.xlsx') ? filename : `${filename}.xlsx`;
}

const EXCEL_LOG_PREFIX = '[ExcelExport]';

function excelLog(step: string, detail?: Record<string, unknown>): void {
    if (detail) {
        console.log(EXCEL_LOG_PREFIX, step, detail);
    } else {
        console.log(EXCEL_LOG_PREFIX, step);
    }
}

function excelWarn(step: string, detail?: Record<string, unknown>): void {
    if (detail) {
        console.warn(EXCEL_LOG_PREFIX, step, detail);
    } else {
        console.warn(EXCEL_LOG_PREFIX, step);
    }
}

function excelLogError(step: string, err: unknown, detail?: Record<string, unknown>): void {
    console.error(EXCEL_LOG_PREFIX, step, {
        ...detail,
        error:
            err instanceof Error
                ? { name: err.name, message: err.message, stack: err.stack }
                : err,
    });
}

function excelRowsMeta(rows: unknown[][]): Record<string, unknown> {
    const rowCount = rows.length;
    const colCount = rowCount > 0 && Array.isArray(rows[0]) ? (rows[0] as unknown[]).length : 0;
    let payloadBytes = 0;
    try {
        payloadBytes = new TextEncoder().encode(JSON.stringify(rows)).length;
    } catch {
        payloadBytes = -1;
    }
    return { rowCount, colCount, payloadBytes };
}

const EXCEL_DOWNLOAD_FRAME = 'excel-download-frame';

/** URL GET tải file — cùng origin với trang (qua Vite proxy /api). */
function excelResolveFileUrl(filePath: string): string {
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        return filePath;
    }
    const normalized = filePath.startsWith('/') ? filePath : `/${filePath}`;
    if (API_BASE_URL.startsWith('http')) {
        const apiOrigin = API_BASE_URL.replace(/\/api\/?$/, '');
        return `${apiOrigin}${normalized}`;
    }
    return `${window.location.origin}${normalized}`;
}

function ensureExcelDownloadFrame(): void {
    if (document.getElementById(EXCEL_DOWNLOAD_FRAME)) return;
    const iframe = document.createElement('iframe');
    iframe.id = EXCEL_DOWNLOAD_FRAME;
    iframe.name = EXCEL_DOWNLOAD_FRAME;
    iframe.title = 'excel-download';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText =
        'position:fixed;left:-9999px;top:0;width:1px;height:1px;opacity:0;border:none;pointer-events:none;visibility:hidden';
    document.body.appendChild(iframe);
}

/**
 * Chuẩn bị trên server rồi iframe GET — trình duyệt tải file thật (không blob client).
 * Hoạt động trên http://192.168.x.x:5174.
 */
export async function downloadExcelRowsViaNavigation(
    rows: unknown[][],
    filename: string,
    sheetName: string,
): Promise<void> {
    const name = excelFilename(filename);
    const prepareUrl = `${API_BASE_URL}/excel/prepare`;
    excelLog('nav_prepare_start', {
        prepareUrl,
        filename: name,
        sheetName,
        ...excelRowsMeta(rows),
    });

    let res: Response;
    try {
        res = await fetch(prepareUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: name, sheetName, rows }),
        });
    } catch (err) {
        excelLogError('nav_prepare_network_error', err, { prepareUrl });
        throw new Error(
            'Không kết nối server xuất Excel. Chạy «npm run dev» trong thư mục server.',
        );
    }

    if (!res.ok) {
        let detail = res.statusText;
        try {
            const j = await res.json();
            detail = String((j as { error?: string })?.error ?? detail);
        } catch {
            /* ignore */
        }
        excelLogError('nav_prepare_http_error', new Error(detail), { status: res.status });
        throw new Error(detail || 'Không chuẩn bị được file Excel.');
    }

    const body = (await res.json()) as { id?: string; filePath?: string };
    const filePath = body.filePath || (body.id ? `/api/excel/file/${body.id}` : '');
    if (!filePath) {
        throw new Error('Server không trả link tải file.');
    }

    const fileUrl = excelResolveFileUrl(filePath);
    excelLog('nav_iframe_get', { fileUrl, id: body.id });

    ensureExcelDownloadFrame();
    const iframe = document.getElementById(EXCEL_DOWNLOAD_FRAME) as HTMLIFrameElement | null;
    if (!iframe) {
        throw new Error('Không tạo được khung tải file.');
    }
    iframe.onload = () => {
        excelLog('nav_iframe_onload', { fileUrl });
    };
    iframe.src = fileUrl;
}

/**
 * Tải .xlsx qua API server + form POST (iframe) — dự phòng.
 */
export function downloadExcelRowsViaServer(
    rows: unknown[][],
    filename: string,
    sheetName: string,
): void {
    const name = excelFilename(filename);
    const action = `${API_BASE_URL}/excel/download`;
    excelLog('form_post_start', {
        action,
        filename: name,
        sheetName,
        origin: typeof window !== 'undefined' ? window.location.origin : '',
        ...excelRowsMeta(rows),
    });

    ensureExcelDownloadFrame();
    const iframe = document.getElementById(EXCEL_DOWNLOAD_FRAME) as HTMLIFrameElement | null;
    if (iframe) {
        iframe.onload = () => {
            try {
                const doc = iframe.contentDocument;
                const snippet = doc?.body?.innerText?.trim().slice(0, 300) ?? '';
                excelLog('form_iframe_onload', {
                    snippet: snippet || '(empty)',
                    looksLikeError:
                        snippet.includes('error') ||
                        snippet.includes('Thiếu') ||
                        snippet.startsWith('{'),
                });
            } catch (e) {
                excelWarn('form_iframe_onload_cross_origin', {
                    hint: 'Không đọc được nội dung iframe — có thể vẫn đã tải file.',
                });
            }
        };
    }

    const form = document.createElement('form');
    form.method = 'POST';
    form.action = action;
    form.target = EXCEL_DOWNLOAD_FRAME;
    form.style.display = 'none';
    form.setAttribute('accept-charset', 'UTF-8');

    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'payload';
    input.value = JSON.stringify({
        filename: name,
        sheetName,
        rows,
    });
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
    excelLog('form_post_submitted', { action, filename: name });
    window.setTimeout(() => form.remove(), 3000);
}

/** Dự phòng: fetch API rồi tải blob (khi form/iframe không chạy). */
export async function downloadExcelRowsViaServerFetch(
    rows: unknown[][],
    filename: string,
    sheetName: string,
): Promise<void> {
    const name = excelFilename(filename);
    const url = `${API_BASE_URL}/excel/download`;
    const started = performance.now();
    excelLog('fetch_start', {
        url,
        filename: name,
        sheetName,
        ...excelRowsMeta(rows),
    });

    let res: Response;
    try {
        res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                filename: name,
                sheetName,
                rows,
            }),
        });
    } catch (err) {
        excelLogError('fetch_network_error', err, { url });
        throw err;
    }

    const elapsedMs = Math.round(performance.now() - started);
    const contentType = res.headers.get('Content-Type') ?? '';
    const contentDisposition = res.headers.get('Content-Disposition') ?? '';

    if (!res.ok) {
        let detail = res.statusText;
        let bodySnippet = '';
        try {
            const err = await res.json();
            detail = String(err?.error ?? detail);
            bodySnippet = JSON.stringify(err).slice(0, 300);
        } catch {
            try {
                bodySnippet = (await res.text()).slice(0, 300);
            } catch {
                /* ignore */
            }
        }
        excelLogError('fetch_http_error', new Error(detail), {
            url,
            status: res.status,
            elapsedMs,
            contentType,
            bodySnippet,
        });
        throw new Error(detail || 'Không tải được file Excel từ máy chủ.');
    }

    const blob = await res.blob();
    excelLog('fetch_ok', {
        url,
        status: res.status,
        elapsedMs,
        contentType,
        contentDisposition,
        blobSize: blob.size,
        blobType: blob.type,
    });

    if (blob.size < 100) {
        excelWarn('fetch_blob_too_small', {
            blobSize: blob.size,
            hint: 'File quá nhỏ — có thể server trả lỗi dạng text thay vì xlsx.',
        });
    }

    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = name;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    excelLog('blob_anchor_click', { filename: name, blobSize: blob.size });
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 8000);
}

/**
 * Tải .xlsx qua Blob + thẻ <a> (dự phòng khi API không chạy).
 */
export function triggerBrowserExcelDownload(wb: XLSX.WorkBook, filename: string): void {
    const name = excelFilename(filename);
    excelLog('client_blob_fallback_start', { filename: name });
    const bytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    excelLog('client_blob_fallback_done', { filename: name, byteLength: bytes.byteLength });
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Tải file .xlsx mẫu: hàng 1 = tiêu đề (cột bắt buộc có *), hàng 2 = ví dụ / chú thích. */
function downloadExcelRowsWithFallback(rows: unknown[][], filename: string, sheetName: string): void {
    try {
        downloadExcelRowsViaServer(rows, filename, sheetName);
    } catch (err) {
        excelWarn('form_post_throw_fallback_blob', { error: String(err) });
        const wb = buildExcelWorkbook(rows, sheetName);
        triggerBrowserExcelDownload(wb, filename);
    }
}

export function downloadExcelTemplate(
    columns: ExcelColumnDef[],
    filename: string,
    sheetName = 'Mau nhap',
): void {
    const headerRow = columns.map((c) => templateColumnHeader(c));
    const exampleRow = columns.map((c) => templateExampleCell(c));
    downloadExcelRowsWithFallback([headerRow, exampleRow], filename, sheetName);
}

/** Tải file .xlsx kèm dữ liệu thực tế: hàng 1 = tiêu đề, từ hàng 2 = dữ liệu. */
/** Giá trị một ô khi xuất Excel (ưu tiên `exportKey` nếu dữ liệu DB dùng tên khác `key`). */
export function getExcelExportCellValue(row: Record<string, any>, col: ExcelColumnDef): unknown {
    if (col.exportKey) {
        if (typeof col.exportKey === 'function') return col.exportKey(row);
        return row[col.exportKey];
    }
    return row[col.key];
}

function buildExcelWorkbook(rows: unknown[][], sheetName: string): XLSX.WorkBook {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    const safeSheet = sheetName.slice(0, 31).replace(/[:\\/?*[\]]/g, '_');
    XLSX.utils.book_append_sheet(wb, ws, safeSheet || 'Sheet1');
    return wb;
}

/** Sau `await` (fetch dữ liệu): dùng hộp thoại Lưu file nếu có, không thì blob. */
export async function saveExcelWorkbook(wb: XLSX.WorkBook, filename: string): Promise<void> {
    const name = excelFilename(filename);
    excelLog('save_workbook_start', {
        filename: name,
        hasSaveFilePicker: typeof (window as Window & { showSaveFilePicker?: unknown })
            .showSaveFilePicker === 'function',
    });
    const bytes = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const picker = (window as Window & { showSaveFilePicker?: (opts: object) => Promise<FileSystemFileHandle> })
        .showSaveFilePicker;
    if (typeof picker === 'function') {
        try {
            const handle = await picker({
                suggestedName: name,
                types: [
                    {
                        description: 'Excel',
                        accept: {
                            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [
                                '.xlsx',
                            ],
                        },
                    },
                ],
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            excelLog('save_workbook_ok', { method: 'showSaveFilePicker', filename: name });
            return;
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
                excelWarn('save_workbook_aborted', { filename: name });
                return;
            }
            excelWarn('save_workbook_picker_failed', {
                filename: name,
                error: err instanceof Error ? err.message : String(err),
            });
        }
    }
    excelLog('save_workbook_fallback_blob', { filename: name });
    triggerBrowserExcelDownload(wb, filename);
}

export function downloadExcelData(
    columns: ExcelColumnDef[],
    data: Record<string, any>[],
    filename: string,
    sheetName = 'Du lieu',
): void {
    const headerRow = columns.map((c) => templateColumnHeader(c));
    const dataRows = data.map((row) => {
        return columns.map((col) => {
            const val = getExcelExportCellValue(row, col);
            return val === null || val === undefined ? '' : val;
        });
    });
    downloadExcelRowsWithFallback([headerRow, ...dataRows], filename, sheetName);
}

async function runExcelDownloadPipeline(
    aoa: unknown[][],
    filename: string,
    sheetName: string,
    logKind: 'data' | 'template',
): Promise<void> {
    excelLog(`deferred_${logKind}_start`, { filename, sheetName, ...excelRowsMeta(aoa) });

    try {
        await downloadExcelRowsViaNavigation(aoa, filename, sheetName);
        excelLog(`deferred_${logKind}_ok`, { method: 'navigation_get' });
        return;
    } catch (navErr) {
        excelWarn(`deferred_${logKind}_nav_failed`, {
            error: navErr instanceof Error ? navErr.message : String(navErr),
        });
    }

    const wb = buildExcelWorkbook(aoa, sheetName);
    try {
        triggerBrowserExcelDownload(wb, filename);
        excelLog(`deferred_${logKind}_ok`, { method: 'client_blob' });
        return;
    } catch (blobErr) {
        excelWarn(`deferred_${logKind}_client_blob_failed`, {
            error: blobErr instanceof Error ? blobErr.message : String(blobErr),
        });
    }

    try {
        await downloadExcelRowsViaServerFetch(aoa, filename, sheetName);
        excelLog(`deferred_${logKind}_ok`, { method: 'fetch_blob' });
        return;
    } catch (fetchErr) {
        excelLogError(`deferred_${logKind}_all_failed`, fetchErr, {});
        throw fetchErr instanceof Error
            ? fetchErr
            : new Error('Không tải được Excel. Kiểm tra server đang chạy và thử http://localhost:5174');
    }
}

export async function downloadExcelDataDeferred(
    columns: ExcelColumnDef[],
    data: Record<string, any>[],
    filename: string,
    sheetName = 'Du lieu',
): Promise<void> {
    const headerRow = columns.map((c) => templateColumnHeader(c));
    const dataRows = data.map((row) => {
        return columns.map((col) => {
            const val = getExcelExportCellValue(row, col);
            return val === null || val === undefined ? '' : val;
        });
    });
    await runExcelDownloadPipeline([headerRow, ...dataRows], filename, sheetName, 'data');
}

export async function downloadExcelTemplateDeferred(
    columns: ExcelColumnDef[],
    filename: string,
    sheetName = 'Mau nhap',
): Promise<void> {
    const headerRow = columns.map((c) => templateColumnHeader(c));
    const exampleRow = columns.map((c) => templateExampleCell(c));
    await runExcelDownloadPipeline([headerRow, exampleRow], filename, sheetName, 'template');
}

/**
 * Đọc toàn bộ các sheet: chọn sheet nào chứa nhiều cột khớp nhất.
 */
export async function parseExcelToRows(
    file: File,
    columns: ExcelColumnDef[],
): Promise<Record<string, string>[]> {
    console.log('[ExcelImport] parse_start', {
        fileName: file.name,
        fileSize: file.size,
        columnDefs: columns.length,
    });
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    console.log('[ExcelImport] workbook_read', { sheetNames: wb.SheetNames });
    
    let globalMaxMatches = 0;
    let globalHeaderRowIndex = 0;
    let globalBestKeyByIndex: (string | null)[] = [];
    let globalRows: any[][] = [];

    const minMatches = minHeaderMatchesRequired(columns.length);

    // Duyệt qua TẤT CẢ các sheet để tìm ra sheet nào chứa nhiều cột hợp lệ nhất
    for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];
        // Sử dụng raw: true để giữ giá trị gốc (số/ngày) giúp parse chính xác hơn
        const rows = XLSX.utils.sheet_to_json<(string | number | null | undefined)[]>(sheet, {
            header: 1,
            defval: '',
            raw: true,
        }) as unknown[][];

        if (!rows.length) continue;

        let sheetMaxMatches = 0;
        let sheetHeaderRowIndex = 0;
        let sheetBestKeyByIndex: (string | null)[] = [];

        // Tìm dòng tiêu đề tốt nhất trong 40 dòng đầu của sheet này
        for (let r = 0; r < Math.min(40, rows.length); r++) {
            const headerCells = (rows[r] || []).map((h) => String(h ?? '').trim());
            let matches = 0;
            const keyByIndex: (string | null)[] = headerCells.map((h) => {
                const key = resolveExcelHeaderKey(h, columns);
                if (key) matches++;
                return key;
            });

            if (matches > sheetMaxMatches) {
                sheetMaxMatches = matches;
                sheetHeaderRowIndex = r;
                sheetBestKeyByIndex = keyByIndex;
            }
        }

        // Nếu sheet này có nhiều cột khớp hơn sheet trước đó -> chọn sheet này
        if (sheetMaxMatches > globalMaxMatches) {
            globalMaxMatches = sheetMaxMatches;
            globalHeaderRowIndex = sheetHeaderRowIndex;
            globalBestKeyByIndex = sheetBestKeyByIndex;
            globalRows = rows;
        }
    }

    if (globalMaxMatches < minMatches) {
        console.warn('[ExcelImport] parse_header_fail', {
            globalMaxMatches,
            minMatches,
            sheetCount: wb.SheetNames.length,
        });
        throw new Error(
            `File không có dòng tiêu đề hợp lệ (khớp ${globalMaxMatches}/${minMatches} cột tối thiểu). Kiểm tra tên cột giống mẫu.`,
        );
    }

    console.log('[ExcelImport] parse_header_ok', {
        globalMaxMatches,
        minMatches,
        headerRowIndex: globalHeaderRowIndex + 1,
    });

    const out: Record<string, string>[] = [];
    // Data bắt đầu từ dòng ngay sau dòng tiêu đề của sheet tốt nhất
    for (let r = globalHeaderRowIndex + 1; r < globalRows.length; r++) {
        const row = globalRows[r] || [];
        const obj: Record<string, string> = {
            __rowNumber: (r + 1).toString(), // Lưu lại số dòng thực tế trong Excel
        };
        const colCount = Math.max(globalBestKeyByIndex.length, row.length);
        for (let c = 0; c < colCount; c++) {
            const k = globalBestKeyByIndex[c];
            if (!k) continue;
            const raw = row[c];

            let s = '';
            if (raw instanceof Date) {
                const dd = String(raw.getDate()).padStart(2, '0');
                const mm = String(raw.getMonth() + 1).padStart(2, '0');
                const yyyy = raw.getFullYear();
                s = `${dd}/${mm}/${yyyy}`;
            } else if (typeof raw === 'number' && raw > 10000 && raw < 100000) {
                try {
                    const d = XLSX.SSF.parse_date_code(raw);
                    s = `${String(d.d).padStart(2, '0')}/${String(d.m).padStart(2, '0')}/${d.y}`;
                } catch {
                    s = String(raw);
                }
            } else {
                s = raw === null || raw === undefined ? '' : String(raw).trim();
            }

            if (s) obj[k] = s;
            else if (obj[k] === undefined) obj[k] = '';
        }
        if (!excelRowHasMeaningfulData(obj)) continue;
        if (isLikelyExcelTemplateExampleRow(obj, columns.filter((c) => c.example))) continue;
        out.push(obj);
    }
    console.log('[ExcelImport] parse_rows_ok', { dataRowCount: out.length });
    return out;
}

/** Bỏ dấu phẩy/chấm phân nghìn, chuyển số tiền Excel sang number. */
export function parseMoneyVi(s: string): number {
    const t = String(s || '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '');
    const n = Number(t);
    return Number.isFinite(n) ? n : 0;
}

/** 
 * Chuyển đổi ngày tháng từ Excel sang định dạng yyyy-mm-dd.
 * Hỗ trợ các định dạng: "20/06" + "2004", "20-06-2004", "2024-06-20",...
 */
export function parseExcelDate(dateStr: string, yearStr?: string): string | null {
    if (!dateStr || dateStr.trim() === '') return null;
    
    // Nếu dateStr đã là yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr;

    // Thử tách theo dấu gạch chéo hoặc gạch ngang
    const parts = dateStr.split(/[/\-]/).map(p => p.trim());
    
    // Trường hợp chỉ có ngày/tháng (ví dụ: "20/06") kết hợp với yearStr (ví dụ: "2004")
    if (parts.length === 2) {
        let d = parts[0].padStart(2, '0');
        let m = parts[1].padStart(2, '0');
        let y = (yearStr || '').trim() || new Date().getFullYear().toString();
        if (y.length === 2) y = '20' + y;
        return `${y}-${m}-${d}`;
    }

    // Trường hợp có đủ ngày/tháng/năm trong 1 ô (ví dụ: "20/06/2004")
    if (parts.length === 3) {
        let d = parts[0].padStart(2, '0');
        let m = parts[1].padStart(2, '0');
        let y = parts[2];
        
        // Nếu phần đầu tiên có 4 chữ số thì có vẻ là yyyy-mm-dd hoặc yyyy/mm/dd
        if (parts[0].length === 4) {
            return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
        
        if (y.length === 2) y = '20' + y;
        return `${y}-${m}-${d}`;
    }

    return null;
}
