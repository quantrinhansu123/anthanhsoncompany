import React, { useEffect, useState } from 'react';
import { Search, Plus, Eye, Edit, Trash2, X, Maximize2, CheckCircle, PlusCircle, User } from 'lucide-react';
import { ThemDuAnModal } from './ThemDuAnModal';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../../lib/services/projectService';
import { contractService, ContractRow } from '../../lib/services/contractService';
import { taskService } from '../../lib/services/taskService';

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

export function DuAn() {
    const [items, setItems] = useState<any[]>([]);
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

    const confirmDelete = async () => {
        if (projectToDelete !== null) {
            const ok = await projectService.delete(String(projectToDelete));
            if (ok) {
                setItems(items.filter((item: any) => item.id !== projectToDelete));
            }
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
    const [projectContracts, setProjectContracts] = useState<{ [projectId: number]: any[] }>({});
    
    // State để lưu hợp đồng thực tế từ database
    const [realContracts, setRealContracts] = useState<Map<string, ContractRow[]>>(new Map());
    
    // State để lưu tiến độ thực tế của từng dự án (tính từ hợp đồng)
    const [projectProgress, setProjectProgress] = useState<Map<string, number>>(new Map());
    
    // State để lưu thông tin hợp đồng của từng dự án (để hiển thị số lượng)
    const [projectContractInfo, setProjectContractInfo] = useState<Map<string, { total: number; completed: number }>>(new Map());

    // Load dự án từ bảng du_an và tính tiến độ từ hợp đồng
    useEffect(() => {
        (async () => {
            const data = await projectService.getAll();
            
            // Load tất cả hợp đồng
            const contracts = await contractService.getAll();
            
            // Nhóm hợp đồng theo project_name để hiển thị
            const contractsByProjectName = new Map<string, ContractRow[]>();
            contracts.forEach(contract => {
                const projectName = contract.project_name || '(Chưa có tên dự án)';
                if (!contractsByProjectName.has(projectName)) {
                    contractsByProjectName.set(projectName, []);
                }
                contractsByProjectName.get(projectName)!.push(contract);
            });
            setRealContracts(contractsByProjectName);
            
            // Load tasks cho tất cả hợp đồng để tính tiến độ
            const progressMap = new Map<string, number>();
            
            // Nhóm hợp đồng theo project_name để tính tiến độ
            const contractsByProject = new Map<string, string[]>();
            contracts.forEach(contract => {
                const projectName = contract.project_name || '(Chưa có tên dự án)';
                if (!contractsByProject.has(projectName)) {
                    contractsByProject.set(projectName, []);
                }
                contractsByProject.get(projectName)!.push(contract.id);
            });
            
            // Tính tiến độ cho từng dự án
            const contractInfoMap = new Map<string, { total: number; completed: number }>();
            
            await Promise.all(
                Array.from(contractsByProject.entries()).map(async ([projectName, contractIds]) => {
                    let completedContracts = 0;
                    
                    // Kiểm tra từng hợp đồng xem có 100% không
                    await Promise.all(
                        contractIds.map(async (contractId) => {
                            try {
                                const tasks = await taskService.getByHopDongId(contractId);
                                if (tasks.length === 0) {
                                    // Nếu không có task, không tính vào hoàn thành
                                    return;
                                }
                                // Nếu tất cả tasks đều 100%, hợp đồng này hoàn thành
                                const allCompleted = tasks.every(task => task.tien_do === 100);
                                if (allCompleted) {
                                    completedContracts++;
                                }
                            } catch (error) {
                                console.error(`Error loading tasks for contract ${contractId}:`, error);
                            }
                        })
                    );
                    
                    const totalContracts = contractIds.length;
                    const progress = totalContracts > 0 
                        ? Math.round((completedContracts / totalContracts) * 100)
                        : 0;
                    
                    progressMap.set(projectName, progress);
                    contractInfoMap.set(projectName, { total: totalContracts, completed: completedContracts });
                })
            );
            
            setProjectProgress(progressMap);
            setProjectContractInfo(contractInfoMap);
            
            // Map dự án với tiến độ từ hợp đồng
            const mapped = (data || []).map((p: any) => {
                const projectName = p.ten_du_an;
                const calculatedProgress = progressMap.get(projectName) ?? 0;
                
                return {
                    id: p.id,
                    projectName: projectName,
                    status: p.status || 'Đang thực hiện',
                    statusColor: getStatusColor(p.status || 'Đang thực hiện'),
                    progress: calculatedProgress, // Sử dụng tiến độ tính từ hợp đồng
                    managerImg: p.manager_img || null,
                    executorImg: p.executor_img || null,
                    manager_id: p.manager_id || null,
                    executor_id: p.executor_id || null,
                    manager_name: p.manager_name || null,
                    executor_name: p.executor_name || null,
                    manager_code: (p.manager && (p.manager.code || p.manager.ma_nv)) || null,
                    executor_code: (p.executor && (p.executor.code || p.executor.ma_nv)) || null,
                    customer_name: p.customer_name || null,
                };
            });
            setItems(mapped);
        })();
    }, []);

    const handleSaveProject = async (data: any) => {
        console.log('[DuAn] handleSaveProject called with data:', data);
        try {
            // Cập nhật
            if (data.id) {
                console.log('[DuAn] Updating project with id:', data.id);
                const customerIdValue = (data.customer_id || data.customerId);
                const finalCustomerId = customerIdValue && customerIdValue.toString().trim() !== '' ? customerIdValue.toString() : null;
                console.log('[DuAn] Updating with customerId:', finalCustomerId);
                const updated = await projectService.update(String(data.id), {
                    projectName: data.projectName,
                    status: data.status,
                    progress: Number(data.progress) || 0,
                    customerId: finalCustomerId,
                    managerId: data.manager_id || data.managerId || null,
                    executorId: data.executor_id || data.executorId || null,
                    managerImg: data.managerImg || null,
                    executorImg: data.executorImg || null,
                });
                if (updated) {
                    setToast({ message: 'Cập nhật dự án thành công!', type: 'success' });
                    // Reload dữ liệu từ database
                    setTimeout(async () => {
                        const data = await projectService.getAll();
                        const contracts = await contractService.getAll();
                        
                        // Nhóm hợp đồng theo project_name
                        const contractsByProjectName = new Map<string, ContractRow[]>();
                        contracts.forEach(contract => {
                            const projectName = contract.project_name || '(Chưa có tên dự án)';
                            if (!contractsByProjectName.has(projectName)) {
                                contractsByProjectName.set(projectName, []);
                            }
                            contractsByProjectName.get(projectName)!.push(contract);
                        });
                        setRealContracts(contractsByProjectName);
                        
                        // Tính tiến độ
                        const progressMap = new Map<string, number>();
                        const contractsByProject = new Map<string, string[]>();
                        contracts.forEach(contract => {
                            const projectName = contract.project_name || '(Chưa có tên dự án)';
                            if (!contractsByProject.has(projectName)) {
                                contractsByProject.set(projectName, []);
                            }
                            contractsByProject.get(projectName)!.push(contract.id);
                        });
                        
                        const contractInfoMap = new Map<string, { total: number; completed: number }>();
                        
                        await Promise.all(
                            Array.from(contractsByProject.entries()).map(async ([projectName, contractIds]) => {
                                let completedContracts = 0;
                                
                                await Promise.all(
                                    contractIds.map(async (contractId) => {
                                        try {
                                            const tasks = await taskService.getByHopDongId(contractId);
                                            if (tasks.length === 0) return;
                                            const allCompleted = tasks.every(task => task.tien_do === 100);
                                            if (allCompleted) completedContracts++;
                                        } catch (error) {
                                            console.error(`Error loading tasks for contract ${contractId}:`, error);
                                        }
                                    })
                                );
                                
                                const totalContracts = contractIds.length;
                                const progress = totalContracts > 0 
                                    ? Math.round((completedContracts / totalContracts) * 100)
                                    : 0;
                                
                                progressMap.set(projectName, progress);
                                contractInfoMap.set(projectName, { total: totalContracts, completed: completedContracts });
                            })
                        );
                        
                        setProjectProgress(progressMap);
                        setProjectContractInfo(contractInfoMap);
                        
                        // Map dự án với tiến độ
                        const mapped = (data || []).map((p: any) => {
                            const projectName = p.ten_du_an;
                            const calculatedProgress = progressMap.get(projectName) ?? 0;
                            
                            return {
                                id: p.id,
                                projectName: projectName,
                                status: p.status || 'Đang thực hiện',
                                statusColor: getStatusColor(p.status || 'Đang thực hiện'),
                                progress: calculatedProgress,
                                managerImg: p.manager_img || null,
                                executorImg: p.executor_img || null,
                                manager_id: p.manager_id || null,
                                executor_id: p.executor_id || null,
                                manager_name: p.manager_name || null,
                                executor_name: p.executor_name || null,
                                manager_code: (p.manager && (p.manager.code || p.manager.ma_nv)) || null,
                                executor_code: (p.executor && (p.executor.code || p.executor.ma_nv)) || null,
                                customer_name: p.customer_name || null,
                            };
                        });
                        setItems(mapped);
                    }, 500);
                } else {
                    setToast({ message: 'Cập nhật dự án thất bại!', type: 'warning' });
                }
            } else {
                // Tạo mới
                console.log('[DuAn] Creating new project');
                const customerIdValue = (data.customer_id || data.customerId);
                const finalCustomerId = customerIdValue && customerIdValue.toString().trim() !== '' ? customerIdValue.toString() : null;
                console.log('[DuAn] Creating with customerId:', finalCustomerId);
                const created = await projectService.create({
                    projectName: data.projectName,
                    status: data.status,
                    progress: Number(data.progress) || 0,
                    customerId: finalCustomerId,
                    managerId: data.manager_id || data.managerId || null,
                    executorId: data.executor_id || data.executorId || null,
                    managerImg: data.managerImg || null,
                    executorImg: data.executorImg || null,
                });
                if (created) {
                    setToast({ message: 'Thêm dự án mới thành công!', type: 'success' });
                    // Reload dữ liệu từ database
                    setTimeout(async () => {
                        const data = await projectService.getAll();
                        const contracts = await contractService.getAll();
                        
                        // Nhóm hợp đồng theo project_name
                        const contractsByProjectName = new Map<string, ContractRow[]>();
                        contracts.forEach(contract => {
                            const projectName = contract.project_name || '(Chưa có tên dự án)';
                            if (!contractsByProjectName.has(projectName)) {
                                contractsByProjectName.set(projectName, []);
                            }
                            contractsByProjectName.get(projectName)!.push(contract);
                        });
                        setRealContracts(contractsByProjectName);
                        
                        // Tính tiến độ
                        const progressMap = new Map<string, number>();
                        const contractsByProject = new Map<string, string[]>();
                        contracts.forEach(contract => {
                            const projectName = contract.project_name || '(Chưa có tên dự án)';
                            if (!contractsByProject.has(projectName)) {
                                contractsByProject.set(projectName, []);
                            }
                            contractsByProject.get(projectName)!.push(contract.id);
                        });
                        
                        const contractInfoMap = new Map<string, { total: number; completed: number }>();
                        
                        await Promise.all(
                            Array.from(contractsByProject.entries()).map(async ([projectName, contractIds]) => {
                                let completedContracts = 0;
                                
                                await Promise.all(
                                    contractIds.map(async (contractId) => {
                                        try {
                                            const tasks = await taskService.getByHopDongId(contractId);
                                            if (tasks.length === 0) return;
                                            const allCompleted = tasks.every(task => task.tien_do === 100);
                                            if (allCompleted) completedContracts++;
                                        } catch (error) {
                                            console.error(`Error loading tasks for contract ${contractId}:`, error);
                                        }
                                    })
                                );
                                
                                const totalContracts = contractIds.length;
                                const progress = totalContracts > 0 
                                    ? Math.round((completedContracts / totalContracts) * 100)
                                    : 0;
                                
                                progressMap.set(projectName, progress);
                                contractInfoMap.set(projectName, { total: totalContracts, completed: completedContracts });
                            })
                        );
                        
                        setProjectProgress(progressMap);
                        setProjectContractInfo(contractInfoMap);
                        
                        // Map dự án với tiến độ
                        const mapped = (data || []).map((p: any) => {
                            const projectName = p.ten_du_an;
                            const calculatedProgress = progressMap.get(projectName) ?? 0;
                            
                            return {
                                id: p.id,
                                projectName: projectName,
                                status: p.status || 'Đang thực hiện',
                                statusColor: getStatusColor(p.status || 'Đang thực hiện'),
                                progress: calculatedProgress,
                                managerImg: p.manager_img || null,
                                executorImg: p.executor_img || null,
                                manager_id: p.manager_id || null,
                                executor_id: p.executor_id || null,
                                manager_name: p.manager_name || null,
                                executor_name: p.executor_name || null,
                                manager_code: (p.manager && (p.manager.code || p.manager.ma_nv)) || null,
                                executor_code: (p.executor && (p.executor.code || p.executor.ma_nv)) || null,
                                customer_name: p.customer_name || null,
                            };
                        });
                        setItems(mapped);
                    }, 500);
                } else {
                    setToast({ message: 'Thêm dự án thất bại!', type: 'warning' });
                }
            }
        } catch (error: any) {
            console.error('[DuAn] Error saving project:', error);
            setToast({ message: `Lỗi: ${error.message || 'Không thể lưu dự án'}`, type: 'warning' });
        }
    };

    const handleSaveContract = async () => {
        if (!selectedProject) {
            setToast({ message: 'Vui lòng chọn dự án', type: 'warning' });
            return;
        }

        try {
            // Lưu hợp đồng vào database
            const created = await contractService.create({
                du_an_id: selectedProject.id || null, // Sử dụng du_an_id thay vì project_name
                project_name: selectedProject.projectName, // Giữ lại để backward compatibility
                so_hop_dong: contractFormData.soHopDong || null,
                ten_goi_thau: contractFormData.tenGoiThau || null,
                ngay_ky_hd: contractFormData.ngayKyHD || null,
                file_status: contractFormData.fileStatus || 'Chưa có file',
                gia_tri_hd: 0,
                gia_tri_qt: 0,
                da_thu: 0,
                con_phai_thu: 0,
                ngay_update: new Date().toISOString().slice(0, 10),
            });

            if (!created) {
                setToast({ message: 'Không lưu được hợp đồng. Vui lòng thử lại.', type: 'warning' });
                return;
            }

            // Cập nhật realContracts
            setRealContracts(prev => {
                const newMap = new Map(prev);
                const projectName = selectedProject.projectName;
                const existing = newMap.get(projectName) || [];
                newMap.set(projectName, [...existing, created]);
                return newMap;
            });

            setToast({ message: 'Đã thêm hợp đồng mới thành công!', type: 'success' });
            setIsAddContractModalOpen(false);
            setContractFormData({ soHopDong: '', tenGoiThau: '', ngayKyHD: '', fileStatus: 'Chưa có file' });
            
            // Reload để cập nhật tiến độ
            window.location.reload();
        } catch (error: any) {
            console.error('[DuAn] Error saving contract:', error);
            setToast({ message: `Lỗi: ${error.message || 'Không thể lưu hợp đồng'}`, type: 'warning' });
        }
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
                                <th className="py-4 px-4 font-semibold text-xs uppercase tracking-wider min-w-[150px]">Tên khách hàng</th>
                                <th className="py-4 px-4 text-center font-semibold text-xs uppercase tracking-wider min-w-[120px]">Người quản lý</th>
                                <th className="py-4 px-4 text-center font-semibold text-xs uppercase tracking-wider min-w-[120px]">Người thực thi</th>
                                <th className="py-4 px-4 text-center font-semibold text-xs uppercase tracking-wider min-w-[140px]">Trạng thái</th>
                                <th className="py-4 pr-4 md:pr-6 pl-4 text-center font-semibold text-xs uppercase tracking-wider min-w-[180px]">Tiến độ</th>
                                <th className="py-4 px-4 text-center font-semibold text-xs uppercase tracking-wider min-w-[100px] rounded-tr-lg">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-6 text-center text-slate-500 text-sm italic">
                                        Chưa có dự án nào. Nhấn "Thêm dự án" để tạo mới.
                                    </td>
                                </tr>
                            )}
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
                                        <span className="text-slate-700 text-sm">{item.customer_name || '(Chưa có khách hàng)'}</span>
                                    </td>

                                    <td className="py-4 px-4 align-middle">
                                        <div className="flex justify-center">
                                            <div className="relative">
                                                {item.managerImg ? (
                                                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-200 group-hover:ring-blue-200 transition-all">
                                                        <img 
                                                            src={item.managerImg} 
                                                            alt="Manager" 
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                            }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm ring-1 ring-slate-200 flex items-center justify-center">
                                                        <User size={16} className="text-slate-400" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>

                                    <td className="py-4 px-4 align-middle">
                                        <div className="flex flex-col items-center gap-1">
                                            {item.executorImg ? (
                                                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-200 group-hover:ring-blue-200 transition-all">
                                                    <img 
                                                        src={item.executorImg} 
                                                        alt="Executor" 
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm ring-1 ring-slate-200 flex items-center justify-center">
                                                    <User size={16} className="text-slate-400" />
                                                </div>
                                            )}
                                            {item.executor_name && (
                                                <div className="text-xs text-slate-600 text-center max-w-[100px] truncate">
                                                    {item.executor_code ? `[${item.executor_code}] ` : ''}{item.executor_name}
                                                </div>
                                            )}
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
                                        <div className="flex flex-col gap-1.5">
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
                                            {(() => {
                                                const contractInfo = projectContractInfo.get(item.projectName);
                                                if (contractInfo && contractInfo.total > 0) {
                                                    return (
                                                        <span className="text-[10px] text-slate-500 text-center">
                                                            {contractInfo.completed}/{contractInfo.total} hợp đồng
                                                        </span>
                                                    );
                                                }
                                                return null;
                                            })()}
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
                                            <div key={index} className="flex px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                                <div className="w-[180px] shrink-0 text-slate-500 font-medium">{row.label}</div>
                                                <div className="flex-1 text-slate-800 font-medium">{row.value}</div>
                                            </div>
                                        ))}
                                        
                                        {/* Nhân sự phụ trách */}
                                        <div className="px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                            <div className="w-[180px] shrink-0 text-slate-500 font-medium mb-2">Người quản lý</div>
                                            <div className="flex-1 flex items-center gap-3">
                                                {selectedProject.managerImg ? (
                                                    <img 
                                                        src={selectedProject.managerImg} 
                                                        alt="Manager" 
                                                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-slate-200 border border-slate-200 flex items-center justify-center">
                                                        <User size={16} className="text-slate-400" />
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <div className="text-slate-800 font-medium">
                                                        {selectedProject.manager_name || '(Chưa có người quản lý)'}
                                                    </div>
                                                    {selectedProject.manager_code && (
                                                        <div className="text-xs text-slate-500 mt-0.5">
                                                            Mã: {selectedProject.manager_code}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="px-4 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                            <div className="w-[180px] shrink-0 text-slate-500 font-medium mb-2">Người thực thi</div>
                                            <div className="flex-1 flex items-center gap-3">
                                                {selectedProject.executorImg ? (
                                                    <img 
                                                        src={selectedProject.executorImg} 
                                                        alt="Executor" 
                                                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).style.display = 'none';
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-slate-200 border border-slate-200 flex items-center justify-center">
                                                        <User size={16} className="text-slate-400" />
                                                    </div>
                                                )}
                                                <div className="flex-1">
                                                    <div className="text-slate-800 font-medium">
                                                        {selectedProject.executor_name || '(Chưa có người thực thi)'}
                                                    </div>
                                                    {selectedProject.executor_code && (
                                                        <div className="text-xs text-slate-500 mt-0.5">
                                                            Mã: {selectedProject.executor_code}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
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
                                                        <th className="px-4 py-3 whitespace-nowrap text-right">Giá trị HĐ</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {selectedProject && realContracts.get(selectedProject.projectName) && realContracts.get(selectedProject.projectName)!.length > 0 ? (
                                                        realContracts.get(selectedProject.projectName)!.map((contract: ContractRow) => (
                                                            <tr key={contract.id} className="bg-white hover:bg-slate-50 transition-colors">
                                                                <td className="px-4 py-3 font-semibold text-red-600 italic">
                                                                    {contract.file_status || 'Chưa có file'}
                                                                </td>
                                                                <td className="px-4 py-3 text-slate-600">
                                                                    {contract.ngay_ky_hd ? new Date(contract.ngay_ky_hd).toLocaleDateString('vi-VN') : '(Chưa nhập)'}
                                                                </td>
                                                                <td className="px-4 py-3 text-slate-600">
                                                                    {contract.so_hop_dong || '(Chưa nhập)'}
                                                                </td>
                                                                <td className="px-4 py-3 text-slate-600 truncate max-w-[150px]">
                                                                    {contract.ten_goi_thau || '(Chưa nhập)'}
                                                                </td>
                                                                <td className="px-4 py-3 text-slate-600 text-right">
                                                                    {contract.gia_tri_hd ? contract.gia_tri_hd.toLocaleString('vi-VN') : '0'}
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td className="px-4 py-8 text-slate-500 italic text-center" colSpan={5}>
                                                                Chưa có hợp đồng nào cho dự án này
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                        <div className="bg-white border-t border-slate-100 px-4 py-3 flex justify-end gap-3">
                                            <button
                                                onClick={() => navigate(`/khach-hang/hop-dong?project=${encodeURIComponent(selectedProject.projectName)}`)}
                                                className="action-btn p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-100"
                                                title="Xem tất cả hợp đồng của dự án"
                                            >
                                                <Maximize2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setContractFormData({ soHopDong: '', tenGoiThau: '', ngayKyHD: '', fileStatus: 'Chưa có file' });
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
