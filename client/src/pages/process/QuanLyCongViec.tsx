import React, { useEffect, useMemo, useState } from 'react';
import { Search, Plus, CheckCircle2, Clock, AlertCircle, User, FileText, X } from 'lucide-react';
import { taskService, type TaskRow } from '../../lib/services/taskService';
import {
  taskTemplateService,
  type TaskTemplateRow,
} from '../../lib/services/taskTemplateService';
import { contractService } from '../../lib/services/contractService';
import { employeeService } from '../../lib/services/employeeService';
import {
  taskDetailService,
  type TaskDetailRow,
  type TaskDetailComment,
  type BuocDanhGia,
  DEFAULT_BUOC_DANH_GIA,
} from '../../lib/services/taskDetailService';
import { useNavigate, useSearchParams } from 'react-router-dom';

type StatusTab = 'all' | 'doing' | 'done' | 'pending';

function DocForm({
  task,
  mode,
  onSaved,
}: {
  task: TaskRow;
  mode: 'add' | 'edit';
  onSaved: (t: TaskRow) => void;
}) {
  const [ten, setTen] = useState('');
  const [link, setLink] = useState(mode === 'edit' ? task.link_tai_lieu || '' : '');
  const [mota, setMota] = useState('');
  const [saving, setSaving] = useState(false);

  return (
    <>
      <div className="p-5 space-y-3 text-xs">
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Tên tài liệu
          </label>
          <input
            value={ten}
            onChange={(e) => setTen(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            placeholder="VD: Kế hoạch marketing Q3/2024"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Link tài liệu
          </label>
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            placeholder="Dán link PDF / Google Drive..."
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
            Mô tả
          </label>
          <textarea
            value={mota}
            onChange={(e) => setMota(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            placeholder="Mô tả ngắn về tài liệu này..."
          />
        </div>
      </div>
      <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50">
        <button
          onClick={async () => {
            try {
              setSaving(true);
              const detail = await taskDetailService.getOrCreateByTaskId(task.id);
              if (!detail) {
                alert('Không tìm thấy bản ghi công việc chi tiết.');
                return;
              }
              const documents = link?.trim()
                ? [{ ten: ten?.trim() || 'Tài liệu đính kèm', link: link.trim(), mota: mota?.trim() || null }]
                : [];
              const updatedDetail = await taskDetailService.updateDocuments(detail.id, documents);
              const updatedTask = taskDetailService.mapToTaskRow(updatedDetail as any);
              onSaved(updatedTask);
            } catch (err) {
              console.error('[DocForm] Error saving document:', err);
              alert('Không lưu được tài liệu. Kiểm tra đã chạy migration add_cong_viec_tai_lieu.sql chưa.');
            } finally {
              setSaving(false);
            }
          }}
          className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm shadow-blue-500/30 disabled:opacity-60"
          disabled={saving}
        >
          Lưu tài liệu
        </button>
      </div>
    </>
  );
}

export function QuanLyCongViec() {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [selected, setSelected] = useState<TaskRow | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const taskIdFromUrl = searchParams.get('taskId');
  const [contracts, setContracts] = useState<
    Array<{ id: string; so_hop_dong: string; ten_goi_thau: string }>
  >([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docMode, setDocMode] = useState<'add' | 'edit'>('add');
  const [docPreviewUrl, setDocPreviewUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<
    Omit<TaskRow, 'id' | 'created_at' | 'updated_at'>
  >({
    hop_dong_id: '',
    ten_task: '',
    mo_ta: '',
    trang_thai: 'Chưa bắt đầu',
    uu_tien: 'Trung bình',
    ngay_bat_dau: '',
    ngay_ket_thuc: '',
    ngay_hoan_thanh: '',
    nguoi_phu_trach: '',
    tien_do: 0,
    ghi_chu: '',
    link_tai_lieu: '',
  });
  const [employees, setEmployees] = useState<
    Array<{ id: string; full_name: string; code: string; avatar?: string | null }>
  >([]);
  const [templateItems, setTemplateItems] = useState<TaskTemplateRow[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [detailTabState, setDetailTabState] = useState<
    'NOI_DUNG' | 'BINH_LUAN' | 'TAI_LIEU' | 'LICH_SU'
  >('NOI_DUNG');
  const [commentDraft, setCommentDraft] = useState<string>('');
  const [commentsByTask, setCommentsByTask] = useState<
    Record<
      string,
      { id: string; nhan_su: string; noi_dung: string; time: string }[]
    >
  >({});
  const [detailByTask, setDetailByTask] = useState<Record<string, TaskDetailRow>>({});
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);
  const [workflowTaskIds, setWorkflowTaskIds] = useState<string[]>([]);
  const [templateByTaskId, setTemplateByTaskId] = useState<Record<string, TaskTemplateRow>>({});
  const [showAddTaskDropdown, setShowAddTaskDropdown] = useState(false);
  const [addTaskCheckboxIds, setAddTaskCheckboxIds] = useState<string[]>([]);
  const [addTaskSaving, setAddTaskSaving] = useState(false);
  /** Tiêu chuẩn lưu jsonb `ten_task` khi Thêm mới / Lưu modal */
  const [tieuChuanForm, setTieuChuanForm] = useState({
    noi_dung_tieu_chuan: '',
    trang_thai_tieu_chuan: '' as string,
    ghi_chu_tieu_chuan: '',
  });
  /** Tiêu chuẩn khi Thêm task từ mẫu (Quy trình làm việc) */
  const [addTaskTieuForm, setAddTaskTieuForm] = useState({
    noi_dung_tieu_chuan: '',
    trang_thai_tieu_chuan: '',
    ghi_chu_tieu_chuan: '',
  });
  const [approveModal, setApproveModal] = useState<{
    open: boolean;
    detailId: string;
    stepIndex: number;
    buocDanhGia: BuocDanhGia[];
    step: BuocDanhGia;
    action: 'approve' | 'reject';
  } | null>(null);
  const [approveNote, setApproveNote] = useState('');
  const [approveSaving, setApproveSaving] = useState(false);
  const [checkedStandardsByTask, setCheckedStandardsByTask] = useState<
    Record<string, number[]>
  >({});
  const [standardStatusByTask, setStandardStatusByTask] = useState<
    Record<string, Record<number, 'none' | 'done' | 'fail'>>
  >({});

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [data, contractsData, employeesData, templatesData] = await Promise.all([
          taskDetailService.getAllAsTasks(),
          contractService.getAll(),
          employeeService.getAll(),
          taskTemplateService.getAll(),
        ]);
        setTasks(data || []);
        setContracts(
          (contractsData || []).map((c) => ({
            id: c.id,
            so_hop_dong: c.so_hop_dong || '',
            ten_goi_thau: c.ten_goi_thau || '',
          })),
        );
        setEmployees(
          (employeesData || []).map((e: any) => ({
            id: e.id?.toString(),
            full_name: e.full_name || e.name || e.hoTen || '',
            code: e.code || '',
            avatar: (e as any).anh_nhan_su || e.anh_nhan_su || null,
          })),
        );
        setTemplateItems(templatesData || []);
        if (data && data.length > 0) {
          const first = data[0];
          setSelected(first);
          const detail = await taskDetailService.getOrCreateByTaskId(first.id);
          if (detail) {
            setDetailByTask((prev) => ({ ...prev, [first.id]: detail }));
            setCommentsByTask((prev) => ({
              ...prev,
              [first.id]: (detail.binh_luan || []) as any,
            }));
          }
        }
      } catch (error) {
        console.error('[QuanLyCongViec] Error loading tasks:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = tasks;
    if (activeTab === 'doing') {
      list = list.filter((t) => t.trang_thai === 'Đang thực hiện');
    } else if (activeTab === 'done') {
      list = list.filter((t) => t.trang_thai === 'Hoàn thành');
    } else if (activeTab === 'pending') {
      list = list.filter((t) => t.trang_thai !== 'Hoàn thành');
    }
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.ten_task.toLowerCase().includes(term) ||
          (t.mo_ta || '').toLowerCase().includes(term),
      );
    }
    return list;
  }, [tasks, activeTab, search]);

  // Nếu có truyền `taskId` qua URL, tự chọn đúng task để người dùng bấm từ nơi khác.
  useEffect(() => {
    if (!taskIdFromUrl) return;
    // Đảm bảo task nằm trong filtered list.
    setActiveTab('all');
    setSearch('');

    const found = tasks.find((t) => String(t.id) === String(taskIdFromUrl));
    if (!found) return;

    setSelected(found);
    setDetailTabState('NOI_DUNG');

    (async () => {
      if (!detailByTask[found.id]) {
        const detail = await taskDetailService.getOrCreateByTaskId(found.id);
        if (detail) {
          setDetailByTask((prev) => ({ ...prev, [found.id]: detail }));
          setCommentsByTask((prev) => ({
            ...prev,
            [found.id]: (detail.binh_luan || []) as any,
          }));
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskIdFromUrl, tasks]);

  useEffect(() => {
    (async () => {
      // Nếu đang deep-link theo `taskId`, không tự đổi selected theo filtered.
      if (taskIdFromUrl) return;

      if (selected && !filtered.find((t) => t.id === selected.id)) {
        const next = filtered[0] || null;
        setSelected(next);
        setDetailTabState('NOI_DUNG');
        if (next && !detailByTask[next.id]) {
          const detail = await taskDetailService.getOrCreateByTaskId(next.id);
          if (detail) {
            setDetailByTask((prev) => ({ ...prev, [next.id]: detail }));
            setCommentsByTask((prev) => ({
              ...prev,
              [next.id]: (detail.binh_luan || []) as any,
            }));
          }
        }
      }
    })();
  }, [filtered, selected, detailByTask, taskIdFromUrl]);

  // Load detail (buoc_danh_gia) when selected task changes for right panel
  useEffect(() => {
    if (!selected) return;
    if (detailByTask[selected.id]) return;
    (async () => {
      const detail = await taskDetailService.getOrCreateByTaskId(selected.id);
      if (detail) {
        setDetailByTask((prev) => ({ ...prev, [selected.id]: detail }));
      }
    })();
  }, [selected?.id]);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'Hoàn thành':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Hoàn thành
          </span>
        );
      case 'Đang thực hiện':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3" />
            Đang làm
          </span>
        );
      case 'Tạm dừng':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-3 h-3" />
            Tạm dừng
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-50 text-slate-700 border border-slate-200">
            <Clock className="w-3 h-3" />
            Chưa bắt đầu
          </span>
        );
    }
  };

  const statusCounts = useMemo(() => {
    const all = tasks.length;
    const doing = tasks.filter((t) => t.trang_thai === 'Đang thực hiện').length;
    const done = tasks.filter((t) => t.trang_thai === 'Hoàn thành').length;
    const pending = tasks.filter((t) => t.trang_thai !== 'Hoàn thành').length;
    return { all, doing, done, pending };
  }, [tasks]);

  const handleSendComment = async () => {
    const content = commentDraft.trim();
    if (!content || !selected) return;
    try {
      const detail = detailByTask[selected.id]
        ? detailByTask[selected.id]
        : await taskDetailService.getOrCreateByTaskId(selected.id);
      if (!detail) return;
      const comment: TaskDetailComment = {
        nhan_su: 'Bạn',
        anh: null,
        noi_dung: content,
        time: new Date().toISOString(),
      };
      const updated = await taskDetailService.appendComment(detail.id, comment);
      setDetailByTask((prev) => ({ ...prev, [selected.id]: updated }));
      setCommentsByTask((prev) => ({
        ...prev,
        [selected.id]: (updated.binh_luan || []) as any,
      }));
      setCommentDraft('');
    } catch (err) {
      console.error('[QuanLyCongViec] Error saving comment:', err);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-3 space-y-4 h-[calc(100vh-96px)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 uppercase tracking-tight">
            Quản lý công việc
          </h1>
          <p className="text-sm text-slate-500">
            Xem nhanh danh sách công việc, chi tiết và quy trình duyệt.
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({
              hop_dong_id: '',
              ten_task: '',
              mo_ta: '',
              trang_thai: 'Chưa bắt đầu',
              uu_tien: 'Trung bình',
              ngay_bat_dau: '',
              ngay_ket_thuc: '',
              ngay_hoan_thanh: '',
              nguoi_phu_trach: '',
              tien_do: 0,
              ghi_chu: '',
              link_tai_lieu: '',
            });
            setTieuChuanForm({
              noi_dung_tieu_chuan: '',
              trang_thai_tieu_chuan: '',
              ghi_chu_tieu_chuan: '',
            });
            setSelectedEmployeeIds([]);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Thêm mới
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 h-[calc(100%-56px)]">
        {/* Danh sách công việc (trái) */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
          <div className="flex gap-1 text-[11px] font-semibold rounded-full bg-slate-100 p-1">
            {[
              {
                id: 'all',
                label: 'Tất cả',
                color: 'text-slate-700',
                count: statusCounts.all,
              },
              {
                id: 'doing',
                label: 'Đang làm',
                color: 'text-blue-700',
                count: statusCounts.doing,
              },
              {
                id: 'pending',
                label: 'Chờ duyệt',
                color: 'text-amber-700',
                count: statusCounts.pending,
              },
              {
                id: 'done',
                label: 'Đã xong',
                color: 'text-emerald-700',
                count: statusCounts.done,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as StatusTab)}
                className={`px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white shadow-sm'
                    : 'bg-transparent'
                }`}
              >
                <span
                  className={`${
                    activeTab === tab.id ? tab.color : 'text-slate-600'
                  }`}
                >
                  {tab.label}
                </span>
                <span
                  className={`inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold ${
                    tab.id === 'done'
                      ? 'bg-emerald-100 text-emerald-700'
                      : tab.id === 'doing'
                      ? 'bg-blue-100 text-blue-700'
                      : tab.id === 'pending'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
          </div>

          <div className="px-4 py-2 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nhập tên công việc"
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-slate-50"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {loading ? (
              <p className="px-4 py-4 text-xs text-slate-500">Đang tải công việc...</p>
            ) : filtered.length === 0 ? (
              <p className="px-4 py-4 text-xs text-slate-500">Không có công việc nào.</p>
            ) : (
              <div className="space-y-1">
                {filtered.map((task, index) => {
                  const isActive = selected && selected.id === task.id;
                  return (
                    <div
                      key={`${task.id}-${index}`}
                      className={`w-full px-3 py-2.5 border-l-4 flex items-center justify-between gap-2 ${
                        isActive
                          ? 'bg-blue-50 border-blue-500'
                          : 'bg-white border-transparent hover:bg-slate-50'
                      }`}
                    >
                      <button
                        onClick={() => setSelected(task)}
                        className="flex-1 text-left flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-slate-800 line-clamp-1">
                            {task.ten_task}
                          </span>
                          {task.hop_dong_id && (
                            <span className="text-[10px] text-slate-400">
                              {task.hop_dong_id}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1">
                            <div className="w-16 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500"
                                style={{ width: `${task.tien_do ?? 0}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-500">
                              {task.tien_do ?? 0}%
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500">
                            {task.trang_thai}
                          </span>
                        </div>
                      </button>
                      <div className="flex items-center gap-1">
                        <button
                          title="Sửa công việc"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData({
                              hop_dong_id: task.hop_dong_id || '',
                              ten_task: task.ten_task,
                              mo_ta: task.mo_ta || '',
                              trang_thai: task.trang_thai,
                              uu_tien: task.uu_tien,
                              ngay_bat_dau: task.ngay_bat_dau || '',
                              ngay_ket_thuc: task.ngay_ket_thuc || '',
                              ngay_hoan_thanh: task.ngay_hoan_thanh || '',
                              nguoi_phu_trach: task.nguoi_phu_trach || '',
                              tien_do: task.tien_do ?? 0,
                              ghi_chu: task.ghi_chu || '',
                              link_tai_lieu: task.link_tai_lieu || '',
                            });
                            const d = task.ten_task_detail;
                            setTieuChuanForm({
                              noi_dung_tieu_chuan: d?.noi_dung_tieu_chuan || '',
                              trang_thai_tieu_chuan: d?.trang_thai || '',
                              ghi_chu_tieu_chuan: d?.ghi_chu || '',
                            });
                            setIsModalOpen(true);
                          }}
                          className="w-6 h-6 flex items-center justify-center rounded-md border border-amber-200 text-amber-600 hover:bg-amber-50 text-[10px]"
                        >
                          S
                        </button>
                        <button
                          title="Xóa công việc"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (
                              !window.confirm(
                                'Bạn có chắc chắn muốn xóa công việc này?',
                              )
                            )
                              return;
                            (async () => {
                              try {
                                await taskDetailService.deleteByTaskId(task.id);
                                setTasks((prev) =>
                                  prev.filter((t) => t.id !== task.id),
                                );
                                if (selected && selected.id === task.id) {
                                  const next =
                                    filtered.find((t) => t.id !== task.id) ||
                                    null;
                                  setSelected(next);
                                }
                              } catch (err) {
                                console.error(
                                  '[QuanLyCongViec] Error deleting task:',
                                  err,
                                );
                                alert('Lỗi khi xóa công việc');
                              }
                            })();
                          }}
                          className="w-6 h-6 flex items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50 text-[10px]"
                        >
                          X
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Chi tiết công việc (giữa) */}
        <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col min-h-0">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800 line-clamp-2">
                {selected ? selected.ten_task : 'Chọn một công việc ở bên trái'}
              </h2>
              {selected && (
                <p className="text-xs text-slate-500 mt-0.5">
                  Mức ưu tiên: {selected.uu_tien} • Trạng thái:{' '}
                  <span className="font-semibold text-slate-700">
                    {selected.trang_thai}
                  </span>
                </p>
              )}
            </div>
            {selected && getStatusBadge(selected.trang_thai)}
          </div>

          <div className="p-5 space-y-4 text-xs text-slate-700 overflow-y-auto">
            {selected ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[11px] text-slate-500 mb-0.5">
                      Ngày bắt đầu
                    </div>
                    <div className="font-medium">
                      {selected.ngay_bat_dau
                        ? new Date(selected.ngay_bat_dau).toLocaleDateString('vi-VN')
                        : '--/--/----'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 mb-0.5">
                      Ngày kết thúc
                    </div>
                    <div className="font-medium">
                      {selected.ngay_ket_thuc
                        ? new Date(selected.ngay_ket_thuc).toLocaleDateString('vi-VN')
                        : '--/--/----'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 mb-0.5">
                      Người phụ trách
                    </div>
                    {selected.nguoi_phu_trach ? (
                      <div className="flex flex-wrap gap-1.5">
                        {selected.nguoi_phu_trach
                          .split(',')
                          .map((name) => name.trim())
                          .filter(Boolean)
                          .map((name) => {
                            const emp =
                              employees.find(
                                (e) =>
                                  e.full_name === name ||
                                  e.code === name,
                              ) || null;
                            const initials =
                              name
                                .split(' ')
                                .map((p) => p[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase() || '?';
                            return (
                              <span
                                key={name}
                                className="inline-flex items-center px-0.5 py-0.5"
                                title={name}
                              >
                                {emp?.avatar ? (
                                  <img
                                    src={emp.avatar}
                                    alt={name}
                                    className="h-7 w-7 rounded-full object-cover border border-slate-200"
                                  />
                                ) : (
                                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-[9px] font-semibold text-white">
                                    {initials}
                                  </span>
                                )}
                              </span>
                            );
                          })}
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-600">
                        <AlertCircle className="w-3 h-3" />
                        Chưa gán
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 mb-0.5">
                      Hợp đồng
                    </div>
                    <div className="font-medium text-slate-800">
                      {(() => {
                        if (!selected.hop_dong_id) return '---';
                        const c = contracts.find(
                          (ct) => ct.id === selected.hop_dong_id,
                        );
                        if (!c) return selected.hop_dong_id;
                        // Ưu tiên hiển thị theo tên hợp đồng
                        return c.ten_goi_thau || c.so_hop_dong || c.id;
                      })()}
                    </div>
                  </div>
                </div>

                {/* Tabs chi tiết: Nội dung / Bình luận / Tài liệu / Lịch sử */}
                <div className="mt-2">
                  <div className="border-b border-slate-200 flex gap-4 text-[11px] font-semibold">
                    {[
                      { id: 'NOI_DUNG', label: 'NỘI DUNG' },
                      { id: 'BINH_LUAN', label: 'BÌNH LUẬN' },
                      { id: 'TAI_LIEU', label: 'TÀI LIỆU' },
                      { id: 'LICH_SU', label: 'LỊCH SỬ' },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setDetailTabState(tab.id as any)}
                        className={`py-2 px-1 -mb-px border-b-2 ${
                          detailTabState === tab.id
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-400'
                        }`}
                      >
                        {tab.label}
                        {tab.id === 'BINH_LUAN' && (
                          <span className="ml-1 inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-500 text-[9px] px-1.5">
                            0
                          </span>
                        )}
                        {tab.id === 'TAI_LIEU' && (
                          <span className="ml-1 inline-flex items-center justify-center rounded-full bg-slate-100 text-slate-500 text-[9px] px-1.5">
                            {selected.link_tai_lieu ? 1 : 0}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {detailTabState === 'NOI_DUNG' && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-700 min-h-[80px]">
                      {selected.mo_ta || 'Chưa có mô tả cho công việc này.'}
                    </div>
                  )}

                  {detailTabState === 'TAI_LIEU' && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-700 min-h-[80px] flex flex-col gap-2">
                      {selected.link_tai_lieu ? (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800">
                              Tài liệu đính kèm
                            </span>
                            <div className="flex items-center gap-3">
                              <button
                                className="text-[11px] font-semibold text-slate-600 hover:underline"
                                onClick={() =>
                                  setDocPreviewUrl(selected.link_tai_lieu as string)
                                }
                              >
                                Xem trực tiếp
                              </button>
                              <button
                                className="text-[11px] font-semibold text-blue-600 hover:underline"
                                onClick={() => {
                                  setDocMode('edit');
                                  setIsDocModalOpen(true);
                                }}
                              >
                                Sửa tài liệu
                              </button>
                              <button
                                className="text-[11px] font-semibold text-emerald-600 hover:underline"
                                onClick={() => {
                                  setDocMode('add');
                                  setIsDocModalOpen(true);
                                }}
                              >
                                + Thêm tài liệu
                              </button>
                            </div>
                          </div>
                          <button
                            className="inline-flex items-center justify-center px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 w-fit"
                            title="Mở tài liệu đính kèm trong tab mới"
                            onClick={() =>
                              window.open(selected.link_tai_lieu as string, '_blank')
                            }
                          >
                            <FileText className="w-5 h-5 text-rose-500" />
                          </button>
                        </>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-500">
                            Chưa có tài liệu đính kèm cho công việc này.
                          </span>
                          <button
                            className="text-[11px] font-semibold text-blue-600 hover:underline"
                            onClick={() => {
                              setDocMode('add');
                              setIsDocModalOpen(true);
                            }}
                          >
                            + Thêm tài liệu
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {detailTabState === 'BINH_LUAN' && selected && (
                    <div className="mt-3 rounded-xl border border-slate-200 bg-white rounded-xl text-xs text-slate-700 min-h-[120px] flex flex-col">
                      <div className="flex-1 max-h-60 overflow-y-auto px-3 pt-3 space-y-2">
                        {(commentsByTask[selected.id] || []).length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic">
                            Chưa có bình luận nào cho công việc này.
                          </p>
                        ) : (
                          (commentsByTask[selected.id] || [])
                            .slice()
                            .sort(
                              (a, b) =>
                                new Date(a.time).getTime() -
                                new Date(b.time).getTime(),
                            )
                            .map((c, idx) => (
                              <div
                                key={(c as any).id || `${c.time}-${idx}`}
                                className="flex items-start gap-2"
                              >
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[9px] font-semibold text-white">
                                  {c.nhan_su
                                    .split(' ')
                                    .map((p) => p[0])
                                    .join('')
                                    .slice(0, 2)
                                    .toUpperCase()}
                                </span>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-semibold text-slate-700">
                                      {c.nhan_su}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {new Date(c.time).toLocaleString('vi-VN')}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 text-[11px] text-slate-700">
                                    {c.noi_dung}
                                  </p>
                                </div>
                              </div>
                            ))
                        )}
                      </div>
                      <div className="border-t border-slate-200 mt-2 px-3 py-2 flex gap-2">
                        <textarea
                          value={commentDraft}
                          onChange={(e) => setCommentDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendComment();
                            }
                          }}
                          rows={2}
                          className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                          placeholder="Nhập bình luận và nhấn Enter hoặc Gửi..."
                        />
                        <button
                          type="button"
                          onClick={handleSendComment}
                          disabled={!commentDraft.trim()}
                          className="self-end px-3 py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Gửi
                        </button>
                      </div>
                    </div>
                  )}

                  {detailTabState === 'LICH_SU' && (
                    <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-400 min-h-[80px] italic">
                      Lịch sử xử lý công việc sẽ hiển thị tại đây.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-xs text-slate-500">
                Hãy chọn một công việc trong danh sách bên trái để xem chi tiết.
              </div>
            )}
          </div>
        </div>

        {/* Quy trình làm việc (phải) */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
              Quy trình làm việc
            </h3>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowAddTaskDropdown((prev) => {
                    const next = !prev;
                    if (next) {
                      setAddTaskTieuForm({
                        noi_dung_tieu_chuan: '',
                        trang_thai_tieu_chuan: '',
                        ghi_chu_tieu_chuan: '',
                      });
                    }
                    return next;
                  });
                  if (!showAddTaskDropdown) setAddTaskCheckboxIds([]);
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-[11px] font-semibold hover:bg-blue-100"
              >
                <Plus className="w-3.5 h-3.5" />
                Thêm task
              </button>
              {showAddTaskDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    aria-hidden
                    onClick={() => setShowAddTaskDropdown(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 z-20 w-[22rem] max-h-[min(32rem,85vh)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg flex flex-col">
                    <div className="px-3 py-2 border-b border-slate-100 text-[11px] font-semibold text-slate-600">
                      Chọn task đưa vào quy trình (tickbox)
                    </div>
                    <div className="overflow-y-auto py-1 flex-1 min-h-0">
                      {templateItems.length === 0 ? (
                        <p className="px-3 py-2 text-[11px] text-slate-400">
                          Chưa có task nào.
                        </p>
                      ) : (
                        templateItems.map((tpl) => {
                          const checked = addTaskCheckboxIds.includes(tpl.id);
                          return (
                            <label
                              key={tpl.id}
                              className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 cursor-pointer text-[11px]"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setAddTaskCheckboxIds((prev) =>
                                    checked
                                      ? prev.filter((id) => id !== tpl.id)
                                      : [...prev, tpl.id],
                                  );
                                }}
                                className="h-3.5 w-3.5 rounded border-slate-300"
                              />
                              <span className="truncate text-slate-800">
                                {tpl.task || tpl.id.slice(0, 8)}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                    <div className="px-3 py-2 border-t border-slate-100 space-y-2 bg-slate-50/80">
                      <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">
                        Tiêu chuẩn (cột jsonb ten_task)
                      </p>
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                          Nội dung tiêu chuẩn (để trống = lấy từ mẫu)
                        </label>
                        <textarea
                          rows={2}
                          value={addTaskTieuForm.noi_dung_tieu_chuan}
                          onChange={(e) =>
                            setAddTaskTieuForm((p) => ({
                              ...p,
                              noi_dung_tieu_chuan: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[11px] bg-white"
                          placeholder="Ghi đè hoặc để trống dùng tiêu chuẩn mẫu"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                          Trạng thái
                        </label>
                        <select
                          value={addTaskTieuForm.trang_thai_tieu_chuan}
                          onChange={(e) =>
                            setAddTaskTieuForm((p) => ({
                              ...p,
                              trang_thai_tieu_chuan: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[11px] bg-white"
                        >
                          <option value="">Chưa đánh giá</option>
                          <option value="Đạt">Đạt</option>
                          <option value="Không đạt">Không đạt</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                          Ghi chú
                        </label>
                        <textarea
                          rows={2}
                          value={addTaskTieuForm.ghi_chu_tieu_chuan}
                          onChange={(e) =>
                            setAddTaskTieuForm((p) => ({
                              ...p,
                              ghi_chu_tieu_chuan: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[11px] bg-white"
                          placeholder="Ghi chú (jsonb)"
                        />
                      </div>
                    </div>
                    <div className="px-3 py-2 border-t border-slate-100">
                      <button
                        type="button"
                        disabled={addTaskCheckboxIds.length === 0 || addTaskSaving}
                        onClick={async () => {
                          if (addTaskCheckboxIds.length === 0) return;
                          setAddTaskSaving(true);
                          try {
                            const created: { task: TaskRow; template: TaskTemplateRow }[] = [];
                            for (const tplId of addTaskCheckboxIds) {
                              const tpl = templateItems.find((t) => t.id === tplId);
                              if (!tpl) continue;
                              const tenName = tpl.task || tpl.cv || 'Công việc mới';
                              const autoNoiDung = (tpl.tieu_chuan || [])
                                .map((t) => t.noi_dung)
                                .filter(Boolean)
                                .join('\n');
                              const noiDung =
                                addTaskTieuForm.noi_dung_tieu_chuan.trim() ||
                                autoNoiDung ||
                                (tpl.mo_ta || '');
                              const trangThaiTc =
                                addTaskTieuForm.trang_thai_tieu_chuan.trim() ||
                                'Chưa đánh giá';
                              const newTask = await taskDetailService.createFromForm({
                                ten_task: tenName,
                                mo_ta: tpl.mo_ta ?? null,
                                trang_thai: 'Chưa bắt đầu',
                                uu_tien: 'Trung bình',
                                tien_do: 0,
                                ghi_chu: null,
                                hop_dong_id: '',
                                noi_dung_tieu_chuan: noiDung,
                                trang_thai_tieu_chuan: trangThaiTc,
                                ghi_chu_tieu_chuan:
                                  addTaskTieuForm.ghi_chu_tieu_chuan.trim() || null,
                              });
                              created.push({ task: newTask, template: tpl });
                            }
                            if (created.length > 0) {
                              const newTasks = created.map((c) => c.task);
                              setTasks((prev) => [...newTasks, ...prev]);
                              setWorkflowTaskIds((prev) => [
                                ...prev,
                                ...newTasks.map((t) => t.id),
                              ]);
                              setTemplateByTaskId((prev) => {
                                const next = { ...prev };
                                created.forEach(({ task, template }) => {
                                  next[task.id] = template;
                                });
                                return next;
                              });
                              setSelected(newTasks[0]);
                              setShowAddTaskDropdown(false);
                              setAddTaskCheckboxIds([]);
                            }
                          } catch (err) {
                            console.error('[QuanLyCongViec] Error creating tasks from template:', err);
                          } finally {
                            setAddTaskSaving(false);
                          }
                        }}
                        className="w-full py-1.5 rounded-lg bg-blue-600 text-white text-[11px] font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {addTaskSaving ? 'Đang tạo...' : 'Thêm vào quy trình'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="p-4 space-y-4 text-xs overflow-y-auto flex-1">
            {/* Các nhóm task trong quy trình: tên group + checkbox tiêu chuẩn */}
            {workflowTaskIds.length > 0 ? (
              <div className="space-y-4">
                {workflowTaskIds.map((taskId) => {
                  const task = tasks.find((t) => t.id === taskId);
                  const template = templateByTaskId[taskId];
                  const statusMap = standardStatusByTask[taskId] || {};
                  const setStatus = (index: number, status: 'none' | 'done' | 'fail') => {
                    setStandardStatusByTask((prev) => ({
                      ...prev,
                      [taskId]: {
                        ...(prev[taskId] || {}),
                        [index]: status,
                      },
                    }));
                  };
                  return (
                    <div
                      key={taskId}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden"
                    >
                      <div className="px-3 py-2 bg-slate-100 border-b border-slate-200 space-y-1">
                        <p className="font-semibold text-slate-800 truncate">
                          {task?.ten_task || taskId.slice(0, 8)}
                        </p>
                        {task?.ten_task_detail?.trang_thai ? (
                          <p className="text-[10px] text-slate-600">
                            Trạng thái tiêu chuẩn:{' '}
                            <span className="font-semibold">{task.ten_task_detail.trang_thai}</span>
                            {task.ten_task_detail.ghi_chu ? (
                              <span className="text-slate-500"> · {task.ten_task_detail.ghi_chu}</span>
                            ) : null}
                          </p>
                        ) : null}
                        {task?.ten_task_detail?.noi_dung_tieu_chuan ? (
                          <p className="text-[10px] text-slate-500 line-clamp-2 whitespace-pre-wrap">
                            {task.ten_task_detail.noi_dung_tieu_chuan}
                          </p>
                        ) : null}
                      </div>
                      <div className="px-3 py-2 space-y-1.5">
                        {template?.tieu_chuan?.length ? (
                          template.tieu_chuan.map((tc, i) => (
                            <label
                              key={i}
                              className="flex flex-col gap-1 py-1 hover:bg-slate-100/80 rounded px-1 -mx-1"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-700">
                                  {tc.noi_dung}
                                  <span className="text-[10px] text-slate-500 ml-1">
                                    (Điểm: {tc.diem})
                                  </span>
                                </span>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setStatus(i, statusMap[i] === 'done' ? 'none' : 'done')
                                    }
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                      statusMap[i] === 'done'
                                        ? 'bg-emerald-500 text-white border-emerald-500'
                                        : 'bg-white text-emerald-700 border-emerald-300'
                                    }`}
                                  >
                                    Hoàn thành
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setStatus(i, statusMap[i] === 'fail' ? 'none' : 'fail')
                                    }
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                      statusMap[i] === 'fail'
                                        ? 'bg-red-500 text-white border-red-500'
                                        : 'bg-white text-red-600 border-red-300'
                                    }`}
                                  >
                                    Chưa đạt
                                  </button>
                                </div>
                              </div>
                            </label>
                          ))
                        ) : (
                          <p className="text-[11px] text-slate-500 italic">
                            Không có tiêu chuẩn
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Bước đánh giá (phê duyệt / từ chối) cho công việc đang chọn */}
                {selected && (
                  <>
                    <div className="border-t border-slate-200 pt-3 mt-3">
                      <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide mb-2">
                        Bước đánh giá — {selected.ten_task}
                      </p>
                    </div>
                    {(() => {
                      const detail = detailByTask[selected.id];
                      const steps = detail?.buoc_danh_gia ?? DEFAULT_BUOC_DANH_GIA;
                      const currentIndex = steps.findIndex((s) => s.trang_thai === 'cho');
                      return steps.map((step, idx) => {
                        const isCurrent = idx === (currentIndex === -1 ? steps.length - 1 : currentIndex);
                        const isApproved = step.trang_thai === 'da_duyet';
                        const isRejected = step.trang_thai === 'tu_choi';
                        return (
                          <div key={step.id} className="flex items-start gap-3 mb-3">
                            <div className="flex flex-col items-center gap-1">
                              <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                                  isApproved ? 'bg-emerald-100 text-emerald-700' : isRejected ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {idx + 1}
                              </span>
                              {idx < steps.length - 1 && (
                                <span className="w-px flex-1 min-h-[2px] bg-slate-200" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <p className="font-semibold text-slate-800">{step.ten}</p>
                                <span
                                  className={`text-[10px] font-semibold ${
                                    isApproved ? 'text-emerald-700' : isRejected ? 'text-red-600' : 'text-slate-500'
                                  }`}
                                >
                                  {isApproved ? 'Đã phê duyệt' : isRejected ? 'Đã từ chối' : isCurrent ? 'Bước hiện tại' : 'Chờ thực hiện'}
                                </span>
                              </div>
                              {isApproved && (
                                <div className="mt-1.5 rounded-lg bg-slate-50 border border-slate-100 px-2.5 py-1.5 text-[11px] text-slate-600 space-y-0.5">
                                  {step.nguoi_duyet && <p><span className="font-semibold">Người duyệt:</span> {step.nguoi_duyet}</p>}
                                  {step.ngay_gio && <p><span className="font-semibold">Thời gian:</span> {new Date(step.ngay_gio).toLocaleString('vi-VN')}</p>}
                                  {step.ghi_chu && <p><span className="font-semibold">Ghi chú:</span> {step.ghi_chu}</p>}
                                </div>
                              )}
                              {step.trang_thai === 'cho' && detail && (
                                <div className="mt-1.5 flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setApproveModal({ open: true, detailId: detail.id, stepIndex: idx, buocDanhGia: steps, step, action: 'approve' });
                                      setApproveNote('');
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-semibold hover:bg-blue-700"
                                  >
                                    Phê duyệt
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setApproveModal({ open: true, detailId: detail.id, stepIndex: idx, buocDanhGia: steps, step, action: 'reject' });
                                      setApproveNote('');
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-[11px] font-semibold hover:bg-red-100 border border-red-200"
                                  >
                                    Từ chối
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Dùng nút &quot;Thêm task&quot; để chọn template từ Danh sách Task và đưa vào quy trình. Mỗi task sẽ hiện dưới dạng nhóm, bên dưới là checkbox các tiêu chuẩn.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Modal phê duyệt / từ chối: ghi chú + xác nhận */}
      {approveModal?.open && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                {approveModal.action === 'approve' ? 'Phê duyệt' : 'Từ chối'} —{' '}
                {approveModal.step.ten}
              </h2>
              <button
                type="button"
                onClick={() => setApproveModal(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Ghi chú (tùy chọn)
                </label>
                <textarea
                  value={approveNote}
                  onChange={(e) => setApproveNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                  placeholder={
                    approveModal.action === 'approve'
                      ? 'Nhập ghi chú khi phê duyệt...'
                      : 'Nhập lý do từ chối...'
                  }
                />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setApproveModal(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={approveSaving}
                onClick={async () => {
                  const { detailId, stepIndex, buocDanhGia, action } = approveModal;
                  const next = [...buocDanhGia];
                  next[stepIndex] = {
                    ...next[stepIndex],
                    trang_thai: action === 'approve' ? 'da_duyet' : 'tu_choi',
                    nguoi_duyet: 'Người dùng',
                    ngay_gio: new Date().toISOString(),
                    ghi_chu: approveNote.trim() || null,
                  };
                  setApproveSaving(true);
                  try {
                    const updated = await taskDetailService.updateBuocDanhGia(
                      detailId,
                      next,
                    );
                    const taskId = selected?.id;
                    if (taskId) {
                      setDetailByTask((prev) => ({ ...prev, [taskId]: updated }));
                    }
                    setApproveModal(null);
                  } catch (err) {
                    console.error('[QuanLyCongViec] Error updating step:', err);
                  } finally {
                    setApproveSaving(false);
                  }
                }}
                className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {approveSaving
                  ? 'Đang lưu...'
                  : approveModal.action === 'approve'
                  ? 'Xác nhận phê duyệt'
                  : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Thêm công việc mới
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Hợp đồng
                  </label>
                  <select
                    value={formData.hop_dong_id || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        hop_dong_id: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">-- Chọn hợp đồng (không bắt buộc) --</option>
                    {contracts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.ten_goi_thau || c.so_hop_dong || c.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Người phụ trách
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEmployeeDropdown((prev) => !prev)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-50 flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <span className="truncate text-left">
                        {selectedEmployeeIds.length === 0
                          ? 'Chọn nhân sự phụ trách'
                          : `${selectedEmployeeIds.length} nhân sự được chọn`}
                      </span>
                      <span className="ml-2 text-[10px] text-slate-500">
                        {showEmployeeDropdown ? '▲' : '▼'}
                      </span>
                    </button>
                    {showEmployeeDropdown && (
                      <div className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-lg max-h-44 overflow-y-auto">
                        {employees.length === 0 ? (
                          <p className="px-3 py-2 text-[11px] text-slate-400">
                            Chưa có dữ liệu nhân sự.
                          </p>
                        ) : (
                          <ul className="py-1">
                            {employees.map((emp) => {
                              const checked = selectedEmployeeIds.includes(emp.id);
                              return (
                                <li
                                  key={emp.id}
                                  className="px-3 py-1.5 hover:bg-slate-50 text-[11px] flex items-center gap-2"
                                >
                                  <input
                                    type="checkbox"
                                    className="h-3 w-3"
                                    checked={checked}
                                    onChange={() => {
                                      setSelectedEmployeeIds((prev) =>
                                        checked
                                          ? prev.filter((id) => id !== emp.id)
                                          : [...prev, emp.id],
                                      );
                                    }}
                                  />
                                  <span className="truncate">
                                    {emp.full_name || emp.code}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Tên công việc *
                </label>
                <input
                  value={formData.ten_task}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, ten_task: e.target.value }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Nhập tên công việc"
                />
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 space-y-3">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                  Tiêu chuẩn (cột jsonb ten_task)
                </p>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Nội dung tiêu chuẩn
                  </label>
                  <textarea
                    rows={3}
                    value={tieuChuanForm.noi_dung_tieu_chuan}
                    onChange={(e) =>
                      setTieuChuanForm((p) => ({
                        ...p,
                        noi_dung_tieu_chuan: e.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Mô tả tiêu chuẩn cần đạt..."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Trạng thái
                    </label>
                    <select
                      value={tieuChuanForm.trang_thai_tieu_chuan}
                      onChange={(e) =>
                        setTieuChuanForm((p) => ({
                          ...p,
                          trang_thai_tieu_chuan: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    >
                      <option value="">Chưa đánh giá</option>
                      <option value="Đạt">Đạt</option>
                      <option value="Không đạt">Không đạt</option>
                    </select>
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Ghi chú (tiêu chuẩn)
                    </label>
                    <textarea
                      rows={2}
                      value={tieuChuanForm.ghi_chu_tieu_chuan}
                      onChange={(e) =>
                        setTieuChuanForm((p) => ({
                          ...p,
                          ghi_chu_tieu_chuan: e.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      placeholder="Ghi chú lưu trong jsonb ten_task"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Mức ưu tiên
                  </label>
                  <select
                    value={formData.uu_tien}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, uu_tien: e.target.value as any }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Thấp">Thấp</option>
                    <option value="Trung bình">Trung bình</option>
                    <option value="Cao">Cao</option>
                    <option value="Khẩn cấp">Khẩn cấp</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Ngày bắt đầu
                  </label>
                  <input
                    type="date"
                    value={formData.ngay_bat_dau || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, ngay_bat_dau: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Ngày kết thúc
                  </label>
                  <input
                    type="date"
                    value={formData.ngay_ket_thuc || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, ngay_ket_thuc: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Mô tả
                </label>
                <textarea
                  value={formData.mo_ta || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, mo_ta: e.target.value }))
                  }
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Nhập mô tả chi tiết công việc..."
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Link tài liệu (PDF, Google Drive, ...)
                </label>
                <input
                  value={formData.link_tai_lieu || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      link_tai_lieu: e.target.value,
                    }))
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  placeholder="Dán link tài liệu liên quan tới công việc"
                />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-2 bg-slate-50">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                disabled={saving}
              >
                Hủy
              </button>
              <button
                onClick={async () => {
                  if (!formData.ten_task.trim()) {
                    alert('Vui lòng nhập tên công việc');
                    return;
                  }
                  const nguoiPhuTrachStr =
                    selectedEmployeeIds
                      .map(
                        (id) =>
                          employees.find((e) => e.id === id)?.full_name ||
                          employees.find((e) => e.id === id)?.code ||
                          '',
                      )
                      .filter(Boolean)
                      .join(', ') || formData.nguoi_phu_trach || '';
                  try {
                    setSaving(true);
                    const payload = {
                      ten_task: formData.ten_task,
                      mo_ta: formData.mo_ta || null,
                      trang_thai: formData.trang_thai,
                      uu_tien: formData.uu_tien,
                      ngay_bat_dau: formData.ngay_bat_dau || null,
                      ngay_ket_thuc: formData.ngay_ket_thuc || null,
                      ngay_hoan_thanh: formData.ngay_hoan_thanh || null,
                      nguoi_phu_trach: nguoiPhuTrachStr || null,
                      tien_do: formData.tien_do ?? 0,
                      ghi_chu: formData.ghi_chu || null,
                      hop_dong_id: formData.hop_dong_id || null,
                      noi_dung_tieu_chuan: tieuChuanForm.noi_dung_tieu_chuan || null,
                      trang_thai_tieu_chuan:
                        tieuChuanForm.trang_thai_tieu_chuan.trim() || 'Chưa đánh giá',
                      ghi_chu_tieu_chuan: tieuChuanForm.ghi_chu_tieu_chuan || null,
                    };
                    const created = await taskDetailService.createFromForm(payload);
                    const data = await taskDetailService.getAllAsTasks();
                    setTasks(data || []);
                    setSelected(
                      data.find((t) => t.id === created.id) || data[0] || null,
                    );
                    setIsModalOpen(false);
                  } catch (error) {
                    console.error('[QuanLyCongViec] Error creating task:', error);
                    alert('Lỗi khi thêm công việc');
                  } finally {
                    setSaving(false);
                  }
                }}
                className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm shadow-blue-500/30 disabled:opacity-60"
                disabled={saving}
              >
                Lưu công việc
              </button>
            </div>
          </div>
        </div>
      )}

      {isDocModalOpen && selected && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                {docMode === 'edit'
                  ? 'Sửa tài liệu đính kèm'
                  : 'Thêm tài liệu cho công việc'}
              </h2>
              <button
                onClick={() => setIsDocModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <DocForm
              task={selected}
              mode={docMode}
              onSaved={(updated) => {
                setTasks((prev) =>
                  prev.map((t) => (t.id === updated.id ? updated : t)),
                );
                setSelected(updated);
                setIsDocModalOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {docPreviewUrl && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Xem tài liệu đính kèm
              </h2>
              <button
                onClick={() => setDocPreviewUrl(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 bg-slate-100">
              <iframe
                src={docPreviewUrl}
                title="Tài liệu đính kèm"
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

