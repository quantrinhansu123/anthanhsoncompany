import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Edit, Trash2, X, FolderKanban, FileText, ChevronDown, ChevronRight, FolderOpen, Eye } from 'lucide-react';
import {
  taskTemplateService,
  type TaskTemplateRow,
  type TaskTemplateStandard,
  type TaskTemplateStep,
} from '../../lib/services/taskTemplateService';

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: 'success' | 'info' | 'warning';
  onClose: () => void;
}) {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor =
    type === 'success'
      ? 'bg-emerald-500'
      : type === 'warning'
      ? 'bg-amber-500'
      : 'bg-blue-500';

  return (
    <div
      className={`fixed top-5 right-5 z-[100] ${bgColor} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 toast-enter`}
    >
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 hover:bg-white/20 rounded p-0.5 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function TaskList() {
  const [items, setItems] = useState<TaskTemplateRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [selectedFolderKey, setSelectedFolderKey] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'info' | 'warning';
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingTask, setViewingTask] = useState<TaskTemplateRow | null>(null);
  const [editingTask, setEditingTask] = useState<TaskTemplateRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<
    Omit<TaskTemplateRow, 'id' | 'created_at' | 'updated_at'>
  >({
    loai_cv: '',
    cv: '',
    task: '',
    mo_ta: '',
    tieu_chuan: [{ noi_dung: '', diem: 0 }],
    cac_buoc: [{ hanh_dong: '', ghi_chu: '' }],
  });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await taskTemplateService.getAll();
        setItems(data || []);
      } catch (error) {
        console.error('[TaskList] Error loading task templates:', error);
        setToast({
          message: 'Lỗi khi tải danh sách task',
          type: 'warning',
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => {
      return (
        item.loai_cv.toLowerCase().includes(term) ||
        item.cv.toLowerCase().includes(term) ||
        item.task.toLowerCase().includes(term) ||
        (item.mo_ta || '').toLowerCase().includes(term)
      );
    });
  }, [items, searchTerm]);

  const groupedByLoaiCV = useMemo(() => {
    type Group = { key: string; label: string; items: TaskTemplateRow[] };
    const map = new Map<string, Group>();

    filteredItems.forEach((tpl) => {
      const raw = (tpl.loai_cv || 'Khác').trim();
      const norm = raw.toLowerCase() || 'khác';

      if (!map.has(norm)) {
        map.set(norm, { key: norm, label: raw || 'Khác', items: [] });
      }
      map.get(norm)!.items.push(tpl);
    });

    return Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label, 'vi', { sensitivity: 'base' }),
    );
  }, [filteredItems]);

  const getTotalScore = (tpl: TaskTemplateRow) =>
    (tpl.tieu_chuan || []).reduce(
      (sum, s) => sum + (Number(s?.diem) || 0),
      0,
    );

  useEffect(() => {
    setExpandedFolders((prev) => {
      const next: Record<string, boolean> = {};
      groupedByLoaiCV.forEach((group) => {
        next[group.key] = prev[group.key] ?? true;
      });
      return next;
    });
  }, [groupedByLoaiCV]);

  const toggleFolder = (folderKey: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderKey]: !prev[folderKey],
    }));
  };

  useEffect(() => {
    if (!groupedByLoaiCV.length) {
      setSelectedFolderKey('');
      return;
    }
    const hasSelected = groupedByLoaiCV.some((g) => g.key === selectedFolderKey);
    if (!hasSelected) {
      setSelectedFolderKey(groupedByLoaiCV[0].key);
    }
  }, [groupedByLoaiCV, selectedFolderKey]);

  const openAddModal = () => {
    setEditingTask(null);
    setFormData({
      loai_cv: '',
      cv: '',
      task: '',
      mo_ta: '',
      tieu_chuan: [{ noi_dung: '', diem: 0 }],
      cac_buoc: [{ hanh_dong: '', ghi_chu: '' }],
    });
    setIsModalOpen(true);
  };

  const openEditModal = (task: TaskTemplateRow) => {
    setEditingTask(task);
    const standards: TaskTemplateStandard[] =
      (task.tieu_chuan || []).length > 0
        ? task.tieu_chuan
        : [{ noi_dung: '', diem: 0 }];
    setFormData({
      loai_cv: task.loai_cv,
      cv: task.cv,
      task: task.task,
      mo_ta: task.mo_ta || '',
      tieu_chuan: standards,
      cac_buoc: task.cac_buoc || [{ hanh_dong: '', ghi_chu: '' }],
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.loai_cv.trim()) {
      setToast({ message: 'Vui lòng nhập Loại CV', type: 'warning' });
      return;
    }
    if (!formData.cv.trim()) {
      setToast({ message: 'Vui lòng nhập CV', type: 'warning' });
      return;
    }
    if (!formData.task.trim()) {
      setToast({ message: 'Vui lòng nhập Task', type: 'warning' });
      return;
    }

    const standards: TaskTemplateStandard[] = (formData.tieu_chuan || [])
      .map((s) => ({
        noi_dung: (s?.noi_dung || '').trim(),
        diem: Number(s?.diem) || 0,
      }))
      .filter((s) => s.noi_dung.length > 0);

    const cleanedSteps: TaskTemplateStep[] = (formData.cac_buoc || [])
      .map((s) => ({
        hanh_dong: (s?.hanh_dong || '').trim(),
        ghi_chu: (s?.ghi_chu || '').trim() || null,
      }))
      .filter((s) => s.hanh_dong.length > 0);

    try {
      setSaving(true);
      if (editingTask) {
        await taskTemplateService.update(editingTask.id, {
          ...formData,
          tieu_chuan: standards,
          cac_buoc: cleanedSteps,
        });
        setToast({ message: 'Cập nhật task thành công', type: 'success' });
      } else {
        await taskTemplateService.create({
          ...formData,
          tieu_chuan: standards,
          cac_buoc: cleanedSteps,
        });
        setToast({ message: 'Thêm task mới thành công', type: 'success' });
      }

      const data = await taskTemplateService.getAll();
      setItems(data || []);

      setIsModalOpen(false);
      setEditingTask(null);
    } catch (error) {
      console.error('[TaskList] Error saving task:', error);
      setToast({ message: 'Lỗi khi lưu task', type: 'warning' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa task này?')) return;
    try {
      await taskTemplateService.delete(id);
      setToast({ message: 'Xóa task thành công', type: 'success' });
      const data = await taskTemplateService.getAll();
      setItems(data || []);
    } catch (error) {
      console.error('[TaskList] Error deleting task:', error);
      setToast({ message: 'Lỗi khi xóa task', type: 'warning' });
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 uppercase tracking-tight">
            Danh sách Task
          </h1>
          <p className="text-sm text-slate-500">
            Nơi lưu trữ và thêm mới task độc lập (không liên quan hợp đồng).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 active:scale-95"
          >
            <Plus size={18} />
            Thêm Task mới
          </button>
        </div>
      </div>

      {/* Bộ lọc */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
              Tìm kiếm
            </label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Tìm theo loại CV, CV, task, mô tả..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* View dạng folder theo Loại CV */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center text-slate-500 text-sm">
            Đang tải danh sách task...
          </div>
        ) : groupedByLoaiCV.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center text-slate-500 text-sm">
            Không có task nào phù hợp với bộ lọc.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-4 xl:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-600">Thư mục Loại CV</p>
              </div>
              <div className="p-2 space-y-1 max-h-[540px] overflow-y-auto">
                {groupedByLoaiCV.map(({ key, label, items: tasks }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSelectedFolderKey(key);
                      toggleFolder(key);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-all ${
                      selectedFolderKey === key
                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                        : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {expandedFolders[key] ? (
                        <ChevronDown className="w-4 h-4 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 shrink-0" />
                      )}
                      {expandedFolders[key] ? (
                        <FolderOpen className="w-4 h-4 shrink-0" />
                      ) : (
                        <FolderKanban className="w-4 h-4 shrink-0" />
                      )}
                      <span className="text-sm font-semibold truncate">{label}</span>
                    </div>
                    <span className="text-xs font-bold">{tasks.length}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-8 xl:col-span-9 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              {(() => {
                const selected = groupedByLoaiCV.find((g) => g.key === selectedFolderKey) || groupedByLoaiCV[0];
                const tasks = selected?.items || [];
                return (
                  <>
                    <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-900 to-slate-700 text-white flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4" />
                        <span className="text-sm font-semibold uppercase tracking-wide">{selected?.label || 'Khác'}</span>
                      </div>
                      <span className="text-xs font-bold">Số task: {tasks.length}</span>
                    </div>
                    {!expandedFolders[selected?.key || ''] ? (
                      <div className="p-8 text-center text-slate-500 text-sm bg-slate-50/40">
                        Folder đang thu gọn. Bấm vào thư mục bên trái để mở.
                      </div>
                    ) : (
                      <div className="p-3 space-y-3 max-h-[540px] overflow-y-auto bg-slate-50/40">
                        {Array.from(
                          tasks.reduce((map, t) => {
                            const raw = (t.cv || 'Khác').trim();
                            const norm = raw.toLowerCase() || 'khác';
                            if (!map.has(norm)) {
                              map.set(norm, { label: raw || 'Khác', items: [] as TaskTemplateRow[] });
                            }
                            map.get(norm)!.items.push(t);
                            return map;
                          }, new Map<string, { label: string; items: TaskTemplateRow[] }>()),
                        ).map(([cvKey, group]) => (
                          <div key={cvKey} className="space-y-2">
                            <div className="flex items-center justify-between px-1">
                              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                                {group.label || 'Khác'}
                              </span>
                              <span className="text-[10px] text-slate-400">{group.items.length} task</span>
                            </div>
                            <div className="space-y-2">
                              {group.items.map((task) => (
                                <div
                                  key={task.id}
                                  className="group bg-white rounded-xl border border-slate-200 shadow-sm p-3 hover:border-blue-300 hover:shadow-md transition-all"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className="relative shrink-0 mt-0.5">
                                      <div className="absolute inset-0 translate-x-[4px] translate-y-[4px] rounded-xl bg-slate-200" />
                                      <div className="relative w-14 h-14 rounded-xl bg-white border border-slate-300 flex items-center justify-center">
                                        <FileText className="w-8 h-8 text-slate-500 group-hover:text-blue-600 transition-colors" />
                                      </div>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <p className="text-[13px] font-semibold text-slate-800 line-clamp-2">
                                            {task.task}
                                          </p>
                                          {task.mo_ta && (
                                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                                              {task.mo_ta}
                                            </p>
                                          )}
                                        </div>
                                        <div className="shrink-0 text-right text-[10px] text-slate-500 space-y-0.5">
                                          <div>
                                            TC:{' '}
                                            <span className="font-semibold text-slate-800">
                                              {(task.tieu_chuan || []).length}
                                            </span>
                                          </div>
                                          <div>
                                            Điểm:{' '}
                                            <span className="font-bold text-emerald-600">
                                              {getTotalScore(task)}
                                            </span>
                                          </div>
                                          <div>
                                            Bước:{' '}
                                            <span className="font-semibold text-slate-800">
                                              {(task.cac_buoc || []).length}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="mt-2 flex items-center justify-end gap-1.5">
                                        <button
                                          onClick={() => setViewingTask(task)}
                                          className="inline-flex items-center justify-center px-2 py-1 rounded-md border border-blue-200 text-[10px] font-semibold text-blue-600 hover:bg-blue-50"
                                          title="Xem"
                                        >
                                          <Eye size={11} className="mr-1" />
                                          Xem
                                        </button>
                                        <button
                                          onClick={() => openEditModal(task)}
                                          className="inline-flex items-center justify-center px-2 py-1 rounded-md border border-amber-200 text-[10px] font-semibold text-amber-600 hover:bg-amber-50"
                                          title="Sửa"
                                        >
                                          <Edit size={11} className="mr-1" />
                                          Sửa
                                        </button>
                                        <button
                                          onClick={() => handleDelete(task.id)}
                                          className="inline-flex items-center justify-center px-2 py-1 rounded-md border border-red-200 text-[10px] font-semibold text-red-600 hover:bg-red-50"
                                          title="Xóa"
                                        >
                                          <Trash2 size={11} className="mr-1" />
                                          Xóa
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewingTask && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">
                Xem Task
              </h2>
              <button
                onClick={() => setViewingTask(null)}
                className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Loại CV</p>
                <p className="text-sm font-semibold text-slate-800">{viewingTask.loai_cv || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">CV</p>
                <p className="text-sm font-semibold text-slate-800">{viewingTask.cv || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Task</p>
                <p className="text-sm font-semibold text-slate-800">{viewingTask.task || '-'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Mô tả</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{viewingTask.mo_ta || 'Không có mô tả'}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">
                  Tiêu chuẩn ({(viewingTask.tieu_chuan || []).length})
                </p>
                <div className="space-y-1.5">
                  {(viewingTask.tieu_chuan || []).length ? (
                    (viewingTask.tieu_chuan || []).map((tc, idx) => (
                      <div key={idx} className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                        <span className="font-semibold">#{idx + 1}</span> - {tc.noi_dung} ({tc.diem || 0} điểm)
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">Không có tiêu chuẩn.</p>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-2">
                  Các bước ({(viewingTask.cac_buoc || []).length})
                </p>
                <div className="space-y-1.5">
                  {(viewingTask.cac_buoc || []).length ? (
                    (viewingTask.cac_buoc || []).map((step, idx) => (
                      <div key={idx} className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                        <span className="font-semibold">Bước {idx + 1}:</span> {step.hanh_dong || '-'}
                        {step.ghi_chu ? <span className="text-slate-500"> - {step.ghi_chu}</span> : null}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">Không có bước thực hiện.</p>
                  )}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
              <button
                onClick={() => setViewingTask(null)}
                className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-md"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">
                {editingTask ? 'Chỉnh sửa Task' : 'Thêm Task mới'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[75vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    Loại CV *
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    value={formData.loai_cv}
                    onChange={(e) =>
                      setFormData({ ...formData, loai_cv: e.target.value })
                    }
                    placeholder="VD: Hành chính / Kỹ thuật / ..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    CV *
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    value={formData.cv}
                    onChange={(e) =>
                      setFormData({ ...formData, cv: e.target.value })
                    }
                    placeholder="VD: Quản lý hồ sơ nhân sự"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    Task *
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    value={formData.task}
                    onChange={(e) =>
                      setFormData({ ...formData, task: e.target.value })
                    }
                    placeholder="VD: Kiểm tra hồ sơ nhân viên mới"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">
                    Mô tả
                  </label>
                  <textarea
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm"
                    rows={3}
                    value={formData.mo_ta || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, mo_ta: e.target.value })
                    }
                    placeholder="Nhập mô tả task"
                  />
                </div>

                {/* Tiêu chuẩn + điểm */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase">
                      Tiêu chuẩn (mỗi dòng 1 tiêu chuẩn + điểm số)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          tieu_chuan: [
                            ...(prev.tieu_chuan || []),
                            { noi_dung: '', diem: 0 },
                          ],
                        }))
                      }
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      + Thêm tiêu chuẩn
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(formData.tieu_chuan || []).map((tc, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-1 md:grid-cols-12 gap-2"
                      >
                        <input
                          type="text"
                          className="md:col-span-8 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          value={tc.noi_dung || ''}
                          onChange={(e) => {
                            const next = [...(formData.tieu_chuan || [])];
                            next[idx] = {
                              ...next[idx],
                              noi_dung: e.target.value,
                            };
                            setFormData({ ...formData, tieu_chuan: next });
                          }}
                          placeholder={`Tiêu chuẩn #${idx + 1}`}
                        />
                        <input
                          type="number"
                          min={0}
                          className="md:col-span-3 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          value={tc.diem ?? 0}
                          onChange={(e) => {
                            const next = [...(formData.tieu_chuan || [])];
                            next[idx] = {
                              ...next[idx],
                              diem: Number(e.target.value) || 0,
                            };
                            setFormData({ ...formData, tieu_chuan: next });
                          }}
                          placeholder="Điểm"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = (formData.tieu_chuan || []).filter(
                              (_, i) => i !== idx,
                            );
                            setFormData({
                              ...formData,
                              tieu_chuan:
                                next.length > 0
                                  ? next
                                  : [{ noi_dung: '', diem: 0 }],
                            });
                          }}
                          className="md:col-span-1 inline-flex items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                          title="Xóa tiêu chuẩn"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Các bước */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase">
                      Các bước (hành động + ghi chú)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          cac_buoc: [
                            ...(prev.cac_buoc || []),
                            { hanh_dong: '', ghi_chu: '' },
                          ],
                        }))
                      }
                      className="text-xs font-bold text-blue-600 hover:underline"
                    >
                      + Thêm bước
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(formData.cac_buoc || []).map((step, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-1 md:grid-cols-12 gap-2"
                      >
                        <input
                          type="text"
                          className="md:col-span-7 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          value={step.hanh_dong || ''}
                          onChange={(e) => {
                            const next = [...(formData.cac_buoc || [])];
                            next[idx] = {
                              ...next[idx],
                              hanh_dong: e.target.value,
                            };
                            setFormData({ ...formData, cac_buoc: next });
                          }}
                          placeholder={`Hành động #${idx + 1}`}
                        />
                        <textarea
                          rows={3}
                          className="md:col-span-4 w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-y"
                          value={step.ghi_chu || ''}
                          onChange={(e) => {
                            const next = [...(formData.cac_buoc || [])];
                            next[idx] = {
                              ...next[idx],
                              ghi_chu: e.target.value,
                            };
                            setFormData({ ...formData, cac_buoc: next });
                          }}
                          placeholder="Ghi chú (có thể nhập nhiều dòng)"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const next = (formData.cac_buoc || []).filter(
                              (_, i) => i !== idx,
                            );
                            setFormData({
                              ...formData,
                              cac_buoc:
                                next.length > 0
                                  ? next
                                  : [{ hanh_dong: '', ghi_chu: '' }],
                            });
                          }}
                          className="md:col-span-1 inline-flex items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
                          title="Xóa bước"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Đang lưu...' : 'Lưu Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

