import React, { useState, useMemo, useEffect } from 'react';
import {
    Search,
    Plus,
    Eye,
    Edit,
    Trash2,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    X,
    CheckCircle,
    PlusCircle,
    Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDuAnModal } from '../../contexts/DuAnModalContext';
import { useKhachHangModal } from '../../contexts/KhachHangModalContext';
import { customerService, type Customer } from '../../lib/services/customerService';
import { projectService } from '../../lib/services/projectService';
import { contractService } from '../../lib/services/contractService';
import { thuChiService, type ThuChiRow } from '../../lib/services/thuChiService';
import { ExcelImportExportBar } from '../../components/ExcelImportExportBar';
import type { ExcelColumnDef } from '../../lib/excelTableTools';
import { cleanString, normalizeKey } from '../../lib/excelTableTools';
import { cn } from '../../lib/utils';
import { PAGE_SIZE_OPTIONS, buildVisiblePages } from '../../lib/tablePagination';

/** Đặt `true` để hiện nút xóa toàn bộ khách hàng (mặc định ẩn). */
const SHOW_DELETE_ALL_KHACH_HANG_BUTTON = false;

// Toast notification component
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'info' | 'warning'; onClose: () => void }) {
    React.useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColor = type === 'success' ? 'bg-emerald-500' : type === 'warning' ? 'bg-amber-500' : 'bg-blue-500';
    const Icon = type === 'success' ? CheckCircle : type === 'warning' ? Trash2 : PlusCircle;

    return (
        <div className={`fixed top-5 right-5 z-[100] ${bgColor} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 toast-enter`}>
            <Icon size={18} />
            <span className="text-sm font-medium">{message}</span>
            <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded p-0.5 transition-colors">
                <X size={14} />
            </button>
        </div>
    );
}

