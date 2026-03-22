import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Receipt, Wallet, Info } from 'lucide-react';
import { useHopDongModal } from '../../contexts/HopDongModalContext';
import { thuChiService } from '../../lib/services/thuChiService';
import {
    normalizeNguongLoai,
    tienQuyDoiNguongChiNhanSu,
    type NguongChiNhanSuLoai,
} from '../../lib/nguongChiNhanSu';

export type HangMucChi = 'chi_du_an' | 'chi_nhan_su';

interface ThemThuChiHopDongModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function ThemThuChiHopDongModal({ isOpen, onClose, onSuccess }: ThemThuChiHopDongModalProps) {
    const { contractData: selectedContract } = useHopDongModal();
    const [form, setForm] = useState({
        type: 'Phiếu thu' as 'Phiếu thu' | 'Phiếu chi',
        amount: '',
        note: '',
        hangMucChi: 'chi_du_an' as HangMucChi,
    });
    const [isSaving, setIsSaving] = useState(false);
    const [existingNhanSuChiTotal, setExistingNhanSuChiTotal] = useState(0);

    const ngưỡngTien = useMemo(() => {
        if (!selectedContract) return 0;
        const loai = normalizeNguongLoai(
            selectedContract.nguongChiNhanSuLoai as string,
        ) as NguongChiNhanSuLoai;
        const raw = Number(selectedContract.nguongChiNhanSu ?? 0);
        return tienQuyDoiNguongChiNhanSu(loai, Number(selectedContract.giaTriQT) || 0, raw);
    }, [selectedContract]);

    const loadNhanSuChiTotal = useCallback(async () => {
        const hid = selectedContract?.uuid;
        if (!hid) {
            setExistingNhanSuChiTotal(0);
            return;
        }
        try {
            const all = await thuChiService.getAll();
            const sum = all
                .filter(
                    (r) =>
                        (r.hop_dong_id || '') === hid &&
                        r.loai_phieu === 'Phiếu chi' &&
                        r.hang_muc_chi === 'chi_nhan_su',
                )
                .reduce((s, r) => s + (Number(r.so_tien) || 0), 0);
            setExistingNhanSuChiTotal(sum);
        } catch {
            setExistingNhanSuChiTotal(0);
        }
    }, [selectedContract?.uuid]);

    useEffect(() => {
        if (!isOpen) return;
        setForm({
            type: 'Phiếu thu',
            amount: '',
            note: '',
            hangMucChi: 'chi_du_an',
        });
        loadNhanSuChiTotal();
    }, [isOpen, loadNhanSuChiTotal]);

    if (!isOpen) return null;

    const formatCurrency = (amount: number) => {
        if (amount === 0) return '0';
        return amount.toLocaleString('vi-VN');
    };

    const parseMoneyInput = (value: string) => Number((value || '').replace(/\./g, '')) || 0;

    const amountNum = parseMoneyInput(form.amount);
    const projectedNhanSuChi =
        form.type === 'Phiếu chi' && form.hangMucChi === 'chi_nhan_su'
            ? existingNhanSuChiTotal + amountNum
            : existingNhanSuChiTotal;

    const showNhanSuWarning =
        form.type === 'Phiếu chi' &&
        form.hangMucChi === 'chi_nhan_su' &&
        ngưỡngTien > 0;

