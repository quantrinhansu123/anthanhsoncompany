import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    X,
    Minus,
    Plus,
    ChevronDown,
    FileDown,
    CheckCircle2,
    Info,
    AlertCircle,
    Search,
} from 'lucide-react';
import {
    normalizeNguongLoai,
    tienQuyDoiNguongChiNhanSu,
    type NguongChiNhanSuLoai,
} from '../../lib/nguongChiNhanSu';
import { thuChiService, ThuChiRow } from '../../lib/services/thuChiService';
import { projectService } from '../../lib/services/projectService';
import { contractService } from '../../lib/services/contractService';
import { customerService } from '../../lib/services/customerService';
import { employeeService } from '../../lib/services/employeeService';
import type { ContractRow } from '../../lib/services/contractService';
import { type NhanSuOption } from '../../lib/formatNhanSu';
import { NhanSuTenAnhPicker } from '../../components/NhanSuTenAnhPicker';
import { cn } from '../../lib/utils';

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

function filterProjectsByCustomer(rows: ProjectOpt[], customerId: string, tenDonVi?: string): ProjectOpt[] {
    const cid = String(customerId).trim();
    const nameKey = normCustomerKey(tenDonVi);
    return rows.filter((p) => {
        if (String(p.customer_id ?? '').trim() === cid) return true;
        const label = normCustomerKey(p.ten_khach_hang || p.customer_name || '');
        return nameKey.length > 0 && label.length > 0 && label === nameKey;
    });
}

