import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Search, Plus, Eye, Edit, Trash2, X, Maximize2, CheckCircle, PlusCircle, User, DollarSign, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FilterX } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { thuChiPath } from '../../lib/customerModuleLinks';
import { useDuAnModal } from '../../contexts/DuAnModalContext';
import { useHopDongModal } from '../../contexts/HopDongModalContext';
import { projectService } from '../../lib/services/projectService';
import { contractService, ContractRow } from '../../lib/services/contractService';
import { employeeService } from '../../lib/services/employeeService';
import { thuChiService, ThuChiRow } from '../../lib/services/thuChiService';
import { taskService } from '../../lib/services/taskService';
import { ExcelImportExportBar } from '../../components/ExcelImportExportBar';
import type { ExcelColumnDef } from '../../lib/excelTableTools';
import { customerService } from '../../lib/services/customerService';
import { cn } from '../../lib/utils';
import { PAGE_SIZE_OPTIONS, buildVisiblePages } from '../../lib/tablePagination';

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

/** Khóa ổn định để gom / lọc khách: ưu tiên customer_id, không thì chuẩn hóa tên */
function getDuAnItemCustomerKey(item: {
    customer_id?: string | null;
    customer_name?: string | null;
    customerName?: string | null;
}): string {
    const raw = (item as { customer_id?: string | null }).customer_id;
    if (raw != null && String(raw).trim() !== '') return `id:${String(raw).trim()}`;
    const n = String(item.customer_name || item.customerName || '')
        .trim()
        .normalize('NFC')
        .toLowerCase()
        .replace(/\s+/g, ' ');
    return n ? `name:${n}` : 'empty:';
}

const DU_AN_STATUS_OPTIONS = [
    'Đang thực hiện',
    'Hoàn thành',
    'Đang quá hạn',
    'Tạm dừng',
    'Từ chối',
] as const;

