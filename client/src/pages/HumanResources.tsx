import React, { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { parse, parseISO } from 'date-fns';
import { employeeService, type Employee } from '../lib/services/employeeService';
import { testNhanSuConnection } from '../lib/utils/testDatabaseConnection';
import { useNhanSuModal } from '../contexts/NhanSuModalContext';
import { ExcelImportExportBar } from '../components/ExcelImportExportBar';
import type { ExcelColumnDef } from '../lib/excelTableTools';

function MIcon({
  name,
  className = 'text-lg',
  style,
}: {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span className={`material-symbols-outlined ${className}`} style={style} aria-hidden>
      {name}
    </span>
  );
}

function parseJoinDate(raw: string | undefined): Date | null {
  if (!raw) return null;
  try {
    if (raw.includes('/')) {
      const d = parse(raw, 'dd/MM/yyyy', new Date());
      return Number.isNaN(d.getTime()) ? null : d;
    }
    if (raw.includes('-')) {
      const d = parseISO(raw);
      return Number.isNaN(d.getTime()) ? null : d;
    }
  } catch {
    return null;
  }
  return null;
}

function countJoinedInMonth(emps: Employee[], year: number, month: number): number {
  return emps.filter((e) => {
    const raw = e.ngayVaoLam || e.joinDate;
    const d = parseJoinDate(raw);
    return d && d.getFullYear() === year && d.getMonth() === month;
  }).length;
}

function getPaginationRange(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 1) return [1];
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const s = new Set(
    [1, total, current, current - 1, current + 1].filter((n) => n >= 1 && n <= total),
  );
  const arr = [...s].sort((a, b) => a - b);
  const out: (number | 'ellipsis')[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (i > 0 && arr[i] - arr[i - 1] > 1) out.push('ellipsis');
    out.push(arr[i]);
  }
  return out;
}

