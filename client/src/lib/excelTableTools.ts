import * as XLSX from 'xlsx';

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

/** Tải file .xlsx mẫu: hàng 1 = tiêu đề (cột bắt buộc có *), hàng 2 = ví dụ / chú thích. */
export function downloadExcelTemplate(
    columns: ExcelColumnDef[],
    filename: string,
    sheetName = 'Mau nhap',
): void {
    const headerRow = columns.map((c) => templateColumnHeader(c));
    const exampleRow = columns.map((c) => templateExampleCell(c));
    const ws = XLSX.utils.aoa_to_sheet([headerRow, exampleRow]);
    const wb = XLSX.utils.book_new();
    const safeSheet = sheetName.slice(0, 31).replace(/[:\\/?*[\]]/g, '_');
    XLSX.utils.book_append_sheet(wb, ws, safeSheet || 'Sheet1');
    const name = filename.toLowerCase().endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    XLSX.writeFile(wb, name);
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
    
    const ws = XLSX.utils.aoa_to_sheet([headerRow, ...dataRows]);
    const wb = XLSX.utils.book_new();
    const safeSheet = sheetName.slice(0, 31).replace(/[:\\/?*[\]]/g, '_');
    XLSX.utils.book_append_sheet(wb, ws, safeSheet || 'Sheet1');
    const name = filename.toLowerCase().endsWith('.xlsx') ? filename : `${filename}.xlsx`;
    XLSX.writeFile(wb, name);
}

/**
 * Đọc toàn bộ các sheet: chọn sheet nào chứa nhiều cột khớp nhất.
 */
export async function parseExcelToRows(
    file: File,
    columns: ExcelColumnDef[],
): Promise<Record<string, string>[]> {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    
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
        throw new Error(
            `File không có dòng tiêu đề hợp lệ (khớp ${globalMaxMatches}/${minMatches} cột tối thiểu). Kiểm tra tên cột giống mẫu.`,
        );
    }

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
