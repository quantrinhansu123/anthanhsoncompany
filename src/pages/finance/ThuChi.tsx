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
    Filter,
    Bookmark,
    Briefcase,
    ChevronDown,
    Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { thuChiService, ThuChiRow } from '../../lib/services/thuChiService';
import { projectService } from '../../lib/services/projectService';
import { contractService } from '../../lib/services/contractService';
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

export function ThuChi() {
    const navigate = useNavigate();
    const [items, setItems] = useState<ThuChiRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [activeTab, setActiveTab] = useState<'thu' | 'chi'>('thu'); // Tab mặc định: Phiếu thu
    const [projects, setProjects] = useState<Array<{ id: string; ten_du_an: string }>>([]);
    const [contracts, setContracts] = useState<Array<{ id: string; so_hop_dong: string | null; du_an_id: string | null }>>([]);
    const [employees, setEmployees] = useState<Array<{ id: string; full_name: string; code: string }>>([]);
    
    // Filter states - sử dụng mảng để có thể chọn nhiều
    const [selectedDuAnIds, setSelectedDuAnIds] = useState<string[]>([]);
    const [selectedHopDongIds, setSelectedHopDongIds] = useState<string[]>([]);
    const [selectedNhanSuIds, setSelectedNhanSuIds] = useState<string[]>([]);
    
    // Date filter states
    const [dateFrom, setDateFrom] = useState<string>('');
    const [dateTo, setDateTo] = useState<string>('');
    const [quickDateFilter, setQuickDateFilter] = useState<string>('');
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    
    // Column filter dropdown states
    const [openColumnFilter, setOpenColumnFilter] = useState<string | null>(null);
    
    const itemsPerPage = 10;
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [selectedItem, setSelectedItem] = useState<ThuChiRow | null>(null);
    const [itemIdToDelete, setItemIdToDelete] = useState<string | number | null>(null);

    const [formData, setFormData] = useState({
        duAnId: '',
        hopDongId: '',
        loaiPhieu: 'Phiếu thu',
        tinhTrangPhieu: 'Tạm ứng',
        ngayTienVe: new Date().toISOString().split('T')[0],
        soTien: 0,
        noiDung: '',
        nguoiNhan: 'Ngân hàng / Đối tác'
    });

    // Load projects, contracts, employees
    useEffect(() => {
        (async () => {
            try {
                const projectList = await projectService.getAll();
                setProjects(projectList.map(p => ({ id: p.id, ten_du_an: p.ten_du_an })));
                
                const contractList = await contractService.getAll();
                setContracts(contractList.map(c => ({ 
                    id: c.id, 
                    so_hop_dong: c.so_hop_dong, 
                    du_an_id: c.du_an_id || null 
                })));
                
                const employeeList = await employeeService.getAll();
                setEmployees(employeeList.map(emp => ({
                    id: emp.id.toString(),
                    full_name: emp.full_name || emp.name || emp.hoTen || '',
                    code: emp.code || ''
                })));
            } catch (error) {
                console.error('Error loading filter data:', error);
            }
        })();
    }, []);

    // Load data from database
    useEffect(() => {
        loadRecords();
    }, [selectedDuAnIds, selectedHopDongIds, selectedNhanSuIds, dateFrom, dateTo, quickDateFilter, selectedMonth]);

    const loadRecords = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await thuChiService.getAll();
            
            // Map data để hiển thị
            const mappedData = data.map(item => ({
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
            console.error('Error loading thu chi:', err);
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

    const handleSave = async () => {
        try {
            const payload: Partial<ThuChiRow> = {
                du_an_id: formData.duAnId || null,
                hop_dong_id: formData.hopDongId || null,
                loai_phieu: formData.loaiPhieu,
                so_tien: formData.soTien,
                ngay: formData.ngayTienVe,
                noi_dung: formData.noiDung || null,
                tinh_trang_phieu: formData.tinhTrangPhieu || null,
                nguoi_nhan: formData.nguoiNhan || null
            };

            if (modalMode === 'edit' && selectedItem) {
                await thuChiService.update(selectedItem.id, payload);
                setToast({ message: 'Cập nhật thành công!', type: 'success' });
            } else {
                await thuChiService.create(payload);
                setToast({ message: 'Thêm phiếu thành công!', type: 'success' });
            }
            
            setIsModalOpen(false);
            loadRecords();
        } catch (err: any) {
            setToast({ message: err.message || 'Lưu thất bại!', type: 'error' });
        }
    };

    const toggleSelect = (id: string | number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const isSelected = (id: string | number) => selectedIds.includes(id);

    // Filter handlers
    const toggleDuAnFilter = (id: string) => {
        setSelectedDuAnIds(prev => {
            const newIds = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
            // Khi bỏ chọn dự án, cũng bỏ chọn các hợp đồng thuộc dự án đó
            if (!newIds.includes(id)) {
                const contractsToRemove = contracts
                    .filter(c => c.du_an_id === id)
                    .map(c => c.id);
                setSelectedHopDongIds(prevHd => 
                    prevHd.filter(hdId => !contractsToRemove.includes(hdId))
                );
            }
            return newIds;
        });
    };

    const toggleHopDongFilter = (id: string) => {
        setSelectedHopDongIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleNhanSuFilter = (id: string) => {
        setSelectedNhanSuIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // Lấy danh sách hợp đồng theo dự án đã chọn
    const getFilteredContracts = () => {
        if (selectedDuAnIds.length === 0) {
            return [];
        }
        return contracts.filter(c => 
            c.du_an_id && selectedDuAnIds.includes(c.du_an_id)
        );
    };

    // Xử lý quick date filter
    const handleQuickDateFilter = (filter: string) => {
        setQuickDateFilter(filter);
        setSelectedMonth('');
        
        const today = new Date();
        let fromDate = '';
        let toDate = '';
        
        switch (filter) {
            case 'today':
                fromDate = today.toISOString().split('T')[0];
                toDate = today.toISOString().split('T')[0];
                break;
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(yesterday.getDate() - 1);
                fromDate = yesterday.toISOString().split('T')[0];
                toDate = yesterday.toISOString().split('T')[0];
                break;
            case 'thisMonth':
                fromDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
                toDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
                break;
            default:
                return;
        }
        
        setDateFrom(fromDate);
        setDateTo(toDate);
    };

    // Xử lý chọn tháng
    const handleMonthSelect = (month: string) => {
        setSelectedMonth(month);
        setQuickDateFilter('');
        
        if (month) {
            const today = new Date();
            const year = today.getFullYear();
            const monthNum = parseInt(month);
            const fromDate = new Date(year, monthNum - 1, 1).toISOString().split('T')[0];
            const toDate = new Date(year, monthNum, 0).toISOString().split('T')[0];
            setDateFrom(fromDate);
            setDateTo(toDate);
        }
    };

    // Filter theo tab (Phiếu thu hoặc Phiếu chi), search term và các bộ lọc
    const filteredItems = items.filter(item => {
        // Filter theo tab
        const matchesTab = activeTab === 'thu' 
            ? item.type === 'Phiếu thu'
            : item.type === 'Phiếu chi';
        
        // Filter theo search term
        const matchesSearch = !searchTerm || 
            item.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.description?.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Filter theo dự án
        const matchesDuAn = selectedDuAnIds.length === 0 || 
            (item.du_an_id && selectedDuAnIds.includes(item.du_an_id));
        
        // Filter theo hợp đồng
        const matchesHopDong = selectedHopDongIds.length === 0 || 
            (item.hop_dong_id && selectedHopDongIds.includes(item.hop_dong_id));
        
        // Filter theo nhân sự
        const matchesNhanSu = selectedNhanSuIds.length === 0 || 
            (item.nhan_su_id && selectedNhanSuIds.includes(item.nhan_su_id));
        
        // Filter theo ngày
        let matchesDate = true;
        if (dateFrom || dateTo) {
            const itemDate = item.ngay ? new Date(item.ngay).toISOString().split('T')[0] : '';
            if (dateFrom && itemDate < dateFrom) {
                matchesDate = false;
            }
            if (dateTo && itemDate > dateTo) {
                matchesDate = false;
            }
        }
        
        return matchesTab && matchesSearch && matchesDuAn && matchesHopDong && matchesNhanSu && matchesDate;
    });

    // Tính tổng số tiền theo các bộ lọc
    const totalAmount = filteredItems.reduce((sum, item) => sum + (item.so_tien || 0), 0);
    const formattedTotalAmount = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalAmount);

    const isAllSelected = filteredItems.length > 0 && filteredItems.every(item => selectedIds.includes(item.id));

    const toggleSelectAll = () => {
        setSelectedIds(isAllSelected ? [] : filteredItems.map(item => item.id));
    };

    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

    return (
        <>
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {/* Header */}
                    <div className="px-4 md:px-6 py-4 border-b border-slate-200 bg-slate-50">
                        <div className="flex items-center justify-between mb-4">
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
                        
                        {/* Tabs */}
                        <div className="flex gap-2 border-b border-slate-200 -mb-4">
                            <button
                                onClick={() => {
                                    setActiveTab('thu');
                                    setCurrentPage(1);
                                    setSelectedIds([]);
                                }}
                                className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                                    activeTab === 'thu'
                                        ? 'border-emerald-500 text-emerald-600 bg-emerald-50'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                }`}
                            >
                                Phiếu thu
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab('chi');
                                    setCurrentPage(1);
                                    setSelectedIds([]);
                                }}
                                className={`px-4 py-2 text-sm font-semibold transition-colors border-b-2 ${
                                    activeTab === 'chi'
                                        ? 'border-red-500 text-red-600 bg-red-50'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                }`}
                            >
                                Phiếu chi
                            </button>
                        </div>
                    </div>

                    {/* Toolbar */}
                    <div className="px-4 md:px-6 py-4 border-b border-slate-200">
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-4">
                            <div className="relative w-full md:w-80">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                />
                            </div>

                            <div className="flex items-center gap-2 relative">
                                <div className="relative">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenColumnFilter(openColumnFilter === 'status' ? null : 'status');
                                        }}
                                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 whitespace-nowrap"
                                    >
                                        <Bookmark size={14} className="text-slate-400" />
                                        Trạng thái
                                        <ChevronDown size={14} className="text-slate-400" />
                                    </button>
                                    {openColumnFilter === 'status' && (
                                        <div 
                                            className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[200px]"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="p-2 space-y-1">
                                                <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                    <input type="checkbox" className="w-3 h-3 text-blue-600 border-slate-300 rounded" />
                                                    <span className="text-xs">Tạm ứng</span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                    <input type="checkbox" className="w-3 h-3 text-blue-600 border-slate-300 rounded" />
                                                    <span className="text-xs">Thanh toán</span>
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="relative">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenColumnFilter(openColumnFilter === 'topProject' ? null : 'topProject');
                                        }}
                                        className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md whitespace-nowrap ${
                                            selectedDuAnIds.length > 0
                                                ? 'bg-blue-600 text-white border border-blue-600'
                                                : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <Briefcase size={14} className={selectedDuAnIds.length > 0 ? 'text-white' : 'text-slate-400'} />
                                        Dự án
                                        {selectedDuAnIds.length > 0 && (
                                            <span className="bg-white text-blue-600 rounded-full px-1.5 py-0.5 text-xs font-bold">
                                                {selectedDuAnIds.length}
                                            </span>
                                        )}
                                        <ChevronDown size={14} className={selectedDuAnIds.length > 0 ? 'text-white' : 'text-slate-400'} />
                                    </button>
                                    {openColumnFilter === 'topProject' && (
                                        <div 
                                            className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[250px] max-h-60 overflow-y-auto"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="p-2">
                                                <input
                                                    type="text"
                                                    placeholder="Tìm kiếm..."
                                                    className="w-full px-2 py-1 text-xs border border-slate-200 rounded mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                                <div className="space-y-1">
                                                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedDuAnIds.length === projects.length && projects.length > 0}
                                                            onChange={() => {
                                                                if (selectedDuAnIds.length === projects.length) {
                                                                    setSelectedDuAnIds([]);
                                                                } else {
                                                                    setSelectedDuAnIds(projects.map(p => p.id));
                                                                }
                                                            }}
                                                            className="w-3 h-3 text-blue-600 border-slate-300 rounded" 
                                                        />
                                                        <span className="text-xs">Chọn tất cả</span>
                                                    </label>
                                                    <div className="border-t border-slate-200 my-1"></div>
                                                    {projects.map(proj => (
                                                        <label key={proj.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedDuAnIds.includes(proj.id)}
                                                                onChange={() => toggleDuAnFilter(proj.id)}
                                                                className="w-3 h-3 text-blue-600 border-slate-300 rounded"
                                                            />
                                                            <span className="text-xs">{proj.ten_du_an}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="relative">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenColumnFilter(openColumnFilter === 'topEmployee' ? null : 'topEmployee');
                                        }}
                                        className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md whitespace-nowrap ${
                                            selectedNhanSuIds.length > 0
                                                ? 'bg-blue-600 text-white border border-blue-600'
                                                : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <Filter size={14} className={selectedNhanSuIds.length > 0 ? 'text-white' : 'text-slate-400'} />
                                        Nhân sự
                                        {selectedNhanSuIds.length > 0 && (
                                            <span className="bg-white text-blue-600 rounded-full px-1.5 py-0.5 text-xs font-bold">
                                                {selectedNhanSuIds.length}
                                            </span>
                                        )}
                                        <ChevronDown size={14} className={selectedNhanSuIds.length > 0 ? 'text-white' : 'text-slate-400'} />
                                    </button>
                                    {openColumnFilter === 'topEmployee' && (
                                        <div 
                                            className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-20 min-w-[250px] max-h-60 overflow-y-auto"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <div className="p-2">
                                                <input
                                                    type="text"
                                                    placeholder="Tìm kiếm..."
                                                    className="w-full px-2 py-1 text-xs border border-slate-200 rounded mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                />
                                                <div className="space-y-1">
                                                    <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedNhanSuIds.length === employees.length && employees.length > 0}
                                                            onChange={() => {
                                                                if (selectedNhanSuIds.length === employees.length) {
                                                                    setSelectedNhanSuIds([]);
                                                                } else {
                                                                    setSelectedNhanSuIds(employees.map(e => e.id));
                                                                }
                                                            }}
                                                            className="w-3 h-3 text-blue-600 border-slate-300 rounded" 
                                                        />
                                                        <span className="text-xs">Chọn tất cả</span>
                                                    </label>
                                                    <div className="border-t border-slate-200 my-1"></div>
                                                    {employees.map(emp => (
                                                        <label key={emp.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedNhanSuIds.includes(emp.id)}
                                                                onChange={() => toggleNhanSuFilter(emp.id)}
                                                                className="w-3 h-3 text-blue-600 border-slate-300 rounded"
                                                            />
                                                            <span className="text-xs">{emp.code ? `[${emp.code}] ` : ''}{emp.full_name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
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

                        {/* Date Filter Row */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={() => handleQuickDateFilter('today')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                    quickDateFilter === 'today'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                Hôm nay
                            </button>
                            <button
                                onClick={() => handleQuickDateFilter('yesterday')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                    quickDateFilter === 'yesterday'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                Hôm qua
                            </button>
                            <button
                                onClick={() => handleQuickDateFilter('thisMonth')}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                    quickDateFilter === 'thisMonth'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                Tháng này
                            </button>
                            <select
                                value={selectedMonth}
                                onChange={(e) => handleMonthSelect(e.target.value)}
                                className="px-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                            >
                                <option value="">Tháng</option>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                    <option key={month} value={month.toString().padStart(2, '0')}>
                                        Tháng {month}
                                    </option>
                                ))}
                            </select>
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-1.5">
                                <Calendar size={14} className="text-slate-400" />
                                <input
                                    type="date"
                                    value={dateFrom}
                                    onChange={(e) => {
                                        setDateFrom(e.target.value);
                                        setQuickDateFilter('');
                                        setSelectedMonth('');
                                    }}
                                    className="text-xs border-none focus:outline-none bg-transparent [color-scheme:light]"
                                    placeholder="Từ ngày"
                                />
                                <span className="text-slate-400">-</span>
                                <input
                                    type="date"
                                    value={dateTo}
                                    onChange={(e) => {
                                        setDateTo(e.target.value);
                                        setQuickDateFilter('');
                                        setSelectedMonth('');
                                    }}
                                    className="text-xs border-none focus:outline-none bg-transparent [color-scheme:light]"
                                    placeholder="Đến ngày"
                                />
                            </div>
                        </div>

                        {/* Tổng số tiền */}
                        <div className="px-4 md:px-6 py-3">
                            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-slate-700 uppercase">
                                        Tổng số tiền ({activeTab === 'thu' ? 'Phiếu thu' : 'Phiếu chi'}):
                                    </span>
                                    <span className={`text-lg font-bold ${activeTab === 'thu' ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {formattedTotalAmount}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-500">
                                    {filteredItems.length} phiếu
                                </div>
                            </div>
                        </div>
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
                        <div className="overflow-x-auto" onClick={() => setOpenColumnFilter(null)}>
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
                                        <th className="p-4 whitespace-nowrap relative">
                                            <div className="flex items-center justify-between gap-2">
                                                <span>Mã chứng từ</span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenColumnFilter(openColumnFilter === 'code' ? null : 'code');
                                                    }}
                                                    className="p-1 hover:bg-slate-200 rounded"
                                                >
                                                    <Filter size={14} className="text-slate-400" />
                                                </button>
                                            </div>
                                            {openColumnFilter === 'code' && (
                                                <div 
                                                    className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[200px]"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <div className="p-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Tìm kiếm..."
                                                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </th>
                                        <th className="p-4 whitespace-nowrap relative">
                                            <div className="flex items-center justify-between gap-2">
                                                <span>Dự án</span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenColumnFilter(openColumnFilter === 'project' ? null : 'project');
                                                    }}
                                                    className="p-1 hover:bg-slate-200 rounded"
                                                >
                                                    <Filter size={14} className="text-slate-400" />
                                                </button>
                                            </div>
                                            {openColumnFilter === 'project' && (
                                                <div 
                                                    className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[250px] max-h-60 overflow-y-auto"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <div className="p-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Tìm kiếm..."
                                                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                        <div className="space-y-1">
                                                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                                <input type="checkbox" className="w-3 h-3 text-blue-600 border-slate-300 rounded" />
                                                                <span className="text-xs">Chọn tất cả</span>
                                                            </label>
                                                            <div className="border-t border-slate-200 my-1"></div>
                                                            {projects.map(proj => (
                                                                <label key={proj.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedDuAnIds.includes(proj.id)}
                                                                        onChange={() => toggleDuAnFilter(proj.id)}
                                                                        className="w-3 h-3 text-blue-600 border-slate-300 rounded"
                                                                    />
                                                                    <span className="text-xs">{proj.ten_du_an}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </th>
                                        <th className="p-4 whitespace-nowrap">Ngày chứng từ</th>
                                        <th className="p-4 whitespace-nowrap">Loại</th>
                                        <th className="p-4 whitespace-nowrap text-right pr-6">Số tiền</th>
                                        <th className="p-4 whitespace-nowrap relative">
                                            <div className="flex items-center justify-between gap-2">
                                                <span>Nội dung</span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenColumnFilter(openColumnFilter === 'content' ? null : 'content');
                                                    }}
                                                    className="p-1 hover:bg-slate-200 rounded"
                                                >
                                                    <Filter size={14} className="text-slate-400" />
                                                </button>
                                            </div>
                                            {openColumnFilter === 'content' && (
                                                <div 
                                                    className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[200px]"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <div className="p-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Tìm kiếm..."
                                                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </th>
                                        <th className="p-4 whitespace-nowrap">Người nộp/nhận</th>
                                        <th className="p-4 whitespace-nowrap relative">
                                            <div className="flex items-center justify-between gap-2">
                                                <span>Nhân sự</span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setOpenColumnFilter(openColumnFilter === 'employee' ? null : 'employee');
                                                    }}
                                                    className="p-1 hover:bg-slate-200 rounded"
                                                >
                                                    <Filter size={14} className="text-slate-400" />
                                                </button>
                                            </div>
                                            {openColumnFilter === 'employee' && (
                                                <div 
                                                    className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[250px] max-h-60 overflow-y-auto"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <div className="p-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Tìm kiếm..."
                                                            className="w-full px-2 py-1 text-xs border border-slate-200 rounded mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                        />
                                                        <div className="space-y-1">
                                                            <label className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                                <input type="checkbox" className="w-3 h-3 text-blue-600 border-slate-300 rounded" />
                                                                <span className="text-xs">Chọn tất cả</span>
                                                            </label>
                                                            <div className="border-t border-slate-200 my-1"></div>
                                                            {employees.map(emp => (
                                                                <label key={emp.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedNhanSuIds.includes(emp.id)}
                                                                        onChange={() => toggleNhanSuFilter(emp.id)}
                                                                        className="w-3 h-3 text-blue-600 border-slate-300 rounded"
                                                                    />
                                                                    <span className="text-xs">{emp.code ? `[${emp.code}] ` : ''}{emp.full_name}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </th>
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
                                                <td className="p-4 text-slate-600 text-sm">
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
                                                    <p className="text-sm font-medium">
                                                        {activeTab === 'thu' ? 'Không có phiếu thu' : 'Không có phiếu chi'}
                                                    </p>
                                                    <p className="text-xs text-slate-400">Vui lòng thêm phiếu {activeTab === 'thu' ? 'thu' : 'chi'} mới</p>
                                                    <button
                                                        onClick={handleAddClick}
                                                        className="mt-4 px-6 py-2 text-sm font-bold bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all shadow-sm ripple"
                                                    >
                                                        Thêm phiếu {activeTab === 'thu' ? 'thu' : 'chi'} đầu tiên
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
                                        type="text"
                                        value={formData.soTien ? formData.soTien.toLocaleString('vi-VN') : ''}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\./g, '').replace(/[^\d]/g, '');
                                            setFormData({ ...formData, soTien: value ? Number(value) : 0 });
                                        }}
                                        onBlur={(e) => {
                                            const value = e.target.value.replace(/\./g, '').replace(/[^\d]/g, '');
                                            setFormData({ ...formData, soTien: value ? Number(value) : 0 });
                                        }}
                                        placeholder="0"
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white flex-shrink-0">
                            <h2 className="text-lg font-bold text-slate-800 uppercase">Chi tiết chứng từ</h2>
                            <button onClick={() => setIsViewModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Thông tin chứng từ */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-slate-700 uppercase border-b border-slate-200 pb-2">Thông tin chứng từ</h3>
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
                                        <div className="text-slate-700 leading-relaxed italic border-l-2 border-slate-100 pl-3 col-span-2">{selectedItem.description || '(Không có nội dung)'}</div>

                                        <div className="text-slate-500">Người nộp/nhận:</div>
                                        <div className="text-slate-800 font-medium">{selectedItem.person}</div>

                                        <div className="text-slate-500">Nhân sự:</div>
                                        <div className="text-slate-800 font-medium">{selectedItem.nhan_su_display || '(Trống)'}</div>

                                        <div className="text-slate-500">Dự án:</div>
                                        <div className="text-slate-800 font-medium">{selectedItem.ten_du_an || '(Chưa có dự án)'}</div>
                                    </div>
                                </div>

                                {/* Ảnh chứng từ */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-slate-700 uppercase border-b border-slate-200 pb-2">Ảnh chứng từ</h3>
                                    {selectedItem.anh_url ? (
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="w-full max-w-md">
                                                <img 
                                                    src={selectedItem.anh_url} 
                                                    alt="Chứng từ" 
                                                    className="w-full h-auto max-h-[500px] object-contain rounded-lg border border-slate-200 shadow-lg cursor-pointer hover:opacity-90 transition-opacity"
                                                    onClick={() => window.open(selectedItem.anh_url, '_blank')}
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                        const errorDiv = document.createElement('div');
                                                        errorDiv.className = 'text-center text-slate-400 py-8';
                                                        errorDiv.textContent = 'Không thể tải ảnh';
                                                        target.parentElement?.appendChild(errorDiv);
                                                    }}
                                                />
                                            </div>
                                            <button
                                                onClick={() => window.open(selectedItem.anh_url, '_blank')}
                                                className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors"
                                            >
                                                Mở ảnh trong tab mới
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                                            <div className="text-slate-400 mb-2">
                                                <Eye size={48} className="mx-auto opacity-50" />
                                            </div>
                                            <p className="text-sm text-slate-500">Chưa có ảnh chứng từ</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end flex-shrink-0">
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
