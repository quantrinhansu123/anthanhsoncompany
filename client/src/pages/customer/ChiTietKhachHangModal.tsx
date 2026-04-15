import React, { useState, useEffect, useCallback } from 'react';
import { X, Maximize2, Plus, Edit, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../../lib/services/projectService';
import { contractService, type ContractRow } from '../../lib/services/contractService';
import { thuChiService, type ThuChiRow } from '../../lib/services/thuChiService';
import { useDuAnModal } from '../../contexts/DuAnModalContext';
import { useHopDongModal } from '../../contexts/HopDongModalContext';
import { useThuChiModal } from '../../contexts/ThuChiModalContext';
import type { NguongChiNhanSuLoai } from '../../lib/nguongChiNhanSu';
import { normalizeNguongLoai, tienQuyDoiNguongChiNhanSu } from '../../lib/nguongChiNhanSu';
import { thuChiPath, duAnPath, hopDongPath } from '../../lib/customerModuleLinks';

/** Chuẩn hóa tên khách để khớp dự án chỉ có ten_khach_hang (không có customer_id). */
function normCustomerKey(s: string | null | undefined): string {
  return String(s || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFC');
}

function normRefId(s: string | null | undefined): string {
  return String(s ?? '').trim();
}

function mapContractRowToHopDong(c: ContractRow, idx: number) {
    const giaTriQT = Number(c.gia_tri_qt || 0);
    const loaiNs = normalizeNguongLoai(c.nguong_chi_nhan_su_loai);
    const rawNguong = Number(c.nguong_chi_nhan_su ?? 0);
    const daThu = Number(c.da_thu ?? 0);
    return {
        id: idx + 1,
        uuid: c.id,
        duAnId: c.du_an_id || null,
        fileStatus: c.file_status || 'Chưa có file',
        files: c.files || [],
        ngayKyHD: c.ngay_ky_hd ? new Date(c.ngay_ky_hd).toLocaleDateString('vi-VN') : '',
        soHopDong: c.so_hop_dong || '',
        tenGoiThau: c.ten_goi_thau || '',
        loaiDichVu: c.loai_dich_vu || '',
        giaTriHD: Number(c.gia_tri_hd || 0),
        giaTriQT,
        nguongChiNhanSu: rawNguong,
        nguongChiNhanSuLoai: loaiNs as NguongChiNhanSuLoai,
        nguongChiNhanSuTien: tienQuyDoiNguongChiNhanSu(loaiNs, giaTriQT, rawNguong),
        daThu,
        conPhaiThu: Number(c.con_phai_thu ?? giaTriQT - daThu),
        ngayUpdate: c.ngay_update ? new Date(c.ngay_update).toLocaleDateString('vi-VN') : '',
        nhanSuId: c.nhan_su_id || null,
        nhanSuIds: (c as any).nhan_su_ids || (c.nhan_su_id ? [c.nhan_su_id] : []),
        nhanSuTen: c.nhan_su_ten || null,
        nhanSuCode: c.nhan_su_code || null,
    };
}

/** Cùng shape với trang Thu chi — dùng cho ChiTietThuChiModal. */
function mapThuChiRowForDetail(tc: ThuChiRow) {
    const rawId = String(tc.id ?? '');
    const codeShort = rawId.length >= 8 ? rawId.substring(0, 8) : rawId;
    const nhanSuDisplay = tc.nhan_su_ten || null;
    return {
        ...tc,
        code: codeShort.toUpperCase(),
        date: tc.ngay ? new Date(tc.ngay).toLocaleDateString('vi-VN') : '',
        dateTime: tc.created_at ? new Date(tc.created_at).toLocaleString('vi-VN') : '',
        type: tc.loai_phieu,
        amount: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(tc.so_tien),
        description: tc.noi_dung || '',
        hang_muc_display:
            tc.loai_phieu === 'Phiếu chi'
                ? tc.hang_muc_chi === 'chi_du_an'
                    ? 'Chi dự án'
                    : tc.hang_muc_chi === 'chi_nhan_su'
                      ? 'Chi nhân sự'
                      : '—'
                : '—',
        ten_du_an: tc.ten_du_an || '(Chưa có dự án)',
        nhan_su_display: nhanSuDisplay,
    };
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    selectedCustomer: any;
}

export function ChiTietKhachHangModal({ isOpen, onClose, selectedCustomer }: Props) {
    const navigate = useNavigate();
    const { openDuAnModal: openProjectModal } = useDuAnModal();
    const { openChiTietHopDong, openThemHopDong } = useHopDongModal();
    const { openChiTietThuChi, openThemThuChi } = useThuChiModal();
    const [activeTab, setActiveTab] = useState('info');
    const [customerProjects, setCustomerProjects] = useState<any[]>([]);
    const [customerContracts, setCustomerContracts] = useState<ContractRow[]>([]);
    const [customerThuChi, setCustomerThuChi] = useState<ThuChiRow[]>([]);

    const loadCustomerData = useCallback(async () => {
        if (!selectedCustomer?.id) return;
        const cid = String(selectedCustomer.id);
        const nameKey = normCustomerKey(selectedCustomer.Ten_Don_Vi);
        try {
            const [allProjects, allContracts, allThuChi] = await Promise.all([
                projectService.getAll(),
                contractService.getAll(),
                thuChiService.getAll(),
            ]);
            const byCustomerProjects = (allProjects || []).filter((p: any) => {
                if (String(p.customer_id ?? '').trim() === cid) return true;
                const label = normCustomerKey(
                    p.ten_khach_hang || p.customer_name || '',
                );
                return nameKey.length > 0 && label.length > 0 && label === nameKey;
            });
            const mapped = byCustomerProjects.map((p: any) => ({
                id: p.id,
                projectName: p.ten_du_an,
                date: p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : '',
                status: p.status,
                progress: p.progress || 0,
                customerId: p.customer_id,
                customerName: p.ten_khach_hang || selectedCustomer.Ten_Don_Vi,
            }));
            setCustomerProjects(mapped);
            const byCustomerContracts = (allContracts || []).filter((c) => {
                if (String(c.customer_id ?? '').trim() === cid) return true;
                const cname = normCustomerKey(c.ten_day_du_chu_dau_tu || '');
                return nameKey.length > 0 && cname.length > 0 && cname === nameKey;
            });
            setCustomerContracts(byCustomerContracts);

            const projectIdSet = new Set<string>();
            byCustomerProjects.forEach((p: { id: string }) => {
                const x = normRefId(p.id);
                if (x) projectIdSet.add(x);
            });
            /** thu_chi.hop_dong_id thường là PK hop_dong (UUID), không phải contract_id — gom mọi khóa từ API. */
            const contractIdSet = new Set<string>();
            byCustomerContracts.forEach((c) => {
                for (const k of [c.id, c.contract_id, c.hop_dong_row_id]) {
                    const x = normRefId(k);
                    if (x) contractIdSet.add(x);
                }
            });
            const byCustomerThuChi = (allThuChi || []).filter((tc) => {
                const du = normRefId(tc.du_an_id);
                const hd = normRefId(tc.hop_dong_id);
                if (du && projectIdSet.has(du)) return true;
                if (hd && contractIdSet.has(hd)) return true;
                return false;
            });
            setCustomerThuChi(byCustomerThuChi);
        } catch (e) {
            console.error('[ChiTietKhachHang] Error loading projects/contracts:', e);
            setCustomerProjects([]);
            setCustomerContracts([]);
            setCustomerThuChi([]);
        }
    }, [selectedCustomer?.id, selectedCustomer?.Ten_Don_Vi]);

    useEffect(() => {
        if (!isOpen || !selectedCustomer?.id) return;
        setActiveTab('info');
        loadCustomerData();
    }, [isOpen, selectedCustomer?.id, loadCustomerData]);

    /** Ghi DB giống trang Dự án — ThemDuAnModal chỉ gọi onSave, không tự gọi API. */
    const handlePersistProject = useCallback(
        async (data: any) => {
            try {
                if (!selectedCustomer?.id) return;
                const customerIdRaw = data.customer_id || data.customerId;
                const finalCustomerId =
                    customerIdRaw && String(customerIdRaw).trim() !== ''
                        ? String(customerIdRaw).trim()
                        : String(selectedCustomer.id);
                const finalTenKhachHang =
                    data.tenKhachHang ||
                    data.customerName ||
                    selectedCustomer.Ten_Don_Vi ||
                    null;
                const managerIds =
                    data.managerIds && Array.isArray(data.managerIds) && data.managerIds.length > 0
                        ? data.managerIds.map((id: string) => String(id).trim()).filter(Boolean)
                        : undefined;
                const executorIds =
                    data.executorIds && Array.isArray(data.executorIds) && data.executorIds.length > 0
                        ? data.executorIds.map((id: string) => String(id).trim()).filter(Boolean)
                        : undefined;

                const payload = {
                    projectName: data.projectName,
                    status: data.status,
                    progress: Number(data.progress) || 0,
                    customerId: finalCustomerId,
                    tenKhachHang: finalTenKhachHang,
                    managerIds,
                    executorIds,
                    managerId: data.manager_id || data.managerId || undefined,
                    executorId: data.executor_id || data.executorId || undefined,
                    managerImg: data.managerImg || null,
                    executorImg: data.executorImg || null,
                };

                if (data.id) {
                    await projectService.update(String(data.id), payload);
                } else {
                    await projectService.create(payload);
                }
                await loadCustomerData();
            } catch (e) {
                console.error('[ChiTietKhachHang] Lưu dự án:', e);
                alert(
                    e instanceof Error
                        ? e.message
                        : 'Không lưu được dự án. Kiểm tra kết nối / quyền Supabase.',
                );
            }
        },
        [loadCustomerData, selectedCustomer?.id, selectedCustomer?.Ten_Don_Vi],
    );

    if (!isOpen || !selectedCustomer) return null;

    const tongThu = customerThuChi
        .filter((tc) => tc.loai_phieu === 'Phiếu thu')
        .reduce((s, tc) => s + (Number(tc.so_tien) || 0), 0);
    const tongChi = customerThuChi
        .filter((tc) => tc.loai_phieu === 'Phiếu chi')
        .reduce((s, tc) => s + (Number(tc.so_tien) || 0), 0);

    const viewThuChiDetail = (tc: ThuChiRow) => {
        const mapped = mapThuChiRowForDetail(tc);
        onClose();
        requestAnimationFrame(() => {
            openChiTietThuChi(mapped);
        });
    };

    const editThuChiFromKhach = (tc: ThuChiRow) => {
        if (!selectedCustomer?.id) return;
        const prefill = {
            customer_id: String(selectedCustomer.id),
            ten_don_vi: selectedCustomer.Ten_Don_Vi,
            projects_for_customer: customerProjects.map((p) => ({
                id: String(p.id),
                ten_du_an: p.projectName || '',
            })),
        };
        onClose();
        requestAnimationFrame(() => {
            openThemThuChi(
                'edit',
                tc,
                tc.loai_phieu === 'Phiếu chi' ? 'Phiếu chi' : 'Phiếu thu',
                prefill,
            );
        });
    };

    const handleEditProjectClick = async (project: any) => {
        try {
            const details = await projectService.getById(String(project.id));
            openProjectModal(details, handlePersistProject);
        } catch (error) {
            console.error('[ChiTietKhachHang] Error loading project details:', error);
            openProjectModal(project, handlePersistProject);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 modal-overlay p-4 backdrop-blur-sm">
            <div className="bg-[#FAF9FB] w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] modal-content overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                {/* Modal Header */}
                <div className="px-6 py-4 flex justify-between items-center bg-white border-b border-slate-200 shrink-0">
                    <h2 className="text-lg font-bold text-slate-800">Chi tiết khách hàng</h2>
                    <button
                        onClick={onClose}
                        className="icon-btn p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs Navigation */}
                <div className="border-b border-slate-200 bg-white shrink-0">
                    <nav className="flex -mb-px px-6 gap-6" aria-label="Tabs">
                        {[
                            { id: 'info', label: 'Thông tin Khách hàng' },
                            { id: 'projects', label: 'Dự án' },
                            { id: 'contracts', label: 'Hợp đồng' },
                            { id: 'finance', label: 'Thu chi' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    whitespace-nowrap py-3 border-b-2 font-medium text-sm transition-all
                                    ${activeTab === tab.id
                                        ? 'border-purple-600 text-purple-600'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                    }
                                `}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                    {activeTab === 'info' && (
                        <div className="bg-white border text-sm text-slate-700 border-slate-200 shadow-sm rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {[
                                { label: 'Tên đơn vị', value: <span className="font-bold italic text-slate-800">{selectedCustomer.Ten_Don_Vi}</span> },
                                { label: 'Loại hình', value: selectedCustomer.Loai_Hinh },
                                { label: 'Mã số thuế', value: selectedCustomer.MST },
                                { label: 'Địa chỉ', value: selectedCustomer.Dia_Chi },
                                { label: 'Người đại diện', value: selectedCustomer.Nguoi_Dai_Dien },
                                { label: 'Chức vụ đại diện', value: selectedCustomer.Chuc_Vu_Dai_Dien },
                                { label: 'Người liên hệ', value: selectedCustomer.Nguoi_Lien_He },
                                { label: 'Chức vụ liên hệ', value: selectedCustomer.Chuc_Vu_Lien_He },
                                { label: 'SĐT liên hệ', value: selectedCustomer.SDT_Lien_He },
                            ].map((row, index) => (
                                <div key={index} className="flex px-5 py-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                    <div className="w-[180px] shrink-0 text-slate-400 font-medium uppercase text-[11px] tracking-wide pt-0.5">{row.label}</div>
                                    <div className="flex-1 text-slate-700">{row.value || "(Trống)"}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'projects' && (
                        <div className="bg-white border text-sm text-slate-700 border-slate-200 shadow-sm rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {customerProjects.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                    {customerProjects.map((project: any) => (
                                        <div key={project.id} className="p-5 hover:bg-slate-50 transition-colors">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <p className="font-bold text-slate-800 text-[15px]">{project.projectName}</p>
                                                        {project.status && (
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                                project.status === 'Hoàn thành' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                                                                project.status === 'Đang thực hiện' || project.status === 'ĐANG THỰC HIỆN' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                                project.status === 'Đang quá hạn' ? 'bg-rose-50 text-rose-600 border border-rose-200' :
                                                                'bg-slate-50 text-slate-600 border border-slate-200'
                                                            }`}>
                                                                {project.status}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500 mt-2">
                                                        <div className="flex items-center gap-1.5"><span className="text-slate-400">Ngày tạo:</span><span className="font-medium">{project.date}</span></div>
                                                        <div className="flex items-center gap-3 min-w-[150px]">
                                                            <span className="text-slate-400">Tiến độ:</span>
                                                            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                <div className={`h-full rounded-full bg-blue-500`} style={{ width: `${project.progress}%` }} />
                                                            </div>
                                                            <span className="font-semibold text-slate-700 w-8 text-right px-1">{project.progress}%</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleEditProjectClick(project)}
                                                    className="p-1.5 text-orange-500 hover:text-orange-700 hover:bg-orange-50 rounded-md border border-orange-100 transition-colors"
                                                    title="Sửa dự án"
                                                >
                                                    <Edit size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center"><p className="text-slate-400 italic">Chưa có dự án nào</p></div>
                            )}
                            <div className="bg-slate-50/50 px-5 py-3 flex justify-end gap-3 border-t border-slate-100">
                                <button
                                    onClick={() => {
                                        if (selectedCustomer?.id) {
                                            navigate(duAnPath({ customerId: String(selectedCustomer.id) }));
                                        } else {
                                            navigate('/khach-hang/du-an');
                                        }
                                        onClose();
                                    }}
                                    className="action-btn-p-2 p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-100"
                                    title="Mở rộng"
                                >
                                    <Maximize2 size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        openProjectModal(
                                            {
                                                customerName: selectedCustomer.Ten_Don_Vi,
                                                customer_id: selectedCustomer.id,
                                            },
                                            handlePersistProject,
                                        );
                                    }}
                                    className="action-btn p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-100"
                                    title="Thêm dự án"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'contracts' && (
                        <div className="bg-white border text-sm text-slate-700 border-slate-200 shadow-sm rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {customerContracts.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                    {customerContracts.map((c, idx) => (
                                        <div key={String(c.id)} className="p-5 hover:bg-slate-50 transition-colors">
                                            {(() => {
                                                const giaTriQT = Number(c.gia_tri_qt || 0);
                                                const daThu = Number(c.da_thu || 0);
                                                const conNo = Number(c.con_phai_thu ?? giaTriQT - daThu);
                                                const ngayCapNhat = c.ngay_update
                                                    ? new Date(c.ngay_update).toLocaleDateString('vi-VN')
                                                    : '—';
                                                return (
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                        <p className="font-bold text-slate-800 text-[15px]">
                                                            {c.ten_goi_thau?.trim() || '—'}
                                                        </p>
                                                        {c.trang_thai && (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-50 text-slate-600 border border-slate-200">
                                                                {c.trang_thai}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500 mt-2">
                                                        <div>
                                                            <span className="text-slate-400">Số HĐ:</span>{' '}
                                                            <span className="font-medium text-slate-700">{c.so_hop_dong || '—'}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-slate-400">Dự án:</span>{' '}
                                                            <span className="font-medium text-slate-700">{c.project_name || '—'}</span>
                                                        </div>
                                                        <div>
                                                            <span className="text-slate-400">Ngày ký:</span>{' '}
                                                            <span className="font-medium">
                                                                {c.ngay_ky_hd
                                                                    ? new Date(c.ngay_ky_hd).toLocaleDateString('vi-VN')
                                                                    : '—'}
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="text-slate-400">Còn nợ:</span>{' '}
                                                            <span className="font-semibold text-rose-700">
                                                                {conNo.toLocaleString('vi-VN')} đ
                                                            </span>
                                                        </div>
                                                        <div>
                                                            <span className="text-slate-400">Lịch sử HS:</span>{' '}
                                                            <span className="font-medium text-slate-700">
                                                                {ngayCapNhat === '—'
                                                                    ? 'Chưa cập nhật'
                                                                    : `Vào xem / sửa gần nhất: ${ngayCapNhat}`}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            onClose();
                                                            openChiTietHopDong(mapContractRowToHopDong(c, idx) as any);
                                                        }}
                                                        className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md border border-blue-100 transition-colors"
                                                        title="Xem chi tiết"
                                                    >
                                                        <Eye size={14} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            onClose();
                                                            openThemHopDong(mapContractRowToHopDong(c, idx) as any);
                                                        }}
                                                        className="p-1.5 text-orange-500 hover:text-orange-700 hover:bg-orange-50 rounded-md border border-orange-100 transition-colors"
                                                        title="Sửa hợp đồng"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                                );
                                            })()}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center">
                                    <p className="text-slate-400 italic">Chưa có hợp đồng nào cho khách hàng này</p>
                                </div>
                            )}
                            <div className="bg-slate-50/50 px-5 py-3 flex justify-end gap-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (selectedCustomer?.id) {
                                            navigate(hopDongPath({ customerId: String(selectedCustomer.id) }));
                                        } else {
                                            navigate('/khach-hang/hop-dong');
                                        }
                                        onClose();
                                    }}
                                    className="action-btn p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-100"
                                    title="Mở trang hợp đồng"
                                >
                                    <Maximize2 size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!selectedCustomer?.id) return;
                                        onClose();
                                        openThemHopDong(null, {
                                            customer_id: String(selectedCustomer.id),
                                            ten_don_vi: selectedCustomer.Ten_Don_Vi,
                                            projects_for_customer: customerProjects.map((p) => ({
                                                id: String(p.id),
                                                ten_du_an: p.projectName || '',
                                            })),
                                        });
                                    }}
                                    className="action-btn p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-100"
                                    title="Thêm hợp đồng"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'finance' && (
                        <div className="bg-white border text-sm text-slate-700 border-slate-200 shadow-sm rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 border-b border-slate-100 bg-slate-50/40">
                                <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-4 py-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                                        Tổng phiếu thu
                                    </p>
                                    <p className="text-lg font-bold text-emerald-800 mt-0.5">
                                        {tongThu.toLocaleString('vi-VN')} <span className="text-xs font-semibold">đ</span>
                                    </p>
                                </div>
                                <div className="rounded-lg border border-rose-100 bg-rose-50/60 px-4 py-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-rose-700">
                                        Tổng phiếu chi
                                    </p>
                                    <p className="text-lg font-bold text-rose-800 mt-0.5">
                                        {tongChi.toLocaleString('vi-VN')} <span className="text-xs font-semibold">đ</span>
                                    </p>
                                </div>
                                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                                        Theo danh sách KH (tổng hợp)
                                    </p>
                                    <p className="text-xs text-slate-600 mt-1">
                                        Đã thu (bảng KH):{' '}
                                        <span className="font-bold text-slate-800">
                                            {(selectedCustomer.DaThu ?? 0).toLocaleString('vi-VN')} đ
                                        </span>
                                    </p>
                                </div>
                            </div>

                            <div className="px-4 py-2 border-b border-slate-100 text-xs text-slate-500">
                                {customerThuChi.length} chứng từ gắn dự án / hợp đồng của khách này
                            </div>

                            {customerThuChi.length > 0 ? (
                                <div className="max-h-[min(360px,50vh)] overflow-y-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="sticky top-0 z-[1] border-b border-slate-200 text-slate-700 font-semibold bg-white">
                                            <tr>
                                                <th className="px-4 py-2.5">Ngày</th>
                                                <th className="px-4 py-2.5">Loại</th>
                                                <th className="px-4 py-2.5 text-right">Số tiền</th>
                                                <th className="px-4 py-2.5 hidden sm:table-cell">Dự án / HĐ</th>
                                                <th className="px-4 py-2.5 hidden md:table-cell">Nội dung</th>
                                                <th className="px-4 py-2.5 text-right w-[5.25rem] shrink-0">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {customerThuChi.map((tc) => {
                                                const isThu = tc.loai_phieu === 'Phiếu thu';
                                                const ref =
                                                    [tc.ten_du_an, tc.so_hop_dong].filter(Boolean).join(' · ') ||
                                                    '—';
                                                return (
                                                    <tr
                                                        key={tc.id}
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() => viewThuChiDetail(tc)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                viewThuChiDetail(tc);
                                                            }
                                                        }}
                                                        className="bg-white hover:bg-slate-50/80 transition-colors cursor-pointer"
                                                    >
                                                        <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">
                                                            {tc.ngay
                                                                ? new Date(tc.ngay).toLocaleDateString('vi-VN')
                                                                : '—'}
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <span
                                                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                                    isThu
                                                                        ? 'bg-emerald-100 text-emerald-800'
                                                                        : 'bg-rose-100 text-rose-800'
                                                                }`}
                                                            >
                                                                {isThu ? 'Thu' : 'Chi'}
                                                            </span>
                                                        </td>
                                                        <td
                                                            className={`px-4 py-2.5 text-right font-bold tabular-nums ${
                                                                isThu ? 'text-emerald-700' : 'text-rose-700'
                                                            }`}
                                                        >
                                                            {(Number(tc.so_tien) || 0).toLocaleString('vi-VN')}
                                                        </td>
                                                        <td className="px-4 py-2.5 hidden sm:table-cell text-slate-600 max-w-[200px] truncate" title={ref}>
                                                            {ref}
                                                        </td>
                                                        <td className="px-4 py-2.5 hidden md:table-cell text-slate-500 max-w-[220px] truncate" title={tc.noi_dung || ''}>
                                                            {tc.noi_dung || '—'}
                                                        </td>
                                                        <td className="px-4 py-2.5">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        viewThuChiDetail(tc);
                                                                    }}
                                                                    className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md border border-blue-100 transition-colors"
                                                                    title="Xem chi tiết"
                                                                >
                                                                    <Eye size={14} />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        editThuChiFromKhach(tc);
                                                                    }}
                                                                    className="p-1.5 text-slate-600 hover:text-amber-800 hover:bg-amber-50 rounded-md border border-slate-200 transition-colors"
                                                                    title="Sửa phiếu"
                                                                >
                                                                    <Edit size={14} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-8 text-center">
                                    <p className="text-slate-400 italic">
                                        Chưa có chứng từ thu chi gắn dự án hoặc hợp đồng của khách này
                                    </p>
                                </div>
                            )}

                            <div className="bg-slate-50/50 px-5 py-3 flex justify-end gap-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (selectedCustomer?.id) {
                                            navigate(thuChiPath({ customerId: String(selectedCustomer.id) }));
                                        } else {
                                            navigate('/tai-chinh/thu-chi');
                                        }
                                        onClose();
                                    }}
                                    className="action-btn p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-100"
                                    title="Mở trang thu chi"
                                >
                                    <Maximize2 size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!selectedCustomer?.id) return;
                                        onClose();
                                        const onePid =
                                            customerProjects.length === 1
                                                ? String(customerProjects[0].id)
                                                : '';
                                        openThemThuChi(
                                            'add',
                                            onePid ? { du_an_id: onePid } : undefined,
                                            undefined,
                                            {
                                                customer_id: String(selectedCustomer.id),
                                                ten_don_vi: selectedCustomer.Ten_Don_Vi,
                                                projects_for_customer: customerProjects.map((p) => ({
                                                    id: String(p.id),
                                                    ten_du_an: p.projectName || '',
                                                })),
                                            },
                                        );
                                    }}
                                    className="action-btn p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-100"
                                    title="Thêm phiếu thu/chi"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 border-t border-slate-200 bg-white flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="btn-secondary px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm transition-all"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}
