import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Image as ImageIcon, CheckCircle, Info } from 'lucide-react';
import { taskService } from '../../lib/services/taskService';
import { taskTemplateService, TaskTemplateRow } from '../../lib/services/taskTemplateService';
import { employeeService } from '../../lib/services/employeeService';
import { useHopDongModal } from '../../contexts/HopDongModalContext';
import { supabase } from '../../lib/supabase';

interface TaskChecklistItemForm {
    id: string;
    ten: string;
    ghi_chu: string;
    done: boolean;
    attachments: File[];
}

interface ThemCongViecHopDongModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (data?: any) => void;
}

export function ThemCongViecHopDongModal({ isOpen, onClose, onSuccess }: ThemCongViecHopDongModalProps) {
    const { contractData: selectedContract } = useHopDongModal();
    const [taskTemplates, setTaskTemplates] = useState<TaskTemplateRow[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    
    const [taskForm, setTaskForm] = useState({
        selected_template_id: '',
        ten_cv: '',
        ten_task: '',
        mo_ta: '',
        trang_thai: 'Chưa bắt đầu',
        uu_tien: 'Trung bình',
        ngay_bat_dau: '',
        ngay_ket_thuc: '',
        nguoi_phu_trach: '',
        nguoi_phu_trach_ids: [] as string[],
        tien_do: 0,
        cost_mode: 'manual' as 'manual' | 'contract_percent' | 'assignee',
        cost_manual: '',
        cost_contract_percent: '',
        cost_per_person: '',
        ghi_chu: '',
        images: [] as File[],
        checklist_items: [] as TaskChecklistItemForm[],
    });

    useEffect(() => {
        if (isOpen) {
            // Reset form
            setTaskForm({
                selected_template_id: '',
                ten_cv: '',
                ten_task: '',
                mo_ta: '',
                trang_thai: 'Chưa bắt đầu',
                uu_tien: 'Trung bình',
                ngay_bat_dau: new Date().toISOString().split('T')[0],
                ngay_ket_thuc: '',
                nguoi_phu_trach: '',
                nguoi_phu_trach_ids: [],
                tien_do: 0,
                cost_mode: 'manual',
                cost_manual: '',
                cost_contract_percent: '',
                cost_per_person: '',
                ghi_chu: '',
                images: [],
                checklist_items: [],
            });

            // Load extra data
            (async () => {
                try {
                    const [templates, emps] = await Promise.all([
                        taskTemplateService.getAll(),
                        employeeService.getAll()
                    ]);
                    setTaskTemplates(templates || []);
                    setEmployees(emps.map(e => ({
                        id: e.id.toString(),
                        full_name: e.full_name || e.name || e.hoTen || '',
                        code: e.code || '',
                        anh_nhan_su: (e as any).anh_nhan_su || null
                    })));
                } catch (error) {
                    console.error('Error loading modal data:', error);
                }
            })();
        }
    }, [isOpen]);

    const formatCurrency = (amount: number) => {
        if (amount === 0) return '0';
        return amount.toLocaleString('vi-VN');
    };

    const parseMoneyInput = (value: string) => Number((value || '').replace(/\./g, '')) || 0;

    const calculatedTaskCost = useMemo(() => {
        const mode = taskForm.cost_mode;
        if (mode === 'manual') {
            return parseMoneyInput(taskForm.cost_manual);
        }
        if (mode === 'contract_percent') {
            const contractValue = Number(selectedContract?.giaTriHD || 0);
            const percent = parseMoneyInput(taskForm.cost_contract_percent);
            return Math.round((contractValue * percent) / 100);
        }
        const perPerson = parseMoneyInput(taskForm.cost_per_person);
        const assigneeCount = (taskForm.nguoi_phu_trach_ids || []).length;
        return perPerson * Math.max(assigneeCount, 1);
    }, [
        taskForm.cost_mode,
        taskForm.cost_manual,
        taskForm.cost_contract_percent,
        taskForm.cost_per_person,
        taskForm.nguoi_phu_trach_ids,
        selectedContract?.giaTriHD,
    ]);

    const toggleTaskAssignee = (id: string) => {
        const sid = String(id);
        setTaskForm((prev) => {
            const arr = prev.nguoi_phu_trach_ids || [];
            const next = arr.includes(sid) ? arr.filter((x) => x !== sid) : [...arr, sid];
            return { ...prev, nguoi_phu_trach_ids: next };
        });
    };

    const addChecklistItem = () => {
        setTaskForm((prev) => ({
            ...prev,
            checklist_items: [
                ...(prev.checklist_items || []),
                {
                    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                    ten: '',
                    ghi_chu: '',
                    done: false,
                    attachments: [],
                },
            ],
        }));
    };

    const removeChecklistItem = (itemId: string) => {
        setTaskForm((prev) => ({
            ...prev,
            checklist_items: (prev.checklist_items || []).filter((it) => it.id !== itemId),
        }));
    };

    const updateChecklistItem = (
        itemId: string,
        updater: (item: TaskChecklistItemForm) => TaskChecklistItemForm,
    ) => {
        setTaskForm((prev) => ({
            ...prev,
            checklist_items: (prev.checklist_items || []).map((it) =>
                it.id === itemId ? updater(it) : it,
            ),
        }));
    };

    const uploadTaskImages = async (files: File[], prefix: string): Promise<string[]> => {
        if (!files.length) return [];
        const urls: string[] = [];
        
        for (const file of files) {
            const timestamp = Date.now();
            const safeName = file.name.replace(/\s+/g, '_');
            const filePath = `task-evidence/${prefix}_${timestamp}_${safeName}`;
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('task-evidence')
                .upload(filePath, file, { cacheControl: '3600', upsert: false });

            if (uploadError) {
                console.error('Upload error:', uploadError);
                continue;
            }

            const { data: urlData } = supabase.storage
                .from('task-evidence')
                .getPublicUrl(uploadData.path);
            if (urlData?.publicUrl) {
                urls.push(urlData.publicUrl);
            }
        }
        return urls;
    };

    const handleTemplateChange = (templateId: string) => {
        const template = taskTemplates.find(t => t.id === templateId);
        if (!template) return;

        const newChecklist: TaskChecklistItemForm[] = [];
        if (template.tieu_chuan && template.tieu_chuan.length > 0) {
            template.tieu_chuan.forEach((tc, idx) => {
                newChecklist.push({
                    id: `tc_${idx}_${Date.now()}`,
                    ten: `[TC] ${tc.noi_dung} (${tc.diem}đ)`,
                    ghi_chu: '',
                    done: false,
                    attachments: [],
                });
            });
        }
        if (template.cac_buoc && template.cac_buoc.length > 0) {
            template.cac_buoc.forEach((step, idx) => {
                newChecklist.push({
                    id: `step_${idx}_${Date.now()}`,
                    ten: `[Bước] ${step.hanh_dong}`,
                    ghi_chu: step.ghi_chu || '',
                    done: false,
                    attachments: [],
                });
            });
        }

        setTaskForm(prev => ({
            ...prev,
            selected_template_id: templateId,
            ten_cv: template.task || '',
            checklist_items: newChecklist,
            mo_ta: template.mo_ta || ''
        }));
    };

    const handleSave = async () => {
        if (!selectedContract?.uuid) return;
        if (!taskForm.ten_task.trim()) {
            alert('Vui lòng nhập tên công việc');
            return;
        }

        setIsSaving(true);
        try {
            const selectedAssigneeNames = (taskForm.nguoi_phu_trach_ids || [])
                .map((id) => {
                    const emp = employees.find((e) => String(e.id) === String(id));
                    return emp ? `${emp.code ? `[${emp.code}] ` : ''}${emp.full_name}` : null;
                })
                .filter((v): v is string => Boolean(v));
            
            const nguoiPhuTrachValue = selectedAssigneeNames.length > 0
                ? selectedAssigneeNames.join(', ')
                : (taskForm.nguoi_phu_trach || null);

            const taskImageUrls = await uploadTaskImages(
                taskForm.images || [],
                `task_main_${selectedContract.uuid}`,
            );

            const checklistWithUploads = [];
            for (const item of taskForm.checklist_items || []) {
                const attachmentUrls = await uploadTaskImages(
                    item.attachments || [],
                    `task_checklist_${selectedContract.uuid}_${item.id}`,
                );
                checklistWithUploads.push({
                    ten: item.ten,
                    ghi_chu: item.ghi_chu,
                    done: item.done,
                    attachment_urls: attachmentUrls,
                });
            }

            const checklistLines = checklistWithUploads.length
                ? [
                    'Checklist:',
                    ...checklistWithUploads.map((it, idx) =>
                        `${idx + 1}. [${it.done ? 'x' : ' '}] ${it.ten || '(Chưa nhập nội dung)'}`
                        + `${it.ghi_chu ? ` | Ghi chú: ${it.ghi_chu}` : ''}`
                        + `${it.attachment_urls?.length ? ` | Ảnh: ${it.attachment_urls.join(', ')}` : ''}`
                    ),
                ]
                : [];

            const costModeLabel =
                taskForm.cost_mode === 'manual'
                    ? 'Nhập tay'
                    : taskForm.cost_mode === 'contract_percent'
                        ? `Theo % hợp đồng (${taskForm.cost_contract_percent || 0}%)`
                        : `Theo nhân sự (${formatCurrency(parseMoneyInput(taskForm.cost_per_person))}/người)`;

            const finalGhiChuParts = [
                `[Tên CV] ${taskForm.ten_cv}`,
                `[Chi phí] ${costModeLabel}`,
                `[Chi phí tạm tính] ${formatCurrency(calculatedTaskCost)} VNĐ`,
                taskForm.ghi_chu?.trim() || '',
                taskImageUrls.length ? `Ảnh công việc: ${taskImageUrls.join(', ')}` : '',
                checklistLines.join('\n'),
            ].filter(Boolean);

            const finalGhiChu = finalGhiChuParts.join('\n\n');
            const linkTaiLieuValue = taskImageUrls.length ? taskImageUrls.join(', ') : null;
            const anhBangChungValue = taskImageUrls.length ? taskImageUrls[0] : null;

            const payload = {
                hop_dong_id: selectedContract.uuid,
                ten_task: taskForm.ten_task,
                mo_ta: taskForm.mo_ta || null,
                trang_thai: taskForm.trang_thai,
                uu_tien: taskForm.uu_tien,
                ngay_bat_dau: taskForm.ngay_bat_dau || null,
                ngay_ket_thuc: taskForm.ngay_ket_thuc || null,
                ngay_hoan_thanh: null,
                nguoi_phu_trach: nguoiPhuTrachValue,
                tien_do: taskForm.tien_do,
                ghi_chu: finalGhiChu,
                link_tai_lieu: linkTaiLieuValue,
                anh_bang_chung: anhBangChungValue,
            };

            await taskService.create(payload);
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving task:', error);
            alert('Lỗi khi lưu công việc. Vui lòng thử lại.');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm shadow-2xl">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Thêm công việc mới</h2>
                        <p className="text-sm text-slate-500 mt-0.5">Hợp đồng: <span className="font-medium text-purple-600">{selectedContract?.soHopDong}</span></p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Cột trái */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                                    Mẫu công việc (Checklist)
                                    <Info size={14} className="text-slate-400" />
                                </label>
                                <select
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all bg-white"
                                    value={taskForm.selected_template_id}
                                    onChange={(e) => handleTemplateChange(e.target.value)}
                                >
                                    <option value="">-- Chọn mẫu (Không bắt buộc) --</option>
                                    {taskTemplates.map((t) => (
                                        <option key={t.id} value={t.id}>{t.loai_cv} - {t.task}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tên công việc (Chính) *</label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all bg-white"
                                    placeholder="Ví dụ: Khảo sát hiện trạng, Thiết kế sơ bộ..."
                                    value={taskForm.ten_task}
                                    onChange={e => setTaskForm({ ...taskForm, ten_task: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tên CV (Chi tiết mẫu)</label>
                                <input
                                    type="text"
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all bg-slate-50"
                                    placeholder="Tự động từ mẫu hoặc nhập tay..."
                                    value={taskForm.ten_cv}
                                    onChange={e => setTaskForm({ ...taskForm, ten_cv: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Độ ưu tiên</label>
                                    <select
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all bg-white"
                                        value={taskForm.uu_tien}
                                        onChange={e => setTaskForm({ ...taskForm, uu_tien: e.target.value })}
                                    >
                                        <option value="Thấp">Thấp</option>
                                        <option value="Trung bình">Trung bình</option>
                                        <option value="Cao">Cao</option>
                                        <option value="Khẩn cấp">Khẩn cấp</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Trạng thái</label>
                                    <select
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all bg-white"
                                        value={taskForm.trang_thai}
                                        onChange={e => setTaskForm({ ...taskForm, trang_thai: e.target.value })}
                                    >
                                        <option value="Chưa bắt đầu">Chưa bắt đầu</option>
                                        <option value="Đang thực hiện">Đang thực hiện</option>
                                        <option value="Hoàn thành">Hoàn thành</option>
                                        <option value="Tạm dừng">Tạm dừng</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Cột phải */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ngày bắt đầu</label>
                                    <input
                                        type="date"
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all bg-white"
                                        value={taskForm.ngay_bat_dau}
                                        onChange={e => setTaskForm({ ...taskForm, ngay_bat_dau: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Hạn hoàn thành</label>
                                    <input
                                        type="date"
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all bg-white"
                                        value={taskForm.ngay_ket_thuc}
                                        onChange={e => setTaskForm({ ...taskForm, ngay_ket_thuc: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Người phụ trách (Chọn nhiều)</label>
                                <div className="border border-slate-200 rounded-xl p-3 bg-white max-h-[160px] overflow-y-auto space-y-1 custom-scrollbar">
                                    {employees.map((emp) => (
                                        <label key={emp.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                                checked={taskForm.nguoi_phu_trach_ids.includes(String(emp.id))}
                                                onChange={() => toggleTaskAssignee(String(emp.id))}
                                            />
                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                    {emp.anh_nhan_su ? (
                                                        <img src={emp.anh_nhan_su} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-slate-400">{emp.full_name?.charAt(0)}</span>
                                                    )}
                                                </div>
                                                <span className="text-sm text-slate-700 truncate font-medium">
                                                    {emp.code ? `[${emp.code}] ` : ''}{emp.full_name}
                                                </span>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mô tả công việc</label>
                                <textarea
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all bg-white"
                                    rows={3}
                                    placeholder="Nhập chi tiết yêu cầu công việc..."
                                    value={taskForm.mo_ta}
                                    onChange={e => setTaskForm({ ...taskForm, mo_ta: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section: Chi phí */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                <ImageIcon size={18} />
                            </div>
                            <h3 className="font-bold text-slate-800">Cấu hình chi phí</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Cách tính</label>
                                <select
                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all bg-slate-50"
                                    value={taskForm.cost_mode}
                                    onChange={(e) => setTaskForm(prev => ({ ...prev, cost_mode: e.target.value as any }))}
                                >
                                    <option value="manual">Nhập tay</option>
                                    <option value="contract_percent">Theo % hợp đồng</option>
                                    <option value="assignee">Theo số lượng nhân sự</option>
                                </select>
                            </div>

                            {taskForm.cost_mode === 'manual' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Chi phí nhập (VNĐ)</label>
                                    <input
                                        type="text"
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all"
                                        placeholder="0"
                                        value={taskForm.cost_manual ? formatCurrency(parseMoneyInput(taskForm.cost_manual)) : ''}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\./g, '').replace(/[^\d]/g, '');
                                            setTaskForm(prev => ({ ...prev, cost_manual: val }));
                                        }}
                                    />
                                </div>
                            )}

                            {taskForm.cost_mode === 'contract_percent' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">% Giá trị Hợp đồng</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            className="w-full border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all"
                                            placeholder="0"
                                            value={taskForm.cost_contract_percent}
                                            onChange={e => setTaskForm(prev => ({ ...prev, cost_contract_percent: e.target.value }))}
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">%</span>
                                    </div>
                                    <p className="mt-1.5 text-[11px] text-slate-500 font-medium">HĐ: {formatCurrency(Number(selectedContract?.giaTriHD || 0))} VNĐ</p>
                                </div>
                            )}

                            {taskForm.cost_mode === 'assignee' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Chi phí / Nhân sự (VNĐ)</label>
                                    <input
                                        type="text"
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all"
                                        placeholder="0"
                                        value={taskForm.cost_per_person ? formatCurrency(parseMoneyInput(taskForm.cost_per_person)) : ''}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\./g, '').replace(/[^\d]/g, '');
                                            setTaskForm(prev => ({ ...prev, cost_per_person: val }));
                                        }}
                                    />
                                    <p className="mt-1.5 text-[11px] text-slate-500 font-medium">Nhân sự đã chọn: {taskForm.nguoi_phu_trach_ids.length}</p>
                                </div>
                            )}

                            <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4 flex flex-col justify-center">
                                <label className="block text-[10px] font-bold text-purple-400 mb-1 uppercase tracking-widest">Chi phí dự kiến</label>
                                <div className="text-xl font-black text-purple-700">
                                    {formatCurrency(calculatedTaskCost)} <span className="text-xs font-bold ml-1">VNĐ</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section: Checklist */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <CheckCircle size={18} />
                                </div>
                                <h3 className="font-bold text-slate-800">Checklist công việc</h3>
                            </div>
                            <button
                                type="button"
                                onClick={addChecklistItem}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                <Plus size={14} /> Thêm bước
                            </button>
                        </div>

                        {taskForm.checklist_items.length === 0 ? (
                            <div className="py-8 text-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                <p className="text-sm text-slate-400 font-medium">Chưa có checklist. Bấm "Thêm bước" để tạo mới.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {taskForm.checklist_items.map((item, idx) => (
                                    <div key={item.id} className="group bg-slate-50/50 hover:bg-white border border-slate-100 hover:border-slate-200 rounded-xl p-4 transition-all">
                                        <div className="flex flex-col md:flex-row gap-4">
                                            <div className="flex-1 space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                        checked={item.done}
                                                        onChange={e => updateChecklistItem(item.id, old => ({ ...old, done: e.target.checked }))}
                                                    />
                                                    <input
                                                        type="text"
                                                        className="flex-1 bg-transparent border-none p-0 text-sm font-semibold text-slate-700 focus:ring-0 placeholder-slate-300"
                                                        placeholder={`Tiêu đề bước #${idx + 1}`}
                                                        value={item.ten}
                                                        onChange={e => updateChecklistItem(item.id, old => ({ ...old, ten: e.target.value }))}
                                                    />
                                                </div>
                                                <textarea
                                                    className="w-full bg-white/50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/10 placeholder-slate-400"
                                                    rows={2}
                                                    placeholder="Ghi chú chi tiết cho bước này..."
                                                    value={item.ghi_chu}
                                                    onChange={e => updateChecklistItem(item.id, old => ({ ...old, ghi_chu: e.target.value }))}
                                                />
                                            </div>
                                            <div className="md:w-64 space-y-2">
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase">Minh chứng (Ảnh)</label>
                                                <input
                                                    type="file"
                                                    multiple
                                                    accept="image/*"
                                                    className="w-full text-[10px] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                                                    onChange={(e) => {
                                                        const files = Array.from(e.target.files || []) as File[];
                                                        updateChecklistItem(item.id, (old) => ({ ...old, attachments: files }));
                                                    }}
                                                />
                                                {item.attachments.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {Array.from(item.attachments).map((f, i) => (
                                                            <div key={i} className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[9px] font-bold">File {i+1}</div>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="pt-2 flex justify-end">
                                                    <button
                                                        onClick={() => removeChecklistItem(item.id)}
                                                        className="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Section: Ảnh đính kèm công việc */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                                <ImageIcon size={18} />
                            </div>
                            <h3 className="font-bold text-slate-800">Ảnh kết quả / Báo cáo</h3>
                        </div>
                        <input
                            type="file"
                            multiple
                            accept="image/*"
                            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm bg-slate-50 focus:outline-none file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-orange-100 file:text-orange-700 hover:file:bg-orange-200 cursor-pointer transition-all"
                            onChange={(e) => {
                                const files = Array.from(e.target.files || []) as File[];
                                setTaskForm(prev => ({ ...prev, images: files }));
                            }}
                        />
                        {taskForm.images.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {taskForm.images.map((f, i) => (
                                    <div key={i} className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full text-[11px] font-semibold text-slate-600 shadow-sm">
                                        <ImageIcon size={12} className="text-orange-500" />
                                        <span className="max-w-[120px] truncate">{f.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ghi chú tổng quát</label>
                        <textarea
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all bg-white"
                            rows={3}
                            placeholder="Nhập ghi chú bổ sung cho toàn bộ công việc..."
                            value={taskForm.ghi_chu}
                            onChange={e => setTaskForm({ ...taskForm, ghi_chu: e.target.value })}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-end items-center gap-3 sticky bottom-0">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-all disabled:opacity-50"
                    >
                        Hủy bỏ
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-200 hover:shadow-purple-300 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 disabled:pointer-events-none"
                    >
                        {isSaving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Đang lưu...
                            </>
                        ) : (
                            <>
                                <Plus size={18} />
                                Tạo công việc
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
