import React, { useRef, useState } from 'react';
import { Download, Upload, Loader2 } from 'lucide-react';
import {
    type ExcelColumnDef,
    downloadExcelTemplate,
    downloadExcelData,
    parseExcelToRows,
} from '../lib/excelTableTools';

export type ExcelImportResult = {
    /** Số dòng Excel đã xử lý */
    ok: number;
    errors: string[];
    /** Số hợp đồng / bản ghi DB sau khi gộp dòng (nếu có) */
    contractsSaved?: number;
};

type Props = {
    columns: ExcelColumnDef[];
    /** Cột bổ sung chỉ khi nhập (vd. CĐT) — không đưa vào file mẫu tải về */
    importColumns?: ExcelColumnDef[];
    /** Mảng dữ liệu cần xuất ra (nếu có sẽ là nút Tải file Excel có dữ liệu) */
    data?: any[];
    /** Tên file tải về, không bắt buộc .xlsx */
    templateFileName: string;
    /** Tên sheet trong file Excel */
    sheetName?: string;
    /** Xử lý từng lô dòng đọc từ file. Nhận thêm callback báo cáo tiến độ. */
    onImport: (
        rows: Record<string, string>[],
        onProgress: (current: number, total: number) => void,
    ) => Promise<ExcelImportResult>;
    /** Sau khi nhập xong (dù lỗi một phần) */
    onDone?: () => void;
    className?: string;
    disabled?: boolean;
    /** Nút gọn hơn (toolbar dày đặc) */
    compact?: boolean;
};

export function ExcelImportExportBar({
    columns,
    importColumns,
    data,
    templateFileName,
    sheetName = 'Du lieu',
    onImport,
    onDone,
    className = '',
    disabled = false,
    compact = false,
}: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [lastRes, setLastRes] = useState<ExcelImportResult | null>(null);
    const [showErrors, setShowErrors] = useState(false);

    const handleDownload = () => {
        setMsg(null);
        if (data && data.length > 0) {
            downloadExcelData(columns, data, templateFileName, sheetName);
        } else {
            downloadExcelTemplate(columns, templateFileName, sheetName);
        }
    };

    const handlePickFile = () => {
        if (disabled || busy) return;
        inputRef.current?.click();
    };

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file || disabled) return;
        setBusy(true);
        setMsg(null);
        setLastRes(null);
        setShowErrors(false);
        setProgress({ current: 0, total: 0 });
        try {
            const rows = await parseExcelToRows(file, importColumns ?? columns);
            if (rows.length === 0) {
                setMsg('File không có dòng dữ liệu (bỏ qua hàng tiêu đề).');
                setBusy(false);
                return;
            }
            setProgress({ current: 0, total: rows.length });
            const result = await onImport(rows, (current, total) => {
                setProgress({ current, total });
            });
            setLastRes(result);
            const { ok, errors, contractsSaved } = result;
            const parts =
                contractsSaved != null && contractsSaved !== ok
                    ? [`Đã xử lý ${ok} dòng Excel → ${contractsSaved} hợp đồng lưu DB.`]
                    : [`Đã xử lý ${ok} dòng Excel.`];
            if (errors.length)
                parts.push(
                    `${errors.length} lỗi: ${errors.slice(0, 5).join('; ')}${errors.length > 5 ? '…' : ''}`,
                );
            setMsg(parts.join(' '));
            onDone?.();
        } catch (err) {
            setMsg(err instanceof Error ? err.message : 'Không đọc được file Excel.');
        } finally {
            setBusy(false);
        }
    };

    const btnBase = compact
        ? 'gap-1 px-2 py-1 text-[11px] rounded-md'
        : 'gap-1.5 px-3 py-1.5 text-xs rounded-lg';
    const iconSz = compact ? 12 : 14;

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            <div className="flex flex-wrap items-center gap-1.5">
                <button
                    type="button"
                    onClick={handleDownload}
                    disabled={disabled || busy}
                    className={`inline-flex items-center font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 ${btnBase}`}
                >
                    <Download size={iconSz} />
                    {data && data.length > 0 ? 'Tải file Excel' : 'Tải mẫu Excel'}
                </button>
                <input
                    ref={inputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleFile}
                />
                <button
                    type="button"
                    onClick={handlePickFile}
                    disabled={disabled || busy}
                    className={`inline-flex items-center font-semibold border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 disabled:opacity-50 ${btnBase}`}
                >
                    {busy ? (
                        <Loader2 size={iconSz} className="animate-spin" />
                    ) : (
                        <Upload size={iconSz} />
                    )}
                    Nhập từ Excel
                </button>
                {msg && (
                    <span className={`text-slate-600 max-w-md ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
                        {msg}
                    </span>
                )}
                {lastRes && lastRes.errors.length > 0 && (
                    <button
                        onClick={() => setShowErrors(!showErrors)}
                        className="text-blue-600 hover:underline text-[11px] font-medium"
                    >
                        {showErrors ? 'Ẩn chi tiết lỗi' : 'Xem chi tiết lỗi'}
                    </button>
                )}
            </div>

            {busy && progress.total > 0 && (
                <div className="w-full max-w-md bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                        className="bg-emerald-500 h-full transition-all duration-300"
                        style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                </div>
            )}

            {showErrors && lastRes && lastRes.errors.length > 0 && (
                <div className="mt-1 p-2 bg-red-50 border border-red-100 rounded-md max-h-40 overflow-auto">
                    <p className="text-[11px] font-bold text-red-800 mb-1">Chi tiết lỗi:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                        {lastRes.errors.map((error, idx) => (
                            <li key={idx} className="text-[10px] text-red-700">
                                {error}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
