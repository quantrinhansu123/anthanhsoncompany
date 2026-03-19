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
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="bg-white rounded-md border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                    <h1 className="text-[16px] font-bold text-slate-700 uppercase">Danh sách khách hàng</h1>
                </div>

                <div className="px-6 py-4 flex justify-between items-center border-b border-slate-200 bg-white">
                    <div className="relative w-full max-w-[400px]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-md text-sm"
                            placeholder="Tìm theo mã, tên, SĐT..."
                        />
                    </div>

                    <button
                        onClick={handleAddClick}
                        className="btn-primary flex items-center gap-2 px-4 py-2 bg-[#9333EA] hover:bg-purple-700 text-white text-sm font-medium rounded-md shadow-sm"
                    >
                        <Plus size={16} />
                        Thêm khách hàng
                    </button>
                </div>

                <div className="w-full overflow-x-auto bg-white">
                    <table className="w-full text-sm text-left">
                        <thead className="text-slate-700 font-semibold border-b border-slate-200 bg-white">
                            <tr>
                                <th className="p-4 py-4 w-12 text-center">
                                    <input type="checkbox" className="rounded border-slate-300 w-4 h-4 text-purple-600" />
                                </th>
                                <th className="p-4 py-4 min-w-[250px]">Tên đơn vị</th>
                                <th className="p-4 py-4">SĐT liên hệ</th>
                                <th className="p-4 py-4">Tổng hợp đồng</th>
                                <th className="p-4 py-4 text-center">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {currentItems.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="p-4 text-center">
                                        <input type="checkbox" className="rounded border-slate-300 w-4 h-4 text-purple-600" />
                                    </td>
                                    <td className="p-4">
                                        <span className="font-semibold text-slate-800">{item.Ten_Don_Vi || "(Trống)"}</span>
                                    </td>
                                    <td className="p-4 text-slate-600">{item.SDT_Lien_He || "(Trống)"}</td>
                                    <td className="p-4 font-medium text-slate-700">{formatCurrency(item.TongHopDong ?? 0)}</td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                className="action-btn p-1.5 text-purple-600 bg-purple-50 border border-purple-100 rounded-md hover:bg-purple-100"
                                                title="Xem chi tiết"
                                                onClick={() => openChiTietKhachHang(item)}
                                            >
                                                <Eye size={14} />
                                            </button>
                                            <button
                                                className="action-btn p-1.5 text-orange-500 bg-orange-50 border border-orange-100 rounded-md hover:bg-orange-100"
                                                title="Sửa"
                                                onClick={() => handleEditClick(item)}
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                className="action-btn p-1.5 text-red-500 bg-red-50 border border-red-100 rounded-md hover:bg-red-100"
                                                title="Xóa"
                                                onClick={() => handleDeleteClick(item)}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-4 flex items-center justify-between border-t border-slate-200 text-sm text-slate-600 bg-white">
                    <span>Hiển thị {currentItems.length} trên {filteredItems.length} khách hàng</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-50"><ChevronLeft size={16} /></button>
                        <span>Trang {currentPage} / {totalPages || 1}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-1.5 hover:bg-slate-100 rounded disabled:opacity-50"><ChevronRight size={16} /></button>
                    </div>
                </div>
            </div>


        </div>
    );
}
