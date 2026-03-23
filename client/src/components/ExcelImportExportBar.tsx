import React, { useRef, useState } from 'react';
import { Download, Upload, Loader2 } from 'lucide-react';
import {
    type ExcelColumnDef,
    downloadExcelTemplate,
    parseExcelToRows,
} from '../lib/excelTableTools';

export type ExcelImportResult = { ok: number; errors: string[] };

type Props = {
    columns: ExcelColumnDef[];
    /** Tên file tải về, không bắt buộc .xlsx */
    templateFileName: string;
    /** Tên sheet trong file Excel */
    sheetName?: string;
    /** Xử lý từng lô dòng đọc từ file */
    onImport: (rows: Record<string, string>[]) => Promise<ExcelImportResult>;
    /** Sau khi nhập xong (dù lỗi một phần) */
    onDone?: () => void;
    className?: string;
    disabled?: boolean;
};

export function ExcelImportExportBar({
    columns,
    templateFileName,
    sheetName = 'Du lieu',
    onImport,
    onDone,
    className = '',
    disabled = false,
}: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    const handleDownload = () => {
        setMsg(null);
        downloadExcelTemplate(columns, templateFileName, sheetName);
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
        try {
            const rows = await parseExcelToRows(file, columns);
            if (rows.length === 0) {
                setMsg('File không có dòng dữ liệu (bỏ qua hàng tiêu đề).');
                return;
            }
            const { ok, errors } = await onImport(rows);
            const parts = [`Đã nhập ${ok} bản ghi.`];
            if (errors.length) parts.push(`${errors.length} lỗi: ${errors.slice(0, 5).join('; ')}${errors.length > 5 ? '…' : ''}`);
            setMsg(parts.join(' '));
            onDone?.();
        } catch (err) {
            setMsg(err instanceof Error ? err.message : 'Không đọc được file Excel.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className={`flex flex-wrap items-center gap-2 ${className}`}>
            <button
                type="button"
                onClick={handleDownload}
                disabled={disabled || busy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-lg bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
                <Download size={14} />
                Tải mẫu Excel
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-emerald-200 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
            >
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Nhập từ Excel
            </button>
            {msg && <span className="text-[11px] text-slate-600 max-w-md">{msg}</span>}
        </div>
    );
}
