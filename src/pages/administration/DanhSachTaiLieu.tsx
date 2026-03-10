import React, { useState, useMemo } from 'react';
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
    Pin,
    Grid3x3,
    ExternalLink
} from 'lucide-react';

interface TaiLieu {
    id: string;
    maTaiLieu: string;
    tenTaiLieu: string;
    huong: 'Nội bộ' | 'Văn bản đến' | 'Văn bản đi';
    loai: string;
    nhomTaiLieu: string;
    trangThai: 'Đã ký' | 'Đã gửi' | 'Chờ duyệt' | 'Đã duyệt';
    phongQuanLy: string;
    phanQuyen: string;
    soDen: string;
    soDi: string;
    ngayDen: string;
    ngayKy: string;
    link: string; // Link để lưu trữ file/tài liệu
}

const mockData: TaiLieu[] = [
    {
        id: '1',
        maTaiLieu: 'TL-2025-001',
        tenTaiLieu: 'Quyết định ban hành nội quy công ty',
        huong: 'Nội bộ',
        loai: 'Quyết định',
        nhomTaiLieu: '-',
        trangThai: 'Đã ký',
        phongQuanLy: 'Phòng Hành chính',
        phanQuyen: 'Chưa phân quyền',
        soDen: '-',
        soDi: '-',
        ngayDen: '-',
        ngayKy: '-',
        link: ''
    },
    {
        id: '2',
        maTaiLieu: 'TL-2025-002',
        tenTaiLieu: 'Công văn đề nghị cung cấp hồ sơ',
        huong: 'Văn bản đến',
        loai: 'Công văn',
        nhomTaiLieu: '-',
        trangThai: 'Đã ký',
        phongQuanLy: 'Phòng Hành chính',
        phanQuyen: 'Chưa phân quyền',
        soDen: '123/CV',
        soDi: '-',
        ngayDen: '10/01/2025',
        ngayKy: '-',
        link: ''
    }
];

