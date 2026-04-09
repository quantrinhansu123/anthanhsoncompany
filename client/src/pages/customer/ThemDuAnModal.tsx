import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ChevronDown, User, Plus, Search } from 'lucide-react';
import { customerService, Customer } from '../../lib/services/customerService';
import { employeeService } from '../../lib/services/employeeService';

/** Tiêu đề dự án mặc định (vựa rau chuyển đổi số) — dùng cho phần header và placeholder tên dự án */
const DEFAULT_DU_AN_TITLE = 'Dự án vựa rau chuyển đổi số';

type EmpRow = { id: string; full_name: string; code: string; anh_nhan_su?: string | null };

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    initialData?: any;
}

export function ThemDuAnModal({ isOpen, onClose, onSave, initialData }: Props) {
    const normalizeText = (value: string) => value.trim().toLowerCase();
    const [formData, setFormData] = useState({
        customerName: '',
        customerId: '',
        projectName: '',
        date: '',
        time: '',
        status: 'Đang thực hiện',
        progress: 0,
        managerIds: [] as string[],
        executorIds: [] as string[],
    });
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [employees, setEmployees] = useState<EmpRow[]>([]);
    const [loadingCustomers, setLoadingCustomers] = useState(false);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [customerError, setCustomerError] = useState('');

    const [managerPickerOpen, setManagerPickerOpen] = useState(false);
    const [executorPickerOpen, setExecutorPickerOpen] = useState(false);
    const [managerSearch, setManagerSearch] = useState('');
    const [executorSearch, setExecutorSearch] = useState('');
    const managerPickerRef = useRef<HTMLDivElement>(null);
    const executorPickerRef = useRef<HTMLDivElement>(null);
    const managerSearchRef = useRef<HTMLInputElement>(null);
    const executorSearchRef = useRef<HTMLInputElement>(null);

    const employeesMatchingManager = useMemo(() => {
        const q = managerSearch.trim().toLowerCase();
        if (!q) return employees;
        return employees.filter(
            (e) =>
                (e.full_name || '').toLowerCase().includes(q) ||
                (e.code || '').toLowerCase().includes(q),
        );
    }, [employees, managerSearch]);

    const employeesMatchingExecutor = useMemo(() => {
        const q = executorSearch.trim().toLowerCase();
        if (!q) return employees;
        return employees.filter(
            (e) =>
                (e.full_name || '').toLowerCase().includes(q) ||
                (e.code || '').toLowerCase().includes(q),
        );
    }, [employees, executorSearch]);

    useEffect(() => {
        if (!managerPickerOpen) {
            setManagerSearch('');
            return;
        }
        const t = window.setTimeout(() => managerSearchRef.current?.focus(), 0);
        return () => window.clearTimeout(t);
    }, [managerPickerOpen]);

    useEffect(() => {
        if (!executorPickerOpen) {
            setExecutorSearch('');
            return;
        }
        const t = window.setTimeout(() => executorSearchRef.current?.focus(), 0);
        return () => window.clearTimeout(t);
    }, [executorPickerOpen]);

    useEffect(() => {
        if (!managerPickerOpen) return;
        const onDown = (e: MouseEvent) => {
            const el = e.target as HTMLElement;
            if (managerPickerRef.current?.contains(el)) return;
            setManagerPickerOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [managerPickerOpen]);

    useEffect(() => {
        if (!executorPickerOpen) return;
        const onDown = (e: MouseEvent) => {
            const el = e.target as HTMLElement;
            if (executorPickerRef.current?.contains(el)) return;
            setExecutorPickerOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [executorPickerOpen]);

    // Load danh sách khách hàng và nhân sự từ database
    useEffect(() => {
        if (isOpen) {
            setLoadingCustomers(true);
            customerService.getAll()
                .then((data) => {
                    setCustomers(data);
                    setLoadingCustomers(false);
                })
                .catch((error) => {
                    console.error('Error loading customers:', error);
                    setLoadingCustomers(false);
                });
            
            setLoadingEmployees(true);
            employeeService.getAll()
                .then((data) => {
                    setEmployees(data.map(emp => ({
                        id: emp.id.toString(),
                        full_name: emp.full_name || emp.name || emp.hoTen || '',
                        code: emp.code || '',
                        anh_nhan_su: (emp as any).anh_nhan_su || emp.anh_nhan_su || null
                    })));
                    setLoadingEmployees(false);
                })
                .catch((error) => {
                    console.error('Error loading employees:', error);
                    setLoadingEmployees(false);
                });
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // Ưu tiên lấy customerName từ ten_khach_hang hoặc customer_name (từ join)
                // Nếu ten_khach_hang là ID (UUID format), tìm lại tên từ customers
                let customerName = initialData.customerName || initialData.ten_khach_hang || initialData.customer_name || '';
                
                // Kiểm tra xem ten_khach_hang có phải là ID không (UUID format)
                const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                const shortIdPattern = /^[0-9a-f]{8}$/i;
                if (customerName && (uuidPattern.test(customerName) || shortIdPattern.test(customerName))) {
                    // Nếu là ID, tìm lại tên từ customers hoặc từ customer_id
                    if (initialData.customer_id) {
                        const foundCustomer = customers.find(c => c.id === initialData.customer_id || c.id.toString() === initialData.customer_id);
                        if (foundCustomer) {
                            customerName = foundCustomer.ten_don_vi;
                        }
                    }
                    // Nếu vẫn không tìm thấy, dùng customer_name từ join
                    if (!customerName || uuidPattern.test(customerName) || shortIdPattern.test(customerName)) {
                        customerName = initialData.customer_name || '';
                    }
                }
                
                const managerIds = Array.isArray(initialData.manager_ids)
                    ? initialData.manager_ids.map((id: any) => String(id))
                    : (initialData.manager_id || initialData.managerId
                        ? [String(initialData.manager_id || initialData.managerId)]
                        : []);
                const executorIds = Array.isArray(initialData.executor_ids)
                    ? initialData.executor_ids.map((id: any) => String(id))
                    : (initialData.executor_id || initialData.executorId
                        ? [String(initialData.executor_id || initialData.executorId)]
                        : []);

                setFormData({
                    customerName: customerName,
                    customerId: initialData.customer_id || initialData.customerId || '',
                    projectName: initialData.projectName || initialData.ten_du_an || '',
                    date: initialData.date || new Date().toISOString().split('T')[0],
                    time: initialData.time || new Date().toLocaleTimeString('en-US', { hour12: false }),
                    status: initialData.status || 'Đang thực hiện',
                    progress: initialData.progress || 0,
                    managerIds,
                    executorIds,
                });
            } else {
                setFormData({
                    customerName: '',
                    customerId: '',
                    projectName: '',
                    date: new Date().toISOString().split('T')[0],
                    time: new Date().toLocaleTimeString('en-US', { hour12: false }),
                    status: 'Đang thực hiện',
                    progress: 0,
                    managerIds: [],
                    executorIds: [],
                });
            }
        }
    }, [isOpen, initialData, customers]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'customerName') {
            const selectedCustomer = customers.find(
                c => normalizeText(c.ten_don_vi || '') === normalizeText(value || '')
            );
            const newCustomerId = selectedCustomer?.id?.toString() || '';
            setCustomerError('');
            setFormData(prev => ({ ...prev, customerName: value, customerId: newCustomerId }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const togglePerson = (role: 'manager' | 'executor', id: string) => {
        const key = role === 'manager' ? 'managerIds' : 'executorIds';
        setFormData(prev => {
            const arr = prev[key];
            const sid = String(id);
            const next = arr.includes(sid) ? arr.filter((x) => x !== sid) : [...arr, sid];
            return { ...prev, [key]: next };
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        console.log('[ThemDuAnModal] Form data before validation:', formData);
        
        // Xử lý customerId - đảm bảo không phải empty string
        let finalCustomerId = formData.customerId && formData.customerId.trim() !== '' ? formData.customerId.trim() : null;
        let finalTenKhachHang = formData.customerName && formData.customerName.trim() !== '' ? formData.customerName.trim() : null;
        
        // Nếu customerId rỗng nhưng có customerName, thử tìm lại (exact + partial unique)
        if (!finalCustomerId && formData.customerName) {
            const normalizedInput = normalizeText(formData.customerName);
            const foundCustomer = customers.find(
                c => normalizeText(c.ten_don_vi || '') === normalizedInput
            );
            if (foundCustomer && foundCustomer.id) {
                console.log('[ThemDuAnModal] Found customer by name, using id:', foundCustomer.id);
                finalCustomerId = foundCustomer.id.toString();
                finalTenKhachHang = foundCustomer.ten_don_vi;
            } else {
                const partialMatches = customers.filter(
                    c => normalizeText(c.ten_don_vi || '').includes(normalizedInput)
                );
                if (partialMatches.length === 1 && partialMatches[0].id) {
                    finalCustomerId = partialMatches[0].id.toString();
                    finalTenKhachHang = partialMatches[0].ten_don_vi;
                } else if (partialMatches.length !== 1) {
                    setCustomerError('Vui lòng chọn đúng tên khách hàng từ danh sách gợi ý.');
                    return;
                }
            }
        }
        
        const saveData = {
            ...formData,
            id: initialData?.id || null,
            customer_id: finalCustomerId,
            customerId: finalCustomerId,
            customerName: formData.customerName,
            tenKhachHang: finalTenKhachHang || formData.customerName || null,
            managerIds: formData.managerIds,
            executorIds: formData.executorIds,
            manager_id: formData.managerIds[0] || null,
            executor_id: formData.executorIds[0] || null,
        };
        onSave(saveData);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto overscroll-y-contain p-4 sm:p-6 sm:items-center bg-black/50 modal-overlay backdrop-blur-sm">
            <div
                role="dialog"
                aria-modal="true"
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col min-h-0 max-h-[min(90vh,100dvh)] my-4 sm:my-0 overflow-hidden animate-in fade-in zoom-in-95 duration-300"
            >
                <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 border-b border-slate-100 bg-white/80 backdrop-blur-md shrink-0">
                    <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                            <Plus size={22} />
                        </div>
                        <div className="min-w-0">
                            {initialData ? (
                                <>
                                    <h2 className="text-lg font-bold text-slate-800 truncate leading-tight">
                                        {formData.projectName || 'Chỉnh sửa dự án'}
                                    </h2>
                                    <p className="text-xs text-slate-500 truncate">Cập nhật thông tin dự án</p>
                                </>
                            ) : (
                                <>
                                    <h2 className="text-lg font-bold text-slate-800 truncate leading-tight">
                                        {DEFAULT_DU_AN_TITLE}
                                    </h2>
                                    <p className="text-xs text-slate-500 truncate">Thêm mới dự án — điền thông tin bên dưới</p>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <button 
                            onClick={onClose} 
                            className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95"
                        >
                            Hủy bỏ
                        </button>
                        <button 
                            onClick={handleSubmit} 
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95 flex items-center gap-2"
                        >
                            Lưu thông tin
                        </button>
                    </div>
                </div>

                {/* Body: min-h-0 để flex cho phép co — overflow-y-auto mới cuộn được */}
                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6 sm:p-8 custom-scrollbar touch-pan-y">
                    <form className="max-w-2xl mx-auto space-y-5" onSubmit={handleSubmit}>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            {/* Tên khách hàng */}
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider ml-1">Tên khách hàng</label>
                                <div className="relative group">
                                    <input
                                        type="text"
                                        name="customerName"
                                        value={formData.customerName}
                                        onChange={handleChange}
                                        list="customer-list"
                                        autoComplete="off"
                                        placeholder={loadingCustomers ? 'Đang tải...' : 'Gõ để tìm khách hàng...'}
                                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white text-sm text-slate-800 transition-all disabled:bg-slate-100 disabled:cursor-not-allowed group-hover:border-slate-300"
                                    />
                                    <datalist id="customer-list">
                                        {customers.map((customer) => (
                                            <option key={customer.id} value={customer.ten_don_vi} />
                                        ))}
                                        {formData.customerName && 
                                            !customers.some(c => c.ten_don_vi === formData.customerName) && (
                                            <option value={formData.customerName} />
                                        )}
                                    </datalist>
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors" size={16} />
                                </div>
                                {customerError && (
                                    <p className="text-xs text-red-500 mt-1 ml-1">{customerError}</p>
                                )}
                            </div>

                            {/* Tên dự án */}
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider ml-1">Tên dự án</label>
                                <input
                                    type="text"
                                    name="projectName"
                                    value={formData.projectName}
                                    onChange={handleChange}
                                    placeholder={DEFAULT_DU_AN_TITLE}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white text-sm text-slate-800 placeholder-slate-400 transition-all hover:border-slate-300"
                                    required
                                />
                            </div>

                            {/* Ngày */}
                            <div className="space-y-1">
                                <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider ml-1">Ngày bắt đầu</label>
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white text-sm text-slate-800 transition-all hover:border-slate-300"
                                />
                            </div>

                            {/* Giờ */}
                            <div className="space-y-1">
                                <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider ml-1">Giờ bắt đầu</label>
                                <input
                                    type="time"
                                    step="1"
                                    name="time"
                                    value={formData.time}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white text-sm text-slate-800 transition-all hover:border-slate-300"
                                />
                            </div>

                            {/* Trạng thái */}
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider ml-1">Trạng thái hiện tại</label>
                                <div className="relative group">
                                    <select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                        className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white text-sm text-slate-800 bg-white appearance-none transition-all hover:border-slate-300"
                                    >
                                        <option value="Đã kết thúc">🏁 Đã kết thúc</option>
                                        <option value="Hoàn thành">✅ Hoàn thành</option>
                                        <option value="Đang thực hiện">🚀 Đang thực hiện</option>
                                        <option value="Đang quá hạn">⚠️ Đang quá hạn</option>
                                        <option value="Tạm dừng">⏸️ Tạm dừng</option>
                                        <option value="Từ chối">❌ Từ chối</option>
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-hover:text-slate-600 transition-colors" size={18} />
                                </div>
                            </div>
                        </div>

                        {/* Tiến độ (Ẩn trên UI mẫu nhưng vẫn giữ cho logic) */}
                        <div className="space-y-2 hidden">
                            <label className="text-[13px] text-slate-500">Tiến độ (%)</label>
                            <input
                                type="number"
                                name="progress"
                                value={formData.progress}
                                onChange={handleChange}
                                min="0"
                                max="100"
                                className="w-full px-4 py-3 border border-slate-300 rounded-md focus:outline-none focus:border-blue-500 text-sm text-slate-800"
                            />
                        </div>

                        {/* Người quản lý — dropdown đa chọn (sổ xuống, có tìm, cuộn) */}
                        <div className="space-y-1.5">
                            <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                Người quản lý <span className="font-normal text-slate-400 normal-case">(chọn nhiều)</span>
                            </label>
                            <div className="relative" ref={managerPickerRef}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setManagerPickerOpen((o) => !o);
                                        setExecutorPickerOpen(false);
                                    }}
                                    disabled={loadingEmployees || employees.length === 0}
                                    className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-left text-sm font-medium text-slate-800 shadow-sm hover:bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                    aria-expanded={managerPickerOpen}
                                    aria-haspopup="listbox"
                                >
                                    <span className="truncate min-w-0">
                                        {loadingEmployees
                                            ? 'Đang tải nhân sự…'
                                            : employees.length === 0
                                              ? 'Chưa có nhân sự'
                                              : formData.managerIds.length === 0
                                                ? 'Chọn người quản lý…'
                                                : formData.managerIds.length === 1
                                                  ? employees.find((e) => String(e.id) === formData.managerIds[0])
                                                      ?.full_name || '1 người'
                                                  : `${formData.managerIds.length} người đã chọn`}
                                    </span>
                                    <ChevronDown
                                        className={`w-4 h-4 shrink-0 text-slate-500 ${managerPickerOpen ? 'rotate-180' : ''}`}
                                        aria-hidden
                                    />
                                </button>
                                {managerPickerOpen && !loadingEmployees && employees.length > 0 ? (
                                    <div
                                        className="absolute left-0 right-0 top-full z-50 mt-1 flex max-h-80 flex-col overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-lg"
                                        role="listbox"
                                    >
                                        <div className="shrink-0 border-b border-slate-100 bg-slate-50 p-2">
                                            <div className="relative">
                                                <Search
                                                    size={14}
                                                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                                                />
                                                <input
                                                    ref={managerSearchRef}
                                                    type="search"
                                                    value={managerSearch}
                                                    onChange={(e) => setManagerSearch(e.target.value)}
                                                    placeholder="Tìm theo tên hoặc mã NV…"
                                                    autoComplete="off"
                                                    className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-[min(14rem,50vh)] min-h-0 overflow-y-auto py-1 [scrollbar-gutter:stable]">
                                            {employeesMatchingManager.length === 0 ? (
                                                <p className="px-3 py-2 text-xs text-slate-500">Không khớp tìm kiếm.</p>
                                            ) : (
                                                employeesMatchingManager.map((emp) => {
                                                    const sid = String(emp.id);
                                                    const checked = formData.managerIds.includes(sid);
                                                    return (
                                                        <label
                                                            key={emp.id}
                                                            className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={() => togglePerson('manager', emp.id)}
                                                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                            />
                                                            {emp.anh_nhan_su ? (
                                                                <img
                                                                    src={emp.anh_nhan_su}
                                                                    alt=""
                                                                    className="h-8 w-8 shrink-0 rounded-full object-cover border border-slate-200"
                                                                />
                                                            ) : (
                                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200">
                                                                    <User size={14} className="text-slate-400" />
                                                                </div>
                                                            )}
                                                            <span className="min-w-0 break-words">{emp.full_name}</span>
                                                            {emp.code ? (
                                                                <span className="ml-auto shrink-0 text-[11px] text-slate-400">
                                                                    {emp.code}
                                                                </span>
                                                            ) : null}
                                                        </label>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                            {formData.managerIds.length > 0 && (
                                <p className="text-xs text-slate-500 ml-1">
                                    Đã chọn {formData.managerIds.length} người quản lý
                                </p>
                            )}
                        </div>

                        {/* Người thực thi — dropdown đa chọn */}
                        <div className="space-y-1.5">
                            <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                Người thực thi <span className="font-normal text-slate-400 normal-case">(chọn nhiều)</span>
                            </label>
                            <div className="relative" ref={executorPickerRef}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setExecutorPickerOpen((o) => !o);
                                        setManagerPickerOpen(false);
                                    }}
                                    disabled={loadingEmployees || employees.length === 0}
                                    className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-left text-sm font-medium text-slate-800 shadow-sm hover:bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                                    aria-expanded={executorPickerOpen}
                                    aria-haspopup="listbox"
                                >
                                    <span className="truncate min-w-0">
                                        {loadingEmployees
                                            ? 'Đang tải nhân sự…'
                                            : employees.length === 0
                                              ? 'Chưa có nhân sự'
                                              : formData.executorIds.length === 0
                                                ? 'Chọn người thực thi…'
                                                : formData.executorIds.length === 1
                                                  ? employees.find((e) => String(e.id) === formData.executorIds[0])
                                                      ?.full_name || '1 người'
                                                  : `${formData.executorIds.length} người đã chọn`}
                                    </span>
                                    <ChevronDown
                                        className={`w-4 h-4 shrink-0 text-slate-500 ${executorPickerOpen ? 'rotate-180' : ''}`}
                                        aria-hidden
                                    />
                                </button>
                                {executorPickerOpen && !loadingEmployees && employees.length > 0 ? (
                                    <div
                                        className="absolute left-0 right-0 top-full z-50 mt-1 flex max-h-80 flex-col overflow-hidden rounded-xl border-2 border-slate-200 bg-white shadow-lg"
                                        role="listbox"
                                    >
                                        <div className="shrink-0 border-b border-slate-100 bg-slate-50 p-2">
                                            <div className="relative">
                                                <Search
                                                    size={14}
                                                    className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                                                />
                                                <input
                                                    ref={executorSearchRef}
                                                    type="search"
                                                    value={executorSearch}
                                                    onChange={(e) => setExecutorSearch(e.target.value)}
                                                    placeholder="Tìm theo tên hoặc mã NV…"
                                                    autoComplete="off"
                                                    className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                                />
                                            </div>
                                        </div>
                                        <div className="max-h-[min(14rem,50vh)] min-h-0 overflow-y-auto py-1 [scrollbar-gutter:stable]">
                                            {employeesMatchingExecutor.length === 0 ? (
                                                <p className="px-3 py-2 text-xs text-slate-500">Không khớp tìm kiếm.</p>
                                            ) : (
                                                employeesMatchingExecutor.map((emp) => {
                                                    const sid = String(emp.id);
                                                    const checked = formData.executorIds.includes(sid);
                                                    return (
                                                        <label
                                                            key={emp.id}
                                                            className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={checked}
                                                                onChange={() => togglePerson('executor', emp.id)}
                                                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                            />
                                                            {emp.anh_nhan_su ? (
                                                                <img
                                                                    src={emp.anh_nhan_su}
                                                                    alt=""
                                                                    className="h-8 w-8 shrink-0 rounded-full object-cover border border-slate-200"
                                                                />
                                                            ) : (
                                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200">
                                                                    <User size={14} className="text-slate-400" />
                                                                </div>
                                                            )}
                                                            <span className="min-w-0 break-words">{emp.full_name}</span>
                                                            {emp.code ? (
                                                                <span className="ml-auto shrink-0 text-[11px] text-slate-400">
                                                                    {emp.code}
                                                                </span>
                                                            ) : null}
                                                        </label>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                            {formData.executorIds.length > 0 && (
                                <p className="text-xs text-slate-500 ml-1">
                                    Đã chọn {formData.executorIds.length} người thực thi
                                </p>
                            )}
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}
