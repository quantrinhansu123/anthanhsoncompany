import React, { useEffect, useState } from 'react';
import { X, FileText, Upload, Info } from 'lucide-react';
import { useHopDongModal } from '../../contexts/HopDongModalContext';
import { contractService, type ContractFile } from '../../lib/services/contractService';
import { thuChiService } from '../../lib/services/thuChiService';
import {
    HOP_DONG_FILE_TYPES,
    HOP_DONG_FILE_TYPE_LABELS,
    calculateHopDongFileStatus,
    resolveHopDongFileTypeForSave,
    sanitizeHopDongFileName,
    hopDongFileTypeLabel,
    normalizeContractFiles,
    emitHopDongDataChanged,
} from '../../lib/hopDongFiles';

interface ThemTaiLieuHopDongModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export function ThemTaiLieuHopDongModal({ isOpen, onClose, onSuccess }: ThemTaiLieuHopDongModalProps) {
    const { contractData: selectedContract, patchContractData } = useHopDongModal();
    const [form, setForm] = useState({
        name: '',
        type: 'File_BBTT',
        file: null as File | null,
        customType: '',
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setForm({ name: '', type: 'File_BBTT', file: null, customType: '' });
            setIsSaving(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const contractId = String(selectedContract?.uuid || '').trim();
        if (!contractId) {
            alert('Không tìm thấy hợp đồng để gắn tài liệu.');
            return;
        }
        if (!form.file) {
            alert('Vui lòng chọn file để tải lên.');
            return;
        }
        if (form.type === 'File_Khac' && !form.customType.trim()) {
            alert('Vui lòng nhập tên loại tài liệu khác.');
            return;
        }

        setIsSaving(true);
        try {
            const fileType = resolveHopDongFileTypeForSave(form.type, form.customType);
            const safeName = sanitizeHopDongFileName(form.file.name);
            const filePath = `hop-dong/${Date.now()}_${safeName}`;
            const uploadedUrl = await thuChiService.uploadFile('hop_dong', filePath, form.file);

            const newFile: ContractFile = {
                file_type: fileType,
                file_name: form.name.trim() || form.file.name,
                file_url: uploadedUrl,
                uploaded_at: new Date().toISOString(),
            };

            const existingFiles = normalizeContractFiles(selectedContract?.files);
            const nextFiles = [...existingFiles, newFile];
            const fileStatus = calculateHopDongFileStatus(nextFiles);

            const updated = await contractService.update(contractId, {
                files: nextFiles,
                file_status: fileStatus,
                skipNgayUpdate: true,
            });

            const persistedFiles = normalizeContractFiles(updated?.files);
            const finalFiles = persistedFiles.length > 0 ? persistedFiles : nextFiles;
            const finalStatus = updated?.file_status || fileStatus;

            patchContractData({
                files: finalFiles,
                fileStatus: finalStatus,
            });
            emitHopDongDataChanged(contractId, finalFiles, finalStatus);

            onSuccess?.();
            onClose();
        } catch (error: any) {
            console.error('Error adding contract document:', error);
            alert('Không thể thêm tài liệu: ' + (error?.message || 'Lỗi không xác định'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">Thêm tài liệu mới</h2>
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-0.5">
                                HĐ: {selectedContract?.soHopDong || '—'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSaving}
                        className="p-2.5 hover:bg-white rounded-full transition-all hover:shadow-md text-slate-400 hover:text-slate-600 disabled:opacity-50"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-black text-slate-700 mb-2">
                                Tên tài liệu / Văn bản
                            </label>
                            <input
                                type="text"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-medium"
                                placeholder="Để trống sẽ dùng tên file"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-black text-slate-700 mb-2">Phân loại tài liệu *</label>
                            <select
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-medium appearance-none"
                                value={form.type}
                                onChange={(e) => setForm({ ...form, type: e.target.value })}
                                required
                            >
                                {HOP_DONG_FILE_TYPES.map((type) => (
                                    <option key={type} value={type}>
                                        {HOP_DONG_FILE_TYPE_LABELS[type] || type}
                                    </option>
                                ))}
                            </select>
                            {form.type === 'File_Khac' && (
                                <div className="mt-3 animate-in slide-in-from-top-2 duration-300">
                                    <input
                                        type="text"
                                        value={form.customType}
                                        onChange={(e) => setForm({ ...form, customType: e.target.value })}
                                        placeholder="Ví dụ: Giấy ủy quyền, QĐ bổ nhiệm..."
                                        className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 transition-all font-medium placeholder:text-slate-400"
                                        autoFocus
                                    />
                                </div>
                            )}
                            {form.type !== 'File_Khac' && (
                                <p className="text-[11px] text-slate-500 mt-1.5">
                                    Loại đã chọn: {hopDongFileTypeLabel(form.type)}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
                                Tệp đính kèm *
                                <Info size={14} className="text-slate-400" />
                            </label>
                            <div className="relative group">
                                <input
                                    type="file"
                                    required
                                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.zip"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    disabled={isSaving}
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] || null;
                                        setForm((prev) => ({
                                            ...prev,
                                            file,
                                            name: prev.name.trim() ? prev.name : file?.name || '',
                                        }));
                                    }}
                                />
                                <div className="border-2 border-dashed border-slate-200 group-hover:border-blue-400 rounded-2xl p-6 transition-all bg-slate-50/50 flex flex-col items-center justify-center gap-2">
                                    <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                                        <Upload size={24} className="text-blue-600" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-500">
                                        {form.file ? form.file.name : 'Nhấp hoặc kéo thả tệp vào đây'}
                                    </p>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-black">
                                        PDF, DOCX, ZIP, JPG (MAX 20MB)
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="flex-1 px-6 py-3.5 text-sm font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest disabled:opacity-50"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-[2] flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-black rounded-2xl shadow-xl shadow-blue-200 hover:shadow-blue-300 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {isSaving ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <FileText size={18} />
                                    XÁC NHẬN THÊM
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
