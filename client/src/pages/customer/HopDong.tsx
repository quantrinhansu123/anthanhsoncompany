import React, { useEffect, useState, useMemo } from 'react';
import { Search, Plus, Eye, Edit, Trash2, X, ChevronDown, FileText, FolderOpen, PlusCircle, User, CheckCircle, BarChart3, Briefcase, Calendar } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { contractService, ContractRow, ContractFile } from '../../lib/services/contractService';
import { projectService } from '../../lib/services/projectService';
import { taskService, TaskRow } from '../../lib/services/taskService';
import { employeeService } from '../../lib/services/employeeService';
import { thuChiService } from '../../lib/services/thuChiService';
import { useHopDongModal } from '../../contexts/HopDongModalContext';

interface Contract {
    id: number;
    uuid?: string;
    duAnId?: string | null;
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

interface ProjectGroup {
    id: number;
    projectName: string;
    contracts: Contract[];
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'info' | 'warning'; onClose: () => void }) {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const bgColor = type === 'success' ? 'bg-emerald-500' : type === 'warning' ? 'bg-amber-500' : 'bg-blue-500';
    const Icon = type === 'success' ? CheckCircle : type === 'warning' ? Trash2 : PlusCircle;

    return (
        <div className={`fixed top-5 right-5 z-[100] ${bgColor} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-right-4`}>
            <Icon size={18} />
            <span className="text-sm font-medium">{message}</span>
            <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded p-0.5 transition-colors">
                <X size={14} />
            </button>
        </div>
    );
}

