import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, ChevronDown, User } from 'lucide-react';
import { customerService, Customer } from '../../lib/services/customerService';
import { employeeService } from '../../lib/services/employeeService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    initialData?: any;
}

export function ThemDuAnModal({ isOpen, onClose, onSave, initialData }: Props) {
    const [formData, setFormData] = useState({
        customerName: '',
        customerId: '',
        projectName: '',
        date: '',
        time: '',
        status: 'Đang thực hiện',
        progress: 0,
        managerId: '',
        executorId: '',
        managerImg: '',
        executorImg: ''
    });
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [employees, setEmployees] = useState<Array<{ id: string; full_name: string; code: string; anh_nhan_su?: string | null }>>([]);
    const [loadingCustomers, setLoadingCustomers] = useState(false);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [errors, setErrors] = useState<{ managerId?: string; executorId?: string }>({});

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
            setErrors({}); // Reset errors khi mở modal
            if (initialData) {
                setFormData({
                    customerName: initialData.customerName || '',
                    customerId: initialData.customer_id || initialData.customerId || '',
                    projectName: initialData.projectName || '',
                    date: initialData.date || new Date().toISOString().split('T')[0],
                    time: initialData.time || new Date().toLocaleTimeString('en-US', { hour12: false }),
                    status: initialData.status || 'Đang thực hiện',
                    progress: initialData.progress || 0,
                    managerId: initialData.manager_id || initialData.managerId || '',
                    executorId: initialData.executor_id || initialData.executorId || '',
                    managerImg: initialData.manager_img || initialData.managerImg || '',
                    executorImg: initialData.executor_img || initialData.executorImg || ''
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
                    managerId: '',
                    executorId: '',
                    managerImg: '',
                    executorImg: ''
                });
            }
        }
    }, [isOpen, initialData]);

    // Cập nhật ảnh khi chọn nhân sự
    useEffect(() => {
        if (formData.managerId) {
            const manager = employees.find(emp => emp.id === formData.managerId);
            if (manager && manager.anh_nhan_su) {
                setFormData(prev => ({ ...prev, managerImg: manager.anh_nhan_su || '' }));
            } else {
                setFormData(prev => ({ ...prev, managerImg: '' }));
            }
        } else {
            setFormData(prev => ({ ...prev, managerImg: '' }));
        }
    }, [formData.managerId, employees]);

    useEffect(() => {
        if (formData.executorId) {
            const executor = employees.find(emp => emp.id === formData.executorId);
            if (executor && executor.anh_nhan_su) {
                setFormData(prev => ({ ...prev, executorImg: executor.anh_nhan_su || '' }));
            } else {
                setFormData(prev => ({ ...prev, executorImg: '' }));
            }
        } else {
            setFormData(prev => ({ ...prev, executorImg: '' }));
        }
    }, [formData.executorId, employees]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === 'customerName') {
            // Khi chọn khách hàng, tìm customerId tương ứng
            const selectedCustomer = customers.find(c => c.ten_don_vi === value);
            setFormData(prev => ({ 
                ...prev, 
                customerName: value,
                customerId: selectedCustomer?.id?.toString() || ''
            }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
            // Xóa lỗi khi người dùng chọn
            if (name === 'managerId' || name === 'executorId') {
                setErrors(prev => ({ ...prev, [name]: undefined }));
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        console.log('[ThemDuAnModal] Form data before validation:', formData);
        
        // Validation: Kiểm tra nhân sự phụ trách
        const newErrors: { managerId?: string; executorId?: string } = {};
        if (!formData.managerId) {
            newErrors.managerId = 'Vui lòng chọn người quản lý';
        }
        if (!formData.executorId) {
            newErrors.executorId = 'Vui lòng chọn người thực thi';
        }
        
        if (Object.keys(newErrors).length > 0) {
            console.log('[ThemDuAnModal] Validation errors:', newErrors);
            setErrors(newErrors);
            return;
        }
        
        setErrors({});
        
        const saveData = {
            ...formData,
            id: initialData?.id || null, // Truyền id từ initialData nếu có
            customer_id: formData.customerId && formData.customerId.trim() !== '' ? formData.customerId : null,
            customerId: formData.customerId && formData.customerId.trim() !== '' ? formData.customerId : null,
            manager_id: formData.managerId || null,
            executor_id: formData.executorId || null,
            managerImg: formData.managerImg || null,
            executorImg: formData.executorImg || null
        };
        
        console.log('[ThemDuAnModal] Sending data to onSave:', saveData);
        console.log('[ThemDuAnModal] customerId:', formData.customerId);
        console.log('[ThemDuAnModal] customerName:', formData.customerName);
        
        // Gửi dữ liệu kèm manager_id và executor_id, customer_id, và id nếu đang edit
        onSave(saveData);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 sm:px-0 bg-black/50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col mb-10 mt-10 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                        <button onClick={onClose} className="text-slate-500 hover:text-slate-700 transition-colors shrink-0">
                            <X size={24} />
                        </button>
                        <h2 className="text-lg font-medium text-slate-800 truncate">
                            {initialData ? (formData.projectName || 'Sửa thông tin dự án') : 'Thêm dự án mới'}
                        </h2>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                        <button onClick={onClose} className="px-5 py-2 border border-slate-300 rounded text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                            Cancel
                        </button>
                        <button onClick={handleSubmit} className="px-5 py-2 bg-[#4A90E2] text-white rounded text-sm hover:bg-blue-600 transition-colors">
                            Save
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-8 pb-12">
                    <form className="max-w-2xl mx-auto space-y-8" onSubmit={handleSubmit}>

                        {/* Tên khách hàng */}
                        <div className="space-y-2">
                            <label className="text-[13px] text-slate-500">Tên khách hàng</label>
                            <div className="relative">
                                <select
                                    name="customerName"
                                    value={formData.customerName}
                                    onChange={handleChange}
                                    disabled={loadingCustomers}
                                    className="w-full pl-4 pr-10 py-3 border border-slate-300 rounded-md focus:outline-none focus:border-blue-500 text-sm text-slate-800 bg-white appearance-none disabled:bg-slate-100 disabled:cursor-not-allowed"
                                >
                                    <option value="">{loadingCustomers ? 'Đang tải...' : 'Chọn khách hàng...'}</option>
                                    {customers.map((customer) => (
                                        <option key={customer.id} value={customer.ten_don_vi}>
                                            {customer.ten_don_vi}
                                        </option>
                                    ))}
                                    {/* Nếu có giá trị từ initialData nhưng không có trong danh sách, vẫn hiển thị */}
                                    {formData.customerName && 
                                        !customers.some(c => c.ten_don_vi === formData.customerName) && (
                                        <option value={formData.customerName}>{formData.customerName}</option>
                                    )}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                            </div>
                        </div>

                        {/* Tên dự án */}
                        <div className="space-y-2">
                            <label className="text-[13px] text-slate-500">Tên dự Án</label>
                            <input
                                type="text"
                                name="projectName"
                                value={formData.projectName}
                                onChange={handleChange}
                                placeholder="Nhập tên dự án..."
                                className="w-full px-4 py-3 border border-slate-300 rounded-md focus:outline-none focus:border-blue-500 text-sm text-slate-800 placeholder-slate-400"
                                required
                            />
                        </div>

                        {/* Ngày */}
                        <div className="space-y-2">
                            <label className="text-[13px] text-slate-500">Ngày</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-md focus:outline-none focus:border-blue-500 text-sm text-slate-800"
                                />
                            </div>
                        </div>

                        {/* Giờ */}
                        <div className="space-y-2">
                            <label className="text-[13px] text-slate-500">Giờ</label>
                            <div className="relative">
                                <input
                                    type="time"
                                    step="1"
                                    name="time"
                                    value={formData.time}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-md focus:outline-none focus:border-blue-500 text-sm text-slate-800"
                                />
                            </div>
                        </div>

                        {/* Trạng thái */}
                        <div className="space-y-2">
                            <label className="text-[13px] text-slate-500">Trạng thái</label>
                            <div className="relative">
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="w-full pl-4 pr-10 py-3 border border-slate-300 rounded-md focus:outline-none focus:border-blue-500 text-sm text-slate-800 bg-white appearance-none"
                                >
                                    <option value="Đã kết thúc">Đã kết thúc</option>
                                    <option value="Hoàn thành">Hoàn thành</option>
                                    <option value="Đang thực hiện">Đang thực hiện</option>
                                    <option value="Đang quá hạn">Đang quá hạn</option>
                                    <option value="Tạm dừng">Tạm dừng</option>
                                    <option value="Từ chối">Từ chối</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
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

                        {/* Người quản lý */}
                        <div className="space-y-2">
                            <label className="text-[13px] text-slate-500">
                                Người quản lý <span className="text-red-500">*</span>
                            </label>
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1">
                                    <select
                                        name="managerId"
                                        value={formData.managerId}
                                        onChange={handleChange}
                                        disabled={loadingEmployees}
                                        className={`w-full pl-4 pr-10 py-3 border rounded-md focus:outline-none focus:border-blue-500 text-sm text-slate-800 bg-white appearance-none disabled:bg-slate-100 disabled:cursor-not-allowed ${
                                            errors.managerId ? 'border-red-500' : 'border-slate-300'
                                        }`}
                                        required
                                    >
                                        <option value="">{loadingEmployees ? 'Đang tải...' : 'Chọn người quản lý...'}</option>
                                        {employees.map((emp) => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.code ? `[${emp.code}] ` : ''}{emp.full_name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                                </div>
                                {formData.managerImg ? (
                                    <img 
                                        src={formData.managerImg} 
                                        alt="Manager" 
                                        className="w-16 h-16 rounded-full object-cover border border-slate-200"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-slate-200 border border-slate-200 flex items-center justify-center">
                                        <User size={20} className="text-slate-400" />
                                    </div>
                                )}
                            </div>
                            {errors.managerId && (
                                <p className="text-xs text-red-500 mt-1">{errors.managerId}</p>
                            )}
                        </div>

                        {/* Người thực thi */}
                        <div className="space-y-2">
                            <label className="text-[13px] text-slate-500">
                                Người thực thi <span className="text-red-500">*</span>
                            </label>
                            <div className="flex items-center gap-3">
                                <div className="relative flex-1">
                                    <select
                                        name="executorId"
                                        value={formData.executorId}
                                        onChange={handleChange}
                                        disabled={loadingEmployees}
                                        className={`w-full pl-4 pr-10 py-3 border rounded-md focus:outline-none focus:border-blue-500 text-sm text-slate-800 bg-white appearance-none disabled:bg-slate-100 disabled:cursor-not-allowed ${
                                            errors.executorId ? 'border-red-500' : 'border-slate-300'
                                        }`}
                                        required
                                    >
                                        <option value="">{loadingEmployees ? 'Đang tải...' : 'Chọn người thực thi...'}</option>
                                        {employees.map((emp) => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.code ? `[${emp.code}] ` : ''}{emp.full_name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                                </div>
                                {formData.executorImg ? (
                                    <img 
                                        src={formData.executorImg} 
                                        alt="Executor" 
                                        className="w-16 h-16 rounded-full object-cover border border-slate-200"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-slate-200 border border-slate-200 flex items-center justify-center">
                                        <User size={20} className="text-slate-400" />
                                    </div>
                                )}
                            </div>
                            {errors.executorId && (
                                <p className="text-xs text-red-500 mt-1">{errors.executorId}</p>
                            )}
                        </div>

                    </form>
                </div>
            </div>
        </div>
    );
}
