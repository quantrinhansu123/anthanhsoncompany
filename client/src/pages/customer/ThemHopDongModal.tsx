import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    X,
    User,
    FileText,
    Link as LinkIcon,
    ExternalLink,
    Trash2,
    Plus,
    Info,
    ChevronDown,
    Search,
    Upload,
} from 'lucide-react';
import { contractService, ContractFile, type ContractRow } from '../../lib/services/contractService';
import type { NguongChiNhanSuLoai } from '../../lib/nguongChiNhanSu';
import { normalizeNguongLoai, tienQuyDoiNguongChiNhanSu } from '../../lib/nguongChiNhanSu';
import { projectService } from '../../lib/services/projectService';
import { customerService } from '../../lib/services/customerService';
import { employeeService } from '../../lib/services/employeeService';
import { thuChiService } from '../../lib/services/thuChiService';
import { PreviewLinkModal } from '../../components/PreviewLinkModal';
import type { ContractCreatePrefill } from '../../contexts/HopDongModalContext';
import { cn } from '../../lib/utils';
import { emitHopDongProfileAccess } from '../../lib/hopDongProfileAccess';

function normCustomerKey(s: string | null | undefined): string {
    return String(s || '')
        .trim()
        .replace(/\s+/g, ' ')
        .toLowerCase()
        .normalize('NFC');
}

type ProjectRow = {
    id: string;
    ten_du_an: string;
    customer_id?: string | null;
    ten_khach_hang?: string | null;
    customer_name?: string | null;
};

function filterProjectsByCustomer(rows: ProjectRow[], customerId: string, tenDonVi?: string): ProjectRow[] {
    const cid = String(customerId).trim();
    const nameKey = normCustomerKey(tenDonVi);
    return rows.filter((p) => {
        if (String(p.customer_id ?? '').trim() === cid) return true;
        const label = normCustomerKey(p.ten_khach_hang || p.customer_name || '');
        return nameKey.length > 0 && label.length > 0 && label === nameKey;
    });
}

