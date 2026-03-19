import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Edit, Trash2, FileText, FolderOpen, ClipboardList, Plus, Maximize2, Link as LinkIcon, ExternalLink, FileCheck, Image as ImageIcon } from 'lucide-react';
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
    projectName?: string;
}

interface ChiTietHopDongModalProps {
    isOpen: boolean;
    onClose: () => void;
    contract: Contract | null;
}

const FILE_TYPES = [
    'File_BBTT',
    'File_HD',
    'File_BBNT',
    'File_PL3A',
    'File_BBTL',
    'File_PLHD'
] as const;

export function ChiTietHopDongModal({ isOpen, onClose, contract }: ChiTietHopDongModalProps) {
    const { 
        openAddDocument, 
        openAddFinance, 
        openAddTask, 
        openNghiemThu,
        openThemHopDong
    } = useHopDongModal();
    
    const [activeTab, setActiveTab] = useState('info');
    const [tasks, setTasks] = useState<TaskRow[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(false);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

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

    const contractProgress = useMemo(() => {
        if (!tasks.length) return 0;
        const total = tasks.reduce((sum, task) => sum + (task.tien_do || 0), 0);
        return Math.round(total / tasks.length);
    }, [tasks]);

    if (!isOpen || !contract) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-[#FAF9FB] w-full max-w-4xl rounded-2xl shadow-xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 overflow-hidden">
                {/* Modal Header */}
                <div className="px-6 py-4 flex justify-between items-center bg-white border-b border-slate-200">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Chi tiết hợp đồng</h2>
                        <p className="text-xs text-slate-500 mt-0.5">Số HĐ: {contract.soHopDong}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                onClose();
                                openThemHopDong(contract as any);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-orange-600 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                        >
                            <Edit size={15} />
                            Sửa
                        </button>
                        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="border-b border-slate-200 bg-white">
                    <nav className="flex -mb-px px-6 gap-6" aria-label="Tabs">
                        {[
                            { id: 'info', label: 'Thông tin hợp đồng' },
                            { id: 'documents', label: 'Tài liệu HĐ' },
                            { id: 'finance', label: 'Thu chi' },
                            { id: 'tasks', label: 'Công việc CT' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                                    whitespace-nowrap py-3 border-b-2 font-medium text-sm transition-all duration-200
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
                <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
                    {activeTab === 'info' && (
                        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Project Name */}
                            {(contract.projectName || (contract as any).tenDuAn) && (
                                <div className="bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3">
                                    <div className="text-xs text-slate-400 font-medium mb-1">Dự án</div>
                                    <div className="text-sm text-red-600 font-semibold flex items-center gap-1.5">
                                        <span>★</span>
                                        <span className="italic">{contract.projectName || (contract as any).tenDuAn}</span>
                                    </div>
                                </div>
                            )}

                            {/* Contract Details */}
                            <div className="bg-white border text-sm text-slate-700 border-slate-200 shadow-sm rounded-xl overflow-hidden">
                                {[
                                    { label: 'Số hợp đồng', value: contract.soHopDong },
                                    { label: 'Ngày ký HĐ', value: contract.ngayKyHD },
                                    { label: 'Tên gói thầu', value: contract.tenGoiThau },
                                    { label: 'Loại dịch vụ', value: contract.loaiDichVu || '—' },
                                    { label: 'Trạng thái file', value: contract.fileStatus, highlight: true },
                                    { label: 'Nhân sự phụ trách', value: contract.nhanSuTen || '(Chưa rõ)' },
                                    { label: 'Ngày cập nhật', value: contract.ngayUpdate },
                                ].map((row, index) => (
                                    <div key={index} className="flex px-4 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                        <div className="w-[180px] shrink-0 text-slate-500 font-medium">{row.label}</div>
                                        <div className={`flex-1 font-medium ${row.highlight ? 'text-red-600 italic' : 'text-slate-800'}`}>{row.value}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Task Progress */}
                            <div className="bg-white border text-sm text-slate-700 border-slate-200 shadow-sm rounded-xl">
                                <div className="px-4 py-3 border-b border-slate-200 bg-white rounded-t-xl">
                                    <h3 className="text-sm font-semibold text-slate-800">Tiến độ công việc</h3>
                                </div>
                                <div className="px-4 py-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-slate-600 font-medium">Hoàn thành: {tasks.filter(t => t.tien_do === 100).length} / {tasks.length} task</span>
                                        <span className="text-sm font-bold text-slate-800">{contractProgress}%</span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${
                                                contractProgress === 100 ? 'bg-emerald-500' :
                                                contractProgress >= 75 ? 'bg-blue-500' :
                                                contractProgress >= 50 ? 'bg-yellow-500' :
                                                contractProgress >= 25 ? 'bg-orange-500' :
                                                'bg-slate-400'
                                            }`}
                                            style={{ width: `${contractProgress}%` }}
                                        />
                                    </div>
                                    {tasks.length === 0 && (
                                        <p className="text-xs text-slate-400 mt-2 italic text-center">Chưa có task nào</p>
                                    )}
                                </div>
                            </div>

                            {/* Financial Summary */}
                            <div className="bg-white border text-sm text-slate-700 border-slate-200 shadow-sm rounded-xl">
                                <div className="px-4 py-3 border-b border-slate-200 bg-white rounded-t-xl">
                                    <h3 className="text-sm font-semibold text-slate-800">Thông tin tài chính</h3>
                                </div>
                                {[
                                    { label: 'Giá trị hợp đồng', value: formatCurrency(contract.giaTriHD), color: 'text-slate-800' },
                                    { label: 'Giá trị quyết toán', value: formatCurrency(contract.giaTriQT), color: 'text-green-600' },
                                    { label: 'Đã thu', value: formatCurrency(contract.daThu), color: 'text-green-600' },
                                    { label: 'Còn phải thu', value: formatCurrency(contract.conPhaiThu), color: contract.conPhaiThu > 0 ? 'text-red-500' : 'text-green-600' },
                                ].map((row, index) => (
                                    <div key={index} className="flex px-4 py-3.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                        <div className="w-[180px] shrink-0 text-slate-500 font-medium">{row.label}</div>
                                        <div className={`flex-1 font-bold ${row.color}`}>{row.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'documents' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Files List */}
                            <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                                <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold text-slate-800">Danh sách file</h3>
                                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold">
                                            {contract.files?.length || 0}
                                        </span>
                                    </div>
                                    <button onClick={openAddDocument} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded border border-purple-100 transition-colors" title="Thêm tài liệu">
                                        <Plus size={16} />
                                    </button>
                                </div>
                                {contract.files && contract.files.length > 0 ? (
                                    <div className="divide-y divide-slate-100">
                                        {contract.files.map((file, index) => (
                                            <div key={index} className="px-4 py-3 hover:bg-slate-50 flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <FileText size={18} className="text-slate-400 flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium text-slate-800">{file.file_type}</div>
                                                        <div className="text-xs text-slate-500 truncate">{file.file_name}</div>
                                                        <a
                                                            href={file.file_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline truncate block mt-1"
                                                        >
                                                            {file.file_url}
                                                        </a>
                                                    </div>
                                                </div>
                                                <a
                                                    href={file.file_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md flex items-center gap-2 transition-colors"
                                                >
                                                    <ExternalLink size={14} />
                                                    Mở link
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="px-4 py-10 text-center">
                                        <FolderOpen size={40} className="mx-auto text-slate-300 mb-3" />
                                        <p className="text-sm text-slate-400 italic">Chưa có tài liệu</p>
                                    </div>
                                )}

                                {/* Missing Files Warning */}
                                {(() => {
                                    const uploadedTypes = new Set(
                                        (contract.files || [])
                                            .filter(f => f.file_url && f.file_url.trim() !== '')
                                            .map(f => f.file_type)
                                    );
                                    const missingFiles = FILE_TYPES.filter(type => !uploadedTypes.has(type));
                                    if (missingFiles.length > 0) {
                                        return (
                                            <div className="px-4 py-3 bg-amber-50 border-t border-amber-200">
                                                <div className="text-xs font-semibold text-amber-800 mb-1">Các file còn thiếu:</div>
                                                <div className="text-xs text-amber-700">{missingFiles.join(', ')}</div>
                                            </div>
                                        );
                                    }
                                    return null;
                                })()}
                            </div>
                        </div>
                    )}

                    {activeTab === 'finance' && (
                        <div className="bg-white border text-sm text-slate-700 border-slate-200 shadow-sm rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <h3 className="text-sm font-semibold text-slate-800">Thu chi</h3>
                                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-[10px] font-bold">
                                        {contract.daThu > 0 ? '1' : '0'}
                                    </span>
                                </div>
                                <button onClick={openAddFinance} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded border border-purple-100 transition-colors" title="Thêm thu chi">
                                    <Plus size={16} />
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="border-b border-slate-200 text-slate-800 font-semibold bg-white text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-3">Loại phiếu</th>
                                            <th className="px-4 py-3">Ngày</th>
                                            <th className="px-4 py-3 text-right">Số tiền</th>
                                            <th className="px-4 py-3">Nội dung</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-sm">
                                        {contract.daThu > 0 ? (
                                            <tr className="bg-white hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <span className="text-green-600 italic font-bold">Phiếu thu</span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">Đã ghi nhận</td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className="font-bold text-slate-800">
                                                        {formatCurrency(contract.daThu)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">Thanh toán theo hợp đồng</td>
                                            </tr>
                                        ) : (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">
                                                    Chưa có phiếu thu/chi nào
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'tasks' && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                                <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-semibold text-slate-800">Công việc chi tiết</h3>
                                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold">{tasks.length}</span>
                                    </div>
                                    <button onClick={openAddTask} className="p-1.5 text-purple-600 hover:bg-purple-50 rounded border border-purple-100 transition-colors" title="Thêm công việc">
                                        <Plus size={16} />
                                    </button>
                                </div>
                                {loadingTasks ? (
                                    <div className="px-4 py-10 text-center text-sm text-slate-400">Đang tải...</div>
                                ) : tasks.length === 0 ? (
                                    <div className="px-4 py-10 text-center">
                                        <ClipboardList size={40} className="mx-auto text-slate-300 mb-3" />
                                        <p className="text-sm text-slate-400 italic">Chưa có công việc nào</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-100">
                                        {tasks.map((task) => (
                                            <div key={task.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="text-sm font-bold text-slate-800">{task.ten_task}</h4>
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                task.trang_thai === 'Hoàn thành' ? 'bg-emerald-100 text-emerald-700' :
                                                                task.trang_thai === 'Đang thực hiện' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-slate-100 text-slate-700'
                                                            }`}>
                                                                {task.trang_thai}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 mb-2">Phụ trách: {task.nguoi_phu_trach || '—'}</p>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 bg-slate-200 rounded-full h-1.5">
                                                                <div
                                                                    className="bg-purple-600 h-1.5 rounded-full transition-all duration-500"
                                                                    style={{ width: `${task.tien_do}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-600 w-8 text-right">{task.tien_do}%</span>
                                                        </div>
                                                        {(task.link_tai_lieu || task.anh_bang_chung) && (
                                                            <div className="mt-2 flex items-center gap-3">
                                                                {task.link_tai_lieu && (
                                                                    <a href={task.link_tai_lieu} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
                                                                        <LinkIcon size={10} /> Tài liệu
                                                                    </a>
                                                                )}
                                                                {task.anh_bang_chung && (
                                                                    <a href={task.anh_bang_chung} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline flex items-center gap-1">
                                                                        <ImageIcon size={10} /> Bằng chứng
                                                                    </a>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button 
                                                        onClick={() => openNghiemThu(task)} 
                                                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded border border-emerald-100 transition-colors" 
                                                        title="Nghiệm thu"
                                                    >
                                                        <FileCheck size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end">
                    <button 
                        onClick={onClose} 
                        className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-sm transition-colors shadow-sm"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}
