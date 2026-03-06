import React, { useState, useEffect } from 'react';
import {
    Search,
    Plus,
    Edit,
    Trash2,
    Eye,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    CheckSquare,
    Square,
    Loader2,
    ArrowLeft,
    CheckCircle2,
    Info,
    AlertCircle,
    X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

    return (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg animate-in slide-in-from-right-full duration-300 ${bgColors[type]}`}>
            {icons[type]}
            <p className="text-sm font-medium text-slate-800">{message}</p>
            <button onClick={onClose} className="ml-2 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={16} />
            </button>
        </div>
    );
};

export function ThuChi() {
    const navigate = useNavigate();
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [itemIdToDelete, setItemIdToDelete] = useState<string | number | null>(null);

    const [formData, setFormData] = useState({
        loaiPhieu: 'Phiếu thu',
        contractId: '',
        tinhTrangPhieu: 'Tạm ứng',
        ngayTienVe: new Date().toISOString().split('T')[0],
        soTien: 0,
        noiDung: '',
        person: 'Ngân hàng / Đối tác'
    });

    // Load data from localStorage
    useEffect(() => {
        const loadRecords = () => {
            const data = JSON.parse(localStorage.getItem('thu_chi_records') || '[]');
            setItems(data);
        };
        loadRecords();
    }, []);

    const handleDelete = (id: string | number) => {
        setItemIdToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (itemIdToDelete) {
            const data = JSON.parse(localStorage.getItem('thu_chi_records') || '[]');
            const updated = data.filter((item: any) => item.id !== itemIdToDelete);
            localStorage.setItem('thu_chi_records', JSON.stringify(updated));
            setItems(updated);
            setToast({ message: 'Xóa phiếu thành công!', type: 'success' });
            setIsDeleteModalOpen(false);
            setItemIdToDelete(null);
        }
    };

    const handleAddClick = () => {
        setModalMode('add');
        setFormData({
            loaiPhieu: 'Phiếu thu',
            contractId: '',
            tinhTrangPhieu: 'Tạm ứng',
            ngayTienVe: new Date().toISOString().split('T')[0],
            soTien: 0,
            noiDung: '',
            person: 'Ngân hàng / Đối tác'
        });
        setIsModalOpen(true);
    };

    const handleEditClick = (item: any) => {
        setModalMode('edit');
        setSelectedItem(item);
        const amountStr = String(item.amount).replace(/[^0-9]/g, '');
        const amount = parseInt(amountStr) || 0;

        setFormData({
            loaiPhieu: item.type,
            contractId: item.code || '',
            tinhTrangPhieu: 'Thanh toán',
            ngayTienVe: item.date ? item.date.split('/').reverse().join('-') : new Date().toISOString().split('T')[0],
            soTien: amount,
            noiDung: item.description || '',
            person: item.person || 'Ngân hàng / Đối tác'
        });
        setIsModalOpen(true);
    };

    const handleViewClick = (item: any) => {
        setSelectedItem(item);
        setIsViewModalOpen(true);
    };

    const handleSave = () => {
        const newRecord = {
            id: modalMode === 'edit' ? selectedItem.id : Date.now(),
            code: modalMode === 'edit' ? formData.contractId : `TC-${Math.floor(1000 + Math.random() * 9000)}`,
            date: new Date(formData.ngayTienVe).toLocaleDateString('vi-VN'),
            type: formData.loaiPhieu,
            amount: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(formData.soTien),
            description: formData.noiDung,
            person: formData.person
        };

        const existingData = JSON.parse(localStorage.getItem('thu_chi_records') || '[]');
        let updatedData;
        if (modalMode === 'edit') {
            updatedData = existingData.map((item: any) => item.id === selectedItem.id ? newRecord : item);
        } else {
            updatedData = [newRecord, ...existingData];
        }

        localStorage.setItem('thu_chi_records', JSON.stringify(updatedData));
        setItems(updatedData);
        setToast({ message: modalMode === 'edit' ? 'Cập nhật thành công!' : 'Thêm phiếu thành công!', type: 'success' });
        setIsModalOpen(false);
    };

    const toggleSelect = (id: string | number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const isSelected = (id: string | number) => selectedIds.includes(id);

    const isAllSelected = items.length > 0 && items.every(item => selectedIds.includes(item.id));

    const toggleSelectAll = () => {
        setSelectedIds(isAllSelected ? [] : items.map(item => item.id));
    };

    const filteredItems = searchTerm
        ? items.filter(item =>
            item.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        : items;

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

    return (
        <>
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Header */}
                    <div className="px-4 md:px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/tai-chinh')}
                                className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                <ArrowLeft size={20} className="text-slate-600" />
                            </button>
                            <h2 className="text-lg font-bold text-slate-700 uppercase">
                                Quản lý Thu chi
                            </h2>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="px-4 md:px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                        <div className="relative w-full md:w-80">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Tìm theo mã chứng từ, nội dung..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                        </div>

                        <button
                            onClick={handleAddClick}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm ripple"
                        >
                            <Plus size={18} />
                            Thêm phiếu
                        </button>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="p-8 text-center border-b border-slate-100">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">Đang tải dữ liệu...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {error && !loading && (
                        <div className="p-8 text-center border-b border-slate-100">
                            <p className="text-sm text-red-600 mb-4">{error}</p>
                            <button
                                onClick={() => { }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                Thử lại
                            </button>
                        </div>
                    )}

                    {/* Table */}
                    {!loading && !error && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="p-4 w-10">
                                            <button onClick={toggleSelectAll} className="flex items-center">
                                                {isAllSelected ? (
                                                    <CheckSquare size={18} className="text-blue-600" />
                                                ) : (
                                                    <Square size={18} className="text-slate-400" />
                                                )}
                                            </button>
                                        </th>
                                        <th className="p-4 whitespace-nowrap">Mã chứng từ</th>
                                        <th className="p-4 whitespace-nowrap">Ngày chứng từ</th>
                                        <th className="p-4 whitespace-nowrap">Loại</th>
                                        <th className="p-4 whitespace-nowrap text-right pr-6">Số tiền</th>
                                        <th className="p-4 whitespace-nowrap">Nội dung</th>
                                        <th className="p-4 whitespace-nowrap">Người nộp/nhận</th>
                                        <th className="p-4 whitespace-nowrap text-center">Hành động</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {currentItems.length > 0 ? (
                                        currentItems.map((item) => (
                                            <tr
                                                key={item.id}
                                                className="hover:bg-slate-50 transition-colors group"
                                            >
                                                <td className="p-4">
                                                    <button onClick={() => toggleSelect(item.id)} className="flex items-center">
                                                        {isSelected(item.id) ? (
                                                            <CheckSquare size={18} className="text-blue-600" />
                                                        ) : (
                                                            <Square size={18} className="text-slate-400" />
                                                        )}
                                                    </button>
                                                </td>
                                                <td className="p-4 font-medium text-slate-700">
                                                    {item.code || '(Trống)'}
                                                </td>
                                                <td className="p-4 font-medium text-slate-800">
                                                    {item.date || '(Trống)'}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${item.type === 'Phiếu thu' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                                        }`}>
                                                        {item.type || 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-slate-900 font-bold text-right pr-6">
                                                    {item.amount || '0'}
                                                </td>
                                                <td className="p-4 text-slate-600">
                                                    {item.description || '(Trống)'}
                                                </td>
                                                <td className="p-4 text-slate-600">
                                                    {item.person || '(Trống)'}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center justify-center gap-1.5 transition-opacity">
                                                        <button
                                                            onClick={() => handleViewClick(item)}
                                                            className="action-btn p-1.5 text-purple-600 border border-purple-100 bg-purple-50 rounded-md hover:bg-purple-100 transition-colors"
                                                            title="Xem"
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleEditClick(item)}
                                                            className="action-btn p-1.5 text-orange-500 border border-orange-100 bg-orange-50 rounded-md hover:bg-orange-100 transition-colors"
                                                            title="Sửa"
                                                        >
                                                            <Edit size={14} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(item.id)}
                                                            className="action-btn p-1.5 text-red-500 border border-red-100 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
                                                            title="Xóa"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={8} className="p-8 text-center text-slate-500">
                                                <div className="flex flex-col items-center gap-2">
                                                    <p className="text-sm font-medium">Không có dữ liệu thu chi</p>
                                                    <p className="text-xs text-slate-400">Vui lòng thêm phiếu thu chi mới</p>
                                                    <button
                                                        onClick={handleAddClick}
                                                        className="mt-4 px-6 py-2 text-sm font-bold bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all shadow-sm ripple"
                                                    >
                                                        Thêm phiếu đầu tiên
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {!loading && !error && (
                        <div className="px-4 md:px-6 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <span className="font-semibold">{filteredItems.length}</span> bản ghi
                                <div className="h-4 w-px bg-slate-300 mx-2"></div>
                                <select
                                    className="bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                                    defaultValue={itemsPerPage}
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                                <span>/ trang</span>
                            </div>

                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    className="p-1.5 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronsLeft size={16} />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className="p-1.5 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="px-3 py-1 text-sm text-slate-600">
                                    Trang {currentPage} / {totalPages || 1}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage >= totalPages}
                                    className="p-1.5 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight size={16} />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage >= totalPages}
                                    className="p-1.5 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronsRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals outside main wrapper - prevent clipping from transforms/overflow */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white">
                            <h2 className="text-lg font-bold text-slate-800 uppercase">
                                {modalMode === 'edit' ? 'Chỉnh sửa phiếu' : 'Thêm phiếu mới'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Loại phiếu</label>
                                    <select
                                        value={formData.loaiPhieu}
                                        onChange={(e) => setFormData({ ...formData, loaiPhieu: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                    >
                                        <option value="Phiếu thu">Phiếu thu</option>
                                        <option value="Phiếu chi">Phiếu chi</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã hợp đồng / Công trình</label>
                                    <input
                                        type="text"
                                        value={formData.contractId}
                                        onChange={(e) => setFormData({ ...formData, contractId: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        placeholder="Ví dụ: TC-1234..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ngày chứng từ</label>
                                    <input
                                        type="date"
                                        value={formData.ngayTienVe}
                                        onChange={(e) => setFormData({ ...formData, ngayTienVe: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Số tiền</label>
                                    <input
                                        type="number"
                                        value={formData.soTien}
                                        onChange={(e) => setFormData({ ...formData, soTien: Number(e.target.value) })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Người nộp/nhận</label>
                                    <input
                                        type="text"
                                        value={formData.person}
                                        onChange={(e) => setFormData({ ...formData, person: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        placeholder="Ngân hàng / Đối tác / Cá nhân..."
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nội dung</label>
                                    <textarea
                                        value={formData.noiDung}
                                        onChange={(e) => setFormData({ ...formData, noiDung: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        placeholder="Mô tả nội dung thu chi..."
                                        rows={3}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Hủy</button>
                            <button onClick={handleSave} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-md">Lưu phiếu</button>
                        </div>
                    </div>
                </div>
            )}

            {isViewModalOpen && selectedItem && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white">
                            <h2 className="text-lg font-bold text-slate-800 uppercase">Chi tiết chứng từ</h2>
                            <button onClick={() => setIsViewModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-y-4 text-sm">
                                <div className="text-slate-500">Mã chứng từ:</div>
                                <div className="font-bold text-slate-800">{selectedItem.code}</div>

                                <div className="text-slate-500">Ngày lập:</div>
                                <div className="text-slate-800 font-medium">{selectedItem.date}</div>

                                <div className="text-slate-500">Loại phiếu:</div>
                                <div>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${selectedItem.type === 'Phiếu thu' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                        {selectedItem.type}
                                    </span>
                                </div>

                                <div className="text-slate-500">Số tiền:</div>
                                <div className="text-emerald-600 font-bold text-lg">{selectedItem.amount}</div>

                                <div className="text-slate-500">Nội dung:</div>
                                <div className="text-slate-700 leading-relaxed italic border-l-2 border-slate-100 pl-3">{selectedItem.description || '(Không có nội dung)'}</div>

                                <div className="text-slate-500">Người nộp/nhận:</div>
                                <div className="text-slate-800 font-medium">{selectedItem.person}</div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                            <button onClick={() => setIsViewModalOpen(false)} className="px-6 py-2 text-sm font-bold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors shadow-sm uppercase">Đóng</button>
                        </div>
                    </div>
                </div>
            )}

            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
                                <Trash2 size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2 uppercase">Xác nhận xóa phiếu</h3>
                            <p className="text-sm text-slate-500 leading-relaxed">Bạn có chắc chắn muốn xóa chứng từ này không? Hành động này không thể hoàn tác.</p>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-center gap-3">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="px-6 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors uppercase">Hủy</button>
                            <button onClick={confirmDelete} className="px-6 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm uppercase">Xóa ngay</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
