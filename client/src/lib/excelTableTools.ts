import * as XLSX from 'xlsx';

export type ExcelColumnDef = {
    /** Khóa nội bộ sau khi parse */
    key: string;
    /** Tiêu đề cột dòng 1 file mẫu (khớp khi nhập) */
    header: string;
    /** Gợi ý dòng 2 trong mẫu */
    example?: string;
};

function normalizeHeader(s: string): string {
    return String(s ?? '')
        .replace(/\u00a0/g, ' ')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

/** Tải file .xlsx mẫu: hàng 1 = tiêu đề, hàng 2 = ví dụ (có thể để trống). */
export function downloadExcelTemplate(
    columns: ExcelColumnDef[],
    filename: string,
    sheetName = 'Mau nhap',
): void {
    const headerRow = columns.map((c) => c.header);
    const exampleRow = columns.map((c) => c.example ?? '');
    const ws = XLSX.utils.aoa_to_sheet([headerRow, exampleRow]);
    const wb = XLSX.utils.book_new();
    const safeSheet = sheetName.slice(0, 31).replace(/[:\\/?*[\]]/g, '_');
    XLSX.utils.book_append_sheet(wb, ws, safeSheet || 'Sheet1');
    const name = filename.toLowerCase().endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    XLSX.writeFile(wb, name);
}

/**
 * Đọc sheet đầu tiên: map theo tiêu đề cột (chuẩn hóa không dấu, thường).
 * Bỏ qua hàng trống.
 */
export async function parseExcelToRows(
    file: File,
    columns: ExcelColumnDef[],
): Promise<Record<string, string>[]> {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return [];
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<(string | number | null | undefined)[]>(sheet, {
        header: 1,
        defval: '',
        raw: false,
    }) as unknown[][];

    if (!rows.length) return [];

    const headerCells = (rows[0] || []).map((h) => String(h ?? '').trim());
    const keyByIndex: (string | null)[] = headerCells.map((h) => {
        const nh = normalizeHeader(h);
        const col = columns.find((c) => normalizeHeader(c.header) === nh);
        return col?.key ?? null;
    });

    const out: Record<string, string>[] = [];
    for (let r = 1; r < rows.length; r++) {
        const row = rows[r] || [];
        const obj: Record<string, string> = {};
        let any = false;
        for (let c = 0; c < keyByIndex.length; c++) {
            const k = keyByIndex[c];
            if (!k) continue;
            const raw = row[c];
            const s = raw === null || raw === undefined ? '' : String(raw).trim();
            if (s) any = true;
            obj[k] = s;
        }
        if (any) out.push(obj);
    }
    return out;
}

/** Bỏ dấu phẩy/chấm phân nghìn, chuyển số tiền Excel sang number. */
export function parseMoneyVi(s: string): number {
    const t = String(s || '').replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '');
    const n = Number(t);
    return Number.isFinite(n) ? n : 0;
}