export function DuAn() {
    const [items, setItems] = useState<any[]>([]);
    const {
        openDuAnModal,
        openChiTietDuAn,
        openDelete
    } = useDuAnModal();
    const { openThemHopDong, openDelete: openDeleteHopDong } = useHopDongModal();

    const [activeTab, setActiveTab] = useState('info');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);
    const [reloadKey, setReloadKey] = useState(0);

    const duAnExcelColumns: ExcelColumnDef[] = [
        { key: 'ten_du_an', header: 'Tên dự án', example: 'Dự án đường A' },
        { key: 'ten_khach_hang', header: 'Tên khách hàng', example: 'Công ty X (khớp danh sách KH)' },
        { key: 'trang_thai', header: 'Trạng thái', example: 'Đang thực hiện' },
        { key: 'tien_do', header: 'Tiến độ %', example: '0' },
    ];
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState<number>(PAGE_SIZE_OPTIONS[0]);
    /** Bộ lọc checkbox: khóa từ getDuAnItemCustomerKey; rỗng = tất cả */
    const [filterDuAnKhachKeys, setFilterDuAnKhachKeys] = useState<string[]>([]);
    const [filterDuAnProjectIds, setFilterDuAnProjectIds] = useState<string[]>([]);
    const [filterDuAnStatus, setFilterDuAnStatus] = useState<string>('');
    const [duAnKhachFilterOpen, setDuAnKhachFilterOpen] = useState(false);
    const [duAnKhachFilterSearch, setDuAnKhachFilterSearch] = useState('');
    const duAnKhachFilterRef = useRef<HTMLDivElement>(null);
    const duAnKhachSearchRef = useRef<HTMLInputElement>(null);
    const [duAnProjectFilterOpen, setDuAnProjectFilterOpen] = useState(false);
    const [duAnProjectFilterSearch, setDuAnProjectFilterSearch] = useState('');
    const duAnProjectFilterRef = useRef<HTMLDivElement>(null);
    const duAnProjectSearchRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const urlCustomerId = searchParams.get('customerId');
    const urlDuAnId = searchParams.get('duAnId');
    const openedFromStateRef = useRef(false);

    // Allow other pages to navigate here and open a project directly
    useEffect(() => {
        if (openedFromStateRef.current) return;
        const stateProjectId = (location.state as any)?.projectId;
        if (!stateProjectId) return;
        if (!items || items.length === 0) return;

        const target = items.find((p: any) => String(p?.id) === String(stateProjectId));
        if (!target) return;

        openedFromStateRef.current = true;
        handleViewClick(target);
        // Clear state to avoid re-opening when navigating back/forward
        navigate(location.pathname, { replace: true });
    }, [items, location.pathname, location.state, navigate]);

    const handleViewClick = (project: any) => {
        openChiTietDuAn(project);
    };

    const handleAddClick = () => {
        openDuAnModal(null, handleSaveProject);
    };

    const handleEditClick = (project: any) => {
        openDuAnModal(project, handleSaveProject);
    };

    const handleDeleteClick = (project: any) => {
        openDelete({ id: project.id, projectName: project.projectName });
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


    // State để lưu hợp đồng thực tế từ database
    const [realContracts, setRealContracts] = useState<Map<string, ContractRow[]>>(new Map());

    // State để lưu tiến độ thực tế của từng dự án (tính từ hợp đồng)
    const [projectProgress, setProjectProgress] = useState<Map<string, number>>(new Map());

    // State để lưu thông tin hợp đồng của từng dự án (để hiển thị số lượng)
    const [projectContractInfo, setProjectContractInfo] = useState<Map<string, { total: number; completed: number }>>(new Map());

    // State để lưu danh sách nhân sự (để hiển thị tên trong modal chi tiết)
    const [employees, setEmployees] = useState<Array<{ id: string; full_name: string; code: string; anh_nhan_su?: string | null }>>([]);

    const duAnCustomerOptions = useMemo(() => {
        const map = new Map<string, string>();
        for (const it of items) {
            const key = getDuAnItemCustomerKey(it);
            const label =
                (it.customer_name || it.customerName || '').trim() || '(Chưa có khách hàng)';
            if (!map.has(key)) map.set(key, label);
        }
        return Array.from(map.entries())
            .map(([key, label]) => ({ key, label }))
            .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
    }, [items]);

    /** Dự án trong dropdown: nếu đã chọn khách thì chỉ các dự án thuộc khách đó */
    const duAnProjectOptions = useMemo(() => {
        let list = items;
        if (filterDuAnKhachKeys.length > 0) {
            const allow = new Set(filterDuAnKhachKeys);
            list = list.filter((it) => allow.has(getDuAnItemCustomerKey(it)));
        }
        return list
            .map((it) => ({
                id: String(it.id),
                label: (it.projectName || String(it.id)).trim() || String(it.id),
            }))
            .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
    }, [items, filterDuAnKhachKeys]);

    const duAnKhachOptionsMatching = useMemo(() => {
        const q = duAnKhachFilterSearch.trim().toLowerCase();
        if (!q) return duAnCustomerOptions;
        return duAnCustomerOptions.filter(
            (o) =>
                o.label.toLowerCase().includes(q) || o.key.toLowerCase().includes(q),
        );
    }, [duAnCustomerOptions, duAnKhachFilterSearch]);

    const duAnProjectOptionsMatching = useMemo(() => {
        const q = duAnProjectFilterSearch.trim().toLowerCase();
        if (!q) return duAnProjectOptions;
        return duAnProjectOptions.filter(
            (o) =>
                o.label.toLowerCase().includes(q) || o.id.toLowerCase().includes(q),
        );
    }, [duAnProjectOptions, duAnProjectFilterSearch]);

    const allVisibleDuAnKhachSelected =
        duAnKhachOptionsMatching.length > 0 &&
        filterDuAnKhachKeys.length > 0 &&
        duAnKhachOptionsMatching.every((o) => filterDuAnKhachKeys.includes(o.key));

    const selectAllVisibleDuAnKhach = () => {
        const keys = duAnKhachOptionsMatching.map((o) => o.key);
        if (keys.length === 0) return;
        setFilterDuAnKhachKeys(keys);
        setCurrentPage(1);
        setDuAnKhachFilterOpen(false);
    };

    const allVisibleDuAnProjectSelected =
        duAnProjectOptionsMatching.length > 0 &&
        filterDuAnProjectIds.length > 0 &&
        duAnProjectOptionsMatching.every((o) => filterDuAnProjectIds.includes(o.id));

    const selectAllVisibleDuAnProject = () => {
        const ids = duAnProjectOptionsMatching.map((o) => o.id);
        if (ids.length === 0) return;
        setFilterDuAnProjectIds(ids);
        setCurrentPage(1);
        setDuAnProjectFilterOpen(false);
    };

    const toggleDuAnKhachFilter = (key: string) => {
        setFilterDuAnKhachKeys((prev) => {
            if (prev.length === 0) return [key];
            if (prev.includes(key)) return prev.filter((x) => x !== key);
            return [...prev, key];
        });
        setCurrentPage(1);
        setDuAnKhachFilterOpen(false);
    };

    const toggleDuAnProjectFilter = (id: string) => {
        setFilterDuAnProjectIds((prev) => {
            if (prev.length === 0) return [id];
            if (prev.includes(id)) return prev.filter((x) => x !== id);
            return [...prev, id];
        });
        setCurrentPage(1);
        setDuAnProjectFilterOpen(false);
    };

    const hasActiveDuAnFilters = useMemo(
        () =>
            filterDuAnKhachKeys.length > 0 ||
            filterDuAnProjectIds.length > 0 ||
            Boolean(filterDuAnStatus) ||
            Boolean(searchTerm.trim()) ||
            Boolean(urlCustomerId) ||
            Boolean(urlDuAnId),
        [
            filterDuAnKhachKeys,
            filterDuAnProjectIds,
            filterDuAnStatus,
            searchTerm,
            urlCustomerId,
            urlDuAnId,
        ],
    );

    const clearAllDuAnFilters = useCallback(() => {
        setSearchTerm('');
        setFilterDuAnKhachKeys([]);
        setFilterDuAnProjectIds([]);
        setFilterDuAnStatus('');
        setDuAnKhachFilterSearch('');
        setDuAnProjectFilterSearch('');
        setDuAnKhachFilterOpen(false);
        setDuAnProjectFilterOpen(false);
        setCurrentPage(1);
    }, []);

    useEffect(() => {
        if (!duAnKhachFilterOpen) {
            setDuAnKhachFilterSearch('');
            return;
        }
        const t = window.setTimeout(() => duAnKhachSearchRef.current?.focus(), 0);
        return () => window.clearTimeout(t);
    }, [duAnKhachFilterOpen]);

    useEffect(() => {
        if (!duAnKhachFilterOpen) return;
        const onDown = (e: MouseEvent) => {
            const el = e.target as HTMLElement;
            if (duAnKhachFilterRef.current?.contains(el)) return;
            setDuAnKhachFilterOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [duAnKhachFilterOpen]);

    useEffect(() => {
        if (!duAnProjectFilterOpen) {
            setDuAnProjectFilterSearch('');
            return;
        }
        const t = window.setTimeout(() => duAnProjectSearchRef.current?.focus(), 0);
        return () => window.clearTimeout(t);
    }, [duAnProjectFilterOpen]);

    useEffect(() => {
        if (!duAnProjectFilterOpen) return;
        const onDown = (e: MouseEvent) => {
            const el = e.target as HTMLElement;
            if (duAnProjectFilterRef.current?.contains(el)) return;
            setDuAnProjectFilterOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [duAnProjectFilterOpen]);

    useEffect(() => {
        const allowed = new Set(duAnProjectOptions.map((o) => o.id));
        setFilterDuAnProjectIds((prev) => {
            if (prev.length === 0) return prev;
            const next = prev.filter((id) => allowed.has(id));
            if (next.length === prev.length && next.every((id, i) => id === prev[i])) return prev;
            return next;
        });
    }, [duAnProjectOptions]);

    // Lọc khách / dự án (checkbox) + ô tìm chữ
    const filteredItems = useMemo(() => {
        let list = items;
        if (filterDuAnKhachKeys.length > 0) {
            const allowK = new Set(filterDuAnKhachKeys);
            list = list.filter((it) => allowK.has(getDuAnItemCustomerKey(it)));
        }
        if (filterDuAnProjectIds.length > 0) {
            const allowP = new Set(filterDuAnProjectIds.map(String));
            list = list.filter((it) => allowP.has(String(it.id)));
        }
        if (filterDuAnStatus) {
            list = list.filter((it) => String(it.status || '') === filterDuAnStatus);
        }
        if (urlCustomerId) {
            list = list.filter((item) => String(item.customer_id || '') === urlCustomerId);
        }
        if (urlDuAnId) {
            list = list.filter((item) => String(item.id) === urlDuAnId);
        }
        if (!searchTerm.trim()) return list;
        const term = searchTerm.toLowerCase();
        return list.filter((item) => {
            const customer = (item.customer_name || item.customerName || '').toString().toLowerCase();
            const project = (item.projectName || '').toString().toLowerCase();
            return customer.includes(term) || project.includes(term);
        });
    }, [
        items,
        searchTerm,
        urlCustomerId,
        urlDuAnId,
        filterDuAnKhachKeys,
        filterDuAnProjectIds,
        filterDuAnStatus,
    ]);

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage) || 1);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);
    const visiblePages = useMemo(
        () => buildVisiblePages(currentPage, totalPages),
        [currentPage, totalPages],
    );

    useEffect(() => {
        setCurrentPage((page) => Math.min(page, totalPages));
    }, [totalPages]);

    useEffect(() => {
        setCurrentPage(1);
    }, [itemsPerPage, searchTerm, filterDuAnKhachKeys, filterDuAnProjectIds, filterDuAnStatus, urlCustomerId, urlDuAnId]);

    // Load danh sách nhân sự
    useEffect(() => {
        (async () => {
            try {
                const employeeList = await employeeService.getAll();
                setEmployees(employeeList.map(emp => ({
                    id: emp.id.toString(),
                    full_name: emp.full_name || emp.name || emp.hoTen || '',
                    code: emp.code || '',
                    anh_nhan_su: (emp as any).anh_nhan_su || emp.anh_nhan_su || null
                })));
                console.log('[DuAn] Loaded employees:', employeeList.length);
            } catch (error) {
                console.error('[DuAn] Error loading employees:', error);
            }
        })();
    }, []);

    // Load dự án từ bảng du_an và tính tiến độ từ hợp đồng
    useEffect(() => {
        (async () => {
            // Song song hoá để giảm thời gian chờ network.
            // Với thu chi chỉ cần `ten_du_an/loai_phieu/so_tien/...` cho dashboard dự án,
            // nên dùng hàm "light" để tránh map projects/employees.
            const [data, contracts, allThuChi] = await Promise.all([
                projectService.getAll(),
                contractService.getAll(),
                thuChiService.getAllForDuAnDashboard(),
            ]);

            console.log('[DuAn] data from thuChiService:', allThuChi);

            // 1. Nhóm hợp đồng theo projectId (dùng Map với key là id)
            const contractsByProjectId = new Map<string, ContractRow[]>();
            const progressMap = new Map<string, number>();
            const contractInfoMap = new Map<string, { total: number; completed: number }>();

            contracts.forEach(contract => {
                if (contract.du_an_id) {
                    const projectId = contract.du_an_id;
                    if (!contractsByProjectId.has(projectId)) {
                        contractsByProjectId.set(projectId, []);
                    }
                    contractsByProjectId.get(projectId)!.push(contract);

                    if (!contractInfoMap.has(projectId)) {
                        contractInfoMap.set(projectId, { total: 0, completed: 0 });
                    }
                    const info = contractInfoMap.get(projectId)!;
                    info.total++;
                    if ((contract as any).progress === 100) info.completed++;
                }
            });

            // Đồng bộ realContracts (vẫn dùng Map name -> rows nếu UI cần, hoặc dùng ID)
            // Để an toàn cho code cũ, tớ sẽ tạo cả 2 hoặc mapping nếu cần. 
            // Tuy nhiên ChiTietDuAnModal thường lấy từ p.id
            const contractsByProjectName = new Map<string, ContractRow[]>();
            contracts.forEach(c => {
                const name = c.project_name || '(Chưa có tên dự án)';
                if (!contractsByProjectName.has(name)) contractsByProjectName.set(name, []);
                contractsByProjectName.get(name)!.push(c);
            });
            setRealContracts(contractsByProjectName);

            // Tính tiến độ dự án từ hợp đồng
            contractInfoMap.forEach((info, projectId) => {
                const progress = info.total > 0 ? Math.round((info.completed / info.total) * 100) : 0;
                progressMap.set(projectId, progress);
            });

            setProjectProgress(progressMap);
            setProjectContractInfo(contractInfoMap);

            // 2. Tính toán tài chính & Danh sách thu chi (dùng projectId)
            const projectFinancials = new Map<string, {
                giaTriHopDong: number;
                giaTriQuyetToan: number;
                daThu: number;
                conPhaiThu: number;
                tongChi: number;
            }>();
            const thuChiByProject = new Map<string, ThuChiRow[]>();

            // Tính từ hợp đồng
            contracts.forEach((contract: ContractRow) => {
                if (contract.du_an_id) {
                    const projectId = contract.du_an_id;
                    if (!projectFinancials.has(projectId)) {
                        projectFinancials.set(projectId, {
                            giaTriHopDong: 0,
                            giaTriQuyetToan: 0,
                            daThu: 0,
                            conPhaiThu: 0,
                            tongChi: 0,
                        });
                    }
                    const financials = projectFinancials.get(projectId)!;
                    financials.giaTriHopDong += Number(contract.gia_tri_hd) || 0;
                    financials.giaTriQuyetToan += Number(contract.gia_tri_qt) || 0;
                }
            });

            // Tính từ phiếu thu/chi
            allThuChi.forEach((tc: ThuChiRow) => {
                const loai = (tc.loai_phieu || '').toLowerCase().trim();
                const projectId = tc.du_an_id;

                if (projectId) {
                    // Nhóm list thu chi
                    if (!thuChiByProject.has(projectId)) {
                        thuChiByProject.set(projectId, []);
                    }
                    thuChiByProject.get(projectId)!.push(tc);

                    // Cộng dồn tài chính
                    if (!projectFinancials.has(projectId)) {
                        projectFinancials.set(projectId, {
                            giaTriHopDong: 0,
                            giaTriQuyetToan: 0,
                            daThu: 0,
                            conPhaiThu: 0,
                            tongChi: 0,
                        });
                    }
                    const financials = projectFinancials.get(projectId)!;
                    const amount = Number(tc.so_tien) || 0;

                    if (loai === 'phiếu thu') {
                        financials.daThu += amount;
                    } else if (loai === 'phiếu chi') {
                        financials.tongChi += amount;
                    }
                }
            });

            // Tính Còn phải thu cho tất cả
            projectFinancials.forEach((fin) => {
                const targetValue = fin.giaTriQuyetToan > 0 ? fin.giaTriQuyetToan : fin.giaTriHopDong;
                fin.conPhaiThu = targetValue - fin.daThu;
            });

            // Map dự án với tiến độ từ hợp đồng
            const mapped = (data || []).map((p: any) => {
                const projectId = p.id;
                const calculatedProgress = progressMap.get(projectId) ?? 0;
                const financials = projectFinancials.get(projectId) || {
                    giaTriHopDong: 0,
                    giaTriQuyetToan: 0,
                    daThu: 0,
                    conPhaiThu: 0,
                    tongChi: 0,
                };

                const projectName = p.ten_du_an;

                // Ưu tiên lấy customerName từ customer_name (join) hoặc ten_khach_hang
                // Nếu ten_khach_hang là ID, dùng customer_name từ join
                let customerName = p.customer_name || null;
                if (!customerName && p.ten_khach_hang) {
                    // Kiểm tra xem ten_khach_hang có phải là ID không
                    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                    const shortIdPattern = /^[0-9a-f]{8}$/i;
                    if (!uuidPattern.test(p.ten_khach_hang) && !shortIdPattern.test(p.ten_khach_hang)) {
                        // Nếu không phải ID, dùng ten_khach_hang
                        customerName = p.ten_khach_hang;
                    }
                }

                // Lấy ảnh từ nhân sự: ưu tiên manager_img/executor_img, nếu không có thì lấy từ join
                const managerImg = p.manager_img || (p.manager && p.manager.anh_nhan_su) || null;
                const executorImg = p.executor_img || (p.executor && p.executor.anh_nhan_su) || null;

                // Lấy tên từ manager và executor objects nếu có, nếu không thì dùng manager_name/executor_name đã map
                const managerName = p.manager
                    ? (p.manager.full_name || p.manager.name || p.manager.hoTen || p.manager_name || null)
                    : (p.manager_name || null);
                const executorName = p.executor
                    ? (p.executor.full_name || p.executor.name || p.executor.hoTen || p.executor_name || null)
                    : (p.executor_name || null);

                return {
                    id: p.id,
                    projectName: projectName,
                    status: p.status || 'Đang thực hiện',
                    statusColor: getStatusColor(p.status || 'Đang thực hiện'),
                    progress: calculatedProgress, // Sử dụng tiến độ tính từ hợp đồng
                    managerImg: managerImg,
                    executorImg: executorImg,
                    manager_id: p.manager_id || null,
                    executor_id: p.executor_id || null,
                    managerId: p.manager_id || null, // Thêm managerId để modal edit sử dụng
                    executorId: p.executor_id || null, // Thêm executorId để modal edit sử dụng
                    manager_name: managerName,
                    executor_name: executorName,
                    manager_code: (p.manager && (p.manager.code || p.manager.ma_nv)) || null,
                    executor_code: (p.executor && (p.executor.code || p.executor.ma_nv)) || null,
                    customer_id:
                        p.customer_id != null && String(p.customer_id).trim() !== ''
                            ? String(p.customer_id).trim()
                            : null,
                    customer_name: customerName,
                    customerName: customerName, // Thêm customerName để dùng trong form
                    // Giữ lại manager và executor objects để có thể truy cập sau
                    manager: p.manager,
                    executor: p.executor,
                    // Tài chính
                    giaTriHopDong: financials.giaTriHopDong,
                    giaTriQuyetToan: financials.giaTriQuyetToan,
                    daThu: financials.daThu,
                    conPhaiThu: financials.conPhaiThu,
                    tongChi: financials.tongChi,
                    thuChiList: thuChiByProject.get(projectId) || [],
                    nguongChi: (p as any).nguong_chi ?? null,
                };
            });
            setItems(mapped);
        })();
    }, [reloadKey]);

    const handleSaveProject = async (data: any) => {
        console.log('[DuAn] handleSaveProject called with data:', data);
        try {
            // Cập nhật
            if (data.id) {
                console.log('[DuAn] Updating project with id:', data.id);
                const customerIdValue = (data.customer_id || data.customerId);
                const finalCustomerId = customerIdValue && customerIdValue.toString().trim() !== '' ? customerIdValue.toString() : null;
                const finalTenKhachHang = data.tenKhachHang || data.customerName || null;
                console.log('[DuAn] Updating with customerId:', finalCustomerId, 'tenKhachHang:', finalTenKhachHang);
                const managerIds = data.managerIds && Array.isArray(data.managerIds) && data.managerIds.length > 0
                    ? data.managerIds.map((id: any) => String(id).trim()).filter(Boolean)
                    : undefined;
                const executorIds = data.executorIds && Array.isArray(data.executorIds) && data.executorIds.length > 0
                    ? data.executorIds.map((id: any) => String(id).trim()).filter(Boolean)
                    : undefined;

                const updated = await projectService.update(String(data.id), {
                    projectName: data.projectName,
                    status: data.status,
                    progress: Number(data.progress) || 0,
                    customerId: finalCustomerId,
                    tenKhachHang: finalTenKhachHang,
                    managerIds,
                    executorIds,
                    managerId: data.manager_id || data.managerId || undefined,
                    executorId: data.executor_id || data.executorId || undefined,
                    managerImg: data.managerImg || null,
                    executorImg: data.executorImg || null,
                });
                if (updated) {
                    setToast({ message: 'Cập nhật dự án thành công!', type: 'success' });
                    // Lưu projectId trước khi reload để cập nhật selectedProject
                    const currentProjectId = data.id;

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

                            // Ưu tiên lấy customerName từ customer_name (join) hoặc ten_khach_hang
                            // Nếu ten_khach_hang là ID, dùng customer_name từ join
                            let customerName = p.customer_name || null;
                            if (!customerName && p.ten_khach_hang) {
                                // Kiểm tra xem ten_khach_hang có phải là ID không
                                const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                                const shortIdPattern = /^[0-9a-f]{8}$/i;
                                if (!uuidPattern.test(p.ten_khach_hang) && !shortIdPattern.test(p.ten_khach_hang)) {
                                    // Nếu không phải ID, dùng ten_khach_hang
                                    customerName = p.ten_khach_hang;
                                }
                            }

                            // Lấy ảnh từ nhân sự: ưu tiên manager_img/executor_img, nếu không có thì lấy từ join
                            const managerImg = p.manager_img || (p.manager && p.manager.anh_nhan_su) || null;
                            const executorImg = p.executor_img || (p.executor && p.executor.anh_nhan_su) || null;

                            // Lấy tên từ manager và executor objects nếu có, nếu không thì dùng manager_name/executor_name đã map
                            const managerName = p.manager
                                ? (p.manager.full_name || p.manager.name || p.manager.hoTen || p.manager_name || null)
                                : (p.manager_name || null);
                            const executorName = p.executor
                                ? (p.executor.full_name || p.executor.name || p.executor.hoTen || p.executor_name || null)
                                : (p.executor_name || null);

                            return {
                                id: p.id,
                                projectName: projectName,
                                status: p.status || 'Đang thực hiện',
                                statusColor: getStatusColor(p.status || 'Đang thực hiện'),
                                progress: calculatedProgress,
                                managerImg: managerImg,
                                executorImg: executorImg,
                                manager_id: p.manager_id || null,
                                executor_id: p.executor_id || null,
                                managerId: p.manager_id || null, // Thêm managerId để modal edit sử dụng
                                executorId: p.executor_id || null, // Thêm executorId để modal edit sử dụng
                                manager_name: managerName,
                                executor_name: executorName,
                                manager_code: (p.manager && (p.manager.code || p.manager.ma_nv)) || null,
                                executor_code: (p.executor && (p.executor.code || p.executor.ma_nv)) || null,
                                customer_id:
                                    p.customer_id != null && String(p.customer_id).trim() !== ''
                                        ? String(p.customer_id).trim()
                                        : null,
                                customer_name: customerName,
                                customerName: customerName, // Thêm customerName để dùng trong form
                                // Giữ lại manager và executor objects để có thể truy cập sau
                                manager: p.manager,
                                executor: p.executor,
                            };
                        });
                        setItems(mapped);

                        // Cập nhật selectedProject nếu modal chi tiết đang mở
                        // (Giao diện Layout sẽ tự render lại modal nếu tham chiếu projectData đổi)
                    }, 500);
                } else {
                    setToast({ message: 'Cập nhật dự án thất bại!', type: 'warning' });
                }
            } else {
                // Tạo mới
                console.log('[DuAn] Creating new project');
                const customerIdValue = (data.customer_id || data.customerId);
                const finalCustomerId = customerIdValue && customerIdValue.toString().trim() !== '' ? customerIdValue.toString() : null;
                const finalTenKhachHang = data.tenKhachHang || data.customerName || null;
                console.log('[DuAn] Creating with customerId:', finalCustomerId, 'tenKhachHang:', finalTenKhachHang);
                const managerIds = data.managerIds && Array.isArray(data.managerIds) && data.managerIds.length > 0
                    ? data.managerIds.map((id: any) => String(id).trim()).filter(Boolean)
                    : undefined;
                const executorIds = data.executorIds && Array.isArray(data.executorIds) && data.executorIds.length > 0
                    ? data.executorIds.map((id: any) => String(id).trim()).filter(Boolean)
                    : undefined;

                const created = await projectService.create({
                    projectName: data.projectName,
                    status: data.status,
                    progress: Number(data.progress) || 0,
                    customerId: finalCustomerId,
                    tenKhachHang: finalTenKhachHang,
                    managerIds,
                    executorIds,
                    managerId: data.manager_id || data.managerId || undefined,
                    executorId: data.executor_id || data.executorId || undefined,
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

                            // Ưu tiên lấy customerName từ customer_name (join) hoặc ten_khach_hang
                            // Nếu ten_khach_hang là ID, dùng customer_name từ join
                            let customerName = p.customer_name || null;
                            if (!customerName && p.ten_khach_hang) {
                                // Kiểm tra xem ten_khach_hang có phải là ID không
                                const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                                const shortIdPattern = /^[0-9a-f]{8}$/i;
                                if (!uuidPattern.test(p.ten_khach_hang) && !shortIdPattern.test(p.ten_khach_hang)) {
                                    // Nếu không phải ID, dùng ten_khach_hang
                                    customerName = p.ten_khach_hang;
                                }
                            }

                            // Lấy ảnh từ nhân sự: ưu tiên manager_img/executor_img, nếu không có thì lấy từ join
                            const managerImg = p.manager_img || (p.manager && p.manager.anh_nhan_su) || null;
                            const executorImg = p.executor_img || (p.executor && p.executor.anh_nhan_su) || null;

                            // Lấy tên từ manager và executor objects nếu có, nếu không thì dùng manager_name/executor_name đã map
                            const managerName = p.manager
                                ? (p.manager.full_name || p.manager.name || p.manager.hoTen || p.manager_name || null)
                                : (p.manager_name || null);
                            const executorName = p.executor
                                ? (p.executor.full_name || p.executor.name || p.executor.hoTen || p.executor_name || null)
                                : (p.executor_name || null);

                            return {
                                id: p.id,
                                projectName: projectName,
                                status: p.status || 'Đang thực hiện',
                                statusColor: getStatusColor(p.status || 'Đang thực hiện'),
                                progress: calculatedProgress,
                                managerImg: managerImg,
                                executorImg: executorImg,
                                manager_id: p.manager_id || null,
                                executor_id: p.executor_id || null,
                                managerId: p.manager_id || null, // Thêm managerId để modal edit sử dụng
                                executorId: p.executor_id || null, // Thêm executorId để modal edit sử dụng
                                manager_name: managerName,
                                executor_name: executorName,
                                manager_code: (p.manager && (p.manager.code || p.manager.ma_nv)) || null,
                                executor_code: (p.executor && (p.executor.code || p.executor.ma_nv)) || null,
                                customer_id:
                                    p.customer_id != null && String(p.customer_id).trim() !== ''
                                        ? String(p.customer_id).trim()
                                        : null,
                                customer_name: customerName,
                                customerName: customerName, // Thêm customerName để dùng trong form
                                // Giữ lại manager và executor objects để có thể truy cập sau
                                manager: p.manager,
                                executor: p.executor,
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


    return (
        <div className="bg-[#faf8ff] text-[#131b2e] min-h-screen animate-in fade-in duration-500 p-6 md:p-8 space-y-6">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-[#283044] text-[#f2f2ff] p-8 rounded-xl shadow-lg">
                    <p className="uppercase tracking-wider text-slate-300 text-sm font-semibold mb-2">Tổng dự án</p>
                    <h2 className="text-4xl font-extrabold tracking-tight">{filteredItems.length}</h2>
                    <div className="mt-4 flex items-center gap-2 text-emerald-300 text-sm font-semibold">
                        <Plus size={16} />
                        <span>Theo bộ lọc hiện tại</span>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
                    <p className="uppercase tracking-wider text-slate-500 text-sm font-semibold mb-2">Giá trị hợp đồng</p>
                    <h2 className="text-3xl font-extrabold tracking-tight">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                            filteredItems.reduce((s, i) => s + (Number(i.giaTriHopDong) || 0), 0),
                        )}
                    </h2>
                </div>
                <div className="bg-[#eaedff] p-8 rounded-xl border border-[#dae2fd] text-center">
                    <p className="text-sm font-medium text-slate-600">Số dự án đang thực hiện</p>
                    <p className="text-4xl font-bold mt-2">
                        {filteredItems.filter((i) => i.status === 'Đang thực hiện').length}
                    </p>
                </div>
            </section>

            <section className="bg-[#f2f3ff] rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                        <div className="relative w-full max-w-md min-w-[200px]">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="search"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-full text-sm"
                                placeholder="Tìm khách hàng hoặc dự án…"
                                autoComplete="off"
                                aria-label="Tìm khách hàng hoặc dự án"
                            />
                        </div>
                        <div className="relative min-w-[10.5rem] max-w-[14rem]" ref={duAnKhachFilterRef}>
                            <button
                                type="button"
                                onClick={() => {
                                    setDuAnKhachFilterOpen((o) => !o);
                                    setDuAnProjectFilterOpen(false);
                                }}
                                className="w-full flex items-center justify-between gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#004bcb]/30"
                                aria-expanded={duAnKhachFilterOpen}
                                aria-haspopup="listbox"
                                title="Lọc theo khách hàng"
                            >
                                <span className="truncate min-w-0 text-left">
                                    {filterDuAnKhachKeys.length === 0
                                        ? 'Tất cả khách hàng'
                                        : filterDuAnKhachKeys.length === 1
                                          ? duAnCustomerOptions.find((x) => x.key === filterDuAnKhachKeys[0])
                                              ?.label || '1 khách'
                                          : `${filterDuAnKhachKeys.length} khách đã chọn`}
                                </span>
                                <ChevronDown
                                    className={`w-4 h-4 shrink-0 text-slate-500 ${duAnKhachFilterOpen ? 'rotate-180' : ''}`}
                                    aria-hidden
                                />
                            </button>
                            {duAnKhachFilterOpen ? (
                                <div
                                    className="absolute left-0 right-0 top-full z-50 mt-1 flex max-h-72 flex-col overflow-hidden rounded-lg border-2 border-slate-300 bg-white shadow-lg"
                                    role="listbox"
                                >
                                    <div className="shrink-0 border-b border-slate-200 bg-slate-50 p-2">
                                        <div className="relative">
                                            <Search
                                                size={14}
                                                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                                            />
                                            <input
                                                ref={duAnKhachSearchRef}
                                                type="search"
                                                value={duAnKhachFilterSearch}
                                                onChange={(e) => setDuAnKhachFilterSearch(e.target.value)}
                                                placeholder="Tìm khách hàng…"
                                                autoComplete="off"
                                                className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#004bcb] focus:outline-none focus:ring-2 focus:ring-[#004bcb]/25"
                                            />
                                        </div>
                                        {duAnKhachFilterSearch.trim() && duAnKhachOptionsMatching.length > 0 ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (allVisibleDuAnKhachSelected) {
                                                        const visible = new Set(
                                                            duAnKhachOptionsMatching.map((o) => o.key),
                                                        );
                                                        setFilterDuAnKhachKeys((prev) =>
                                                            prev.filter((k) => !visible.has(k)),
                                                        );
                                                        setCurrentPage(1);
                                                        setDuAnKhachFilterOpen(false);
                                                    } else {
                                                        selectAllVisibleDuAnKhach();
                                                    }
                                                }}
                                                className="mt-2 w-full rounded-md border border-[#004bcb]/30 bg-[#004bcb]/5 px-2 py-1.5 text-[11px] font-bold text-[#004bcb] hover:bg-[#004bcb]/10"
                                            >
                                                {allVisibleDuAnKhachSelected
                                                    ? `Bỏ chọn ${duAnKhachOptionsMatching.length} kết quả`
                                                    : `Chọn tất cả đang hiển thị (${duAnKhachOptionsMatching.length})`}
                                            </button>
                                        ) : null}
                                    </div>
                                    <div className="max-h-[min(12rem,40vh)] min-h-0 flex-1 overflow-y-auto py-1 [scrollbar-gutter:stable]">
                                        <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs font-bold text-slate-900 hover:bg-slate-100">
                                            <input
                                                type="checkbox"
                                                className="h-3.5 w-3.5 rounded border-slate-300 text-[#004bcb] focus:ring-[#004bcb]"
                                                checked={filterDuAnKhachKeys.length === 0}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setFilterDuAnKhachKeys([]);
                                                        setCurrentPage(1);
                                                        setDuAnKhachFilterOpen(false);
                                                    }
                                                }}
                                            />
                                            Tất cả khách hàng
                                        </label>
                                        <div className="mx-2 border-t border-slate-200" />
                                        {duAnCustomerOptions.length === 0 ? (
                                            <p className="px-3 py-2 text-[11px] text-slate-500">Chưa có dữ liệu.</p>
                                        ) : duAnKhachOptionsMatching.length === 0 ? (
                                            <p className="px-3 py-2 text-[11px] text-slate-500">
                                                Không khớp &quot;{duAnKhachFilterSearch.trim()}&quot;.
                                            </p>
                                        ) : (
                                            duAnKhachOptionsMatching.map((o) => {
                                                const checked =
                                                    filterDuAnKhachKeys.length > 0 &&
                                                    filterDuAnKhachKeys.includes(o.key);
                                                return (
                                                    <label
                                                        key={o.key}
                                                        className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs text-slate-800 hover:bg-slate-100"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="h-3.5 w-3.5 rounded border-slate-300 text-[#004bcb] focus:ring-[#004bcb]"
                                                            checked={checked}
                                                            onChange={() => toggleDuAnKhachFilter(o.key)}
                                                        />
                                                        <span className="min-w-0 break-words">{o.label}</span>
                                                    </label>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                        <div className="relative min-w-[10.5rem] max-w-[14rem]" ref={duAnProjectFilterRef}>
                            <button
                                type="button"
                                onClick={() => {
                                    setDuAnProjectFilterOpen((o) => !o);
                                    setDuAnKhachFilterOpen(false);
                                }}
                                className="w-full flex items-center justify-between gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#004bcb]/30 disabled:cursor-not-allowed disabled:opacity-55"
                                aria-expanded={duAnProjectFilterOpen}
                                aria-haspopup="listbox"
                                title="Lọc theo dự án (theo khách đã chọn nếu có)"
                                disabled={duAnProjectOptions.length === 0}
                            >
                                <span className="truncate min-w-0 text-left">
                                    {filterDuAnProjectIds.length === 0
                                        ? 'Tất cả dự án'
                                        : filterDuAnProjectIds.length === 1
                                          ? duAnProjectOptions.find((x) => x.id === filterDuAnProjectIds[0])
                                              ?.label || '1 dự án'
                                          : `${filterDuAnProjectIds.length} dự án đã chọn`}
                                </span>
                                <ChevronDown
                                    className={`w-4 h-4 shrink-0 text-slate-500 ${duAnProjectFilterOpen ? 'rotate-180' : ''}`}
                                    aria-hidden
                                />
                            </button>
                            {duAnProjectFilterOpen && duAnProjectOptions.length > 0 ? (
                                <div
                                    className="absolute left-0 right-0 top-full z-50 mt-1 flex max-h-72 flex-col overflow-hidden rounded-lg border-2 border-slate-300 bg-white shadow-lg"
                                    role="listbox"
                                >
                                    <div className="shrink-0 border-b border-slate-200 bg-slate-50 p-2">
                                        <div className="relative">
                                            <Search
                                                size={14}
                                                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                                            />
                                            <input
                                                ref={duAnProjectSearchRef}
                                                type="search"
                                                value={duAnProjectFilterSearch}
                                                onChange={(e) => setDuAnProjectFilterSearch(e.target.value)}
                                                placeholder="Tìm dự án…"
                                                autoComplete="off"
                                                className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#004bcb] focus:outline-none focus:ring-2 focus:ring-[#004bcb]/25"
                                            />
                                        </div>
                                        {duAnProjectFilterSearch.trim() && duAnProjectOptionsMatching.length > 0 ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (allVisibleDuAnProjectSelected) {
                                                        const visible = new Set(
                                                            duAnProjectOptionsMatching.map((o) => o.id),
                                                        );
                                                        setFilterDuAnProjectIds((prev) =>
                                                            prev.filter((id) => !visible.has(id)),
                                                        );
                                                        setCurrentPage(1);
                                                        setDuAnProjectFilterOpen(false);
                                                    } else {
                                                        selectAllVisibleDuAnProject();
                                                    }
                                                }}
                                                className="mt-2 w-full rounded-md border border-[#004bcb]/30 bg-[#004bcb]/5 px-2 py-1.5 text-[11px] font-bold text-[#004bcb] hover:bg-[#004bcb]/10"
                                            >
                                                {allVisibleDuAnProjectSelected
                                                    ? `Bỏ chọn ${duAnProjectOptionsMatching.length} kết quả`
                                                    : `Chọn tất cả đang hiển thị (${duAnProjectOptionsMatching.length})`}
                                            </button>
                                        ) : null}
                                    </div>
                                    <div className="max-h-[min(12rem,40vh)] min-h-0 flex-1 overflow-y-auto py-1 [scrollbar-gutter:stable]">
                                        <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs font-bold text-slate-900 hover:bg-slate-100">
                                            <input
                                                type="checkbox"
                                                className="h-3.5 w-3.5 rounded border-slate-300 text-[#004bcb] focus:ring-[#004bcb]"
                                                checked={filterDuAnProjectIds.length === 0}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setFilterDuAnProjectIds([]);
                                                        setCurrentPage(1);
                                                        setDuAnProjectFilterOpen(false);
                                                    }
                                                }}
                                            />
                                            Tất cả dự án
                                        </label>
                                        <div className="mx-2 border-t border-slate-200" />
                                        {duAnProjectOptionsMatching.length === 0 ? (
                                            <p className="px-3 py-2 text-[11px] text-slate-500">
                                                {duAnProjectFilterSearch.trim()
                                                    ? `Không khớp "${duAnProjectFilterSearch.trim()}".`
                                                    : 'Không có dự án.'}
                                            </p>
                                        ) : (
                                            duAnProjectOptionsMatching.map((o) => {
                                                const checked =
                                                    filterDuAnProjectIds.length > 0 &&
                                                    filterDuAnProjectIds.includes(o.id);
                                                return (
                                                    <label
                                                        key={o.id}
                                                        className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs text-slate-800 hover:bg-slate-100"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            className="h-3.5 w-3.5 rounded border-slate-300 text-[#004bcb] focus:ring-[#004bcb]"
                                                            checked={checked}
                                                            onChange={() => toggleDuAnProjectFilter(o.id)}
                                                        />
                                                        <span className="min-w-0 break-words">{o.label}</span>
                                                    </label>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            ) : null}
                        </div>
                        <select
                            value={filterDuAnStatus}
                            onChange={(e) => {
                                setFilterDuAnStatus(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#004bcb]/30 min-w-[10.5rem] max-w-[14rem]"
                            aria-label="Lọc theo trạng thái dự án"
                        >
                            <option value="">Tất cả trạng thái</option>
                            {DU_AN_STATUS_OPTIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                    {opt}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={clearAllDuAnFilters}
                            disabled={!hasActiveDuAnFilters}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40"
                        >
                            <FilterX size={14} className="text-slate-500" aria-hidden />
                            Xóa bộ lọc
                        </button>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <ExcelImportExportBar
                            columns={duAnExcelColumns}
                            templateFileName="mau-du-an"
                            sheetName="Du an"
                            onImport={async (rows) => {
                                const errors: string[] = [];
                                let ok = 0;
                                let customers: { id: string; ten_don_vi: string }[] = [];
                                try {
                                    const list = await customerService.getAll();
                                    customers = (list || []).map((c: any) => ({
                                        id: String(c.id),
                                        ten_don_vi: (c.ten_don_vi || '').trim().toLowerCase(),
                                    }));
                                } catch {}
                                for (let i = 0; i < rows.length; i++) {
                                    const r = rows[i];
                                    const tenDuAn = (r.ten_du_an || '').trim();
                                    if (!tenDuAn) {
                                        errors.push(`Dòng ${i + 2}: thiếu Tên dự án`);
                                        continue;
                                    }
                                    const tenKh = (r.ten_khach_hang || '').trim();
                                    const hit = customers.find((c) => c.ten_don_vi === tenKh.toLowerCase());
                                    try {
                                        await projectService.create({
                                            ten_du_an: tenDuAn,
                                            status: (r.trang_thai || 'Đang thực hiện').trim(),
                                            progress: Number(String(r.tien_do || '0').replace(/,/g, '')) || 0,
                                            customer_id: hit?.id || null,
                                            ten_khach_hang: tenKh || null,
                                        });
                                        ok++;
                                    } catch (e: any) {
                                        errors.push(`Dòng ${i + 2}: ${e?.message || 'Lỗi'}`);
                                    }
                                }
                                return { ok, errors };
                            }}
                            onDone={() => setReloadKey((k) => k + 1)}
                        />
                        <button
                            onClick={handleAddClick}
                            className="flex items-center gap-2 bg-[#004bcb] text-white px-5 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                        >
                            <Plus size={16} />
                            <span>Thêm dự án</span>
                        </button>
                    </div>
                </div>
            </section>

            <section className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-200">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#283044] border-b border-[#1c2436]">
                                <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-[#f2f2ff]">Khách hàng</th>
                                <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-[#f2f2ff]">Trạng thái</th>
                                <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-[#f2f2ff] text-right">Giá trị HĐ</th>
                                <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-[#f2f2ff]">Nội dung</th>
                                <th className="px-6 py-4 text-xs uppercase tracking-wider font-bold text-[#f2f2ff] text-center">Hành động</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">
                                        Chưa có dự án nào phù hợp
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="px-6 py-4 text-sm text-slate-900">{item.customer_name || '—'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${item.status === 'Đang thực hiện' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-black text-right text-slate-900">
                                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                                                Number(item.giaTriHopDong) || 0,
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-500 truncate max-w-[260px]">{item.projectName}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    className="text-emerald-600 hover:text-emerald-700"
                                                    title="Xem thu chi"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(
                                                            thuChiPath({
                                                                project: item.projectName,
                                                                duAnId: String(item.id),
                                                                customerId: item.customer_id
                                                                    ? String(item.customer_id)
                                                                    : undefined,
                                                            }),
                                                        );
                                                    }}
                                                >
                                                    <DollarSign size={16} />
                                                </button>
                                                <button className="text-purple-600 hover:text-purple-700" title="Xem" onClick={() => handleViewClick(item)}>
                                                    <Eye size={16} />
                                                </button>
                                                <button className="text-amber-600 hover:text-amber-700" title="Sửa" onClick={() => handleEditClick(item)}>
                                                    <Edit size={16} />
                                                </button>
                                                <button className="text-red-600 hover:text-red-700" title="Xóa" onClick={() => handleDeleteClick(item)}>
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-4 flex flex-col gap-4 border-t border-slate-200 bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                        <p>
                            Hiển thị{' '}
                            <span className="font-bold text-slate-800">
                                {currentItems.length ? startIndex + 1 : 0} –{' '}
                                {Math.min(startIndex + itemsPerPage, filteredItems.length)}
                            </span>{' '}
                            của <span className="font-bold text-slate-800">{filteredItems.length}</span> dự án
                        </p>
                        <label className="flex items-center gap-2 text-slate-600">
                            <span className="whitespace-nowrap">Số dòng / trang</span>
                            <select
                                value={itemsPerPage}
                                onChange={(event) => setItemsPerPage(Number(event.target.value))}
                                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            >
                                {PAGE_SIZE_OPTIONS.map((size) => (
                                    <option key={size} value={size}>
                                        {size}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <div className="flex max-w-full flex-nowrap items-center gap-1 overflow-x-auto">
                        <button
                            type="button"
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                            className="rounded border border-slate-300 p-1.5 text-slate-600 hover:bg-white disabled:opacity-30"
                            title="Trang đầu"
                        >
                            <ChevronsLeft size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                            disabled={currentPage === 1}
                            className="rounded border border-slate-300 p-1.5 text-slate-600 hover:bg-white disabled:opacity-30"
                            title="Trang trước"
                        >
                            <ChevronLeft size={14} />
                        </button>
                        {visiblePages.map((page, index) =>
                            page === 'ellipsis' ? (
                                <span
                                    key={`ellipsis-${index}`}
                                    className="px-1 text-xs font-semibold text-slate-400"
                                >
                                    ...
                                </span>
                            ) : (
                                <button
                                    key={page}
                                    type="button"
                                    onClick={() => setCurrentPage(page)}
                                    className={cn(
                                        'h-8 min-w-8 rounded-lg px-2 text-xs font-bold transition-colors',
                                        currentPage === page
                                            ? 'bg-[#004bcb] text-white shadow-sm'
                                            : 'border border-slate-300 bg-white text-slate-600 hover:bg-white',
                                    )}
                                >
                                    {page}
                                </button>
                            ),
                        )}
                        <button
                            type="button"
                            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                            disabled={currentPage >= totalPages}
                            className="rounded border border-slate-300 p-1.5 text-slate-600 hover:bg-white disabled:opacity-30"
                            title="Trang sau"
                        >
                            <ChevronRight size={14} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage >= totalPages}
                            className="rounded border border-slate-300 p-1.5 text-slate-600 hover:bg-white disabled:opacity-30"
                            title="Trang cuối"
                        >
                            <ChevronsRight size={14} />
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
