import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, Plus, Eye, Edit, Trash2, X, ChevronDown, FileText, FolderOpen, PlusCircle, User, CheckCircle, BarChart3, Briefcase, Calendar } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { contractService, ContractRow, ContractFile } from '../../lib/services/contractService';
import { projectService } from '../../lib/services/projectService';
import { taskService, TaskRow } from '../../lib/services/taskService';
import { employeeService } from '../../lib/services/employeeService';
import { thuChiService } from '../../lib/services/thuChiService';
import { useHopDongModal } from '../../contexts/HopDongModalContext';
import type { NguongChiNhanSuLoai } from '../../lib/nguongChiNhanSu';
import { normalizeNguongLoai, tienQuyDoiNguongChiNhanSu } from '../../lib/nguongChiNhanSu';
import { ExcelImportExportBar } from '../../components/ExcelImportExportBar';
import type { ExcelColumnDef } from '../../lib/excelTableTools';
import { parseMoneyVi } from '../../lib/excelTableTools';

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
    nguongChiNhanSu: number;
    nguongChiNhanSuLoai: NguongChiNhanSuLoai;
    /** Tiền quy đổi (QT × % hoặc nhập VND) */
    nguongChiNhanSuTien: number;
    daThu: number;
    conPhaiThu: number;
    ngayUpdate: string;
    nhanSuId?: string | null;
    nhanSuIds?: string[];
    nhanSuTen?: string | null;
    nhanSuCode?: string | null;
    tenDayDuChuDauTu?: string | null;
    daiDienBenA?: string | null;
    chucVuDaiDienA?: string | null;
    mst?: string | null;
    diaChiTaiThoiDiemKy?: string | null;
}

interface ProjectGroup {
    id: number;
    projectName: string;
    contracts: Contract[];
}

function Toast({ message, type, onClose, action }: {
    message: string;
    type: 'success' | 'info' | 'warning';
    onClose: () => void;
    action?: { label: string; onClick: () => void }
}) {
    useEffect(() => {
        // Don't auto-close if there's an action (like opening a doc)
        if (action) return;

        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose, action]);

    const bgColor = type === 'success' ? 'bg-emerald-500' : type === 'warning' ? 'bg-amber-500' : 'bg-blue-500';
    const Icon = type === 'success' ? CheckCircle : type === 'warning' ? Trash2 : PlusCircle;

    return createPortal(
        <div className={`fixed top-5 right-5 z-[10000] ${bgColor} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-right-4`}>
            <Icon size={18} />
            <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">{message}</span>
                {action && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            action.onClick();
                        }}
                        className="text-[11px] font-bold bg-white/20 hover:bg-white/30 px-2 py-1 rounded border border-white/30 transition-colors w-fit"
                    >
                        {action.label}
                    </button>
                )}
            </div>
            <button onClick={onClose} className="ml-2 hover:opacity-70 p-1 rounded-full hover:bg-white/10 transition-colors">
                <X size={16} />
            </button>
        </div>,
        document.body
    );
}

