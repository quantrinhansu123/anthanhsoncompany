import React, { useState, useEffect } from 'react';
import { X, Upload, CheckCircle2, Image as ImageIcon, Link as LinkIcon } from 'lucide-react';
import { uploadStorageFile } from '../../lib/storageUpload';
import { taskService } from '../../lib/services/taskService';

interface NghiemThuCongViecModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: any | null;
    onSuccess: (data: any) => void;
}

export function NghiemThuCongViecModal({ isOpen, onClose, task, onSuccess }: NghiemThuCongViecModalProps) {
    const [isSaving, setIsSaving] = useState(false);
    const [progress, setProgress] = useState(0);
    const [files, setFiles] = useState<File[]>([]);
    const [notes, setNotes] = useState('');
    const [links, setLinks] = useState('');

    useEffect(() => {
        if (isOpen && task) {
            setProgress(task.tien_do || 0);
            setNotes('');
            setLinks(task.link_tai_lieu || '');
            setFiles([]);
        }
    }, [isOpen, task]);

    const uploadEvidence = async (): Promise<string[]> => {
        if (!files.length) return [];
        const urls: string[] = [];
        for (const file of files) {
            const timestamp = Date.now();
            const safeName = file.name.replace(/\s+/g, '_');
            const filePath = `task-evidence/nghiem-thu/${task?.id || 'unknown'}_${timestamp}_${safeName}`;
            
            try {
                const publicUrl = await uploadStorageFile('task-evidence', filePath, file, {
                    fallbackBuckets: ['thu-chi-files', 'hop_dong'],
                });
                if (publicUrl) urls.push(publicUrl);
            } catch (error) {
                console.error('Upload evidence error:', error);
            }
        }
        return urls;
    };

    const handleConfirm = async () => {
        if (!task) return;
        setIsSaving(true);
        try {
            const uploadedUrls = await uploadEvidence();
            
            // Prepare Ghi Chu update
            const currentGhiChu = task.ghi_chu || '';
            const timestamp = new Date().toLocaleString('vi-VN');
            const newEntry = `\n--- NGHIỆM THU (${timestamp}) ---\nTiến độ: ${progress}%${notes ? `\nGhi chú: ${notes}` : ''}${uploadedUrls.length ? `\nẢnh minh chứng: ${uploadedUrls.join(', ')}` : ''}`;
            
            const payload: any = {
                tien_do: progress,
                ghi_chu: currentGhiChu + newEntry,
                link_tai_lieu: links || task.link_tai_lieu,
            };

            if (progress === 100) {
                payload.trang_thai = 'Hoàn thành';
                payload.ngay_hoan_thanh = new Date().toISOString();
            }

            if (uploadedUrls.length > 0) {
                payload.anh_bang_chung = uploadedUrls[0];
            }

            await taskService.update(task.id, payload);
            onSuccess(payload);
            onClose();
        } catch (error) {
            console.error('Error confirming acceptance:', error);
            alert('Lỗi khi cập nhật nghiệm thu');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen || !task) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-emerald-50 to-teal-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-200">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">Nghiệm thu công việc</h2>
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mt-0.5">Xác nhận kết quả thực hiện</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 hover:bg-white rounded-full transition-all hover:shadow-md text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    {/* Task Info */}
                    <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16" />
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 relative z-10">Tên công việc đang xử lý:</h3>
                        <p className="text-lg font-extrabold text-slate-800 leading-tight relative z-10">{task.ten_task}</p>
                    </div>

                    {/* Progress Slider */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <label className="text-sm font-black text-slate-700">Cập nhật tiến độ hoàn thành</label>
                            <span className={`text-3xl font-black ${progress === 100 ? 'text-emerald-500' : 'text-purple-600'} flex items-baseline gap-1`}>
                                {progress}<span className="text-sm font-bold opacity-50">%</span>
                            </span>
                        </div>
                        <div className="relative h-4 flex items-center">
                            <input 
                                type="range" 
                                min="0" max="100" 
                                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                value={progress} 
                                onChange={e => setProgress(parseInt(e.target.value))} 
                            />
                        </div>
                        <div className="flex justify-between text-[10px] font-black text-slate-300 uppercase tracking-widest">
                            <span>0%</span>
                            <span>50%</span>
                            <span>100% (Hoàn thành)</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        {/* Evidence Upload */}
                        <div>
                            <label className="block text-sm font-black text-slate-700 mb-3 flex items-center gap-2">
                                <ImageIcon size={16} className="text-emerald-500" />
                                Tải ảnh minh chứng kết quả
                            </label>
                            <div className="relative group">
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    onChange={(e) => {
                                        const newFiles = Array.from(e.target.files || []);
                                        setFiles(prev => [...prev, ...newFiles]);
                                    }}
                                />
                                <div className="border-2 border-dashed border-slate-200 group-hover:border-emerald-400 rounded-2xl p-6 transition-all bg-slate-50/50 flex flex-col items-center justify-center gap-2">
                                    <div className="p-3 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                                        <Upload size={24} className="text-emerald-500" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-500">Kéo thả hoặc nhấp để tải ảnh</p>
                                    <p className="text-[10px] text-slate-400">Chấp nhận JPG, PNG, WEBP (Tối đa 5MB/file)</p>
                                </div>
                            </div>
                            
                            {files.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {files.map((f, i) => (
                                        <div key={i} className="group relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200">
                                            <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                                            <button 
                                                onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))}
                                                className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* External Links */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <LinkIcon size={12} />
                                    Link tài liệu đính kèm (nếu có)
                                </label>
                                <input 
                                    type="url" 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-medium" 
                                    placeholder="https://google.drive/..." 
                                    value={links} 
                                    onChange={e => setLinks(e.target.value)} 
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Ghi chú nghiệm thu</label>
                                <textarea 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-medium" 
                                    rows={3}
                                    placeholder="Mô tả tóm tắt kết quả hoặc các lưu ý khi nghiệm thu bước này..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-end items-center gap-4">
                    <button 
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-6 py-3 text-sm font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
                    >
                        Hủy bỏ
                    </button>
                    <button 
                        onClick={handleConfirm}
                        disabled={isSaving}
                        className={`
                            relative flex items-center gap-2 px-10 py-3 rounded-2xl text-white text-sm font-black shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50
                            ${progress === 100 
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-200' 
                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 shadow-purple-200'}
                        `}
                    >
                        {isSaving ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <CheckCircle2 size={18} />
                                {progress === 100 ? 'HOÀN THÀNH NGAY' : 'CẬP NHẬT TIẾN ĐỘ'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
