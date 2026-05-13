import React, { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import {
    X,
    Save,
    Plus,
    DollarSign,
    Calendar,
    UserCircle2,
    Search,
    ChevronDown,
} from 'lucide-react';
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
import { cn } from '../../lib/utils';

type HangMucChi = 'chi_du_an' | 'chi_nhan_su';
type LoaiPhieu = 'Phiếu thu' | 'Phiếu chi';

function resolveLoaiPhieu(data: Record<string, unknown> | null | undefined): LoaiPhieu {
    const raw = String(data?.type ?? data?.loai_phieu ?? '')
        .trim()
        .normalize('NFC')
        .toLowerCase();
    if (!raw) return 'Phiếu thu';
    if (raw === 'phiếu chi' || raw === 'phieu chi' || raw.endsWith(' chi')) return 'Phiếu chi';
    if (raw === 'phiếu thu' || raw === 'phieu thu' || raw.endsWith(' thu')) return 'Phiếu thu';
    if (raw.includes('chi')) return 'Phiếu chi';
    if (raw.includes('thu')) return 'Phiếu thu';
    return 'Phiếu thu';
}

function resolveHangMucChi(data: Record<string, unknown> | null | undefined): HangMucChi {
    const raw = String(data?.hang_muc_chi ?? '')
        .trim()
        .toLowerCase();
    if (raw === 'chi_nhan_su' || raw.includes('nhan_su')) return 'chi_nhan_su';
    const display = String(data?.hang_muc_display ?? '')
        .trim()
        .toLowerCase();
    if (display.includes('nhân sự') || display.includes('nhan su')) return 'chi_nhan_su';
    return 'chi_du_an';
}

function resolveNgayTienVe(data: Record<string, unknown> | null | undefined): string {
    const iso = String(data?.ngay ?? '').trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso.slice(0, 10);
    const display = String(data?.date ?? '').trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(display)) return display.slice(0, 10);
    return new Date().toISOString().split('T')[0];
}

function coalesceEditSource(
    initialData: Record<string, unknown>,
    full: Record<string, unknown> | null,
): Record<string, unknown> {
    if (!full) return initialData;
    return {
        ...initialData,
        ...full,
        type: initialData.type ?? full.loai_phieu,
        loai_phieu: full.loai_phieu ?? initialData.loai_phieu ?? initialData.type,
        hang_muc_chi: full.hang_muc_chi ?? initialData.hang_muc_chi,
        hang_muc_thu: full.hang_muc_thu ?? initialData.hang_muc_thu,
        hang_muc_display: initialData.hang_muc_display ?? full.hang_muc_display,
        so_tien: full.so_tien ?? initialData.so_tien,
        ngay: full.ngay ?? initialData.ngay,
        noi_dung: full.noi_dung ?? initialData.noi_dung,
        nhan_su_id: full.nhan_su_id ?? initialData.nhan_su_id,
    };
}

function resolveSoTien(data: Record<string, unknown> | null | undefined): number {
    if (typeof data?.so_tien === 'number' && !Number.isNaN(data.so_tien)) return data.so_tien;
    if (typeof data?.amount === 'number' && !Number.isNaN(data.amount)) return data.amount;
    const amountStr = String(data?.amount ?? data?.so_tien ?? '0');
    return Number(amountStr.replace(/\./g, '').replace(/[^\d]/g, '')) || 0;
}

function buildEditSeed(source: Record<string, unknown>) {
    const loaiPhieu = resolveLoaiPhieu(source);
    return {
        loaiPhieu,
        hangMucChi: resolveHangMucChi(source),
        hangMucThu: String(source.hang_muc_thu ?? '').trim(),
        soTien: resolveSoTien(source),
        noiDung: String(source.description || source.noi_dung || ''),
        ngayTienVe: resolveNgayTienVe(source),
        nhanSuId:
            loaiPhieu === 'Phiếu chi' ? String(source.nhan_su_id || '').trim() : '',
    };
}

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

