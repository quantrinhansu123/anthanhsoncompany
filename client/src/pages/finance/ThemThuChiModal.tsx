import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Plus, DollarSign, Calendar, FileText, Briefcase, UserCircle2 } from 'lucide-react';
import { thuChiService } from '../../lib/services/thuChiService';
import { projectService } from '../../lib/services/projectService';
import { customerService } from '../../lib/services/customerService';
import { contractService, type ContractRow } from '../../lib/services/contractService';
import { employeeService } from '../../lib/services/employeeService';
import { type NhanSuOption } from '../../lib/formatNhanSu';
import { NhanSuTenAnhPicker } from '../../components/NhanSuTenAnhPicker';
import {
    normalizeNguongLoai,
    tienQuyDoiNguongChiNhanSu,
    type NguongChiNhanSuLoai,
} from '../../lib/nguongChiNhanSu';
import type { ThuChiCreatePrefill } from '../../contexts/ThuChiModalContext';

type HangMucChi = 'chi_du_an' | 'chi_nhan_su';

function normCustomerKey(s: string | null | undefined): string {
    return String(s || '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .normalize('NFC');
}

type ProjectOpt = {
    id: string;
    ten_du_an: string;
    customer_id?: string | null;
    ten_khach_hang?: string | null;
    customer_name?: string | null;
};

function contractSelValue(c: ContractRow): string {
    return String(c.hop_dong_row_id || c.id || '').trim();
}

function filterProjectsByCustomer(rows: ProjectOpt[], customerId: string, tenDonVi?: string): ProjectOpt[] {
    const cid = String(customerId).trim();
    const nameKey = normCustomerKey(tenDonVi);
    return rows.filter((p) => {
        if (String(p.customer_id ?? '').trim() === cid) return true;
        const label = normCustomerKey(p.ten_khach_hang || p.customer_name || '');
        return nameKey.length > 0 && label.length > 0 && label === nameKey;
    });
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    mode: 'add' | 'edit';
    initialData?: any;
    defaultType?: 'Phiếu thu' | 'Phiếu chi';
    customerScope?: ThuChiCreatePrefill | null;
}

export function ThemThuChiModal({
    isOpen,
    onClose,
    onSuccess,
    mode,
    initialData,
    defaultType,
    customerScope = null,
}: Props) {
    const [isSaving, setIsSaving] = useState(false);
    const [projects, setProjects] = useState<any[]>([]);
    const [contracts, setContracts] = useState<ContractRow[]>([]);
    const [customers, setCustomers] = useState<Array<{ id: string; ten_don_vi: string }>>([]);
    const [employees, setEmployees] = useState<NhanSuOption[]>([]);
    const [existingNhanSuChiTotal, setExistingNhanSuChiTotal] = useState(0);
    const [formData, setFormData] = useState({
        customerId: '' as string,
        duAnId: '',
        hopDongId: '',
        loaiPhieu: defaultType || 'Phiếu thu',
        ngayTienVe: new Date().toISOString().split('T')[0],
        soTien: 0,
        noiDung: '',
        nhanSuId: '',
        hangMucChi: 'chi_du_an' as HangMucChi,
    });

    const effectiveCustomerId = (customerScope?.customer_id || formData.customerId || '').trim();
    const effectiveCustomerTenDonVi =
        customerScope?.ten_don_vi?.trim() ||
        customers.find((c) => String(c.id) === String(formData.customerId))?.ten_don_vi ||
        '';

    const customerSelectLocked = Boolean(customerScope?.customer_id);

    const projectsForSelect = useMemo((): Array<{ id: string; ten_du_an: string }> => {
        if (!effectiveCustomerId) return [];
        const scope = customerScope;
        if (scope?.customer_id && scope.projects_for_customer !== undefined) {
            return scope.projects_for_customer.map((p) => ({
                id: String(p.id),
                ten_du_an: p.ten_du_an || '',
            }));
        }
        if (scope?.customer_id) {
            return filterProjectsByCustomer(
                projects as ProjectOpt[],
                scope.customer_id,
                scope.ten_don_vi,
            ).map((p) => ({ id: p.id, ten_du_an: p.ten_du_an }));
        }
        const rows = filterProjectsByCustomer(
            projects as ProjectOpt[],
            effectiveCustomerId,
            effectiveCustomerTenDonVi,
        ).map((p) => ({ id: p.id, ten_du_an: p.ten_du_an }));
        if (mode === 'edit' && formData.duAnId) {
            const has = rows.some((p) => String(p.id) === String(formData.duAnId));
            if (!has) {
                const p = (projects as ProjectOpt[]).find((x) => String(x.id) === String(formData.duAnId));
                if (p) return [...rows, { id: p.id, ten_du_an: p.ten_du_an }];
            }
        }
        return rows;
    }, [projects, customerScope, effectiveCustomerId, effectiveCustomerTenDonVi, mode, formData.duAnId]);

    const contractsForSelect = useMemo(() => {
        const du = String(formData.duAnId || '').trim();
        if (!du) return [];
        return contracts.filter((c) => String(c.du_an_id ?? '').trim() === du);
    }, [contracts, formData.duAnId]);

    const selectedContract = useMemo(() => {
        const hid = String(formData.hopDongId || '').trim();
        if (!hid) return undefined;
        return contracts.find(
            (c) => String(c.id || '') === hid || String(c.hop_dong_row_id || '') === hid,
        );
    }, [contracts, formData.hopDongId]);

    const scopedNoProjects =
        Boolean(customerScope?.customer_id) &&
        customerScope?.projects_for_customer !== undefined &&
        projectsForSelect.length === 0;

    const needSelectCustomerFirst = !customerSelectLocked && !String(formData.customerId || '').trim();

    const nguongTien = useMemo(() => {
        if (!selectedContract) return 0;
        const loai = normalizeNguongLoai(selectedContract.nguong_chi_nhan_su_loai) as NguongChiNhanSuLoai;
        const raw = Number(selectedContract.nguong_chi_nhan_su ?? 0);
        return tienQuyDoiNguongChiNhanSu(loai, Number(selectedContract.gia_tri_qt) || 0, raw);
    }, [selectedContract]);

    useEffect(() => {
        if (formData.loaiPhieu !== 'Phiếu chi' || !formData.hopDongId) {
            setExistingNhanSuChiTotal(0);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const all = await thuChiService.getAll();
                if (cancelled) return;
                const hid = String(formData.hopDongId || '').trim();
                let sum = all
                    .filter(
                        (r) =>
                            String(r.hop_dong_id ?? '').trim() === hid &&
                            r.loai_phieu === 'Phiếu chi' &&
                            r.hang_muc_chi === 'chi_nhan_su',
                    )
                    .reduce((s, r) => s + (Number(r.so_tien) || 0), 0);
                if (mode === 'edit' && initialData?.id) {
                    const cur = all.find((r) => r.id === initialData.id);
                    if (
                        cur &&
                        String(cur.hop_dong_id ?? '').trim() === hid &&
                        cur.hang_muc_chi === 'chi_nhan_su'
                    ) {
                        sum -= Number(cur.so_tien) || 0;
                    }
                }
                setExistingNhanSuChiTotal(sum);
            } catch {
                if (!cancelled) setExistingNhanSuChiTotal(0);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [formData.loaiPhieu, formData.hopDongId, mode, initialData?.id]);

    useEffect(() => {
        if (!isOpen) return;
        let cancelled = false;
        (async () => {
            try {
                const { projects: loadedProjects, contracts: loadedContracts } = await loadData();
                if (cancelled) return;
                if (initialData) {
                    let duAnId = initialData.du_an_id || '';
                    let hopDongId = initialData.hop_dong_id || '';
                    let ctHd: ContractRow | undefined;
                    if (!duAnId && hopDongId) {
                        const ct = loadedContracts.find(
                            (c) =>
                                String(c.id || '') === String(hopDongId) ||
                                String(c.hop_dong_row_id || '') === String(hopDongId),
                        );
                        if (ct?.du_an_id) duAnId = String(ct.du_an_id);
                    }
                    if (hopDongId) {
                        ctHd = loadedContracts.find(
                            (c) =>
                                String(c.id || '') === String(hopDongId) ||
                                String(c.hop_dong_row_id || '') === String(hopDongId),
                        );
                        if (ctHd) {
                            hopDongId = String(ctHd.hop_dong_row_id || ctHd.id || hopDongId);
                        }
                    }
                    const projRow = loadedProjects.find((p: any) => String(p.id) === String(duAnId));
                    let customerIdInit =
                        projRow?.customer_id != null && String(projRow.customer_id).trim()
                            ? String(projRow.customer_id).trim()
                            : '';
                    if (!customerIdInit && ctHd?.customer_id) {
                        customerIdInit = String(ctHd.customer_id).trim();
                    }
                    setFormData({
                        customerId: customerIdInit,
                        duAnId,
                        hopDongId,
                        loaiPhieu: initialData.type || initialData.loai_phieu || 'Phiếu thu',
                        ngayTienVe:
                            initialData.date || initialData.ngay || new Date().toISOString().split('T')[0],
                        soTien:
                            typeof initialData.amount === 'number'
                                ? initialData.amount
                                : Number(
                                      String(initialData.amount || '0')
                                          .replace(/\./g, '')
                                          .replace(/[^\d]/g, ''),
                                  ),
                        noiDung: initialData.description || initialData.noi_dung || '',
                        nhanSuId:
                            (initialData.type || initialData.loai_phieu) === 'Phiếu chi'
                                ? String(initialData.nhan_su_id || '').trim()
                                : '',
                        hangMucChi:
                            initialData.hang_muc_chi === 'chi_nhan_su' ? 'chi_nhan_su' : 'chi_du_an',
                    });
                } else {
                    setFormData({
                        customerId: customerScope?.customer_id ? String(customerScope.customer_id) : '',
                        duAnId: '',
                        hopDongId: '',
                        loaiPhieu: defaultType || 'Phiếu thu',
                        ngayTienVe: new Date().toISOString().split('T')[0],
                        soTien: 0,
                        noiDung: '',
                        hangMucChi: 'chi_du_an',
                    });
                }
            } catch (error) {
                console.error('Error loading data in modal:', error);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isOpen, initialData, defaultType, customerScope?.customer_id]);

    /** Thêm phiếu từ KH: gỡ dự án sai, tự chọn nếu chỉ 1 dự án; hợp đồng theo dự án. */
    useEffect(() => {
        if (!isOpen || mode !== 'add' || !customerScope?.customer_id || projects.length === 0) return;
        const cust = String(customerScope.customer_id);
        setFormData((prev) => {
            let du = prev.duAnId;
            if (du && !projectsForSelect.some((p) => String(p.id) === String(du))) du = '';
            if (!du && projectsForSelect.length === 1) du = String(projectsForSelect[0].id);
            const duTrim = String(du || '').trim();
            const list = duTrim
                ? contracts.filter((c) => String(c.du_an_id ?? '').trim() === duTrim)
                : [];
            let hop = prev.hopDongId;
            if (
                hop &&
                !list.some(
                    (c) =>
                        String(c.id || '') === String(hop) ||
                        String(c.hop_dong_row_id || '') === String(hop),
                )
            ) {
                hop = '';
            }
            if (du === prev.duAnId && hop === prev.hopDongId && String(prev.customerId) === cust) return prev;
            return { ...prev, customerId: cust, duAnId: du, hopDongId: hop };
        });
    }, [isOpen, mode, customerScope, projects.length, projectsForSelect, contracts]);

    /** Chưa chọn dự án thì không giữ hợp đồng; đổi dự án thì bỏ HĐ không thuộc dự án. */
    useEffect(() => {
        if (!isOpen) return;
        const du = String(formData.duAnId || '').trim();
        setFormData((prev) => {
            if (!du && prev.hopDongId) return { ...prev, hopDongId: '' };
            if (!du) return prev;
            const ok = contractsForSelect.some(
                (c) =>
                    String(c.id || '') === String(prev.hopDongId) ||
                    String(c.hop_dong_row_id || '') === String(prev.hopDongId),
            );
            if (ok || !prev.hopDongId) return prev;
            return { ...prev, hopDongId: '' };
        });
    }, [isOpen, formData.duAnId, contractsForSelect]);

    const loadData = async (): Promise<{
        emps: NhanSuOption[];
        contracts: ContractRow[];
        projects: any[];
    }> => {
        const [pList, cList, empList, custList] = await Promise.all([
            projectService.getAll(),
            contractService.getAll(),
            employeeService.getAll(),
            customerService.getAll(),
        ]);
        setProjects(pList);
        setContracts(cList);
        setCustomers(
            (custList || []).map((c: any) => ({
                id: String(c.id),
                ten_don_vi: String(c.ten_don_vi || '').trim() || '(Không tên)',
            })),
        );
        const emps: NhanSuOption[] = empList.map((emp) => ({
            id: emp.id.toString(),
            full_name: emp.full_name || emp.name || emp.hoTen || '',
            code: emp.code || '',
            anh_nhan_su: emp.anh_nhan_su || null,
        }));
        setEmployees(emps);
        return { emps, contracts: cList, projects: pList };
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
        if (!customerSelectLocked && !String(formData.customerId || '').trim()) {
            alert('Vui lòng chọn khách hàng.');
            return;
        }
        if (formData.loaiPhieu === 'Phiếu chi' && !String(formData.nhanSuId || '').trim()) {
            alert('Vui lòng chọn nhân sự cho phiếu chi.');
            return;
        }
        setIsSaving(true);
        try {
            const hid = String(formData.hopDongId || '').trim();
            const hopContract = hid
                ? contracts.find(
                      (c) =>
                          String(c.id || '') === hid ||
                          String(c.hop_dong_row_id || '') === hid,
                  )
                : null;
            const hopDongPayload = hopContract
                ? String(hopContract.hop_dong_row_id || hopContract.id || '').trim() || null
                : hid || null;
            const payload = {
                du_an_id: formData.duAnId || null,
                hop_dong_id: hopDongPayload,
                loai_phieu: formData.loaiPhieu,
                so_tien: formData.soTien,
                ngay: formData.ngayTienVe,
                noi_dung: formData.noiDung || null,
                nhan_su_id: formData.loaiPhieu === 'Phiếu chi' ? String(formData.nhanSuId).trim() || null : null,
                nguoi_nhan: null,
                hang_muc_chi: formData.loaiPhieu === 'Phiếu chi' ? formData.hangMucChi : null,
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

    const formatCurrency = (n: number) => (n === 0 ? '0' : n.toLocaleString('vi-VN'));
    const amountNum = Number(formData.soTien) || 0;
    const projectedNhanSuChi =
        formData.loaiPhieu === 'Phiếu chi' && formData.hangMucChi === 'chi_nhan_su'
            ? existingNhanSuChiTotal + amountNum
            : existingNhanSuChiTotal;
    const showNhanSuNguong =
        formData.loaiPhieu === 'Phiếu chi' && !!formData.hopDongId && formData.hangMucChi === 'chi_nhan_su';
    const overThreshold = showNhanSuNguong && nguongTien > 0 && projectedNhanSuChi > nguongTien;
    const nearThreshold =
        showNhanSuNguong &&
        nguongTien > 0 &&
        !overThreshold &&
        projectedNhanSuChi >= nguongTien * 0.9 &&
        projectedNhanSuChi <= nguongTien;
    const pctDatNguong =
        showNhanSuNguong && nguongTien > 0 ? (projectedNhanSuChi / nguongTien) * 100 : null;
    const barWidthPct = pctDatNguong != null ? Math.min(100, Math.max(0, pctDatNguong)) : 0;

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
                            {customerScope?.ten_don_vi?.trim() ? (
                                <p className="text-xs text-indigo-700 font-medium mt-1">
                                    Phiếu cho khách:{' '}
                                    <span className="font-bold">{customerScope.ten_don_vi.trim()}</span>
                                    {' — '}
                                    chỉ chọn dự án của khách này.
                                </p>
                            ) : null}
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
                                    onChange={(e) => {
                                        const v = e.target.value as 'Phiếu thu' | 'Phiếu chi';
                                        setFormData((prev) => ({
                                            ...prev,
                                            loaiPhieu: v,
                                            hangMucChi: v === 'Phiếu chi' ? prev.hangMucChi : 'chi_du_an',
                                            nhanSuId: v === 'Phiếu thu' ? '' : prev.nhanSuId,
                                        }));
                                    }}
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
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                    Khách hàng <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <UserCircle2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <select
                                        name="customerId"
                                        value={customerSelectLocked ? String(customerScope?.customer_id || '') : formData.customerId}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                customerId: e.target.value,
                                                duAnId: '',
                                                hopDongId: '',
                                            }))
                                        }
                                        disabled={customerSelectLocked}
                                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm text-slate-800 transition-all hover:border-slate-300 shadow-sm disabled:bg-slate-50 disabled:text-slate-600"
                                    >
                                        <option value="">
                                            {customerSelectLocked
                                                ? '— Khách theo ngữ cảnh —'
                                                : '— Chọn khách hàng —'}
                                        </option>
                                        {[...customers]
                                            .sort((a, b) =>
                                                a.ten_don_vi.localeCompare(b.ten_don_vi, 'vi', { sensitivity: 'base' }),
                                            )
                                            .map((c) => (
                                                <option key={c.id} value={c.id}>
                                                    {c.ten_don_vi}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                                {needSelectCustomerFirst ? (
                                    <p className="text-[11px] text-slate-500 ml-1">Chọn khách hàng trước, sau đó chọn dự án và hợp đồng.</p>
                                ) : null}
                            </div>

                            <div className="space-y-1.5 md:col-span-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Dự án liên quan</label>
                                <div className="relative">
                                    <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <select
                                        name="duAnId"
                                        value={formData.duAnId}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                duAnId: e.target.value,
                                                hopDongId: '',
                                            }))
                                        }
                                        disabled={scopedNoProjects || needSelectCustomerFirst}
                                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm text-slate-800 transition-all hover:border-slate-300 shadow-sm disabled:bg-slate-50 disabled:text-slate-500"
                                    >
                                        <option value="">
                                            {scopedNoProjects
                                                ? '— Khách chưa có dự án —'
                                                : needSelectCustomerFirst
                                                  ? '— Chọn khách hàng trước —'
                                                  : '— Chọn dự án —'}
                                        </option>
                                        {projectsForSelect.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.ten_du_an}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {scopedNoProjects ? (
                                    <p className="text-[11px] text-amber-800 font-medium ml-1">
                                        Thêm dự án ở tab Dự án (chi tiết khách hàng) trước khi lập phiếu.
                                    </p>
                                ) : (
                                    <p className="text-[11px] text-slate-400 ml-1">
                                        Sau khách hàng → dự án; hợp đồng theo dự án đã chọn.
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1.5 md:col-span-1">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">Hợp đồng liên quan</label>
                                <div className="relative">
                                    <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <select
                                        name="hopDongId"
                                        value={formData.hopDongId}
                                        onChange={handleChange}
                                        disabled={
                                            scopedNoProjects ||
                                            needSelectCustomerFirst ||
                                            !String(formData.duAnId || '').trim()
                                        }
                                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm text-slate-800 transition-all hover:border-slate-300 shadow-sm disabled:bg-slate-50 disabled:text-slate-500"
                                    >
                                        <option value="">
                                            {!String(formData.duAnId || '').trim()
                                                ? '— Chọn dự án trước —'
                                                : contractsForSelect.length === 0
                                                  ? '— Không có HĐ cho dự án này —'
                                                  : '— Không gắn hợp đồng —'}
                                        </option>
                                        {contractsForSelect.map((c) => {
                                            const v = contractSelValue(c);
                                            if (!v) return null;
                                            return (
                                                <option key={v} value={v}>
                                                    {c.so_hop_dong || c.ten_goi_thau || v}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>
                            </div>

                            {formData.loaiPhieu === 'Phiếu chi' && (
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                        Loại chi (hạng mục)
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setFormData((f) => ({ ...f, hangMucChi: 'chi_du_an' }))}
                                            className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                                                formData.hangMucChi === 'chi_du_an'
                                                    ? 'border-blue-600 bg-blue-50 text-blue-900'
                                                    : 'border-slate-200 bg-slate-50 text-slate-600'
                                            }`}
                                        >
                                            Chi dự án
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData((f) => ({ ...f, hangMucChi: 'chi_nhan_su' }))}
                                            className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                                                formData.hangMucChi === 'chi_nhan_su'
                                                    ? 'border-violet-600 bg-violet-50 text-violet-900'
                                                    : 'border-slate-200 bg-slate-50 text-slate-600'
                                            }`}
                                        >
                                            Chi nhân sự
                                        </button>
                                    </div>
                                </div>
                            )}

                            {formData.loaiPhieu === 'Phiếu chi' && formData.hopDongId && selectedContract && (
                                <div className="md:col-span-2">
                                    <div className="rounded-xl border border-violet-200 bg-white overflow-hidden shadow-sm">
                                        <div className="px-3 py-2 bg-violet-50/90 border-b border-violet-100/90 text-[11px] text-violet-950 leading-snug">
                                            <span className="font-semibold">Ngưỡng chi NS (HĐ): </span>
                                            {nguongTien <= 0 ? (
                                                <span className="text-violet-700">Chưa đặt</span>
                                            ) : (
                                                <>
                                                    <span className="tabular-nums font-bold">{formatCurrency(nguongTien)} đ</span>
                                                    {normalizeNguongLoai(selectedContract.nguong_chi_nhan_su_loai) ===
                                                        'phan_tram' &&
                                                        Number(selectedContract.nguong_chi_nhan_su) > 0 && (
                                                            <span className="text-violet-800/90">
                                                                {' '}
                                                                · {Number(selectedContract.nguong_chi_nhan_su)}% × QT{' '}
                                                                {formatCurrency(Number(selectedContract.gia_tri_qt) || 0)} đ
                                                            </span>
                                                        )}
                                                </>
                                            )}
                                        </div>
                                        {formData.hangMucChi === 'chi_nhan_su' ? (
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
                                                    {nguongTien > 0 && pctDatNguong != null && (
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
                                                                <span className="text-[10px] font-bold text-red-600 ml-1">
                                                                    vượt
                                                                </span>
                                                            ) : null}
                                                        </span>
                                                    )}
                                                </div>
                                                {nguongTien > 0 && pctDatNguong != null && (
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
                                                    <span className="tabular-nums">{formatCurrency(nguongTien)} đ</span>
                                                    {(existingNhanSuChiTotal > 0 || amountNum > 0) && (
                                                        <span className="text-slate-500 block sm:inline sm:ml-1 text-[10px]">
                                                            · đã chi {formatCurrency(existingNhanSuChiTotal)} + phiếu{' '}
                                                            {formatCurrency(amountNum)}
                                                        </span>
                                                    )}
                                                </p>
                                                {nguongTien <= 0 ? (
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
                                        ) : (
                                            <div className="px-3 py-2 text-[11px] text-slate-500">
                                                Chọn <strong>Chi nhân sự</strong> (Loại chi) để xem mức đạt ngưỡng.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {formData.loaiPhieu === 'Phiếu chi' && (
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                        Nhân sự <span className="text-red-500">*</span>
                                    </label>
                                    <NhanSuTenAnhPicker
                                        value={formData.nhanSuId}
                                        onChange={(id) => setFormData((prev) => ({ ...prev, nhanSuId: id }))}
                                        employees={employees}
                                        placeholder="Chọn nhân sự"
                                        className="rounded-xl border border-slate-200 shadow-sm [&_button]:rounded-xl [&_button]:py-2.5 [&_button]:border-slate-200"
                                    />
                                </div>
                            )}

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
