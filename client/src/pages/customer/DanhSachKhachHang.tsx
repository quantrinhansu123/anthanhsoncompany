import React, { useState, useMemo } from 'react';
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
    PlusCircle
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

const mockData = [
    {
        id: 1,
        Ten_Don_Vi: "Công ty Cổ phần Nước Môi trường và Hạ tầng Kỹ thuật Thủ Đô",
        Loai_Hinh: "Tư nhân",
        MST: "0101882929",
        Dia_Chi: "Số 6 ngõ 347/16 đường Cổ Nhuế, Phường Đông Ngạc, TP Hà Nội",
        Nguoi_Dai_Dien: "Nguyễn Mạnh Thắng",
        Chuc_Vu_Dai_Dien: "Giám đốc",
        Nguoi_Lien_He: "Chị Năm",
        Chuc_Vu_Lien_He: "Kế toán",
        SDT_Lien_He: "0976769568",
        TongHopDong: 65680000,
        GiaTriQuyetToan: 65680000,
        DaThu: 55828000,
        ConPhaiThu: 9852000
    }
];

export function DanhSachKhachHang() {
    const navigate = useNavigate();
    const [items, setItems] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    const khachHangExcelColumns: ExcelColumnDef[] = [
        { key: 'ten_don_vi', header: 'Tên đơn vị', example: 'Công ty ABC' },
        { key: 'loai_hinh', header: 'Loại hình', example: 'TNHH' },
        { key: 'mst', header: 'MST', example: '0123456789' },
        { key: 'dia_chi', header: 'Địa chỉ', example: 'Hà Nội' },
        { key: 'nguoi_dai_dien', header: 'Người đại diện', example: 'Nguyễn Văn A' },
        { key: 'chuc_vu_dai_dien', header: 'Chức vụ đại diện', example: 'Giám đốc' },
        { key: 'nguoi_lien_he', header: 'Người liên hệ', example: 'Trần Thị B' },
        { key: 'chuc_vu_lien_he', header: 'Chức vụ liên hệ', example: 'Kế toán' },
        { key: 'sdt_lien_he', header: 'SĐT liên hệ', example: '0901234567' },
    ];

    const { openDuAnModal } = useDuAnModal();
    const { openChiTietKhachHang, openThemKhachHang, openDelete } = useKhachHangModal();

    // Load khách hàng + tính tự động
    React.useEffect(() => {
        (async () => {
            try {
                const [customers, projects, contracts, allThuChi] = await Promise.all([
                    customerService.getAll(),
                    projectService.getAll(),
                    contractService.getAll(),
                    thuChiService.getAll(),
                ]);

                if (!customers || customers.length === 0) {
                    setItems([]);
                    setToast({ message: 'Không có dữ liệu khách hàng từ database.', type: 'info' });
                    return;
                }

                const customerIdToProjectIds = new Map<string, string[]>();
                (projects || []).forEach((p: any) => {
                    const cid = p.customer_id ? String(p.customer_id) : null;
                    if (!cid) return;
                    if (!customerIdToProjectIds.has(cid)) customerIdToProjectIds.set(cid, []);
                    customerIdToProjectIds.get(cid)!.push(p.id);
                });

                const projectIdToName = new Map<string, string>();
                (projects || []).forEach((p: any) => projectIdToName.set(p.id, p.ten_du_an || ''));

                const financialsByCustomer = new Map<string, { tongHopDong: number; giaTriQuyetToan: number; daThu: number; conPhaiThu: number }>();

                (contracts || []).forEach((c: any) => {
                    const duAnId = c.du_an_id ? String(c.du_an_id) : null;
                    const projectName = c.project_name || (duAnId ? projectIdToName.get(duAnId) : null);
                    if (!duAnId && !projectName) return;
                    for (const [cid, pids] of customerIdToProjectIds) {
                        if (duAnId && pids.includes(duAnId)) {
                            const f = financialsByCustomer.get(cid) || { tongHopDong: 0, giaTriQuyetToan: 0, daThu: 0, conPhaiThu: 0 };
                            f.tongHopDong += Number(c.gia_tri_hd) || 0;
                            f.giaTriQuyetToan += Number(c.gia_tri_qt) || 0;
                            financialsByCustomer.set(cid, f);
                            break;
                        }
                    }
                });

                (allThuChi || []).forEach((tc: ThuChiRow) => {
                    const duAnId = tc.du_an_id ? String(tc.du_an_id) : null;
                    if (!duAnId || tc.loai_phieu !== 'Phiếu thu') return;
                    for (const [cid, pids] of customerIdToProjectIds) {
                        if (pids.includes(duAnId)) {
                            const f = financialsByCustomer.get(cid) || { tongHopDong: 0, giaTriQuyetToan: 0, daThu: 0, conPhaiThu: 0 };
                            f.daThu += Number(tc.so_tien) || 0;
                            financialsByCustomer.set(cid, f);
                            break;
                        }
                    }
                });

                financialsByCustomer.forEach((f) => {
                    f.conPhaiThu = f.giaTriQuyetToan - f.daThu;
                });

                setItems(
                    customers.map((c: Customer) => {
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
                            TongHopDong: calc?.tongHopDong ?? c.tong_hop_dong ?? 0,
                            GiaTriQuyetToan: calc?.giaTriQuyetToan ?? c.gia_tri_quyet_toan ?? 0,
                            DaThu: calc?.daThu ?? c.da_thu ?? 0,
                            ConPhaiThu: calc?.conPhaiThu ?? (calc ? calc.giaTriQuyetToan - calc.daThu : (c.con_phai_thu ?? 0)),
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
    }, []);

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
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

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

            <div className="max-w-7xl mx-auto space-y-6">
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
                        <div className="flex items-center gap-2 ml-auto">
                            <ExcelImportExportBar
                                columns={khachHangExcelColumns}
                                templateFileName="mau-khach-hang"
                                sheetName="Khach hang"
                                onImport={async (rows) => {
                                    const errors: string[] = [];
                                    let ok = 0;
                                    for (let i = 0; i < rows.length; i++) {
                                        const r = rows[i];
                                        const ten = (r.ten_don_vi || '').trim();
                                        if (!ten) {
                                            errors.push(`Dòng ${i + 2}: thiếu Tên đơn vị`);
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
                                            errors.push(`Dòng ${i + 2}: ${e?.message || 'Lỗi'}`);
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
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#f2f3ff] border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Khách hàng / Đơn vị</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">Mã số định danh</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider">SĐT liên hệ</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-center">Hợp đồng</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">Tổng giao dịch (VND)</th>
                                <th className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentItems.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
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
                                        <span className="text-sm font-bold px-2 py-1 bg-slate-100 rounded-lg">{/* số HĐ theo KH nếu có */}—</span>
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
                            ))}
                        </tbody>
                    </table>
                    <div className="px-6 py-4 bg-[#f2f3ff] border-t border-slate-200 flex justify-between items-center">
                        <p className="text-xs text-slate-600">Hiển thị {currentItems.length} trên tổng số {filteredItems.length} khách hàng</p>
                        <div className="flex gap-2">
                            <button className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-white disabled:opacity-30" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
                                <ChevronLeft size={14} />
                            </button>
                            <button className="w-8 h-8 flex items-center justify-center bg-[#004bcb] text-white rounded-lg text-xs font-bold shadow-sm">{currentPage}</button>
                            <button className="p-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-white" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
