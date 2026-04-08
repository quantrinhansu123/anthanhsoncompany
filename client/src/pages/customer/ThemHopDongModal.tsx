import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { X, User, FileText, Link as LinkIcon, ExternalLink, Trash2, Plus, Info, ChevronDown } from 'lucide-react';
import { contractService, ContractFile, type ContractRow } from '../../lib/services/contractService';
import type { NguongChiNhanSuLoai } from '../../lib/nguongChiNhanSu';
import { normalizeNguongLoai, tienQuyDoiNguongChiNhanSu } from '../../lib/nguongChiNhanSu';
import { projectService } from '../../lib/services/projectService';
import { employeeService } from '../../lib/services/employeeService';
import { thuChiService } from '../../lib/services/thuChiService';
import { PreviewLinkModal } from '../../components/PreviewLinkModal';
import type { ContractCreatePrefill } from '../../contexts/HopDongModalContext';

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
    const [employees, setEmployees] = useState<Array<{ id: string; full_name: string; code: string; anh_nhan_su?: string; position?: string }>>([]);
    const [loaiDichVuOptions, setLoaiDichVuOptions] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [contractFiles, setContractFiles] = useState<ContractFile[]>([]);
    const [selectedFileType, setSelectedFileType] = useState<string>('File_BBTT');
    const [fileLink, setFileLink] = useState<string>('');
    const [isAddingLink, setIsAddingLink] = useState(false);
    const [openNhanSuDropdown, setOpenNhanSuDropdown] = useState(false);
    const nhanSuDropdownRef = useRef<HTMLDivElement | null>(null);
    const [showAddLoaiDichVuModal, setShowAddLoaiDichVuModal] = useState(false);
    const [newLoaiDichVuValue, setNewLoaiDichVuValue] = useState('');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [projectSearch, setProjectSearch] = useState('');

    useEffect(() => {
        if (!isOpen) setPreviewUrl(null);
    }, [isOpen]);

    const [formData, setFormData] = useState({
        soHopDong: '',
        tenGoiThau: '',
        loaiDichVu: '',
        ngayKyHD: '',
        giaTriHD: '0',
        giaTriQT: '0',
        nguongChiNhanSuLoai: 'tien' as NguongChiNhanSuLoai,
        nguongChiNhanSu: '0',
        projectId: '',
        nhanSuIds: [] as string[],
    });

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [projectList, employeeList, contractList] = await Promise.all([
                    projectService.getAll(),
                    employeeService.getAll(),
                    contractService.getAll(),
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
                setEmployees(employeeList.map(emp => ({
                    id: emp.id.toString(),
                    full_name: emp.full_name || emp.name || emp.hoTen || '',
                    code: emp.code || '',
                    anh_nhan_su: emp.anh_nhan_su,
                    position: (emp as any).position || 'Nhân viên'
                })));

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

    const projectsForSelect = useMemo((): ProjectRow[] => {
        if (editData) return projects;
        const pre = contractCreatePrefill;
        if (!pre?.customer_id) return projects;
        if (pre.projects_for_customer !== undefined) {
            return pre.projects_for_customer.map((p) => ({
                id: String(p.id),
                ten_du_an: p.ten_du_an || '',
                customer_id: pre.customer_id,
            }));
        }
        return filterProjectsByCustomer(projects, pre.customer_id, pre.ten_don_vi);
    }, [projects, editData, contractCreatePrefill]);
    const filteredProjectsForSelect = useMemo(() => {
        const term = projectSearch.trim().toLowerCase();
        if (!term) return projectsForSelect;
        return projectsForSelect.filter((p) => (p.ten_du_an || '').toLowerCase().includes(term));
    }, [projectsForSelect, projectSearch]);

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
                projectId: '',
                nhanSuIds: [],
            });
            setContractFiles([]);
        }
    }, [editData, isOpen]);

    const selectedEmployees = useCallback(() => {
        return employees.filter(emp => formData.nhanSuIds.includes(emp.id));
    }, [employees, formData.nhanSuIds]);

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

    const handleSave = async () => {
        if (noProjectsForCustomer) {
            alert(
                'Khách hàng chưa có dự án trong hệ thống. Hãy thêm dự án ở tab Dự án (chi tiết khách hàng hoặc trang Dự án), sau đó tạo hợp đồng.',
            );
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
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Dự án <span className="text-red-500">*</span></label>
                                {!editData && !noProjectsForCustomer && (
                                    <input
                                        type="text"
                                        value={projectSearch}
                                        onChange={(e) => setProjectSearch(e.target.value)}
                                        placeholder="Gõ để tìm dự án..."
                                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all bg-white"
                                    />
                                )}
                                <select
                                    value={formData.projectId}
                                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                                    disabled={!!editData || noProjectsForCustomer}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all bg-white disabled:bg-slate-50 disabled:text-slate-500"
                                >
                                    <option value="">
                                        {noProjectsForCustomer
                                            ? '— Khách chưa có dự án —'
                                            : '-- Chọn dự án --'}
                                    </option>
                                    {filteredProjectsForSelect.map((p) => (
                                        <option key={p.id} value={p.id}>{p.ten_du_an}</option>
                                    ))}
                                </select>
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
                        <div className="bg-white border border-slate-200 rounded-xl p-4 max-h-48 overflow-y-auto shadow-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {employees.map((emp) => {
                                    const isSelected = formData.nhanSuIds.includes(emp.id);
                                    return (
                                        <button
                                            key={emp.id}
                                            type="button"
                                            onClick={() => toggleNhanSu(emp.id)}
                                            className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all text-left ${
                                                isSelected 
                                                ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/10' 
                                                : 'bg-white border-slate-100 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="relative shrink-0">
                                                {emp.anh_nhan_su ? (
                                                    <img src={emp.anh_nhan_su} alt="" className="w-8 h-8 rounded-full object-cover border border-slate-200" />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400">
                                                        <User size={16} />
                                                    </div>
                                                )}
                                                {isSelected && (
                                                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center">
                                                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-xs font-bold text-slate-800 truncate">{emp.full_name}</div>
                                                <div className="text-[10px] text-slate-500 font-medium">Mã: {emp.code || '—'}</div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
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
                                <button 
                                    type="button"
                                    onClick={handleAddLink} 
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
