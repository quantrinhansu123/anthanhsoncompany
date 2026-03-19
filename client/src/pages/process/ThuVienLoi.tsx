import React, { useState, useMemo, useEffect } from 'react';
import {
    Plus,
    Search,
    Filter,
    Download,
    Eye,
    Edit,
    Trash2,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    X,
    MoreHorizontal,
    CheckCircle2,
    AlertCircle,
    Info,
    ArrowUpDown,
    ChevronDown,
    ChevronUp
} from 'lucide-react';

// --- Types ---
interface ErrorRecord {
    id: string | number;
    stt: number;
    noiDungKiemTra: string;
    checklistId: string;
    chuyenNganh: string;
    boMon: string;
    hangMuc: string;
    hangMucKiemTra: string;
    dachGiaiKiemTra: string;
    cachKiemTraNhanh: string;
    tieuChuan: string;
    trongCham: number;
    mucDoQuanTrong: 'Thấp' | 'Trung bình' | 'Cao' | 'Nghiêm trọng';
    canhBaoLoi: 'Thấp' | 'Trung bình' | 'Vàng' | 'Đỏ' | 'Gấp';
    ghiChuKyThuat: string;
    hinhAnhMinhHoa: string;
}

import { thuVienLoiService } from '../../lib/services/thuVienLoiService';

// --- Sub-components ---
const MucDoBadge = ({ mucDo }: { mucDo: ErrorRecord['mucDoQuanTrong'] }) => {
    const styles = {
        'Thấp': 'bg-slate-100 text-slate-600',
        'Trung bình': 'bg-blue-100 text-blue-600',
        'Cao': 'bg-orange-100 text-orange-600',
        'Nghiêm trọng': 'bg-red-100 text-red-600'
    };
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${styles[mucDo] || styles['Thấp']}`}>
            {mucDo}
        </span>
    );
};

const CanhBaoBadge = ({ canhBao }: { canhBao: ErrorRecord['canhBaoLoi'] }) => {
    const styles = {
        'Thấp': 'bg-slate-100 text-slate-600',
        'Trung bình': 'bg-blue-100 text-blue-600',
        'Vàng': 'bg-amber-100 text-amber-700',
        'Đỏ': 'bg-red-100 text-red-600',
        'Gấp': 'bg-red-600 text-white'
    };
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${styles[canhBao] || styles['Thấp']}`}>
            {canhBao}
        </span>
    );
};

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    onClose: () => void;
}

const Toast = ({ message, type, onClose }: ToastProps) => {
    const icons = {
        success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
        error: <AlertCircle className="w-5 h-5 text-red-500" />,
        info: <Info className="w-5 h-5 text-blue-500" />
    };
    const bgColors = {
        success: 'bg-emerald-50 border-emerald-100',
        error: 'bg-red-50 border-red-100',
        info: 'bg-blue-50 border-blue-100'
    };
    React.useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`fixed top-4 right-4 z-[200] flex items-center gap-3 px-4 py-3 rounded-lg border shadow-xl animate-in fade-in slide-in-from-right-full duration-300 ${bgColors[type]}`}>
            {icons[type]}
            <p className="text-sm font-medium text-slate-800">{message}</p>
            <button onClick={onClose} className="ml-2 text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>
    );
};

