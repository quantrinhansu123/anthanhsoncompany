import React, { useState, useEffect } from 'react';
import { 
    X, Maximize2, Plus, Edit
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { projectService } from '../../lib/services/projectService';
import { useDuAnModal } from '../../contexts/DuAnModalContext';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    selectedCustomer: any;
}

export function ChiTietKhachHangModal({ isOpen, onClose, selectedCustomer }: Props) {
    const navigate = useNavigate();
    const { openDuAnModal: openProjectModal } = useDuAnModal();
    const [activeTab, setActiveTab] = useState('info');
    const [customerProjects, setCustomerProjects] = useState<any[]>([]);

    useEffect(() => {
        if (!isOpen || !selectedCustomer?.id) return;
        
        // Reset tab
        setActiveTab('info');
        
        const cid = String(selectedCustomer.id);
        (async () => {
            try {
                const all = await projectService.getAll();
                const byCustomer = (all || []).filter(
                    (p: any) => p.customer_id === cid || String(p.customer_id) === cid
                );
                const mapped = byCustomer.map((p: any) => ({
                    id: p.id,
                    projectName: p.ten_du_an,
                    date: p.created_at ? new Date(p.created_at).toISOString().split('T')[0] : '',
                    status: p.status,
                    progress: p.progress || 0,
                    customerId: p.customer_id,
                    customerName: p.ten_khach_hang || selectedCustomer.Ten_Don_Vi,
                }));
                setCustomerProjects(mapped);
            } catch (e) {
                console.error('[ChiTietKhachHang] Error loading projects:', e);
            }
        })();
    }, [isOpen, selectedCustomer?.id]);

    if (!isOpen || !selectedCustomer) return null;

    const handleEditProjectClick = async (project: any) => {
        try {
            const details = await projectService.getById(String(project.id));
            openProjectModal(details, (data) => {
                console.log('Project updated:', data);
            });
        } catch (error) {
            console.error('[ChiTietKhachHang] Error loading project details:', error);
            openProjectModal(project);
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
                                                                project.status === 'Đang thực hiện' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
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
                                <button onClick={() => { navigate('/khach-hang/du-an'); onClose(); }} className="action-btn-p-2 p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-100" title="Mở rộng"><Maximize2 size={16} /></button>
                                <button onClick={() => { openProjectModal({ customerName: selectedCustomer.Ten_Don_Vi, customer_id: selectedCustomer.id }); }} className="action-btn p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-100" title="Thêm dự án"><Plus size={16} /></button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'contracts' && (
                        <div className="bg-white border text-sm text-slate-700 border-slate-200 shadow-sm rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                             <div className="p-8 text-center text-slate-400 italic">Tính năng hợp đồng đang được phát triển nâng cao</div>
                             <div className="bg-slate-50/50 px-5 py-3 flex justify-end gap-3 border-t border-slate-100">
                                <button onClick={() => { navigate('/khach-hang/hop-dong'); onClose(); }} className="action-btn p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-100" title="Mở rộng"><Maximize2 size={16} /></button>
                                <button onClick={() => {}} className="action-btn p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-100" title="Thêm hợp đồng"><Plus size={16} /></button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'finance' && (
                        <div className="bg-white border text-sm text-slate-700 border-slate-200 shadow-sm rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <table className="w-full text-left">
                                <thead className="border-b border-slate-200 text-slate-800 font-semibold bg-slate-50/30 p-4">
                                    <tr className="px-5">
                                        <th className="px-5 py-3">Loại phiếu</th>
                                        <th className="px-5 py-3 text-right">Giá trị</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <tr className="bg-white hover:bg-slate-50 transition-colors cursor-pointer px-5">
                                        <td className="px-5 py-4 flex gap-2 items-center">
                                            <span className="text-green-600 italic font-semibold">Tổng hạch toán thu</span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-bold border border-emerald-100">{(selectedCustomer.DaThu || 0).toLocaleString()} VNĐ</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <div className="bg-slate-50/50 px-5 py-3 flex justify-end gap-3 border-t border-slate-100">
                                <button onClick={() => { navigate('/tai-chinh/thu-chi'); onClose(); }} className="action-btn p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-100" title="Mở rộng"><Maximize2 size={16} /></button>
                                <button onClick={() => {}} className="action-btn p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-100" title="Thêm phiếu thu/chi"><Plus size={16} /></button>
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