function sanitizeStorageFileName(name: string): string {
    const trimmed = String(name || '').trim();
    const normalized = trimmed.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const replaced = normalized
        .replace(/[^a-zA-Z0-9._-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');
    return replaced || 'file';
}

interface Contract {
    id?: number;
    uuid?: string;
    duAnId?: string | null;
    fileStatus: string;
    files?: ContractFile[] | null;
    ngayKyHD: string;
    soHopDong: string;
    tenGoiThau: string;
    loaiDichVu: string;
    giaTriHD: number;
    giaTriQT: number;
    nguongChiNhanSu?: number;
    nguongChiNhanSuLoai?: NguongChiNhanSuLoai;
    daThu: number;
    conPhaiThu: number;
    ngayUpdate: string;
    nhanSuId?: string | null;
    nhanSuIds?: string[];
    nhanSuTen?: string | null;
}

interface ThemHopDongModalProps {
    isOpen: boolean;
    onClose: () => void;
    editData: Contract | null;
    /** Khi mở từ Chi tiết khách hàng — gắn khách + lọc dự án */
    contractCreatePrefill?: ContractCreatePrefill | null;
    onSuccess: () => void;
}

const FILE_TYPES = [
    'File_BBTT',
    'File_HD',
    'File_BBNT',
    'File_PL3A',
    'File_BBTL',
    'File_PLHD'
] as const;

export function ThemHopDongModal({ isOpen, onClose, editData, contractCreatePrefill = null, onSuccess }: ThemHopDongModalProps) {
    const [projects, setProjects] = useState<Array<{ id: string; ten_du_an: string; customer_id?: string | null }>>([]);
    const [customers, setCustomers] = useState<Array<{ id: string; ten_don_vi: string }>>([]);
    const [employees, setEmployees] = useState<Array<{ id: string; full_name: string; anh_nhan_su?: string }>>([]);
    const [loaiDichVuOptions, setLoaiDichVuOptions] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [contractFiles, setContractFiles] = useState<ContractFile[]>([]);
    const [selectedFileType, setSelectedFileType] = useState<string>('File_BBTT');
    const [fileLink, setFileLink] = useState<string>('');
    const [isAddingLink, setIsAddingLink] = useState(false);
    const [isUploadingFile, setIsUploadingFile] = useState(false);
    const [openNhanSuDropdown, setOpenNhanSuDropdown] = useState(false);
    const [nhanSuSearch, setNhanSuSearch] = useState('');
    const [nhanSuDdRect, setNhanSuDdRect] = useState({ top: 0, left: 0, width: 0 });
    const nhanSuTriggerRef = useRef<HTMLButtonElement | null>(null);
    const nhanSuPanelRef = useRef<HTMLDivElement | null>(null);
    const [showAddLoaiDichVuModal, setShowAddLoaiDichVuModal] = useState(false);
    const [newLoaiDichVuValue, setNewLoaiDichVuValue] = useState('');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [projectSearch, setProjectSearch] = useState('');
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
    const [projectPickerOpen, setProjectPickerOpen] = useState(false);
    const [isQuickAddingCustomer, setIsQuickAddingCustomer] = useState(false);
    const [quickCustomerModalOpen, setQuickCustomerModalOpen] = useState(false);
    const [quickCustomerForm, setQuickCustomerForm] = useState({ tenDonVi: '', mst: '' });
    const [quickCustomerError, setQuickCustomerError] = useState('');

    useEffect(() => {
        if (!isOpen) setPreviewUrl(null);
    }, [isOpen]);

    /** Mở form sửa HĐ = truy cập hồ sơ — đồng bộ cột Lịch sử HS (kể cả khi bấm Hủy không lưu). */
    useEffect(() => {
        if (!isOpen || !editData?.uuid) return;
        let cancelled = false;
        const uuid = editData.uuid;
        (async () => {
            try {
                const iso = new Date().toISOString().slice(0, 10);
                await contractService.update(uuid, { ngay_update: iso });
                if (cancelled) return;
                const ngayUpdateVi = new Date(`${iso}T12:00:00`).toLocaleDateString('vi-VN');
                emitHopDongProfileAccess(uuid, ngayUpdateVi);
            } catch (e) {
                console.warn('[ThemHopDongModal] Ghi nhận truy cập hồ sơ:', e);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [isOpen, editData?.uuid]);

    useEffect(() => {
        if (!isOpen) {
            setOpenNhanSuDropdown(false);
            setNhanSuSearch('');
            setCustomerPickerOpen(false);
            setProjectPickerOpen(false);
        }
    }, [isOpen]);

    const updateNhanSuDropdownRect = useCallback(() => {
        const el = nhanSuTriggerRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        setNhanSuDdRect({ top: r.bottom + 6, left: r.left, width: Math.max(r.width, 280) });
    }, []);

    useEffect(() => {
        if (!openNhanSuDropdown) return;
        updateNhanSuDropdownRect();
        const onResize = () => updateNhanSuDropdownRect();
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [openNhanSuDropdown, updateNhanSuDropdownRect]);

    useEffect(() => {
        if (!openNhanSuDropdown) return;
        const onDown = (e: MouseEvent) => {
            const t = e.target as Node;
            if (nhanSuTriggerRef.current?.contains(t)) return;
            if (nhanSuPanelRef.current?.contains(t)) return;
            setOpenNhanSuDropdown(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [openNhanSuDropdown]);

    const [formData, setFormData] = useState({
        soHopDong: '',
        tenGoiThau: '',
        loaiDichVu: '',
        ngayKyHD: '',
        giaTriHD: '0',
        giaTriQT: '0',
        nguongChiNhanSuLoai: 'tien' as NguongChiNhanSuLoai,
        nguongChiNhanSu: '0',
        customerId: '',
        projectId: '',
        nhanSuIds: [] as string[],
    });

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [projectList, employeeList, contractList, customerList] = await Promise.all([
                    projectService.getAll(),
                    employeeService.getAll(),
                    contractService.getAll(),
                    customerService.getAll(),
                ]);
                setProjects(
                    projectList.map((p) => ({
                        id: p.id,
                        ten_du_an: p.ten_du_an,
                        customer_id: p.customer_id ?? null,
                        ten_khach_hang: p.ten_khach_hang ?? null,
                        customer_name: p.customer_name ?? null,
                    })),
                );
                setCustomers(
                    (customerList || []).map((c: any) => ({
                        id: String(c.id),
                        ten_don_vi: String(c.ten_don_vi || '').trim() || '(Không tên)',
                    })),
                );
                setEmployees(
                    employeeList.map((emp) => ({
                        id: emp.id.toString(),
                        full_name: emp.full_name || emp.name || emp.hoTen || '',
                        anh_nhan_su: emp.anh_nhan_su,
                    })),
                );

                const uniqueLoaiDichVu = Array.from(
                    new Set(
                        (contractList || [])
                            .map((c) => c?.loai_dich_vu)
                            .filter((v): v is string => Boolean(v && v.toString().trim() !== ''))
                    )
                ).sort((a, b) => a.localeCompare(b, 'vi'));
                setLoaiDichVuOptions(uniqueLoaiDichVu);
            } catch (error) {
                console.error('Error loading initial data:', error);
            }
        };
        if (isOpen) {
            loadInitialData();
        }
    }, [isOpen]);

    const reloadCustomersOnly = useCallback(async () => {
        const customerList = await customerService.getAll();
        setCustomers(
            (customerList || []).map((c: any) => ({
                id: String(c.id),
                ten_don_vi: String(c.ten_don_vi || '').trim() || '(Không tên)',
            })),
        );
    }, []);

    const projectsForSelect = useMemo((): ProjectRow[] => {
        if (editData) return projects;
        const pre = contractCreatePrefill;
        if (pre?.customer_id) {
            if (pre.projects_for_customer !== undefined) {
                return pre.projects_for_customer.map((p) => ({
                    id: String(p.id),
                    ten_du_an: p.ten_du_an || '',
                    customer_id: pre.customer_id,
                }));
            }
            return filterProjectsByCustomer(projects, pre.customer_id, pre.ten_don_vi);
        }
        if (!formData.customerId) return [];
        return filterProjectsByCustomer(projects, formData.customerId);
    }, [projects, editData, contractCreatePrefill, formData.customerId]);
    const filteredProjectsForSelect = useMemo(() => {
        const term = projectSearch.trim().toLowerCase();
        if (!term) return projectsForSelect;
        return projectsForSelect.filter((p) => (p.ten_du_an || '').toLowerCase().includes(term));
    }, [projectsForSelect, projectSearch]);
    const filteredCustomers = useMemo(() => {
        const term = customerSearch.trim().toLowerCase();
        const sorted = [...customers].sort((a, b) =>
            a.ten_don_vi.localeCompare(b.ten_don_vi, 'vi', { sensitivity: 'base' }),
        );
        if (!term) return sorted;
        return sorted.filter((c) => c.ten_don_vi.toLowerCase().includes(term));
    }, [customers, customerSearch]);

    const handleQuickAddCustomer = async () => {
        if (isQuickAddingCustomer || isCustomerContractCreate || !!editData) return;
        setQuickCustomerError('');
        setQuickCustomerForm({ tenDonVi: '', mst: '' });
        setQuickCustomerModalOpen(true);
    };

    const submitQuickAddCustomer = async () => {
        const tenDonVi = quickCustomerForm.tenDonVi.trim();
        const mst = quickCustomerForm.mst.trim();
        if (!tenDonVi) {
            setQuickCustomerError('Vui lòng nhập tên khách hàng.');
            return;
        }
        try {
            setIsQuickAddingCustomer(true);
            const created = await customerService.create({
                ten_don_vi: tenDonVi,
                mst: mst || undefined,
            });
            if (!created?.id) throw new Error('Không tạo được khách hàng mới.');
            await reloadCustomersOnly();
            const cid = String(created.id);
            setFormData((prev) => ({
                ...prev,
                customerId: cid,
                projectId: '',
            }));
            setCustomerSearch(String(created.ten_don_vi || tenDonVi));
            setProjectSearch('');
            setCustomerPickerOpen(false);
            setQuickCustomerModalOpen(false);
        } catch (e: any) {
            setQuickCustomerError(e?.message || 'Không thể thêm khách hàng mới.');
        } finally {
            setIsQuickAddingCustomer(false);
        }
    };

    /** Đồng bộ dropdown dự án khách: gỡ lựa chọn sai, tự chọn nếu chỉ còn 1 dự án. */
    useEffect(() => {
        if (!isOpen || editData || !contractCreatePrefill?.customer_id) return;
        setFormData((prev) => {
            const list = projectsForSelect;
            if (list.length === 0) {
                return prev.projectId ? { ...prev, projectId: '' } : prev;
            }
            const inList = list.some((p) => p.id === prev.projectId);
            const nextId = inList ? prev.projectId : list.length === 1 ? list[0].id : '';
            if (nextId === prev.projectId) return prev;
            return { ...prev, projectId: nextId };
        });
    }, [isOpen, editData, contractCreatePrefill?.customer_id, projectsForSelect]);

    const isCustomerContractCreate =
        !editData && Boolean(contractCreatePrefill?.customer_id);
    /** Không báo “chưa có dự án” khi đang chờ API dự án (trừ khi chi tiết KH đã gửi danh sách rõ ràng). */
    const prefillHasExplicitProjectList =
        contractCreatePrefill?.projects_for_customer !== undefined;
    const noProjectsForCustomer =
        isCustomerContractCreate &&
        projectsForSelect.length === 0 &&
        (prefillHasExplicitProjectList || projects.length > 0);

    useEffect(() => {
        if (editData) {
            setFormData({
                soHopDong: editData.soHopDong || '',
                tenGoiThau: editData.tenGoiThau || '',
                loaiDichVu: editData.loaiDichVu || '',
                ngayKyHD: editData.ngayKyHD ? (editData.ngayKyHD.includes('/') ? editData.ngayKyHD.split('/').reverse().join('-') : editData.ngayKyHD) : '',
                giaTriHD: editData.giaTriHD !== undefined && editData.giaTriHD !== null ? editData.giaTriHD.toString() : '0',
                giaTriQT: editData.giaTriQT !== undefined && editData.giaTriQT !== null ? editData.giaTriQT.toString() : '0',
                ...(() => {
                    const loai = normalizeNguongLoai(editData.nguongChiNhanSuLoai as string);
                    const raw = editData.nguongChiNhanSu;
                    const s =
                        raw === undefined || raw === null
                            ? '0'
                            : loai === 'phan_tram'
                              ? String(raw).replace('.', ',')
                              : raw.toString();
                    return { nguongChiNhanSuLoai: loai, nguongChiNhanSu: s };
                })(),
                projectId: editData.duAnId || '',
                customerId: '',
                nhanSuIds: (editData.nhanSuIds || (editData.nhanSuId ? [editData.nhanSuId] : [])).map(String),
            });
            setContractFiles(editData.files || []);
        } else {
            setFormData({
                soHopDong: '',
                tenGoiThau: '',
                loaiDichVu: '',
                ngayKyHD: new Date().toISOString().split('T')[0],
                giaTriHD: '0',
                giaTriQT: '0',
                nguongChiNhanSuLoai: 'tien',
                nguongChiNhanSu: '0',
                customerId: contractCreatePrefill?.customer_id ? String(contractCreatePrefill.customer_id) : '',
                projectId: '',
                nhanSuIds: [],
            });
            setContractFiles([]);
            setProjectSearch('');
            setCustomerSearch(
                contractCreatePrefill?.ten_don_vi?.trim()
                    ? String(contractCreatePrefill.ten_don_vi).trim()
                    : '',
            );
        }
    }, [editData, isOpen, contractCreatePrefill?.customer_id, contractCreatePrefill?.ten_don_vi]);

    /** Sửa HĐ: gắn khách từ dự án + nhãn ô (chạy sau effect reset form). */
    useEffect(() => {
        if (!isOpen || !editData || !projects.length) return;
        const du = String(editData.duAnId || '').trim();
        if (!du) return;
        const p = projects.find((pr) => String(pr.id) === du);
        const cid =
            p?.customer_id != null && String(p.customer_id).trim()
                ? String(p.customer_id).trim()
                : '';
        setFormData((prev) => {
            if (prev.customerId === cid && prev.projectId === du) return prev;
            return { ...prev, customerId: cid, projectId: du };
        });
        setProjectSearch(p?.ten_du_an || '');
        if (cid && customers.length) {
            const name = customers.find((c) => String(c.id) === cid)?.ten_don_vi || '';
            if (name) setCustomerSearch(name);
        }
    }, [isOpen, editData, projects, customers]);

    /** Thêm mới: đồng bộ chữ ô dự án với projectId (auto-chọn / chọn tay). */
    useEffect(() => {
        if (editData) return;
        const id = String(formData.projectId || '').trim();
        if (!id) return;
        const p = projectsForSelect.find((x) => String(x.id) === id);
        if (p?.ten_du_an && projectSearch !== p.ten_du_an) {
            setProjectSearch(p.ten_du_an);
        }
    }, [formData.projectId, projectsForSelect, editData, projectSearch]);

    const filteredNhanSuEmployees = useMemo(() => {
        const q = nhanSuSearch.trim().toLowerCase();
        const sorted = [...employees].sort((a, b) =>
            (a.full_name || '').localeCompare(b.full_name || '', 'vi', { sensitivity: 'base' }),
        );
        if (!q) return sorted;
        return sorted.filter((e) => (e.full_name || '').toLowerCase().includes(q));
    }, [employees, nhanSuSearch]);

    const nhanSuTriggerLabel = useMemo(() => {
        if (formData.nhanSuIds.length === 0) return 'Chọn nhân sự phụ trách...';
        const sel = employees.filter((e) => formData.nhanSuIds.includes(e.id));
        if (sel.length === 0) return `${formData.nhanSuIds.length} nhân sự đã chọn`;
        if (sel.length <= 2) return sel.map((e) => e.full_name).filter(Boolean).join(', ');
        return `${sel.length} nhân sự đã chọn`;
    }, [formData.nhanSuIds, employees]);

    const toggleNhanSu = (id: string) => {
        const sid = String(id);
        setFormData(prev => {
            const arr = prev.nhanSuIds || [];
            const next = arr.includes(sid) ? arr.filter((x) => x !== sid) : [...arr, sid];
            return { ...prev, nhanSuIds: next };
        });
    };

    const formatCurrency = (value: string) => {
        const number = parseInt(value.toString().replace(/\D/g, '')) || 0;
        return number.toLocaleString('vi-VN');
    };

    const handlePriceChange = (field: 'giaTriHD' | 'giaTriQT' | 'nguongChiNhanSu', value: string) => {
        setFormData((prev) => {
            if (field === 'nguongChiNhanSu' && prev.nguongChiNhanSuLoai === 'phan_tram') {
                let v = value.replace(/[^\d,.-]/g, '').replace(',', '.');
                const parts = v.split('.');
                if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
                return { ...prev, nguongChiNhanSu: v };
            }
            const rawValue = value.replace(/\D/g, '');
            return { ...prev, [field]: rawValue };
        });
    };

    const calculateFileStatus = (files: ContractFile[]): string => {
        const uploadedTypes = new Set(files.filter(f => f.file_url && f.file_url.trim() !== '').map(f => f.file_type));
        const missingFiles = FILE_TYPES.filter(type => !uploadedTypes.has(type));
        return missingFiles.length === 0 ? 'Đầy đủ file' : `Thiếu: ${missingFiles.join(', ')}`;
    };

    const addLoaiDichVuOption = () => {
        const v = newLoaiDichVuValue.trim();
        if (!v) return;
        setLoaiDichVuOptions((prev) => {
            const exists = prev.some((o) => o.toLowerCase() === v.toLowerCase());
            if (exists) return prev;
            return [...prev, v].sort((a, b) => a.localeCompare(b, 'vi'));
        });
        setFormData((prev) => ({ ...prev, loaiDichVu: v }));
        setNewLoaiDichVuValue('');
        setShowAddLoaiDichVuModal(false);
    };

    const handleAddLink = async () => {
        if (!fileLink.trim() || isAddingLink) return;
        setIsAddingLink(true);
        try {
            const newFile: ContractFile = {
                file_type: selectedFileType,
                file_name: fileLink.trim(),
                file_url: fileLink.trim(),
                uploaded_at: new Date().toISOString()
            };
            setContractFiles(prev => {
                const filtered = prev.filter(f => f.file_type !== selectedFileType);
                return [...filtered, newFile];
            });
            setFileLink('');
        } catch (error) {
            console.error('Error adding link:', error);
        } finally {
            setIsAddingLink(false);
        }
    };

    const handleDeleteFile = (fileType: string) => {
        setContractFiles(prev => prev.filter(f => f.file_type !== fileType));
    };

    const handleUploadFile = async (file: File | null) => {
        if (!file || isUploadingFile) return;
        setIsUploadingFile(true);
        try {
            const safeName = sanitizeStorageFileName(file.name);
            const filePath = `hop-dong/${Date.now()}_${safeName}`;
            let uploadedUrl = '';
            try {
                uploadedUrl = await thuChiService.uploadFile('hop_dong', filePath, file);
            } catch (primaryErr: any) {
                const msg = String(primaryErr?.message || '');
                if (!msg.includes('Bucket "hop_dong"')) throw primaryErr;
                uploadedUrl = await thuChiService.uploadFile('thu-chi-files', filePath, file);
            }
            const newFile: ContractFile = {
                file_type: selectedFileType,
                file_name: file.name,
                file_url: uploadedUrl,
                uploaded_at: new Date().toISOString(),
            };
            setContractFiles((prev) => {
                const filtered = prev.filter((f) => f.file_type !== selectedFileType);
                return [...filtered, newFile];
            });
        } catch (error) {
            console.error('Error uploading contract file:', error);
            alert('Upload tài liệu thất bại. Vui lòng kiểm tra bucket "hop_dong" (hoặc fallback "thu-chi-files") và thử lại.');
        } finally {
            setIsUploadingFile(false);
        }
    };

    const handleSave = async () => {
        if (noProjectsForCustomer) {
            alert(
                'Khách hàng chưa có dự án trong hệ thống. Hãy thêm dự án ở tab Dự án (chi tiết khách hàng hoặc trang Dự án), sau đó tạo hợp đồng.',
            );
            return;
        }
        if (
            !editData &&
            !isCustomerContractCreate &&
            !String(formData.customerId || '').trim()
        ) {
            alert('Vui lòng chọn khách hàng.');
            return;
        }
        if (!formData.soHopDong || !formData.tenGoiThau || !formData.projectId) {
            alert('Vui lòng điền đầy đủ các thông tin bắt buộc (Số HĐ, Tên gói thầu, Dự án)');
            return;
        }
        setIsSaving(true);
        try {
            const giaTriHD = Number(formData.giaTriHD) || 0;
            const giaTriQT = Number(formData.giaTriQT) || 0;
            const loaiNguong = formData.nguongChiNhanSuLoai;
            const nguongChiNhanSu =
                loaiNguong === 'phan_tram'
                    ? parseFloat(String(formData.nguongChiNhanSu).replace(',', '.')) || 0
                    : Number(formData.nguongChiNhanSu) || 0;
            const fileStatus = calculateFileStatus(contractFiles);

            const payload: Partial<ContractRow> = {
                du_an_id: formData.projectId || null,
                project_name:
                    projectsForSelect.find((p) => p.id === formData.projectId)?.ten_du_an
                    ?? projects.find((p) => p.id === formData.projectId)?.ten_du_an
                    ?? null,
                nhan_su_ids: formData.nhanSuIds,
                nhan_su_id: formData.nhanSuIds?.[0] || null,
                so_hop_dong: formData.soHopDong,
                ten_goi_thau: formData.tenGoiThau,
                loai_dich_vu: formData.loaiDichVu || null,
                ngay_ky_hd: formData.ngayKyHD || null,
                gia_tri_hd: giaTriHD,
                gia_tri_qt: giaTriQT,
                nguong_chi_nhan_su: nguongChiNhanSu,
                nguong_chi_nhan_su_loai: loaiNguong,
                file_status: fileStatus,
                files: contractFiles,
                ngay_update: new Date().toISOString().slice(0, 10),
            };

            if (!editData?.uuid && contractCreatePrefill?.customer_id) {
                payload.customer_id = String(contractCreatePrefill.customer_id);
                const ten = contractCreatePrefill.ten_don_vi?.trim();
                if (ten) payload.ten_day_du_chu_dau_tu = ten;
            }

            if (editData?.uuid) {
                const allThuChi = await thuChiService.getAll();
                const daThu = allThuChi
                    .filter(tc => tc.hop_dong_id === editData.uuid && tc.loai_phieu === 'Phiếu thu')
                    .reduce((sum, tc) => sum + (tc.so_tien || 0), 0);
                
                await contractService.update(editData.uuid, {
                    ...payload,
                    da_thu: daThu,
                    con_phai_thu: giaTriQT - daThu
                });
            } else {
                await contractService.create({
                    ...payload,
                    da_thu: 0,
                    con_phai_thu: giaTriQT
                });
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving contract:', error);
            alert('Lỗi lưu hợp đồng. Vui lòng thử lại.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 flex justify-between items-center border-b border-slate-200 bg-white">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">
                            {editData ? 'Chỉnh sửa hợp đồng' : 'Thêm hợp đồng mới'}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">Vui lòng điền các thông tin chi tiết dưới đây</p>
                        {!editData && contractCreatePrefill?.ten_don_vi?.trim() ? (
                            <p className="text-xs text-purple-700 mt-1.5 font-medium">
                                Đang tạo hợp đồng cho khách:{' '}
                                <span className="font-bold">{contractCreatePrefill.ten_don_vi.trim()}</span>
                            </p>
                        ) : null}
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6 bg-slate-50/30">
                    {/* Basic Info Group */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm border-l-4 border-purple-500 pl-3">
                            <Info size={16} />
                            <span>Thông tin cơ bản</span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                {!isCustomerContractCreate && (
                                    <div className="mb-3">
                                        <div className="mb-1 flex items-center justify-between gap-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                Khách hàng <span className="text-red-500">*</span>
                                            </label>
                                            {!editData ? (
                                                <button
                                                    type="button"
                                                    onClick={handleQuickAddCustomer}
                                                    disabled={isQuickAddingCustomer}
                                                    className="text-[11px] font-semibold px-2 py-1 rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 disabled:opacity-60"
                                                >
                                                    + Thêm khách hàng
                                                </button>
                                            ) : null}
                                        </div>
                                        {editData ? (
                                            <div className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-800">
                                                {customerSearch.trim() || '—'}
                                            </div>
                                        ) : (
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
                                                                    projectId: '',
                                                                }));
                                                                setProjectSearch('');
                                                            }
                                                        }
                                                    }}
                                                    onFocus={() => setCustomerPickerOpen(true)}
                                                    onBlur={() => {
                                                        window.setTimeout(() => setCustomerPickerOpen(false), 200);
                                                    }}
                                                    placeholder="Gõ tìm hoặc chọn khách hàng…"
                                                    className="w-full pl-10 pr-20 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all bg-white"
                                                />
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                    {customerSearch ? (
                                                        <button
                                                            type="button"
                                                            className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                                            aria-label="Xóa khách hàng"
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={() => {
                                                                setCustomerSearch('');
                                                                setFormData((prev) => ({
                                                                    ...prev,
                                                                    customerId: '',
                                                                    projectId: '',
                                                                }));
                                                                setProjectSearch('');
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
                                                        className="absolute left-0 right-0 top-full mt-1 max-h-52 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                                                    >
                                                        <li>
                                                            <button
                                                                type="button"
                                                                role="option"
                                                                className={cn(
                                                                    'w-full text-left px-3 py-2 text-sm hover:bg-slate-50',
                                                                    !formData.customerId
                                                                        ? 'bg-purple-50 text-purple-900 font-medium'
                                                                        : 'text-slate-700',
                                                                )}
                                                                onMouseDown={(e) => e.preventDefault()}
                                                                onClick={() => {
                                                                    setFormData((prev) => ({
                                                                        ...prev,
                                                                        customerId: '',
                                                                        projectId: '',
                                                                    }));
                                                                    setCustomerSearch('');
                                                                    setProjectSearch('');
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
                                                                                ? 'bg-purple-50 text-purple-900 font-medium'
                                                                                : 'text-slate-800',
                                                                        )}
                                                                        onMouseDown={(e) => e.preventDefault()}
                                                                        onClick={() => {
                                                                            setFormData((prev) => ({
                                                                                ...prev,
                                                                                customerId: c.id,
                                                                                projectId: '',
                                                                            }));
                                                                            setCustomerSearch(c.ten_don_vi);
                                                                            setProjectSearch('');
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
                                    </div>
                                )}
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                    Dự án <span className="text-red-500">*</span>
                                </label>
                                {editData ? (
                                    <div className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-800">
                                        {projectSearch.trim() ||
                                            projects.find((pr) => String(pr.id) === String(formData.projectId))
                                                ?.ten_du_an ||
                                            '—'}
                                    </div>
                                ) : noProjectsForCustomer ? (
                                    <select
                                        value=""
                                        disabled
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500"
                                    >
                                        <option value="">— Khách chưa có dự án —</option>
                                    </select>
                                ) : (
                                    <div className="relative z-20">
                                        <Search
                                            size={16}
                                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                                        />
                                        <input
                                            type="text"
                                            role="combobox"
                                            aria-expanded={projectPickerOpen}
                                            aria-autocomplete="list"
                                            autoComplete="off"
                                            value={projectSearch}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setProjectSearch(v);
                                                setProjectPickerOpen(true);
                                                const selId = String(formData.projectId || '').trim();
                                                if (selId) {
                                                    const cur = projectsForSelect.find((x) => String(x.id) === selId);
                                                    if (cur && v !== cur.ten_du_an) {
                                                        setFormData((prev) => ({ ...prev, projectId: '' }));
                                                    }
                                                }
                                            }}
                                            onFocus={() => setProjectPickerOpen(true)}
                                            onBlur={() => {
                                                window.setTimeout(() => setProjectPickerOpen(false), 200);
                                            }}
                                            placeholder={
                                                !isCustomerContractCreate && !formData.customerId
                                                    ? 'Chọn khách hàng trước…'
                                                    : 'Gõ tìm hoặc chọn dự án…'
                                            }
                                            disabled={!isCustomerContractCreate && !formData.customerId}
                                            className="w-full pl-10 pr-20 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all bg-white disabled:bg-slate-50 disabled:text-slate-500"
                                        />
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                            {projectSearch && !(!isCustomerContractCreate && !formData.customerId) ? (
                                                <button
                                                    type="button"
                                                    className="rounded-lg p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                                    aria-label="Xóa dự án"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => {
                                                        setProjectSearch('');
                                                        setFormData((prev) => ({ ...prev, projectId: '' }));
                                                        setProjectPickerOpen(false);
                                                    }}
                                                >
                                                    <X size={16} />
                                                </button>
                                            ) : null}
                                            <ChevronDown size={16} className="text-slate-400 pointer-events-none" />
                                        </div>
                                        {projectPickerOpen &&
                                            (isCustomerContractCreate || formData.customerId) && (
                                                <ul
                                                    role="listbox"
                                                    className="absolute left-0 right-0 top-full mt-1 max-h-52 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                                                >
                                                    <li>
                                                        <button
                                                            type="button"
                                                            role="option"
                                                            className={cn(
                                                                'w-full text-left px-3 py-2 text-sm hover:bg-slate-50',
                                                                !formData.projectId
                                                                    ? 'bg-purple-50 text-purple-900 font-medium'
                                                                    : 'text-slate-700',
                                                            )}
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={() => {
                                                                setFormData((prev) => ({ ...prev, projectId: '' }));
                                                                setProjectSearch('');
                                                                setProjectPickerOpen(false);
                                                            }}
                                                        >
                                                            — Chưa chọn dự án —
                                                        </button>
                                                    </li>
                                                    {filteredProjectsForSelect.length === 0 ? (
                                                        <li className="px-3 py-2 text-sm text-slate-500">
                                                            Không tìm thấy dự án
                                                        </li>
                                                    ) : (
                                                        filteredProjectsForSelect.map((p) => (
                                                            <li key={p.id}>
                                                                <button
                                                                    type="button"
                                                                    role="option"
                                                                    className={cn(
                                                                        'w-full text-left px-3 py-2 text-sm hover:bg-slate-50 truncate',
                                                                        String(formData.projectId) === String(p.id)
                                                                            ? 'bg-purple-50 text-purple-900 font-medium'
                                                                            : 'text-slate-800',
                                                                    )}
                                                                    onMouseDown={(e) => e.preventDefault()}
                                                                    onClick={() => {
                                                                        setFormData((prev) => ({
                                                                            ...prev,
                                                                            projectId: p.id,
                                                                        }));
                                                                        setProjectSearch(p.ten_du_an);
                                                                        setProjectPickerOpen(false);
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
                                )}
                                {noProjectsForCustomer ? (
                                    <p className="text-xs text-amber-800 mt-1.5 font-medium">
                                        Khách hàng này chưa có dự án. Thêm dự án ở tab <strong>Dự án</strong> trong
                                        chi tiết khách hàng, rồi mở lại thêm hợp đồng.
                                    </p>
                                ) : isCustomerContractCreate && projectsForSelect.length > 0 ? (
                                    <p className="text-xs text-slate-500 mt-1">
                                        {projectsForSelect.length} dự án của khách — chọn dự án để gắn hợp đồng.
                                    </p>
                                ) : null}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Số hợp đồng <span className="text-red-500">*</span></label>
                                <input 
                                    type="text" 
                                    value={formData.soHopDong} 
                                    onChange={(e) => setFormData({ ...formData, soHopDong: e.target.value })} 
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium" 
                                    placeholder="Ví dụ: 123/2024/HD-ATS" 
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ngày ký HĐ</label>
                                <input 
                                    type="date" 
                                    value={formData.ngayKyHD} 
                                    onChange={(e) => setFormData({ ...formData, ngayKyHD: e.target.value })} 
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all font-medium" 
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Tên gói thầu <span className="text-red-500">*</span></label>
                                <textarea 
                                    value={formData.tenGoiThau} 
                                    onChange={(e) => setFormData({ ...formData, tenGoiThau: e.target.value })} 
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all min-h-[80px]" 
                                    placeholder="Nhập tên gói thầu đầy đủ..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Loại dịch vụ</label>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={formData.loaiDichVu}
                                        onChange={(e) => setFormData({ ...formData, loaiDichVu: e.target.value })}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all bg-white"
                                    >
                                        <option value="">-- Chọn loại dịch vụ --</option>
                                        {loaiDichVuOptions.map((opt) => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddLoaiDichVuModal(true)}
                                        className="shrink-0 p-2 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100 text-blue-600 transition-colors"
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Personnel Group */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm border-l-4 border-blue-500 pl-3">
                            <User size={16} />
                            <span>Nhân sự phụ trách</span>
                        </div>
                        <div className="relative">
                            <button
                                ref={nhanSuTriggerRef}
                                type="button"
                                onClick={() => {
                                    if (openNhanSuDropdown) {
                                        setOpenNhanSuDropdown(false);
                                        return;
                                    }
                                    updateNhanSuDropdownRect();
                                    setOpenNhanSuDropdown(true);
                                    requestAnimationFrame(() => updateNhanSuDropdownRect());
                                }}
                                className="w-full flex items-center justify-between gap-2 border border-slate-200 rounded-xl px-3 py-2.5 text-sm bg-white shadow-sm hover:border-slate-300 transition-colors text-left"
                            >
                                <span className={`truncate ${formData.nhanSuIds.length === 0 ? 'text-slate-400' : 'text-slate-800 font-medium'}`}>
                                    {nhanSuTriggerLabel}
                                </span>
                                <ChevronDown
                                    size={18}
                                    className={`shrink-0 text-slate-500 transition-transform ${openNhanSuDropdown ? 'rotate-180' : ''}`}
                                    aria-hidden
                                />
                            </button>
                            {openNhanSuDropdown &&
                                createPortal(
                                    <div
                                        ref={nhanSuPanelRef}
                                        role="listbox"
                                        aria-multiselectable="true"
                                        className="fixed z-[100] rounded-xl border border-slate-200 bg-white shadow-xl flex flex-col overflow-hidden max-h-[min(22rem,calc(100vh-6rem))]"
                                        style={{
                                            top: nhanSuDdRect.top,
                                            left: nhanSuDdRect.left,
                                            width: nhanSuDdRect.width,
                                        }}
                                    >
                                        <div className="p-2 border-b border-slate-100 shrink-0">
                                            <input
                                                type="text"
                                                value={nhanSuSearch}
                                                onChange={(e) => setNhanSuSearch(e.target.value)}
                                                placeholder="Tìm theo tên..."
                                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/25"
                                                autoFocus
                                            />
                                        </div>
                                        <div className="overflow-y-auto p-2 min-h-0 flex-1 space-y-0.5">
                                            {filteredNhanSuEmployees.length === 0 ? (
                                                <p className="text-xs text-slate-500 px-2 py-3 text-center">Không có nhân sự khớp.</p>
                                            ) : (
                                                filteredNhanSuEmployees.map((emp) => {
                                                    const isSelected = formData.nhanSuIds.includes(emp.id);
                                                    return (
                                                        <label
                                                            key={emp.id}
                                                            className={`flex items-center gap-3 px-2 py-2 rounded-lg cursor-pointer border transition-colors ${
                                                                isSelected
                                                                    ? 'bg-blue-50 border-blue-200'
                                                                    : 'border-transparent hover:bg-slate-50'
                                                            }`}
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleNhanSu(emp.id)}
                                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0"
                                                            />
                                                            {emp.anh_nhan_su ? (
                                                                <img
                                                                    src={emp.anh_nhan_su}
                                                                    alt=""
                                                                    className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                                                                />
                                                            ) : (
                                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400 shrink-0">
                                                                    <User size={16} />
                                                                </div>
                                                            )}
                                                            <span className="text-xs font-semibold text-slate-800 truncate min-w-0">
                                                                {emp.full_name}
                                                            </span>
                                                        </label>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>,
                                    document.body,
                                )}
                        </div>
                    </div>

                    {/* Finance Group */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm border-l-4 border-emerald-500 pl-3">
                            <FileText size={16} />
                            <span>Thông tin tài chính</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Giá trị HĐ (VNĐ)</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={formatCurrency(formData.giaTriHD)}
                                        onChange={(e) => handlePriceChange('giaTriHD', e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg pl-3 pr-10 py-2 text-sm font-bold text-slate-700 bg-white"
                                        placeholder="0"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">VNĐ</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Giá trị quyết toán</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={formatCurrency(formData.giaTriQT)}
                                        onChange={(e) => handlePriceChange('giaTriQT', e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg pl-3 pr-10 py-2 text-sm font-bold text-emerald-600 bg-white"
                                        placeholder="0"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">VNĐ</span>
                                </div>
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ngưỡng chi nhân sự</label>
                                <div className="flex flex-wrap items-center gap-2">
                                    <select
                                        value={formData.nguongChiNhanSuLoai}
                                        onChange={(e) =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                nguongChiNhanSuLoai: e.target.value as NguongChiNhanSuLoai,
                                                nguongChiNhanSu: '0',
                                            }))
                                        }
                                        className="border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold text-slate-700 bg-white shrink-0"
                                    >
                                        <option value="tien">Theo tiền (VNĐ)</option>
                                        <option value="phan_tram">Theo % trên QT</option>
                                    </select>
                                    {formData.nguongChiNhanSuLoai === 'tien' ? (
                                        <div className="relative flex-1 min-w-[120px]">
                                            <input
                                                type="text"
                                                value={formatCurrency(formData.nguongChiNhanSu)}
                                                onChange={(e) => handlePriceChange('nguongChiNhanSu', e.target.value)}
                                                className="w-full border border-slate-200 rounded-lg pl-3 pr-10 py-2 text-sm font-bold text-violet-700 bg-white"
                                                placeholder="0"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">VNĐ</span>
                                        </div>
                                    ) : (
                                        <div className="relative flex-1 min-w-[120px]">
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={formData.nguongChiNhanSu}
                                                onChange={(e) => handlePriceChange('nguongChiNhanSu', e.target.value)}
                                                className="w-full border border-slate-200 rounded-lg pl-3 pr-12 py-2 text-sm font-bold text-violet-700 bg-white"
                                                placeholder="0"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">% QT</span>
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-500">
                                    {formData.nguongChiNhanSuLoai === 'phan_tram'
                                        ? 'Phần trăm nhân với Giá trị quyết toán; dưới đây là quy đổi ra tiền.'
                                        : 'Nhập số tiền hạn mức chi phí nhân sự theo hợp đồng.'}
                                </p>
                                <div className="rounded-lg border border-violet-100 bg-violet-50/80 px-3 py-2 text-xs font-bold text-violet-900">
                                    <span className="text-violet-600 font-semibold">Tương đương tiền: </span>
                                    {tienQuyDoiNguongChiNhanSu(
                                        formData.nguongChiNhanSuLoai,
                                        Number(formData.giaTriQT) || 0,
                                        formData.nguongChiNhanSuLoai === 'phan_tram'
                                            ? parseFloat(String(formData.nguongChiNhanSu).replace(',', '.')) || 0
                                            : Number(formData.nguongChiNhanSu) || 0,
                                    ).toLocaleString('vi-VN')}{' '}
                                    đ
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Files Group */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm border-l-4 border-orange-500 pl-3">
                            <LinkIcon size={16} />
                            <span>Tài liệu đính kèm</span>
                        </div>
                        
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex gap-3">
                                <select 
                                    value={selectedFileType} 
                                    onChange={(e) => setSelectedFileType(e.target.value)} 
                                    className="flex-1 min-w-[120px] px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                                >
                                    {FILE_TYPES.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                                <input 
                                    type="url" 
                                    value={fileLink} 
                                    onChange={(e) => setFileLink(e.target.value)} 
                                    placeholder="Dán link tài liệu..." 
                                    className="flex-[2] px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20" 
                                />
                                <label className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-2">
                                    <Upload size={15} />
                                    {isUploadingFile ? 'Đang tải...' : 'Tải lên'}
                                    <input
                                        type="file"
                                        className="hidden"
                                        disabled={isUploadingFile}
                                        onChange={(e) => {
                                            const file = e.target.files?.[0] || null;
                                            void handleUploadFile(file);
                                            e.currentTarget.value = '';
                                        }}
                                    />
                                </label>
                                <button 
                                    type="button"
                                    onClick={handleAddLink}
                                    disabled={isAddingLink}
                                    className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold hover:bg-orange-600 transition-colors flex items-center gap-2"
                                >
                                    <Plus size={16} />
                                    <span>Thêm</span>
                                </button>
                            </div>
                            
                            <div className="divide-y divide-slate-100">
                                {contractFiles.length > 0 ? contractFiles.map((file, idx) => (
                                    <div key={idx} className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <FileText size={18} className="text-orange-400 shrink-0" />
                                            <div className="min-w-0">
                                                <div className="text-xs font-bold text-slate-800">{file.file_type}</div>
                                                <div className="text-[10px] text-slate-500 truncate">{file.file_url}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setPreviewUrl(file.file_url)}
                                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                title="Xem tài liệu"
                                            >
                                                <ExternalLink size={14} />
                                            </button>
                                            <button onClick={() => handleDeleteFile(file.file_type)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-8 text-center text-slate-400 italic text-sm">
                                        Chưa có tài liệu đính kèm
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Status Preview */}
                        <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex items-start gap-3">
                            <Info size={16} className="text-amber-600 mt-0.5 shrink-0" />
                            <div>
                                <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Trạng thái file dự kiến:</p>
                                <p className="text-xs text-amber-700 mt-1 font-medium">{calculateFileStatus(contractFiles)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3 bg-white">
                    <button 
                        onClick={onClose} 
                        className="px-6 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        Hủy
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving || noProjectsForCustomer} 
                        className="px-8 py-2 bg-purple-600 rounded-lg text-sm font-extrabold text-white hover:bg-purple-700 disabled:opacity-50 shadow-md shadow-purple-200 transition-all active:scale-95"
                    >
                        {isSaving ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Đang lưu...</span>
                            </div>
                        ) : (editData ? 'Cập nhật hợp đồng' : 'Tạo mới hợp đồng')}
                    </button>
                </div>

                {/* Add Loai Dich Vu Modal */}
                {showAddLoaiDichVuModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[80] p-4">
                        <div className="bg-white w-full max-w-sm rounded-xl shadow-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-800">Thêm loại dịch vụ</h3>
                                <button
                                    type="button"
                                    onClick={() => setShowAddLoaiDichVuModal(false)}
                                    className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                                >
                                    <X size={18} className="text-slate-600" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Giá trị mới</label>
                                    <input
                                        type="text"
                                        value={newLoaiDichVuValue}
                                        onChange={(e) => setNewLoaiDichVuValue(e.target.value)}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                                        placeholder="Ví dụ: Tư vấn, Thi công..."
                                        autoFocus
                                    />
                                </div>
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddLoaiDichVuModal(false)}
                                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50"
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="button"
                                        onClick={addLoaiDichVuOption}
                                        disabled={!newLoaiDichVuValue.trim()}
                                        className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Thêm
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {quickCustomerModalOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[90] p-4">
                        <div className="bg-white w-full max-w-sm rounded-xl shadow-xl overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-800">Thêm khách hàng nhanh</h3>
                                <button
                                    type="button"
                                    onClick={() => setQuickCustomerModalOpen(false)}
                                    className="p-1.5 hover:bg-slate-100 rounded transition-colors"
                                    disabled={isQuickAddingCustomer}
                                >
                                    <X size={18} className="text-slate-600" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Tên khách hàng *</label>
                                    <input
                                        type="text"
                                        value={quickCustomerForm.tenDonVi}
                                        onChange={(e) =>
                                            setQuickCustomerForm((prev) => ({
                                                ...prev,
                                                tenDonVi: e.target.value,
                                            }))
                                        }
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                                        placeholder="Ví dụ: Công ty TNHH ABC"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Mã khách hàng / MST</label>
                                    <input
                                        type="text"
                                        value={quickCustomerForm.mst}
                                        onChange={(e) =>
                                            setQuickCustomerForm((prev) => ({
                                                ...prev,
                                                mst: e.target.value,
                                            }))
                                        }
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                                        placeholder="Không bắt buộc"
                                    />
                                </div>
                                {quickCustomerError ? (
                                    <p className="text-xs text-red-600 font-medium">{quickCustomerError}</p>
                                ) : null}
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setQuickCustomerModalOpen(false)}
                                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50"
                                        disabled={isQuickAddingCustomer}
                                    >
                                        Hủy
                                    </button>
                                    <button
                                        type="button"
                                        onClick={submitQuickAddCustomer}
                                        disabled={isQuickAddingCustomer}
                                        className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isQuickAddingCustomer ? 'Đang tạo...' : 'Tạo nhanh'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
        <PreviewLinkModal
            url={previewUrl}
            onClose={() => setPreviewUrl(null)}
            title="Xem tài liệu"
            zIndexClass="z-[320]"
        />
        </>
    );
}
