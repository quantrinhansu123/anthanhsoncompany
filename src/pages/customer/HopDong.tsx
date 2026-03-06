import React, { useState } from 'react';
import { Search, Plus, Eye, Edit, Trash2, X, ChevronRight, ChevronDown, FileText, Upload, FolderOpen, ClipboardList, PlusCircle, Maximize2, ExternalLink, CheckCircle } from 'lucide-react';

interface Contract {
    id: number;
    fileStatus: string;
    ngayKyHD: string;
    soHopDong: string;
    tenGoiThau: string;
    loaiDichVu: string;
    giaTriHD: number;
    giaTriQT: number;
    daThu: number;
    conPhaiThu: number;
    ngayUpdate: string;
}

interface ProjectGroup {
    id: number;
    projectName: string;
    contracts: Contract[];
}

const mockData: ProjectGroup[] = [
    {
        id: 1,
        projectName: "Đề cương nhiệm vụ và dự toán xây dựng định mức kinh tế - kỹ thuật, đơn giá vận hành các công trình trạm mạng chuyển các triển khai bàn thành phố Đà Nẵng",
        contracts: [
            {
                id: 101,
                fileStatus: "Thiếu file: HĐ, BBNT, BBTL, PL34",
                ngayKyHD: "5/9/2025",
                soHopDong: "2025/05/18-TTQT&QLHT",
                tenGoiThau: "Tư vấn thẩm tra",
                loaiDichVu: "TTHVTC-ĐT",
                giaTriHD: 5000000,
                giaTriQT: 5000000,
                daThu: 0,
                conPhaiThu: 5000000,
                ngayUpdate: "2/10/2026",
            }
        ]
    },
    {
        id: 2,
        projectName: "Dự án Tuyến ống D500, D400, D300 và hoàn trả tuyến ống D220 – D63 hiện trạng tuyến đường Quốc lộ 14B. Hạng mục: Phòng cháy chữa cháy",
        contracts: [
            {
                id: 201,
                fileStatus: "Thiếu file: HĐ, BBNT, BBTL, PL34",
                ngayKyHD: "3/7/2025",
                soHopDong: "13/2025/HĐTV-CTCN",
                tenGoiThau: "Tư vấn lập hồ sơ thiết kế xây dựng triển khai sau thiết kế cơ sở",
                loaiDichVu: "",
                giaTriHD: 65680000,
                giaTriQT: 65680000,
                daThu: 55828000,
                conPhaiThu: 9852000,
                ngayUpdate: "2/10/2026",
            }
        ]
    },
    {
        id: 3,
        projectName: "Khu du lịch sinh thái Phúc Hợp Trúc Năng Tiên, đảo Chồng Khoa",
        contracts: [
            {
                id: 301,
                fileStatus: "Thiếu file: HĐ, BBNT, BBTL, PL34",
                ngayKyHD: "5/17/2025",
                soHopDong: "01/2025/HMSHDLT.TNT.TCK",
                tenGoiThau: "Khảo sát địa hình",
                loaiDichVu: "KSĐH",
                giaTriHD: 371500000,
                giaTriQT: 371500000,
                daThu: 371500000,
                conPhaiThu: 0,
                ngayUpdate: "2/10/2026",
            }
        ]
    }
];

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

