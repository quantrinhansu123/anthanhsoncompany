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
    Maximize2,
    CheckCircle,
    PlusCircle
} from 'lucide-react';
import { ThemKhachHangModal } from './ThemKhachHangModal';
import { ThemDuAnModal } from './ThemDuAnModal';
import { useNavigate } from 'react-router-dom';

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
    },
    {
        id: 2,
        Ten_Don_Vi: "Công ty Cổ phần Phát triển Du lịch Vân Hồ",
        Loai_Hinh: "Doanh nghiệp",
        MST: "0123456789",
        Dia_Chi: "Vân Hồ, Sơn La",
        Nguoi_Dai_Dien: "Nguyễn Văn A",
        Chuc_Vu_Dai_Dien: "Giám đốc",
        Nguoi_Lien_He: "Nguyễn Văn B",
        Chuc_Vu_Lien_He: "Nhân viên",
        SDT_Lien_He: "0365573891",
        TongHopDong: 371500000,
        GiaTriQuyetToan: 371500000,
        DaThu: 371500000,
        ConPhaiThu: 0
    },
    {
        id: 3,
        Ten_Don_Vi: "Trung tâm Quan trắc và Quản lý hạ tầng nông nghiệp và môi trường",
        Loai_Hinh: "Cơ quan nhà nước",
        MST: "0987654321",
        Dia_Chi: "Hà Nội",
        Nguoi_Dai_Dien: "Trần Thị C",
        Chuc_Vu_Dai_Dien: "Giám đốc",
        Nguoi_Lien_He: "Trần Thị C",
        Chuc_Vu_Lien_He: "Giám đốc",
        SDT_Lien_He: "",
        TongHopDong: 5000000,
        GiaTriQuyetToan: 5000000,
        DaThu: 5000000,
        ConPhaiThu: 0
    }
];

