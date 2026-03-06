import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void;
    initialData?: any;
}

export function ThemKhachHangModal({ isOpen, onClose, onSave, initialData }: Props) {
    const [formData, setFormData] = useState({
        Ten_Don_Vi: '',
        Loai_Hinh: 'Tư nhân',
        MST: '',
        Dia_Chi: '',
        Nguoi_Lien_He: '',
        Chuc_Vu_Lien_He: '',
        SDT_Lien_He: '',
        GiaTriQuyetToan: ''
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData(initialData);
            } else {
                setFormData({
                    Ten_Don_Vi: '',
                    Loai_Hinh: 'Tư nhân',
                    MST: '',
                    Dia_Chi: '',
                    Nguoi_Lien_He: '',
                    Chuc_Vu_Lien_He: '',
                    SDT_Lien_He: '',
                    GiaTriQuyetToan: ''
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-0">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X size={20} />
                        </button>
                        <h2 className="text-base font-semibold text-slate-800">
                            {initialData ? 'Sửa thông tin khách hàng' : (formData.Ten_Don_Vi || 'Thêm khách hàng mới')}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-1.5 border border-slate-300 rounded text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            className="px-4 py-1.5 bg-blue-600 border border-blue-600 rounded text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            Save
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    <form className="space-y-6 max-w-xl mx-auto" onSubmit={handleSubmit}>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500">Tên đơn vị</label>
                            <input
                                type="text"
                                name="Ten_Don_Vi"
                                value={formData.Ten_Don_Vi}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500">Loại hình</label>
                            <select
                                name="Loai_Hinh"
                                value={formData.Loai_Hinh}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                            >
                                <option value="Tư nhân">Tư nhân</option>
                                <option value="Nhà nước">Nhà nước</option>
                                <option value="Khác">Khác</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500">Mã số thuế</label>
                            <input
                                type="text"
                                name="MST"
                                value={formData.MST}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500">Địa chỉ</label>
                            <input
                                type="text"
                                name="Dia_Chi"
                                value={formData.Dia_Chi}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500">Người liên hệ</label>
                            <input
                                type="text"
                                name="Nguoi_Lien_He"
                                value={formData.Nguoi_Lien_He}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500">Chức vụ liên hệ</label>
                            <input
                                type="text"
                                name="Chuc_Vu_Lien_He"
                                value={formData.Chuc_Vu_Lien_He}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500">SĐT liên hệ</label>
                            <input
                                type="text"
                                name="SDT_Lien_He"
                                value={formData.SDT_Lien_He}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-slate-500">Giá trị quyết toán</label>
                            <input
                                type="text"
                                name="GiaTriQuyetToan"
                                value={formData.GiaTriQuyetToan}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            />
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
