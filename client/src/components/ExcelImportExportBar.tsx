import React, { useId, useRef, useState } from 'react';
import { Download, Upload, Loader2 } from 'lucide-react';
import {
    type ExcelColumnDef,
    downloadExcelTemplateDeferred,
    downloadExcelDataDeferred,
    parseExcelToRows,
} from '../lib/excelTableTools';
import { API_BASE_URL } from '../lib/api';

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
    /** Tải toàn bộ dữ liệu xuất (ưu tiên hơn `data` — tránh chỉ xuất một trang) */
    fetchExportData?: () => Promise<Record<string, unknown>[]>;
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

const EXCEL_IMPORT_LOG = '[ExcelImport]';

export function ExcelImportExportBar({
    columns,
    importColumns,
    data,
    fetchExportData,
    templateFileName,
    sheetName = 'Du lieu',
    onImport,
    onDone,
    className = '',
    disabled = false,
    compact = false,
}: Props) {
    const fileInputId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [exportBusy, setExportBusy] = useState(false);
    const [importBusy, setImportBusy] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [lastRes, setLastRes] = useState<ExcelImportResult | null>(null);
    const [showErrors, setShowErrors] = useState(false);

    const handleDownload = () => {
        if (disabled || exportBusy) return;
        setMsg('Đang tạo file Excel…');
        setExportBusy(true);

        console.log('[ExcelExport] ui_click', {
            templateFileName,
            sheetName,
            apiBase: API_BASE_URL,
            pageOrigin: window.location.origin,
            hasDataProp: Boolean(data?.length),
            dataRowCount: data?.length ?? 0,
            hasFetchExportData: Boolean(fetchExportData),
            disabled,
        });

        void (async () => {
            const t0 = performance.now();
            try {
                let rows: Record<string, unknown>[] = [];
                let source: 'data' | 'fetchExportData' | 'template' = 'template';
                if (data && data.length > 0) {
                    rows = data;
                    source = 'data';
                } else if (fetchExportData) {
                    console.log('[ExcelExport] ui_fetchExportData_start');
                    rows = await fetchExportData();
                    source = 'fetchExportData';
                    console.log('[ExcelExport] ui_fetchExportData_done', { rowCount: rows.length });
                }

                if (rows.length > 0) {
                    console.log('[ExcelExport] ui_download_data', { source, rowCount: rows.length });
                    await downloadExcelDataDeferred(columns, rows, templateFileName, sheetName);
                    setMsg(
                        `Đã gửi lệnh tải ${rows.length} dòng — kiểm tra hộp thoại/hàng Tải xuống trình duyệt (góc dưới màn hình).`,
                    );
                } else {
                    console.log('[ExcelExport] ui_download_template', { source });
                    await downloadExcelTemplateDeferred(columns, templateFileName, sheetName);
                    setMsg(
                        'Đã gửi lệnh tải file mẫu — kiểm tra hộp thoại/hàng Tải xuống trình duyệt.',
                    );
                }
                console.log('[ExcelExport] ui_success', {
                    elapsedMs: Math.round(performance.now() - t0),
                    source,
                });
            } catch (e: unknown) {
                console.error('[ExcelExport] ui_error', {
                    elapsedMs: Math.round(performance.now() - t0),
                    error: e instanceof Error ? { message: e.message, stack: e.stack } : e,
                });
                const errText = e instanceof Error ? e.message : 'Không tải được file Excel.';
                setMsg(
                    `${errText} — Đảm bảo server đang chạy (npm run dev trong thư mục server).`,
                );
            } finally {
                setExportBusy(false);
            }
        })();
    };

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file || disabled) {
            console.warn(EXCEL_IMPORT_LOG, 'file_change_skipped', {
                hasFile: Boolean(file),
                disabled,
            });
            return;
        }

        console.log(EXCEL_IMPORT_LOG, 'file_selected', {
            name: file.name,
            size: file.size,
            type: file.type,
        });

        setImportBusy(true);
        setMsg('Đang đọc file Excel…');
        setLastRes(null);
        setShowErrors(false);
        setProgress({ current: 0, total: 0 });

        const parseColumns = importColumns ?? columns;
        try {
            const rows = await parseExcelToRows(file, parseColumns);
            console.log(EXCEL_IMPORT_LOG, 'parse_ok', { rowCount: rows.length });

            if (rows.length === 0) {
                setMsg(
                    'File không có dòng dữ liệu (chỉ có tiêu đề/ví dụ). Điền dữ liệu từ dòng 3 trở đi.',
                );
                setImportBusy(false);
                return;
            }

            setMsg(`Đang nhập ${rows.length} dòng…`);
            setProgress({ current: 0, total: rows.length });

            const result = await onImport(rows, (current, total) => {
                setProgress({ current, total });
            });

            console.log(EXCEL_IMPORT_LOG, 'import_done', {
                ok: result.ok,
                errorCount: result.errors.length,
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
            console.error(EXCEL_IMPORT_LOG, 'import_failed', {
                error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
            });
            setMsg(err instanceof Error ? err.message : 'Không đọc được file Excel.');
        } finally {
            setImportBusy(false);
        }
    };

    const btnBase = compact
        ? 'gap-1 px-2 py-1 text-[11px] rounded-md'
        : 'gap-1.5 px-3 py-1.5 text-xs rounded-lg';
    const iconSz = compact ? 12 : 14;
    const importDisabled = disabled || importBusy;

    return (
        <div className={`flex flex-col gap-2 ${className}`}>
            <div className="flex flex-wrap items-center gap-1.5">
                <button
                    type="button"
                    onClick={handleDownload}
                    disabled={disabled || exportBusy}
                    className={`inline-flex items-center font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 ${btnBase}`}
                >
                    <Download size={iconSz} />
                    {fetchExportData || (data && data.length > 0)
                        ? 'Tải file Excel'
                        : 'Tải mẫu Excel'}
                </button>

                {/* Không dùng display:none — một số trình duyệt chặn mở hộp thoại chọn file */}
                <input
                    id={fileInputId}
                    ref={inputRef}
                    type="file"
                    accept=".xlsx,.xls,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    className="sr-only"
                    style={{
                        position: 'absolute',
                        width: 1,
                        height: 1,
                        padding: 0,
                        margin: -1,
                        overflow: 'hidden',
                        clip: 'rect(0,0,0,0)',
                        whiteSpace: 'nowrap',
                        border: 0,
                    }}
                    disabled={importDisabled}
                    onChange={handleFile}
                />
                <label
                    htmlFor={fileInputId}
                    className={`inline-flex items-center font-semibold border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 ${btnBase} ${
                        importDisabled ? 'pointer-events-none opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                    onClick={() => {
                        console.log(EXCEL_IMPORT_LOG, 'pick_label_click', {
                            importDisabled,
                            inputId: fileInputId,
                        });
                    }}
                >
                    {importBusy ? (
                        <Loader2 size={iconSz} className="animate-spin" />
                    ) : (
                        <Upload size={iconSz} />
                    )}
                    Nhập từ Excel
                </label>

                {msg && (
                    <span className={`text-slate-600 max-w-md ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
                        {msg}
                    </span>
                )}
                {lastRes && lastRes.errors.length > 0 && (
                    <button
                        type="button"
                        onClick={() => setShowErrors(!showErrors)}
                        className="text-blue-600 hover:underline text-[11px] font-medium"
                    >
                        {showErrors ? 'Ẩn chi tiết lỗi' : 'Xem chi tiết lỗi'}
                    </button>
                )}
            </div>

            {importBusy && progress.total > 0 && (
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
};