export function DanhSachKhachHang() {
    const navigate = useNavigate();
    const [items, setItems] = useState(mockData);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
    const [modalData, setModalData] = useState<any>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState('info');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);
    const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
    const [isAddContractModalOpen, setIsAddContractModalOpen] = useState(false);
    const [contractFormData, setContractFormData] = useState({
        projectName: '',
        soHopDong: '',
        tenGoiThau: '',
        ngayKyHD: '',
        fileStatus: 'Chưa có file',
        progress: 0,
    });

    const [isAddFinanceModalOpen, setIsAddFinanceModalOpen] = useState(false);
    const [financeForm, setFinanceForm] = useState({ type: 'Phiếu thu', amount: '', note: '' });
    const [customerProjects, setCustomerProjects] = useState<{ [customerId: number]: any[] }>({});
    const [customerContracts, setCustomerContracts] = useState<{ [customerId: number]: any[] }>({});

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

    const handleViewClick = (customer: any) => {
        setSelectedCustomer(customer);
        setActiveTab('info');
        setIsViewModalOpen(true);
    };

    const closeModal = () => {
        setIsViewModalOpen(false);
        setSelectedCustomer(null);
    };

    const handleEditClick = (item: any) => {
        setModalData(item);
        setIsModalOpen(true);
    };

    const handleAddClick = () => {
        setModalData(null);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (id: number) => {
        setCustomerToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (customerToDelete !== null) {
            setItems(items.filter((item: any) => item.id !== customerToDelete));
            setIsDeleteModalOpen(false);
            setCustomerToDelete(null);
        }
    };

    const handleSaveContract = () => {
        if (selectedCustomer) {
            const newContract = {
                id: Date.now(),
                customerId: selectedCustomer.id,
                customerName: selectedCustomer.Ten_Don_Vi,
                projectName: contractFormData.projectName,
                soHopDong: contractFormData.soHopDong,
                tenGoiThau: contractFormData.tenGoiThau,
                ngayKyHD: contractFormData.ngayKyHD,
                fileStatus: contractFormData.fileStatus,
                progress: Number(contractFormData.progress) || 0,
            };
            setCustomerContracts(prev => ({
                ...prev,
                [selectedCustomer.id]: [...(prev[selectedCustomer.id] || []), newContract],
            }));
            setToast({ message: 'Đã thêm hợp đồng mới thành công!', type: 'success' });
        } else {
            setToast({ message: 'Đã thêm hợp đồng mới thành công!', type: 'success' });
        }
        setIsAddContractModalOpen(false);
        setContractFormData({ projectName: '', soHopDong: '', tenGoiThau: '', ngayKyHD: '', fileStatus: 'Chưa có file', progress: 0 });
    };

    const cancelDelete = () => {
        setIsDeleteModalOpen(false);
        setCustomerToDelete(null);
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* Toast */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="bg-white rounded-md border border-slate-200 overflow-hidden shadow-sm">
                {/* Header Title */}
                <div className="px-6 py-4 border-b border-slate-200">
                    <h1 className="text-[16px] font-bold text-slate-700 uppercase">Danh sách khách hàng</h1>
                </div>

                {/* Toolbar */}
                <div className="px-6 py-4 flex justify-between items-center border-b border-slate-200 bg-white">
                    <div className="relative w-full max-w-[400px]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-md text-sm bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                            placeholder="Tìm theo mã, tên, SĐT..."
                        />
                    </div>

                    <button
                        onClick={handleAddClick}
                        className="btn-primary ripple flex items-center gap-2 px-4 py-2 bg-[#9333EA] hover:bg-purple-700 text-white text-sm font-medium rounded-md shadow-sm"
                    >
                        <Plus size={16} />
                        Thêm khách hàng
                    </button>
                </div>

                {/* Table */}
                <div className="w-full overflow-x-auto bg-white">
                    <table className="w-full text-sm text-left">
                        <thead className="text-slate-700 font-semibold border-b border-slate-200 bg-white">
                            <tr>
                                <th className="p-4 py-4 w-12 text-center">
                                    <input type="checkbox" className="rounded border-slate-300 w-4 h-4 text-purple-600 focus:ring-purple-500 cursor-pointer" />
                                </th>
                                <th className="p-4 py-4 min-w-[250px]">Tên đơn vị</th>
                                <th className="p-4 py-4">SĐT liên hệ</th>
                                <th className="p-4 py-4">Tổng hợp đồng</th>
                                <th className="p-4 py-4">Giá trị quyết toán</th>
                                <th className="p-4 py-4">Đã thu</th>
                                <th className="p-4 py-4">Còn phải thu</th>
                                <th className="p-4 py-4 text-center">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                            {currentItems.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="p-4 text-center">
                                        <input type="checkbox" className="rounded border-slate-300 w-4 h-4 text-purple-600 focus:ring-purple-500 cursor-pointer" />
                                    </td>
                                    <td className="p-4">
                                        <span className="font-semibold text-slate-800">
                                            {item.Ten_Don_Vi || "(Trống)"}
                                        </span>
                                    </td>
                                    <td className="p-4 text-slate-600">
                                        {item.SDT_Lien_He || "(Trống)"}
                                    </td>
                                    <td className="p-4">
                                        {item.TongHopDong > 0 ? (
                                            <span className="text-slate-700">
                                                {formatCurrency(item.TongHopDong)}
                                            </span>
                                        ) : "(Trống)"}
                                    </td>
                                    <td className="p-4">
                                        {item.GiaTriQuyetToan > 0 ? (
                                            <span className="text-slate-700">
                                                {formatCurrency(item.GiaTriQuyetToan)}
                                            </span>
                                        ) : "(Trống)"}
                                    </td>
                                    <td className="p-4">
                                        {item.DaThu > 0 ? (
                                            <span className="text-green-600">
                                                {formatCurrency(item.DaThu)}
                                            </span>
                                        ) : "(Trống)"}
                                    </td>
                                    <td className="p-4">
                                        {item.ConPhaiThu > 0 ? (
                                            <span className="text-red-500">
                                                {formatCurrency(item.ConPhaiThu)}
                                            </span>
                                        ) : "(Trống)"}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                className="action-btn p-1.5 text-purple-600 bg-purple-50 border border-purple-100 rounded-md hover:bg-purple-100"
                                                title="Xem"
                                                onClick={() => handleViewClick(item)}
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
                                                onClick={() => handleDeleteClick(item.id)}
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

                {/* Pagination */}
                <div className="px-6 py-4 flex flex-wrap items-center justify-between border-t border-slate-200 text-sm text-slate-600 bg-white">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800">{filteredItems.length}</span> bản ghi
                        <span className="mx-2 text-slate-300">|</span>
                        <select
                            className="border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
                            value={itemsPerPage}
                            onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                        <span className="ml-1">/ trang</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                            <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><ChevronsLeft size={16} /></button>
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><ChevronLeft size={16} /></button>
                        </div>
                        <span>Trang {currentPage} / {totalPages || 1}</span>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><ChevronRight size={16} /></button>
                            <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage >= totalPages} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"><ChevronsRight size={16} /></button>
                        </div>
                    </div>
                </div>
            </div>

            {/* View Modal */}
            {isViewModalOpen && selectedCustomer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 modal-overlay p-4">
                    <div className="bg-[#FAF9FB] w-full max-w-4xl rounded-2xl shadow-lg flex flex-col max-h-[90vh] modal-content">
                        {/* Modal Header */}
                        <div className="px-6 py-4 flex justify-between items-center bg-white rounded-t-2xl">
                            <h2 className="text-lg font-bold text-slate-800">Chi tiết khách hàng</h2>
                            <button
                                onClick={closeModal}
                                className="icon-btn p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="border-b border-slate-200 bg-white">
                            <nav className="flex -mb-px px-6 gap-6" aria-label="Tabs">
                                {[
                                    { id: 'info', label: 'Thông tin Khách hàng' },
                                    { id: 'projects', label: 'Dự án' },
                                    { id: 'contracts', label: 'Hợp đồng' },
                                    { id: 'finance', label: 'Thu chi' },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`
                                            whitespace-nowrap py-3 border-b-2 font-medium text-sm transition-colors
                                            ${activeTab === tab.id
                                                ? 'border-purple-600 text-purple-600'
                                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                            }
                                        `}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 overflow-y-auto bg-slate-50">
                            {activeTab === 'info' && (
                                <div className="bg-white border text-sm text-slate-700 border-slate-200 shadow-sm rounded">
                                    {[
                                        { label: 'Tên đơn vị', value: <span className="font-bold italic text-slate-800">{selectedCustomer.Ten_Don_Vi}</span> },
                                        { label: 'Loại hình', value: selectedCustomer.Loai_Hinh },
                                        { label: 'Mã số thuế', value: selectedCustomer.MST },
                                        { label: 'Địa chỉ', value: selectedCustomer.Dia_Chi },
                                        { label: 'Người đại diện', value: selectedCustomer.Nguoi_Dai_Dien },
                                        { label: 'Chức vụ đại diện', value: selectedCustomer.Chuc_Vu_Dai_Dien },
                                        { label: 'Người liên hệ', value: selectedCustomer.Nguoi_Lien_He },
                                        { label: 'Chức vụ liên hệ', value: selectedCustomer.Chuc_Vu_Lien_He },
                                        { label: 'SĐT liên hệ', value: selectedCustomer.SDT_Lien_He },
                                    ].map((row, index) => (
                                        <div key={index} className="flex px-4 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                            <div className="w-[180px] shrink-0 text-slate-500 font-medium">{row.label}</div>
                                            <div className="flex-1">{row.value || "(Trống)"}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'projects' && (
                                <div className="bg-white border text-sm text-slate-700 border-slate-200 shadow-sm rounded-xl fade-in-up">
                                    {customerProjects[selectedCustomer?.id] && customerProjects[selectedCustomer.id].length > 0 ? (
                                        <div className="divide-y divide-slate-100">
                                            {customerProjects[selectedCustomer.id].map((project: any) => (
                                                <div key={project.id} className="p-4 hover:bg-slate-50 transition-colors">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-slate-800 mb-1">{project.projectName}</p>
                                                            <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                                                                {project.date && <span>Ngày: {project.date}</span>}
                                                                {project.status && (
                                                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                        project.status === 'Hoàn thành' ? 'bg-emerald-50 text-emerald-600' :
                                                                        project.status === 'Đang thực hiện' ? 'bg-blue-50 text-blue-600' :
                                                                        project.status === 'Đang quá hạn' ? 'bg-rose-50 text-rose-600' :
                                                                        project.status === 'Tạm dừng' ? 'bg-amber-50 text-amber-600' :
                                                                        'bg-slate-50 text-slate-600'
                                                                    }`}>
                                                                        {project.status}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-4 border-b border-slate-100">
                                            <p className="text-slate-500 italic">Chưa có dự án nào</p>
                                        </div>
                                    )}
                                    <div className="bg-white px-4 py-3 flex justify-end gap-3 rounded-b-xl border-t border-slate-100">
                                        <button
                                            onClick={() => navigate('/khach-hang/du-an')}
                                            className="action-btn p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-100"
                                            title="Mở rộng"
                                        >
                                            <Maximize2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsAddProjectModalOpen(true);
                                            }}
                                            className="action-btn p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-100"
                                            title="Thêm dự án"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'contracts' && (
                                <div className="bg-white border text-sm text-slate-700 border-slate-200 shadow-sm rounded-xl overflow-hidden fade-in-up">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="border-b border-slate-200 text-slate-800 font-semibold bg-white">
                                                <tr>
                                                    <th className="px-4 py-3 whitespace-nowrap">Dự án</th>
                                                    <th className="px-4 py-3 whitespace-nowrap">Trạng thái file</th>
                                                    <th className="px-4 py-3 whitespace-nowrap text-center">Tiến độ</th>
                                                    <th className="px-4 py-3 whitespace-nowrap">Ngày ký HĐ</th>
                                                    <th className="px-4 py-3 whitespace-nowrap">Số hợp đồng</th>
                                                    <th className="px-4 py-3 whitespace-nowrap">Tên gói thầu</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {selectedCustomer && customerContracts[selectedCustomer.id] && customerContracts[selectedCustomer.id].length > 0 ? (
                                                    customerContracts[selectedCustomer.id].map((contract: any) => (
                                                        <tr key={contract.id} className="bg-white hover:bg-slate-50 transition-colors">
                                                            <td className="px-4 py-3 text-slate-700">
                                                                <span className="italic">{contract.projectName || '(Chưa chọn dự án)'}</span>
                                                            </td>
                                                            <td className="px-4 py-3 font-semibold text-red-600 italic">
                                                                {contract.fileStatus || 'Chưa có thông tin'}
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-3 min-w-[140px]">
                                                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                                        <div
                                                                            className={`h-2 rounded-full ${contract.progress >= 100
                                                                                ? 'bg-emerald-500'
                                                                                : contract.progress >= 50
                                                                                    ? 'bg-blue-500'
                                                                                    : 'bg-amber-500'
                                                                                }`}
                                                                            style={{ width: `${Math.min(Math.max(contract.progress || 0, 0), 100)}%` }}
                                                                        ></div>
                                                                    </div>
                                                                    <span className="text-xs font-semibold text-slate-700 w-10 text-right tabular-nums">
                                                                        {(contract.progress || 0)}%
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-600">
                                                                {contract.ngayKyHD || '(Chưa nhập)'}
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-600">
                                                                {contract.soHopDong || '(Chưa nhập)'}
                                                            </td>
                                                            <td className="px-4 py-3 text-slate-600 truncate max-w-[150px]">
                                                                {contract.tenGoiThau || '(Chưa nhập)'}
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td className="px-4 py-3 text-slate-500 italic" colSpan={6}>
                                                            Chưa có hợp đồng nào
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="bg-white border-t border-slate-100 px-4 py-3 flex justify-end gap-3">
                                        <button
                                            onClick={() => navigate('/khach-hang/hop-dong')}
                                            className="action-btn p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-100"
                                            title="Mở rộng"
                                        >
                                            <Maximize2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => {
                                                // Tự động điền dự án đầu tiên nếu có
                                                const projects = selectedCustomer ? customerProjects[selectedCustomer.id] || [] : [];
                                                const firstProject = projects.length > 0 ? projects[0].projectName : '';
                                                setContractFormData({
                                                    projectName: firstProject,
                                                    soHopDong: '',
                                                    tenGoiThau: '',
                                                    ngayKyHD: '',
                                                    fileStatus: 'Chưa có file'
                                                });
                                                setIsAddContractModalOpen(true);
                                            }}
                                            className="action-btn p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-100"
                                            title="Thêm hợp đồng"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'finance' && (
                                <div className="bg-white border text-sm text-slate-700 border-slate-200 shadow-sm rounded-xl overflow-hidden fade-in-up">
                                    <table className="w-full text-left">
                                        <thead className="border-b border-slate-200 text-slate-800 font-semibold bg-white">
                                            <tr>
                                                <th className="px-4 py-3">Loại phiếu</th>
                                                <th className="px-4 py-3 text-right"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            <tr className="bg-white hover:bg-slate-50 transition-colors cursor-pointer">
                                                <td className="px-4 py-4 flex gap-2 items-center">
                                                    <span className="text-green-600 italic font-semibold">Phiếu thu</span>
                                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 border border-slate-200 font-medium">55,828,000</span>
                                                </td>
                                                <td className="px-4 py-4 text-right text-slate-400">
                                                    <ChevronRight size={18} className="inline-block" />
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <div className="bg-white border-t border-slate-100 px-4 py-3 flex justify-end gap-3">
                                        <button
                                            onClick={() => navigate('/tai-chinh/thu-chi')}
                                            className="action-btn p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-100"
                                            title="Mở rộng"
                                        >
                                            <Maximize2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => setIsAddFinanceModalOpen(true)}
                                            className="action-btn p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-100"
                                            title="Thêm phiếu thu/chi"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-end rounded-b-2xl">
                            <button
                                onClick={closeModal}
                                className="btn-secondary px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-sm"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ThemKhachHangModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                initialData={modalData}
                onSave={(data) => {
                    if (data.id) {
                        setItems(items.map((item: any) => item.id === data.id ? data : item));
                    } else {
                        setItems([{ ...data, id: Date.now(), TongHopDong: 0, GiaTriQuyetToan: Number(data.GiaTriQuyetToan || 0), DaThu: 0, ConPhaiThu: 0 }, ...items]);
                    }
                }}
            />

            {/* Add Project Modal */}
            <ThemDuAnModal
                isOpen={isAddProjectModalOpen}
                onClose={() => setIsAddProjectModalOpen(false)}
                onSave={(data) => {
                    if (selectedCustomer) {
                        const newProject = {
                            ...data,
                            id: Date.now(),
                            customerId: selectedCustomer.id,
                            customerName: selectedCustomer.Ten_Don_Vi
                        };
                        setCustomerProjects(prev => ({
                            ...prev,
                            [selectedCustomer.id]: [...(prev[selectedCustomer.id] || []), newProject]
                        }));
                        setToast({ message: 'Đã thêm dự án mới thành công!', type: 'success' });
                    } else {
                        setToast({ message: 'Đã thêm dự án mới thành công!', type: 'success' });
                    }
                    setIsAddProjectModalOpen(false);
                }}
                initialData={selectedCustomer ? { customerName: selectedCustomer.Ten_Don_Vi } : undefined}
            />

            {/* Add Contract Modal */}
            {isAddContractModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white">
                            <h3 className="text-lg font-bold text-slate-800">Thêm hợp đồng mới</h3>
                            <button onClick={() => setIsAddContractModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Dự án</label>
                                <select
                                    value={contractFormData.projectName}
                                    onChange={e => setContractFormData({ ...contractFormData, projectName: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-white"
                                >
                                    <option value="">Chọn dự án...</option>
                                    {selectedCustomer && customerProjects[selectedCustomer.id] && customerProjects[selectedCustomer.id].map((project: any) => (
                                        <option key={project.id} value={project.projectName}>{project.projectName}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">% trạng thái (tiến độ)</label>
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                                    placeholder="Nhập % hoàn thành hợp đồng (0 - 100)"
                                    value={contractFormData.progress}
                                    onChange={e => setContractFormData({ ...contractFormData, progress: Number(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Số hợp đồng</label>
                                <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" placeholder="VD: 2025/08/HĐ-TT" value={contractFormData.soHopDong} onChange={e => setContractFormData({ ...contractFormData, soHopDong: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tên gói thầu</label>
                                <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" placeholder="Nhập tên gói thầu..." value={contractFormData.tenGoiThau} onChange={e => setContractFormData({ ...contractFormData, tenGoiThau: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Ngày ký HĐ</label>
                                <input 
                                    type="date" 
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" 
                                    value={contractFormData.ngayKyHD} 
                                    onChange={e => setContractFormData({ ...contractFormData, ngayKyHD: e.target.value })} 
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                            <button onClick={() => setIsAddContractModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg">Hủy</button>
                            <button onClick={handleSaveContract} className="px-4 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-md">Thêm</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-0 modal-overlay">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden modal-content">
                        <div className="px-6 py-5">
                            <h3 className="text-lg font-semibold text-slate-800 mb-2">Xác nhận xóa</h3>
                            <p className="text-sm text-slate-600">Bạn có chắc chắn muốn xóa khách hàng này không? Hành động này không thể hoàn tác.</p>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                            <button
                                onClick={cancelDelete}
                                className="btn-secondary px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={() => { confirmDelete(); setToast({ message: 'Đã xóa khách hàng thành công!', type: 'warning' }); }}
                                className="btn-primary ripple px-4 py-2 bg-red-600 border border-red-600 rounded-lg text-sm font-medium text-white hover:bg-red-700"
                            >
                                Xóa
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Finance Modal */}
            {isAddFinanceModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white">
                            <h3 className="text-lg font-bold text-slate-800">Thêm phiếu thu/chi</h3>
                            <button onClick={() => setIsAddFinanceModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Loại phiếu</label>
                                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-white" value={financeForm.type} onChange={e => setFinanceForm({ ...financeForm, type: e.target.value })}>
                                    <option value="Phiếu thu">Phiếu thu</option>
                                    <option value="Phiếu chi">Phiếu chi</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Số tiền</label>
                                <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" placeholder="0" value={financeForm.amount} onChange={e => setFinanceForm({ ...financeForm, amount: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nội dung</label>
                                <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" placeholder="Nhập nội dung..." rows={3} value={financeForm.note} onChange={e => setFinanceForm({ ...financeForm, note: e.target.value })}></textarea>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                            <button onClick={() => setIsAddFinanceModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Hủy</button>
                            <button onClick={() => { setToast({ message: 'Đã thêm phiếu thành công!', type: 'success' }); setIsAddFinanceModalOpen(false); }} className="px-4 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-md transition-colors">Thêm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
