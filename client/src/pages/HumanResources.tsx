import React, { useState, useEffect } from 'react';
import { addMonths, isBefore, parse, parseISO, startOfDay } from 'date-fns';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CheckSquare,
  Square,
  Loader2,
  X,
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Calendar as CalendarIcon,
  FileText,
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { employeeService, type Employee } from '../lib/services/employeeService';
import { testNhanSuConnection } from '../lib/utils/testDatabaseConnection';
import { certificateService, type ProfessionalCertificate } from '../lib/services/certificateService';
import { dependentPersonService, type DependentPerson } from '../lib/services/dependentPersonService';
import { contractService, ContractRow } from '../lib/services/contractService';
import { thuChiService, ThuChiRow } from '../lib/services/thuChiService';
import { projectService } from '../lib/services/projectService';
import { useNhanSuModal } from '../contexts/NhanSuModalContext';

export function HumanResources() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingThuChi, setLoadingThuChi] = useState(false);
  const { openChiTietNhanVien } = useNhanSuModal();
  const itemsPerPage = 10;

  // Load employees from Supabase
  useEffect(() => {
    // Test connection first
    testNhanSuConnection().then(result => {
      // test result handled
    });
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await employeeService.getAll();

      // Normalize dữ liệu để đảm bảo có các trường cần thiết
      const normalizedData = (data || []).map((emp: any) => ({
        ...emp,
        // Đảm bảo có các trường fallback - ưu tiên snake_case từ database
        code: emp.code || emp.ma_nv || emp.employee_code || '',
        full_name: emp.full_name || emp.name || emp.hoTen || emp.ho_ten || '',
        phongBan: emp.phong_ban || emp.phongBan || emp.department || '',
        chucVu: emp.chuc_vu || emp.chucVu || emp.position || '',
        email: emp.email || '',
        phone: emp.sdt_nhan_vien || emp.sdtNhanVien || emp.phone || emp.dien_thoai || '',
        status: emp.status || 'active',
        ngayVaoLam: emp.ngay_vao_lam || emp.ngayVaoLam || emp.joinDate || '',
        // Giữ lại anh_nhan_su từ database (snake_case)
        anh_nhan_su: emp.anh_nhan_su || null
      }));
      
      console.log('[HumanResources] Normalized employees with avatars:', normalizedData.map((e: any) => ({
        name: e.full_name,
        avatar: e.anh_nhan_su
      })));

      setEmployees(normalizedData);
    } catch (err: any) {
      const errorMessage = err.message || 'Có lỗi xảy ra khi tải dữ liệu';
      setError(errorMessage);
      console.error('Error loading employees:', err);
      console.error('Error details:', {
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string | number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const isSelected = (id: string | number) => selectedIds.includes(id);

  const isAllSelected = employees.length > 0 && employees.every(emp => selectedIds.includes(emp.id));

  const toggleSelectAll = () => {
    setSelectedIds(isAllSelected ? [] : employees.map(emp => emp.id));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-600 rounded-md">Đang làm việc</span>;
      case 'inactive':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-600 rounded-md">Nghỉ việc</span>;
      case 'on-leave':
        return <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-600 rounded-md">Nghỉ phép</span>;
      default:
        return null;
    }
  };

  const parseExpiryDate = (value: string): Date | null => {
    if (!value) return null;
    try {
      if (value.includes('/')) {
        const d = parse(value, 'dd/MM/yyyy', new Date());
        return Number.isNaN(d.getTime()) ? null : d;
      }
      if (value.includes('-')) {
        const d = parseISO(value);
        return Number.isNaN(d.getTime()) ? null : d;
      }
      return null;
    } catch {
      return null;
    }
  };

  const isExpiryWithinTwoMonths = (expiryValue: string): boolean => {
    const expiry = parseExpiryDate(expiryValue);
    if (!expiry) return false;
    const today = startOfDay(new Date());
    const threshold = addMonths(today, 2);
    return isBefore(startOfDay(expiry), threshold) || startOfDay(expiry).getTime() === threshold.getTime();
  };

  const formatExpiryDate = (value: string): string => {
    const d = parseExpiryDate(value);
    if (!d) return '(Trống)';
    return d.toLocaleDateString('vi-VN');
  };

  // Filter employees locally or use search API
  const filteredEmployees = searchTerm
    ? employees.filter(emp =>
      emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : employees;

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEmployees = filteredEmployees.slice(startIndex, endIndex);

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
        await loadEmployees(); // Reload data
      } catch (err: any) {
        alert('Có lỗi xảy ra khi xóa nhân viên: ' + (err.message || 'Unknown error'));
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-4 md:px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-lg font-bold text-slate-700 uppercase">
            Quản lý Nhân sự
          </h2>
        </div>

        {/* Toolbar */}
        <div className="px-4 md:px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo mã, tên, phòng ban, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <button
            onClick={() => navigate('/nhan-su/them')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm"
          >
            <Plus size={18} />
            Thêm nhân viên
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Đang tải dữ liệu...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-8 text-center">
            <p className="text-sm text-red-600 mb-4">{error}</p>
            <button
              onClick={loadEmployees}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Table */}
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-4 w-10">
                    <button onClick={toggleSelectAll} className="flex items-center">
                      {isAllSelected ? (
                        <CheckSquare size={18} className="text-blue-600" />
                      ) : (
                        <Square size={18} className="text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="p-4 whitespace-nowrap">Mã NV</th>
                  <th className="p-4 whitespace-nowrap">Ảnh</th>
                  <th className="p-4 whitespace-nowrap">Họ và tên</th>
                  <th className="p-4 whitespace-nowrap">Phòng ban</th>
                  <th className="p-4 whitespace-nowrap">Chức vụ</th>
                  <th className="p-4 whitespace-nowrap">Email</th>
                  <th className="p-4 whitespace-nowrap">Số điện thoại</th>
                  <th className="p-4 whitespace-nowrap">Trạng thái</th>
                  <th className="p-4 whitespace-nowrap text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentEmployees.length > 0 ? (
                  currentEmployees.map((employee) => (
                    <tr
                      key={employee.id}
                      className="hover:bg-slate-50 transition-colors group"
                    >
                      <td className="p-4">
                        <button onClick={() => toggleSelect(employee.id)} className="flex items-center">
                          {isSelected(employee.id) ? (
                            <CheckSquare size={18} className="text-blue-600" />
                          ) : (
                            <Square size={18} className="text-slate-400" />
                          )}
                        </button>
                      </td>
                      <td className="p-4 font-medium text-slate-700">
                        {employee.code || employee.ma_nv || employee.employee_code || '(Trống)'}
                      </td>
                      <td className="p-4">
                        {(() => {
                          const avatarUrl = (employee as any).anh_nhan_su || employee.anh_nhan_su;
                          console.log('[HumanResources] Employee avatar URL:', avatarUrl, 'for employee:', employee.full_name || employee.name);
                          if (avatarUrl && avatarUrl.trim() !== '') {
                            return (
                              <img
                                src={avatarUrl}
                                alt={employee.full_name || employee.name || employee.hoTen || 'Nhân sự'}
                                className="w-10 h-10 rounded-full object-cover border-2 border-slate-200"
                                onError={(e) => {
                                  console.error('[HumanResources] Error loading avatar:', avatarUrl);
                                  (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(employee.full_name || employee.name || employee.hoTen || 'NV');
                                }}
                                onLoad={() => {
                                  console.log('[HumanResources] Avatar loaded successfully:', avatarUrl);
                                }}
                              />
                            );
                          }
                          return (
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                              <User size={18} className="text-slate-400" />
                            </div>
                          );
                        })()}
                      </td>
                      <td className="p-4 font-medium text-slate-800">
                        {employee.full_name || employee.name || employee.hoTen || employee.ho_ten || '(Trống)'}
                      </td>
                      <td className="p-4 text-slate-600">
                        {employee.phongBan || employee.department || employee.phong_ban || '(Trống)'}
                      </td>
                      <td className="p-4 text-slate-600">
                        {(employee as any).chuc_vu || employee.chucVu || employee.position || '(Trống)'}
                      </td>
                      <td className="p-4 text-slate-600">
                        {employee.email || '(Trống)'}
                      </td>
                      <td className="p-4 text-slate-600">
                        {(employee as any).sdt_nhan_vien || employee.sdtNhanVien || employee.phone || employee.dien_thoai || '(Trống)'}
                      </td>
                      <td className="p-4">
                        {getStatusBadge(employee.status || 'active')}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2 transition-opacity">
                          <button
                            onClick={() => handleView(employee)}
                            className="action-btn p-1.5 text-purple-600 bg-purple-50 border border-purple-100 rounded-md hover:bg-purple-100"
                            title="Xem"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => handleEdit(employee.id)}
                            className="action-btn p-1.5 text-orange-500 bg-orange-50 border border-orange-100 rounded-md hover:bg-orange-100"
                            title="Sửa"
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(employee.id)}
                            className="action-btn p-1.5 text-red-500 bg-red-50 border border-red-100 rounded-md hover:bg-red-100"
                            title="Xóa"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-sm">Không có dữ liệu trong bảng nhan_su</p>
                        <p className="text-xs text-slate-400">Vui lòng thêm nhân viên mới hoặc kiểm tra kết nối database</p>
                        <button
                          onClick={() => navigate('/nhan-su/them')}
                          className="mt-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                          Thêm nhân viên đầu tiên
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && (
          <div className="px-4 md:px-6 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="font-semibold">{filteredEmployees.length}</span> bản ghi
              <div className="h-4 w-px bg-slate-300 mx-2"></div>
              <select
                className="bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                defaultValue={itemsPerPage}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>/ trang</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 py-1 text-sm text-slate-600">
                Trang {currentPage} / {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