export function HumanResources() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const { openChiTietNhanVien } = useNhanSuModal();

  const nhanSuExcelColumns: ExcelColumnDef[] = [
    { key: 'ho_ten', header: 'Họ và tên', example: 'Nguyễn Văn A' },
    { key: 'ma_nhan_vien', header: 'Mã nhân viên', example: 'Để trống = tự sinh' },
    { key: 'email', header: 'Email', example: 'a@company.com' },
    { key: 'sdt', header: 'Số điện thoại', example: '0901234567' },
    { key: 'phong_ban', header: 'Phòng ban', example: 'Kỹ thuật' },
    { key: 'chuc_vu', header: 'Chức vụ', example: 'Nhân viên' },
  ];

  useEffect(() => {
    testNhanSuConnection().then(() => {});
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await employeeService.getAll();

      const normalizedData = (data || []).map((emp: any) => ({
        ...emp,
        code: emp.code || emp.ma_nv || emp.employee_code || '',
        full_name: emp.full_name || emp.name || emp.hoTen || emp.ho_ten || '',
        phongBan: emp.phong_ban || emp.phongBan || emp.department || '',
        chucVu: emp.chuc_vu || emp.chucVu || emp.position || '',
        email: emp.email || '',
        phone: emp.sdt_nhan_vien || emp.sdtNhanVien || emp.phone || emp.dien_thoai || '',
        status: emp.status || 'active',
        ngayVaoLam: emp.ngay_vao_lam || emp.ngayVaoLam || emp.joinDate || '',
        anh_nhan_su: emp.anh_nhan_su || null,
      }));

      setEmployees(normalizedData);
    } catch (err: any) {
      const errorMessage = err.message || 'Có lỗi xảy ra khi tải dữ liệu';
      setError(errorMessage);
      console.error('Error loading employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = searchTerm
    ? employees.filter((emp) => {
        const q = searchTerm.toLowerCase();
        const ten =
          (emp as any).full_name || emp.name || (emp as any).hoTen || (emp as any).ho_ten || '';
        return (
          String(ten).toLowerCase().includes(q) ||
          (emp.phongBan || emp.department || (emp as any).phong_ban || '')
            .toLowerCase()
            .includes(q) ||
          (emp.email || '').toLowerCase().includes(q)
        );
      })
    : employees;

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / itemsPerPage));

  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [filteredEmployees.length, itemsPerPage, totalPages]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentEmployees = filteredEmployees.slice(startIndex, startIndex + itemsPerPage);

  const stats = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const newThisMonth = countJoinedInMonth(employees, y, m);
    const prev = m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 };
    const newPrevMonth = countJoinedInMonth(employees, prev.y, prev.m);
    const pctVsPrev =
      newPrevMonth > 0
        ? (((newThisMonth - newPrevMonth) / newPrevMonth) * 100).toFixed(1)
        : newThisMonth > 0
          ? '100'
          : '0';

    const workingCount = employees.filter((e) => (e.status || 'active') === 'active').length;
    const leaveCount = employees.filter((e) => e.status === 'on-leave').length;
    const participation =
      employees.length > 0 ? Math.round((workingCount / employees.length) * 100) : 0;

    return {
      newThisMonth,
      pctVsPrev,
      workingCount,
      leaveCount,
      participation,
    };
  }, [employees]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-3 py-1 bg-[#00322d]/10 text-[#2ca397] text-[10px] font-bold uppercase rounded-full border border-[#00322d]/20">
            Đang làm việc
          </span>
        );
      case 'inactive':
        return (
          <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded-full border border-slate-200">
            Nghỉ việc
          </span>
        );
      case 'on-leave':
        return (
          <span className="px-3 py-1 bg-[#ffdad6]/80 text-[#93000a] text-[10px] font-bold uppercase rounded-full border border-[#ffdad6]">
            Đang nghỉ phép
          </span>
        );
      default:
        return null;
    }
  };

  const handleView = async (employee: Employee) => {
    openChiTietNhanVien(employee);
  };

  const handleEdit = (id: string | number) => {
    navigate(`/nhan-su/them/${id}`);
  };

  const handleDelete = async (id: string | number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa nhân viên này?')) {
      try {
        await employeeService.delete(id);
        await loadEmployees();
      } catch (err: any) {
        alert('Có lỗi xảy ra khi xóa nhân viên: ' + (err.message || 'Unknown error'));
      }
    }
  };

  const pageItems = getPaginationRange(currentPage, totalPages);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 [font-family:Inter,system-ui,sans-serif]">
      {/* Page header — TalentCurator-style */}
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0b1c30] mb-2 [font-family:Manrope,system-ui,sans-serif]">
            QUẢN LÝ NHÂN SỰ
          </h1>
          <p className="text-[#44474e] font-medium">Danh sách nhân sự toàn hệ thống</p>
        </div>
        <div className="flex flex-col lg:flex-row flex-wrap items-stretch lg:items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <MIcon
              name="search"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#44474e] text-lg pointer-events-none"
            />
            <input
              type="text"
              placeholder="Tìm kiếm nhân viên..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-[#eff4ff] border-none rounded-lg text-sm text-[#0b1c30] placeholder:text-slate-400 focus:ring-2 focus:ring-[#031635]/20 transition-all"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 lg:ml-auto">
          <div className="[&_button]:rounded-lg [&_button]:border-[#c5c6cf]/30 [&_button]:text-[#364768] [&_button]:bg-[#dce9ff] [&_button]:hover:brightness-105 [&_button]:text-sm [&_button]:font-semibold">
            <ExcelImportExportBar
              compact
              columns={nhanSuExcelColumns}
              templateFileName="mau-nhan-su"
              sheetName="Nhan su"
              onImport={async (rows) => {
                const errors: string[] = [];
                let ok = 0;
                for (let i = 0; i < rows.length; i++) {
                  const r = rows[i];
                  const hoten = (r.ho_ten || '').trim();
                  if (!hoten) {
                    errors.push(`Dòng ${i + 2}: thiếu Họ và tên`);
                    continue;
                  }
                  const uuid =
                    typeof crypto !== 'undefined' && 'randomUUID' in crypto
                      ? crypto.randomUUID()
                      : `${Date.now()}-${i}`;
                  const code =
                    (r.ma_nhan_vien || '').trim() || `NV-${uuid}`.replace(/[^a-zA-Z0-9-]/g, '').slice(0, 48);
                  try {
                    await employeeService.create({
                      code,
                      full_name: hoten,
                      name: hoten,
                      email: r.email?.trim() || undefined,
                      phone: r.sdt?.trim() || undefined,
                      sdtNhanVien: r.sdt?.trim() || undefined,
                      department: r.phong_ban?.trim() || undefined,
                      phongBan: r.phong_ban?.trim() || undefined,
                      position: r.chuc_vu?.trim() || undefined,
                      chucVu: r.chuc_vu?.trim() || undefined,
                      status: 'active',
                    });
                    ok++;
                  } catch (e: any) {
                    errors.push(`Dòng ${i + 2}: ${e?.message || 'Lỗi'}`);
                  }
                }
                return { ok, errors };
              }}
              onDone={() => loadEmployees()}
            />
          </div>
          <Link
            to="/nhan-su/lich-lam-viec"
            className="flex items-center gap-2 px-4 py-2.5 bg-[#dce9ff] text-[#364768] font-semibold text-sm rounded-lg hover:brightness-105 transition-all active:scale-95"
          >
            <MIcon name="calendar_month" className="text-lg" />
            Lịch làm việc
          </Link>
          <button
            type="button"
            onClick={() => navigate('/nhan-su/them')}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[#031635] to-[#1a2b4b] text-white font-semibold text-sm rounded-lg shadow-lg shadow-[#031635]/10 hover:brightness-110 transition-all active:scale-95"
          >
            <MIcon name="person_add" className="text-lg" />
            Thêm nhân viên
          </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-[#c5c6cf]/15 overflow-hidden">
        {loading && (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#031635] mx-auto mb-2" />
            <p className="text-sm text-[#44474e]">Đang tải dữ liệu...</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-12 text-center">
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <button
              type="button"
              onClick={loadEmployees}
              className="px-4 py-2 bg-[#031635] text-white rounded-lg hover:brightness-110 transition-colors"
            >
              Thử lại
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead className="bg-[#1a2b4b]">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold text-[#8293b8] uppercase tracking-wider">
                      Họ tên &amp; Ảnh
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-[#8293b8] uppercase tracking-wider">
                      Phòng ban
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-[#8293b8] uppercase tracking-wider">
                      Chức vụ
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-[#8293b8] uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-[#8293b8] uppercase tracking-wider">
                      Số điện thoại
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-[#8293b8] uppercase tracking-wider text-center">
                      Trạng thái
                    </th>
                    <th className="px-6 py-4 text-xs font-bold text-[#8293b8] uppercase tracking-wider text-right">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c5c6cf]/10">
                  {currentEmployees.length > 0 ? (
                    currentEmployees.map((employee, index) => {
                      const avatarUrl = (employee as any).anh_nhan_su || employee.anh_nhan_su;
                      const name =
                        employee.full_name ||
                        employee.name ||
                        employee.hoTen ||
                        (employee as any).ho_ten ||
                        '(Trống)';
                      const zebra = index % 2 === 1 ? 'bg-[#eff4ff]/40' : '';
                      return (
                        <tr
                          key={employee.id}
                          className={`hover:bg-[#dce9ff]/60 transition-colors group ${zebra}`}
                        >
                          <td className="px-6 py-5 align-middle">
                            <div className="flex items-center gap-4 min-w-[14rem]">
                              <div className="relative h-[4.5rem] w-[4.5rem] sm:h-[5rem] sm:w-[5rem] shrink-0 rounded-full bg-gradient-to-br from-[#d8e2ff] via-[#b6c6ef] to-[#8293b8]/90 p-[3px] shadow-[0_8px_24px_rgba(3,22,53,0.14),0_2px_6px_rgba(3,22,53,0.06)]">
                                <div className="h-full w-full rounded-full overflow-hidden bg-[#eff4ff] ring-[1.5px] ring-white/90">
                                  {avatarUrl && String(avatarUrl).trim() !== '' ? (
                                    <img
                                      src={avatarUrl}
                                      alt={name}
                                      className="h-full w-full object-cover object-center scale-[1.02]"
                                      loading="lazy"
                                      decoding="async"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src =
                                          'https://ui-avatars.com/api/?background=1a2b4b&color=fff&size=256&bold=true&name=' +
                                          encodeURIComponent(name);
                                      }}
                                    />
                                  ) : (
                                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-[#1a2b4b] to-[#031635] text-white text-xl font-bold tracking-tight">
                                      {name.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="min-w-0 flex flex-col justify-center">
                                <span className="font-semibold text-[#0b1c30] text-[15px] sm:text-base leading-snug tracking-tight">
                                  {name}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-[#44474e] font-medium">
                            {employee.phongBan || employee.department || (employee as any).phong_ban || '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-[#44474e]">
                            {(employee as any).chuc_vu || employee.chucVu || employee.position || '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-[#44474e] italic">
                            {employee.email || '—'}
                          </td>
                          <td className="px-6 py-4 text-sm text-[#44474e]">
                            {(employee as any).sdt_nhan_vien ||
                              employee.sdtNhanVien ||
                              employee.phone ||
                              employee.dien_thoai ||
                              '—'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            {getStatusBadge(employee.status || 'active')}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleView(employee)}
                                className="p-2 text-[#44474e] hover:text-[#031635] hover:bg-white rounded-lg transition-all"
                                title="Xem"
                              >
                                <MIcon name="visibility" className="text-lg" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEdit(employee.id)}
                                className="p-2 text-[#44474e] hover:text-[#43617c] hover:bg-white rounded-lg transition-all"
                                title="Sửa"
                              >
                                <MIcon name="edit" className="text-lg" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(employee.id)}
                                className="p-2 text-[#44474e] hover:text-[#ba1a1a] hover:bg-white rounded-lg transition-all"
                                title="Xóa"
                              >
                                <MIcon name="delete" className="text-lg" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-[#44474e]">
                        <p className="text-sm mb-2">Không có dữ liệu nhân sự</p>
                        <button
                          type="button"
                          onClick={() => navigate('/nhan-su/them')}
                          className="mt-2 px-5 py-2.5 text-sm font-semibold bg-gradient-to-br from-[#031635] to-[#1a2b4b] text-white rounded-lg shadow-md hover:brightness-110"
                        >
                          Thêm nhân viên đầu tiên
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-6 py-4 bg-[#eff4ff]/50 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#c5c6cf]/10">
              <div className="flex flex-wrap items-center gap-6 text-sm text-[#44474e]">
                <span className="font-medium">
                  Tổng cộng:{' '}
                  <span className="text-[#031635] font-bold">{filteredEmployees.length}</span> bản ghi
                </span>
                <div className="flex items-center gap-2">
                  <span>Hiển thị</span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="bg-white border border-[#c5c6cf]/30 rounded px-2 py-1 text-xs text-[#0b1c30] focus:ring-1 focus:ring-[#031635] outline-none"
                  >
                    <option value={10}>10 bản ghi</option>
                    <option value={20}>20 bản ghi</option>
                    <option value={50}>50 bản ghi</option>
                    <option value={100}>100 bản ghi</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#c5c6cf]/30 hover:bg-white text-[#44474e] transition-colors disabled:opacity-40"
                >
                  <MIcon name="first_page" className="text-sm" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#c5c6cf]/30 hover:bg-white text-[#44474e] transition-colors disabled:opacity-40"
                >
                  <MIcon name="chevron_left" className="text-sm" />
                </button>
                <div className="flex items-center gap-1">
                  {pageItems.map((item, idx) =>
                    item === 'ellipsis' ? (
                      <span key={`e-${idx}`} className="px-1 text-[#44474e]">
                        ...
                      </span>
                    ) : (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setCurrentPage(item)}
                        className={`h-8 w-8 flex items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                          currentPage === item
                            ? 'bg-[#031635] text-white shadow-md shadow-[#031635]/20'
                            : 'hover:bg-white text-[#44474e]'
                        }`}
                      >
                        {item}
                      </button>
                    ),
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#c5c6cf]/30 hover:bg-white text-[#44474e] transition-colors disabled:opacity-40"
                >
                  <MIcon name="chevron_right" className="text-sm" />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages}
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-[#c5c6cf]/30 hover:bg-white text-[#44474e] transition-colors disabled:opacity-40"
                >
                  <MIcon name="last_page" className="text-sm" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bento stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="p-6 bg-white rounded-xl shadow-sm border border-[#c5c6cf]/15 flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-[#44474e]/60 uppercase tracking-widest mb-1">
              Mới trong tháng
            </p>
            <h4 className="text-2xl font-extrabold text-[#031635] [font-family:Manrope,system-ui,sans-serif]">
              +{stats.newThisMonth}
            </h4>
          </div>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-[#2ca397] font-bold px-2 py-0.5 bg-[#00322d]/10 w-fit rounded-full">
            <MIcon name="trending_up" className="text-xs" />
            {stats.pctVsPrev}% So với tháng trước
          </div>
        </div>
        <div className="p-6 bg-white rounded-xl shadow-sm border border-[#c5c6cf]/15 flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-[#44474e]/60 uppercase tracking-widest mb-1">
              Đang làm việc
            </p>
            <h4 className="text-2xl font-extrabold text-[#031635] [font-family:Manrope,system-ui,sans-serif]">
              {stats.workingCount}
            </h4>
          </div>
          <p className="mt-4 text-[10px] text-[#44474e] font-medium">
            {stats.participation}% tỷ lệ tham gia
          </p>
        </div>
        <div className="p-6 bg-white rounded-xl shadow-sm border border-[#c5c6cf]/15 flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-[#44474e]/60 uppercase tracking-widest mb-1">
              Nghỉ phép/Lễ
            </p>
            <h4 className="text-2xl font-extrabold text-[#43617c] [font-family:Manrope,system-ui,sans-serif]">
              {String(stats.leaveCount).padStart(2, '0')}
            </h4>
          </div>
          <div className="mt-4 flex items-center gap-2 text-[10px] text-[#46647e] font-bold px-2 py-0.5 bg-[#c1e0ff]/40 w-fit rounded-full">
            <MIcon name="event_available" className="text-xs" />
            Hôm nay
          </div>
        </div>
        <div className="p-6 bg-[#031635] text-white rounded-xl shadow-lg shadow-[#031635]/20 flex flex-col justify-between overflow-hidden relative">
          <div className="relative z-10">
            <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-1">
              Đánh giá trung bình
            </p>
            <h4 className="text-2xl font-extrabold [font-family:Manrope,system-ui,sans-serif]">4.8 / 5.0</h4>
          </div>
          <div className="relative z-10 mt-4 flex items-center gap-0.5">
            <MIcon name="star" className="text-xs text-[#89f5e7]" style={{ fontVariationSettings: "'FILL' 1" }} />
            <MIcon name="star" className="text-xs text-[#89f5e7]" style={{ fontVariationSettings: "'FILL' 1" }} />
            <MIcon name="star" className="text-xs text-[#89f5e7]" style={{ fontVariationSettings: "'FILL' 1" }} />
            <MIcon name="star" className="text-xs text-[#89f5e7]" style={{ fontVariationSettings: "'FILL' 1" }} />
            <MIcon name="star_half" className="text-xs text-[#89f5e7]" />
          </div>
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        </div>
      </div>

      <button
        type="button"
        onClick={() => navigate('/nhan-su/them')}
        className="fixed bottom-8 right-8 h-14 w-14 bg-[#031635] text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40"
        aria-label="Thêm nhân viên"
      >
        <MIcon name="add" className="text-3xl" />
      </button>
    </div>
  );
}
