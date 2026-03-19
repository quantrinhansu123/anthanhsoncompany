import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, Layout } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: any) => void | Promise<void>;
    initialData?: any;
}

export function ThemKhachHangModal({ isOpen, onClose, onSave, initialData }: Props) {
    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({
        Ten_Don_Vi: '',
        Loai_Hinh: 'Tư nhân',
        MST: '',
        Dia_Chi: '',
        Nguoi_Lien_He: '',
        Chuc_Vu_Lien_He: '',
        SDT_Lien_He: '',
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
                });
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await Promise.resolve(onSave(formData));
            onClose();
        } catch {
            // Lỗi đã được parent xử lý (toast); giữ modal mở để sửa
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 sm:p-0">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white/80 backdrop-blur-md shrink-0">
                    <div className="flex items-center gap-4 flex-1 min-w-0 pr-4">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                            <UserPlus size={22} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold text-slate-800 truncate leading-tight">
                                {initialData ? 'Chỉnh sửa hồ sơ khách hàng' : 'Thêm khách hàng mới'}
                            </h2>
                            <p className="text-xs text-slate-500 truncate">Vui lòng cung cấp thông tin chi tiết về đối tác</p>
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
                            disabled={isSaving}
                            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isSaving ? <span className="animate-spin mr-1 opacity-70 border-2 border-white border-t-transparent rounded-full w-4 h-4"></span> : <Save size={18} />}
                            {isSaving ? 'Đang lưu...' : 'Lưu hồ sơ'}
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    <form className="space-y-6 max-w-xl mx-auto" onSubmit={handleSubmit}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider ml-1">Tên đơn vị / Công ty</label>
                                <input
                                    type="text"
                                    name="Ten_Don_Vi"
                                    value={formData.Ten_Don_Vi}
                                    onChange={handleChange}
                                    placeholder="Ví dụ: Công ty TNHH Giải pháp Phần mềm..."
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white text-sm text-slate-800 placeholder-slate-400 transition-all hover:border-slate-300"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider ml-1">Loại hình doanh nghiệp</label>
                                <select
                                    name="Loai_Hinh"
                                    value={formData.Loai_Hinh}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white text-sm text-slate-800 bg-white transition-all hover:border-slate-300"
                                >
                                    <option value="Tư nhân">🏢 Tư nhân</option>
                                    <option value="Nhà nước">🏛️ Nhà nước</option>
                                    <option value="Khác">🌐 Khác</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider ml-1">Mã số thuế</label>
                                <input
                                    type="text"
                                    name="MST"
                                    value={formData.MST}
                                    onChange={handleChange}
                                    placeholder="Mã số thuế doanh nghiệp..."
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white text-sm text-slate-800 transition-all hover:border-slate-300"
                                />
                            </div>

                            <div className="space-y-1 md:col-span-2">
                                <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider ml-1">Địa chỉ trụ sở</label>
                                <input
                                    type="text"
                                    name="Dia_Chi"
                                    value={formData.Dia_Chi}
                                    onChange={handleChange}
                                    placeholder="Địa chỉ giao dịch chính..."
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white text-sm text-slate-800 transition-all hover:border-slate-300"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider ml-1">Người liên hệ</label>
                                <input
                                    type="text"
                                    name="Nguoi_Lien_He"
                                    value={formData.Nguoi_Lien_He}
                                    onChange={handleChange}
                                    placeholder="Tên người đại diện liên hệ..."
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white text-sm text-slate-800 transition-all hover:border-slate-300"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider ml-1">Số điện thoại</label>
                                <input
                                    type="text"
                                    name="SDT_Lien_He"
                                    value={formData.SDT_Lien_He}
                                    onChange={handleChange}
                                    placeholder="Số điện thoại di động/văn phòng..."
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white text-sm text-slate-800 transition-all hover:border-slate-300"
                                />
                            </div>

                            <div className="space-y-1 md:col-span-2">
                                <label className="text-[12px] font-bold text-slate-500 uppercase tracking-wider ml-1">Chức vụ liên hệ</label>
                                <input
                                    type="text"
                                    name="Chuc_Vu_Lien_He"
                                    value={formData.Chuc_Vu_Lien_He}
                                    onChange={handleChange}
                                    placeholder="Chức danh như: Giám đốc, Kế toán,..."
                                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white text-sm text-slate-800 transition-all hover:border-slate-300"
                                />
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