export function HopDong() {
    const [searchParams] = useSearchParams();
    const filterFromUrl = searchParams.get('project');
    
    const { openThemHopDong, openChiTietHopDong, openDelete } = useHopDongModal();
    
    const [items, setItems] = useState<ProjectGroup[]>([]);
    const [projects, setProjects] = useState<Array<{ id: string; ten_du_an: string }>>([]);
    const [employees, setEmployees] = useState<Array<{ id: string; full_name: string; code: string; anh_nhan_su?: string | null }>>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'table' | 'folder'>('table');
    const [selectedFolderProjectId, setSelectedFolderProjectId] = useState<number | null>(null);
    const [expandedProjects, setExpandedProjects] = useState<number[]>([]);
    
    // Filter states
    const [selectedDuAnIds, setSelectedDuAnIds] = useState<Set<string>>(new Set());
    const [selectedHopDongIds, setSelectedHopDongIds] = useState<Set<string>>(new Set());
    const [openFilterDropdown, setOpenFilterDropdown] = useState<'duan' | 'hopdong' | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);
    const [tasksByContract, setTasksByContract] = useState<Map<string, TaskRow[]>>(new Map());

    const formatCurrency = (amount: number) => {
        if (amount === 0) return '0';
        return amount.toLocaleString('vi-VN');
    };

    const toggleProject = (projectId: number) => {
        setExpandedProjects(prev =>
            prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]
        );
    };

    // Initial data loading
    useEffect(() => {
        (async () => {
            try {
                const [projectList, employeeList, contractRows, allThuChi] = await Promise.all([
                    projectService.getAll(),
                    employeeService.getAll(),
                    contractService.getAll(),
                    thuChiService.getAll()
                ]);

                setProjects(projectList.map(p => ({ id: p.id, ten_du_an: p.ten_du_an })));
                setEmployees(employeeList.map(emp => ({
                    id: emp.id.toString(),
                    full_name: emp.full_name || emp.name || emp.hoTen || '',
                    code: emp.code || '',
                    anh_nhan_su: (emp as any).anh_nhan_su || null
                })));

                // Calculate "Đã thu" map
                const thuChiMap = new Map<string, number>();
                allThuChi.forEach(tc => {
                    if (tc.hop_dong_id && tc.loai_phieu === 'Phiếu thu') {
                        const current = thuChiMap.get(tc.hop_dong_id) || 0;
                        thuChiMap.set(tc.hop_dong_id, current + (tc.so_tien || 0));
                    }
                });

                // Grouping logic
                const groups = new Map<string, ContractRow[]>();
                contractRows.forEach(row => {
                    const key = row.project_name || '(Chưa có tên dự án)';
                    if (!groups.has(key)) groups.set(key, []);
                    groups.get(key)!.push(row);
                });

                let idCounter = 1;
                const projectGroups: ProjectGroup[] = Array.from(groups.entries()).map(([projectName, contracts]) => ({
                    id: idCounter++,
                    projectName,
                    contracts: contracts.map((c, idx) => {
                        const daThu = thuChiMap.get(c.id) || 0;
                        const giaTriQT = Number(c.gia_tri_qt || 0);
                        return {
                            id: idx + 1,
                            uuid: c.id,
                            duAnId: c.du_an_id || null,
                            fileStatus: c.file_status || 'Chưa có file',
                            files: c.files || [],
                            ngayKyHD: c.ngay_ky_hd ? new Date(c.ngay_ky_hd).toLocaleDateString('vi-VN') : '',
                            soHopDong: c.so_hop_dong || '',
                            tenGoiThau: c.ten_goi_thau || '',
                            loaiDichVu: c.loai_dich_vu || '',
                            giaTriHD: Number(c.gia_tri_hd || 0),
                            giaTriQT,
                            daThu,
                            conPhaiThu: giaTriQT - daThu,
                            ngayUpdate: c.ngay_update ? new Date(c.ngay_update).toLocaleDateString('vi-VN') : '',
                            nhanSuId: c.nhan_su_id || null,
                            nhanSuIds: (c as any).nhan_su_ids || (c.nhan_su_id ? [c.nhan_su_id] : []),
                            nhanSuTen: c.nhan_su_ten || null,
                            nhanSuCode: c.nhan_su_code || null,
                        };
                    }),
                }));

                setItems(projectGroups);
                setExpandedProjects(projectGroups.map(p => p.id));

                // Load tasks for progress
                const tasksMap = new Map<string, TaskRow[]>();
                await Promise.all(contractRows.map(async (row) => {
                    try {
                        const contractTasks = await taskService.getByHopDongId(row.id);
                        tasksMap.set(row.id, contractTasks);
                    } catch (e) {
                        tasksMap.set(row.id, []);
                    }
                }));
                setTasksByContract(tasksMap);
            } catch (error) {
                console.error("[HopDong] Error loading data:", error);
            }
        })();
    }, []);

    // Memoized filtered items
    const filteredItems = useMemo(() => {
        const searchLower = searchTerm.toLowerCase();
        return items.filter(project => {
            if (filterFromUrl && project.projectName !== filterFromUrl) return false;
            
            if (selectedDuAnIds.size > 0) {
                const projId = projects.find(p => p.ten_du_an === project.projectName)?.id;
                if (!projId || !selectedDuAnIds.has(projId)) return false;
            }
            return true;
        }).map(project => ({
            ...project,
            contracts: project.contracts.filter(c => {
                const matchesSearch = !searchTerm || 
                    c.soHopDong.toLowerCase().includes(searchLower) ||
                    c.tenGoiThau.toLowerCase().includes(searchLower) ||
                    c.loaiDichVu.toLowerCase().includes(searchLower) ||
                    project.projectName.toLowerCase().includes(searchLower);
                
                const matchesContract = selectedHopDongIds.size === 0 || (c.uuid && selectedHopDongIds.has(c.uuid));
                return matchesSearch && matchesContract;
            })
        })).filter(project => project.contracts.length > 0 || project.projectName.toLowerCase().includes(searchLower));
    }, [items, filterFromUrl, selectedDuAnIds, selectedHopDongIds, searchTerm, projects]);

    // Handle Folder selection effect
    useEffect(() => {
        if (viewMode === 'folder' && filteredItems.length > 0) {
            const exists = selectedFolderProjectId !== null && filteredItems.some(p => p.id === selectedFolderProjectId);
            if (!exists) setSelectedFolderProjectId(filteredItems[0].id);
        }
    }, [viewMode, filteredItems, selectedFolderProjectId]);

    const getContractProgress = (uuid: string | undefined) => {
        const tasks = tasksByContract.get(uuid || '') || [];
        if (tasks.length === 0) return 0;
        const completed = tasks.filter(t => t.tien_do === 100).length;
        return Math.round((completed / tasks.length) * 100);
    };

    return (
        <div className="pb-10 animate-in fade-in duration-500">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
                {/* Header Section */}
                <div className="px-8 py-6 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-800 flex justify-between items-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
                    <div className="relative z-10">
                        <h1 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                            <Briefcase className="text-indigo-400" />
                            Quản lý hợp đồng
                        </h1>
                        <p className="text-indigo-200/60 text-xs font-bold uppercase tracking-widest mt-1">Theo dõi tiến độ & tài chính dự án</p>
                    </div>
                    <button
                        onClick={() => openThemHopDong()}
                        className="group relative flex items-center gap-2 px-6 py-3 bg-white text-indigo-900 text-sm font-black rounded-2xl shadow-lg hover:shadow-white/20 transition-all hover:scale-[1.05] active:scale-[0.98]"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                        TẠO HỢP ĐỒNG MỚI
                    </button>
                </div>

                {/* Filter Bar */}
                <div className="px-8 py-5 border-b border-slate-100 bg-white flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 max-w-md group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Tìm theo số HĐ, gói thầu..."
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Filter Project */}
                        <div className="relative">
                            <button
                                onClick={() => setOpenFilterDropdown(openFilterDropdown === 'duan' ? null : 'duan')}
                                className="flex items-center gap-2 px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:border-indigo-200 transition-all"
                            >
                                <span className="text-sm font-bold text-slate-600">Dự án</span>
                                {selectedDuAnIds.size > 0 && <span className="bg-indigo-600 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">{selectedDuAnIds.size}</span>}
                                <ChevronDown size={14} className={`text-slate-400 transition-transform ${openFilterDropdown === 'duan' ? 'rotate-180' : ''}`} />
                            </button>
                            {openFilterDropdown === 'duan' && (
                                <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-slate-100 rounded-3xl shadow-2xl z-[50] p-3 animate-in fade-in zoom-in-95">
                                    <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1">
                                        {projects.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => {
                                                    const newSet = new Set(selectedDuAnIds);
                                                    newSet.has(p.id) ? newSet.delete(p.id) : newSet.add(p.id);
                                                    setSelectedDuAnIds(newSet);
                                                }}
                                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${selectedDuAnIds.has(p.id) ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-600'}`}
                                            >
                                                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${selectedDuAnIds.has(p.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-200'}`}>
                                                    {selectedDuAnIds.has(p.id) && <CheckCircle className="text-white" size={12} />}
                                                </div>
                                                <span className="text-xs font-bold text-left flex-1">{p.ten_du_an}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <button onClick={() => setSelectedDuAnIds(new Set())} className="w-full mt-2 py-2 text-[10px] font-black text-slate-400 hover:text-indigo-600 uppercase tracking-widest transition-colors">Thiết lập lại</button>
                                </div>
                            )}
                        </div>

                        {/* View Switcher */}
                        <div className="flex bg-slate-100 p-1.5 rounded-2xl ml-4">
                            <button
                                onClick={() => setViewMode('table')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <BarChart3 size={16} /> Bảng
                            </button>
                            <button
                                onClick={() => setViewMode('folder')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'folder' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <FolderOpen size={16} /> Thư mục
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content View */}
                {viewMode === 'table' ? (
                    <div className="w-full overflow-x-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="py-4 pl-8 w-10"></th>
                                    <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Hợp đồng & Trạng thái</th>
                                    <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Phụ trách</th>
                                    <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Giá trị QT</th>
                                    <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Đã thu</th>
                                    <th className="py-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiến độ công việc</th>
                                    <th className="py-4 pr-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Lệnh</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map(group => (
                                    <React.Fragment key={group.id}>
                                        <tr onClick={() => toggleProject(group.id)} className="bg-slate-50/30 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100/50">
                                            <td className="py-3 pl-8">
                                                <ChevronDown size={14} className={`text-slate-300 transition-transform ${expandedProjects.includes(group.id) ? '' : '-rotate-90'}`} />
                                            </td>
                                            <td colSpan={6} className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse" />
                                                    <span className="text-sm font-black text-slate-800">{group.projectName}</span>
                                                    <span className="text-[10px] font-black text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-full ml-2">{group.contracts.length} hợp đồng</span>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedProjects.includes(group.id) && group.contracts.map(c => {
                                            const progress = getContractProgress(c.uuid);
                                            return (
                                                <tr key={c.uuid} className="group hover:bg-indigo-50/20 transition-all border-b border-slate-50 last:border-0 grow-on-hover px-4">
                                                    <td className="py-4"></td>
                                                    <td className="py-4 px-4">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[13px] font-black text-slate-700">{c.soHopDong}</span>
                                                                <span className="text-[10px] bg-red-50 text-red-600 font-bold px-2 py-0.5 rounded-md italic">{c.fileStatus}</span>
                                                            </div>
                                                            <span className="text-[11px] font-medium text-slate-400 line-clamp-1">{c.tenGoiThau}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <div className="flex -space-x-2">
                                                            {c.nhanSuIds?.slice(0, 3).map((id, i) => {
                                                                const emp = employees.find(e => e.id === String(id));
                                                                return (
                                                                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden" title={emp?.full_name}>
                                                                        {emp?.anh_nhan_su ? <img src={emp.anh_nhan_su} className="w-full h-full object-cover" /> : <User size={14} className="m-auto mt-1.5 text-slate-400" />}
                                                                    </div>
                                                                );
                                                            })}
                                                            {c.nhanSuIds && c.nhanSuIds.length > 3 && (
                                                                <div className="w-8 h-8 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center">
                                                                    <span className="text-[10px] font-black text-indigo-600">+{c.nhanSuIds.length - 3}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4 text-right">
                                                        <span className="text-sm font-black text-slate-800">{formatCurrency(c.giaTriQT)}</span>
                                                    </td>
                                                    <td className="py-4 px-4 text-right">
                                                        <span className="text-sm font-black text-emerald-600">{formatCurrency(c.daThu)}</span>
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                <div className={`h-full transition-all duration-1000 ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${progress}%` }} />
                                                            </div>
                                                            <span className="text-xs font-black text-slate-600">{progress}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 pr-8 text-center">
                                                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => openChiTietHopDong(c)} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><Eye size={14} /></button>
                                                            <button onClick={() => openThemHopDong(c)} className="p-2 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-600 hover:text-white transition-all shadow-sm"><Edit size={14} /></button>
                                                            <button onClick={() => openDelete({ id: c.id, uuid: c.uuid, soHopDong: c.soHopDong })} className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"><Trash2 size={14} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex h-[600px]">
                        {/* Folder Sidebar */}
                        <div className="w-1/3 lg:w-1/4 border-r border-slate-100 bg-slate-50/30 overflow-y-auto custom-scrollbar">
                            <div className="p-4 space-y-2">
                                {filteredItems.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => setSelectedFolderProjectId(p.id)}
                                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all ${selectedFolderProjectId === p.id ? 'bg-white shadow-xl shadow-indigo-500/10 border border-indigo-100' : 'hover:bg-white/50'}`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`p-2 rounded-xl ${selectedFolderProjectId === p.id ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border border-slate-100'}`}>
                                                <FolderOpen size={16} />
                                            </div>
                                            <span className={`text-[13px] font-black truncate text-left ${selectedFolderProjectId === p.id ? 'text-indigo-900' : 'text-slate-600'}`}>{p.projectName}</span>
                                        </div>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${selectedFolderProjectId === p.id ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>{p.contracts.length}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Folder Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/10 p-6">
                            {(() => {
                                const selected = filteredItems.find(p => p.id === selectedFolderProjectId);
                                if (!selected) return <div className="h-full flex items-center justify-center text-slate-400 font-bold">Chọn thư mục để xem nội dung</div>;
                                return (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between mb-8">
                                            <div>
                                                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">{selected.projectName}</h2>
                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Tổng cộng {selected.contracts.length} hợp đồng</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="p-4 bg-white rounded-3xl border border-slate-100 shadow-sm flex items-center gap-3">
                                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><BarChart3 size={16} /></div>
                                                    <div>
                                                        <div className="text-[10px] font-black text-slate-400 uppercase">Tổng giá trị</div>
                                                        <div className="text-sm font-black text-slate-800">{formatCurrency(selected.contracts.reduce((s, c) => s + c.giaTriQT, 0))}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {selected.contracts.map(c => {
                                                const progress = getContractProgress(c.uuid);
                                                return (
                                                    <div key={c.uuid} onClick={() => openChiTietHopDong(c)} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="text-[10px] font-black text-indigo-500 uppercase flex items-center gap-1">
                                                                    <FileText size={10} /> {c.soHopDong}
                                                                </span>
                                                                <h3 className="font-black text-slate-800 line-clamp-1">{c.tenGoiThau}</h3>
                                                            </div>
                                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={(e) => { e.stopPropagation(); openThemHopDong(c); }} className="p-2 bg-slate-50 text-slate-400 hover:text-orange-500 rounded-lg transition-colors"><Edit size={12} /></button>
                                                                <button onClick={(e) => { e.stopPropagation(); openDelete({ id: c.id, uuid: c.uuid, soHopDong: c.soHopDong }); }} className="p-2 bg-slate-50 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"><Trash2 size={12} /></button>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                                            <div className="p-3 bg-slate-50 rounded-2xl">
                                                                <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Quyết toán</div>
                                                                <div className="text-xs font-black text-slate-700">{formatCurrency(c.giaTriQT)}</div>
                                                            </div>
                                                            <div className="p-3 bg-emerald-50/50 rounded-2xl">
                                                                <div className="text-[9px] font-black text-emerald-600 uppercase mb-1">Đã thu</div>
                                                                <div className="text-xs font-black text-emerald-700">{formatCurrency(c.daThu)}</div>
                                                            </div>
                                                        </div>

                                                        <div className="space-y-2">
                                                            <div className="flex justify-between text-[10px] font-black">
                                                                <span className="text-slate-400 uppercase tracking-widest">Tiến độ</span>
                                                                <span className="text-indigo-600">{progress}%</span>
                                                            </div>
                                                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                <div className={`h-full transition-all duration-1000 ${progress === 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${progress}%` }} />
                                                            </div>
                                                        </div>

                                                        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                                                            <div className="flex -space-x-1.5">
                                                                {c.nhanSuIds?.slice(0, 3).map((id, i) => (
                                                                    <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                                                                        <User size={10} className="m-auto mt-1 text-slate-400" />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-300">
                                                                <Calendar size={10} />
                                                                {c.ngayKyHD}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {/* Footer Stats */}
                <div className="px-8 py-4 bg-slate-900 flex flex-wrap items-center gap-12 text-sm justify-between">
                    <div className="flex flex-wrap items-center gap-12">
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-white/10 rounded-2xl text-white"><Briefcase size={20} /></div>
                            <div>
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Hợp đồng</div>
                                <div className="text-white font-black">{items.reduce((sum, p) => sum + p.contracts.length, 0)} hợp đồng</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-white/10 rounded-2xl text-emerald-400"><BarChart3 size={20} /></div>
                            <div>
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tổng quyết toán</div>
                                <div className="text-white font-black">{formatCurrency(items.reduce((sum, p) => sum + p.contracts.reduce((s, c) => s + c.giaTriQT, 0), 0))} VNĐ</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="p-2.5 bg-white/10 rounded-2xl text-amber-400"><CheckCircle size={20} /></div>
                            <div>
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Đã thu hồi</div>
                                <div className="text-emerald-400 font-black">{formatCurrency(items.reduce((sum, p) => sum + p.contracts.reduce((s, c) => s + c.daThu, 0), 0))} VNĐ</div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Tổng dự án:</span>
                        <span className="font-bold text-white">{items.length}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