export function DanhSachKhachHang() {
    const navigate = useNavigate();
    const [items, setItems] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState<number>(PAGE_SIZE_OPTIONS[0]);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);
    const [reloadKey, setReloadKey] = useState(0);
    const [deletingAllKhach, setDeletingAllKhach] = useState(false);
    const [selectedKhachIds, setSelectedKhachIds] = useState<string[]>([]);
    const [deletingSelectedKhach, setDeletingSelectedKhach] = useState(false);

    const khachHangExcelColumns: ExcelColumnDef[] = [
        {
            key: 'ten_khach_hang',
            header: 'Tên Khách hàng',
            example: 'Công ty ABC',
            required: true,
            matchHeaders: [
                'Ten khach hang',
                'Tên KH',
                'Khách hàng',
                'Khach hang',
                'Customer',
                'customer_name',
            ],
        },
        { key: 'loai_hinh', header: 'Loại hình', example: 'TNHH' },
        { key: 'mst', header: 'MST', example: '0123456789' },
        { key: 'dia_chi', header: 'Địa chỉ', example: 'Hà Nội' },
        { key: 'nguoi_dai_dien', header: 'Người đại diện', example: 'Nguyễn Văn A' },
        { key: 'chuc_vu_dai_dien', header: 'Chức vụ đại diện', example: 'Giám đốc' },
        { key: 'nguoi_lien_he', header: 'Người liên hệ', example: 'Trần Thị B' },
        { key: 'chuc_vu_lien_he', header: 'Chức vụ liên hệ', example: 'Kế toán' },
        { key: 'sdt_lien_he', header: 'SĐT liên hệ', example: '0901234567' },
    ];

    /** Cột chỉ khi nhập — nhận file cũ có «Tên đơn vị» hoặc xuất từ hệ thống khác */
    const khachHangExcelImportColumns: ExcelColumnDef[] = [
        ...khachHangExcelColumns,
        {
            key: 'ten_don_vi',
            header: 'Tên đơn vị',
            matchHeaders: ['Ten don vi', 'Tên đơn vị', 'ten_don_vi', 'Don vi'],
        },
    ];

    const { openDuAnModal } = useDuAnModal();
    const { openChiTietKhachHang, openThemKhachHang, openDelete } = useKhachHangModal();

    // Load khách hàng + tính tự động (HĐ theo customer_id / du_an; thu qua hop_dong_id hoặc du_an)
    React.useEffect(() => {
        (async () => {
            try {
                const [customers, projects, contractsRes, allThuChi] = await Promise.all([
                    customerService.getAll(),
                    projectService.getAll(),
                    contractService.getAll(),
                    thuChiService.getAll(),
                ]);

                const contractsList = Array.isArray(contractsRes)
                    ? contractsRes
                    : contractsRes && Array.isArray((contractsRes as { data?: unknown }).data)
                      ? (contractsRes as { data: any[] }).data
                      : [];

                if (!customers || customers.length === 0) {
                    setItems([]);
                    setToast({ message: 'Không có dữ liệu khách hàng từ database.', type: 'info' });
                    return;
                }

                const customerNameKeyToId = new Map<string, string>();
                (customers as Customer[]).forEach((kh) => {
                    const nk = normalizeKey(kh.ten_don_vi || '');
                    if (nk) customerNameKeyToId.set(nk, String(kh.id));
                });

                /** Mỗi dự án → một khách (customer_id hoặc khớp tên KH trên dự án) */
                const duAnIdToCustomerId = new Map<string, string>();
                (projects || []).forEach((p: any) => {
                    const pid = String(p.id);
                    let khId: string | null =
                        p.customer_id != null && String(p.customer_id).trim() !== ''
                            ? String(p.customer_id)
                            : null;
                    if (!khId) {
                        const label = normalizeKey(p.ten_khach_hang || p.customer_name || '');
                        if (label) khId = customerNameKeyToId.get(label) ?? null;
                    }
                    if (khId) duAnIdToCustomerId.set(pid, khId);
                });

                const resolveKhIdForContract = (c: any): string | null => {
                    const direct =
                        c.customer_id != null && String(c.customer_id).trim() !== ''
                            ? String(c.customer_id)
                            : null;
                    if (direct) return direct;
                    const duAnId = c.du_an_id != null ? String(c.du_an_id) : '';
                    if (duAnId) return duAnIdToCustomerId.get(duAnId) ?? null;
                    return null;
                };

                /** hop_dong PK (và id hiển thị) → khách — khớp thu_chi.hop_dong_id */
                const hopDongPkToCustomerId = new Map<string, string>();
                contractsList.forEach((c: any) => {
                    const khId = resolveKhIdForContract(c);
                    if (!khId) return;
                    const rowPk = c.hop_dong_row_id != null ? String(c.hop_dong_row_id) : '';
                    const bizId = c.id != null ? String(c.id) : '';
                    if (rowPk) hopDongPkToCustomerId.set(rowPk, khId);
                    if (bizId) hopDongPkToCustomerId.set(bizId, khId);
                });

                type Fin = {
                    tongHopDong: number;
                    giaTriQuyetToan: number;
                    daThu: number;
                    conPhaiThu: number;
                    soHopDong: number;
                };
                const financialsByCustomer = new Map<string, Fin>();
                const ensureFin = (khId: string): Fin => {
                    let f = financialsByCustomer.get(khId);
                    if (!f) {
                        f = {
                            tongHopDong: 0,
                            giaTriQuyetToan: 0,
                            daThu: 0,
                            conPhaiThu: 0,
                            soHopDong: 0,
                        };
                        financialsByCustomer.set(khId, f);
                    }
                    return f;
                };

                const seenContractKey = new Set<string>();
                contractsList.forEach((c: any) => {
                    const khId = resolveKhIdForContract(c);
                    if (!khId) return;
                    const dedup = String(c.hop_dong_row_id || c.id || '').trim();
                    if (!dedup) return;
                    const ukey = `${khId}|${dedup}`;
                    if (seenContractKey.has(ukey)) return;
                    seenContractKey.add(ukey);
                    const f = ensureFin(khId);
                    f.tongHopDong += Number(c.gia_tri_hd) || 0;
                    f.giaTriQuyetToan += Number(c.gia_tri_qt) || 0;
                    f.soHopDong += 1;
                });

                (allThuChi || []).forEach((tc: ThuChiRow) => {
                    if (tc.loai_phieu !== 'Phiếu thu') return;
                    let khId: string | null = null;
                    if (tc.hop_dong_id) {
                        khId = hopDongPkToCustomerId.get(String(tc.hop_dong_id)) ?? null;
                    }
                    if (!khId && tc.du_an_id) {
                        khId = duAnIdToCustomerId.get(String(tc.du_an_id)) ?? null;
                    }
                    if (!khId) return;
                    const f = ensureFin(khId);
                    f.daThu += Number(tc.so_tien) || 0;
                });

                financialsByCustomer.forEach((f) => {
                    f.conPhaiThu = f.giaTriQuyetToan - f.daThu;
                });

                setItems(
                    (customers as Customer[]).map((c: Customer) => {
                        const cid = String(c.id);
                        const calc = financialsByCustomer.get(cid);
                        return {
                            id: c.id,
                            Ten_Don_Vi: c.ten_don_vi,
                            Loai_Hinh: c.loai_hinh || '',
                            MST: c.mst || '',
                            Dia_Chi: c.dia_chi || '',
                            Nguoi_Dai_Dien: c.nguoi_dai_dien || '',
                            Chuc_Vu_Dai_Dien: c.chuc_vu_dai_dien || '',
                            Nguoi_Lien_He: c.nguoi_lien_he || '',
                            Chuc_Vu_Lien_He: c.chuc_vu_lien_he || '',
                            SDT_Lien_He: c.sdt_lien_he || '',
                            SoHopDong: calc?.soHopDong ?? 0,
                            TongHopDong: calc?.tongHopDong ?? c.tong_hop_dong ?? 0,
                            GiaTriQuyetToan: calc?.giaTriQuyetToan ?? c.gia_tri_quyet_toan ?? 0,
                            DaThu: calc?.daThu ?? c.da_thu ?? 0,
                            ConPhaiThu:
                                calc?.conPhaiThu ??
                                (calc ? calc.giaTriQuyetToan - calc.daThu : (c.con_phai_thu ?? 0)),
                        };
                    }),
                );
            } catch (error) {
                console.error('[DanhSachKhachHang] Error loading customers:', error);
                setItems([]);
                setToast({
                    message: 'Không kết nối được database. Vui lòng kiểm tra Supabase env và quyền truy cập (RLS).',
                    type: 'warning',
                });
            }
        })();
    }, [reloadKey]);

    // Filtered items by search
    const filteredItems = useMemo(() => {
        if (!searchTerm) return items;
        const term = searchTerm.toLowerCase();
        return items.filter(item =>
            item.Ten_Don_Vi?.toLowerCase().includes(term) ||
            item.MST?.toLowerCase().includes(term) ||
            item.SDT_Lien_He?.toLowerCase().includes(term) ||
            item.Nguoi_Lien_He?.toLowerCase().includes(term)
        );
    }, [items, searchTerm]);

    // Pagination
    const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage) || 1);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);
    const visiblePages = useMemo(
        () => buildVisiblePages(currentPage, totalPages),
        [currentPage, totalPages],
    );

    useEffect(() => {
        setCurrentPage((page) => Math.min(page, totalPages));
    }, [totalPages]);

    useEffect(() => {
        setCurrentPage(1);
    }, [itemsPerPage, searchTerm]);

    const khachHangRowId = (item: { id?: string | number }) => String(item.id ?? '').trim();

    const isAllKhachSelected =
        filteredItems.length > 0 &&
        filteredItems.every((item) => selectedKhachIds.includes(khachHangRowId(item)));

    const selectedKhachInFilter = useMemo(
        () =>
            filteredItems
                .filter((item) => selectedKhachIds.includes(khachHangRowId(item)))
                .map((item) => khachHangRowId(item))
                .filter(Boolean),
        [filteredItems, selectedKhachIds],
    );

    useEffect(() => {
        const valid = new Set(items.map((item) => khachHangRowId(item)).filter(Boolean));
        setSelectedKhachIds((prev) => prev.filter((id) => valid.has(id)));
    }, [items]);

    const toggleSelectAllKhach = () => {
        setSelectedKhachIds(
            isAllKhachSelected
                ? []
                : filteredItems.map((item) => khachHangRowId(item)).filter(Boolean),
        );
    };

    const toggleKhachRowSelected = (item: { id?: string | number }) => {
        const id = khachHangRowId(item);
        if (!id) return;
        setSelectedKhachIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    };

    const excelTenKhachHang = (r: Record<string, string>) =>
        cleanString(r.ten_khach_hang || r.ten_don_vi || r.customer_name || '');

    const mapKhachHangToExcelRow = (item: (typeof items)[0]) => ({
        ten_khach_hang: item.Ten_Don_Vi ?? '',
        loai_hinh: item.Loai_Hinh ?? '',
        mst: item.MST ?? '',
        dia_chi: item.Dia_Chi ?? '',
        nguoi_dai_dien: item.Nguoi_Dai_Dien ?? '',
        chuc_vu_dai_dien: item.Chuc_Vu_Dai_Dien ?? '',
        nguoi_lien_he: item.Nguoi_Lien_He ?? '',
        chuc_vu_lien_he: item.Chuc_Vu_Lien_He ?? '',
        sdt_lien_he: item.SDT_Lien_He ?? '',
    });

    const formatCurrency = (amount: number) => {
        return amount.toLocaleString('vi-VN');
    };

    const handleEditClick = (item: any) => {
        openThemKhachHang(item);
    };

    const handleAddClick = () => {
        openThemKhachHang();
    };

    const handleDeleteClick = (item: any) => {
        openDelete({ id: item.id, tenDonVi: item.Ten_Don_Vi });
    };

    const handleDeleteSelectedKhachHang = async () => {
        if (selectedKhachInFilter.length === 0 || deletingSelectedKhach) return;
        if (
            !window.confirm(
                `Xóa ${selectedKhachInFilter.length} khách hàng đã chọn (theo bộ lọc hiện tại)? Hợp đồng gắn khách có thể bị ảnh hưởng. Không hoàn tác.`,
            )
        ) {
            return;
        }
        setDeletingSelectedKhach(true);
        try {
            const { deleted, requested, error } = await customerService.deleteMany(
                selectedKhachInFilter,
            );
            setSelectedKhachIds((prev) =>
                prev.filter((id) => !selectedKhachInFilter.includes(id)),
            );
            setReloadKey((k) => k + 1);
            if (error) {
                setToast({ type: 'warning', message: error });
            } else if (deleted < requested) {
                setToast({
                    type: 'warning',
                    message: `Đã xóa ${deleted}/${requested} khách hàng. Một số bản ghi không xóa được.`,
                });
            } else {
                setToast({
                    type: 'success',
                    message: `Đã xóa ${deleted} khách hàng.`,
                });
            }
        } catch (err: unknown) {
            setToast({
                type: 'warning',
                message: err instanceof Error ? err.message : 'Không xóa được khách hàng đã chọn.',
            });
            setReloadKey((k) => k + 1);
        } finally {
            setDeletingSelectedKhach(false);
        }
    };

    const handleDeleteAllKhachHang = async () => {
        const n = items.length;
        if (n === 0 || deletingAllKhach) return;
        if (
            !window.confirm(
                `Bạn sắp xóa TOÀN BỘ ${n} khách hàng trong hệ thống. Hợp đồng gắn khách có thể bị xóa theo (CASCADE). Không thể hoàn tác.\n\nBấm OK để xác nhận bước tiếp theo.`,
            )
        ) {
            return;
        }
        if (!window.confirm('Xác nhận lần 2: Xóa vĩnh viễn toàn bộ khách hàng?')) {
            return;
        }
        setDeletingAllKhach(true);
        try {
            const res = await customerService.deleteAll();
            if (res.ok) {
                setCurrentPage(1);
                setReloadKey((k) => k + 1);
                setToast({
                    type: 'success',
                    message:
                        res.deleted === 0
                            ? 'Không có khách hàng nào để xóa.'
                            : `Đã xóa toàn bộ ${res.deleted} khách hàng.`,
                });
            } else {
                setToast({
                    type: 'warning',
                    message: res.error
                        ? `Xóa không hoàn tất: ${res.error}`
                        : 'Không xóa được toàn bộ khách hàng.',
                });
            }
        } catch {
            setToast({ type: 'warning', message: 'Lỗi khi xóa toàn bộ khách hàng.' });
        } finally {
            setDeletingAllKhach(false);
        }
    };

    const handleSaveProject = async (data: any) => {
        // Logic lưu dự án rút gọn
        try {
             setToast({ message: 'Đã cập nhật thông tin dự án!', type: 'success' });
        } catch (err) {
            console.error('[DanhSachKhachHang] Error saving project:', err);
        }
    };

    return (
        <div className="bg-[#faf8ff] text-[#131b2e] min-h-screen animate-in fade-in duration-500 p-6 md:p-8 space-y-6">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="w-full max-w-none space-y-6">
                <div className="mb-2">
                    <h2 className="text-2xl font-black tracking-tight uppercase">Quản lý Khách hàng</h2>
                    <p className="text-slate-500 text-sm mt-1">Danh mục đối tác và khách hàng.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-700">
                                <span className="inline-block">KH</span>
                            </div>
                            <span className="text-xs font-bold text-blue-700">+12%</span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium">Tổng số khách hàng</p>
                        <h3 className="text-3xl font-bold mt-1">{filteredItems.length}</h3>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <p className="text-xs text-slate-500 font-medium">Khách hàng mới tháng này</p>
                        <h3 className="text-3xl font-bold mt-1">—</h3>
                    </div>
                    <div className="bg-[#283044] p-6 rounded-xl shadow-lg">
                        <p className="text-xs text-slate-300 font-medium">Tổng giá trị hợp đồng lũy kế</p>
                        <h3 className="text-3xl font-bold mt-1 text-white">{
                            (filteredItems.reduce((s, c) => s + (Number(c.GiaTriQuyetToan) || 0), 0)).toLocaleString('vi-VN')
                        } <span className="text-sm text-slate-300 ml-1">VND</span></h3>
                    </div>
                </div>

                <div className="bg-[#f2f3ff] p-5 rounded-xl border border-slate-200">
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="flex-grow min-w-[240px]">
                            <label className="block text-xs font-bold text-slate-600 mb-2 px-1">Tìm kiếm chi tiết</label>
                            <div className="relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500/20"
                                    placeholder="Tên, mã số thuế hoặc SĐT..."
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                />
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 ml-auto">
                            {SHOW_DELETE_ALL_KHACH_HANG_BUTTON ? (
                                <button
                                    type="button"
                                    disabled={items.length === 0 || deletingAllKhach}
                                    onClick={handleDeleteAllKhachHang}
                                    title="Xóa mọi bản ghi khách hàng — có thể CASCADE sang hợp đồng"
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50/90 px-3 py-2 text-xs font-bold text-rose-900 shadow-sm hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-45"
                                >
                                    {deletingAllKhach ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-3.5 h-3.5" />
                                    )}
                                    Xóa toàn bộ KH
                                    {items.length > 0 ? ` (${items.length})` : ''}
                                </button>
                            ) : null}
                            <ExcelImportExportBar
                                columns={khachHangExcelColumns}
                                importColumns={khachHangExcelImportColumns}
                                fetchExportData={async () =>
                                    filteredItems.map((item) => mapKhachHangToExcelRow(item))
                                }
                                templateFileName="mau-khach-hang"
                                sheetName="Khach hang"
                                onImport={async (rows) => {
                                    const errors: string[] = [];
                                    let ok = 0;
                                    for (let i = 0; i < rows.length; i++) {
                                        const r = rows[i];
                                        const rowLabel = r.__rowNumber
                                            ? `Excel dòng ${r.__rowNumber}`
                                            : `Dòng ${i + 2}`;
                                        const ten = excelTenKhachHang(r);
                                        if (!ten) {
                                            errors.push(
                                                `${rowLabel}: thiếu «Tên Khách hàng» (hoặc «Tên đơn vị» trên file cũ).`,
                                            );
                                            continue;
                                        }
                                        try {
                                            await customerService.create({
                                                ten_don_vi: ten,
                                                loai_hinh: r.loai_hinh?.trim() || undefined,
                                                mst: r.mst?.trim() || undefined,
                                                dia_chi: r.dia_chi?.trim() || undefined,
                                                nguoi_dai_dien: r.nguoi_dai_dien?.trim() || undefined,
                                                chuc_vu_dai_dien: r.chuc_vu_dai_dien?.trim() || undefined,
                                                nguoi_lien_he: r.nguoi_lien_he?.trim() || undefined,
                                                chuc_vu_lien_he: r.chuc_vu_lien_he?.trim() || undefined,
                                                sdt_lien_he: r.sdt_lien_he?.trim() || undefined,
                                            });
                                            ok++;
                                        } catch (e: any) {
                                            errors.push(`${rowLabel}: ${e?.message || 'Lỗi'}`);
                                        }
                                    }
                                    return { ok, errors };
                                }}
                                onDone={() => setReloadKey((k) => k + 1)}
                            />
                            <button
                                onClick={handleAddClick}
                                className="flex items-center gap-2 bg-[#004bcb] text-white px-5 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                            >
                                <Plus size={16} />
                                Thêm khách hàng
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-slate-200 bg-slate-50/90">
                        <button
                            type="button"
                            disabled={
                                selectedKhachInFilter.length === 0 || deletingSelectedKhach
                            }
                            onClick={handleDeleteSelectedKhachHang}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-700 shadow-sm hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45"
                        >
                            {deletingSelectedKhach ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                            )}
                            Xóa đã chọn
                            {selectedKhachInFilter.length > 0
                                ? ` (${selectedKhachInFilter.length})`
                                : ''}
                        </button>
                        {selectedKhachInFilter.length > 0 ? (
                            <button
                                type="button"
                                onClick={() => setSelectedKhachIds([])}
                                className="text-xs font-semibold text-slate-600 hover:text-[#004bcb] hover:underline"
                            >
                                Bỏ chọn
                            </button>
                        ) : null}
                        <span className="text-[11px] text-slate-500">
                            Tick đầu cột hoặc từng dòng — chọn mọi KH đang lọc (có thể nhiều trang).
                        </span>
                    </div>
                    <div className="w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
                    <table className="w-full min-w-[1240px] text-left border-collapse">
                        <thead className="bg-[#f2f3ff] border-b border-slate-200">
                            <tr>
                                <th className="px-3 py-4 w-11 text-center">
                                    <input
                                        type="checkbox"
                                        checked={isAllKhachSelected}
                                        disabled={filteredItems.length === 0 || deletingSelectedKhach}
                                        onChange={toggleSelectAllKhach}
                                        className="h-4 w-4 rounded border-slate-400 bg-white text-[#004bcb] focus:ring-[#004bcb]/40 cursor-pointer disabled:opacity-40"
                                        aria-label="Chọn tất cả khách hàng đang lọc"
                                    />
                                </th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider min-w-[280px]">Khách hàng / Đơn vị</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider min-w-[140px]">Mã số định danh</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider min-w-[130px]">SĐT liên hệ</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-center min-w-[100px]">Hợp đồng</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right min-w-[160px]">Tổng giao dịch (VND)</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right min-w-[140px]">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentItems.map((item) => {
                                const rowId = khachHangRowId(item);
                                const rowChecked = rowId ? selectedKhachIds.includes(rowId) : false;
                                return (
                                <tr
                                    key={item.id}
                                    className={cn(
                                        'hover:bg-slate-50 transition-colors',
                                        rowChecked && 'bg-blue-50/40',
                                    )}
                                >
                                    <td className="px-3 py-4 text-center align-top">
                                        <input
                                            type="checkbox"
                                            checked={rowChecked}
                                            disabled={!rowId || deletingSelectedKhach}
                                            onChange={() => toggleKhachRowSelected(item)}
                                            className="h-4 w-4 rounded border-slate-300 text-[#004bcb] focus:ring-[#004bcb]/40 cursor-pointer disabled:opacity-40"
                                            aria-label={`Chọn ${item.Ten_Don_Vi || 'khách hàng'}`}
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100 overflow-hidden shrink-0">
                                                <span className="text-xs font-bold text-blue-700">KH</span>
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{item.Ten_Don_Vi || '(Trống)'}</p>
                                                <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-bold uppercase">{item.Loai_Hinh || '—'}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-600">{item.MST || '—'}</td>
                                    <td className="px-6 py-4 text-sm text-slate-600">{item.SDT_Lien_He || '—'}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="text-sm font-bold px-2 py-1 bg-slate-100 rounded-lg">
                                            {Number(item.SoHopDong) > 0 ? item.SoHopDong : '—'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">{formatCurrency(item.GiaTriQuyetToan ?? 0)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button className="p-2 hover:bg-blue-50 text-blue-700 rounded-lg transition-colors" title="Xem chi tiết" onClick={() => openChiTietKhachHang(item)}>
                                                <Eye size={16} />
                                            </button>
                                            <button className="p-2 hover:bg-amber-50 text-amber-700 rounded-lg transition-colors" title="Chỉnh sửa" onClick={() => handleEditClick(item)}>
                                                <Edit size={16} />
                                            </button>
                                            <button className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors" title="Xóa" onClick={() => handleDeleteClick(item)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                            })}
                        </tbody>
                    </table>
                    </div>
                    <div className="px-6 py-4 bg-[#f2f3ff] border-t border-slate-200 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                            <p>
                                Hiển thị{' '}
                                <span className="font-bold text-slate-800">
                                    {currentItems.length ? startIndex + 1 : 0} –{' '}
                                    {Math.min(startIndex + itemsPerPage, filteredItems.length)}
                                </span>{' '}
                                của <span className="font-bold text-slate-800">{filteredItems.length}</span> khách hàng
                            </p>
                            <label className="flex items-center gap-2 text-slate-600">
                                <span className="whitespace-nowrap">Số dòng / trang</span>
                                <select
                                    value={itemsPerPage}
                                    onChange={(event) => setItemsPerPage(Number(event.target.value))}
                                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                >
                                    {PAGE_SIZE_OPTIONS.map((size) => (
                                        <option key={size} value={size}>
                                            {size}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <div className="flex max-w-full flex-nowrap items-center gap-1 overflow-x-auto">
                            <button
                                type="button"
                                onClick={() => setCurrentPage(1)}
                                disabled={currentPage === 1}
                                className="rounded border border-slate-300 p-1.5 text-slate-600 hover:bg-white disabled:opacity-30"
                                title="Trang đầu"
                            >
                                <ChevronsLeft size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                disabled={currentPage === 1}
                                className="rounded border border-slate-300 p-1.5 text-slate-600 hover:bg-white disabled:opacity-30"
                                title="Trang trước"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            {visiblePages.map((page, index) =>
                                page === 'ellipsis' ? (
                                    <span
                                        key={`ellipsis-${index}`}
                                        className="px-1 text-xs font-semibold text-slate-400"
                                    >
                                        ...
                                    </span>
                                ) : (
                                    <button
                                        key={page}
                                        type="button"
                                        onClick={() => setCurrentPage(page)}
                                        className={cn(
                                            'h-8 min-w-8 rounded-lg px-2 text-xs font-bold transition-colors',
                                            currentPage === page
                                                ? 'bg-[#004bcb] text-white shadow-sm'
                                                : 'border border-slate-300 bg-white text-slate-600 hover:bg-white',
                                        )}
                                    >
                                        {page}
                                    </button>
                                ),
                            )}
                            <button
                                type="button"
                                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                                disabled={currentPage >= totalPages}
                                className="rounded border border-slate-300 p-1.5 text-slate-600 hover:bg-white disabled:opacity-30"
                                title="Trang sau"
                            >
                                <ChevronRight size={14} />
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentPage(totalPages)}
                                disabled={currentPage >= totalPages}
                                className="rounded border border-slate-300 p-1.5 text-slate-600 hover:bg-white disabled:opacity-30"
                                title="Trang cuối"
                            >
                                <ChevronsRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
