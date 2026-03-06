import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, ChevronDown } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    initialData?: any;
}

export function ThemDuAnModal({ isOpen, onClose, onSave, initialData }: Props) {
    const [formData, setFormData] = useState({
        customerName: '',
        projectName: '',
        date: '',
        time: '',
        status: 'Đang thực hiện',
        progress: 0,
        managerImg: 'https://i.pravatar.cc/150?img=11',
        executorImg: 'https://i.pravatar.cc/150?img=12'
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    ...initialData,
                    customerName: initialData.customerName || 'Trung tâm Quan trắc và Quản lý hạ tầng nông nghiệp...',
                    date: initialData.date || new Date().toISOString().split('T')[0],
                    time: initialData.time || new Date().toLocaleTimeString('en-US', { hour12: false }),
                });
            } else {
                setFormData({
                    customerName: '',
                    projectName: '',
                    date: new Date().toISOString().split('T')[0],
                    time: new Date().toLocaleTimeString('en-US', { hour12: false }),
                    status: 'Đang thực hiện',
                    progress: 0,
                    managerImg: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 50)}`,
                    executorImg: `https://i.pravatar.cc/150?img=${Math.floor(Math.random() * 50)}`
                });
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-4 sm:px-0 bg-black/50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col mb-10 animate-in fade-in zoom-in-95 duration-200">
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
                                    className="w-full pl-4 pr-10 py-3 border border-slate-300 rounded-md focus:outline-none focus:border-blue-500 text-sm text-slate-800 bg-white appearance-none"
                                >
                                    <option value="">Chọn khách hàng...</option>
                                    <option value="Trung tâm Quan trắc và Quản lý hạ tầng nông nghiệp...">Trung tâm Quan trắc và Quản lý hạ tầng nông nghiệp...</option>
                                    <option value="Công ty Cổ phần Nước Môi trường">Công ty Cổ phần Nước Môi trường</option>
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

                    </form>
                </div>
            </div>
        </div>
    );
}