function contractSelValue(c: ContractRow): string {
    return String(c.hop_dong_row_id || c.id || '').trim();
}

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
    const [searchParams] = useSearchParams();
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null);

    const [formData, setFormData] = useState({
        customerId: '',
        duAnId: '',
        hopDongId: '',
        nhanSuId: '',
        // Mặc định: nếu có query ?type=thu thì là Phiếu thu, ngược lại là Phiếu chi
        loaiPhieu: searchParams.get('type') === 'thu' ? 'Phiếu thu' : 'Phiếu chi',
        tinhTrangPhieu: 'Tạm ứng',
        ngayTienVe: new Date().toISOString().split('T')[0],
        soTien: 0,
        noiDung: '',
        hangMucChi: 'chi_du_an' as HangMucChi,
        tenGoiThau: '',
        file: null as File | null,
        imageUrl: '' as string | null // URL ảnh chứng từ (link)
    });
    const [projects, setProjects] = useState<ProjectOpt[]>([]);
    const [customers, setCustomers] = useState<Array<{ id: string; ten_don_vi: string }>>([]);
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
    const [duAnSearch, setDuAnSearch] = useState('');
    const [duAnPickerOpen, setDuAnPickerOpen] = useState(false);
    const [hopDongSearch, setHopDongSearch] = useState('');
    const [hopDongPickerOpen, setHopDongPickerOpen] = useState(false);
    const [contracts, setContracts] = useState<ContractRow[]>([]);
    const [existingNhanSuChiTotal, setExistingNhanSuChiTotal] = useState(0);
    const [employees, setEmployees] = useState<NhanSuOption[]>([]);
    const [loading, setLoading] = useState(false);

    const selectedCustomerTenDonVi = useMemo(
        () => customers.find((c) => String(c.id) === String(formData.customerId))?.ten_don_vi || '',
        [customers, formData.customerId],
    );
    const filteredCustomers = useMemo(() => {
        const term = customerSearch.trim().toLowerCase();
        const sorted = [...customers].sort((a, b) =>
            a.ten_don_vi.localeCompare(b.ten_don_vi, 'vi', { sensitivity: 'base' }),
        );
        if (!term) return sorted;
        return sorted.filter((c) => c.ten_don_vi.toLowerCase().includes(term));
    }, [customers, customerSearch]);

    const needSelectCustomerFirst = !String(formData.customerId || '').trim();

    const projectsForSelect = useMemo(() => {
        const cid = String(formData.customerId || '').trim();
        if (!cid) return [];
        const rows = filterProjectsByCustomer(projects, cid, selectedCustomerTenDonVi);
        if (isEditMode && formData.duAnId) {
            const has = rows.some((p) => String(p.id) === String(formData.duAnId));
            if (!has) {
                const p = projects.find((x) => String(x.id) === String(formData.duAnId));
                if (p) return [...rows, p];
            }
        }
        return rows;
    }, [projects, formData.customerId, selectedCustomerTenDonVi, isEditMode, formData.duAnId]);

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
                const hidNorm = String(formData.hopDongId || '').trim();
                let sum = all
                    .filter(
                        (r) =>
                            String(r.hop_dong_id ?? '').trim() === hidNorm &&
                            r.loai_phieu === 'Phiếu chi' &&
                            r.hang_muc_chi === 'chi_nhan_su',
                    )
                    .reduce((s, r) => s + (Number(r.so_tien) || 0), 0);
                if (isEditMode && id) {
                    const cur = all.find((r) => r.id === id);
                    if (
                        cur &&
                        String(cur.hop_dong_id ?? '').trim() === hidNorm &&
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
    }, [formData.loaiPhieu, formData.hopDongId, isEditMode, id]);

    // Load projects, contracts and employees
    useEffect(() => {
        (async () => {
            const [projectList, contractList, customerList] = await Promise.all([
                projectService.getAll(),
                contractService.getAll(),
                customerService.getAll(),
            ]);
            setProjects(
                (projectList || []).map((p: any) => ({
                    id: p.id,
                    ten_du_an: p.ten_du_an,
                    customer_id: p.customer_id ?? null,
                    ten_khach_hang: p.ten_khach_hang ?? null,
                    customer_name: p.customer_name ?? p.ten_khach_hang ?? null,
                })),
            );
            setContracts(contractList);
            setCustomers(
                (customerList || []).map((c: any) => ({
                    id: String(c.id),
                    ten_don_vi: String(c.ten_don_vi || '').trim() || '(Không tên)',
                })),
            );
            
            const employeeList = await employeeService.getAll();
            setEmployees(
                employeeList.map((emp) => ({
                    id: emp.id.toString(),
                    full_name: emp.full_name || emp.name || emp.hoTen || '',
                    code: emp.code || '',
                    anh_nhan_su: emp.anh_nhan_su || null,
                })),
            );
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
            const [item, employeeList, contractList, projectList, customerList] = await Promise.all([
                thuChiService.getById(itemId),
                employeeService.getAll(),
                contractService.getAll(),
                projectService.getAll(),
                customerService.getAll(),
            ]);
            const mappedCustomers = (customerList || []).map((c: any) => ({
                id: String(c.id),
                ten_don_vi: String(c.ten_don_vi || '').trim() || '(Không tên)',
            }));
            setCustomers(mappedCustomers);
            const emps: NhanSuOption[] = employeeList.map((emp) => ({
                id: emp.id.toString(),
                full_name: emp.full_name || emp.name || emp.hoTen || '',
                code: emp.code || '',
                anh_nhan_su: emp.anh_nhan_su || null,
            }));
            setEmployees(emps);
            setContracts(contractList);
            setProjects(
                (projectList || []).map((p: any) => ({
                    id: p.id,
                    ten_du_an: p.ten_du_an,
                    customer_id: p.customer_id ?? null,
                    ten_khach_hang: p.ten_khach_hang ?? null,
                    customer_name: p.customer_name ?? p.ten_khach_hang ?? null,
                })),
            );
            if (item) {
                let duAnId = item.du_an_id || '';
                let hopDongId = item.hop_dong_id || '';
                const ct = contractList.find(
                    (c) =>
                        String(c.id || '') === String(hopDongId) ||
                        String(c.hop_dong_row_id || '') === String(hopDongId),
                );
                if (ct) {
                    hopDongId = String(ct.hop_dong_row_id || ct.id || hopDongId);
                    if (!duAnId && ct.du_an_id) duAnId = String(ct.du_an_id);
                }
                const projRow = (projectList || []).find((p: any) => String(p.id) === String(duAnId));
                let customerPlId =
                    projRow?.customer_id != null && String(projRow.customer_id).trim()
                        ? String(projRow.customer_id).trim()
                        : '';
                if (!customerPlId && ct?.customer_id) {
                    customerPlId = String(ct.customer_id).trim();
                }
                setFormData({
                    customerId: customerPlId,
                    duAnId,
                    hopDongId,
                    nhanSuId:
                        item.nhan_su_id ? String(item.nhan_su_id) : '',
                    loaiPhieu: item.loai_phieu,
                    tinhTrangPhieu: item.tinh_trang_phieu || 'Tạm ứng',
                    ngayTienVe: item.ngay || new Date().toISOString().split('T')[0],
                    soTien: item.so_tien,
                    noiDung: item.noi_dung || '',
                    hangMucChi: item.hang_muc_chi === 'chi_nhan_su' ? 'chi_nhan_su' : 'chi_du_an',
                    tenGoiThau:
                        String(item.ten_goi_thau ?? '').trim() ||
                        String(ct?.ten_goi_thau ?? '').trim(),
                    file: null,
                    imageUrl: item.anh_url || null,
                });
                const custRow = mappedCustomers.find((c) => c.id === customerPlId);
                setCustomerSearch(custRow?.ten_don_vi || '');
                setDuAnSearch(projRow?.ten_du_an || '');
                if (ct) {
                    const v = contractSelValue(ct);
                    setHopDongSearch(String(ct.so_hop_dong || ct.ten_goi_thau || v || '').trim());
                } else {
                    setHopDongSearch('');
                }
            }
        } catch (err: any) {
            setToast({ message: err.message || 'Không thể tải dữ liệu', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!String(formData.customerId || '').trim()) {
            setToast({ message: 'Vui lòng chọn khách hàng', type: 'error' });
            return;
        }
        if (!formData.duAnId) {
            setToast({ message: 'Vui lòng chọn dự án', type: 'error' });
            return;
        }
        if (formData.loaiPhieu === 'Phiếu chi' && !String(formData.nhanSuId || '').trim()) {
            setToast({ message: 'Vui lòng chọn nhân sự cho phiếu chi', type: 'error' });
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

            const hid = String(formData.hopDongId || '').trim();
            const hopContract = hid
                ? contracts.find(
                      (c) =>
                          String(c.id || '') === hid || String(c.hop_dong_row_id || '') === hid,
                  )
                : null;
            const hopDongPayload = hopContract
                ? String(hopContract.hop_dong_row_id || hopContract.id || '').trim() || null
                : hid || null;

            const payload: Partial<ThuChiRow> = {
                du_an_id: formData.duAnId || null,
                hop_dong_id: hopDongPayload,
                nhan_su_id:
                    formData.loaiPhieu === 'Phiếu thu' ? null : String(formData.nhanSuId || '').trim() || null,
                loai_phieu: formData.loaiPhieu,
                so_tien: formData.soTien,
                ngay: formData.ngayTienVe,
                noi_dung: formData.noiDung || null,
                tinh_trang_phieu: formData.tinhTrangPhieu || null,
                nguoi_nhan: null,
                hang_muc_chi: formData.loaiPhieu === 'Phiếu chi' ? formData.hangMucChi : null,
                ten_goi_thau: String(formData.tenGoiThau || '').trim() || null,
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
        <div className="max-w-4xl mx-auto mt-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in flex flex-col h-[calc(100vh-8rem)]">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            {/* Header */}
            <div className="flex flex-none items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
                <div className="flex items-center gap-4">
                    <button onClick={handleCancel} className="p-1 hover:bg-slate-100 rounded-md transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                    <h2 className="text-lg font-bold text-slate-700 uppercase">
                        {isEditMode
                            ? `Chỉnh sửa phiếu: ${id}`
                            : formData.loaiPhieu === 'Phiếu thu'
                                ? 'Thêm phiếu thu mới'
                                : 'Thêm phiếu chi mới'}
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

                    {/* Loại phiếu — luôn hiển thị rõ (Phiếu chi dùng chữ đậm, không trùng nền) */}
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                        <div className="md:w-1/3 md:text-right">
                            <label className="text-sm font-medium text-slate-500">Loại phiếu</label>
                        </div>
                        <div className="md:w-2/3 relative flex-1">
                            <select
                                value={formData.loaiPhieu}
                                onChange={(e) => {
                                    const newLoaiPhieu = e.target.value;
                                    setFormData({
                                        ...formData,
                                        loaiPhieu: newLoaiPhieu,
                                        nhanSuId: newLoaiPhieu === 'Phiếu thu' ? '' : formData.nhanSuId,
                                        hangMucChi: newLoaiPhieu === 'Phiếu chi' ? formData.hangMucChi : 'chi_du_an',
                                    });
                                }}
                                className={`w-full px-4 py-2.5 bg-white border border-slate-300 rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold ${
                                    formData.loaiPhieu === 'Phiếu thu'
                                        ? 'text-emerald-700'
                                        : 'text-rose-700'
                                }`}
                            >
                                <option value="Phiếu thu">Phiếu thu</option>
                                <option value="Phiếu chi">Phiếu chi</option>
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Khách hàng — combobox (gõ + chọn) */}
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                        <div className="md:w-1/3 md:text-right">
                            <label className="text-sm font-medium text-slate-500">
                                Khách hàng <span className="text-red-500">*</span>
                            </label>
                        </div>
                        <div className="md:w-2/3 flex-1">
                            <div className="relative z-30">
                                <Search
                                    size={16}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
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
                                    className="w-full pl-9 pr-20 py-2.5 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    {customerSearch ? (
                                        <button
                                            type="button"
                                            className="rounded p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                            aria-label="Xóa khách hàng"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => {
                                                setCustomerSearch('');
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    customerId: '',
                                                    duAnId: '',
                                                    hopDongId: '',
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
                                        className="absolute left-0 right-0 top-full mt-1 max-h-52 overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg z-50"
                                    >
                                        <li>
                                            <button
                                                type="button"
                                                role="option"
                                                className={cn(
                                                    'w-full text-left px-3 py-2 text-sm hover:bg-slate-50',
                                                    !formData.customerId
                                                        ? 'bg-blue-50 text-blue-900 font-medium'
                                                        : 'text-slate-700',
                                                )}
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => {
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        customerId: '',
                                                        duAnId: '',
                                                        hopDongId: '',
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
                                            <li className="px-3 py-2 text-sm text-slate-500">
                                                Không tìm thấy khách hàng
                                            </li>
                                        ) : (
                                            filteredCustomers.map((c) => (
                                                <li key={c.id}>
                                                    <button
                                                        type="button"
                                                        role="option"
                                                        className={cn(
                                                            'w-full text-left px-3 py-2 text-sm hover:bg-slate-50 truncate',
                                                            String(formData.customerId) === String(c.id)
                                                                ? 'bg-blue-50 text-blue-900 font-medium'
                                                                : 'text-slate-800',
                                                        )}
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => {
                                                            setFormData((prev) => ({
                                                                ...prev,
                                                                customerId: c.id,
                                                                duAnId: '',
                                                                hopDongId: '',
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
                        </div>
                    </div>

                    {/* Dự án — combobox */}
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                        <div className="md:w-1/3 md:text-right">
                            <label className="text-sm font-medium text-slate-500">
                                Dự án <span className="text-red-500">*</span>
                            </label>
                        </div>
                        <div className="md:w-2/3 flex-1">
                            <div className="relative z-20">
                                <Search
                                    size={16}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                />
                                <input
                                    type="text"
                                    role="combobox"
                                    aria-expanded={duAnPickerOpen}
                                    aria-autocomplete="list"
                                    autoComplete="off"
                                    disabled={needSelectCustomerFirst}
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
                                                }));
                                                setHopDongSearch('');
                                            }
                                        }
                                    }}
                                    onFocus={() => !needSelectCustomerFirst && setDuAnPickerOpen(true)}
                                    onBlur={() => {
                                        window.setTimeout(() => setDuAnPickerOpen(false), 200);
                                    }}
                                    placeholder={
                                        needSelectCustomerFirst
                                            ? 'Chọn khách hàng trước…'
                                            : 'Gõ tìm hoặc chọn dự án…'
                                    }
                                    className="w-full pl-9 pr-20 py-2.5 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 disabled:bg-slate-50 disabled:text-slate-500"
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    {duAnSearch && !needSelectCustomerFirst ? (
                                        <button
                                            type="button"
                                            className="rounded p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                            aria-label="Xóa dự án"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => {
                                                setDuAnSearch('');
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    duAnId: '',
                                                    hopDongId: '',
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
                                {duAnPickerOpen && !needSelectCustomerFirst && (
                                    <ul
                                        role="listbox"
                                        className="absolute left-0 right-0 top-full mt-1 max-h-52 overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg z-50"
                                    >
                                        <li>
                                            <button
                                                type="button"
                                                role="option"
                                                className={cn(
                                                    'w-full text-left px-3 py-2 text-sm hover:bg-slate-50',
                                                    !formData.duAnId
                                                        ? 'bg-blue-50 text-blue-900 font-medium'
                                                        : 'text-slate-700',
                                                )}
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => {
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        duAnId: '',
                                                        hopDongId: '',
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
                                            <li className="px-3 py-2 text-sm text-slate-500">
                                                Không có dự án phù hợp
                                            </li>
                                        ) : (
                                            filteredProjectsForPicker.map((p) => (
                                                <li key={p.id}>
                                                    <button
                                                        type="button"
                                                        role="option"
                                                        className={cn(
                                                            'w-full text-left px-3 py-2 text-sm hover:bg-slate-50 truncate',
                                                            String(formData.duAnId) === String(p.id)
                                                                ? 'bg-blue-50 text-blue-900 font-medium'
                                                                : 'text-slate-800',
                                                        )}
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => {
                                                            setFormData((prev) => ({
                                                                ...prev,
                                                                duAnId: p.id,
                                                                hopDongId: '',
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
                        </div>
                    </div>

                    {/* Hợp đồng — combobox */}
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                        <div className="md:w-1/3 md:text-right">
                            <label className="text-sm font-medium text-slate-500">Hợp đồng</label>
                        </div>
                        <div className="md:w-2/3 flex-1">
                            <div className="relative z-10">
                                <Search
                                    size={16}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                />
                                <input
                                    type="text"
                                    role="combobox"
                                    aria-expanded={hopDongPickerOpen}
                                    aria-autocomplete="list"
                                    autoComplete="off"
                                    disabled={!formData.duAnId}
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
                                                      cur.so_hop_dong || cur.ten_goi_thau || contractSelValue(cur) || '',
                                                  ).trim()
                                                : '';
                                            if (cur && v !== curLabel) {
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    hopDongId: '',
                                                }));
                                            }
                                        }
                                    }}
                                    onFocus={() => formData.duAnId && setHopDongPickerOpen(true)}
                                    onBlur={() => {
                                        window.setTimeout(() => setHopDongPickerOpen(false), 200);
                                    }}
                                    placeholder={
                                        !formData.duAnId
                                            ? 'Chọn dự án trước…'
                                            : 'Gõ số HĐ / gói thầu hoặc chọn…'
                                    }
                                    className="w-full pl-9 pr-20 py-2.5 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 disabled:bg-slate-50 disabled:text-slate-500"
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                    {hopDongSearch && formData.duAnId ? (
                                        <button
                                            type="button"
                                            className="rounded p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
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
                                {hopDongPickerOpen && formData.duAnId && (
                                    <ul
                                        role="listbox"
                                        className="absolute left-0 right-0 top-full mt-1 max-h-52 overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg z-50"
                                    >
                                        <li>
                                            <button
                                                type="button"
                                                role="option"
                                                className={cn(
                                                    'w-full text-left px-3 py-2 text-sm hover:bg-slate-50',
                                                    !formData.hopDongId
                                                        ? 'bg-blue-50 text-blue-900 font-medium'
                                                        : 'text-slate-700',
                                                )}
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => {
                                                    setFormData((prev) => ({ ...prev, hopDongId: '' }));
                                                    setHopDongSearch('');
                                                    setHopDongPickerOpen(false);
                                                }}
                                            >
                                                — Không chọn hợp đồng —
                                            </button>
                                        </li>
                                        {filteredContractsForPicker.length === 0 ? (
                                            <li className="px-3 py-2 text-sm text-slate-500">
                                                Không có hợp đồng phù hợp
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
                                                                'w-full text-left px-3 py-2 text-sm hover:bg-slate-50 truncate',
                                                                String(formData.hopDongId) === String(v)
                                                                    ? 'bg-blue-50 text-blue-900 font-medium'
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
                    </div>

                    {/* Tên gói thầu */}
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                        <div className="md:w-1/3 md:text-right">
                            <label className="text-sm font-medium text-slate-500">Tên gói thầu</label>
                        </div>
                        <div className="md:w-2/3 relative flex-1">
                            <input
                                type="text"
                                value={formData.tenGoiThau}
                                onChange={(e) => setFormData({ ...formData, tenGoiThau: e.target.value })}
                                placeholder="Một dự án có thể nhiều gói thầu…"
                                className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
                            />
                            <p className="text-[11px] text-slate-500 mt-1">
                                Chọn hợp đồng sẽ điền tên từ HĐ; có thể sửa hoặc nhập tay.
                            </p>
                        </div>
                    </div>

                    {/* Loại chi (hạng mục) — Phiếu chi */}
                    {formData.loaiPhieu === 'Phiếu chi' && (
                        <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8">
                            <div className="md:w-1/3 md:text-right md:pt-2">
                                <label className="text-sm font-medium text-slate-500">Loại chi</label>
                            </div>
                            <div className="md:w-2/3 flex-1 space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, hangMucChi: 'chi_du_an' })}
                                        className={`py-2.5 rounded-lg text-xs font-bold border-2 transition-all ${
                                            formData.hangMucChi === 'chi_du_an'
                                                ? 'border-blue-600 bg-blue-50 text-blue-900'
                                                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                                        }`}
                                    >
                                        Chi dự án
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, hangMucChi: 'chi_nhan_su' })}
                                        className={`py-2.5 rounded-lg text-xs font-bold border-2 transition-all ${
                                            formData.hangMucChi === 'chi_nhan_su'
                                                ? 'border-violet-600 bg-violet-50 text-violet-900'
                                                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                                        }`}
                                    >
                                        Chi nhân sự
                                    </button>
                                </div>
                                <p className="text-[11px] text-slate-500">
                                    Chi nhân sự mới so sánh với ngưỡng trên hợp đồng (nếu có).
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Ngưỡng chi nhân sự — gọn trong một khối */}
                    {formData.loaiPhieu === 'Phiếu chi' && formData.hopDongId && selectedContract && (
                        <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8">
                            <div className="md:w-1/3 md:text-right md:pt-2">
                                <label className="text-sm font-medium text-slate-500">Ngưỡng (HĐ)</label>
                            </div>
                            <div className="md:w-2/3 flex-1">
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
                        </div>
                    )}

                    {/* Nhân sự — bắt buộc với Phiếu chi */}
                    {formData.loaiPhieu === 'Phiếu chi' && (
                        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                            <div className="md:w-1/3 md:text-right">
                                <label className="text-sm font-medium text-slate-500">
                                    Nhân sự <span className="text-red-500">*</span>
                                </label>
                            </div>
                            <div className="md:w-2/3 flex-1">
                                <NhanSuTenAnhPicker
                                    value={formData.nhanSuId}
                                    onChange={(id) => setFormData({ ...formData, nhanSuId: id })}
                                    employees={employees}
                                    placeholder="Chọn nhân sự"
                                    enableSearch
                                />
                            </div>
                        </div>
                    )}

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

                    {/* Ngày thu / Ngày chi */}
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
                        <div className="md:w-1/3 md:text-right">
                            <label className="text-sm font-medium text-slate-500">
                                {formData.loaiPhieu === 'Phiếu thu' ? 'Ngày thu' : 'Ngày chi'}
                            </label>
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
