import React, { useState, useEffect } from 'react';
import { X, Save, Plus, DollarSign, Calendar, User, FileText, Briefcase } from 'lucide-react';
import { thuChiService } from '../../lib/services/thuChiService';
import { projectService } from '../../lib/services/projectService';
import { contractService } from '../../lib/services/contractService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    mode: 'add' | 'edit';
    initialData?: any;
    defaultType?: 'Phiếu thu' | 'Phiếu chi';
}

export function ThemThuChiModal({ isOpen, onClose, onSuccess, mode, initialData, defaultType }: Props) {
    const [isSaving, setIsSaving] = useState(false);
    const [projects, setProjects] = useState<any[]>([]);
    const [contracts, setContracts] = useState<any[]>([]);
    const [formData, setFormData] = useState({
        duAnId: '',
        hopDongId: '',
        loaiPhieu: defaultType || 'Phiếu thu',
        ngayTienVe: new Date().toISOString().split('T')[0],
        soTien: 0,
        noiDung: '',
        nguoiNhan: 'Ngân hàng / Đối tác'
    });

    useEffect(() => {
        if (isOpen) {
            loadData();
            if (initialData) {
                setFormData({
                    duAnId: initialData.du_an_id || '',
                    hopDongId: initialData.hop_dong_id || '',
                    loaiPhieu: initialData.type || initialData.loai_phieu || 'Phiếu thu',
                    ngayTienVe: initialData.date || initialData.ngay || new Date().toISOString().split('T')[0],
                    soTien: typeof initialData.amount === 'number' ? initialData.amount : Number(String(initialData.amount || '0').replace(/\./g, '').replace(/[^\d]/g, '')),
                    noiDung: initialData.description || initialData.noi_dung || '',
                    nguoiNhan: initialData.person || initialData.nguoi_nhan || 'Ngân hàng / Đối tác'
                });
            } else {
                setFormData({
                    duAnId: '',
                    hopDongId: '',
                    loaiPhieu: defaultType || 'Phiếu thu',
                    ngayTienVe: new Date().toISOString().split('T')[0],
                    soTien: 0,
                    noiDung: '',
                    nguoiNhan: 'Ngân hàng / Đối tác'
                });
            }
        }
    }, [isOpen, initialData, defaultType]);

    const loadData = async () => {
        try {
            const [pList, cList] = await Promise.all([projectService.getAll(), contractService.getAll()]);
            setProjects(pList);
            setContracts(cList);
        } catch (error) {
            console.error('Error loading data in modal:', error);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\./g, '').replace(/[^\d]/g, '');
        const numValue = rawValue ? Number(rawValue) : 0;
        setFormData(prev => ({ ...prev, soTien: numValue }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload = {
                du_an_id: formData.duAnId || null,
                hop_dong_id: formData.hopDongId || null,
                loai_phieu: formData.loaiPhieu,
                so_tien: formData.soTien,
                ngay: formData.ngayTienVe,
                noi_dung: formData.noiDung || null,
                nguoi_nhan: formData.nguoiNhan || null
            };

            if (mode === 'edit' && initialData) {
                await thuChiService.update(initialData.id, payload);
            } else {
                await thuChiService.create(payload);
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving thuchi:', error);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white/80 backdrop-blur-md shrink-0">
                    <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${formData.loaiPhieu === 'Phiếu thu' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {mode === 'edit' ? <Save size={22} /> : <Plus size={22} />}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 leading-tight uppercase">
                                {mode === 'edit' ? 'Cập nhật chứng từ' : 'Lập phiếu mới'}
                            </h2>
                            <p className="text-xs text-slate-500">Thông tin chứng từ tài chính chi tiết</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/20">
                    <form id="thu-chi-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1.5 md:col-span-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Loại chứng từ</label>
                                <select
                                    name="loaiPhieu"
                                    value={formData.loaiPhieu}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm text-slate-800 transition-all hover:border-slate-300 shadow-sm"
                                >
                                    <option value="Phiếu thu">🏢 Phiếu thu (Tiền về)</option>
                                    <option value="Phiếu chi">💸 Phiếu chi (Tiền ra)</option>
                                </select>
                            </div>

                            <div className="space-y-1.5 md:col-span-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Ngày chứng từ</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="date"
                                        name="ngayTienVe"
                                        value={formData.ngayTienVe}
                                        onChange={handleChange}
                                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm text-slate-800 transition-all hover:border-slate-300 shadow-sm"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Số tiền (VNĐ)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        value={formData.soTien.toLocaleString('vi-VN')}
                                        onChange={handleAmountChange}
                                        className={`w-full pl-11 pr-4 py-3.5 bg-white border-2 rounded-xl focus:outline-none focus:ring-4 text-lg font-bold transition-all shadow-sm ${formData.loaiPhieu === 'Phiếu thu' ? 'border-emerald-100 text-emerald-600 focus:border-emerald-500 focus:ring-emerald-500/10' : 'border-rose-100 text-rose-600 focus:border-rose-500 focus:ring-rose-500/10'}`}
                                        placeholder="0"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Người nộp / Người nhận</label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        name="nguoiNhan"
                                        value={formData.nguoiNhan}
                                        onChange={handleChange}
                                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm text-slate-800 transition-all hover:border-slate-300 shadow-sm"
                                        placeholder="Tên đối tác hoặc ngân hàng..."
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5 md:col-span-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Dự án liên quan</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <select
                                        name="duAnId"
                                        value={formData.duAnId}
                                        onChange={handleChange}
                                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm text-slate-800 transition-all hover:border-slate-300 shadow-sm"
                                    >
                                        <option value="">— Không thuộc dự án —</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.ten_du_an}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5 md:col-span-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Hợp đồng liên quan</label>
                                <div className="relative">
                                    <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <select
                                        name="hopDongId"
                                        value={formData.hopDongId}
                                        onChange={handleChange}
                                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm text-slate-800 transition-all hover:border-slate-300 shadow-sm"
                                    >
                                        <option value="">— Không thuộc hợp đồng —</option>
                                        {contracts
                                            .filter(c => !formData.duAnId || c.du_an_id === formData.duAnId)
                                            .map(c => (
                                                <option key={c.id} value={c.id}>{c.so_hop_dong}</option>
                                            ))
                                        }
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Nội dung / Diễn giải</label>
                                <textarea
                                    name="noiDung"
                                    value={formData.noiDung}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm text-slate-800 transition-all hover:border-slate-300 shadow-sm"
                                    placeholder="Diễn giải chi tiết về khoản thu chi này..."
                                    rows={3}
                                />
                            </div>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-6 py-5 bg-white border-t border-slate-100 flex justify-end gap-3 shrink-0">
                    <button 
                        type="button"
                        onClick={onClose} 
                        className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95"
                    >
                        Hủy bỏ
                    </button>
                    <button 
                        type="submit"
                        form="thu-chi-form"
                        disabled={isSaving}
                        className={`px-8 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-lg active:scale-95 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${formData.loaiPhieu === 'Phiếu thu' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-100'}`}
                    >
                        {isSaving ? (
                            <span className="animate-spin border-2 border-white/30 border-t-white rounded-full w-4 h-4"></span>
                        ) : (
                            <Save size={18} />
                        )}
                        {isSaving ? 'Đang lưu...' : mode === 'edit' ? 'Cập nhật phiếu' : 'Lập phiếu ngay'}
                    </button>
                </div>
            </div>
        </div>
    );
}
