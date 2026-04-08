import React, { useState, useEffect } from 'react';
import { X, Eye, Edit, Trash2, Maximize2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ContractRow } from '../../lib/services/contractService';
import { thuChiService, ThuChiRow } from '../../lib/services/thuChiService';

interface ChiTietDuAnModalProps {
    isOpen: boolean;
    onClose: () => void;
    project: any | null;
    realContracts?: Map<string, ContractRow[]>;
    projectContractInfo?: Map<string, { total: number; completed: number }>;
    onDeleteContract?: (contractId: string) => void;
    onAddContract?: () => void;
}

export function ChiTietDuAnModal({ 
    isOpen, 
    onClose, 
    project, 
    realContracts = new Map(), 
    projectContractInfo = new Map(),
    onDeleteContract,
    onAddContract
}: ChiTietDuAnModalProps) {
    const [activeTab, setActiveTab] = useState('info');
    const navigate = useNavigate();
    const [thuChiRows, setThuChiRows] = useState<ThuChiRow[]>([]);
    const [loadingThuChi, setLoadingThuChi] = useState(false);

    useEffect(() => {
        if (isOpen && project?.projectName) {
            loadThuChi();
        }
    }, [isOpen, project?.projectName]);

    async function loadThuChi() {
        setLoadingThuChi(true);
        try {
            // Note: thuChiService.getAllForDuAnDashboard might be more appropriate if we want the linked data
            const all = await thuChiService.getAll();
            const filtered = all.filter(r => 
                (r.du_an_id === project.id) || 
                (r.ten_du_an === project.projectName)
            );
            setThuChiRows(filtered.sort((a, b) => String(b.ngay || '').localeCompare(String(a.ngay || ''))));
        } catch (e) {
            console.error('[ChiTietDuAnModal] loadThuChi:', e);
        } finally {
            setLoadingThuChi(false);
        }
    }

    if (!isOpen || !project) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-[#FAF9FB] w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                {/* Modal Header */}
                <div className="px-6 py-5 flex justify-between items-center bg-white border-b border-slate-100">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Chi tiết dự án</h2>
                        <p className="text-sm text-slate-500 mt-1">{project.projectName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs Navigation */}
                <div className="bg-white px-6">
                    <nav className="flex gap-8" aria-label="Tabs">
                        {[
                            { id: 'info', label: 'Thông tin dự án' },
                            { id: 'contracts', label: 'Hợp đồng' },
                            { id: 'finance', label: 'Tài chính' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    whitespace-nowrap py-4 border-b-2 font-bold text-sm transition-all
                                    ${activeTab === tab.id
                                        ? 'border-purple-600 text-purple-600'
                                        : 'border-transparent text-slate-400 hover:text-slate-600'
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
                        <div className="bg-white border text-sm text-slate-700 border-slate-200 shadow-sm rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {[
                                { label: 'Tên dự án', value: project.projectName },
                                { label: 'Khách hàng', value: project.customer_name || '(Chưa có)' },
                                { label: 'Người quản lý', value: project.manager_name || '(Chưa có)' },
                                { label: 'Người thực hiện', value: project.executor_name || '(Chưa có)' },
                                { label: 'Trạng thái', value: project.status },
                                { label: 'Tiến độ', value: `${project.progress}%` },
                                { label: 'Giá trị HĐ', value: project.giaTriHopDong?.toLocaleString('vi-VN') + ' đ' },
                                { label: 'Giá trị quyết toán', value: project.giaTriQuyetToan?.toLocaleString('vi-VN') + ' đ' },
                                { label: 'Đã thu', value: project.daThu?.toLocaleString('vi-VN') + ' đ' },
                                { label: 'Còn phải thu', value: project.conPhaiThu?.toLocaleString('vi-VN') + ' đ' },
                            ].map((row, index) => (
                                <div key={index} className="flex px-6 py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                                    <div className="w-[200px] shrink-0 text-slate-500 font-semibold uppercase text-[11px] tracking-wider">{row.label}</div>
                                    <div className="flex-1 text-slate-800 font-medium">{row.value}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'contracts' && (
                        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="border-b border-slate-100 text-slate-500 font-bold bg-slate-50/50 text-[11px] uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">Trạng thái file</th>
                                            <th className="px-6 py-4 text-center">Ngày ký</th>
                                            <th className="px-6 py-4">Số hợp đồng</th>
                                            <th className="px-6 py-4 text-right">Giá trị HĐ</th>
                                            <th className="px-6 py-4 text-center">Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 text-[13px]">
                                        {project && realContracts.get(project.projectName) && realContracts.get(project.projectName)!.length > 0 ? (
                                            realContracts.get(project.projectName)!.map((contract: ContractRow) => (
                                                <tr key={contract.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-md text-[11px] font-bold ${
                                                            contract.file_status === 'Đã có file' 
                                                                ? 'text-emerald-600 bg-emerald-50' 
                                                                : 'text-rose-600 bg-rose-50'
                                                        }`}>
                                                            {contract.file_status || 'Chưa có file'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600 text-center">
                                                        {contract.ngay_ky_hd ? new Date(contract.ngay_ky_hd).toLocaleDateString('vi-VN') : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 font-semibold text-slate-700">
                                                        {contract.so_hop_dong || '(Chưa nhập)'}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-800 font-bold text-right">
                                                        {contract.gia_tri_hd ? contract.gia_tri_hd.toLocaleString('vi-VN') : '0'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => {
                                                                    onClose();
                                                                    navigate(`/khach-hang/hop-dong?contract=${contract.id}`);
                                                                }}
                                                                className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
                                                                title="Xem chi tiết"
                                                            >
                                                                <Eye size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    onClose();
                                                                    navigate(`/khach-hang/hop-dong?edit=${contract.id}`);
                                                                }}
                                                                className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-all"
                                                                title="Sửa"
                                                            >
                                                                <Edit size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => onDeleteContract && onDeleteContract(contract.id!)}
                                                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                                                                title="Xóa"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td className="px-6 py-12 text-slate-400 italic text-center" colSpan={5}>
                                                    Chưa có hợp đồng nào cho dự án này
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-4 flex justify-end gap-3">
                                <button
                                    onClick={() => {
                                        onClose();
                                        navigate(`/khach-hang/hop-dong?project=${encodeURIComponent(project.projectName)}`);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold text-xs rounded-xl transition-all border border-blue-100"
                                >
                                    <Maximize2 size={14} />
                                    Xem tất cả
                                </button>
                                <button
                                    onClick={() => onAddContract && onAddContract()}
                                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white hover:bg-purple-700 font-bold text-xs rounded-xl transition-all shadow-md shadow-purple-100"
                                >
                                    <Plus size={14} className="stroke-[3px]" />
                                    Thêm hợp đồng
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'finance' && (
                        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="border-b border-slate-100 text-slate-500 font-bold bg-slate-50/50 text-[11px] uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">Loại phiếu</th>
                                            <th className="px-6 py-4">Hạng mục</th>
                                            <th className="px-6 py-4 text-center">Ngày</th>
                                            <th className="px-6 py-4 text-right">Số tiền</th>
                                            <th className="px-6 py-4">Nội dung</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 text-[13px]">
                                        {loadingThuChi ? (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">Đang tải dữ liệu...</td>
                                            </tr>
                                        ) : thuChiRows.length > 0 ? (
                                            thuChiRows.map((row) => (
                                                <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <span className={`font-bold ${row.loai_phieu === 'Phiếu thu' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                            {row.loai_phieu}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600">
                                                        {row.hang_muc_chi === 'chi_nhan_su' ? 'Chi nhân sự' : row.hang_muc_chi === 'chi_du_an' ? 'Chi dự án' : '--'}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500 text-center">
                                                        {row.ngay ? new Date(row.ngay).toLocaleDateString('vi-VN') : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-800 font-bold text-right tabular-nums">
                                                        {row.so_tien?.toLocaleString('vi-VN')} đ
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500 italic max-w-xs truncate">
                                                        {row.noi_dung}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td className="px-6 py-12 text-slate-400 italic text-center" colSpan={5}>
                                                    Chưa có chứng từ thu chi nào cho dự án này
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="bg-slate-50/50 border-t border-slate-100 px-6 py-4 flex justify-end">
                                <button
                                    onClick={() => {
                                        onClose();
                                        navigate(`/tai-chinh/thu-chi?project=${encodeURIComponent(project.projectName)}`);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 font-bold text-xs rounded-xl transition-all border border-emerald-100"
                                >
                                    <Maximize2 size={14} />
                                    Mở trang Thu Chi
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-5 border-t border-slate-100 bg-white flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}

// Custom Plus icon for consistent usage
function Plus({ size, className }: { size: number, className?: string }) {
    return (
        <svg 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={className}
        >
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
    )
}
