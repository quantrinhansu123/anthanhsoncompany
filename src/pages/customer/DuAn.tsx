import React, { useState } from 'react';
import { Search, Plus, Eye, Edit, Trash2, X, Maximize2, CheckCircle, PlusCircle } from 'lucide-react';
import { ThemDuAnModal } from './ThemDuAnModal';
import { useNavigate } from 'react-router-dom';

// Toast component
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
            <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded p-0.5 transition-colors"><X size={14} /></button>
        </div>
    );
}

const mockData = [
    {
        id: 1,
        projectName: "Hợp với đối tác TOffice",
        managerImg: "https://i.pravatar.cc/150?img=11",
        executorImg: "https://i.pravatar.cc/150?img=12",
        status: "Hoàn thành",
        statusColor: "text-emerald-600 bg-emerald-50 border border-emerald-200",
        progress: 100
    },
    {
        id: 2,
        projectName: "Khảo sát năng lượng",
        managerImg: "https://i.pravatar.cc/150?img=13",
        executorImg: "https://i.pravatar.cc/150?img=14",
        status: "Hoàn thành",
        statusColor: "text-emerald-600 bg-emerald-50 border border-emerald-200",
        progress: 100
    },
    {
        id: 3,
        projectName: "Hợp đồng lại",
        managerImg: "https://i.pravatar.cc/150?img=15",
        executorImg: "https://i.pravatar.cc/150?img=16",
        status: "Đang thực hiện",
        statusColor: "text-blue-600 bg-blue-50 border border-blue-200",
        progress: 65
    },
    {
        id: 4,
        projectName: "Khách hàng xác nhận",
        managerImg: "https://i.pravatar.cc/150?img=17",
        executorImg: "https://i.pravatar.cc/150?img=18",
        status: "Đang quá hạn",
        statusColor: "text-rose-600 bg-rose-50 border border-rose-200",
        progress: 45
    },
    {
        id: 5,
        projectName: "Gặp TOffice",
        managerImg: "https://i.pravatar.cc/150?img=19",
        executorImg: "https://i.pravatar.cc/150?img=20",
        status: "Từ chối",
        statusColor: "text-slate-600 bg-slate-100 border border-slate-200",
        progress: 15
    },
    {
        id: 6,
        projectName: "Xây dựng đề xuất kinh phí dự án",
        managerImg: "https://i.pravatar.cc/150?img=21",
        executorImg: "https://i.pravatar.cc/150?img=22",
        status: "Tạm dừng",
        statusColor: "text-amber-600 bg-amber-50 border border-amber-200",
        progress: 30
    }
];