function tinhTrangPhieuFromInitial(raw: unknown): string {
    const t = String(raw ?? '').trim();
    if (!t) return 'Tạm ứng';
    if (t.toLowerCase() === 'thanh_toan') return 'Thanh toán';
    return t;
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
    const [isQuickAdding, setIsQuickAdding] = useState(false);
    const [quickAddType, setQuickAddType] = useState<'customer' | 'project' | 'contract' | null>(null);
    const [quickAddForm, setQuickAddForm] = useState({
        customerName: '',
        customerMst: '',
        projectName: '',
        contractNo: '',
        packageName: '',
    });
    const [quickAddError, setQuickAddError] = useState('');
    const [projects, setProjects] = useState<any[]>([]);
    const [contracts, setContracts] = useState<ContractRow[]>([]);
    const [customers, setCustomers] = useState<Array<{ id: string; ten_don_vi: string }>>([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
    const [duAnSearch, setDuAnSearch] = useState('');
    const [duAnPickerOpen, setDuAnPickerOpen] = useState(false);
    const [hopDongSearch, setHopDongSearch] = useState('');
    const [hopDongPickerOpen, setHopDongPickerOpen] = useState(false);
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
        tinhTrangPhieu: 'Tạm ứng',
        tenGoiThau: '',
        hangMucThu: '',
    });

    const effectiveCustomerId = (customerScope?.customer_id || formData.customerId || '').trim();
    const effectiveCustomerTenDonVi =
        customerScope?.ten_don_vi?.trim() ||
        customers.find((c) => String(c.id) === String(formData.customerId))?.ten_don_vi ||
        '';

    const customerSelectLocked = Boolean(customerScope?.customer_id);
    const filteredCustomers = useMemo(() => {
        const term = customerSearch.trim().toLowerCase();
        const sorted = [...customers].sort((a, b) =>
            a.ten_don_vi.localeCompare(b.ten_don_vi, 'vi', { sensitivity: 'base' }),
        );
        if (!term) return sorted;
        return sorted.filter((c) => c.ten_don_vi.toLowerCase().includes(term));
    }, [customers, customerSearch]);

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

    const filteredProjectsForPicker = useMemo(() => {
        const term = duAnSearch.trim().toLowerCase();
        const rows = projectsForSelect;
        if (!term) return rows;
        return rows.filter((p) => (p.ten_du_an || '').toLowerCase().includes(term));
    }, [projectsForSelect, duAnSearch]);

    const filteredContractsForPicker = useMemo(() => {
        const term = hopDongSearch.trim().toLowerCase();
        const rows = contractsForSelect;
        if (!term) return rows;
        return rows.filter((c) => {
            const v = contractSelValue(c);
            const label = `${c.so_hop_dong || ''} ${c.ten_goi_thau || ''} ${v}`.toLowerCase();
            return label.includes(term);
        });
    }, [contractsForSelect, hopDongSearch]);

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

    useLayoutEffect(() => {
        if (!isOpen || mode !== 'edit' || !initialData) return;
        setFormData((prev) => ({ ...prev, ...buildEditSeed(initialData) }));
    }, [
        isOpen,
        mode,
        initialData?.id,
        initialData?.type,
        initialData?.loai_phieu,
        initialData?.hang_muc_chi,
        initialData?.hang_muc_display,
    ]);

    useEffect(() => {
        if (!isOpen) {
            setCustomerPickerOpen(false);
            setDuAnPickerOpen(false);
            setHopDongPickerOpen(false);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const { projects: loadedProjects, contracts: loadedContracts, custList } = await loadData();
                if (cancelled) return;
                if (initialData) {
                    let source: Record<string, unknown> = initialData;
                    if (mode === 'edit' && initialData.id) {
                        const full = await thuChiService.getById(String(initialData.id));
                        if (cancelled) return;
                        source = coalesceEditSource(initialData, full);
                    }
                    let duAnId = String(source.du_an_id || '').trim();
                    let hopDongId = String(source.hop_dong_id || '').trim();
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
                    if (!customerIdInit && customerScope?.customer_id) {
                        customerIdInit = String(customerScope.customer_id).trim();
                    }
                    setFormData({
                        customerId: customerIdInit,
                        duAnId,
                        hopDongId,
                        loaiPhieu: initialData.type || initialData.loai_phieu || 'Phiếu thu',
                        ngayTienVe:
                            initialData.date || initialData.ngay || new Date().toISOString().split('T')[0],
                        soTien:
                            typeof initialData.so_tien === 'number'
                                ? Number(initialData.so_tien)
                                : typeof initialData.amount === 'number'
                                  ? initialData.amount
                                  : Number(
                                        String(initialData.amount || initialData.so_tien || '0')
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
                        tinhTrangPhieu: tinhTrangPhieuFromInitial(
                            initialData.tinh_trang_phieu ?? initialData.tinhTrangPhieu,
                        ),
                        tenGoiThau:
                            String(initialData.ten_goi_thau ?? initialData.tenGoiThau ?? '').trim() ||
                            String(ctHd?.ten_goi_thau ?? '').trim(),
                        hangMucThu: String(initialData.hang_muc_thu ?? '').trim(),
                    });
                    const labelInit =
                        customerIdInit && custList.length
                            ? String(
                                  custList.find((c: any) => String(c.id) === String(customerIdInit))
                                      ?.ten_don_vi || '',
                              ).trim()
                            : '';
                    setCustomerSearch(
                        labelInit ||
                            String(initialData.customer_name || initialData.ten_khach_hang || '').trim(),
                    );
                    setDuAnSearch(projRow?.ten_du_an || '');
                    if (ctHd) {
                        const v = contractSelValue(ctHd);
                        setHopDongSearch(String(ctHd.so_hop_dong || ctHd.ten_goi_thau || v || '').trim());
                    } else {
                        setHopDongSearch('');
                    }
                } else {
                    setFormData({
                        customerId: customerScope?.customer_id ? String(customerScope.customer_id) : '',
                        duAnId: '',
                        hopDongId: '',
                        loaiPhieu: defaultType || 'Phiếu thu',
                        ngayTienVe: new Date().toISOString().split('T')[0],
                        soTien: 0,
                        noiDung: '',
                        nhanSuId: '',
                        hangMucChi: 'chi_du_an',
                        tinhTrangPhieu: 'Tạm ứng',
                        tenGoiThau: '',
                        hangMucThu: '',
                    });
                    setCustomerSearch('');
                    setDuAnSearch('');
                    setHopDongSearch('');
                }
            } catch (error) {
                console.error('Error loading data in modal:', error);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isOpen, mode, initialData, defaultType, customerScope?.customer_id]);

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
            if (!du && prev.hopDongId) return { ...prev, hopDongId: '', tenGoiThau: '' };
            if (!du) return prev;
            const ok = contractsForSelect.some(
                (c) =>
                    String(c.id || '') === String(prev.hopDongId) ||
                    String(c.hop_dong_row_id || '') === String(prev.hopDongId),
            );
            if (ok || !prev.hopDongId) return prev;
            return { ...prev, hopDongId: '', tenGoiThau: '' };
        });
    }, [isOpen, formData.duAnId, contractsForSelect]);

    /** Đồng bộ nhãn ô combobox khi duAnId / hopDongId được gán từ dữ liệu hoặc logic tự chọn */
    useEffect(() => {
        if (!isOpen) return;
        const id = String(formData.duAnId || '').trim();
        if (!id) return;
        const p = projectsForSelect.find((x) => String(x.id) === id);
        if (p) setDuAnSearch((prev) => (prev !== p.ten_du_an ? p.ten_du_an : prev));
    }, [isOpen, formData.duAnId, projectsForSelect]);

    useEffect(() => {
        if (!isOpen) return;
        const hid = String(formData.hopDongId || '').trim();
        if (!hid) return;
        const c = contracts.find(
            (x) => String(x.id || '') === hid || String(x.hop_dong_row_id || '') === hid,
        );
        if (!c) return;
        const v = contractSelValue(c);
        const label = String(c.so_hop_dong || c.ten_goi_thau || v || '').trim();
        setHopDongSearch((prev) => (prev !== label ? label : prev));
    }, [isOpen, formData.hopDongId, contracts]);

    const loadData = async (): Promise<{
        emps: NhanSuOption[];
        contracts: ContractRow[];
        projects: any[];
        custList: any[];
    }> => {
        const [pList, cList, empList, custList] = await Promise.all([
            projectService.getAll(),
            contractService.getAll(),
            employeeService.getAll(),
            customerService.getAll(),
        ]);
        setProjects(pList);
        setContracts(cList);
        const rawCust = custList || [];
        setCustomers(
            rawCust.map((c: any) => ({
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
        return { emps, contracts: cList, projects: pList, custList: rawCust };
    };

    const reloadPickersData = async () => {
        await loadData();
    };

    const openQuickAddCustomer = () => {
        if (customerSelectLocked || isQuickAdding) return;
        setQuickAddError('');
        setQuickAddForm((prev) => ({ ...prev, customerName: '', customerMst: '' }));
        setQuickAddType('customer');
    };

    const openQuickAddProject = () => {
        if (isQuickAdding) return;
        const customerId = String(formData.customerId || '').trim();
        if (!customerId) {
            alert('Vui lòng chọn khách hàng trước khi thêm dự án.');
            return;
        }
        setQuickAddError('');
        setQuickAddForm((prev) => ({ ...prev, projectName: '' }));
        setQuickAddType('project');
    };

    const openQuickAddContract = () => {
        if (isQuickAdding) return;
        const customerId = String(formData.customerId || '').trim();
        const duAnId = String(formData.duAnId || '').trim();
        if (!customerId) {
            alert('Vui lòng chọn khách hàng trước khi thêm hợp đồng.');
            return;
        }
        if (!duAnId) {
            alert('Vui lòng chọn dự án trước khi thêm hợp đồng.');
            return;
        }
        setQuickAddError('');
        setQuickAddForm((prev) => ({
            ...prev,
            contractNo: '',
            packageName: formData.tenGoiThau || '',
        }));
        setQuickAddType('contract');
    };

    const handleSubmitQuickAdd = async () => {
        try {
            setIsQuickAdding(true);
            setQuickAddError('');
            if (quickAddType === 'customer') {
                const tenDonVi = quickAddForm.customerName.trim();
                if (!tenDonVi) {
                    setQuickAddError('Vui lòng nhập tên khách hàng.');
                    return;
                }
                const created = await customerService.create({
                    ten_don_vi: tenDonVi,
                    mst: quickAddForm.customerMst.trim() || undefined,
                });
                if (!created?.id) throw new Error('Không tạo được khách hàng mới.');
                await reloadPickersData();
                const newId = String(created.id);
                setFormData((prev) => ({
                    ...prev,
                    customerId: newId,
                    duAnId: '',
                    hopDongId: '',
                    tenGoiThau: '',
                }));
                setCustomerSearch(String(created.ten_don_vi || tenDonVi));
                setDuAnSearch('');
                setHopDongSearch('');
                setCustomerPickerOpen(false);
            } else if (quickAddType === 'project') {
                const customerId = String(formData.customerId || '').trim();
                const tenDuAn = quickAddForm.projectName.trim();
                if (!tenDuAn) {
                    setQuickAddError('Vui lòng nhập tên dự án.');
                    return;
                }
                const tenKhachHang =
                    customers.find((c) => String(c.id) === customerId)?.ten_don_vi ||
                    effectiveCustomerTenDonVi ||
                    null;
                const created = await projectService.create({
                    ten_du_an: tenDuAn,
                    customer_id: customerId,
                    ten_khach_hang: tenKhachHang,
                    status: 'Đang thực hiện',
                    progress: 0,
                });
                if (!created?.id) throw new Error('Không tạo được dự án mới.');
                await reloadPickersData();
                const newProjectId = String(created.id);
                setFormData((prev) => ({
                    ...prev,
                    duAnId: newProjectId,
                    hopDongId: '',
                    tenGoiThau: '',
                }));
                setDuAnSearch(String(created.ten_du_an || tenDuAn));
                setHopDongSearch('');
                setDuAnPickerOpen(false);
            } else if (quickAddType === 'contract') {
                const customerId = String(formData.customerId || '').trim();
                const duAnId = String(formData.duAnId || '').trim();
                const soHopDong = quickAddForm.contractNo.trim();
                const tenGoiThau = quickAddForm.packageName.trim();
                if (!soHopDong) {
                    setQuickAddError('Vui lòng nhập số hợp đồng.');
                    return;
                }
                if (!tenGoiThau) {
                    setQuickAddError('Vui lòng nhập tên gói thầu.');
                    return;
                }
                const duAnName =
                    projectsForSelect.find((p) => String(p.id) === duAnId)?.ten_du_an ||
                    (projects as ProjectOpt[]).find((p) => String(p.id) === duAnId)?.ten_du_an ||
                    null;
                const created = await contractService.create({
                    customer_id: customerId,
                    du_an_id: duAnId,
                    project_name: duAnName,
                    so_hop_dong: soHopDong,
                    ten_goi_thau: tenGoiThau,
                    ngay_ky_hd: new Date().toISOString().slice(0, 10),
                    gia_tri_hd: 0,
                    gia_tri_qt: 0,
                    da_thu: 0,
                    con_phai_thu: 0,
                    ngay_update: new Date().toISOString().slice(0, 10),
                    file_status: 'Chưa có file',
                });
                if (!created) throw new Error('Không tạo được hợp đồng mới.');
                await reloadPickersData();
                const newHopDongId = String(created.hop_dong_row_id || created.id || '').trim();
                if (!newHopDongId) throw new Error('Không lấy được mã hợp đồng mới.');
                setFormData((prev) => ({
                    ...prev,
                    hopDongId: newHopDongId,
                    tenGoiThau,
                }));
                setHopDongSearch(soHopDong || tenGoiThau || newHopDongId);
                setHopDongPickerOpen(false);
            }
            setQuickAddType(null);
        } catch (e: any) {
            setQuickAddError(e?.message || 'Không thể tạo mới dữ liệu.');
        } finally {
            setIsQuickAdding(false);
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
                tinh_trang_phieu: String(formData.tinhTrangPhieu || '').trim() || null,
                ten_goi_thau: String(formData.tenGoiThau || '').trim() || null,
                hang_muc_thu:
                    formData.loaiPhieu === 'Phiếu thu'
                        ? String(formData.hangMucThu || '').trim() || null
                        : null,
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
    const isPhieuChi =
        formData.loaiPhieu === 'Phiếu chi' ||
        (mode === 'edit' && initialData && resolveLoaiPhieu(initialData) === 'Phiếu chi');
    const projectedNhanSuChi =
        isPhieuChi && formData.hangMucChi === 'chi_nhan_su'
            ? existingNhanSuChiTotal + amountNum
            : existingNhanSuChiTotal;
    const showNhanSuNguong =
        isPhieuChi && !!formData.hopDongId && formData.hangMucChi === 'chi_nhan_su';
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

                            {isPhieuChi && (
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                        Hạng mục
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

                            {formData.loaiPhieu === 'Phiếu thu' && (
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                        Hạng mục thu
                                    </label>
                                    <input
                                        type="text"
                                        name="hangMucThu"
                                        value={formData.hangMucThu}
                                        onChange={handleChange}
                                        placeholder="Nhập hạng mục thu..."
                                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm text-slate-800 transition-all hover:border-slate-300 shadow-sm"
                                    />
                                </div>
                            )}

                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                    Tình trạng phiếu
                                </label>
                                <div className="relative">
                                    <select
                                        name="tinhTrangPhieu"
                                        value={formData.tinhTrangPhieu}
                                        onChange={handleChange}
                                        className="w-full appearance-none pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm text-slate-800 transition-all hover:border-slate-300 shadow-sm"
                                    >
                                        <option value="">— Trống —</option>
                                        <option value="Tạm ứng">Tạm ứng</option>
                                        <option value="Thanh toán">Thanh toán</option>
                                        {formData.tinhTrangPhieu &&
                                        formData.tinhTrangPhieu !== 'Tạm ứng' &&
                                        formData.tinhTrangPhieu !== 'Thanh toán' && (
                                            <option value={formData.tinhTrangPhieu}>
                                                {formData.tinhTrangPhieu}
                                            </option>
                                        )}
                                    </select>
                                    <ChevronDown
                                        size={16}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                    />
                                </div>
                                <p className="text-[11px] text-slate-500 ml-1">
                                    Khớp cột «Tình trạng» trên danh sách (ví dụ thu CĐT: Thanh toán / Tạm ứng).
                                </p>
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
                                <div className="flex items-center justify-between gap-2 ml-1">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        Khách hàng <span className="text-red-500">*</span>
                                    </label>
                                    {!customerSelectLocked && (
                                        <button
                                            type="button"
                                            onClick={openQuickAddCustomer}
                                            disabled={isQuickAdding}
                                            className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
                                        >
                                            + Thêm khách hàng
                                        </button>
                                    )}
                                </div>
                                {customerSelectLocked ? (
                                    <div className="relative">
                                        <UserCircle2
                                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                            size={16}
                                        />
                                        <div className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 shadow-sm">
                                            {customerScope?.ten_don_vi?.trim() ||
                                                effectiveCustomerTenDonVi ||
                                                '—'}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative z-20">
                                        <Search
                                            size={16}
                                            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                        />
                                        <input
                                            type="text"
                                            role="combobox"
                                            aria-expanded={customerPickerOpen}
                                            aria-autocomplete="list"
                                            autoComplete="off"
                                            value={customerSearch}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setCustomerSearch(v);
                                                setCustomerPickerOpen(true);
                                                const selId = String(formData.customerId || '').trim();
                                                if (selId) {
                                                    const cur = customers.find((x) => String(x.id) === selId);
                                                    if (cur && v !== cur.ten_don_vi) {
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            customerId: '',
                                                            duAnId: '',
                                                            hopDongId: '',
                                                            tenGoiThau: '',
                                                        }));
                                                        setDuAnSearch('');
                                                        setHopDongSearch('');
                                                    }
                                                }
                                            }}
                                            onFocus={() => setCustomerPickerOpen(true)}
                                            onBlur={() => {
                                                window.setTimeout(() => setCustomerPickerOpen(false), 200);
                                            }}
                                            placeholder="Gõ tìm hoặc chọn khách hàng…"
                                            className="w-full pl-10 pr-20 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm text-slate-800 transition-all hover:border-slate-300 shadow-sm"
                                        />
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                            {customerSearch ? (
                                                <button
                                                    type="button"
                                                    className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                                    aria-label="Xóa khách hàng"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => {
                                                        setCustomerSearch('');
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            customerId: '',
                                                            duAnId: '',
                                                            hopDongId: '',
                                                            tenGoiThau: '',
                                                        }));
                                                        setDuAnSearch('');
                                                        setHopDongSearch('');
                                                        setCustomerPickerOpen(false);
                                                    }}
                                                >
                                                    <X size={16} />
                                                </button>
                                            ) : null}
                                            <ChevronDown size={16} className="text-slate-400 pointer-events-none" />
                                        </div>
                                        {customerPickerOpen && (
                                            <ul
                                                role="listbox"
                                                className="absolute left-0 right-0 top-full mt-1 max-h-52 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                                            >
                                                <li>
                                                    <button
                                                        type="button"
                                                        role="option"
                                                        className={cn(
                                                            'w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50',
                                                            !formData.customerId
                                                                ? 'bg-indigo-50 text-indigo-800 font-medium'
                                                                : 'text-slate-700',
                                                        )}
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => {
                                                            setFormData((prev) => ({
                                                                ...prev,
                                                                customerId: '',
                                                                duAnId: '',
                                                                hopDongId: '',
                                                                tenGoiThau: '',
                                                            }));
                                                            setCustomerSearch('');
                                                            setDuAnSearch('');
                                                            setHopDongSearch('');
                                                            setCustomerPickerOpen(false);
                                                        }}
                                                    >
                                                        — Chưa chọn khách hàng —
                                                    </button>
                                                </li>
                                                {filteredCustomers.length === 0 ? (
                                                    <li className="px-3 py-2.5 text-sm text-slate-500">
                                                        Không tìm thấy khách hàng
                                                    </li>
                                                ) : (
                                                    filteredCustomers.map((c) => (
                                                        <li key={c.id}>
                                                            <button
                                                                type="button"
                                                                role="option"
                                                                className={cn(
                                                                    'w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50 truncate',
                                                                    String(formData.customerId) === String(c.id)
                                                                        ? 'bg-indigo-50 text-indigo-800 font-medium'
                                                                        : 'text-slate-800',
                                                                )}
                                                                onMouseDown={(e) => e.preventDefault()}
                                                                onClick={() => {
                                                                    setFormData((prev) => ({
                                                                        ...prev,
                                                                        customerId: c.id,
                                                                        duAnId: '',
                                                                        hopDongId: '',
                                                                        tenGoiThau: '',
                                                                    }));
                                                                    setCustomerSearch(c.ten_don_vi);
                                                                    setDuAnSearch('');
                                                                    setHopDongSearch('');
                                                                    setCustomerPickerOpen(false);
                                                                }}
                                                            >
                                                                {c.ten_don_vi}
                                                            </button>
                                                        </li>
                                                    ))
                                                )}
                                            </ul>
                                        )}
                                    </div>
                                )}
                                {needSelectCustomerFirst ? (
                                    <p className="text-[11px] text-slate-500 ml-1">
                                        Chọn khách hàng trước, sau đó chọn dự án và hợp đồng.
                                    </p>
                                ) : null}
                            </div>

                            <div className="space-y-1.5 md:col-span-1">
                                <div className="flex items-center justify-between gap-2 ml-1">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        Dự án liên quan
                                    </label>
                                    <button
                                        type="button"
                                        onClick={openQuickAddProject}
                                        disabled={isQuickAdding || needSelectCustomerFirst}
                                        className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
                                    >
                                        + Thêm dự án
                                    </button>
                                </div>
                                <div className="relative z-[15]">
                                    <Search
                                        size={16}
                                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                    />
                                    <input
                                        type="text"
                                        role="combobox"
                                        aria-expanded={duAnPickerOpen}
                                        aria-autocomplete="list"
                                        autoComplete="off"
                                        disabled={scopedNoProjects || needSelectCustomerFirst}
                                        value={duAnSearch}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            setDuAnSearch(v);
                                            setDuAnPickerOpen(true);
                                            const selId = String(formData.duAnId || '').trim();
                                            if (selId) {
                                                const cur = projectsForSelect.find((x) => String(x.id) === selId);
                                                if (cur && v !== cur.ten_du_an) {
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        duAnId: '',
                                                        hopDongId: '',
                                                        tenGoiThau: '',
                                                    }));
                                                    setHopDongSearch('');
                                                }
                                            }
                                        }}
                                        onFocus={() =>
                                            !scopedNoProjects &&
                                            !needSelectCustomerFirst &&
                                            setDuAnPickerOpen(true)
                                        }
                                        onBlur={() => {
                                            window.setTimeout(() => setDuAnPickerOpen(false), 200);
                                        }}
                                        placeholder={
                                            scopedNoProjects
                                                ? '— Khách chưa có dự án —'
                                                : needSelectCustomerFirst
                                                  ? '— Chọn khách hàng trước —'
                                                  : 'Gõ tìm hoặc chọn dự án…'
                                        }
                                        className="w-full pl-10 pr-20 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm text-slate-800 transition-all hover:border-slate-300 shadow-sm disabled:bg-slate-50 disabled:text-slate-500"
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                        {duAnSearch && !scopedNoProjects && !needSelectCustomerFirst ? (
                                            <button
                                                type="button"
                                                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                                aria-label="Xóa dự án"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => {
                                                    setDuAnSearch('');
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        duAnId: '',
                                                        hopDongId: '',
                                                        tenGoiThau: '',
                                                    }));
                                                    setHopDongSearch('');
                                                    setDuAnPickerOpen(false);
                                                }}
                                            >
                                                <X size={16} />
                                            </button>
                                        ) : null}
                                        <ChevronDown size={16} className="text-slate-400 pointer-events-none" />
                                    </div>
                                    {duAnPickerOpen && !scopedNoProjects && !needSelectCustomerFirst && (
                                        <ul
                                            role="listbox"
                                            className="absolute left-0 right-0 top-full mt-1 max-h-52 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg z-50"
                                        >
                                            <li>
                                                <button
                                                    type="button"
                                                    role="option"
                                                    className={cn(
                                                        'w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50',
                                                        !formData.duAnId
                                                            ? 'bg-indigo-50 text-indigo-800 font-medium'
                                                            : 'text-slate-700',
                                                    )}
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => {
                                                        setFormData((prev) => ({
                                                            ...prev,
                                                            duAnId: '',
                                                            hopDongId: '',
                                                            tenGoiThau: '',
                                                        }));
                                                        setDuAnSearch('');
                                                        setHopDongSearch('');
                                                        setDuAnPickerOpen(false);
                                                    }}
                                                >
                                                    — Chọn dự án —
                                                </button>
                                            </li>
                                            {filteredProjectsForPicker.length === 0 ? (
                                                <li className="px-3 py-2.5 text-sm text-slate-500">
                                                    Không có dự án phù hợp
                                                </li>
                                            ) : (
                                                filteredProjectsForPicker.map((p) => (
                                                    <li key={p.id}>
                                                        <button
                                                            type="button"
                                                            role="option"
                                                            className={cn(
                                                                'w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50 truncate',
                                                                String(formData.duAnId) === String(p.id)
                                                                    ? 'bg-indigo-50 text-indigo-800 font-medium'
                                                                    : 'text-slate-800',
                                                            )}
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={() => {
                                                                setFormData((prev) => ({
                                                                    ...prev,
                                                                    duAnId: p.id,
                                                                    hopDongId: '',
                                                                    tenGoiThau: '',
                                                                }));
                                                                setDuAnSearch(p.ten_du_an);
                                                                setHopDongSearch('');
                                                                setDuAnPickerOpen(false);
                                                            }}
                                                        >
                                                            {p.ten_du_an}
                                                        </button>
                                                    </li>
                                                ))
                                            )}
                                        </ul>
                                    )}
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
                                <div className="flex items-center justify-between gap-2 ml-1">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        Hợp đồng liên quan
                                    </label>
                                    <button
                                        type="button"
                                        onClick={openQuickAddContract}
                                        disabled={
                                            isQuickAdding ||
                                            needSelectCustomerFirst ||
                                            !String(formData.duAnId || '').trim()
                                        }
                                        className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50 disabled:opacity-60"
                                    >
                                        + Thêm HĐ / gói thầu
                                    </button>
                                </div>
                                <div className="relative z-10">
                                    <Search
                                        size={16}
                                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                    />
                                    <input
                                        type="text"
                                        role="combobox"
                                        aria-expanded={hopDongPickerOpen}
                                        aria-autocomplete="list"
                                        autoComplete="off"
                                        disabled={
                                            scopedNoProjects ||
                                            needSelectCustomerFirst ||
                                            !String(formData.duAnId || '').trim()
                                        }
                                        value={hopDongSearch}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            setHopDongSearch(v);
                                            setHopDongPickerOpen(true);
                                            const selVal = String(formData.hopDongId || '').trim();
                                            if (selVal) {
                                                const cur = contractsForSelect.find(
                                                    (x) => contractSelValue(x) === selVal,
                                                );
                                                const curLabel = cur
                                                    ? String(
                                                          cur.so_hop_dong ||
                                                              cur.ten_goi_thau ||
                                                              contractSelValue(cur) ||
                                                              '',
                                                      ).trim()
                                                    : '';
                                                if (cur && v !== curLabel) {
                                                    setFormData((prev) => ({ ...prev, hopDongId: '' }));
                                                }
                                            }
                                        }}
                                        onFocus={() =>
                                            !scopedNoProjects &&
                                            !needSelectCustomerFirst &&
                                            !!String(formData.duAnId || '').trim() &&
                                            setHopDongPickerOpen(true)
                                        }
                                        onBlur={() => {
                                            window.setTimeout(() => setHopDongPickerOpen(false), 200);
                                        }}
                                        placeholder={
                                            !String(formData.duAnId || '').trim()
                                                ? '— Chọn dự án trước —'
                                                : contractsForSelect.length === 0
                                                  ? '— Không có HĐ cho dự án này —'
                                                  : 'Gõ số HĐ / gói thầu hoặc chọn…'
                                        }
                                        className="w-full pl-10 pr-20 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm text-slate-800 transition-all hover:border-slate-300 shadow-sm disabled:bg-slate-50 disabled:text-slate-500"
                                    />
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                        {hopDongSearch &&
                                        !scopedNoProjects &&
                                        !needSelectCustomerFirst &&
                                        !!String(formData.duAnId || '').trim() ? (
                                            <button
                                                type="button"
                                                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                                aria-label="Xóa hợp đồng"
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => {
                                                    setHopDongSearch('');
                                                    setFormData((prev) => ({ ...prev, hopDongId: '' }));
                                                    setHopDongPickerOpen(false);
                                                }}
                                            >
                                                <X size={16} />
                                            </button>
                                        ) : null}
                                        <ChevronDown size={16} className="text-slate-400 pointer-events-none" />
                                    </div>
                                    {hopDongPickerOpen &&
                                        !scopedNoProjects &&
                                        !needSelectCustomerFirst &&
                                        !!String(formData.duAnId || '').trim() && (
                                            <ul
                                                role="listbox"
                                                className="absolute left-0 right-0 top-full mt-1 max-h-52 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg z-50"
                                            >
                                                <li>
                                                    <button
                                                        type="button"
                                                        role="option"
                                                        className={cn(
                                                            'w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50',
                                                            !formData.hopDongId
                                                                ? 'bg-indigo-50 text-indigo-800 font-medium'
                                                                : 'text-slate-700',
                                                        )}
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => {
                                                            setFormData((prev) => ({ ...prev, hopDongId: '' }));
                                                            setHopDongSearch('');
                                                            setHopDongPickerOpen(false);
                                                        }}
                                                    >
                                                        — Không gắn hợp đồng —
                                                    </button>
                                                </li>
                                                {filteredContractsForPicker.length === 0 ? (
                                                    <li className="px-3 py-2.5 text-sm text-slate-500">
                                                        {contractsForSelect.length === 0
                                                            ? 'Không có hợp đồng cho dự án này'
                                                            : 'Không có hợp đồng phù hợp'}
                                                    </li>
                                                ) : (
                                                    filteredContractsForPicker.map((c) => {
                                                        const v = contractSelValue(c);
                                                        if (!v) return null;
                                                        const label = c.so_hop_dong || c.ten_goi_thau || v;
                                                        return (
                                                            <li key={v}>
                                                                <button
                                                                    type="button"
                                                                    role="option"
                                                                    className={cn(
                                                                        'w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50 truncate',
                                                                        String(formData.hopDongId) === String(v)
                                                                            ? 'bg-indigo-50 text-indigo-800 font-medium'
                                                                            : 'text-slate-800',
                                                                    )}
                                                                    onMouseDown={(e) => e.preventDefault()}
                                                                    onClick={() => {
                                                                        setFormData((prev) => ({
                                                                            ...prev,
                                                                            hopDongId: v,
                                                                            tenGoiThau:
                                                                                String(c.ten_goi_thau || '').trim() ||
                                                                                prev.tenGoiThau,
                                                                        }));
                                                                        setHopDongSearch(String(label).trim());
                                                                        setHopDongPickerOpen(false);
                                                                    }}
                                                                >
                                                                    {label}
                                                                </button>
                                                            </li>
                                                        );
                                                    })
                                                )}
                                            </ul>
                                        )}
                                </div>
                            </div>

                            <div className="space-y-1.5 md:col-span-2">
                                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                    Tên gói thầu
                                </label>
                                <input
                                    type="text"
                                    name="tenGoiThau"
                                    value={formData.tenGoiThau}
                                    onChange={handleChange}
                                    placeholder="Ghi rõ gói thầu (một dự án có thể nhiều gói)…"
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm text-slate-800 transition-all hover:border-slate-300 shadow-sm"
                                />
                                <p className="text-[11px] text-slate-500 ml-1">
                                    Chọn hợp đồng sẽ gợi ý tên từ HĐ; bạn có thể sửa hoặc nhập khi không gắn HĐ.
                                </p>
                            </div>

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

                            {isPhieuChi && (
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                        Nhân sự <span className="text-red-500">*</span>
                                    </label>
                                    <NhanSuTenAnhPicker
                                        value={formData.nhanSuId}
                                        onChange={(id) => setFormData((prev) => ({ ...prev, nhanSuId: id }))}
                                        employees={employees}
                                        placeholder="Chọn nhân sự"
                                        enableSearch
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
                {quickAddType && (
                    <div className="fixed inset-0 z-[95] bg-black/45 flex items-center justify-center p-4">
                        <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-800">
                                    {quickAddType === 'customer'
                                        ? 'Thêm khách hàng nhanh'
                                        : quickAddType === 'project'
                                          ? 'Thêm dự án nhanh'
                                          : 'Thêm hợp đồng / gói thầu nhanh'}
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setQuickAddType(null)}
                                    disabled={isQuickAdding}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="px-5 py-4 space-y-3">
                                {quickAddType === 'customer' && (
                                    <>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600">Tên khách hàng *</label>
                                            <input
                                                autoFocus
                                                value={quickAddForm.customerName}
                                                onChange={(e) =>
                                                    setQuickAddForm((prev) => ({
                                                        ...prev,
                                                        customerName: e.target.value,
                                                    }))
                                                }
                                                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                                                placeholder="Ví dụ: Công ty ABC"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600">Mã khách/MST</label>
                                            <input
                                                value={quickAddForm.customerMst}
                                                onChange={(e) =>
                                                    setQuickAddForm((prev) => ({
                                                        ...prev,
                                                        customerMst: e.target.value,
                                                    }))
                                                }
                                                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                                                placeholder="Tùy chọn"
                                            />
                                        </div>
                                    </>
                                )}
                                {quickAddType === 'project' && (
                                    <div>
                                        <label className="text-xs font-semibold text-slate-600">Tên dự án *</label>
                                        <input
                                            autoFocus
                                            value={quickAddForm.projectName}
                                            onChange={(e) =>
                                                setQuickAddForm((prev) => ({
                                                    ...prev,
                                                    projectName: e.target.value,
                                                }))
                                            }
                                            className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                                            placeholder="Nhập tên dự án mới"
                                        />
                                    </div>
                                )}
                                {quickAddType === 'contract' && (
                                    <>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600">Số hợp đồng *</label>
                                            <input
                                                autoFocus
                                                value={quickAddForm.contractNo}
                                                onChange={(e) =>
                                                    setQuickAddForm((prev) => ({
                                                        ...prev,
                                                        contractNo: e.target.value,
                                                    }))
                                                }
                                                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                                                placeholder="Ví dụ: 12/2026/HĐ"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-semibold text-slate-600">Tên gói thầu *</label>
                                            <input
                                                value={quickAddForm.packageName}
                                                onChange={(e) =>
                                                    setQuickAddForm((prev) => ({
                                                        ...prev,
                                                        packageName: e.target.value,
                                                    }))
                                                }
                                                className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                                                placeholder="Nhập tên gói thầu"
                                            />
                                        </div>
                                    </>
                                )}
                                {quickAddError ? (
                                    <p className="text-xs text-red-600 font-medium">{quickAddError}</p>
                                ) : null}
                            </div>
                            <div className="px-5 py-4 border-t border-slate-100 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setQuickAddType(null)}
                                    disabled={isQuickAdding}
                                    className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSubmitQuickAdd}
                                    disabled={isQuickAdding}
                                    className="px-4 py-2 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                                >
                                    {isQuickAdding ? 'Đang tạo...' : 'Tạo nhanh'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