export function HopDong() {
    const [items, setItems] = useState(mockData);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedProjects, setExpandedProjects] = useState<number[]>(mockData.map(p => p.id));
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
    const [selectedProjectName, setSelectedProjectName] = useState('');
    const [activeTab, setActiveTab] = useState('info');
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [contractToDelete, setContractToDelete] = useState<number | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingContract, setEditingContract] = useState<Contract | null>(null);
    const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

    // New states for tab modals
    const [isAddDocumentModalOpen, setIsAddDocumentModalOpen] = useState(false);
    const [isAddFinanceModalOpen, setIsAddFinanceModalOpen] = useState(false);
    const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);

    // Form states for tab modals
    const [documentForm, setDocumentForm] = useState({ name: '', type: '' });
    const [financeForm, setFinanceForm] = useState({ type: 'Phiếu thu', amount: '', note: '' });
    const [taskForm, setTaskForm] = useState({ name: '', deadline: '', assignee: '' });

    // Add form state
    const [formData, setFormData] = useState({
        soHopDong: '',
        tenGoiThau: '',
        loaiDichVu: '',
        ngayKyHD: '',
        giaTriHD: '',
        giaTriQT: '',
        daThu: '',
        projectId: 0,
    });

    const formatCurrency = (amount: number) => {
        if (amount === 0) return '0';
        return amount.toLocaleString('vi-VN');
    };

    const toggleProject = (projectId: number) => {
        setExpandedProjects(prev =>
            prev.includes(projectId)
                ? prev.filter(id => id !== projectId)
                : [...prev, projectId]
        );
    };

    const handleViewClick = (contract: Contract, projectName: string) => {
        setSelectedContract(contract);
        setSelectedProjectName(projectName);
        setActiveTab('info');
        setIsViewModalOpen(true);
    };

    const closeViewModal = () => {
        setIsViewModalOpen(false);
        setSelectedContract(null);
    };

    const handleEditClick = (contract: Contract, projectId: number) => {
        setEditingContract(contract);
        setEditingProjectId(projectId);
        setFormData({
            soHopDong: contract.soHopDong,
            tenGoiThau: contract.tenGoiThau,
            loaiDichVu: contract.loaiDichVu,
            ngayKyHD: contract.ngayKyHD,
            giaTriHD: contract.giaTriHD.toString(),
            giaTriQT: contract.giaTriQT.toString(),
            daThu: contract.daThu.toString(),
            projectId: projectId,
        });
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = () => {
        if (!editingContract || !editingProjectId) return;
        const giaTriHD = Number(formData.giaTriHD) || 0;
        const giaTriQT = Number(formData.giaTriQT) || 0;
        const daThu = Number(formData.daThu) || 0;

        setItems(prev => prev.map(project => {
            if (project.id === editingProjectId) {
                return {
                    ...project,
                    contracts: project.contracts.map(c => {
                        if (c.id === editingContract.id) {
                            return {
                                ...c,
                                soHopDong: formData.soHopDong,
                                tenGoiThau: formData.tenGoiThau,
                                loaiDichVu: formData.loaiDichVu,
                                ngayKyHD: formData.ngayKyHD,
                                giaTriHD,
                                giaTriQT,
                                daThu,
                                conPhaiThu: giaTriQT - daThu,
                                ngayUpdate: new Date().toLocaleDateString('en-US'),
                            };
                        }
                        return c;
                    })
                };
            }
            return project;
        }));
        setIsEditModalOpen(false);
        setEditingContract(null);
        setToast({ message: 'Đã cập nhật hợp đồng thành công!', type: 'success' });
    };

    const handleAddClick = () => {
        setFormData({
            soHopDong: '',
            tenGoiThau: '',
            loaiDichVu: '',
            ngayKyHD: '',
            giaTriHD: '',
            giaTriQT: '',
            daThu: '',
            projectId: items[0]?.id || 0,
        });
        setIsAddModalOpen(true);
    };

    const handleSaveAdd = () => {
        const giaTriHD = Number(formData.giaTriHD) || 0;
        const giaTriQT = Number(formData.giaTriQT) || 0;
        const daThu = Number(formData.daThu) || 0;
        const newContract: Contract = {
            id: Date.now(),
            fileStatus: 'Chưa có file',
            ngayKyHD: formData.ngayKyHD || new Date().toLocaleDateString('en-US'),
            soHopDong: formData.soHopDong,
            tenGoiThau: formData.tenGoiThau,
            loaiDichVu: formData.loaiDichVu,
            giaTriHD,
            giaTriQT,
            daThu,
            conPhaiThu: giaTriQT - daThu,
            ngayUpdate: new Date().toLocaleDateString('en-US'),
        };
        setItems(prev => prev.map(project => {
            if (project.id === formData.projectId) {
                return { ...project, contracts: [...project.contracts, newContract] };
            }
            return project;
        }));
        setIsAddModalOpen(false);
        setToast({ message: 'Đã thêm hợp đồng mới thành công!', type: 'success' });
    };

    const handleDeleteClick = (contractId: number) => {
        setContractToDelete(contractId);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (contractToDelete !== null) {
            setItems(prev => prev.map(project => ({
                ...project,
                contracts: project.contracts.filter(c => c.id !== contractToDelete)
            })));
            setToast({ message: 'Đã xóa hợp đồng thành công!', type: 'warning' });
        }
        setIsDeleteModalOpen(false);
        setContractToDelete(null);
    };

    const cancelDelete = () => {
        setIsDeleteModalOpen(false);
        setContractToDelete(null);
    };

    // Filter by search term
    const filteredItems = items.map(project => ({
        ...project,
        contracts: project.contracts.filter(c =>
            !searchTerm ||
            c.soHopDong.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.tenGoiThau.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.loaiDichVu.toLowerCase().includes(searchTerm.toLowerCase()) ||
            project.projectName.toLowerCase().includes(searchTerm.toLowerCase())
        )
    })).filter(project => project.contracts.length > 0 || project.projectName.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* Toast */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="bg-white rounded-md border border-slate-200 overflow-hidden shadow-sm">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white">
                    <h1 className="text-[16px] font-bold text-slate-700 uppercase">
                        Hợp đồng
                    </h1>
                    <button
                        onClick={handleAddClick}
                        className="btn-primary ripple flex items-center gap-2 px-4 py-2 bg-[#9333EA] hover:bg-purple-700 text-white text-sm font-medium rounded-md shadow-sm"
                    >
                        <Plus size={16} />
                        Thêm hợp đồng
                    </button>
                </div>

                {/* Search */}
                <div className="px-6 py-4 border-b border-slate-200 bg-white">
                    <div className="relative w-full max-w-[400px]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-md text-sm bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                            placeholder="Tìm theo số HĐ, tên gói thầu..."
                        />
                    </div>
                </div>

                {/* Table */}
                <div className="w-full overflow-x-auto bg-white">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/50">
                                <th className="py-3.5 pl-6 pr-2 font-semibold text-xs uppercase tracking-wider w-8"></th>
                                <th className="py-3.5 px-3 font-semibold text-xs uppercase tracking-wider min-w-[180px]">Trạng thái file</th>
                                <th className="py-3.5 px-3 font-semibold text-xs uppercase tracking-wider min-w-[100px]">Ngày ký HĐ</th>
                                <th className="py-3.5 px-3 font-semibold text-xs uppercase tracking-wider min-w-[160px]">Số hợp đồng</th>
                                <th className="py-3.5 px-3 font-semibold text-xs uppercase tracking-wider min-w-[160px]">Tên gói thầu</th>
                                <th className="py-3.5 px-3 font-semibold text-xs uppercase tracking-wider min-w-[110px]">Loại dịch vụ</th>
                                <th className="py-3.5 px-3 font-semibold text-xs uppercase tracking-wider text-right min-w-[120px]">Giá trị HĐ</th>
                                <th className="py-3.5 px-3 font-semibold text-xs uppercase tracking-wider text-right min-w-[120px]">Giá trị QT</th>
                                <th className="py-3.5 px-3 font-semibold text-xs uppercase tracking-wider text-right min-w-[110px]">Đã thu</th>
                                <th className="py-3.5 px-3 font-semibold text-xs uppercase tracking-wider text-right min-w-[110px]">Còn phải thu</th>
                                <th className="py-3.5 px-3 font-semibold text-xs uppercase tracking-wider min-w-[100px]">Ngày update</th>
                                <th className="py-3.5 px-3 pr-6 font-semibold text-xs uppercase tracking-wider text-center w-[100px]">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredItems.map((project) => (
                                <React.Fragment key={project.id}>
                                    {/* Project Row */}
                                    <tr
                                        className="bg-slate-50/70 cursor-pointer hover:bg-slate-100/70 transition-colors"
                                        onClick={() => toggleProject(project.id)}
                                    >
                                        <td className="py-3 pl-6 pr-2">
                                            <div className={`transition-transform duration-200 ${expandedProjects.includes(project.id) ? 'rotate-0' : '-rotate-90'}`}>
                                                <ChevronDown size={16} className="text-slate-400" />
                                            </div>
                                        </td>
                                        <td colSpan={11} className="py-3 px-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-red-500 text-base">★</span>
                                                <span className="font-semibold text-slate-700 text-[13px] leading-snug">{project.projectName}</span>
                                                <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px] font-bold">{project.contracts.length}</span>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Contract Rows */}
                                    {expandedProjects.includes(project.id) && project.contracts.map((contract) => (
                                        <tr key={contract.id} className="hover:bg-blue-50/30 transition-colors group fade-in-up">
                                            <td className="py-3 pl-6 pr-2"></td>
                                            <td className="py-3 px-3">
                                                <span className="text-red-600 font-semibold italic text-[12px]">
                                                    {contract.fileStatus}
                                                </span>
                                            </td>
                                            <td className="py-3 px-3 text-slate-600">{contract.ngayKyHD}</td>
                                            <td className="py-3 px-3 text-slate-700 font-medium text-[12px]">{contract.soHopDong}</td>
                                            <td className="py-3 px-3 text-slate-600 text-[12px]">{contract.tenGoiThau}</td>
                                            <td className="py-3 px-3 text-slate-600">{contract.loaiDichVu || '—'}</td>
                                            <td className="py-3 px-3 text-right">
                                                <span className="text-slate-700 font-medium">{formatCurrency(contract.giaTriHD)}</span>
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <span className="text-green-600 font-medium">{formatCurrency(contract.giaTriQT)}</span>
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <span className="text-green-600 font-medium">{formatCurrency(contract.daThu)}</span>
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                {contract.conPhaiThu > 0 ? (
                                                    <span className="text-red-500 font-medium">{formatCurrency(contract.conPhaiThu)}</span>
                                                ) : (
                                                    <span className="text-green-600 font-medium">0</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-3 text-slate-500 text-[12px]">{contract.ngayUpdate}</td>
                                            <td className="py-3 px-3 pr-6 text-center">
                                                <div className="flex items-center justify-center gap-1.5 transition-opacity">
                                                    <button
                                                        className="action-btn p-1.5 text-purple-600 bg-purple-50 border border-purple-100 rounded-md hover:bg-purple-100"
                                                        title="Xem"
                                                        onClick={(e) => { e.stopPropagation(); handleViewClick(contract, project.projectName); }}
                                                    >
                                                        <Eye size={14} />
                                                    </button>
                                                    <button
                                                        className="action-btn p-1.5 text-orange-500 bg-orange-50 border border-orange-100 rounded-md hover:bg-orange-100"
                                                        title="Sửa"
                                                        onClick={(e) => { e.stopPropagation(); handleEditClick(contract, project.id); }}
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                    <button
                                                        className="action-btn p-1.5 text-red-500 bg-red-50 border border-red-100 rounded-md hover:bg-red-100"
                                                        title="Xóa"
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(contract.id); }}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Summary Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex flex-wrap items-center gap-6 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500">Tổng hợp đồng:</span>
                        <span className="font-bold text-slate-800">{items.reduce((sum, p) => sum + p.contracts.length, 0)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500">Tổng giá trị:</span>
                        <span className="font-bold text-slate-800">{formatCurrency(items.reduce((sum, p) => sum + p.contracts.reduce((s, c) => s + c.giaTriHD, 0), 0))}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500">Đã thu:</span>
                        <span className="font-bold text-green-600">{formatCurrency(items.reduce((sum, p) => sum + p.contracts.reduce((s, c) => s + c.daThu, 0), 0))}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500">Còn phải thu:</span>
                        <span className="font-bold text-red-500">{formatCurrency(items.reduce((sum, p) => sum + p.contracts.reduce((s, c) => s + c.conPhaiThu, 0), 0))}</span>
                    </div>
                </div>
            </div>

            {/* View Modal */}
            {isViewModalOpen && selectedContract && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 modal-overlay p-4">
                    <div className="bg-[#FAF9FB] w-full max-w-4xl rounded-2xl shadow-lg flex flex-col max-h-[90vh] modal-content">
                        {/* Modal Header */}
                        <div className="px-6 py-4 flex justify-between items-center bg-white rounded-t-2xl">
                            <h2 className="text-lg font-bold text-slate-800">Chi tiết hợp đồng</h2>
                            <button
                                onClick={closeViewModal}
                                className="icon-btn p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="border-b border-slate-200 bg-white">
                            <nav className="flex -mb-px px-6 gap-6" aria-label="Tabs">
                                {[
                                    { id: 'info', label: 'Thông tin hợp đồng' },
                                    { id: 'documents', label: 'Tài liệu HĐ' },
                                    { id: 'finance', label: 'Thu chi' },
                                    { id: 'tasks', label: 'Công việc CT' },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`
                                            whitespace-nowrap py-3 border-b-2 font-medium text-sm transition-all duration-200
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
                                <div className="space-y-5 fade-in-up">
                                    {/* Project Name */}
                                    <div className="bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3">
                                        <div className="text-xs text-slate-400 font-medium mb-1">Dự án</div>
                                        <div className="text-sm text-red-600 font-semibold flex items-center gap-1.5">
                                            <span>★</span>
                                            <span className="italic">{selectedProjectName}</span>
                                        </div>
                                    </div>

                                    {/* Contract Details */}
                                    <div className="bg-white border text-sm text-slate-700 border-slate-200 shadow-sm rounded-xl">
                                        {[
                                            { label: 'Số hợp đồng', value: selectedContract.soHopDong },
                                            { label: 'Ngày ký HĐ', value: selectedContract.ngayKyHD },
                                            { label: 'Tên gói thầu', value: selectedContract.tenGoiThau },
                                            { label: 'Loại dịch vụ', value: selectedContract.loaiDichVu || '—' },
                                            { label: 'Trạng thái file', value: selectedContract.fileStatus },
                                            { label: 'Ngày cập nhật', value: selectedContract.ngayUpdate },
                                        ].map((row, index) => (
                                            <div key={index} className="flex px-4 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                                <div className="w-[180px] shrink-0 text-slate-500 font-medium">{row.label}</div>
                                                <div className="flex-1 text-slate-800 font-medium">{row.value}</div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Financial Summary */}
                                    <div className="bg-white border text-sm text-slate-700 border-slate-200 shadow-sm rounded-xl">
                                        <div className="px-4 py-3 border-b border-slate-200 bg-white rounded-t-xl">
                                            <h3 className="text-sm font-semibold text-slate-800">Thông tin tài chính</h3>
                                        </div>
                                        {[
                                            { label: 'Giá trị hợp đồng', value: formatCurrency(selectedContract.giaTriHD), color: 'text-slate-800' },
                                            { label: 'Giá trị quyết toán', value: formatCurrency(selectedContract.giaTriQT), color: 'text-green-600' },
                                            { label: 'Đã thu', value: formatCurrency(selectedContract.daThu), color: 'text-green-600' },
                                            { label: 'Còn phải thu', value: formatCurrency(selectedContract.conPhaiThu), color: selectedContract.conPhaiThu > 0 ? 'text-red-500' : 'text-green-600' },
                                        ].map((row, index) => (
                                            <div key={index} className="flex px-4 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                                <div className="w-[180px] shrink-0 text-slate-500 font-medium">{row.label}</div>
                                                <div className={`flex-1 font-bold ${row.color}`}>{row.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'documents' && (
                                <div className="space-y-4 fade-in-up">
                                    <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                                        <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-semibold text-slate-800">Tài liệu HĐ</h3>
                                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold">0</span>
                                            </div>
                                        </div>
                                        <div className="px-4 py-10 text-center">
                                            <FolderOpen size={40} className="mx-auto text-slate-300 mb-3" />
                                            <p className="text-sm text-slate-400 italic">Chưa có tài liệu</p>
                                            <p className="text-xs text-slate-400 mt-1">Chưa có tài liệu nào được tải lên</p>
                                        </div>
                                        <div className="bg-white border-t border-slate-100 px-4 py-3 flex justify-end gap-3">
                                            <button
                                                onClick={() => setIsAddDocumentModalOpen(true)}
                                                className="action-btn p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-100"
                                                title="Thêm tài liệu"
                                            >
                                                <Plus size={16} />
                                            </button>
                                            <button
                                                onClick={() => setToast({ message: 'Tính năng mở rộng đang phát triển', type: 'info' })}
                                                className="action-btn p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-100"
                                                title="Mở rộng"
                                            >
                                                <Maximize2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'finance' && (
                                <div className="bg-white border text-sm text-slate-700 border-slate-200 shadow-sm rounded-xl overflow-hidden fade-in-up">
                                    <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-sm font-semibold text-slate-800">Thu chi</h3>
                                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-[10px] font-bold">
                                                {selectedContract.daThu > 0 ? '1' : '0'}
                                            </span>
                                        </div>
                                    </div>
                                    <table className="w-full text-left">
                                        <thead className="border-b border-slate-200 text-slate-800 font-semibold bg-white text-xs">
                                            <tr>
                                                <th className="px-4 py-3">Loại phiếu</th>
                                                <th className="px-4 py-3">Ngày</th>
                                                <th className="px-4 py-3 text-right">Số tiền</th>
                                                <th className="px-4 py-3">Nội dung</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {selectedContract.daThu > 0 ? (
                                                <tr className="bg-white hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <span className="text-green-600 italic font-semibold">Phiếu thu</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600">01/06/2025</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 border border-slate-200 font-medium">
                                                            {formatCurrency(selectedContract.daThu)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600">Thanh toán theo hợp đồng</td>
                                                </tr>
                                            ) : (
                                                <tr>
                                                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">
                                                        Chưa có phiếu thu/chi nào
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                    <div className="bg-white border-t border-slate-100 px-4 py-3 flex justify-end gap-3">
                                        <button
                                            onClick={() => setIsAddFinanceModalOpen(true)}
                                            className="action-btn p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-100"
                                            title="Thêm phiếu"
                                        >
                                            <Plus size={16} />
                                        </button>
                                        <button
                                            onClick={() => setToast({ message: 'Tính năng mở rộng đang phát triển', type: 'info' })}
                                            className="action-btn p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-100"
                                            title="Mở rộng"
                                        >
                                            <Maximize2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'tasks' && (
                                <div className="space-y-4 fade-in-up">
                                    <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                                        <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-semibold text-slate-800">Công việc CT</h3>
                                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold">0</span>
                                            </div>
                                        </div>
                                        <div className="px-4 py-10 text-center">
                                            <ClipboardList size={40} className="mx-auto text-slate-300 mb-3" />
                                            <p className="text-sm text-slate-400 italic">Chưa có dữ liệu</p>
                                            <p className="text-xs text-slate-400 mt-1">Chưa có công việc nào được thêm</p>
                                        </div>
                                        <div className="bg-white border-t border-slate-100 px-4 py-3 flex justify-end gap-3">
                                            <button
                                                onClick={() => setIsAddTaskModalOpen(true)}
                                                className="action-btn p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-100"
                                                title="Thêm công việc"
                                            >
                                                <Plus size={16} />
                                            </button>
                                            <button
                                                onClick={() => setToast({ message: 'Tính năng mở rộng đang phát triển', type: 'info' })}
                                                className="action-btn p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-100"
                                                title="Mở rộng"
                                            >
                                                <Maximize2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-end rounded-b-2xl">
                            <button
                                onClick={closeViewModal}
                                className="btn-secondary px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-sm"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {(isAddModalOpen || isEditModalOpen) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 modal-overlay p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-lg flex flex-col max-h-[90vh] modal-content">
                        <div className="px-6 py-4 flex justify-between items-center border-b border-slate-200">
                            <h2 className="text-lg font-bold text-slate-800">
                                {isEditModalOpen ? 'Chỉnh sửa hợp đồng' : 'Thêm hợp đồng mới'}
                            </h2>
                            <button
                                onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                                className="icon-btn p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-4">
                            {isAddModalOpen && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Dự án</label>
                                    <select
                                        value={formData.projectId}
                                        onChange={(e) => setFormData({ ...formData, projectId: Number(e.target.value) })}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    >
                                        {items.map(p => (
                                            <option key={p.id} value={p.id}>{p.projectName.substring(0, 80)}...</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Số hợp đồng</label>
                                <input type="text" value={formData.soHopDong} onChange={(e) => setFormData({ ...formData, soHopDong: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" placeholder="Nhập số hợp đồng..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tên gói thầu</label>
                                <input type="text" value={formData.tenGoiThau} onChange={(e) => setFormData({ ...formData, tenGoiThau: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" placeholder="Nhập tên gói thầu..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Loại dịch vụ</label>
                                    <input type="text" value={formData.loaiDichVu} onChange={(e) => setFormData({ ...formData, loaiDichVu: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" placeholder="Loại dịch vụ..." />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Ngày ký HĐ</label>
                                    <input type="text" value={formData.ngayKyHD} onChange={(e) => setFormData({ ...formData, ngayKyHD: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" placeholder="dd/mm/yyyy" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Giá trị HĐ</label>
                                    <input type="number" value={formData.giaTriHD} onChange={(e) => setFormData({ ...formData, giaTriHD: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" placeholder="0" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Giá trị QT</label>
                                    <input type="number" value={formData.giaTriQT} onChange={(e) => setFormData({ ...formData, giaTriQT: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" placeholder="0" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Đã thu</label>
                                    <input type="number" value={formData.daThu} onChange={(e) => setFormData({ ...formData, daThu: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" placeholder="0" />
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
                            <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="btn-secondary px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Hủy</button>
                            <button onClick={isEditModalOpen ? handleSaveEdit : handleSaveAdd} className="btn-primary ripple px-4 py-2 bg-[#9333EA] border border-[#9333EA] rounded-lg text-sm font-medium text-white hover:bg-purple-700">
                                {isEditModalOpen ? 'Cập nhật' : 'Thêm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-0 modal-overlay">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden modal-content">
                        <div className="px-6 py-5">
                            <h3 className="text-lg font-semibold text-slate-800 mb-2">Xác nhận xóa</h3>
                            <p className="text-sm text-slate-600">Bạn có chắc chắn muốn xóa hợp đồng này không? Hành động này không thể hoàn tác.</p>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                            <button onClick={cancelDelete} className="btn-secondary px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Hủy</button>
                            <button onClick={confirmDelete} className="btn-primary ripple px-4 py-2 bg-red-600 border border-red-600 rounded-lg text-sm font-medium text-white hover:bg-red-700">Xóa</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Add Document Modal */}
            {isAddDocumentModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white">
                            <h3 className="text-lg font-bold text-slate-800">Thêm tài liệu mới</h3>
                            <button onClick={() => setIsAddDocumentModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tên tài liệu</label>
                                <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" placeholder="Nhập tên tài liệu..." value={documentForm.name} onChange={e => setDocumentForm({ ...documentForm, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Loại tài liệu</label>
                                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-white" value={documentForm.type} onChange={e => setDocumentForm({ ...documentForm, type: e.target.value })}>
                                    <option value="">Chọn loại...</option>
                                    <option value="Hợp đồng">Hợp đồng</option>
                                    <option value="Biên bản">Biên bản</option>
                                    <option value="Phụ lục">Phụ lục</option>
                                </select>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                            <button onClick={() => setIsAddDocumentModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Hủy</button>
                            <button onClick={() => { setToast({ message: 'Đã thêm tài liệu thành công!', type: 'success' }); setIsAddDocumentModalOpen(false); }} className="px-4 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-md transition-colors">Thêm</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Finance Modal */}
            {isAddFinanceModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
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

            {/* Add Task Modal */}
            {isAddTaskModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white">
                            <h3 className="text-lg font-bold text-slate-800">Thêm công việc mới</h3>
                            <button onClick={() => setIsAddTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tên công việc</label>
                                <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" placeholder="Nhập tên công việc..." value={taskForm.name} onChange={e => setTaskForm({ ...taskForm, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Deadline</label>
                                <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" placeholder="dd/mm/yyyy" value={taskForm.deadline} onChange={e => setTaskForm({ ...taskForm, deadline: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Người thực hiện</label>
                                <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" placeholder="Nhập tên người thực hiện..." value={taskForm.assignee} onChange={e => setTaskForm({ ...taskForm, assignee: e.target.value })} />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                            <button onClick={() => setIsAddTaskModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Hủy</button>
                            <button onClick={() => { setToast({ message: 'Đã thêm công việc thành công!', type: 'success' }); setIsAddTaskModalOpen(false); }} className="px-4 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-md transition-colors">Thêm</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
