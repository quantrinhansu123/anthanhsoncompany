import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Search, Plus, Eye, Edit, Trash2, X, ChevronRight, ChevronDown, FileText, FolderOpen, ClipboardList, PlusCircle, Maximize2, ExternalLink, CheckCircle, FileCheck, Image as ImageIcon, Link as LinkIcon, User } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { contractService, ContractRow, ContractFile } from '../../lib/services/contractService';
import { projectService } from '../../lib/services/projectService';
import { taskService, TaskRow } from '../../lib/services/taskService';
import { employeeService } from '../../lib/services/employeeService';
import { thuChiService } from '../../lib/services/thuChiService';
import { useHopDongModal } from '../../contexts/HopDongModalContext';

interface Contract {
    id: number;
    uuid?: string; // UUID thực sự từ database
    duAnId?: string | null; // UUID của dự án
    fileStatus: string;
    files?: ContractFile[] | null;
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
    nhanSuIds?: string[];
    nhanSuTen?: string | null;
    nhanSuCode?: string | null;
}

// Các loại file cần có
const FILE_TYPES = [
    'File_BBTT',
    'File_HD',
    'File_BBNT',
    'File_PL3A',
    'File_BBTL',
    'File_PLHD'
] as const;

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
    
    const { openThemHopDong, openChiTietHopDong, openDelete } = useHopDongModal();
    
    const [items, setItems] = useState<ProjectGroup[]>([]);
    const [projects, setProjects] = useState<Array<{ id: string; ten_du_an: string }>>([]);
    const [employees, setEmployees] = useState<Array<{ id: string; full_name: string; code: string; anh_nhan_su?: string | null }>>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedProjects, setExpandedProjects] = useState<number[]>([]);
    
    // Filter states
    const [selectedDuAnIds, setSelectedDuAnIds] = useState<Set<string>>(new Set());
    const [selectedHopDongIds, setSelectedHopDongIds] = useState<Set<string>>(new Set());
    const [allContracts, setAllContracts] = useState<Array<{ id: string; so_hop_dong: string; du_an_id: string | null; project_name: string }>>([]);
    const [openFilterDropdown, setOpenFilterDropdown] = useState<'duan' | 'hopdong' | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);
    const [thuChiCache, setThuChiCache] = useState<Map<string, number>>(new Map());
    
    // State for tasks by contract (for progress display in table)
    const [tasksByContract, setTasksByContract] = useState<Map<string, TaskRow[]>>(new Map());

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

    const handleAddClick = () => {
        openThemHopDong();
    };

    const handleDeleteClick = (contract: Contract) => {
        openDelete({
            id: contract.id,
            uuid: contract.uuid,
            soHopDong: contract.soHopDong
        });
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
                    code: emp.code || '',
                    anh_nhan_su: (emp as any).anh_nhan_su || null
                })));
            } catch (error) {
                console.error('Error loading employees:', error);
            }
        })();
    }, []);

    // Load data from hop_dong table
    useEffect(() => {
        let isMounted = true;
        
        (async () => {
            try {
            const rows = await contractService.getAll();
                
                if (!isMounted) return;
                
                // Lưu danh sách contracts để filter
                setAllContracts(rows.map(r => ({
                    id: r.id,
                    so_hop_dong: r.so_hop_dong || '',
                    du_an_id: r.du_an_id || null,
                    project_name: r.project_name || ''
                })));
                
                // Load tất cả thu chi để tính "Đã thu" và cache
                const allThuChi = await thuChiService.getAll();
                
                if (!isMounted) return;
                
                // Cache thu chi data để tránh load lại
                const thuChiMap = new Map<string, number>();
                allThuChi.forEach(tc => {
                    if (tc.hop_dong_id && tc.loai_phieu === 'Phiếu thu') {
                        const current = thuChiMap.get(tc.hop_dong_id) || 0;
                        thuChiMap.set(tc.hop_dong_id, current + (tc.so_tien || 0));
                    }
                });
                setThuChiCache(thuChiMap);
                
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
                    contracts: contracts.map((c, idx) => {
                        // Tính "Đã thu" từ cache (đã tính ở trên)
                        const daThu = thuChiMap.get(c.id) || 0;
                        const giaTriQT = Number(c.gia_tri_qt || 0);
                    
                    return {
                    id: idx + 1,
                    uuid: c.id, // Lưu UUID thực sự từ database
                        duAnId: c.du_an_id || null,
                    fileStatus: c.file_status || 'Chưa có file',
                        files: c.files || [],
                    ngayKyHD: c.ngay_ky_hd ? new Date(c.ngay_ky_hd).toLocaleDateString('vi-VN') : '',
                    soHopDong: c.so_hop_dong || '',
                    tenGoiThau: c.ten_goi_thau || '',
                    loaiDichVu: c.loai_dich_vu || '',
                    giaTriHD: Number(c.gia_tri_hd || 0),
                        giaTriQT: giaTriQT,
                        daThu: daThu,
                        conPhaiThu: giaTriQT - daThu,
                    ngayUpdate: c.ngay_update ? new Date(c.ngay_update).toLocaleDateString('vi-VN') : '',
                    nhanSuId: c.nhan_su_id || null,
                    nhanSuIds: (c as any).nhan_su_ids && Array.isArray((c as any).nhan_su_ids) ? (c as any).nhan_su_ids : (c.nhan_su_id ? [c.nhan_su_id] : []),
                    nhanSuTen: c.nhan_su_ten || null,
                    nhanSuCode: c.nhan_su_code || null,
                    };
                }),
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
            } catch (error) {
                console.error('[HopDong] Error loading data:', error);
            }
        })();
        
        return () => {
            isMounted = false;
        };
    }, []);
    
    // Calculate progress for a contract
    const getContractProgress = (contractUuid: string | undefined) => {
        if (!contractUuid) return 0;
        const contractTasks = tasksByContract.get(contractUuid) || [];
        if (contractTasks.length === 0) return 0;
        const completedTasks = contractTasks.filter(task => task.tien_do === 100).length;
        return Math.round((completedTasks / contractTasks.length) * 100);
    };

    // Toggle filter functions
    const toggleDuAnFilter = (projectId: string) => {
        setSelectedDuAnIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(projectId)) {
                newSet.delete(projectId);
                // Xóa các hợp đồng của dự án này khỏi selectedHopDongIds
                const contractsToRemove = allContracts
                    .filter(c => c.du_an_id === projectId)
                    .map(c => c.id);
                setSelectedHopDongIds(prevHd => {
                    const newHdSet = new Set(prevHd);
                    contractsToRemove.forEach(id => newHdSet.delete(id));
                    return newHdSet;
                });
            } else {
                newSet.add(projectId);
            }
            return newSet;
        });
    };

    const toggleHopDongFilter = (contractId: string) => {
        setSelectedHopDongIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(contractId)) {
                newSet.delete(contractId);
            } else {
                newSet.add(contractId);
            }
            return newSet;
        });
    };

    // Lấy danh sách hợp đồng có thể filter (chỉ từ các dự án đã chọn)
    const getFilteredContracts = () => {
        if (selectedDuAnIds.size === 0) {
            return allContracts;
        }
        return allContracts.filter(c => c.du_an_id && selectedDuAnIds.has(c.du_an_id));
    };

    // Filter by search term and project filter from URL - Memoized for performance
    const filteredItems = useMemo(() => {
        const searchLower = searchTerm.toLowerCase();
        return items
        .filter(project => {
            // Filter theo project từ URL nếu có
            if (filterProject) {
                return project.projectName === filterProject;
            }
                
                // Filter theo selectedDuAnIds nếu có
                if (selectedDuAnIds.size > 0) {
                    const projectId = projects.find(p => p.ten_du_an === project.projectName)?.id;
                    if (!projectId || !selectedDuAnIds.has(projectId)) {
                        return false;
                    }
                }
                
            return true;
        })
        .map(project => ({
            ...project,
                contracts: project.contracts.filter(c => {
                    // Filter theo search term
                    const matchesSearch = !searchTerm ||
                        c.soHopDong.toLowerCase().includes(searchLower) ||
                        c.tenGoiThau.toLowerCase().includes(searchLower) ||
                        c.loaiDichVu.toLowerCase().includes(searchLower) ||
                        project.projectName.toLowerCase().includes(searchLower);
                    
                    // Filter theo selectedHopDongIds nếu có
                    const matchesContractFilter = selectedHopDongIds.size === 0 || 
                        (c.uuid && selectedHopDongIds.has(c.uuid));
                    
                    return matchesSearch && matchesContractFilter;
                })
            }))
            .filter(project => project.contracts.length > 0 || project.projectName.toLowerCase().includes(searchLower));
    }, [items, filterProject, selectedDuAnIds, selectedHopDongIds, searchTerm, projects]);

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* Toast */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="bg-white rounded-md border border-slate-200 overflow-hidden shadow-sm">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-[var(--cobalt-dark)] to-[var(--cobalt)]">
                    <h1 className="text-[16px] font-extrabold text-white uppercase tracking-wide">
                        Hợp đồng
                    </h1>
                    <button
                        onClick={handleAddClick}
                        className="btn-primary ripple flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-md shadow-sm border border-white/40"
                    >
                        <Plus size={16} />
                        Thêm hợp đồng
                    </button>
                </div>

                {/* Search and Filters */}
                <div className="px-6 py-4 border-b border-slate-200 bg-white">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Search */}
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
                        
                        {/* Filter Panel */}
                        <div className="flex items-center gap-4 flex-wrap">
                            {/* Dự án Filter */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenFilterDropdown(openFilterDropdown === 'duan' ? null : 'duan');
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-md bg-white hover:bg-slate-50 cursor-pointer"
                                >
                                    <span className="text-sm text-slate-700 font-medium">Dự án</span>
                                    {selectedDuAnIds.size > 0 && (
                                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-bold">
                                            {selectedDuAnIds.size}
                                        </span>
                                    )}
                                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${openFilterDropdown === 'duan' ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {/* Dropdown */}
                                {openFilterDropdown === 'duan' && (
                                    <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                                        <div className="p-2">
                                            {projects.map(project => (
                                                <label key={project.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer rounded">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedDuAnIds.has(project.id)}
                                                        onChange={() => toggleDuAnFilter(project.id)}
                                                        className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                                                    />
                                                    <span className="text-sm text-slate-700 flex-1">{project.ten_du_an}</span>
                                                </label>
                                            ))}
                                            {projects.length === 0 && (
                                                <div className="px-3 py-2 text-sm text-slate-400 italic">Chưa có dự án</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Hợp đồng Filter */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenFilterDropdown(openFilterDropdown === 'hopdong' ? null : 'hopdong');
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-md bg-white hover:bg-slate-50 cursor-pointer"
                                >
                                    <span className="text-sm text-slate-700 font-medium">Hợp đồng</span>
                                    {selectedHopDongIds.size > 0 && (
                                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-bold">
                                            {selectedHopDongIds.size}
                                        </span>
                                    )}
                                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${openFilterDropdown === 'hopdong' ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {/* Dropdown */}
                                {openFilterDropdown === 'hopdong' && (
                                    <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                                        <div className="p-2">
                                            {getFilteredContracts().map(contract => (
                                                <label key={contract.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer rounded">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedHopDongIds.has(contract.id)}
                                                        onChange={() => toggleHopDongFilter(contract.id)}
                                                        className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                                                    />
                                                    <span className="text-sm text-slate-700 flex-1 truncate">{contract.so_hop_dong || contract.id.substring(0, 8)}</span>
                                                </label>
                                            ))}
                                            {getFilteredContracts().length === 0 && (
                                                <div className="px-3 py-2 text-sm text-slate-400 italic">
                                                    {selectedDuAnIds.size === 0 ? 'Chọn dự án trước' : 'Không có hợp đồng'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Clear Filters */}
                            {(selectedDuAnIds.size > 0 || selectedHopDongIds.size > 0) && (
                                <button
                                    onClick={() => {
                                        setSelectedDuAnIds(new Set());
                                        setSelectedHopDongIds(new Set());
                                    }}
                                    className="px-3 py-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors"
                                >
                                    Xóa bộ lọc
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Danh sách nhân sự (icon ảnh) - ngoài bảng */}
                {employees.length > 0 && (
                    <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Nhân sự (ảnh đại diện)</p>
                        <div className="flex flex-wrap gap-4">
                            {employees.map((emp) => (
                                <div key={emp.id} className="flex flex-col items-center gap-1.5">
                                    <span className="w-12 h-12 rounded-full border-2 border-slate-200 shadow-sm flex-shrink-0 overflow-hidden bg-slate-200 flex items-center justify-center">
                                        {emp.anh_nhan_su ? (
                                            <img src={emp.anh_nhan_su} alt="" className="w-full h-full object-cover" onError={(e) => { const t = e.target as HTMLImageElement; t.style.display = 'none'; const parent = t.parentElement; if (parent) { const fallback = parent.querySelector('.avatar-fallback'); if (fallback) (fallback as HTMLElement).classList.remove('hidden'); } }} />
                                        ) : null}
                                        <span className={`avatar-fallback w-full h-full flex items-center justify-center ${emp.anh_nhan_su ? 'hidden' : ''}`}>
                                            <User size={22} className="text-slate-400" />
                                        </span>
                                    </span>
                                    <span className="text-[11px] text-slate-600 text-center max-w-[72px] truncate" title={emp.full_name}>{emp.code ? `[${emp.code}] ` : ''}{emp.full_name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

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
                                                {(contract.nhanSuIds && contract.nhanSuIds.length > 0) ? (
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {contract.nhanSuIds.map((id) => {
                                                            const emp = employees.find((e) => String(e.id) === String(id));
                                                            if (!emp) return null;
                                                            return (
                                                                <div key={id} className="flex items-center gap-1.5" title={`${emp.code ? `[${emp.code}] ` : ''}${emp.full_name}`}>
                                                                    {emp.anh_nhan_su ? (
                                                                        <img src={emp.anh_nhan_su} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200 flex-shrink-0" onError={(e) => { const t = e.target as HTMLImageElement; t.style.display = 'none'; const next = t.nextElementSibling as HTMLElement; if (next) next.classList.remove('hidden'); }} />
                                                                    ) : null}
                                                                    <span className={`w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 ${emp.anh_nhan_su ? 'hidden' : ''}`}>
                                                                        <User size={14} className="text-slate-400" />
                                                                    </span>
                                                                    <span className="text-[11px] truncate max-w-[80px]">{(emp.code ? `[${emp.code}] ` : '') + emp.full_name}</span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : contract.nhanSuTen ? (
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
                                                        onClick={(e) => { e.stopPropagation(); openChiTietHopDong(contract); }}
                                                    >
                                                        <Eye size={14} />
                                                    </button>
                                                    <button
                                                        className="action-btn p-1.5 text-orange-500 bg-orange-50 border border-orange-100 rounded-md hover:bg-orange-100"
                                                        title="Sửa"
                                                        onClick={(e) => { e.stopPropagation(); openThemHopDong(contract); }}
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                    <button
                                                        className="action-btn p-1.5 text-red-500 bg-red-50 border border-red-100 rounded-md hover:bg-red-100"
                                                        title="Xóa"
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(contract); }}
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

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