export function DuAn() {
    const [items, setItems] = useState(mockData);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState<any>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [modalData, setModalData] = useState<any>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState('info');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);
    const navigate = useNavigate();

    const handleViewClick = (project: any) => {
        setSelectedProject(project);
        setActiveTab('info');
        setIsViewModalOpen(true);
    };

    const closeViewModal = () => {
        setIsViewModalOpen(false);
        setSelectedProject(null);
    };

    const handleAddClick = () => {
        setModalData(null);
        setIsAddModalOpen(true);
    };

    const handleEditClick = (project: any) => {
        setModalData(project);
        setIsAddModalOpen(true);
    };

    const handleDeleteClick = (id: number) => {
        setProjectToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (projectToDelete !== null) {
            setItems(items.filter((item: any) => item.id !== projectToDelete));
            setIsDeleteModalOpen(false);
            setProjectToDelete(null);
        }
    };

    const cancelDelete = () => {
        setIsDeleteModalOpen(false);
        setProjectToDelete(null);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Hoàn thành': return "text-emerald-600 bg-emerald-50 border border-emerald-200";
            case 'Đang thực hiện': return "text-blue-600 bg-blue-50 border border-blue-200";
            case 'Đang quá hạn': return "text-rose-600 bg-rose-50 border border-rose-200";
            case 'Tạm dừng': return "text-amber-600 bg-amber-50 border border-amber-200";
            case 'Từ chối': return "text-slate-600 bg-slate-100 border border-slate-200";
            default: return "text-slate-600 bg-slate-100 border border-slate-200";
        }
    };

    const [isAddContractModalOpen, setIsAddContractModalOpen] = useState(false);
    const [contractFormData, setContractFormData] = useState({
        soHopDong: '',
        tenGoiThau: '',
        ngayKyHD: '',
        fileStatus: 'Chưa có file'
    });

    const handleSaveProject = (data: any) => {
        if (data.id) {
            setItems(items.map((item: any) => item.id === data.id ? { ...data, statusColor: getStatusColor(data.status) } : item));
        } else {
            setItems([{
                ...data,
                id: Date.now(),
                statusColor: getStatusColor(data.status),
                progress: Number(data.progress) || 0
            }, ...items]);
        }
    };

    const handleSaveContract = () => {
        setToast({ message: 'Đã thêm hợp đồng mới thành công!', type: 'success' });
        setIsAddContractModalOpen(false);
        setContractFormData({ soHopDong: '', tenGoiThau: '', ngayKyHD: '', fileStatus: 'Chưa có file' });
    };

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* Toast */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="bg-white rounded-md border border-slate-200 overflow-hidden shadow-sm">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white">
                    <h1 className="text-[16px] font-bold text-slate-700 uppercase">
                        Dự án
                    </h1>
                    <button
                        onClick={handleAddClick}
                        className="flex items-center gap-2 px-4 py-2 bg-[#9333EA] hover:bg-purple-700 text-white text-sm font-medium rounded-md transition-colors shadow-sm"
                    >
                        <Plus size={16} />
                        Thêm dự án
                    </button>
                </div>

                {/* Table Content */}
                <div className="w-full overflow-x-auto bg-white p-4 md:p-6">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="border-b border-slate-200 text-slate-500 bg-slate-50/50">
                                <th className="py-4 pl-4 md:pl-6 pr-4 font-semibold text-xs uppercase tracking-wider rounded-tl-lg">Tên dự án</th>
                                <th className="py-4 px-4 text-center font-semibold text-xs uppercase tracking-wider min-w-[120px]">Người quản lý</th>
                                <th className="py-4 px-4 text-center font-semibold text-xs uppercase tracking-wider min-w-[120px]">Người thực thi</th>
                                <th className="py-4 px-4 text-center font-semibold text-xs uppercase tracking-wider min-w-[140px]">Trạng thái</th>
                                <th className="py-4 pr-4 md:pr-6 pl-4 text-center font-semibold text-xs uppercase tracking-wider min-w-[180px]">Tiến độ</th>
                                <th className="py-4 px-4 text-center font-semibold text-xs uppercase tracking-wider min-w-[100px] rounded-tr-lg">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.map((item, index) => (
                                <tr key={item.id} className="hover:bg-blue-50/30 transition-all group duration-200 ease-in-out">
                                    <td className="py-4 pl-4 md:pl-6 pr-4 align-middle">
                                        <div className="flex items-center gap-4">
                                            <div className="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center shrink-0 bg-white group-hover:border-blue-300">
                                                <div className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-blue-500 transition-colors"></div>
                                            </div>
                                            <span className="font-semibold text-slate-700 text-[15px]">{item.projectName}</span>
                                        </div>
                                    </td>

                                    <td className="py-4 px-4 align-middle">
                                        <div className="flex justify-center">
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-200 group-hover:ring-blue-200 transition-all">
                                                    <img src={item.managerImg} alt="Manager" className="w-full h-full object-cover" />
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="py-4 px-4 align-middle">
                                        <div className="flex justify-center">
                                            <div className="relative">
                                                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-200 group-hover:ring-blue-200 transition-all">
                                                    <img src={item.executorImg} alt="Executor" className="w-full h-full object-cover" />
                                                </div>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="py-4 px-4 align-middle">
                                        <div className="flex justify-center">
                                            <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-wide shadow-sm ${item.statusColor}`}>
                                                {item.status}
                                            </span>
                                        </div>
                                    </td>

                                    <td className="py-4 pr-4 md:pr-6 pl-4 align-middle">
                                        <div className="flex items-center gap-4">
                                            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden relative shadow-inner">
                                                <div
                                                    className={`absolute left-0 top-0 bottom-0 rounded-full transition-all duration-1000 ease-out ${item.progress === 100
                                                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                                                        : item.progress > 50
                                                            ? 'bg-gradient-to-r from-blue-400 to-blue-500'
                                                            : 'bg-gradient-to-r from-amber-400 to-amber-500'
                                                        }`}
                                                    style={{ width: `${item.progress}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-xs font-bold text-slate-600 w-9 text-right tabular-nums">{item.progress}%</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 align-middle text-center">
                                        <div className="flex items-center justify-center gap-2 transition-opacity">
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
            </div>

            {/* View Modal with Tabs */}
            {
                isViewModalOpen && selectedProject && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-in fade-in duration-200 p-4">
                        <div className="bg-[#FAF9FB] w-full max-w-4xl rounded-2xl shadow-lg flex flex-col max-h-[90vh]">
                            {/* Modal Header */}
                            <div className="px-6 py-4 flex justify-between items-center bg-white rounded-t-2xl">
                                <h2 className="text-lg font-bold text-slate-800">Chi tiết dự án</h2>
                                <button
                                    onClick={closeViewModal}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Tabs Navigation */}
                            <div className="border-b border-slate-200 bg-white">
                                <nav className="flex -mb-px px-6 gap-6" aria-label="Tabs">
                                    {[
                                        { id: 'info', label: 'Thông tin dự án' },
                                        { id: 'contracts', label: 'Hợp đồng' },
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
                                    <div className="bg-white border text-sm text-slate-700 border-slate-200 shadow-sm rounded-xl">
                                        {[
                                            { label: 'Tên dự án', value: selectedProject.projectName },
                                            { label: 'Ngày', value: '2/3/2026' },
                                            { label: 'Giờ', value: '2:45:51 PM' },
                                            { label: 'Trạng thái', value: selectedProject.status },
                                            { label: 'Tiến độ', value: `${selectedProject.progress}%` },
                                        ].map((row, index) => (
                                            <div key={index} className="flex px-4 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                                <div className="w-[180px] shrink-0 text-slate-500 font-medium">{row.label}</div>
                                                <div className="flex-1 text-slate-800 font-medium">{row.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {activeTab === 'contracts' && (
                                    <div className="bg-white border text-sm text-slate-700 border-slate-200 shadow-sm rounded-xl overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead className="border-b border-slate-200 text-slate-800 font-semibold bg-white text-xs">
                                                    <tr>
                                                        <th className="px-4 py-3 whitespace-nowrap">Trạng thái file</th>
                                                        <th className="px-4 py-3 whitespace-nowrap">Ngày ký HĐ</th>
                                                        <th className="px-4 py-3 whitespace-nowrap">Số hợp đồng</th>
                                                        <th className="px-4 py-3 whitespace-nowrap">Tên gói thầu</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    <tr>
                                                        <td className="px-4 py-3" colSpan={4}>
                                                            <div className="text-red-600 font-medium flex items-center gap-1">
                                                                <span>★</span>
                                                                <span className="italic">{selectedProject.projectName}</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    <tr className="bg-white">
                                                        <td className="px-4 py-3 font-semibold text-red-600 italic">Thiếu file: HĐ, BBNT, BBTL, BB...</td>
                                                        <td className="px-4 py-3 text-slate-600">5/9/2025</td>
                                                        <td className="px-4 py-3 text-slate-600">2025/05/18-TTQT&QLHT</td>
                                                        <td className="px-4 py-3 text-slate-600">Tư vấn thẩm tra</td>
                                                    </tr>
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
                                                onClick={() => setIsAddContractModalOpen(true)}
                                                className="action-btn p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-100"
                                                title="Thêm hợp đồng"
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
                                    onClick={closeViewModal}
                                    className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-sm transition-colors"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Add Contract Modal */}
            {isAddContractModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800">Thêm hợp đồng mới</h3>
                            <button onClick={() => setIsAddContractModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
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
                                <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" placeholder="dd/mm/yyyy" value={contractFormData.ngayKyHD} onChange={e => setContractFormData({ ...contractFormData, ngayKyHD: e.target.value })} />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                            <button onClick={() => setIsAddContractModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg">Hủy</button>
                            <button onClick={handleSaveContract} className="px-4 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-md">Thêm</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add/Edit Project Modal */}
            <ThemDuAnModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                initialData={modalData}
                onSave={handleSaveProject}
            />

            {/* Custom Delete Confirmation Modal */}
            {
                isDeleteModalOpen && (

                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-0 modal-overlay">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden modal-content">
                            <div className="px-6 py-5">
                                <h3 className="text-lg font-semibold text-slate-800 mb-2">Xác nhận xóa</h3>
                                <p className="text-sm text-slate-600">Bạn có chắc chắn muốn xóa dự án này không? Hành động này không thể hoàn tác.</p>
                            </div>
                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                                <button
                                    onClick={cancelDelete}
                                    className="btn-secondary px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                                >
                                    Hủy
                                </button>
                                <button
                                    onClick={() => { confirmDelete(); setToast({ message: 'Đã xóa dự án thành công!', type: 'warning' }); }}
                                    className="btn-primary ripple px-4 py-2 bg-red-600 border border-red-600 rounded-lg text-sm font-medium text-white hover:bg-red-700"
                                >
                                    Xóa
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
