import React, { useState } from 'react';
import { X, Receipt, Wallet, Info } from 'lucide-react';
import { useHopDongModal } from '../../contexts/HopDongModalContext';

interface ThemThuChiHopDongModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (data: { type: string; amount: number; note: string }) => void;
}

export function ThemThuChiHopDongModal({ isOpen, onClose, onSuccess }: ThemThuChiHopDongModalProps) {
    const { contractData: selectedContract } = useHopDongModal();
    const [form, setForm] = useState({ type: 'Phiếu thu', amount: '', note: '' });
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const formatCurrency = (amount: number) => {
        if (amount === 0) return '0';
        return amount.toLocaleString('vi-VN');
    };

    const parseMoneyInput = (value: string) => Number((value || '').replace(/\./g, '')) || 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseMoneyInput(form.amount);
        if (amount <= 0) {
            alert('Vui lòng nhập số tiền hợp lệ');
            return;
        }
        setIsSaving(true);
        try {
            await onSuccess({ ...form, amount });
            onClose();
        } catch (error) {
            console.error('Error adding transaction:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-amber-50 to-orange-50">
                    <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl shadow-lg ${form.type === 'Phiếu thu' ? 'bg-emerald-500 shadow-emerald-200' : 'bg-rose-500 shadow-rose-200'} text-white`}>
                            {form.type === 'Phiếu thu' ? <Wallet size={24} /> : <Receipt size={24} />}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">Thêm {form.type.toLowerCase()}</h2>
                            <p className="text-xs font-bold text-orange-600 uppercase tracking-widest mt-0.5">HĐ: {selectedContract?.soHopDong}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 hover:bg-white rounded-full transition-all hover:shadow-md text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-black text-slate-700 mb-2">Loại giao dịch</label>
                            <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-2xl">
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, type: 'Phiếu thu' })}
                                    className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${form.type === 'Phiếu thu' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Phiếu thu
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setForm({ ...form, type: 'Phiếu chi' })}
                                    className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${form.type === 'Phiếu chi' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Phiếu chi
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-black text-slate-700 mb-2">Số tiền (VNĐ)</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-2xl font-black focus:outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 transition-all ${form.type === 'Phiếu thu' ? 'text-emerald-600' : 'text-rose-600'}`} 
                                    placeholder="0" 
                                    value={form.amount ? formatCurrency(parseMoneyInput(form.amount)) : ''} 
                                    onChange={e => setForm({ ...form, amount: e.target.value.replace(/\./g, '') })}
                                    required
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-black text-sm">VNĐ</div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-black text-slate-700 mb-2 flex items-center gap-2">
                                Nội dung / Diễn giải
                                <Info size={14} className="text-slate-400" />
                            </label>
                            <textarea 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 transition-all font-medium" 
                                placeholder="Nhập lý do thu/chi..." 
                                rows={3} 
                                value={form.note} 
                                onChange={e => setForm({ ...form, note: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3.5 text-sm font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest"
                        >
                            Đóng
                        </button>
                        <button 
                            type="submit"
                            disabled={isSaving}
                            className={`flex-[2] flex items-center justify-center gap-2 px-6 py-3.5 text-white text-sm font-black rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 ${form.type === 'Phiếu thu' ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-200' : 'bg-gradient-to-r from-rose-500 to-orange-500 shadow-rose-200'}`}
                        >
                            {isSaving ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Receipt size={18} />
                                    XÁC NHẬN LƯU
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
