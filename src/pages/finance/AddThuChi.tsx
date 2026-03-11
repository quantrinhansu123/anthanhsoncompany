import React, { useState, useEffect } from 'react';
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
import { thuChiService, ThuChiRow } from '../../lib/services/thuChiService';
import { projectService } from '../../lib/services/projectService';
import { contractService } from '../../lib/services/contractService';
import { employeeService } from '../../lib/services/employeeService';

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
        duAnId: '',
        hopDongId: '',
        nhanSuId: '',
        loaiPhieu: 'Phiếu thu',
        tinhTrangPhieu: 'Tạm ứng',
        ngayTienVe: new Date().toISOString().split('T')[0],
        soTien: 0,
        noiDung: '',
        nguoiNhan: 'Ngân hàng / Đối tác',
        file: null as File | null,
        imageUrl: '' as string | null // URL ảnh chứng từ (link)
    });
    const [projects, setProjects] = useState<Array<{ id: string; ten_du_an: string }>>([]);
    const [contracts, setContracts] = useState<Array<{ id: string; so_hop_dong: string | null; du_an_id: string | null }>>([]);
    const [employees, setEmployees] = useState<Array<{ id: string; full_name: string; code: string }>>([]);
    const [loading, setLoading] = useState(false);

    // Load projects, contracts and employees
    useEffect(() => {
        (async () => {
            const projectList = await projectService.getAll();
            setProjects(projectList.map(p => ({ id: p.id, ten_du_an: p.ten_du_an })));
            
            const contractList = await contractService.getAll();
            setContracts(contractList.map(c => ({ id: c.id, so_hop_dong: c.so_hop_dong, du_an_id: c.du_an_id || null })));
            
            const employeeList = await employeeService.getAll();
            setEmployees(employeeList.map(emp => ({
                id: emp.id.toString(),
                full_name: emp.full_name || emp.name || emp.hoTen || '',
                code: emp.code || ''
            })));
        })();
    }, []);

    // Load data if edit mode
    useEffect(() => {
        if (isEditMode && id) {
            loadData(id);
        }
    }, [isEditMode, id]);

    const loadData = async (itemId: string) => {
        try {
            setLoading(true);
            const item = await thuChiService.getById(itemId);
            if (item) {
                setFormData({
                    duAnId: item.du_an_id || '',
                    hopDongId: item.hop_dong_id || '',
                    nhanSuId: item.nhan_su_id || '',
                    loaiPhieu: item.loai_phieu,
                    tinhTrangPhieu: item.tinh_trang_phieu || 'Tạm ứng',
                    ngayTienVe: item.ngay || new Date().toISOString().split('T')[0],
                    soTien: item.so_tien,
                    noiDung: item.noi_dung || '',
                    nguoiNhan: item.nguoi_nhan || 'Ngân hàng / Đối tác',
                    file: null,
                    imageUrl: item.anh_url || null
                });
            }
        } catch (err: any) {
            setToast({ message: err.message || 'Không thể tải dữ liệu', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.duAnId) {
            setToast({ message: 'Vui lòng chọn dự án', type: 'error' });
            return;
        }

        try {
            setLoading(true);
            
            // Upload file nếu có
            let fileUrl = formData.file ? '' : null;
            if (formData.file) {
                try {
                    const filePath = `thu-chi/${Date.now()}_${formData.file.name}`;
                    fileUrl = await thuChiService.uploadFile('thu-chi-files', filePath, formData.file);
                } catch (err: any) {
                    console.error('Error uploading file:', err);
                    // Tiếp tục lưu dù upload file thất bại
                }
            }

            // Lấy URL ảnh chứng từ (chỉ lưu link, không upload)
            const imageUrl = formData.imageUrl?.trim() || null;

            const payload: Partial<ThuChiRow> = {
                du_an_id: formData.duAnId || null,
                hop_dong_id: formData.hopDongId || null,
                nhan_su_id: formData.nhanSuId || null,
                loai_phieu: formData.loaiPhieu,
                so_tien: formData.soTien,
                ngay: formData.ngayTienVe,
                noi_dung: formData.noiDung || null,
                tinh_trang_phieu: formData.tinhTrangPhieu || null,
                nguoi_nhan: formData.nguoiNhan || null,
                file_url: fileUrl || null,
                anh_url: imageUrl || null
            };

            if (isEditMode && id) {
                await thuChiService.update(id, payload);
                setToast({ message: 'Cập nhật thành công!', type: 'success' });
            } else {
                await thuChiService.create(payload);
                setToast({ message: 'Lưu thông tin thành công!', type: 'success' });
            }

            setTimeout(() => {
                navigate('/tai-chinh/thu-chi');
            }, 1500);
        } catch (err: any) {
            setToast({ message: err.message || 'Lưu thất bại!', type: 'error' });
        } finally {
            setLoading(false);
        }
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
                        disabled={loading}
                        className="px-4 py-1.5 text-sm font-bold text-white bg-blue-600 border border-blue-700 rounded hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Đang lưu...' : (isEditMode ? 'Cập nhật' : 'Lưu phiếu')}
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

                    {/* Dự án */}
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                        <div className="md:w-1/3 md:text-right">
                            <label className="text-sm font-medium text-slate-500">Dự án <span className="text-red-500">*</span></label>
                        </div>
                        <div className="md:w-2/3 relative flex-1">
                            <select
                                value={formData.duAnId}
                                onChange={(e) => setFormData({ ...formData, duAnId: e.target.value, hopDongId: '' })}
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
                            >
                                <option value="">-- Chọn dự án --</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.ten_du_an}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Hợp đồng */}
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                        <div className="md:w-1/3 md:text-right">
                            <label className="text-sm font-medium text-slate-500">Hợp đồng</label>
                        </div>
                        <div className="md:w-2/3 relative flex-1">
                            <select
                                value={formData.hopDongId}
                                onChange={(e) => setFormData({ ...formData, hopDongId: e.target.value })}
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
                                disabled={!formData.duAnId}
                            >
                                <option value="">-- Chọn hợp đồng (tùy chọn) --</option>
                                {contracts
                                    .filter(c => {
                                        // Filter contracts by project if duAnId is selected
                                        if (formData.duAnId) {
                                            return c.du_an_id === formData.duAnId;
                                        }
                                        return true; // Show all if no project selected
                                    })
                                    .map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.so_hop_dong || c.id.substring(0, 8)}
                                        </option>
                                    ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Nhân sự (chi cho ai) */}
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                        <div className="md:w-1/3 md:text-right">
                            <label className="text-sm font-medium text-slate-500">Nhân sự (chi cho ai)</label>
                        </div>
                        <div className="md:w-2/3 relative flex-1">
                            <select
                                value={formData.nhanSuId}
                                onChange={(e) => setFormData({ ...formData, nhanSuId: e.target.value })}
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
                            >
                                <option value="">-- Chọn nhân sự (tùy chọn) --</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.code ? `[${emp.code}] ` : ''}{emp.full_name}
                                    </option>
                                ))}
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
                                type="text"
                                value={formData.soTien ? formData.soTien.toLocaleString('vi-VN') : ''}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\./g, '').replace(/[^\d]/g, '');
                                    setFormData({ ...formData, soTien: value ? Number(value) : 0 });
                                }}
                                onBlur={(e) => {
                                    const value = e.target.value.replace(/\./g, '').replace(/[^\d]/g, '');
                                    setFormData({ ...formData, soTien: value ? Number(value) : 0 });
                                }}
                                placeholder="0"
                                className="w-full px-4 py-2.5 pr-20 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
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

                    {/* Người nhận */}
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                        <div className="md:w-1/3 md:text-right">
                            <label className="text-sm font-medium text-slate-500">Người nộp/nhận</label>
                        </div>
                        <div className="md:w-2/3 relative flex-1">
                            <input
                                type="text"
                                value={formData.nguoiNhan}
                                onChange={(e) => setFormData({ ...formData, nguoiNhan: e.target.value })}
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
                                placeholder="Ngân hàng / Đối tác"
                            />
                        </div>
                    </div>

                    {/* Ảnh chứng từ (Link) */}
                    <div className="flex flex-col md:flex-row gap-4 md:gap-8">
                        <div className="md:w-1/3 md:text-right md:pt-3">
                            <label className="text-sm font-medium text-slate-500">Ảnh chứng từ (Link)</label>
                        </div>
                        <div className="md:w-2/3 flex-1">
                            <div className="space-y-3">
                                {/* Input URL ảnh */}
                                <input
                                    type="url"
                                    value={formData.imageUrl || ''}
                                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                    placeholder="https://example.com/image.jpg"
                                    className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
                                />
                                
                                {/* Preview ảnh nếu có URL */}
                                {formData.imageUrl && formData.imageUrl.trim() !== '' && (
                                    <div className="relative inline-block">
                                        <img 
                                            src={formData.imageUrl} 
                                            alt="Ảnh chứng từ" 
                                            className="w-32 h-32 object-cover rounded-lg border border-slate-200"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, imageUrl: null })}
                                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                )}
                            </div>
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
