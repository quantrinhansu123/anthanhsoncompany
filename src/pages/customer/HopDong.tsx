import React, { useEffect, useState } from 'react';
import { Search, Plus, Eye, Edit, Trash2, X, ChevronRight, ChevronDown, FileText, Upload, FolderOpen, ClipboardList, PlusCircle, Maximize2, ExternalLink, CheckCircle, FileCheck, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { contractService, ContractRow } from '../../lib/services/contractService';
import { projectService } from '../../lib/services/projectService';
import { taskService, TaskRow } from '../../lib/services/taskService';
import { employeeService } from '../../lib/services/employeeService';
import { supabase } from '../../lib/supabase';

interface Contract {
    id: number;
    uuid?: string; // UUID thực sự từ database
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
    nhanSuId?: string | null;
    nhanSuTen?: string | null;
    nhanSuCode?: string | null;
}

interface ProjectGroup {
    id: number;
    projectName: string;
    contracts: Contract[];
}

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
    const [searchParams, setSearchParams] = useSearchParams();
    const filterProject = searchParams.get('project'); // Filter theo tên dự án từ URL
    
    const [items, setItems] = useState<ProjectGroup[]>([]);
    const [projects, setProjects] = useState<Array<{ id: string; ten_du_an: string }>>([]);
    const [employees, setEmployees] = useState<Array<{ id: string; full_name: string; code: string }>>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedProjects, setExpandedProjects] = useState<number[]>([]);
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
    
    // State for tasks
    const [tasks, setTasks] = useState<TaskRow[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(false);
    
    // State for tasks by contract (for progress display in table)
    const [tasksByContract, setTasksByContract] = useState<Map<string, TaskRow[]>>(new Map());
    
    // State for nghiệm thu modal
    const [isNghiemThuModalOpen, setIsNghiemThuModalOpen] = useState(false);
    const [selectedTaskForNghiemThu, setSelectedTaskForNghiemThu] = useState<TaskRow | null>(null);
    const [nghiemThuForm, setNghiemThuForm] = useState({
        tien_do: 0,
        link_tai_lieu: '',
        anh_bang_chung: null as File | null,
        anh_bang_chung_url: '' as string | null
    });
    const [uploadingImage, setUploadingImage] = useState(false);

    // Form states for tab modals
    const [documentForm, setDocumentForm] = useState({ name: '', type: '' });
    const [financeForm, setFinanceForm] = useState({ type: 'Phiếu thu', amount: '', note: '' });
    const [taskForm, setTaskForm] = useState({ 
        ten_task: '', 
        mo_ta: '', 
        trang_thai: 'Chưa bắt đầu', 
        uu_tien: 'Trung bình',
        ngay_bat_dau: '', 
        ngay_ket_thuc: '', 
        nguoi_phu_trach: '',
        tien_do: 0,
        ghi_chu: ''
    });

    // Add form state
    const [formData, setFormData] = useState({
        soHopDong: '',
        tenGoiThau: '',
        loaiDichVu: '',
        ngayKyHD: '',
        giaTriHD: '',
        giaTriQT: '',
        daThu: '',
        projectId: '',
        nhanSuId: '',
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

    const loadTasks = async () => {
        if (!selectedContract?.uuid) {
            setTasks([]);
            return;
        }
        
        setLoadingTasks(true);
        try {
            const taskList = await taskService.getByHopDongId(selectedContract.uuid);
            setTasks(taskList);
            console.log('[HopDong] Loaded tasks:', taskList);
        } catch (error) {
            console.error('[HopDong] Error loading tasks:', error);
            setTasks([]);
        } finally {
            setLoadingTasks(false);
        }
    };

    const handleViewClick = (contract: Contract, projectName: string) => {
        console.log('handleViewClick - contract:', contract);
        setSelectedContract(contract);
        setSelectedProjectName(projectName);
        setActiveTab('info');
        setIsViewModalOpen(true);
    };
    
    // Load tasks when selectedContract changes or when switching to tasks tab
    useEffect(() => {
        if (selectedContract?.uuid && activeTab === 'tasks') {
            loadTasks();
        }
    }, [selectedContract?.uuid, activeTab]);
    
    // Load tasks when viewing contract info to calculate progress
    useEffect(() => {
        if (selectedContract?.uuid && isViewModalOpen) {
            loadTasks();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedContract?.uuid, isViewModalOpen]);
    
    // Calculate contract progress based on tasks
    const calculateContractProgress = () => {
        if (tasks.length === 0) return 0;
        const completedTasks = tasks.filter(task => task.tien_do === 100).length;
        return Math.round((completedTasks / tasks.length) * 100);
    };
    
    const contractProgress = calculateContractProgress();

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
            nhanSuId: contract.nhanSuId || '',
        });
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = async () => {
        if (!editingContract?.uuid || !editingProjectId) return;
        const giaTriHD = Number(formData.giaTriHD) || 0;
        const giaTriQT = Number(formData.giaTriQT) || 0;
        const daThu = Number(formData.daThu) || 0;

        try {
            const selectedProject = projects.find(p => p.id === formData.projectId);
            await contractService.update(editingContract.uuid, {
                du_an_id: formData.projectId || null,
                project_name: selectedProject?.ten_du_an || null,
                nhan_su_id: formData.nhanSuId || null,
                so_hop_dong: formData.soHopDong || null,
                ten_goi_thau: formData.tenGoiThau || null,
                loai_dich_vu: formData.loaiDichVu || null,
                ngay_ky_hd: formData.ngayKyHD || null,
                gia_tri_hd: giaTriHD,
                gia_tri_qt: giaTriQT,
                da_thu: daThu,
                con_phai_thu: giaTriQT - daThu,
                ngay_update: new Date().toISOString().slice(0, 10),
            });

            // Reload data
            const rows = await contractService.getAll();
            const groups = new Map<string, ContractRow[]>();
            rows.forEach(row => {
                const key = row.project_name || '(Chưa có tên dự án)';
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key)!.push(row);
            });

            let idCounter = 1;
            const projectGroups: ProjectGroup[] = Array.from(groups.entries()).map(([projectName, contracts]) => ({
                id: idCounter++,
                projectName,
                contracts: contracts.map((c, idx) => ({
                    id: idx + 1,
                    uuid: c.id,
                    fileStatus: c.file_status || 'Chưa có file',
                    ngayKyHD: c.ngay_ky_hd ? new Date(c.ngay_ky_hd).toLocaleDateString('vi-VN') : '',
                    soHopDong: c.so_hop_dong || '',
                    tenGoiThau: c.ten_goi_thau || '',
                    loaiDichVu: c.loai_dich_vu || '',
                    giaTriHD: Number(c.gia_tri_hd || 0),
                    giaTriQT: Number(c.gia_tri_qt || 0),
                    daThu: Number(c.da_thu || 0),
                    conPhaiThu: Number(c.con_phai_thu || 0),
                    ngayUpdate: c.ngay_update ? new Date(c.ngay_update).toLocaleDateString('vi-VN') : '',
                    nhanSuId: c.nhan_su_id || null,
                    nhanSuTen: c.nhan_su_ten || null,
                    nhanSuCode: c.nhan_su_code || null,
                })),
            }));
            setItems(projectGroups);

            setIsEditModalOpen(false);
            setEditingContract(null);
            setToast({ message: 'Đã cập nhật hợp đồng thành công!', type: 'success' });
        } catch (error: any) {
            console.error('[HopDong] Error updating contract:', error);
            setToast({ message: error.message || 'Cập nhật hợp đồng thất bại!', type: 'warning' });
        }
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
            projectId: projects[0]?.id || '',
            nhanSuId: '',
        });
        setIsAddModalOpen(true);
    };

    const handleSaveAdd = async () => {
        if (!formData.projectId) {
            setToast({ message: 'Vui lòng chọn dự án', type: 'warning' });
            return;
        }

        const giaTriHD = Number(formData.giaTriHD) || 0;
        const giaTriQT = Number(formData.giaTriQT) || 0;
        const daThu = Number(formData.daThu) || 0;

        const selectedProject = projects.find(p => p.id === formData.projectId);

        // Ghi xuống bảng hop_dong
        try {
            const created = await contractService.create({
                du_an_id: formData.projectId || null, // Sử dụng du_an_id thay vì project_name
                project_name: selectedProject?.ten_du_an || null, // Giữ lại để backward compatibility
                nhan_su_id: formData.nhanSuId || null, // Foreign key đến nhan_su
                so_hop_dong: formData.soHopDong || null,
                ten_goi_thau: formData.tenGoiThau || null,
                loai_dich_vu: formData.loaiDichVu || null,
                ngay_ky_hd: formData.ngayKyHD || null,
                gia_tri_hd: giaTriHD,
                gia_tri_qt: giaTriQT,
                da_thu: daThu,
                con_phai_thu: giaTriQT - daThu,
                file_status: 'Chưa có file',
                ngay_update: new Date().toISOString().slice(0, 10),
            });

            if (!created) {
                setToast({ message: 'Không lưu được hợp đồng. Vui lòng thử lại.', type: 'warning' });
                return;
            }

        // Cập nhật UI: nhóm lại theo project_name như useEffect đang làm
        const projectName = created.project_name || '(Chưa có tên dự án)';
        setItems(prev => {
            // tìm group theo projectName
            const existing = prev.find(p => p.projectName === projectName);
            const newContract: Contract = {
                id: Date.now(),
                uuid: created.id, // Lưu UUID thực sự từ database
                fileStatus: created.file_status || 'Chưa có file',
                ngayKyHD: created.ngay_ky_hd ? new Date(created.ngay_ky_hd).toLocaleDateString('vi-VN') : '',
                soHopDong: created.so_hop_dong || '',
                tenGoiThau: created.ten_goi_thau || '',
                loaiDichVu: created.loai_dich_vu || '',
                giaTriHD: Number(created.gia_tri_hd || 0),
                giaTriQT: Number(created.gia_tri_qt || 0),
                daThu: Number(created.da_thu || 0),
                conPhaiThu: Number(created.con_phai_thu || 0),
                ngayUpdate: created.ngay_update ? new Date(created.ngay_update).toLocaleDateString('vi-VN') : '',
            };

            if (!existing) {
                const newId = (prev[prev.length - 1]?.id || 0) + 1;
                return [
                    ...prev,
                    {
                        id: newId,
                        projectName,
                        contracts: [newContract],
                    },
                ];
            }

            return prev.map(p =>
                p.projectName === projectName
                    ? { ...p, contracts: [...p.contracts, newContract] }
                    : p
            );
        });

            setIsAddModalOpen(false);
            setToast({ message: 'Đã thêm hợp đồng mới thành công!', type: 'success' });
        } catch (error: any) {
            console.error('[HopDong] Error saving contract:', error);
            let errorMessage = 'Không lưu được hợp đồng. Vui lòng thử lại.';
            
            if (error?.code === '42501' || error?.message?.includes('permission') || error?.message?.includes('policy')) {
                errorMessage = 'Lỗi phân quyền. Vui lòng kiểm tra RLS policies trong Supabase.';
            } else if (error?.code === '23502' || error?.message?.includes('null value')) {
                errorMessage = 'Thiếu thông tin bắt buộc. Vui lòng kiểm tra lại các trường.';
            } else if (error?.message) {
                errorMessage = `Lỗi: ${error.message}`;
            }
            
            setToast({ message: errorMessage, type: 'warning' });
        }
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

    // Load projects from du_an table
    useEffect(() => {
        (async () => {
            const projectList = await projectService.getAll();
            setProjects(projectList.map(p => ({ id: p.id, ten_du_an: p.ten_du_an })));
        })();
    }, []);

    // Load employees from nhan_su table
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

    // Load data from hop_dong table
    useEffect(() => {
        (async () => {
            const rows = await contractService.getAll();
            // Group by project_name
            const groups = new Map<string, ContractRow[]>();
            rows.forEach(row => {
                const key = row.project_name || '(Chưa có tên dự án)';
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key)!.push(row);
            });

            let idCounter = 1;
            const projectGroups: ProjectGroup[] = Array.from(groups.entries()).map(([projectName, contracts]) => ({
                id: idCounter++,
                projectName,
                contracts: contracts.map((c, idx) => ({
                    id: idx + 1,
                    uuid: c.id, // Lưu UUID thực sự từ database
                    fileStatus: c.file_status || 'Chưa có file',
                    ngayKyHD: c.ngay_ky_hd ? new Date(c.ngay_ky_hd).toLocaleDateString('vi-VN') : '',
                    soHopDong: c.so_hop_dong || '',
                    tenGoiThau: c.ten_goi_thau || '',
                    loaiDichVu: c.loai_dich_vu || '',
                    giaTriHD: Number(c.gia_tri_hd || 0),
                    giaTriQT: Number(c.gia_tri_qt || 0),
                    daThu: Number(c.da_thu || 0),
                    conPhaiThu: Number(c.con_phai_thu || 0),
                    ngayUpdate: c.ngay_update ? new Date(c.ngay_update).toLocaleDateString('vi-VN') : '',
                    nhanSuId: c.nhan_su_id || null,
                    nhanSuTen: c.nhan_su_ten || null,
                    nhanSuCode: c.nhan_su_code || null,
                })),
            }));

            setItems(projectGroups);
            setExpandedProjects(projectGroups.map(p => p.id));
            
            // Load tasks for all contracts to calculate progress
            const tasksMap = new Map<string, TaskRow[]>();
            await Promise.all(
                rows.map(async (row) => {
                    try {
                        const contractTasks = await taskService.getByHopDongId(row.id);
                        tasksMap.set(row.id, contractTasks);
                    } catch (error) {
                        console.error(`[HopDong] Error loading tasks for contract ${row.id}:`, error);
                        tasksMap.set(row.id, []);
                    }
                })
            );
            setTasksByContract(tasksMap);
        })();
    }, []);
    
    // Calculate progress for a contract
    const getContractProgress = (contractUuid: string | undefined) => {
        if (!contractUuid) return 0;
        const contractTasks = tasksByContract.get(contractUuid) || [];
        if (contractTasks.length === 0) return 0;
        const completedTasks = contractTasks.filter(task => task.tien_do === 100).length;
        return Math.round((completedTasks / contractTasks.length) * 100);
    };

    // Filter by search term and project filter from URL
    const filteredItems = items
        .filter(project => {
            // Filter theo project từ URL nếu có
            if (filterProject) {
                return project.projectName === filterProject;
            }
            return true;
        })
        .map(project => ({
            ...project,
            contracts: project.contracts.filter(c =>
                !searchTerm ||
                c.soHopDong.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.tenGoiThau.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.loaiDichVu.toLowerCase().includes(searchTerm.toLowerCase()) ||
                project.projectName.toLowerCase().includes(searchTerm.toLowerCase())
            )
        }))
        .filter(project => project.contracts.length > 0 || project.projectName.toLowerCase().includes(searchTerm.toLowerCase()));

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
                                <th className="py-3.5 px-3 font-semibold text-xs uppercase tracking-wider min-w-[150px]">Nhân sự phụ trách</th>
                                <th className="py-3.5 px-3 font-semibold text-xs uppercase tracking-wider min-w-[110px]">Loại dịch vụ</th>
                                <th className="py-3.5 px-3 font-semibold text-xs uppercase tracking-wider text-right min-w-[120px]">Giá trị HĐ</th>
                                <th className="py-3.5 px-3 font-semibold text-xs uppercase tracking-wider text-right min-w-[120px]">Giá trị QT</th>
                                <th className="py-3.5 px-3 font-semibold text-xs uppercase tracking-wider text-right min-w-[110px]">Đã thu</th>
                                <th className="py-3.5 px-3 font-semibold text-xs uppercase tracking-wider text-right min-w-[110px]">Còn phải thu</th>
                                <th className="py-3.5 px-3 font-semibold text-xs uppercase tracking-wider min-w-[120px]">Tiến độ</th>
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
                                        <td colSpan={12} className="py-3 px-3">
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
                                            <td className="py-3 px-3 text-slate-600 text-[12px]">
                                                {contract.nhanSuTen ? (
                                                    <span className="flex items-center gap-1">
                                                        {contract.nhanSuCode && <span className="text-slate-400">[{contract.nhanSuCode}]</span>}
                                                        {contract.nhanSuTen}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 italic">—</span>
                                                )}
                                            </td>
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
                                            <td className="py-3 px-3">
                                                {(() => {
                                                    const progress = getContractProgress(contract.uuid);
                                                    const contractTasks = tasksByContract.get(contract.uuid || '') || [];
                                                    return (
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden min-w-[60px]">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-300 ${
                                                                        progress === 100 ? 'bg-emerald-500' :
                                                                        progress >= 75 ? 'bg-blue-500' :
                                                                        progress >= 50 ? 'bg-yellow-500' :
                                                                        progress >= 25 ? 'bg-orange-500' :
                                                                        'bg-slate-400'
                                                                    }`}
                                                                    style={{ width: `${progress}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-xs font-medium text-slate-600 w-10 text-right">{progress}%</span>
                                                            {contractTasks.length > 0 && (
                                                                <span className="text-xs text-slate-400">({contractTasks.filter(t => t.tien_do === 100).length}/{contractTasks.length})</span>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
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

                                    {/* Task Progress */}
                                    <div className="bg-white border text-sm text-slate-700 border-slate-200 shadow-sm rounded-xl">
                                        <div className="px-4 py-3 border-b border-slate-200 bg-white rounded-t-xl">
                                            <h3 className="text-sm font-semibold text-slate-800">Tiến độ công việc</h3>
                                        </div>
                                        <div className="px-4 py-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-sm text-slate-600 font-medium">Hoàn thành: {tasks.filter(t => t.tien_do === 100).length} / {tasks.length} task</span>
                                                <span className="text-sm font-bold text-slate-800">{contractProgress}%</span>
                                            </div>
                                            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-500 ${
                                                        contractProgress === 100 ? 'bg-emerald-500' :
                                                        contractProgress >= 75 ? 'bg-blue-500' :
                                                        contractProgress >= 50 ? 'bg-yellow-500' :
                                                        contractProgress >= 25 ? 'bg-orange-500' :
                                                        'bg-slate-400'
                                                    }`}
                                                    style={{ width: `${contractProgress}%` }}
                                                />
                                            </div>
                                            {tasks.length === 0 && (
                                                <p className="text-xs text-slate-400 mt-2 italic">Chưa có task nào</p>
                                            )}
                                        </div>
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
                                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold">{tasks.length}</span>
                                            </div>
                                        </div>
                                        {loadingTasks ? (
                                            <div className="px-4 py-10 text-center">
                                                <p className="text-sm text-slate-400">Đang tải...</p>
                                            </div>
                                        ) : tasks.length === 0 ? (
                                            <div className="px-4 py-10 text-center">
                                                <ClipboardList size={40} className="mx-auto text-slate-300 mb-3" />
                                                <p className="text-sm text-slate-400 italic">Chưa có dữ liệu</p>
                                                <p className="text-xs text-slate-400 mt-1">Chưa có công việc nào được thêm</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-slate-100">
                                                {tasks.map((task) => (
                                                    <div key={task.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <h4 className="text-sm font-medium text-slate-800">{task.ten_task}</h4>
                                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                                        task.trang_thai === 'Hoàn thành' ? 'bg-emerald-100 text-emerald-700' :
                                                                        task.trang_thai === 'Đang thực hiện' ? 'bg-blue-100 text-blue-700' :
                                                                        task.trang_thai === 'Tạm dừng' ? 'bg-amber-100 text-amber-700' :
                                                                        'bg-slate-100 text-slate-700'
                                                                    }`}>
                                                                        {task.trang_thai}
                                                                    </span>
                                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                                        task.uu_tien === 'Khẩn cấp' ? 'bg-red-100 text-red-700' :
                                                                        task.uu_tien === 'Cao' ? 'bg-orange-100 text-orange-700' :
                                                                        task.uu_tien === 'Trung bình' ? 'bg-blue-100 text-blue-700' :
                                                                        'bg-slate-100 text-slate-700'
                                                                    }`}>
                                                                        {task.uu_tien}
                                                                    </span>
                                                                </div>
                                                                {task.nguoi_phu_trach && (
                                                                    <p className="text-xs text-slate-500 mb-1">Người phụ trách: {task.nguoi_phu_trach}</p>
                                                                )}
                                                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                                                    {task.ngay_bat_dau && <span>Bắt đầu: {new Date(task.ngay_bat_dau).toLocaleDateString('vi-VN')}</span>}
                                                                    {task.ngay_ket_thuc && <span>• Kết thúc: {new Date(task.ngay_ket_thuc).toLocaleDateString('vi-VN')}</span>}
                                                                </div>
                                                                <div className="mt-2 flex items-center gap-2">
                                                                    <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                                                                        <div
                                                                            className="bg-blue-600 h-1.5 rounded-full transition-all"
                                                                            style={{ width: `${task.tien_do}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-xs font-medium text-slate-600 w-10 text-right">{task.tien_do}%</span>
                                                                </div>
                                                                {(task.link_tai_lieu || task.anh_bang_chung) && (
                                                                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                                                                        {task.link_tai_lieu && (
                                                                            <a href={task.link_tai_lieu} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                                                                                <LinkIcon size={12} />
                                                                                Tài liệu
                                                                            </a>
                                                                        )}
                                                                        {task.anh_bang_chung && (
                                                                            <a href={task.anh_bang_chung} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                                                                                <ImageIcon size={12} />
                                                                                Ảnh bằng chứng
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        setSelectedTaskForNghiemThu(task);
                                                                        setNghiemThuForm({
                                                                            tien_do: task.tien_do,
                                                                            link_tai_lieu: task.link_tai_lieu || '',
                                                                            anh_bang_chung: null,
                                                                            anh_bang_chung_url: task.anh_bang_chung || null
                                                                        });
                                                                        setIsNghiemThuModalOpen(true);
                                                                    }}
                                                                    className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md border border-emerald-100 transition-colors"
                                                                    title="Nghiệm thu"
                                                                >
                                                                    <FileCheck size={16} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        <div className="bg-white border-t border-slate-100 px-4 py-3 flex justify-end gap-3">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    console.log('[HopDong] Click thêm công việc');
                                                    console.log('[HopDong] selectedContract:', selectedContract);
                                                    console.log('[HopDong] selectedContract.uuid:', selectedContract?.uuid);
                                                    
                                                    if (!selectedContract) {
                                                        console.error('[HopDong] selectedContract is null');
                                                        setToast({ message: 'Không tìm thấy hợp đồng. Vui lòng thử lại.', type: 'warning' });
                                                        return;
                                                    }
                                                    
                                                    if (!selectedContract.uuid) {
                                                        console.error('[HopDong] selectedContract.uuid is missing');
                                                        setToast({ message: 'Hợp đồng chưa có UUID. Vui lòng tải lại trang.', type: 'warning' });
                                                        return;
                                                    }
                                                    
                                                    setTaskForm({ 
                                                        ten_task: '', 
                                                        mo_ta: '', 
                                                        trang_thai: 'Chưa bắt đầu', 
                                                        uu_tien: 'Trung bình',
                                                        ngay_bat_dau: '', 
                                                        ngay_ket_thuc: '', 
                                                        nguoi_phu_trach: '',
                                                        tien_do: 0,
                                                        ghi_chu: ''
                                                    });
                                                    
                                                    console.log('[HopDong] Opening task modal');
                                                    setIsAddTaskModalOpen(true);
                                                }}
                                                className="action-btn p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-100 cursor-pointer relative z-10"
                                                title="Thêm công việc"
                                                style={{ pointerEvents: 'auto' }}
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
                                        onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                                    >
                                        <option value="">-- Chọn dự án --</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.ten_du_an}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nhân sự phụ trách</label>
                                <select
                                    value={formData.nhanSuId}
                                    onChange={(e) => setFormData({ ...formData, nhanSuId: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                                >
                                    <option value="">-- Chọn nhân sự (tùy chọn) --</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.code ? `${emp.code} - ` : ''}{emp.full_name}
                                        </option>
                                    ))}
                                </select>
                            </div>
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
                                    <input 
                                        type="date" 
                                        value={formData.ngayKyHD} 
                                        onChange={(e) => setFormData({ ...formData, ngayKyHD: e.target.value })} 
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" 
                                    />
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
                                <input type="text" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" placeholder="Nhập tên tài liệu..." value={documentForm.name || ''} onChange={e => setDocumentForm({ ...documentForm, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Loại tài liệu</label>
                                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-white" value={documentForm.type || ''} onChange={e => setDocumentForm({ ...documentForm, type: e.target.value })}>
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
                                <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 bg-white" value={financeForm.type || 'Phiếu thu'} onChange={e => setFinanceForm({ ...financeForm, type: e.target.value })}>
                                    <option value="Phiếu thu">Phiếu thu</option>
                                    <option value="Phiếu chi">Phiếu chi</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Số tiền</label>
                                <input 
                                    type="text" 
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" 
                                    placeholder="0" 
                                    value={financeForm.amount ? (typeof financeForm.amount === 'string' ? (Number(financeForm.amount.replace(/\./g, '')) || 0).toLocaleString('vi-VN') : financeForm.amount.toLocaleString('vi-VN')) : ''} 
                                    onChange={e => {
                                        const value = e.target.value.replace(/\./g, '').replace(/[^\d]/g, '');
                                        setFinanceForm({ ...financeForm, amount: value });
                                    }}
                                    onBlur={e => {
                                        const value = e.target.value.replace(/\./g, '').replace(/[^\d]/g, '');
                                        setFinanceForm({ ...financeForm, amount: value });
                                    }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nội dung</label>
                                <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" placeholder="Nhập nội dung..." rows={3} value={financeForm.note || ''} onChange={e => setFinanceForm({ ...financeForm, note: e.target.value })}></textarea>
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
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        setIsAddTaskModalOpen(false);
                    }
                }}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white">
                            <h3 className="text-lg font-bold text-slate-800">Thêm công việc mới</h3>
                            <button onClick={() => setIsAddTaskModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tên công việc *</label>
                                <input 
                                    type="text" 
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" 
                                    placeholder="Nhập tên công việc..." 
                                    value={taskForm.ten_task || ''} 
                                    onChange={e => setTaskForm({ ...taskForm, ten_task: e.target.value })} 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Mô tả</label>
                                <textarea 
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" 
                                    rows={3}
                                    placeholder="Nhập mô tả công việc..." 
                                    value={taskForm.mo_ta || ''} 
                                    onChange={e => setTaskForm({ ...taskForm, mo_ta: e.target.value })} 
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Trạng thái</label>
                                    <select 
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                                        value={taskForm.trang_thai}
                                        onChange={e => setTaskForm({ ...taskForm, trang_thai: e.target.value })}
                                    >
                                        <option value="Chưa bắt đầu">Chưa bắt đầu</option>
                                        <option value="Đang thực hiện">Đang thực hiện</option>
                                        <option value="Hoàn thành">Hoàn thành</option>
                                        <option value="Tạm dừng">Tạm dừng</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Độ ưu tiên</label>
                                    <select 
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                                        value={taskForm.uu_tien}
                                        onChange={e => setTaskForm({ ...taskForm, uu_tien: e.target.value })}
                                    >
                                        <option value="Thấp">Thấp</option>
                                        <option value="Trung bình">Trung bình</option>
                                        <option value="Cao">Cao</option>
                                        <option value="Khẩn cấp">Khẩn cấp</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Ngày bắt đầu</label>
                                    <input 
                                        type="date" 
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" 
                                        value={taskForm.ngay_bat_dau || ''} 
                                        onChange={e => setTaskForm({ ...taskForm, ngay_bat_dau: e.target.value })} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Ngày kết thúc</label>
                                    <input 
                                        type="date" 
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" 
                                        value={taskForm.ngay_ket_thuc || ''} 
                                        onChange={e => setTaskForm({ ...taskForm, ngay_ket_thuc: e.target.value })} 
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Người phụ trách</label>
                                    <input 
                                        type="text" 
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" 
                                        placeholder="Nhập tên người phụ trách..." 
                                        value={taskForm.nguoi_phu_trach || ''} 
                                        onChange={e => setTaskForm({ ...taskForm, nguoi_phu_trach: e.target.value })} 
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tiến độ (%)</label>
                                    <input 
                                        type="number" 
                                        min="0" 
                                        max="100" 
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" 
                                        value={taskForm.tien_do ?? 0} 
                                        onChange={e => setTaskForm({ ...taskForm, tien_do: parseInt(e.target.value) || 0 })} 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú</label>
                                <textarea 
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20" 
                                    rows={2}
                                    placeholder="Nhập ghi chú..." 
                                    value={taskForm.ghi_chu || ''} 
                                    onChange={e => setTaskForm({ ...taskForm, ghi_chu: e.target.value })} 
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                            <button onClick={() => setIsAddTaskModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors">Hủy</button>
                            <button 
                                onClick={async () => {
                                    if (!selectedContract?.uuid) {
                                        setToast({ message: 'Không tìm thấy hợp đồng. Vui lòng thử lại.', type: 'warning' });
                                        return;
                                    }
                                    if (!taskForm.ten_task.trim()) {
                                        setToast({ message: 'Vui lòng nhập tên công việc', type: 'warning' });
                                        return;
                                    }
                                    try {
                                        console.log('[HopDong] Creating task with payload:', {
                                            hop_dong_id: selectedContract.uuid,
                                            ten_task: taskForm.ten_task,
                                            mo_ta: taskForm.mo_ta || null,
                                            trang_thai: taskForm.trang_thai,
                                            uu_tien: taskForm.uu_tien,
                                            ngay_bat_dau: taskForm.ngay_bat_dau || null,
                                            ngay_ket_thuc: taskForm.ngay_ket_thuc || null,
                                            ngay_hoan_thanh: null,
                                            nguoi_phu_trach: taskForm.nguoi_phu_trach || null,
                                            tien_do: taskForm.tien_do,
                                            ghi_chu: taskForm.ghi_chu || null,
                                        });
                                        
                                        const created = await taskService.create({
                                            hop_dong_id: selectedContract.uuid,
                                            ten_task: taskForm.ten_task,
                                            mo_ta: taskForm.mo_ta || null,
                                            trang_thai: taskForm.trang_thai,
                                            uu_tien: taskForm.uu_tien,
                                            ngay_bat_dau: taskForm.ngay_bat_dau || null,
                                            ngay_ket_thuc: taskForm.ngay_ket_thuc || null,
                                            ngay_hoan_thanh: null,
                                            nguoi_phu_trach: taskForm.nguoi_phu_trach || null,
                                            tien_do: taskForm.tien_do,
                                            ghi_chu: taskForm.ghi_chu || null,
                                        });
                                        
                                        console.log('[HopDong] Task created successfully:', created);
                                        
                                        setToast({ message: 'Đã thêm công việc thành công!', type: 'success' });
                                        setIsAddTaskModalOpen(false);
                                        
                                        // Reload tasks
                                        await loadTasks();
                                        
                                        // Update tasksByContract for progress display
                                        if (selectedContract?.uuid) {
                                            try {
                                                const updatedTasks = await taskService.getByHopDongId(selectedContract.uuid);
                                                setTasksByContract(prev => {
                                                    const newMap = new Map(prev);
                                                    newMap.set(selectedContract.uuid, updatedTasks);
                                                    return newMap;
                                                });
                                            } catch (error) {
                                                console.error('[HopDong] Error updating tasksByContract:', error);
                                            }
                                        }
                                        
                                        // Reset form
                                        setTaskForm({ 
                                            ten_task: '', 
                                            mo_ta: '', 
                                            trang_thai: 'Chưa bắt đầu', 
                                            uu_tien: 'Trung bình',
                                            ngay_bat_dau: '', 
                                            ngay_ket_thuc: '', 
                                            nguoi_phu_trach: '',
                                            tien_do: 0,
                                            ghi_chu: ''
                                        });
                                    } catch (error: any) {
                                        console.error('[HopDong] Error saving task:', error);
                                        console.error('[HopDong] Error code:', error?.code);
                                        console.error('[HopDong] Error message:', error?.message);
                                        console.error('[HopDong] Error details:', JSON.stringify(error, null, 2));
                                        
                                        let errorMessage = 'Lỗi khi thêm công việc. Vui lòng thử lại.';
                                        
                                        if (error?.code === '42501') {
                                            errorMessage = 'Lỗi phân quyền (RLS). Vui lòng kiểm tra chính sách bảo mật trong Supabase.';
                                        } else if (error?.code === '23502') {
                                            errorMessage = `Thiếu thông tin bắt buộc: ${error.message}.`;
                                        } else if (error?.code === '23503') {
                                            errorMessage = 'Hợp đồng không tồn tại. Vui lòng kiểm tra lại.';
                                        } else if (error?.message) {
                                            errorMessage = `Lỗi: ${error.message}`;
                                        }
                                        
                                        setToast({ message: errorMessage, type: 'warning' });
                                    }
                                }} 
                                className="px-4 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-md transition-colors"
                            >
                                Thêm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Nghiệm thu Modal */}
            {isNghiemThuModalOpen && selectedTaskForNghiemThu && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        setIsNghiemThuModalOpen(false);
                    }
                }}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-white">
                            <h3 className="text-lg font-bold text-slate-800">Nghiệm thu công việc</h3>
                            <button onClick={() => setIsNghiemThuModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tên công việc</label>
                                <input 
                                    type="text" 
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" 
                                    value={selectedTaskForNghiemThu.ten_task} 
                                    disabled
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tiến độ (%) *</label>
                                <input 
                                    type="number" 
                                    min="0" 
                                    max="100" 
                                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm" 
                                    value={nghiemThuForm.tien_do} 
                                    onChange={e => setNghiemThuForm({ ...nghiemThuForm, tien_do: parseInt(e.target.value) || 0 })} 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Link tài liệu</label>
                                <div className="flex items-center gap-2">
                                    <LinkIcon size={16} className="text-slate-400" />
                                    <input 
                                        type="url" 
                                        className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm" 
                                        placeholder="https://..." 
                                        value={nghiemThuForm.link_tai_lieu || ''} 
                                        onChange={e => setNghiemThuForm({ ...nghiemThuForm, link_tai_lieu: e.target.value })} 
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Ảnh bằng chứng</label>
                                {nghiemThuForm.anh_bang_chung_url && !nghiemThuForm.anh_bang_chung && (
                                    <div className="mb-2">
                                        <img src={nghiemThuForm.anh_bang_chung_url} alt="Bằng chứng hiện tại" className="max-w-full h-32 object-contain rounded-lg border border-slate-200" />
                                        <button
                                            type="button"
                                            onClick={() => setNghiemThuForm({ ...nghiemThuForm, anh_bang_chung_url: null })}
                                            className="mt-1 text-xs text-red-600 hover:underline"
                                        >
                                            Xóa ảnh hiện tại
                                        </button>
                                    </div>
                                )}
                                {nghiemThuForm.anh_bang_chung && (
                                    <div className="mb-2">
                                        <img src={URL.createObjectURL(nghiemThuForm.anh_bang_chung)} alt="Ảnh mới" className="max-w-full h-32 object-contain rounded-lg border border-slate-200" />
                                        <button
                                            type="button"
                                            onClick={() => setNghiemThuForm({ ...nghiemThuForm, anh_bang_chung: null })}
                                            className="mt-1 text-xs text-red-600 hover:underline"
                                        >
                                            Xóa ảnh mới
                                        </button>
                                    </div>
                                )}
                                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                        <ImageIcon size={24} className="text-slate-400 mb-2" />
                                        <p className="text-sm text-slate-500">Click để chọn ảnh</p>
                                        <p className="text-xs text-slate-400 mt-1">PNG, JPG, GIF (tối đa 5MB)</p>
                                    </div>
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                if (file.size > 5 * 1024 * 1024) {
                                                    setToast({ message: 'File quá lớn. Vui lòng chọn file nhỏ hơn 5MB.', type: 'warning' });
                                                    return;
                                                }
                                                setNghiemThuForm({ ...nghiemThuForm, anh_bang_chung: file });
                                            }
                                        }} 
                                    />
                                </label>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                            <button 
                                onClick={() => setIsNghiemThuModalOpen(false)} 
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                            >
                                Hủy
                            </button>
                            <button 
                                onClick={async () => {
                                    if (!selectedTaskForNghiemThu) return;
                                    
                                    try {
                                        setUploadingImage(true);
                                        let imageUrl = nghiemThuForm.anh_bang_chung_url;
                                        
                                        // Upload ảnh mới nếu có
                                        if (nghiemThuForm.anh_bang_chung) {
                                            const timestamp = Date.now();
                                            const fileName = `task_${selectedTaskForNghiemThu.id}_${timestamp}_${nghiemThuForm.anh_bang_chung.name}`;
                                            const filePath = `task-evidence/${fileName}`;
                                            
                                            // Kiểm tra bucket có tồn tại không
                                            const { data: buckets } = await supabase.storage.listBuckets();
                                            const bucketExists = buckets?.some(b => b.name === 'task-evidence');
                                            
                                            if (!bucketExists) {
                                                setToast({ message: 'Bucket "task-evidence" chưa được tạo. Vui lòng tạo bucket trong Supabase Dashboard > Storage.', type: 'warning' });
                                                setUploadingImage(false);
                                                return;
                                            }
                                            
                                            const { data: uploadData, error: uploadError } = await supabase.storage
                                                .from('task-evidence')
                                                .upload(filePath, nghiemThuForm.anh_bang_chung, {
                                                    cacheControl: '3600',
                                                    upsert: false
                                                });
                                            
                                            if (uploadError) {
                                                console.error('[HopDong] Error uploading image:', uploadError);
                                                setToast({ message: `Lỗi khi upload ảnh: ${uploadError.message}`, type: 'warning' });
                                                setUploadingImage(false);
                                                return;
                                            }
                                            
                                            // Get public URL
                                            const { data: urlData } = supabase.storage
                                                .from('task-evidence')
                                                .getPublicUrl(uploadData.path);
                                            
                                            imageUrl = urlData.publicUrl;
                                            console.log('[HopDong] Image uploaded successfully, URL:', imageUrl);
                                        }
                                        
                                        console.log('[HopDong] Updating task with anh_bang_chung:', imageUrl);
                                        // Cập nhật task
                                        const updated = await taskService.update(selectedTaskForNghiemThu.id, {
                                            tien_do: nghiemThuForm.tien_do,
                                            link_tai_lieu: nghiemThuForm.link_tai_lieu || null,
                                            anh_bang_chung: imageUrl || null,
                                            trang_thai: nghiemThuForm.tien_do === 100 ? 'Hoàn thành' : nghiemThuForm.tien_do > 0 ? 'Đang thực hiện' : selectedTaskForNghiemThu.trang_thai,
                                            ngay_hoan_thanh: nghiemThuForm.tien_do === 100 ? new Date().toISOString().slice(0, 10) : null
                                        });
                                        
                                        console.log('[HopDong] Task updated successfully, result:', updated);
                                        setToast({ message: 'Đã cập nhật nghiệm thu thành công!', type: 'success' });
                                        setIsNghiemThuModalOpen(false);
                                        await loadTasks();
                                        
                                        // Update tasksByContract for progress display
                                        if (selectedTaskForNghiemThu.hop_dong_id) {
                                            try {
                                                const updatedTasks = await taskService.getByHopDongId(selectedTaskForNghiemThu.hop_dong_id);
                                                setTasksByContract(prev => {
                                                    const newMap = new Map(prev);
                                                    newMap.set(selectedTaskForNghiemThu.hop_dong_id, updatedTasks);
                                                    return newMap;
                                                });
                                            } catch (error) {
                                                console.error('[HopDong] Error updating tasksByContract:', error);
                                            }
                                        }
                                    } catch (error: any) {
                                        console.error('[HopDong] Error updating nghiệm thu:', error);
                                        setToast({ message: `Lỗi: ${error.message || 'Không thể cập nhật nghiệm thu'}`, type: 'warning' });
                                    } finally {
                                        setUploadingImage(false);
                                    }
                                }}
                                disabled={uploadingImage}
                                className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {uploadingImage ? 'Đang tải...' : 'Lưu nghiệm thu'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
