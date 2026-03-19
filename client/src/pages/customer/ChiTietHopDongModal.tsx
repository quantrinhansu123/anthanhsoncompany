import React, { useState, useEffect, useCallback } from 'react';
import { X, FileText, FolderOpen, ClipboardList, Plus, Maximize2, Link as LinkIcon, Image as ImageIcon, FileCheck, CreditCard, User, ExternalLink } from 'lucide-react';
import { contractService, ContractFile } from '../../lib/services/contractService';
import { taskService, TaskRow } from '../../lib/services/taskService';
import { useHopDongModal } from '../../contexts/HopDongModalContext';

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
    daThu: number;
    conPhaiThu: number;
    ngayUpdate: string;
    nhanSuId?: string | null;
    nhanSuIds?: string[];
    nhanSuTen?: string | null;
}

interface ChiTietHopDongModalProps {
    isOpen: boolean;
    onClose: () => void;
    contract: Contract | null;
}

export function ChiTietHopDongModal({ isOpen, onClose, contract }: ChiTietHopDongModalProps) {
    const { 
        openAddDocument, 
        openAddFinance, 
        openAddTask, 
        openNghiemThu 
    } = useHopDongModal();
    
    const [activeTab, setActiveTab] = useState('info');
    const [tasks, setTasks] = useState<TaskRow[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(false);

    const loadTasks = useCallback(async () => {
        if (!contract?.uuid) return;
        setLoadingTasks(true);
        try {
            const taskList = await taskService.getByHopDongId(contract.uuid);
            setTasks(taskList);
        } catch (error) {
            console.error('Error loading tasks:', error);
        } finally {
            setLoadingTasks(false);
        }
    }, [contract?.uuid]);

    useEffect(() => {
        if (isOpen && contract?.uuid) {
            loadTasks();
        }
    }, [isOpen, contract?.uuid, loadTasks]);

    if (!isOpen || !contract) return null;

    const formatCurrency = (amount: number) => {
        return amount.toLocaleString('vi-VN');
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-lg flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 flex justify-between items-center border-b border-slate-200">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Chi tiết hợp đồng</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Số HĐ: {contract.soHopDong}</p>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <div className="border-b border-slate-100 bg-slate-50/50 flex">
                    {['info', 'documents', 'finance', 'tasks'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 ${
                                activeTab === tab 
                                ? 'text-purple-600 border-purple-600 bg-white' 
                                : 'text-slate-500 border-transparent hover:text-slate-700'
                            }`}
                        >
                            {tab === 'info' && 'Thông tin chung'}
                            {tab === 'documents' && 'Tài liệu'}
                            {tab === 'finance' && 'Thu chi'}
                            {tab === 'tasks' && 'Công việc'}
                        </button>
                    ))}
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {activeTab === 'info' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            <InfoRow label="Số hợp đồng" value={contract.soHopDong} />
                            <InfoRow label="Tên gói thầu" value={contract.tenGoiThau} />
                            <InfoRow label="Loại dịch vụ" value={contract.loaiDichVu} />
                            <InfoRow label="Ngày ký HĐ" value={contract.ngayKyHD} />
                            <InfoRow label="Giá trị HĐ" value={`${formatCurrency(contract.giaTriHD)} đ`} />
                            <InfoRow label="Giá trị QT" value={`${formatCurrency(contract.giaTriQT)} đ`} />
                            <InfoRow label="Đã thu" value={`${formatCurrency(contract.daThu)} đ`} />
                            <InfoRow label="Còn phải thu" value={`${formatCurrency(contract.conPhaiThu)} đ`} />
                            <InfoRow label="Nhân sự phụ trách" value={contract.nhanSuTen || '(Chưa rõ)'} />
                            <InfoRow label="Trạng thái file" value={contract.fileStatus} />
                        </div>
                    )}

                    {activeTab === 'documents' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-semibold text-slate-800">Danh sách tài liệu</h3>
                                <button onClick={openAddDocument} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded border border-purple-100"><Plus size={16} /></button>
                            </div>
                            {contract.files && contract.files.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {contract.files.map((file, idx) => (
                                        <div key={idx} className="p-3 border border-slate-200 rounded-xl hover:shadow-sm flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <FileText size={18} className="text-slate-400" />
                                                <div>
                                                    <div className="text-sm font-medium text-slate-800">{file.file_type}</div>
                                                    <div className="text-xs text-slate-500 truncate max-w-[150px]">{file.file_name}</div>
                                                </div>
                                            </div>
                                            <a href={file.file_url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><ExternalLink size={16} /></a>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-10 text-center text-slate-400 italic">Chưa có tài liệu</div>
                            )}
                        </div>
                    )}

                    {activeTab === 'finance' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-semibold text-slate-800">Thu chi</h3>
                                <button onClick={openAddFinance} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded border border-purple-100"><Plus size={16} /></button>
                            </div>
                            <table className="w-full text-xs">
                                <thead className="bg-slate-50 text-slate-600">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Loại phiếu</th>
                                        <th className="px-4 py-2 text-left">Ngày</th>
                                        <th className="px-4 py-2 text-right">Số tiền</th>
                                        <th className="px-4 py-2 text-left">Nội dung</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contract.daThu > 0 ? (
                                        <tr className="border-b border-slate-100">
                                            <td className="px-4 py-3"><span className="text-green-600 font-medium">Phiếu thu</span></td>
                                            <td className="px-4 py-3 text-slate-500">Đã thanh toán</td>
                                            <td className="px-4 py-3 text-right font-medium">{formatCurrency(contract.daThu)} đ</td>
                                            <td className="px-4 py-3 text-slate-500">Thanh toán theo hợp đồng</td>
                                        </tr>
                                    ) : (
                                        <tr><td colSpan={4} className="py-8 text-center text-slate-400 italic">Chưa có phiếu thu chi</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'tasks' && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-semibold text-slate-800">Công việc chi tiết</h3>
                                <button onClick={openAddTask} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded border border-purple-100"><Plus size={16} /></button>
                            </div>
                            {loadingTasks ? (
                                <div className="py-10 text-center text-slate-400">Đang tải...</div>
                            ) : tasks.length > 0 ? (
                                <div className="space-y-3">
                                    {tasks.map(task => (
                                        <div key={task.id} className="p-4 border border-slate-200 rounded-xl hover:bg-slate-50">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-medium text-slate-800">{task.ten_task}</div>
                                                    <div className="text-xs text-slate-500 mt-1">Phụ trách: {task.nguoi_phu_trach}</div>
                                                </div>
                                                <button onClick={() => openNghiemThu(task)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded border border-emerald-100" title="Nghiệm thu"><FileCheck size={16} /></button>
                                            </div>
                                            <div className="mt-3 flex items-center gap-2">
                                                <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                    <div className="bg-blue-600 h-full" style={{ width: `${task.tien_do}%` }} />
                                                </div>
                                                <span className="text-xs font-bold text-slate-600">{task.tien_do}%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="py-10 text-center text-slate-400 italic">Chưa có công việc</div>
                            )}
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-slate-200 flex justify-end">
                    <button onClick={onClose} className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-sm">Đóng</button>
                </div>
            </div>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="py-2 border-b border-slate-50">
            <div className="text-xs text-slate-400 mb-0.5">{label}</div>
            <div className="text-sm font-medium text-slate-700">{value || '(Trống)'}</div>
        </div>
    );
}
