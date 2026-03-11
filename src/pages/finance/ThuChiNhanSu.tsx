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
    X,
    Filter
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { thuChiService, ThuChiRow } from '../../lib/services/thuChiService';
import { employeeService } from '../../lib/services/employeeService';

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

export function ThuChiNhanSu() {
    const navigate = useNavigate();
    const [items, setItems] = useState<ThuChiRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [filterNhanSuId, setFilterNhanSuId] = useState<string | null>(null);
    const [employees, setEmployees] = useState<Array<{ id: string; full_name: string; code: string }>>([]);
    const itemsPerPage = 10;
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    // Modal states
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<ThuChiRow | null>(null);
    const [itemIdToDelete, setItemIdToDelete] = useState<string | number | null>(null);

    // Load employees
    useEffect(() => {
        (async () => {
            try {
                const employeeList = await employeeService.getAll();
                setEmployees(employeeList.map(emp => ({
                    id: emp.id.toString(),
                    full_name: emp.full_name || emp.name || emp.hoTen || '',
                    code: emp.code || ''
                })));
            } catch (error) {
                console.error('Error loading employees:', error);
            }
        })();
    }, []);

    // Load data from database
    useEffect(() => {
        loadRecords();
    }, [filterNhanSuId]);

    const loadRecords = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await thuChiService.getAll();
            
            // Filter theo nhân sự nếu có
            let filteredData = data;
            if (filterNhanSuId) {
                filteredData = data.filter(item => item.nhan_su_id === filterNhanSuId);
            }
            
            // Map data để hiển thị
            const mappedData = filteredData.map(item => ({
                ...item,
                code: item.id.substring(0, 8).toUpperCase(), // Mã chứng từ từ ID
                date: item.ngay ? new Date(item.ngay).toLocaleDateString('vi-VN') : '',
                dateTime: item.created_at ? new Date(item.created_at).toLocaleString('vi-VN') : '', // Ngày giờ ghi nhận
                type: item.loai_phieu,
                amount: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.so_tien),
                description: item.noi_dung || '',
                person: item.nguoi_nhan || 'Ngân hàng / Đối tác',
                ten_du_an: item.ten_du_an || '(Chưa có dự án)',
                nhan_su_display: item.nhan_su_ten ? (item.nhan_su_code ? `[${item.nhan_su_code}] ${item.nhan_su_ten}` : item.nhan_su_ten) : null
            }));
            setItems(mappedData);
        } catch (err: any) {
            setError(err.message || 'Có lỗi xảy ra khi tải dữ liệu');
            console.error('Error loading thu chi nhan su:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id: string | number) => {
        setItemIdToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (itemIdToDelete) {
            try {
                const success = await thuChiService.delete(String(itemIdToDelete));
                if (success) {
                    setToast({ message: 'Xóa phiếu thành công!', type: 'success' });
                    loadRecords();
                } else {
                    setToast({ message: 'Xóa phiếu thất bại!', type: 'error' });
                }
            } catch (err: any) {
                setToast({ message: err.message || 'Xóa phiếu thất bại!', type: 'error' });
            }
            setIsDeleteModalOpen(false);
            setItemIdToDelete(null);
        }
    };

    const handleAddClick = () => {
        navigate('/tai-chinh/thu-chi/them');
    };

    const handleEditClick = (item: ThuChiRow) => {
        navigate(`/tai-chinh/thu-chi/them/${item.id}`);
    };

    const handleViewClick = (item: any) => {
        setSelectedItem(item);
        setIsViewModalOpen(true);
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
            item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.nhan_su_display?.toLowerCase().includes(searchTerm.toLowerCase())
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
                                Quản lý Thu chi nhân sự
                            </h2>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="px-4 md:px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                        <div className="flex flex-col md:flex-row gap-4 flex-1">
                            <div className="relative w-full md:w-80">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm theo mã chứng từ, nội dung, nhân sự..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                            </div>
                            
                            <div className="relative w-full md:w-64">
                                <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <select
                                    value={filterNhanSuId || ''}
                                    onChange={(e) => setFilterNhanSuId(e.target.value || null)}
                                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-white"
                                >
                                    <option value="">Tất cả nhân sự</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.code ? `[${emp.code}] ` : ''}{emp.full_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
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
                                onClick={() => loadRecords()}
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
                                        <th className="p-4 whitespace-nowrap">Dự án</th>
                                        <th className="p-4 whitespace-nowrap">Ngày chứng từ</th>
                                        <th className="p-4 whitespace-nowrap">Loại</th>
                                        <th className="p-4 whitespace-nowrap text-right pr-6">Số tiền</th>
                                        <th className="p-4 whitespace-nowrap">Nội dung</th>
                                        <th className="p-4 whitespace-nowrap">Người nộp/nhận</th>
                                        <th className="p-4 whitespace-nowrap">Nhân sự</th>
                                        <th className="p-4 whitespace-nowrap">Ảnh</th>
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
                                                <td className="p-4 text-slate-600">
                                                    {item.ten_du_an || '(Chưa có dự án)'}
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
                                                <td className="p-4 text-slate-600 text-sm font-medium">
                                                    {item.nhan_su_display || '(Trống)'}
                                                </td>
                                                <td className="p-4">
                                                    {item.anh_url ? (
                                                        <img 
                                                            src={item.anh_url} 
                                                            alt="Chứng từ" 
                                                            className="w-12 h-12 object-cover rounded border border-slate-200 cursor-pointer hover:opacity-80"
                                                            onClick={() => {
                                                                setSelectedItem(item);
                                                                setIsViewModalOpen(true);
                                                            }}
                                                        />
                                                    ) : (
                                                        <span className="text-xs text-slate-400">—</span>
                                                    )}
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
                                            <td colSpan={11} className="p-8 text-center text-slate-500">
                                                <div className="flex flex-col items-center gap-2">
                                                    <p className="text-sm font-medium">Không có dữ liệu thu chi nhân sự</p>
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

                                <div className="text-slate-500">Ngày giờ ghi nhận:</div>
                                <div className="text-slate-600 text-xs">{selectedItem.dateTime || selectedItem.created_at ? new Date(selectedItem.created_at || '').toLocaleString('vi-VN') : '(Trống)'}</div>

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

                                <div className="text-slate-500">Nhân sự:</div>
                                <div className="text-slate-800 font-medium">{selectedItem.nhan_su_display || '(Trống)'}</div>
                            </div>

                            {/* Hiển thị ảnh chứng từ */}
                            {selectedItem.anh_url && (
                                <div className="mt-4 pt-4 border-t border-slate-200">
                                    <div className="text-slate-500 text-sm mb-2">Ảnh chứng từ:</div>
                                    <div className="flex justify-center">
                                        <img 
                                            src={selectedItem.anh_url} 
                                            alt="Chứng từ" 
                                            className="w-64 h-64 object-cover rounded-lg border border-slate-200 shadow-sm"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
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
