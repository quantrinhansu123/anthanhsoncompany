import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    X,
    Minus,
    Plus,
    ChevronDown,
    FileDown,
    CheckCircle2,
    Info,
    AlertCircle
} from 'lucide-react';

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    onClose: () => void;
}

const Toast = ({ message, type, onClose }: ToastProps) => {
    const icons = {
        success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
        error: <AlertCircle className="w-5 h-5 text-red-500" />,
        info: <Info className="w-5 h-5 text-blue-500" />
    };

    const bgColors = {
        success: 'bg-emerald-50 border-emerald-100',
        error: 'bg-red-50 border-red-100',
        info: 'bg-blue-50 border-blue-100'
    };

    return (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg animate-in slide-in-from-right-full duration-300 ${bgColors[type]}`}>
            {icons[type]}
            <p className="text-sm font-medium text-slate-800">{message}</p>
            <button onClick={onClose} className="ml-2 text-slate-400 hover:text-slate-600 transition-colors">
                <X size={16} />
            </button>
        </div>
    );
};

export function AddThuChi() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditMode = !!id;
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    const [formData, setFormData] = useState({
        loaiPhieu: 'Phiếu thu',
        contractId: '',
        tinhTrangPhieu: '',
        ngayTienVe: new Date().toISOString().split('T')[0],
        soTien: 0,
        noiDung: '',
        file: null as File | null
    });

    const handleSave = () => {
        if (!formData.contractId) {
            setToast({ message: 'Vui lòng chọn hợp đồng', type: 'error' });
            return;
        }

        // Tạo bản ghi mới đồng bộ với cấu trúc bảng
        const newRecord = {
            id: Date.now(),
            code: `TC-${Math.floor(1000 + Math.random() * 9000)}`,
            date: new Date(formData.ngayTienVe).toLocaleDateString('vi-VN'),
            type: formData.loaiPhieu,
            amount: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(formData.soTien),
            description: formData.noiDung,
            person: 'Ngân hàng / Đối tác'
        };

        // Lưu vào localStorage
        const existingData = JSON.parse(localStorage.getItem('thu_chi_records') || '[]');
        localStorage.setItem('thu_chi_records', JSON.stringify([newRecord, ...existingData]));

        setToast({ message: 'Lưu thông tin thành công!', type: 'success' });
        setTimeout(() => {
            navigate('/tai-chinh/thu-chi');
        }, 1500);
    };

    const handleCancel = () => {
        navigate('/tai-chinh/thu-chi');
    };

    return (
        <div className="max-w-4xl mx-auto mt-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in flex flex-col h-[calc(100vh-8rem)]">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            {/* Header */}
            <div className="flex flex-none items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
                <div className="flex items-center gap-4">
                    <button onClick={handleCancel} className="p-1 hover:bg-slate-100 rounded-md transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                    <h2 className="text-lg font-bold text-slate-700 uppercase">
                        {isEditMode ? `Chỉnh sửa phiếu: ${id}` : 'Thêm phiếu thu chi mới'}
                    </h2>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleCancel}
                        className="px-4 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-1.5 text-sm font-bold text-white bg-blue-600 border border-blue-700 rounded hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        Lưu phiếu
                    </button>
                </div>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-12 bg-white flex justify-center">
                <div className="w-full max-w-2xl space-y-8">

                    {/* Loại Phiếu */}
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                        <div className="md:w-1/3 md:text-right">
                            <label className="text-sm font-medium text-slate-500">Loại phiếu</label>
                        </div>
                        <div className="md:w-2/3 relative flex-1">
                            <select
                                value={formData.loaiPhieu}
                                onChange={(e) => setFormData({ ...formData, loaiPhieu: e.target.value })}
                                className={`w-full px-4 py-2.5 bg-white border border-slate-300 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium ${formData.loaiPhieu === 'Phiếu thu' ? 'text-emerald-500 italic' : 'text-slate-700'}`}
                            >
                                <option value="Phiếu thu">Phiếu thu</option>
                                <option value="Phiếu chi">Phiếu chi</option>
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Contract ID */}
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                        <div className="md:w-1/3 md:text-right">
                            <label className="text-sm font-medium text-slate-500">Hợp đồng</label>
                        </div>
                        <div className="md:w-2/3 relative flex-1">
                            <select
                                value={formData.contractId}
                                onChange={(e) => setFormData({ ...formData, contractId: e.target.value })}
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
                            >
                                <option value="">-- Chọn hợp đồng --</option>
                                <option value="01/2025/HĐKS/KDL-TNT, TCK">01/2025/HĐKS/KDL-TNT, TCK</option>
                                <option value="02/2025/HĐTV/AN-THANH-SON">02/2025/HĐTV/AN-THANH-SON</option>
                                <option value="05/2025/HĐXD/VINHOME-GRAND">05/2025/HĐXD/VINHOME-GRAND</option>
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Tình trạng phiếu */}
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                        <div className="md:w-1/3 md:text-right">
                            <label className="text-sm font-medium text-slate-500">Tình trạng phiếu</label>
                        </div>
                        <div className="md:w-2/3 relative flex-1">
                            <select
                                value={formData.tinhTrangPhieu}
                                onChange={(e) => setFormData({ ...formData, tinhTrangPhieu: e.target.value })}
                                className="w-full pl-4 pr-16 py-2.5 bg-white border border-slate-300 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
                            >
                                <option value="Tạm ứng">Tạm ứng</option>
                                <option value="Thanh toán">Thanh toán</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                <button
                                    onClick={() => setFormData({ ...formData, tinhTrangPhieu: '' })}
                                    className="hover:bg-slate-100 rounded-full p-0.5 text-slate-400"
                                >
                                    <X size={16} />
                                </button>
                                <ChevronDown size={16} className="text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Ngày tiền về */}
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                        <div className="md:w-1/3 md:text-right">
                            <label className="text-sm font-medium text-slate-500">Ngày tiền về</label>
                        </div>
                        <div className="md:w-2/3 relative flex-1">
                            <input
                                type="date"
                                value={formData.ngayTienVe}
                                onChange={(e) => setFormData({ ...formData, ngayTienVe: e.target.value })}
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 [color-scheme:light]"
                            />
                        </div>
                    </div>

                    {/* Số tiền */}
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                        <div className="md:w-1/3 md:text-right">
                            <label className="text-sm font-medium text-slate-500">Số tiền</label>
                        </div>
                        <div className="md:w-2/3 relative flex-1">
                            <input
                                type="number"
                                value={formData.soTien}
                                onChange={(e) => setFormData({ ...formData, soTien: Number(e.target.value) })}
                                className="w-full px-4 py-2.5 pr-20 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center gap-2">
                                <button
                                    onClick={() => setFormData(p => ({ ...p, soTien: Math.max(0, p.soTien - 1000000) }))}
                                    className="hover:bg-slate-100 rounded text-slate-500 flex items-center justify-center w-6 h-6 -mr-1"
                                >
                                    <Minus size={18} strokeWidth={2.5} />
                                </button>
                                <button
                                    onClick={() => setFormData(p => ({ ...p, soTien: p.soTien + 1000000 }))}
                                    className="hover:bg-slate-100 rounded text-slate-500 flex items-center justify-center w-6 h-6"
                                >
                                    <Plus size={18} strokeWidth={2.5} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Nội dung */}
                    <div className="flex flex-col md:flex-row gap-4 md:gap-8">
                        <div className="md:w-1/3 md:text-right md:pt-3">
                            <label className="text-sm font-medium text-slate-500">Nội dung</label>
                        </div>
                        <div className="md:w-2/3 flex-1">
                            <textarea
                                rows={3}
                                value={formData.noiDung}
                                onChange={(e) => setFormData({ ...formData, noiDung: e.target.value })}
                                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 resize-none leading-relaxed"
                            />
                        </div>
                    </div>

                    {/* File Upload */}
                    <div className="flex flex-col md:flex-row gap-4 md:gap-8 min-h-24">
                        <div className="md:w-1/3 md:text-right md:pt-4">
                            <label className="text-sm font-medium text-slate-500">File</label>
                        </div>
                        <div className="md:w-2/3 flex-1">
                            <div className="w-full h-full min-h-16 border border-slate-300 rounded-md p-4 flex flex-col items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer group relative">
                                <input
                                    type="file"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={(e) => setFormData({ ...formData, file: e.target.files?.[0] || null })}
                                />
                                <div className="flex flex-col items-center justify-center text-slate-500 group-hover:text-slate-700 bg-slate-500 rounded p-1.5 text-white">
                                    <FileDown size={20} />
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