    const overThreshold = showNhanSuWarning && projectedNhanSuChi > ngưỡngTien;
    const nearThreshold =
        showNhanSuWarning &&
        !overThreshold &&
        projectedNhanSuChi >= ngưỡngTien * 0.9 &&
        projectedNhanSuChi <= ngưỡngTien;
    const pctDatNguong =
        form.type === 'Phiếu chi' && form.hangMucChi === 'chi_nhan_su' && ngưỡngTien > 0
            ? (projectedNhanSuChi / ngưỡngTien) * 100
            : null;
    const barWidthPct = pctDatNguong != null ? Math.min(100, Math.max(0, pctDatNguong)) : 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseMoneyInput(form.amount);
        if (amount <= 0) {
            alert('Vui lòng nhập số tiền hợp lệ');
            return;
        }
        const hid = selectedContract?.uuid;
        if (!hid) {
            alert('Thiếu hợp đồng.');
            return;
        }
        setIsSaving(true);
        try {
            await thuChiService.create({
                hop_dong_id: hid,
                du_an_id: selectedContract.duAnId || null,
                loai_phieu: form.type,
                so_tien: amount,
                ngay: new Date().toISOString().slice(0, 10),
                noi_dung: form.note.trim() || null,
                hang_muc_chi:
                    form.type === 'Phiếu chi' ? form.hangMucChi : 'chi_du_an',
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving thu chi:', error);
            alert(
                error instanceof Error
                    ? error.message
                    : 'Không lưu được chứng từ. Kiểm tra cột hang_muc_chi đã chạy SQL chưa.',
            );
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-amber-50 to-orange-50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div
                            className={`p-2.5 rounded-xl shadow-lg ${form.type === 'Phiếu thu' ? 'bg-emerald-500 shadow-emerald-200' : 'bg-rose-500 shadow-rose-200'} text-white`}
                        >
                            {form.type === 'Phiếu thu' ? <Wallet size={24} /> : <Receipt size={24} />}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">
                                Thêm {form.type.toLowerCase()}
                            </h2>
                            <p className="text-xs font-bold text-orange-600 uppercase tracking-widest mt-0.5">
                                HĐ: {selectedContract?.soHopDong}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 hover:bg-white rounded-full transition-all hover:shadow-md text-slate-400 hover:text-slate-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto flex-1 min-h-0">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-black text-slate-700 mb-2">Loại giao dịch</label>
                            <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-2xl">
                                <button
                                    type="button"
                                    onClick={() =>
                                        setForm((f) => ({ ...f, type: 'Phiếu thu' }))
                                    }
                                    className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${form.type === 'Phiếu thu' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Phiếu thu
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setForm((f) => ({ ...f, type: 'Phiếu chi' }))
                                    }
                                    className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${form.type === 'Phiếu chi' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Phiếu chi
                                </button>
                            </div>
                        </div>

                        {form.type === 'Phiếu chi' ? (
                            <div>
                                <label className="block text-sm font-black text-slate-700 mb-2">
                                    Hạng mục chi
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setForm((f) => ({ ...f, hangMucChi: 'chi_du_an' }))
                                        }
                                        className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${form.hangMucChi === 'chi_du_an' ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 bg-slate-50 text-slate-600'}`}
                                    >
                                        Chi dự án
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setForm((f) => ({ ...f, hangMucChi: 'chi_nhan_su' }))
                                        }
                                        className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${form.hangMucChi === 'chi_nhan_su' ? 'border-violet-600 bg-violet-50 text-violet-900' : 'border-slate-200 bg-slate-50 text-slate-600'}`}
                                    >
                                        Chi nhân sự
                                    </button>
                                </div>
                            </div>
                        ) : null}

                        {form.type === 'Phiếu chi' && form.hangMucChi === 'chi_nhan_su' && selectedContract ? (
                            <div className="rounded-xl border border-violet-200 bg-white overflow-hidden shadow-sm">
                                <div className="px-3 py-2 bg-violet-50/90 border-b border-violet-100/90 text-[11px] text-violet-950 leading-snug">
                                    <span className="font-semibold">Ngưỡng chi NS (HĐ): </span>
                                    {ngưỡngTien <= 0 ? (
                                        <span className="text-violet-700">Chưa đặt</span>
                                    ) : (
                                        <>
                                            <span className="tabular-nums font-bold">{formatCurrency(ngưỡngTien)} đ</span>
                                            {normalizeNguongLoai(selectedContract.nguongChiNhanSuLoai as string) ===
                                                'phan_tram' &&
                                                Number(selectedContract.nguongChiNhanSu ?? 0) > 0 && (
                                                    <span className="text-violet-800/90">
                                                        {' '}
                                                        · {Number(selectedContract.nguongChiNhanSu)}% × QT{' '}
                                                        {formatCurrency(Number(selectedContract.giaTriQT) || 0)} đ
                                                    </span>
                                                )}
                                        </>
                                    )}
                                </div>
                                <div
                                    className={`px-3 py-2.5 text-xs ${
                                        overThreshold
                                            ? 'bg-red-50/40'
                                            : nearThreshold
                                              ? 'bg-amber-50/35'
                                              : 'bg-slate-50/40'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                                            Chi NS / ngưỡng
                                        </span>
                                        {ngưỡngTien > 0 && pctDatNguong != null && (
                                            <span
                                                className={`text-sm font-black tabular-nums ${
                                                    overThreshold
                                                        ? 'text-red-600'
                                                        : nearThreshold
                                                          ? 'text-amber-700'
                                                          : 'text-violet-700'
                                                }`}
                                            >
                                                {(Math.round(pctDatNguong * 10) / 10).toLocaleString('vi-VN')}%
                                                {pctDatNguong > 100 ? (
                                                    <span className="text-[10px] font-bold text-red-600 ml-1">vượt</span>
                                                ) : null}
                                            </span>
                                        )}
                                    </div>
                                    {ngưỡngTien > 0 && pctDatNguong != null && (
                                        <div className="h-2 w-full rounded-full bg-slate-200/80 overflow-hidden mb-2">
                                            <div
                                                className={`h-full rounded-full transition-all duration-300 ${
                                                    overThreshold
                                                        ? 'bg-red-500'
                                                        : nearThreshold
                                                          ? 'bg-amber-500'
                                                          : 'bg-violet-500'
                                                }`}
                                                style={{ width: `${barWidthPct}%` }}
                                            />
                                        </div>
                                    )}
                                    <p className="text-[11px] text-slate-800 leading-relaxed">
                                        <span className="tabular-nums font-semibold text-violet-800">
                                            {formatCurrency(projectedNhanSuChi)}
                                        </span>
                                        <span className="text-slate-400"> / </span>
                                        <span className="tabular-nums">{formatCurrency(ngưỡngTien)} đ</span>
                                        {(existingNhanSuChiTotal > 0 || amountNum > 0) && (
                                            <span className="text-slate-500 block sm:inline sm:ml-1 text-[10px]">
                                                · đã chi {formatCurrency(existingNhanSuChiTotal)} + phiếu{' '}
                                                {formatCurrency(amountNum)}
                                            </span>
                                        )}
                                    </p>
                                    {ngưỡngTien <= 0 ? (
                                        <p className="text-[10px] text-slate-500 mt-1">Chưa đặt ngưỡng trên HĐ.</p>
                                    ) : overThreshold ? (
                                        <p className="text-[10px] font-bold text-red-600 mt-1">
                                            Vượt ngưỡng chi nhân sự.
                                        </p>
                                    ) : nearThreshold ? (
                                        <p className="text-[10px] font-semibold text-amber-800 mt-1">
                                            Gần đạt ngưỡng (≥ 90%).
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        ) : null}

                        <div>
                            <label className="block text-sm font-black text-slate-700 mb-2">Số tiền (VNĐ)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-2xl font-black focus:outline-none focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 transition-all ${form.type === 'Phiếu thu' ? 'text-emerald-600' : 'text-rose-600'}`}
                                    placeholder="0"
                                    value={form.amount ? formatCurrency(parseMoneyInput(form.amount)) : ''}
                                    onChange={(e) =>
                                        setForm((f) => ({
                                            ...f,
                                            amount: e.target.value.replace(/\./g, ''),
                                        }))
                                    }
                                    required
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-black text-sm">
                                    VNĐ
                                </div>
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
                                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                                required
                            />
                        </div>
                    </div>

                    <div className="pt-2 flex gap-3">
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
