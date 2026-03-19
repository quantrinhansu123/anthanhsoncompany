import React, { useState, useEffect, useCallback } from 'react';
import { X, User, FileText, Link as LinkIcon, ExternalLink, Trash2 } from 'lucide-react';
import { contractService, ContractFile } from '../../lib/services/contractService';
import { projectService } from '../../lib/services/projectService';
import { employeeService } from '../../lib/services/employeeService';
import { thuChiService } from '../../lib/services/thuChiService';

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
}

interface ThemHopDongModalProps {
    isOpen: boolean;
    onClose: () => void;
    editData: Contract | null;
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

export function ThemHopDongModal({ isOpen, onClose, editData, onSuccess }: ThemHopDongModalProps) {
    const [projects, setProjects] = useState<Array<{ id: string; ten_du_an: string }>>([]);
    const [employees, setEmployees] = useState<Array<{ id: string; full_name: string; code: string }>>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [contractFiles, setContractFiles] = useState<ContractFile[]>([]);
    const [selectedFileType, setSelectedFileType] = useState<string>('File_BBTT');
    const [fileLink, setFileLink] = useState<string>('');
    const [isAddingLink, setIsAddingLink] = useState(false);
    const [isDeletingFile, setIsDeletingFile] = useState(false);

    const [formData, setFormData] = useState({
        soHopDong: '',
        tenGoiThau: '',
        loaiDichVu: '',
        ngayKyHD: '',
        giaTriHD: '',
        giaTriQT: '',
        projectId: '',
        nhanSuId: '',
        nhanSuIds: [] as string[],
    });

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [projectList, employeeList] = await Promise.all([
                    projectService.getAll(),
                    employeeService.getAll()
                ]);
                setProjects(projectList.map(p => ({ id: p.id, ten_du_an: p.ten_du_an })));
                setEmployees(employeeList.map(emp => ({
                    id: emp.id.toString(),
                    full_name: emp.full_name || emp.name || emp.hoTen || '',
                    code: emp.code || ''
                })));
            } catch (error) {
                console.error('Error loading initial data:', error);
            }
        };
        if (isOpen) {
            loadInitialData();
        }
    }, [isOpen]);

    useEffect(() => {
        if (editData) {
            setFormData({
                soHopDong: editData.soHopDong || '',
                tenGoiThau: editData.tenGoiThau || '',
                loaiDichVu: editData.loaiDichVu || '',
                ngayKyHD: editData.ngayKyHD ? (editData.ngayKyHD.includes('/') ? editData.ngayKyHD.split('/').reverse().join('-') : editData.ngayKyHD) : '',
                giaTriHD: editData.giaTriHD ? editData.giaTriHD.toString() : '',
                giaTriQT: editData.giaTriQT ? editData.giaTriQT.toString() : '',
                projectId: editData.duAnId || '',
                nhanSuId: editData.nhanSuId || '',
                nhanSuIds: editData.nhanSuIds || (editData.nhanSuId ? [editData.nhanSuId] : []),
            });
            setContractFiles(editData.files || []);
        } else {
            setFormData({
                soHopDong: '',
                tenGoiThau: '',
                loaiDichVu: '',
                ngayKyHD: '',
                giaTriHD: '',
                giaTriQT: '',
                projectId: '',
                nhanSuId: '',
                nhanSuIds: [],
            });
            setContractFiles([]);
        }
    }, [editData, isOpen]);

    const calculateFileStatus = (files: ContractFile[]): string => {
        const uploadedTypes = new Set(files.filter(f => f.file_url && f.file_url.trim() !== '').map(f => f.file_type));
        const missingFiles = FILE_TYPES.filter(type => !uploadedTypes.has(type));
        return missingFiles.length === 0 ? 'Đầy đủ file' : `Thiếu: ${missingFiles.join(', ')}`;
    };

    const toggleNhanSu = (id: string) => {
        const sid = String(id);
        setFormData(prev => {
            const arr = prev.nhanSuIds || [];
            const next = arr.includes(sid) ? arr.filter((x) => x !== sid) : [...arr, sid];
            return { ...prev, nhanSuIds: next, nhanSuId: next[0] || '' };
        });
    };

    const handleAddLink = async () => {
        if (!fileLink.trim() || !editData?.uuid || isAddingLink) return;
        setIsAddingLink(true);
        try {
            const newFile: ContractFile = {
                file_type: selectedFileType,
                file_name: fileLink.trim(),
                file_url: fileLink.trim(),
                uploaded_at: new Date().toISOString()
            };
            const updatedFiles = [...contractFiles, newFile];
            setContractFiles(updatedFiles);
            setFileLink('');
        } catch (error) {
            console.error('Error adding link:', error);
        } finally {
            setIsAddingLink(false);
        }
    };

    const handleDeleteFile = async (fileType: string) => {
        setContractFiles(prev => prev.filter(f => f.file_type !== fileType));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const giaTriHD = Number(formData.giaTriHD.replace(/\./g, '')) || 0;
            const giaTriQT = Number(formData.giaTriQT.replace(/\./g, '')) || 0;
            const fileStatus = calculateFileStatus(contractFiles);

            const payload = {
                du_an_id: formData.projectId || null,
                project_name: projects.find(p => p.id === formData.projectId)?.ten_du_an || null,
                nhan_su_ids: formData.nhanSuIds,
                nhan_su_id: formData.nhanSuIds?.[0] || null,
                so_hop_dong: formData.soHopDong,
                ten_goi_thau: formData.tenGoiThau,
                loai_dich_vu: formData.loaiDichVu,
                ngay_ky_hd: formData.ngayKyHD,
                gia_tri_hd: giaTriHD,
                gia_tri_qt: giaTriQT,
                file_status: fileStatus,
                files: contractFiles,
                ngay_update: new Date().toISOString().slice(0, 10),
            };

            if (editData?.uuid) {
                // For "Đã thu", we should calculate it or preserve it. 
                // In HopDong.tsx it was recalculating daThu.
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-lg flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 flex justify-between items-center border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800">
                        {editData ? 'Chỉnh sửa hợp đồng' : 'Thêm hợp đồng mới'}
                    </h2>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-4">
                    {!editData && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Dự án</label>
                            <select
                                value={formData.projectId}
                                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                            >
                                <option value="">-- Chọn dự án --</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.ten_du_an}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nhân sự phụ trách</label>
                        <div className="border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto bg-slate-50/50">
                            <div className="space-y-1.5">
                                {employees.map((emp) => {
                                    const checked = formData.nhanSuIds.includes(emp.id);
                                    return (
                                        <label key={emp.id} className={`flex items-center gap-3 px-2 py-1.5 rounded cursor-pointer hover:bg-white transition-colors ${checked ? 'bg-purple-50' : ''}`}>
                                            <input type="checkbox" checked={checked} onChange={() => toggleNhanSu(emp.id)} className="rounded border-slate-300 w-4 h-4 text-purple-600" />
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                                                <User size={14} className="text-slate-400" />
                                            </div>
                                            <span className="text-sm text-slate-800">{emp.code ? `[${emp.code}] ` : ''}{emp.full_name}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Số hợp đồng</label>
                        <input type="text" value={formData.soHopDong} onChange={(e) => setFormData({ ...formData, soHopDong: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" placeholder="Nhập số hợp đồng..." />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tên gói thầu</label>
                        <input type="text" value={formData.tenGoiThau} onChange={(e) => setFormData({ ...formData, tenGoiThau: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" placeholder="Nhập tên gói thầu..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Loại dịch vụ</label>
                            <input type="text" value={formData.loaiDichVu} onChange={(e) => setFormData({ ...formData, loaiDichVu: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" placeholder="Loại dịch vụ..." />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ngày ký HĐ</label>
                            <input type="date" value={formData.ngayKyHD} onChange={(e) => setFormData({ ...formData, ngayKyHD: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Giá trị HĐ</label>
                            <input
                                type="text"
                                value={formData.giaTriHD ? (Number(formData.giaTriHD) || 0).toLocaleString('vi-VN') : ''}
                                onChange={(e) => setFormData({ ...formData, giaTriHD: e.target.value.replace(/\./g, '') })}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                                placeholder="0"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Giá trị QT</label>
                            <input
                                type="text"
                                value={formData.giaTriQT ? (Number(formData.giaTriQT) || 0).toLocaleString('vi-VN') : ''}
                                onChange={(e) => setFormData({ ...formData, giaTriQT: e.target.value.replace(/\./g, '') })}
                                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
                                placeholder="0"
                            />
                        </div>
                    </div>

                    {editData && (
                        <div className="border-t border-slate-200 pt-4 mt-4">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Quản lý file</label>
                            <div className="space-y-3">
                                <div className="flex gap-2">
                                    <select value={selectedFileType} onChange={(e) => setSelectedFileType(e.target.value)} className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm">
                                        {FILE_TYPES.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                    <input type="url" value={fileLink} onChange={(e) => setFileLink(e.target.value)} placeholder="Nhập link..." className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                                    <button onClick={handleAddLink} className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm"><LinkIcon size={16} /></button>
                                </div>
                                <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                                    {contractFiles.map((file, idx) => (
                                        <div key={idx} className="px-3 py-2 flex items-center justify-between">
                                            <div className="text-xs font-medium text-slate-800">{file.file_type}</div>
                                            <button onClick={() => handleDeleteFile(file.file_type)} className="text-red-500"><Trash2 size={14} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Hủy</button>
                    <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 bg-purple-600 rounded-lg text-sm font-medium text-white hover:bg-purple-700">
                        {isSaving ? 'Đang xử lý...' : (editData ? 'Cập nhật' : 'Thêm')}
                    </button>
                </div>
            </div>
        </div>
    );
}
