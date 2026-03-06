import React, { useState, useEffect } from 'react';
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
import { employeeService, type Employee } from '@/lib/services/employeeService';
import { testNhanSuConnection } from '@/lib/utils/testDatabaseConnection';
import { certificateService, type ProfessionalCertificate } from '@/lib/services/certificateService';
import { dependentPersonService, type DependentPerson } from '@/lib/services/dependentPersonService';

export function HumanResources() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'employee' | 'license' | 'dependent'>('employee');
  const [certificates, setCertificates] = useState<ProfessionalCertificate[]>([]);
  const [dependentPersons, setDependentPersons] = useState<DependentPerson[]>([]);
  const [loadingCertificates, setLoadingCertificates] = useState(false);
  const [loadingDependents, setLoadingDependents] = useState(false);
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
        ngayVaoLam: emp.ngay_vao_lam || emp.ngayVaoLam || emp.joinDate || ''
      }));

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

  const handleView = async (id: string | number) => {
    try {
      // Load employee data
      const employee = await employeeService.getById(id);
      setViewingEmployee(employee);
      setActiveTab('employee');
      setShowViewModal(true);

      // Load certificates data from nhan_su_chi_tiet
      setLoadingCertificates(true);
      try {
        const certificateData = await certificateService.getByEmployeeId(id.toString());
        setCertificates(certificateData);
      } catch (err) {
        console.error('Error loading certificates:', err);
        setCertificates([]);
      } finally {
        setLoadingCertificates(false);
      }

      // Load dependent persons data
      setLoadingDependents(true);
      try {
        const dependentData = await dependentPersonService.getByEmployeeId(id);
        setDependentPersons(dependentData);
      } catch (err) {
        console.error('Error loading dependent persons:', err);
        setDependentPersons([]);
      } finally {
        setLoadingDependents(false);
      }
    } catch (err: any) {
      console.error('Error loading employee details:', err);
      alert('Không thể tải thông tin nhân viên: ' + (err.message || 'Unknown error'));
    }
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
                            onClick={() => handleView(employee.id)}
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

      {/* View Employee Modal */}
      {showViewModal && viewingEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <User size={20} />
                Chi tiết nhân viên: {(viewingEmployee as any).full_name || viewingEmployee.full_name || viewingEmployee.name || viewingEmployee.hoTen || ''}
              </h3>
              <button
                onClick={() => setShowViewModal(false)}
                className="p-1 hover:bg-slate-100 rounded transition-colors"
              >
                <X size={20} className="text-slate-600" />
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-200 bg-slate-50">
              <div className="flex gap-1 px-6">
                <button
                  onClick={() => setActiveTab('employee')}
                  className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'employee'
                    ? 'text-blue-600 border-blue-600 bg-white'
                    : 'text-slate-600 border-transparent hover:text-slate-800'
                    }`}
                >
                  <User size={16} />
                  Thông tin nhân viên
                </button>
                <button
                  onClick={() => setActiveTab('license')}
                  className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'license'
                    ? 'text-blue-600 border-blue-600 bg-white'
                    : 'text-slate-600 border-transparent hover:text-slate-800'
                    }`}
                >
                  <FileText size={16} />
                  Chứng chỉ hành nghề
                </button>
                <button
                  onClick={() => setActiveTab('dependent')}
                  className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'dependent'
                    ? 'text-blue-600 border-blue-600 bg-white'
                    : 'text-slate-600 border-transparent hover:text-slate-800'
                    }`}
                >
                  <Users size={16} />
                  Thông tin người phụ thuộc
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Tab Content: Thông tin nhân viên */}
              {activeTab === 'employee' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Thông tin cơ bản */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-2">
                      Thông tin cơ bản
                    </h4>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Mã nhân viên</label>
                      <p className="text-sm text-slate-800 font-medium">
                        {(viewingEmployee as any).code || viewingEmployee.code || '(Trống)'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Họ và tên</label>
                      <p className="text-sm text-slate-800 font-medium">
                        {(viewingEmployee as any).full_name || viewingEmployee.full_name || viewingEmployee.name || viewingEmployee.hoTen || '(Trống)'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Phòng ban</label>
                      <p className="text-sm text-slate-800">
                        {(viewingEmployee as any).phong_ban || viewingEmployee.phongBan || viewingEmployee.department || '(Trống)'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Chức vụ</label>
                      <p className="text-sm text-slate-800">
                        {(viewingEmployee as any).chuc_vu || viewingEmployee.chucVu || viewingEmployee.position || '(Trống)'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                        <Mail size={14} />
                        Email
                      </label>
                      <p className="text-sm text-slate-800">
                        {viewingEmployee.email || '(Trống)'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                        <Phone size={14} />
                        Số điện thoại
                      </label>
                      <p className="text-sm text-slate-800">
                        {(viewingEmployee as any).sdt_nhan_vien || viewingEmployee.sdtNhanVien || viewingEmployee.phone || '(Trống)'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Trạng thái</label>
                      <div className="mt-1">
                        {getStatusBadge(viewingEmployee.status || 'active')}
                      </div>
                    </div>
                  </div>

                  {/* Thông tin cá nhân */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-2">
                      Thông tin cá nhân
                    </h4>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                        <CalendarIcon size={14} />
                        Ngày sinh
                      </label>
                      <p className="text-sm text-slate-800">
                        {viewingEmployee.ngaySinh ? new Date(viewingEmployee.ngaySinh).toLocaleDateString('vi-VN') : '(Trống)'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                        <MapPin size={14} />
                        Địa chỉ
                      </label>
                      <p className="text-sm text-slate-800">
                        {viewingEmployee.diaChi || '(Trống)'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Số CCCD</label>
                      <p className="text-sm text-slate-800">
                        {viewingEmployee.soCCCD || '(Trống)'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Ngày cấp CCCD</label>
                      <p className="text-sm text-slate-800">
                        {viewingEmployee.ngayCapCCCD ? new Date(viewingEmployee.ngayCapCCCD).toLocaleDateString('vi-VN') : '(Trống)'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">MST cá nhân</label>
                      <p className="text-sm text-slate-800">
                        {viewingEmployee.mstCaNhan || '(Trống)'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Mã số BHXH</label>
                      <p className="text-sm text-slate-800">
                        {viewingEmployee.maSoBHXH || '(Trống)'}
                      </p>
                    </div>
                  </div>

                  {/* Thông tin học vấn */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-2">
                      Thông tin học vấn
                    </h4>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Bằng đại học chuyên ngành</label>
                      <p className="text-sm text-slate-800">
                        {viewingEmployee.bangDHChuyenNganh || '(Trống)'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Năm tốt nghiệp</label>
                      <p className="text-sm text-slate-800">
                        {viewingEmployee.namTotNghiep || '(Trống)'}
                      </p>
                    </div>
                  </div>

                  {/* Thông tin khác */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-2">
                      Thông tin khác
                    </h4>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Ngày vào làm</label>
                      <p className="text-sm text-slate-800">
                        {viewingEmployee.ngayVaoLam ? new Date(viewingEmployee.ngayVaoLam).toLocaleDateString('vi-VN') :
                          viewingEmployee.joinDate ? new Date(viewingEmployee.joinDate).toLocaleDateString('vi-VN') : '(Trống)'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Ngày tạo</label>
                      <p className="text-sm text-slate-800">
                        {(viewingEmployee as any).created_at ? new Date((viewingEmployee as any).created_at).toLocaleString('vi-VN') : '(Trống)'}
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Ngày cập nhật</label>
                      <p className="text-sm text-slate-800">
                        {(viewingEmployee as any).updated_at ? new Date((viewingEmployee as any).updated_at).toLocaleString('vi-VN') : '(Trống)'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab Content: Chứng chỉ hành nghề */}
              {activeTab === 'license' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-2 mb-4">
                    Chứng chỉ hành nghề (từ bảng nhan_su_chi_tiet)
                  </h4>

                  {loadingCertificates ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      <span className="ml-2 text-sm text-slate-600">Đang tải dữ liệu...</span>
                    </div>
                  ) : certificates.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="p-3 text-left whitespace-nowrap">Tên file lưu</th>
                            <th className="p-3 text-left whitespace-nowrap">CCHN</th>
                            <th className="p-3 text-left whitespace-nowrap">Hạng CCHN</th>
                            <th className="p-3 text-left whitespace-nowrap">Ngày hết hạn</th>
                            <th className="p-3 text-left whitespace-nowrap">Ghi chú</th>
                            <th className="p-3 text-left whitespace-nowrap">File</th>
                            <th className="p-3 text-left whitespace-nowrap">Ảnh 1</th>
                            <th className="p-3 text-left whitespace-nowrap">Ảnh 2</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {certificates.map((cert, index) => (
                            <tr key={cert.id || index} className="hover:bg-slate-50">
                              <td className="p-3 text-slate-700">{cert.tenFileLuu || '(Trống)'}</td>
                              <td className="p-3 text-slate-700">{cert.cchn || '(Trống)'}</td>
                              <td className="p-3 text-slate-700">{cert.hangCCHN || '(Trống)'}</td>
                              <td className="p-3 text-slate-700">
                                {cert.ngayHetHanCC ? new Date(cert.ngayHetHanCC).toLocaleDateString('vi-VN') : '(Trống)'}
                              </td>
                              <td className="p-3 text-slate-700">{cert.ghiChu || '(Trống)'}</td>
                              <td className="p-3 text-slate-700">
                                {cert.file_url ? (
                                  <a href={cert.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                    Xem file
                                  </a>
                                ) : '(Trống)'}
                              </td>
                              <td className="p-3 text-slate-700">
                                {cert.anh_url ? (
                                  <a href={cert.anh_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                    Xem ảnh
                                  </a>
                                ) : '(Trống)'}
                              </td>
                              <td className="p-3 text-slate-700">
                                {cert.anh2_url ? (
                                  <a href={cert.anh2_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                    Xem ảnh
                                  </a>
                                ) : '(Trống)'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <p className="text-sm">Không có dữ liệu giấy phép</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab Content: Thông tin người phụ thuộc */}
              {activeTab === 'dependent' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-2 mb-4">
                    Thông tin người phụ thuộc (từ bảng nguoi_phu_thuoc)
                  </h4>

                  {loadingDependents ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      <span className="ml-2 text-sm text-slate-600">Đang tải dữ liệu...</span>
                    </div>
                  ) : dependentPersons.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                          <tr>
                            <th className="p-3 text-left whitespace-nowrap">Họ tên NPT</th>
                            <th className="p-3 text-left whitespace-nowrap">Ngày sinh NPT</th>
                            <th className="p-3 text-left whitespace-nowrap">Số CCCD NPT</th>
                            <th className="p-3 text-left whitespace-nowrap">MST NPT</th>
                            <th className="p-3 text-left whitespace-nowrap">Quan hệ</th>
                            <th className="p-3 text-left whitespace-nowrap">Ngày tạo</th>
                            <th className="p-3 text-left whitespace-nowrap">Ngày cập nhật</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {dependentPersons.map((person, index) => (
                            <tr key={person.id || index} className="hover:bg-slate-50">
                              <td className="p-3 text-slate-700">
                                {person.ho_ten_npt || person.hoTenNPT || '(Trống)'}
                              </td>
                              <td className="p-3 text-slate-700">
                                {person.ngay_sinh_npt || person.ngaySinhNPT
                                  ? new Date(person.ngay_sinh_npt || person.ngaySinhNPT).toLocaleDateString('vi-VN')
                                  : '(Trống)'}
                              </td>
                              <td className="p-3 text-slate-700">
                                {person.so_cccd_npt || person.soCCCDNPT || '(Trống)'}
                              </td>
                              <td className="p-3 text-slate-700">
                                {person.mst_npt || person.mstNPT || '(Trống)'}
                              </td>
                              <td className="p-3 text-slate-700">
                                {person.quan_he || person.quanHe || '(Trống)'}
                              </td>
                              <td className="p-3 text-slate-700">
                                {person.created_at
                                  ? new Date(person.created_at).toLocaleString('vi-VN')
                                  : '(Trống)'}
                              </td>
                              <td className="p-3 text-slate-700">
                                {person.updated_at
                                  ? new Date(person.updated_at).toLocaleString('vi-VN')
                                  : '(Trống)'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <p className="text-sm">Không có dữ liệu người phụ thuộc</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-2">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-100 transition-colors"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  handleEdit(viewingEmployee.id);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Chỉnh sửa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