// --- Main Page Component ---
export function ThuVienLoi() {
    const [items, setItems] = useState<ErrorRecord[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterChuyenNganh, setFilterChuyenNganh] = useState('Tất cả');
    const [filterMucDo, setFilterMucDo] = useState('Tất cả');
    // Filters dạng checkbox (multiple selection)
    const [filterTieuChuan, setFilterTieuChuan] = useState<string[]>([]);
    const [filterMucDoQuanTrong, setFilterMucDoQuanTrong] = useState<string[]>([]);
    const [filterCanhBaoLoi, setFilterCanhBaoLoi] = useState<string[]>([]);
    const [filterGhiChuKyThuat, setFilterGhiChuKyThuat] = useState<string[]>([]);
    
    // Dropdown open states
    const [isTieuChuanOpen, setIsTieuChuanOpen] = useState(false);
    const [isMucDoQuanTrongOpen, setIsMucDoQuanTrongOpen] = useState(false);
    const [isCanhBaoLoiOpen, setIsCanhBaoLoiOpen] = useState(false);
    const [isGhiChuKyThuatOpen, setIsGhiChuKyThuatOpen] = useState(false);
    
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
    const [selectedItem, setSelectedItem] = useState<ErrorRecord | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | number | null>(null);

    const [formData, setFormData] = useState<Omit<ErrorRecord, 'id' | 'stt'>>({
        noiDungKiemTra: '',
        checklistId: '',
        chuyenNganh: 'Hạ tầng',
        boMon: '',
        hangMuc: '',
        hangMucKiemTra: '',
        dachGiaiKiemTra: '',
        cachKiemTraNhanh: '',
        tieuChuan: '',
        trongCham: 0,
        mucDoQuanTrong: 'Trung bình',
        canhBaoLoi: 'Vàng',
        ghiChuKyThuat: '',
        hinhAnhMinhHoa: ''
    });

    // Load data from Supabase
    useEffect(() => {
        (async () => {
            try {
                console.log('Loading data from thu_vien_loi...');
                const rows = await thuVienLoiService.getAll();
                console.log('Data received from service:', rows);
                
                if (!rows || rows.length === 0) {
                    console.warn('No data found in thu_vien_loi table');
                    setItems([]);
                    return;
                }

                const mapped: ErrorRecord[] = rows
                    .filter(r => r && r.id && r.id !== '') // Lọc bỏ các record không có id hợp lệ
                    .map((r, index) => {
                        const mappedItem: ErrorRecord = {
                            id: r.id,
                            stt: r.stt ?? index + 1,
                            noiDungKiemTra: r.noi_dung_kiem_tra || '',
                            checklistId: r.checklist_id || '',
                            chuyenNganh: r.chuyen_nganh || 'Hạ tầng',
                            boMon: r.bo_mon || '',
                            hangMuc: r.hang_muc || '',
                            hangMucKiemTra: r.hang_muc_kiem_tra || '',
                            dachGiaiKiemTra: r.dien_giai_kiem_tra || '',
                            cachKiemTraNhanh: r.cach_kiem_tra_nhanh || '',
                            tieuChuan: r.tieu_chuan || '',
                            trongCham: r.trong_cham ?? 0,
                            mucDoQuanTrong: (r.muc_do_quan_trong as any) || 'Trung bình',
                            canhBaoLoi: (r.canh_bao_loi as any) || 'Vàng',
                            ghiChuKyThuat: r.ghi_chu_ky_thuat || '',
                            hinhAnhMinhHoa: r.hinh_anh_minh_hoa || '',
                        };
                        return mappedItem;
                    });
                
                console.log('Mapped data:', mapped);
                setItems(mapped);
            } catch (e) {
                console.error('Error loading thu_vien_loi data:', e);
                setToast({ message: 'Lỗi khi tải dữ liệu: ' + (e instanceof Error ? e.message : String(e)), type: 'error' });
            }
        })();
    }, []);

    // Lấy danh sách unique values cho các filter
    const uniqueTieuChuan = useMemo(() => {
        const values = items.map(i => i.tieuChuan).filter(v => v && v.trim() !== '');
        return Array.from(new Set(values)).sort();
    }, [items]);

    const uniqueMucDoQuanTrong = useMemo(() => {
        const values = items.map(i => i.mucDoQuanTrong).filter(v => v);
        return Array.from(new Set(values)).sort();
    }, [items]);

    const uniqueCanhBaoLoi = useMemo(() => {
        const values = items.map(i => i.canhBaoLoi).filter(v => v);
        return Array.from(new Set(values)).sort();
    }, [items]);

    const uniqueGhiChuKyThuat = useMemo(() => {
        const values = items.map(i => i.ghiChuKyThuat).filter(v => v && v.trim() !== '');
        return Array.from(new Set(values)).sort();
    }, [items]);

    // Đếm số lượng items cho mỗi option
    const getCountForTieuChuan = (value: string) => {
        return items.filter(item => item.tieuChuan === value).length;
    };

    const getCountForMucDoQuanTrong = (value: string) => {
        return items.filter(item => item.mucDoQuanTrong === value).length;
    };

    const getCountForCanhBaoLoi = (value: string) => {
        return items.filter(item => item.canhBaoLoi === value).length;
    };

    const getCountForGhiChuKyThuat = (value: string) => {
        return items.filter(item => item.ghiChuKyThuat === value).length;
    };

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const matchesSearch = item.noiDungKiemTra.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.checklistId.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesChuyenNganh = filterChuyenNganh === 'Tất cả' || item.chuyenNganh === filterChuyenNganh;
            const matchesMucDo = filterMucDo === 'Tất cả' || item.mucDoQuanTrong === filterMucDo;
            
            // Filters checkbox (multiple selection)
            const matchesTieuChuan = filterTieuChuan.length === 0 || filterTieuChuan.includes(item.tieuChuan);
            const matchesMucDoQuanTrong = filterMucDoQuanTrong.length === 0 || filterMucDoQuanTrong.includes(item.mucDoQuanTrong);
            const matchesCanhBaoLoi = filterCanhBaoLoi.length === 0 || filterCanhBaoLoi.includes(item.canhBaoLoi);
            const matchesGhiChuKyThuat = filterGhiChuKyThuat.length === 0 || filterGhiChuKyThuat.includes(item.ghiChuKyThuat);
            
            return matchesSearch && matchesChuyenNganh && matchesMucDo && 
                   matchesTieuChuan && matchesMucDoQuanTrong && matchesCanhBaoLoi && matchesGhiChuKyThuat;
        });
    }, [items, searchTerm, filterChuyenNganh, filterMucDo, filterTieuChuan, filterMucDoQuanTrong, filterCanhBaoLoi, filterGhiChuKyThuat]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (!target.closest('.dropdown-filter-container')) {
                setIsTieuChuanOpen(false);
                setIsMucDoQuanTrongOpen(false);
                setIsCanhBaoLoiOpen(false);
                setIsGhiChuKyThuatOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

    const handleAdd = () => {
        setModalMode('add');
        setFormData({
            noiDungKiemTra: '',
            checklistId: '',
            chuyenNganh: 'Hạ tầng',
            boMon: '',
            hangMuc: '',
            hangMucKiemTra: '',
            dachGiaiKiemTra: '',
            cachKiemTraNhanh: '',
            tieuChuan: '',
            trongCham: 0,
            mucDoQuanTrong: 'Trung bình',
            canhBaoLoi: 'Vàng',
            ghiChuKyThuat: '',
            hinhAnhMinhHoa: ''
        });
        setIsModalOpen(true);
    };

    const handleEdit = (item: ErrorRecord) => {
        setModalMode('edit');
        setSelectedItem(item);
        setFormData({ ...item });
        setIsModalOpen(true);
    };

    const handleView = (item: ErrorRecord) => {
        setModalMode('view');
        setSelectedItem(item);
        setFormData({ ...item });
        setIsModalOpen(true);
    };

    const handleDelete = (id: string | number) => {
        setItemToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (itemToDelete) {
            await thuVienLoiService.delete(String(itemToDelete));
            setItems(prev => prev.filter(i => i.id !== itemToDelete));
            setToast({ message: 'Đã xóa dữ liệu thành công', type: 'success' });
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
        }
    };

    const handleSave = async () => {
        if (modalMode === 'add') {
            const nextStt = items.length + 1;
            const created = await thuVienLoiService.create({
                id: '' as any, // ignored by insert
                stt: nextStt,
                noi_dung_kiem_tra: formData.noiDungKiemTra,
                checklist_id: formData.checklistId,
                chuyen_nganh: formData.chuyenNganh,
                bo_mon: formData.boMon,
                hang_muc: formData.hangMuc,
                hang_muc_kiem_tra: formData.hangMucKiemTra,
                dien_giai_kiem_tra: formData.dachGiaiKiemTra,
                cach_kiem_tra_nhanh: formData.cachKiemTraNhanh,
                tieu_chuan: formData.tieuChuan,
                trong_cham: formData.trongCham,
                muc_do_quan_trong: formData.mucDoQuanTrong,
                canh_bao_loi: formData.canhBaoLoi,
                ghi_chu_ky_thuat: formData.ghiChuKyThuat,
                hinh_anh_minh_hoa: formData.hinhAnhMinhHoa,
                created_at: undefined,
                updated_at: undefined,
            } as any);

            if (created) {
                const newRecord: ErrorRecord = {
                    id: created.id,
                    stt: created.stt ?? nextStt,
                    noiDungKiemTra: created.noi_dung_kiem_tra,
                    checklistId: created.checklist_id || '',
                    chuyenNganh: created.chuyen_nganh || 'Hạ tầng',
                    boMon: created.bo_mon || '',
                    hangMuc: created.hang_muc || '',
                    hangMucKiemTra: created.hang_muc_kiem_tra || '',
                    dachGiaiKiemTra: created.dien_giai_kiem_tra || '',
                    cachKiemTraNhanh: created.cach_kiem_tra_nhanh || '',
                    tieuChuan: created.tieu_chuan || '',
                    trongCham: created.trong_cham ?? 0,
                    mucDoQuanTrong: (created.muc_do_quan_trong as any) || 'Trung bình',
                    canhBaoLoi: (created.canh_bao_loi as any) || 'Vàng',
                    ghiChuKyThuat: created.ghi_chu_ky_thuat || '',
                    hinhAnhMinhHoa: created.hinh_anh_minh_hoa || '',
                };
                setItems(prev => [newRecord, ...prev]);
                setToast({ message: 'Thêm mới thành công', type: 'success' });
            }
        } else if (modalMode === 'edit' && selectedItem) {
            const updated = await thuVienLoiService.update(String(selectedItem.id), {
                noi_dung_kiem_tra: formData.noiDungKiemTra,
                checklist_id: formData.checklistId,
                chuyen_nganh: formData.chuyenNganh,
                bo_mon: formData.boMon,
                hang_muc: formData.hangMuc,
                hang_muc_kiem_tra: formData.hangMucKiemTra,
                dien_giai_kiem_tra: formData.dachGiaiKiemTra,
                cach_kiem_tra_nhanh: formData.cachKiemTraNhanh,
                tieu_chuan: formData.tieuChuan,
                trong_cham: formData.trongCham,
                muc_do_quan_trong: formData.mucDoQuanTrong,
                canh_bao_loi: formData.canhBaoLoi,
                ghi_chu_ky_thuat: formData.ghiChuKyThuat,
                hinh_anh_minh_hoa: formData.hinhAnhMinhHoa,
            });

            if (updated) {
                setItems(prev => prev.map(i => i.id === selectedItem.id ? {
                    ...i,
                    noiDungKiemTra: updated.noi_dung_kiem_tra,
                    checklistId: updated.checklist_id || '',
                    chuyenNganh: updated.chuyen_nganh || 'Hạ tầng',
                    boMon: updated.bo_mon || '',
                    hangMuc: updated.hang_muc || '',
                    hangMucKiemTra: updated.hang_muc_kiem_tra || '',
                    dachGiaiKiemTra: updated.dien_giai_kiem_tra || '',
                    cachKiemTraNhanh: updated.cach_kiem_tra_nhanh || '',
                    tieuChuan: updated.tieu_chuan || '',
                    trongCham: updated.trong_cham ?? 0,
                    mucDoQuanTrong: (updated.muc_do_quan_trong as any) || 'Trung bình',
                    canhBaoLoi: (updated.canh_bao_loi as any) || 'Vàng',
                    ghiChuKyThuat: updated.ghi_chu_ky_thuat || '',
                    hinhAnhMinhHoa: updated.hinh_anh_minh_hoa || '',
                } : i));
                setToast({ message: 'Cập nhật thành công', type: 'success' });
            }
        }
        setIsModalOpen(false);
    };

    const exportToCSV = () => {
        const headers = ["STT", "Nội dung kiểm tra", "Mã Checklist", "Chuyên ngành", "Bộ môn", "Hạng mục", "Diễn giải", "Trọng châm", "Mức độ", "Cảnh báo"];
        const rows = filteredItems.map(item => [
            item.stt,
            `"${item.noiDungKiemTra}"`,
            item.checklistId,
            item.chuyenNganh,
            item.boMon,
            `"${item.hangMuc}"`,
            `"${item.dachGiaiKiemTra}"`,
            item.trongCham,
            item.mucDoQuanTrong,
            item.canhBaoLoi
        ]);
        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers.join(",") + "\n" + rows.map(r => r.join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `thu_vien_loi_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setToast({ message: 'Đã xuất file thành công', type: 'success' });
    };

    return (
        <>
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Thư viện lỗi Checklist</h1>
                        <p className="text-sm text-slate-500">Quản lý các lỗi thường gặp và định nghĩa mức độ quan trọng</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={exportToCSV}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            <Download size={16} />
                            Xuất file
                        </button>
                        <button
                            onClick={handleAdd}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 active:scale-95"
                        >
                            <Plus size={18} />
                            Thêm lỗi mới
                        </button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Tìm theo nội dung, mã checklist..."
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-slate-400" />
                        <select
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                            value={filterChuyenNganh}
                            onChange={(e) => setFilterChuyenNganh(e.target.value)}
                        >
                            <option value="Tất cả">Chuyên ngành: Tất cả</option>
                            <option value="Hạ tầng">Hạ tầng</option>
                            <option value="Dân dụng">Dân dụng</option>
                            <option value="Giao thông">Giao thông</option>
                        </select>
                        <select
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                            value={filterMucDo}
                            onChange={(e) => setFilterMucDo(e.target.value)}
                        >
                            <option value="Tất cả">Mức độ: Tất cả</option>
                            <option value="Thấp">Thấp</option>
                            <option value="Trung bình">Trung bình</option>
                            <option value="Cao">Cao</option>
                            <option value="Nghiêm trọng">Nghiêm trọng</option>
                        </select>
                    </div>
                </div>

                {/* Dropdown Filters với Checkbox */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Tiêu chuẩn */}
                        <div className="relative dropdown-filter-container">
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Tiêu chuẩn</label>
                            <button
                                type="button"
                                onClick={() => setIsTieuChuanOpen(!isTieuChuanOpen)}
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white flex items-center justify-between hover:bg-slate-50"
                            >
                                <span className="text-slate-700">
                                    {filterTieuChuan.length > 0 ? `Đã chọn ${filterTieuChuan.length}` : 'Chọn tiêu chuẩn'}
                                </span>
                                {isTieuChuanOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            {isTieuChuanOpen && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                    <div className="p-2 space-y-1">
                                        {uniqueTieuChuan.map((value) => {
                                            const count = getCountForTieuChuan(value);
                                            const isChecked = filterTieuChuan.includes(value);
                                            return (
                                                <label key={value} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setFilterTieuChuan([...filterTieuChuan, value]);
                                                            } else {
                                                                setFilterTieuChuan(filterTieuChuan.filter(v => v !== value));
                                                            }
                                                            setCurrentPage(1);
                                                        }}
                                                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                                    />
                                                    <span className="text-xs text-slate-700 flex-1 truncate">{value}</span>
                                                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{count}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mức độ quan trọng */}
                        <div className="relative dropdown-filter-container">
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Mức độ quan trọng</label>
                            <button
                                type="button"
                                onClick={() => setIsMucDoQuanTrongOpen(!isMucDoQuanTrongOpen)}
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white flex items-center justify-between hover:bg-slate-50"
                            >
                                <span className="text-slate-700">
                                    {filterMucDoQuanTrong.length > 0 ? `Đã chọn ${filterMucDoQuanTrong.length}` : 'Chọn mức độ'}
                                </span>
                                {isMucDoQuanTrongOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            {isMucDoQuanTrongOpen && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                    <div className="p-2 space-y-1">
                                        {uniqueMucDoQuanTrong.map((value) => {
                                            const count = getCountForMucDoQuanTrong(value);
                                            const isChecked = filterMucDoQuanTrong.includes(value);
                                            return (
                                                <label key={value} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setFilterMucDoQuanTrong([...filterMucDoQuanTrong, value]);
                                                            } else {
                                                                setFilterMucDoQuanTrong(filterMucDoQuanTrong.filter(v => v !== value));
                                                            }
                                                            setCurrentPage(1);
                                                        }}
                                                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                                    />
                                                    <span className="text-xs text-slate-700 flex-1 truncate">{value}</span>
                                                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{count}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Cảnh báo lỗi */}
                        <div className="relative dropdown-filter-container">
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Cảnh báo lỗi</label>
                            <button
                                type="button"
                                onClick={() => setIsCanhBaoLoiOpen(!isCanhBaoLoiOpen)}
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white flex items-center justify-between hover:bg-slate-50"
                            >
                                <span className="text-slate-700">
                                    {filterCanhBaoLoi.length > 0 ? `Đã chọn ${filterCanhBaoLoi.length}` : 'Chọn cảnh báo'}
                                </span>
                                {isCanhBaoLoiOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            {isCanhBaoLoiOpen && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                    <div className="p-2 space-y-1">
                                        {uniqueCanhBaoLoi.map((value) => {
                                            const count = getCountForCanhBaoLoi(value);
                                            const isChecked = filterCanhBaoLoi.includes(value);
                                            return (
                                                <label key={value} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setFilterCanhBaoLoi([...filterCanhBaoLoi, value]);
                                                            } else {
                                                                setFilterCanhBaoLoi(filterCanhBaoLoi.filter(v => v !== value));
                                                            }
                                                            setCurrentPage(1);
                                                        }}
                                                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                                    />
                                                    <span className="text-xs text-slate-700 flex-1 truncate">{value}</span>
                                                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{count}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Ghi chú kỹ thuật */}
                        <div className="relative dropdown-filter-container">
                            <label className="block text-xs font-bold text-slate-600 uppercase mb-2">Ghi chú kỹ thuật</label>
                            <button
                                type="button"
                                onClick={() => setIsGhiChuKyThuatOpen(!isGhiChuKyThuatOpen)}
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white flex items-center justify-between hover:bg-slate-50"
                            >
                                <span className="text-slate-700">
                                    {filterGhiChuKyThuat.length > 0 ? `Đã chọn ${filterGhiChuKyThuat.length}` : 'Chọn ghi chú'}
                                </span>
                                {isGhiChuKyThuatOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            {isGhiChuKyThuatOpen && (
                                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                                    <div className="p-2 space-y-1">
                                        {uniqueGhiChuKyThuat.map((value) => {
                                            const count = getCountForGhiChuKyThuat(value);
                                            const isChecked = filterGhiChuKyThuat.includes(value);
                                            return (
                                                <label key={value} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setFilterGhiChuKyThuat([...filterGhiChuKyThuat, value]);
                                                            } else {
                                                                setFilterGhiChuKyThuat(filterGhiChuKyThuat.filter(v => v !== value));
                                                            }
                                                            setCurrentPage(1);
                                                        }}
                                                        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                                    />
                                                    <span className="text-xs text-slate-700 flex-1 truncate">{value}</span>
                                                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">{count}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Clear all filters button */}
                    {(filterTieuChuan.length > 0 || filterMucDoQuanTrong.length > 0 || filterCanhBaoLoi.length > 0 || filterGhiChuKyThuat.length > 0) && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                            <button
                                onClick={() => {
                                    setFilterTieuChuan([]);
                                    setFilterMucDoQuanTrong([]);
                                    setFilterCanhBaoLoi([]);
                                    setFilterGhiChuKyThuat([]);
                                    setCurrentPage(1);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
                            >
                                Xóa tất cả bộ lọc
                            </button>
                        </div>
                    )}
                </div>

                {/* Table Container */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1200px]">
                            <thead className="bg-slate-50/80 text-slate-600 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                                <tr>
                                    <th className="p-3 w-10 text-center">STT</th>
                                    <th className="p-3">Chuyên ngành</th>
                                    <th className="p-3">Bộ môn</th>
                                    <th className="p-3">Hạng mục kiểm tra</th>
                                    <th className="p-3 w-[250px]">Nội dung kiểm tra</th>
                                    <th className="p-3">Cách kiểm tra nhanh</th>
                                    <th className="p-3">Tiêu chuẩn</th>
                                    <th className="p-3">Mức độ quan trọng</th>
                                    <th className="p-3">Cảnh báo lỗi</th>
                                    <th className="p-3">Ghi chú kỹ thuật</th>
                                    <th className="p-3 text-center sticky right-0 bg-slate-50 z-20 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="p-10 text-center">
                                            <p className="text-slate-500 text-sm">Đang tải dữ liệu...</p>
                                        </td>
                                    </tr>
                                ) : currentItems.length > 0 ? (
                                    currentItems.map((item, index) => (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-blue-50/30 transition-colors group"
                                        >
                                            <td className="p-3 text-center text-slate-400 text-xs font-medium">{startIndex + index + 1}</td>
                                            <td className="p-3 text-xs text-slate-600 whitespace-nowrap">{item.chuyenNganh}</td>
                                            <td className="p-3 text-xs text-slate-600 whitespace-nowrap">{item.boMon}</td>
                                            <td className="p-3"><div className="text-xs text-slate-600 line-clamp-2">{item.hangMucKiemTra || item.hangMuc || '—'}</div></td>
                                            <td className="p-3"><div className="text-slate-700 text-xs leading-relaxed line-clamp-2">{item.noiDungKiemTra}</div></td>
                                            <td className="p-3"><div className="text-xs text-slate-600 line-clamp-2">{item.cachKiemTraNhanh || '—'}</div></td>
                                            <td className="p-3"><div className="text-xs text-slate-600 line-clamp-2">{item.tieuChuan || '—'}</div></td>
                                            <td className="p-3"><MucDoBadge mucDo={item.mucDoQuanTrong} /></td>
                                            <td className="p-3"><CanhBaoBadge canhBao={item.canhBaoLoi} /></td>
                                            <td className="p-3"><div className="text-xs text-slate-500 line-clamp-2">{item.ghiChuKyThuat || '—'}</div></td>
                                            <td className="p-3 text-center sticky right-0 bg-white group-hover:bg-[#f8faff] transition-colors z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)] border-l border-slate-100">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button onClick={() => handleView(item)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"><Eye size={16} /></button>
                                                    <button onClick={() => handleEdit(item)} className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-md transition-colors"><Edit size={16} /></button>
                                                    <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={11} className="p-10 text-center"><p className="text-slate-500 text-sm">Không tìm thấy kết quả phù hợp</p></td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between overflow-x-auto">
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                            <span>Hiện {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredItems.length)} của {filteredItems.length}</span>
                            <select
                                className="bg-white border rounded px-2 py-1"
                                value={itemsPerPage}
                                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-2 hover:bg-slate-200 rounded disabled:opacity-30"><ChevronsLeft size={16} /></button>
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 hover:bg-slate-200 rounded disabled:opacity-30"><ChevronLeft size={16} /></button>
                            <span className="px-4 text-sm font-bold">{currentPage} / {totalPages || 1}</span>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-2 hover:bg-slate-200 rounded disabled:opacity-30"><ChevronRight size={16} /></button>
                            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages} className="p-2 hover:bg-slate-200 rounded disabled:opacity-30"><ChevronsRight size={16} /></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals outside everything else */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">
                                {modalMode === 'add' ? 'Thêm lỗi Checklist mới' : modalMode === 'edit' ? 'Cập nhật thông tin lỗi' : 'Chi tiết lỗi Checklist'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[75vh]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nội dung kiểm tra</label>
                                    <textarea
                                        readOnly={modalMode === 'view'}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                        rows={3}
                                        value={formData.noiDungKiemTra}
                                        onChange={(e) => setFormData({ ...formData, noiDungKiemTra: e.target.value })}
                                        placeholder="Mô tả nội dung cần kiểm tra..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Mã Checklist</label>
                                    <input
                                        readOnly={modalMode === 'view'}
                                        type="text"
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                                        value={formData.checklistId}
                                        onChange={(e) => setFormData({ ...formData, checklistId: e.target.value })}
                                        placeholder="VD: HT-排水-01"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Chuyên ngành</label>
                                    <select
                                        disabled={modalMode === 'view'}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                        value={formData.chuyenNganh}
                                        onChange={(e) => setFormData({ ...formData, chuyenNganh: e.target.value })}
                                    >
                                        <option value="Hạ tầng">Hạ tầng</option>
                                        <option value="Dân dụng">Dân dụng</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Mức độ quan trọng</label>
                                    <select
                                        disabled={modalMode === 'view'}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                        value={formData.mucDoQuanTrong}
                                        onChange={(e) => setFormData({ ...formData, mucDoQuanTrong: e.target.value as any })}
                                    >
                                        <option value="Thấp">Thấp</option>
                                        <option value="Trung bình">Trung bình</option>
                                        <option value="Cao">Cao</option>
                                        <option value="Nghiêm trọng">Nghiêm trọng</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Cảnh báo lỗi</label>
                                    <select
                                        disabled={modalMode === 'view'}
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                        value={formData.canhBaoLoi}
                                        onChange={(e) => setFormData({ ...formData, canhBaoLoi: e.target.value as any })}
                                    >
                                        <option value="Thấp">Thấp</option>
                                        <option value="Trung bình">Trung bình</option>
                                        <option value="Vàng">Vàng</option>
                                        <option value="Đỏ">Đỏ</option>
                                        <option value="Gấp">Gấp</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors uppercase">
                                {modalMode === 'view' ? 'Đóng' : 'Hủy'}
                            </button>
                            {modalMode !== 'view' && (
                                <button
                                    onClick={handleSave}
                                    className="px-8 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-md shadow-blue-500/20 active:scale-95 uppercase"
                                >
                                    Lưu dữ liệu
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                                <Trash2 size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2 uppercase">Xác nhận xóa</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">Bạn có chắc chắn muốn xóa bản ghi lỗi này khỏi thư viện? Hành động này không thể hoàn tác.</p>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-center gap-3">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="px-6 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors uppercase">Hủy bỏ</button>
                            <button onClick={confirmDelete} className="px-6 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all shadow-sm uppercase">Đồng ý xóa</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