export function DanhSachTaiLieu() {
    const [items, setItems] = useState<TaiLieu[]>(mockData);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterHuong, setFilterHuong] = useState('Tất cả');
    const [filterPhongQuanLy, setFilterPhongQuanLy] = useState('Tất cả');
    const [filterLoai, setFilterLoai] = useState('Tất cả');
    const [filterTrangThai, setFilterTrangThai] = useState('Tất cả');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewLinkModalOpen, setIsViewLinkModalOpen] = useState(false);
    const [viewingLink, setViewingLink] = useState('');
    const [selectedItems, setSelectedItems] = useState<string[]>([]);

    const [formData, setFormData] = useState<Omit<TaiLieu, 'id'>>({
        maTaiLieu: '',
        tenTaiLieu: '',
        huong: 'Nội bộ',
        loai: '',
        nhomTaiLieu: '',
        trangThai: 'Chờ duyệt',
        phongQuanLy: '',
        phanQuyen: 'Chưa phân quyền',
        soDen: '',
        soDi: '',
        ngayDen: '',
        ngayKy: '',
        link: ''
    });

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const matchesSearch = 
                item.maTaiLieu.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.tenTaiLieu.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.soDen.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.soDi.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesHuong = filterHuong === 'Tất cả' || item.huong === filterHuong;
            const matchesPhongQuanLy = filterPhongQuanLy === 'Tất cả' || item.phongQuanLy === filterPhongQuanLy;
            const matchesLoai = filterLoai === 'Tất cả' || item.loai === filterLoai;
            const matchesTrangThai = filterTrangThai === 'Tất cả' || item.trangThai === filterTrangThai;
            return matchesSearch && matchesHuong && matchesPhongQuanLy && matchesLoai && matchesTrangThai;
        });
    }, [items, searchTerm, filterHuong, filterPhongQuanLy, filterLoai, filterTrangThai]);

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

    const handleAdd = () => {
        setFormData({
            maTaiLieu: '',
            tenTaiLieu: '',
            huong: 'Nội bộ',
            loai: '',
            nhomTaiLieu: '',
            trangThai: 'Chờ duyệt',
            phongQuanLy: '',
            phanQuyen: 'Chưa phân quyền',
            soDen: '',
            soDi: '',
            ngayDen: '',
            ngayKy: '',
            link: ''
        });
        setIsModalOpen(true);
    };

    const handleViewLink = (link: string) => {
        if (link && link.trim() !== '') {
            setViewingLink(link);
            setIsViewLinkModalOpen(true);
        }
    };

    const handleOpenLink = (link: string) => {
        if (link && link.trim() !== '') {
            window.open(link, '_blank', 'noopener,noreferrer');
        }
    };

    const handleSave = () => {
        const newItem: TaiLieu = {
            id: Date.now().toString(),
            ...formData
        };
        setItems([...items, newItem]);
        setIsModalOpen(false);
    };

    const handleDelete = (id: string) => {
        if (confirm('Bạn có chắc chắn muốn xóa tài liệu này?')) {
            setItems(items.filter(item => item.id !== id));
        }
    };

    const getTrangThaiBadge = (trangThai: string) => {
        const styles: Record<string, string> = {
            'Đã ký': 'bg-green-100 text-green-700',
            'Đã gửi': 'bg-purple-100 text-purple-700',
            'Chờ duyệt': 'bg-orange-100 text-orange-700',
            'Đã duyệt': 'bg-blue-100 text-blue-700'
        };
        return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${styles[trangThai] || 'bg-slate-100 text-slate-700'}`}>
                {trangThai}
            </span>
        );
    };

    const getHuongBadge = (huong: string) => {
        const styles: Record<string, string> = {
            'Nội bộ': 'bg-slate-100 text-slate-700',
            'Văn bản đến': 'bg-blue-100 text-blue-700',
            'Văn bản đi': 'bg-purple-100 text-purple-700'
        };
        return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${styles[huong] || 'bg-slate-100 text-slate-700'}`}>
                {huong}
            </span>
        );
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Danh sách tài liệu</h1>
                    <p className="text-sm text-slate-500">Quản lý tài liệu, công văn, quyết định</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                        <Grid3x3 size={18} className="text-slate-600" />
                    </button>
                    <button
                        onClick={handleAdd}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 active:scale-95"
                    >
                        <Plus size={18} />
                        Thêm
                    </button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[300px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Tìm theo trích yếu, số đến, số đi..."
                            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-slate-400" />
                        <select
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                            value={filterHuong}
                            onChange={(e) => setFilterHuong(e.target.value)}
                        >
                            <option value="Tất cả">Hướng</option>
                            <option value="Nội bộ">Nội bộ</option>
                            <option value="Văn bản đến">Văn bản đến</option>
                            <option value="Văn bản đi">Văn bản đi</option>
                        </select>
                        <select
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                            value={filterPhongQuanLy}
                            onChange={(e) => setFilterPhongQuanLy(e.target.value)}
                        >
                            <option value="Tất cả">Phòng quản lý</option>
                            <option value="Phòng Hành chính">Phòng Hành chính</option>
                            <option value="Phòng Kỹ thuật">Phòng Kỹ thuật</option>
                            <option value="Phòng Tài chính - Kế toán">Phòng Tài chính - Kế toán</option>
                            <option value="Phòng Nhân sự">Phòng Nhân sự</option>
                        </select>
                        <select
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                            value={filterLoai}
                            onChange={(e) => setFilterLoai(e.target.value)}
                        >
                            <option value="Tất cả">Loại</option>
                            <option value="Quyết định">Quyết định</option>
                            <option value="Công văn">Công văn</option>
                            <option value="Báo cáo">Báo cáo</option>
                            <option value="Tờ trình">Tờ trình</option>
                            <option value="Biên bản">Biên bản</option>
                            <option value="Thông báo">Thông báo</option>
                        </select>
                        <select
                            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                            value={filterTrangThai}
                            onChange={(e) => setFilterTrangThai(e.target.value)}
                        >
                            <option value="Tất cả">Trạng thái</option>
                            <option value="Đã ký">Đã ký</option>
                            <option value="Đã gửi">Đã gửi</option>
                            <option value="Chờ duyệt">Chờ duyệt</option>
                            <option value="Đã duyệt">Đã duyệt</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1400px]">
                        <thead className="bg-slate-50/80 text-slate-600 font-bold text-[11px] uppercase tracking-wider border-b border-slate-200">
                            <tr>
                                <th className="p-3 w-10">
                                    <input type="checkbox" className="rounded" />
                                </th>
                                <th className="p-3">Mã - Tên tài liệu</th>
                                <th className="p-3">Hướng</th>
                                <th className="p-3">Loại</th>
                                <th className="p-3">Nhóm tài liệu</th>
                                <th className="p-3">Trạng thái</th>
                                <th className="p-3">Phòng quản lý</th>
                                <th className="p-3">Phân quyền</th>
                                <th className="p-3">Số đến</th>
                                <th className="p-3">Số đi</th>
                                <th className="p-3">Ngày đến</th>
                                <th className="p-3">Ngày ký</th>
                                <th className="p-3">Link</th>
                                <th className="p-3 text-center">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentItems.length > 0 ? (
                                currentItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="p-3">
                                            <input 
                                                type="checkbox" 
                                                className="rounded"
                                                checked={selectedItems.includes(item.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedItems([...selectedItems, item.id]);
                                                    } else {
                                                        setSelectedItems(selectedItems.filter(id => id !== item.id));
                                                    }
                                                }}
                                            />
                                        </td>
                                        <td className="p-3">
                                            <div className="text-sm font-medium text-slate-800">{item.maTaiLieu}</div>
                                            <div className="text-xs text-slate-600">{item.tenTaiLieu}</div>
                                        </td>
                                        <td className="p-3">{getHuongBadge(item.huong)}</td>
                                        <td className="p-3 text-xs text-slate-600">{item.loai}</td>
                                        <td className="p-3 text-xs text-slate-600">{item.nhomTaiLieu}</td>
                                        <td className="p-3">{getTrangThaiBadge(item.trangThai)}</td>
                                        <td className="p-3 text-xs text-slate-600">{item.phongQuanLy}</td>
                                        <td className="p-3 text-xs text-slate-500">{item.phanQuyen}</td>
                                        <td className="p-3 text-xs text-slate-600">{item.soDen}</td>
                                        <td className="p-3 text-xs text-slate-600">{item.soDi}</td>
                                        <td className="p-3 text-xs text-slate-600">{item.ngayDen}</td>
                                        <td className="p-3 text-xs text-slate-600">{item.ngayKy}</td>
                                        <td className="p-3">
                                            {item.link && item.link.trim() !== '' ? (
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        onClick={() => handleViewLink(item.link)}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                                                        title="Xem trong trình duyệt"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenLink(item.link)}
                                                        className="p-1.5 text-purple-600 hover:bg-purple-100 rounded-md transition-colors"
                                                        title="Mở trong tab mới"
                                                    >
                                                        <ExternalLink size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400">—</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-center">
                                            <div className="flex items-center justify-center gap-1.5">
                                                <button className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors">
                                                    <Pin size={16} />
                                                </button>
                                                <button className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-md transition-colors">
                                                    <Edit size={16} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={14} className="p-10 text-center">
                                        <p className="text-slate-500 text-sm">Không có dữ liệu</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span>{filteredItems.length} bản ghi - {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredItems.length)}</span>
                        <select
                            className="bg-white border rounded px-2 py-1 text-sm"
                            value={itemsPerPage}
                            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                        >
                            <option value={10}>10 / trang</option>
                            <option value={20}>20 / trang</option>
                            <option value={50}>50 / trang</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-2 hover:bg-slate-200 rounded disabled:opacity-30">
                            <ChevronsLeft size={16} />
                        </button>
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-2 hover:bg-slate-200 rounded disabled:opacity-30">
                            <ChevronLeft size={16} />
                        </button>
                        <span className="px-4 text-sm font-bold">{currentPage} / {totalPages || 1}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-2 hover:bg-slate-200 rounded disabled:opacity-30">
                            <ChevronRight size={16} />
                        </button>
                        <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages} className="p-2 hover:bg-slate-200 rounded disabled:opacity-30">
                            <ChevronsRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Add Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Thêm tài liệu mới</h2>
                            <button onClick={() => setIsModalOpen(false)} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[75vh]">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Mã tài liệu</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                        value={formData.maTaiLieu}
                                        onChange={(e) => setFormData({ ...formData, maTaiLieu: e.target.value })}
                                        placeholder="VD: TL-2025-001"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tên tài liệu</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                        value={formData.tenTaiLieu}
                                        onChange={(e) => setFormData({ ...formData, tenTaiLieu: e.target.value })}
                                        placeholder="Nhập tên tài liệu"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Hướng</label>
                                    <select
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                        value={formData.huong}
                                        onChange={(e) => setFormData({ ...formData, huong: e.target.value as any })}
                                    >
                                        <option value="Nội bộ">Nội bộ</option>
                                        <option value="Văn bản đến">Văn bản đến</option>
                                        <option value="Văn bản đi">Văn bản đi</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Loại</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                        value={formData.loai}
                                        onChange={(e) => setFormData({ ...formData, loai: e.target.value })}
                                        placeholder="VD: Quyết định, Công văn"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Nhóm tài liệu</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                        value={formData.nhomTaiLieu}
                                        onChange={(e) => setFormData({ ...formData, nhomTaiLieu: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Trạng thái</label>
                                    <select
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                        value={formData.trangThai}
                                        onChange={(e) => setFormData({ ...formData, trangThai: e.target.value as any })}
                                    >
                                        <option value="Chờ duyệt">Chờ duyệt</option>
                                        <option value="Đã duyệt">Đã duyệt</option>
                                        <option value="Đã ký">Đã ký</option>
                                        <option value="Đã gửi">Đã gửi</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Phòng quản lý</label>
                                    <select
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                        value={formData.phongQuanLy}
                                        onChange={(e) => setFormData({ ...formData, phongQuanLy: e.target.value })}
                                    >
                                        <option value="">Chọn phòng</option>
                                        <option value="Phòng Hành chính">Phòng Hành chính</option>
                                        <option value="Phòng Kỹ thuật">Phòng Kỹ thuật</option>
                                        <option value="Phòng Tài chính - Kế toán">Phòng Tài chính - Kế toán</option>
                                        <option value="Phòng Nhân sự">Phòng Nhân sự</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Phân quyền</label>
                                    <select
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                                        value={formData.phanQuyen}
                                        onChange={(e) => setFormData({ ...formData, phanQuyen: e.target.value })}
                                    >
                                        <option value="Chưa phân quyền">Chưa phân quyền</option>
                                        <option value="Đã phân quyền">Đã phân quyền</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Số đến</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                        value={formData.soDen}
                                        onChange={(e) => setFormData({ ...formData, soDen: e.target.value })}
                                        placeholder="VD: 123/CV"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Số đi</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                        value={formData.soDi}
                                        onChange={(e) => setFormData({ ...formData, soDi: e.target.value })}
                                        placeholder="VD: 45/CV-UB"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Ngày đến</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                        value={formData.ngayDen}
                                        onChange={(e) => setFormData({ ...formData, ngayDen: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Ngày ký</label>
                                    <input
                                        type="date"
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                        value={formData.ngayKy}
                                        onChange={(e) => setFormData({ ...formData, ngayKy: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Link tài liệu</label>
                                    <input
                                        type="url"
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                                        value={formData.link}
                                        onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                                        placeholder="https://example.com/document.pdf hoặc link Google Drive, OneDrive..."
                                    />
                                    <p className="text-xs text-slate-400 mt-1.5">Nhập URL để lưu trữ file/tài liệu (PDF, Word, Excel, Google Drive, OneDrive...)</p>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                            <button 
                                onClick={() => setIsModalOpen(false)} 
                                className="px-6 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors uppercase"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-8 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-md shadow-blue-500/20 active:scale-95 uppercase"
                            >
                                Lưu
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Link Modal - Hiển thị nội dung link trong iframe */}
            {isViewLinkModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
                        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Eye className="text-blue-600" size={20} />
                                <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Xem tài liệu</h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleOpenLink(viewingLink)}
                                    className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
                                >
                                    <ExternalLink size={16} />
                                    Mở trong tab mới
                                </button>
                                <button 
                                    onClick={() => setIsViewLinkModalOpen(false)} 
                                    className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            {viewingLink ? (
                                <iframe
                                    src={viewingLink}
                                    className="w-full h-full border-0"
                                    title="Document Viewer"
                                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <p className="text-slate-500">Không có link để hiển thị</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