export function HopDong() {
    const [searchParams] = useSearchParams();
    const filterFromUrl = searchParams.get('project');

    const {
        openThemHopDong,
        openChiTietHopDong,
        openDelete,
        setIsExporting
    } = useHopDongModal();

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
    const [toast, setToast] = useState<{
        message: string;
        type: 'success' | 'info' | 'warning';
        action?: { label: string; onClick: () => void }
    } | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    const hopDongExcelColumns: ExcelColumnDef[] = [
        { key: 'ten_du_an', header: 'Tên dự án', example: 'Khớp tên dự án hệ thống' },
        { key: 'so_hop_dong', header: 'Số hợp đồng', example: 'HĐ-01/2025' },
        { key: 'ten_goi_thau', header: 'Tên gói thầu', example: 'Gói thi công' },
        { key: 'gia_tri_hd', header: 'Giá trị HĐ', example: '1000000000' },
        { key: 'gia_tri_qt', header: 'Giá trị quyết toán', example: '1000000000' },
        { key: 'ngay_ky_hd', header: 'Ngày ký HĐ', example: '2025-01-15' },
    ];
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
                        const loaiNs = normalizeNguongLoai(c.nguong_chi_nhan_su_loai);
                        const rawNguong = Number(c.nguong_chi_nhan_su ?? 0);
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
                            nguongChiNhanSu: rawNguong,
                            nguongChiNhanSuLoai: loaiNs,
                            nguongChiNhanSuTien: tienQuyDoiNguongChiNhanSu(loaiNs, giaTriQT, rawNguong),
                            daThu,
                            conPhaiThu: giaTriQT - daThu,
                            ngayUpdate: c.ngay_update ? new Date(c.ngay_update).toLocaleDateString('vi-VN') : '',
                            nhanSuId: c.nhan_su_id || null,
                            nhanSuIds: (c as any).nhan_su_ids || (c.nhan_su_id ? [c.nhan_su_id] : []),
                            nhanSuTen: c.nhan_su_ten || null,
                            nhanSuCode: c.nhan_su_code || null,
                            tenDayDuChuDauTu: c.ten_day_du_chu_dau_tu || null,
                            daiDienBenA: c.dai_dien_ben_a || null,
                            chucVuDaiDienA: c.chuc_vu_dai_dien_a || null,
                            mst: c.mst || null,
                            diaChiTaiThoiDiemKy: c.dia_chi_tai_thoi_diem_ky || null,
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
    }, [reloadKey]);

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

    const handleExportGoogleDocs = async (contract: Contract, projectName: string) => {
        try {
            setIsExporting(true);
            console.log('[HopDong] Preparing export for contract:', { contract, projectName });
            setToast({ message: 'Đang chuẩn bị dữ liệu xuất...', type: 'info' });

            const payload = {
                ...contract,
                projectName,
            };

            console.log('[HopDong] Payload to send:', payload);
            const result = await contractService.exportToGoogleDocs(payload);

            if (result && result.success && result.documentUrl) {
                setToast({
                    message: 'Xuất file thành công!',
                    type: 'success',
                    action: {
                        label: 'Mở tài liệu',
                        onClick: () => window.open(result.documentUrl, '_blank')
                    }
                });
            } else {
                setToast({ message: 'Yêu cầu xuất file đã được gửi!', type: 'success' });
            }
        } catch (error: any) {
            console.error('[HopDong] Export error:', error);
            setToast({ message: error.message || 'Lỗi khi xuất file', type: 'warning' });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    action={toast.action}
                    onClose={() => setToast(null)}
                />
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Header — cùng nhịp với trang Nhân sự */}
                <div className="px-4 md:px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h2 className="text-lg font-bold text-slate-700 uppercase tracking-tight">
                        Quản lý hợp đồng
                    </h2>
                    <div className="flex flex-wrap items-center gap-2">
                        <ExcelImportExportBar
                            columns={hopDongExcelColumns}
                            templateFileName="mau-hop-dong"
                            sheetName="Hop dong"
                            onImport={async (rows) => {
                                const errors: string[] = [];
                                let ok = 0;
                                for (let i = 0; i < rows.length; i++) {
                                    const r = rows[i];
                                    const tenDuAn = (r.ten_du_an || '').trim();
                                    const p = projects.find(
                                        (x) => x.ten_du_an.trim().toLowerCase() === tenDuAn.toLowerCase(),
                                    );
                                    if (!tenDuAn || !p) {
                                        errors.push(
                                            `Dòng ${i + 2}: không tìm thấy dự án "${tenDuAn || '(trống)'}"`,
                                        );
                                        continue;
                                    }
                                    try {
                                        await contractService.create({
                                            du_an_id: p.id,
                                            so_hop_dong: r.so_hop_dong?.trim() || null,
                                            ten_goi_thau: r.ten_goi_thau?.trim() || null,
                                            gia_tri_hd: parseMoneyVi(r.gia_tri_hd || '0') || null,
                                            gia_tri_qt: parseMoneyVi(r.gia_tri_qt || '0') || null,
                                            ngay_ky_hd: r.ngay_ky_hd?.trim() || null,
                                        });
                                        ok++;
                                    } catch (e: any) {
                                        errors.push(`Dòng ${i + 2}: ${e?.message || 'Lỗi'}`);
                                    }
                                }
                                return { ok, errors };
                            }}
                            onDone={() => {
                                setReloadKey((k) => k + 1);
                                setToast({
                                    message: 'Đã xử lý nhập Excel hợp đồng.',
                                    type: 'success',
                                });
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => openThemHopDong()}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm shrink-0"
                        >
                            <Plus size={18} />
                            Thêm hợp đồng
                        </button>
                    </div>
                </div>

                {/* Tổng hợp — đặt trên cùng để xem nhanh số liệu */}
                <div className="px-4 md:px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-6 md:gap-10 text-sm justify-between">
                    <div className="flex flex-wrap items-center gap-6 md:gap-10">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-md bg-white border border-slate-200 text-slate-600"><Briefcase size={18} /></div>
                            <div>
                                <div className="text-[10px] font-semibold text-slate-500 uppercase">Hợp đồng</div>
                                <div className="font-bold text-slate-800">{items.reduce((sum, p) => sum + p.contracts.length, 0)}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-md bg-white border border-slate-200 text-emerald-600"><BarChart3 size={18} /></div>
                            <div>
                                <div className="text-[10px] font-semibold text-slate-500 uppercase">Tổng quyết toán</div>
                                <div className="font-bold text-slate-800">{formatCurrency(items.reduce((sum, p) => sum + p.contracts.reduce((s, c) => s + c.giaTriQT, 0), 0))} đ</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-md bg-white border border-slate-200 text-amber-600"><CheckCircle size={18} /></div>
                            <div>
                                <div className="text-[10px] font-semibold text-slate-500 uppercase">Đã thu</div>
                                <div className="font-bold text-emerald-700">{formatCurrency(items.reduce((sum, p) => sum + p.contracts.reduce((s, c) => s + c.daThu, 0), 0))} đ</div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-600">
                        <span className="text-xs font-semibold uppercase">Dự án:</span>
                        <span className="font-bold text-slate-900">{items.length}</span>
                    </div>
                </div>

                {/* Toolbar — tìm kiếm + lọc (giống nhịp Nhân sự) */}
                <div className="px-4 md:px-6 py-4 border-b border-slate-200 flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
                    <div className="relative w-full lg:max-w-md">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Tìm theo số HĐ, gói thầu, dự án..."
                            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setOpenFilterDropdown(openFilterDropdown === 'duan' ? null : 'duan')}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                            >
                                <span>Dự án</span>
                                {selectedDuAnIds.size > 0 && (
                                    <span className="bg-blue-600 text-white text-[10px] font-bold min-w-[1.25rem] h-5 px-1 rounded-full flex items-center justify-center">
                                        {selectedDuAnIds.size}
                                    </span>
                                )}
                                <ChevronDown size={14} className={`text-slate-400 shrink-0 transition-transform ${openFilterDropdown === 'duan' ? 'rotate-180' : ''}`} />
                            </button>
                            {openFilterDropdown === 'duan' && (
                                <div className="absolute top-full left-0 mt-1 w-72 bg-white border border-slate-200 rounded-lg shadow-lg z-[50] p-2 animate-in fade-in zoom-in-95">
                                    <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-0.5">
                                        {projects.map((p) => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => {
                                                    const newSet = new Set(selectedDuAnIds);
                                                    newSet.has(p.id) ? newSet.delete(p.id) : newSet.add(p.id);
                                                    setSelectedDuAnIds(newSet);
                                                }}
                                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-left text-sm transition-colors ${selectedDuAnIds.has(p.id) ? 'bg-blue-50 text-blue-800' : 'hover:bg-slate-50 text-slate-700'}`}
                                            >
                                                <div
                                                    className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${selectedDuAnIds.has(p.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}
                                                >
                                                    {selectedDuAnIds.has(p.id) && <CheckCircle className="text-white" size={12} />}
                                                </div>
                                                <span className="font-medium truncate">{p.ten_du_an}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedDuAnIds(new Set())}
                                        className="w-full mt-2 py-1.5 text-xs font-semibold text-slate-500 hover:text-blue-700"
                                    >
                                        Bỏ chọn dự án
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex bg-slate-100 p-1 rounded-md">
                            <button
                                type="button"
                                onClick={() => setViewMode('table')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide transition-colors ${viewMode === 'table' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <BarChart3 size={14} /> Bảng
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('folder')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wide transition-colors ${viewMode === 'folder' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <FolderOpen size={14} /> Thư mục
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content View */}
                {viewMode === 'table' ? (
                    <div className="w-full overflow-x-auto custom-scrollbar">
                        <table className="w-full text-xs text-left border-collapse">
                            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="py-2 px-2 w-8 pl-3 md:pl-5"></th>
                                    <th className="py-2 px-2 text-[10px] uppercase tracking-wide">Hợp đồng &amp; trạng thái</th>
                                    <th className="py-2 px-2 text-[10px] uppercase tracking-wide">Phụ trách</th>
                                    <th className="py-2 px-2 text-[10px] uppercase tracking-wide text-right">Giá trị QT</th>
                                    <th className="py-2 px-2 text-[10px] uppercase tracking-wide text-right">Đã thu</th>
                                    <th className="py-2 px-2 text-[10px] uppercase tracking-wide">Tiến độ</th>
                                    <th className="py-2 px-2 pr-3 md:pr-5 text-center text-[10px] uppercase tracking-wide w-24">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItems.map(group => (
                                    <React.Fragment key={group.id}>
                                        <tr onClick={() => toggleProject(group.id)} className="bg-slate-50/80 cursor-pointer hover:bg-slate-100 transition-colors border-b border-slate-200">
                                            <td className="py-2 pl-3 md:pl-5">
                                                <ChevronDown size={12} className={`text-slate-400 transition-transform ${expandedProjects.includes(group.id) ? '' : '-rotate-90'}`} />
                                            </td>
                                            <td colSpan={7} className="py-2 px-2">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-xs font-bold text-slate-800">{group.projectName}</span>
                                                    <span className="text-[9px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-full">{group.contracts.length} HĐ</span>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedProjects.includes(group.id) && group.contracts.map(c => {
                                            const progress = getContractProgress(c.uuid);
                                            return (
                                                <tr key={c.uuid} className="group border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                                    <td className="py-2 px-2"></td>
                                                    <td className="py-2 px-2">
                                                        <div className="flex flex-col gap-0.5">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="text-xs font-bold text-slate-800">{c.soHopDong}</span>
                                                                <span className="text-[9px] bg-red-50 text-red-600 font-semibold px-1.5 py-0.5 rounded border border-red-100">{c.fileStatus}</span>
                                                            </div>
                                                            <span className="text-[11px] text-slate-500 line-clamp-1">{c.tenGoiThau}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <div className="flex -space-x-1.5">
                                                            {c.nhanSuIds?.slice(0, 3).map((id, i) => {
                                                                const emp = employees.find(e => e.id === String(id));
                                                                return (
                                                                    <div key={i} className="w-6 h-6 rounded-full border border-white bg-slate-200 overflow-hidden" title={emp?.full_name}>
                                                                        {emp?.anh_nhan_su ? <img src={emp.anh_nhan_su} className="w-full h-full object-cover" alt="" /> : <User size={11} className="m-auto mt-1 text-slate-400" />}
                                                                    </div>
                                                                );
                                                            })}
                                                            {c.nhanSuIds && c.nhanSuIds.length > 3 && (
                                                                <div className="w-6 h-6 rounded-full border border-white bg-blue-50 flex items-center justify-center">
                                                                    <span className="text-[9px] font-bold text-blue-700">+{c.nhanSuIds.length - 3}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-2 text-right">
                                                        <span className="text-xs font-semibold text-slate-800">{formatCurrency(c.giaTriQT)}</span>
                                                    </td>
                                                    <td className="py-2 px-2 text-right">
                                                        <span className="text-xs font-semibold text-emerald-600">{formatCurrency(c.daThu)}</span>
                                                    </td>
                                                    <td className="py-2 px-2 text-right">
                                                        <div className="flex flex-col items-end gap-0">
                                                            <span
                                                                className="text-xs font-semibold text-violet-700 tabular-nums"
                                                                title={
                                                                    c.nguongChiNhanSuLoai === 'phan_tram' && c.nguongChiNhanSu > 0
                                                                        ? `${c.nguongChiNhanSu}% × Giá trị QT = ${formatCurrency(c.nguongChiNhanSuTien)} đ`
                                                                        : undefined
                                                                }
                                                            >
                                                                {formatCurrency(c.nguongChiNhanSuTien)}
                                                            </span>
                                                            {c.nguongChiNhanSuLoai === 'phan_tram' && c.nguongChiNhanSu > 0 ? (
                                                                <span className="text-[9px] text-slate-500 tabular-nums">
                                                                    {c.nguongChiNhanSu}% QT
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <div className="flex items-center gap-1.5 min-w-[5.5rem]">
                                                            <div className="flex-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                                                                <div className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${progress}%` }} />
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-600 tabular-nums w-7">{progress}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-2 px-1 pr-3 md:pr-5 text-center">
                                                        <div className="flex items-center justify-center gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                                                            <button type="button" onClick={() => handleExportGoogleDocs(c, group.projectName)} className="p-1.5 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-md" title="Xuất Google Docs"><FileText size={12} /></button>
                                                            <button type="button" onClick={() => openChiTietHopDong(c)} className="p-1.5 text-slate-600 hover:bg-blue-50 hover:text-blue-700 rounded-md" title="Xem chi tiết"><Eye size={12} /></button>
                                                            <button type="button" onClick={() => openThemHopDong(c)} className="p-1.5 text-slate-600 hover:bg-amber-50 hover:text-amber-800 rounded-md" title="Sửa"><Edit size={12} /></button>
                                                            <button type="button" onClick={() => openDelete({ id: c.id, uuid: c.uuid, soHopDong: c.soHopDong })} className="p-1.5 text-slate-600 hover:bg-red-50 hover:text-red-700 rounded-md" title="Xóa"><Trash2 size={12} /></button>
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
                    <div className="flex h-[min(600px,70vh)] min-h-[320px] border-t border-slate-200">
                        {/* Folder Sidebar */}
                        <div className="w-1/3 lg:w-1/4 border-r border-slate-200 bg-slate-50 overflow-y-auto custom-scrollbar">
                            <div className="p-2 space-y-0.5">
                                {filteredItems.map(p => (
                                    <button
                                        type="button"
                                        key={p.id}
                                        onClick={() => setSelectedFolderProjectId(p.id)}
                                        className={`w-full flex items-center justify-between p-2 rounded-md border transition-colors ${selectedFolderProjectId === p.id ? 'bg-white border-blue-200 shadow-sm' : 'border-transparent hover:bg-white hover:border-slate-200'}`}
                                    >
                                        <div className="flex items-center gap-1.5 min-w-0">
                                            <div className={`p-1 rounded shrink-0 ${selectedFolderProjectId === p.id ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
                                                <FolderOpen size={12} />
                                            </div>
                                            <span className={`text-xs font-bold truncate text-left ${selectedFolderProjectId === p.id ? 'text-slate-900' : 'text-slate-600'}`}>{p.projectName}</span>
                                        </div>
                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${selectedFolderProjectId === p.id ? 'bg-blue-50 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>{p.contracts.length}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Folder Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar bg-white p-3 md:p-4">
                            {(() => {
                                const selected = filteredItems.find(p => p.id === selectedFolderProjectId);
                                if (!selected) return <div className="h-full flex items-center justify-center text-slate-500 text-xs font-medium">Chọn dự án bên trái để xem hợp đồng</div>;
                                return (
                                    <div className="space-y-3">
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200">
                                            <div>
                                                <h3 className="text-base font-bold text-slate-800">{selected.projectName}</h3>
                                                <p className="text-[11px] text-slate-500">{selected.contracts.length} hợp đồng</p>
                                            </div>
                                            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-slate-200 bg-slate-50">
                                                <div className="p-1 bg-emerald-100 text-emerald-700 rounded"><BarChart3 size={12} /></div>
                                                <div>
                                                    <div className="text-[9px] font-semibold text-slate-500 uppercase">Tổng QT</div>
                                                    <div className="text-xs font-bold text-slate-800">{formatCurrency(selected.contracts.reduce((s, c) => s + c.giaTriQT, 0))}</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                                            {selected.contracts.map(c => {
                                                const progress = getContractProgress(c.uuid);
                                                return (
                                                    <div key={c.uuid} role="button" tabIndex={0} onClick={() => openChiTietHopDong(c)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openChiTietHopDong(c); } }} className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm hover:border-slate-300 transition-all cursor-pointer group text-left">
                                                        <div className="flex justify-between items-start gap-1.5 mb-2">
                                                            <div className="flex flex-col gap-0.5 min-w-0">
                                                                <span className="text-[9px] font-bold text-blue-700 uppercase flex items-center gap-0.5 truncate">
                                                                    <FileText size={9} className="shrink-0" /> {c.soHopDong}
                                                                </span>
                                                                <span className="font-bold text-slate-800 line-clamp-1 text-xs leading-tight">{c.tenGoiThau}</span>
                                                            </div>
                                                            <div className="flex gap-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                                <button type="button" onClick={(e) => { e.stopPropagation(); handleExportGoogleDocs(c, selected.projectName); }} className="p-1 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 rounded" title="Xuất Google Docs"><FileText size={11} /></button>
                                                                <button type="button" onClick={(e) => { e.stopPropagation(); openThemHopDong(c); }} className="p-1 text-slate-500 hover:bg-amber-50 hover:text-amber-800 rounded" title="Sửa"><Edit size={11} /></button>
                                                                <button type="button" onClick={(e) => { e.stopPropagation(); openDelete({ id: c.id, uuid: c.uuid, soHopDong: c.soHopDong }); }} className="p-1 text-slate-500 hover:bg-red-50 hover:text-red-700 rounded" title="Xóa"><Trash2 size={11} /></button>
                                                            </div>
                                                        </div>

                                                        <div className="grid grid-cols-3 gap-1.5 mb-2">
                                                            <div className="px-1.5 py-1 bg-slate-50 rounded border border-slate-100 min-w-0">
                                                                <div className="text-[8px] font-semibold text-slate-500 uppercase">QT</div>
                                                                <div className="text-[11px] font-bold text-slate-800 leading-tight truncate" title={formatCurrency(c.giaTriQT)}>{formatCurrency(c.giaTriQT)}</div>
                                                            </div>
                                                            <div className="px-1.5 py-1 bg-emerald-50 rounded border border-emerald-100 min-w-0">
                                                                <div className="text-[8px] font-semibold text-emerald-700 uppercase">Thu</div>
                                                                <div className="text-[11px] font-bold text-emerald-800 leading-tight truncate">{formatCurrency(c.daThu)}</div>
                                                            </div>
                                                            <div className="px-1.5 py-1 bg-violet-50 rounded border border-violet-100 min-w-0">
                                                                <div className="text-[8px] font-semibold text-violet-700 uppercase">Ngưỡng NS</div>
                                                                <div className="text-[11px] font-bold text-violet-800 leading-tight truncate" title={c.nguongChiNhanSuLoai === 'phan_tram' ? `${c.nguongChiNhanSu}% × QT` : undefined}>{formatCurrency(c.nguongChiNhanSuTien)}</div>
                                                                {c.nguongChiNhanSuLoai === 'phan_tram' && c.nguongChiNhanSu > 0 ? (
                                                                    <div className="text-[8px] text-violet-600 tabular-nums leading-tight">{c.nguongChiNhanSu}%</div>
                                                                ) : null}
                                                            </div>
                                                        </div>

                                                        <div className="space-y-0.5">
                                                            <div className="flex justify-between text-[9px] font-bold">
                                                                <span className="text-slate-500 uppercase">Tiến độ</span>
                                                                <span className="text-blue-700">{progress}%</span>
                                                            </div>
                                                            <div className="h-1 bg-slate-200 rounded-full overflow-hidden">
                                                                <div className={`h-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${progress}%` }} />
                                                            </div>
                                                        </div>

                                                        <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                                                            <div className="flex -space-x-1">
                                                                {c.nhanSuIds?.slice(0, 3).map((id, i) => (
                                                                    <div key={i} className="w-5 h-5 rounded-full border border-white bg-slate-200 overflow-hidden">
                                                                        <User size={9} className="m-auto mt-0.5 text-slate-400" />
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="flex items-center gap-1 text-[9px] font-semibold text-slate-500">
                                                                <Calendar size={9} />
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
            </div>
        </div>
    );
}
