import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Search,
  Plus,
  Edit,
  Trash2,
  Award,
  Calendar as CalendarIcon,
  FileText,
  Camera,
  ChevronDown,
  X,
  User,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CheckSquare,
  Square,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { certificateService, type ProfessionalCertificate } from '@/lib/services/certificateService';
import { employeeService } from '@/lib/services/employeeService';

export function ChungChiHanhNghe() {
  const navigate = useNavigate();
  const [certificates, setCertificates] = useState<ProfessionalCertificate[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [editingCertificate, setEditingCertificate] = useState<ProfessionalCertificate | null>(null);
  const [certificateFormData, setCertificateFormData] = useState<ProfessionalCertificate>({
    id: '',
    tenFileLuu: '',
    file_url: '',
    anh_url: '',
    anh2_url: '',
    ghiChu: '',
    cchn: '',
    hangCCHN: '',
    ngayHetHanCC: '',
    employee_id: '',
    employeeName: '',
    employeeCode: ''
  });
  const [certificateFileNameSearch, setCertificateFileNameSearch] = useState('');
  const [showCertificateFileNameDropdown, setShowCertificateFileNameDropdown] = useState(false);
  const itemsPerPage = 10;

  // Load data from Supabase
  useEffect(() => {
    loadCertificates();
    loadEmployees();
  }, []);

  const loadCertificates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await certificateService.getAll();
      setCertificates(data);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra khi tải dữ liệu');
      console.error('Error loading certificates:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const data = await employeeService.getAll();
      setEmployees(data);
    } catch (err: any) {
      console.error('Error loading employees:', err);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const isSelected = (id: string) => selectedIds.includes(id);

  const isAllSelected = certificates.length > 0 && certificates.every(cert => selectedIds.includes(cert.id));

  const toggleSelectAll = () => {
    setSelectedIds(isAllSelected ? [] : certificates.map(cert => cert.id));
  };

  const openCertificateModal = (certificate?: ProfessionalCertificate) => {
    if (certificate) {
      setEditingCertificate(certificate);
      setCertificateFormData({
        ...certificate,
        employee_id: certificate.employee_id || certificate.employeeId || ''
      });
    } else {
      setEditingCertificate(null);
      setCertificateFormData({
        id: '',
        tenFileLuu: '',
        file_url: '',
        anh_url: '',
        anh2_url: '',
        ghiChu: '',
        cchn: '',
        hangCCHN: '',
        ngayHetHanCC: '',
        employee_id: '',
        employeeName: '',
        employeeCode: ''
      });
    }
    setShowCertificateModal(true);
  };

  const closeCertificateModal = () => {
    setShowCertificateModal(false);
    setEditingCertificate(null);
    setCertificateFormData({
      id: '',
      tenFileLuu: '',
      file_url: '',
      anh_url: '',
      anh2_url: '',
      ghiChu: '',
      cchn: '',
      hangCCHN: '',
      ngayHetHanCC: '',
      employee_id: '',
      employeeName: '',
      employeeCode: ''
    });
  };

  const handleCertificateInputChange = (field: keyof ProfessionalCertificate, value: string | File | null) => {
    setCertificateFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Update employee info when employeeId changes
      if (field === 'employeeId' && typeof value === 'string') {
        const employee = mockEmployees.find(emp => emp.id === value);
        if (employee) {
          updated.employeeName = employee.name;
          updated.employeeCode = employee.code;
        }
      }
      return updated;
    });
  };

  const handleCertificateFileInputChange = async (field: 'file' | 'anh' | 'anh2', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      try {
        // Upload file to Supabase Storage
        const filePath = `certificates/${Date.now()}_${file.name}`;
        const url = await certificateService.uploadFile('certificates', filePath, file);
        
        // Update form data with URL
        const urlField = field === 'file' ? 'file_url' : field === 'anh' ? 'anh_url' : 'anh2_url';
        setCertificateFormData(prev => ({ ...prev, [urlField]: url }));
      } catch (err: any) {
        alert('Có lỗi xảy ra khi upload file: ' + (err.message || 'Unknown error'));
      }
    }
  };

  const removeCertificateFile = (field: 'file' | 'anh' | 'anh2') => {
    const urlField = field === 'file' ? 'file_url' : field === 'anh' ? 'anh_url' : 'anh2_url';
    setCertificateFormData(prev => ({ ...prev, [urlField]: '' }));
    const input = document.getElementById(`cert-${field}-input`) as HTMLInputElement;
    if (input) input.value = '';
  };

  const validateCertificateForm = (): boolean => {
    if (!certificateFormData.ngayHetHanCC) {
      alert('Vui lòng chọn ngày hết hạn chứng chỉ');
      return false;
    }
    if (!certificateFormData.employee_id) {
      alert('Vui lòng chọn nhân sự');
      return false;
    }
    return true;
  };

  const saveCertificate = async () => {
    if (!validateCertificateForm()) return;

    try {
      if (editingCertificate) {
        await certificateService.update(editingCertificate.id, certificateFormData);
      } else {
        await certificateService.create(certificateFormData);
      }
      await loadCertificates(); // Reload data
      closeCertificateModal();
    } catch (err: any) {
      alert('Có lỗi xảy ra khi lưu chứng chỉ: ' + (err.message || 'Unknown error'));
    }
  };

  const removeCertificate = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa chứng chỉ này?')) {
      try {
        await certificateService.delete(id);
        await loadCertificates(); // Reload data
      } catch (err: any) {
        alert('Có lỗi xảy ra khi xóa chứng chỉ: ' + (err.message || 'Unknown error'));
      }
    }
  };

  const editCertificate = (certificate: ProfessionalCertificate) => {
    openCertificateModal(certificate);
  };

  const getDateInputValue = (dateString: string): string => {
    if (!dateString) return '';
    if (dateString.includes('-') && dateString.length === 10) {
      return dateString;
    }
    const parts = dateString.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return '';
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '(Trống)';
    if (dateStr.includes('/')) return dateStr;
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const calculateRemainingMonths = (expiryDate: string): string => {
    if (!expiryDate) return '(Trống)';
    
    let expiry: Date;
    if (expiryDate.includes('/')) {
      const parts = expiryDate.split('/');
      expiry = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    } else if (expiryDate.includes('-')) {
      expiry = new Date(expiryDate);
    } else {
      return '(Trống)';
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const expiryYear = expiry.getFullYear();
    const expiryMonth = expiry.getMonth();

    const monthsRemaining = (expiryYear - currentYear) * 12 + (expiryMonth - currentMonth);

    if (monthsRemaining < 0) {
      return `Đã hết hạn (${Math.abs(monthsRemaining)} tháng)`;
    } else if (monthsRemaining === 0) {
      return 'Hết hạn trong tháng này';
    } else {
      return `${monthsRemaining} tháng`;
    }
  };

  const fileNameOptions = [
    'Chứng chỉ hành nghề - 2024',
    'Chứng chỉ hành nghề - 2023',
    'Chứng chỉ hành nghề - 2022',
    'Giấy phép hành nghề',
    'Chứng chỉ chuyên môn'
  ];

  const filteredFileNameOptions = fileNameOptions.filter(option =>
    option.toLowerCase().includes(certificateFileNameSearch.toLowerCase())
  );

  const filteredCertificates = certificates.filter(cert =>
    cert.tenFileLuu.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.cchn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredCertificates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCertificates = filteredCertificates.slice(startIndex, endIndex);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-4 md:px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} className="text-slate-600" />
              </button>
              <h2 className="text-lg font-bold text-slate-700 uppercase flex items-center gap-2">
                <Award size={20} />
                Chứng chỉ hành nghề
              </h2>
            </div>
            <button
              onClick={() => openCertificateModal()}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md transition-colors shadow-sm"
            >
              <Plus size={16} />
              New
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-4 md:px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên file, nhân sự, mã NV, CCHN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
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
              onClick={loadCertificates}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Table */}
        {!loading && !error && (
          currentCertificates.length > 0 ? (
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
                    <th className="p-4 whitespace-nowrap">STT</th>
                    <th className="p-4 whitespace-nowrap">Tên file lưu</th>
                    <th className="p-4 whitespace-nowrap">File</th>
                    <th className="p-4 whitespace-nowrap">Ảnh</th>
                    <th className="p-4 whitespace-nowrap">Ảnh 2</th>
                    <th className="p-4 whitespace-nowrap">CCHN</th>
                    <th className="p-4 whitespace-nowrap">Hạng CCHN</th>
                    <th className="p-4 whitespace-nowrap">Ngày hết hạn</th>
                    <th className="p-4 whitespace-nowrap">Số tháng còn lại</th>
                    <th className="p-4 whitespace-nowrap">Nhân sự</th>
                    <th className="p-4 whitespace-nowrap text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentCertificates.map((certificate, index) => (
                    <tr key={certificate.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-4">
                        <button onClick={() => toggleSelect(certificate.id)} className="flex items-center">
                          {isSelected(certificate.id) ? (
                            <CheckSquare size={18} className="text-blue-600" />
                          ) : (
                            <Square size={18} className="text-slate-400" />
                          )}
                        </button>
                      </td>
                      <td className="p-4 text-slate-600">{startIndex + index + 1}</td>
                      <td className="p-4 text-slate-700 font-medium">{certificate.tenFileLuu || '(Trống)'}</td>
                      <td className="p-4 text-slate-600">
                        {certificate.file_url ? (
                          <a href={certificate.file_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            Xem file
                          </a>
                        ) : (
                          '(Trống)'
                        )}
                      </td>
                      <td className="p-4">
                        {certificate.anh_url ? (
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded border border-slate-200 overflow-hidden">
                              <img
                                src={certificate.anh_url}
                                alt="Ảnh 1"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">(Trống)</span>
                        )}
                      </td>
                      <td className="p-4">
                        {certificate.anh2_url ? (
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded border border-slate-200 overflow-hidden">
                              <img
                                src={certificate.anh2_url}
                                alt="Ảnh 2"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">(Trống)</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-600">{certificate.cchn || '(Trống)'}</td>
                      <td className="p-4 text-slate-600">{certificate.hangCCHN || '(Trống)'}</td>
                      <td className="p-4 text-slate-600">{formatDate(certificate.ngayHetHanCC)}</td>
                      <td className="p-4 text-slate-600 font-medium">{calculateRemainingMonths(certificate.ngayHetHanCC)}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-slate-400" />
                          <div>
                            <div className="text-slate-700 font-medium">{certificate.employeeName || certificate.employee_name || '(Trống)'}</div>
                            <div className="text-xs text-slate-500">{certificate.employeeCode || certificate.employee_code || ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => editCertificate(certificate)}
                            className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                            title="Sửa"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => removeCertificate(certificate.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                            title="Xóa"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500">
              Không có dữ liệu
            </div>
          )
        )}

        {/* Pagination */}
        {!loading && !error && filteredCertificates.length > 0 && (
          <div className="px-4 md:px-6 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="font-semibold">{filteredCertificates.length}</span> bản ghi
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

      {/* Certificate Modal */}
      {showCertificateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={closeCertificateModal}
                  className="p-1 hover:bg-slate-100 rounded transition-colors"
                >
                  <X size={20} className="text-slate-600" />
                </button>
                <h3 className="text-lg font-bold text-slate-800">
                  {editingCertificate ? `CCHN_${certificates.findIndex(c => c.id === editingCertificate.id) + 1}` : 'CCHN_01'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={closeCertificateModal}
                  className="px-4 py-2 border border-blue-500 text-blue-600 rounded-md hover:bg-blue-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCertificate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Nhân sự */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nhân sự <span className="text-red-500">*</span>
                </label>
                <select
                  value={certificateFormData.employeeId}
                  onChange={(e) => handleCertificateInputChange('employeeId', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                >
                  <option value="">Chọn nhân sự</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id.toString()}>
                      {emp.code || ''} - {emp.name || emp.hoTen || ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tên file lưu */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Tên file lưu
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={certificateFormData.tenFileLuu}
                    onChange={(e) => {
                      handleCertificateInputChange('tenFileLuu', e.target.value);
                      setCertificateFileNameSearch(e.target.value);
                      setShowCertificateFileNameDropdown(true);
                    }}
                    onFocus={() => setShowCertificateFileNameDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCertificateFileNameDropdown(false), 200)}
                    className="w-full px-3 py-2 pr-10 border border-blue-500 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="Add or search"
                  />
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />

                  {showCertificateFileNameDropdown && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {filteredFileNameOptions.length > 0 ? (
                        filteredFileNameOptions.map((option, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => {
                              handleCertificateInputChange('tenFileLuu', option);
                              setCertificateFileNameSearch(option);
                              setShowCertificateFileNameDropdown(false);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            {option}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-slate-500">Không tìm thấy</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* File upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  file
                </label>
                <div className="relative">
                  <input
                    id="cert-file-input"
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleCertificateFileInputChange('file', e)}
                    className="hidden"
                  />
                  <label
                    htmlFor="cert-file-input"
                    className="flex items-center gap-3 px-4 py-3 border border-slate-300 rounded-md cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    {certificateFormData.file_url ? (
                      <>
                        <FileText size={24} className="text-slate-600" />
                        <a href={certificateFormData.file_url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-blue-600 hover:underline">
                          Xem file
                        </a>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeCertificateFile('file');
                          }}
                          className="p-1 hover:bg-slate-200 rounded transition-colors"
                        >
                          <X size={16} className="text-slate-500" />
                        </button>
                      </>
                    ) : (
                      <>
                        <FileText size={24} className="text-slate-400" />
                        <span className="text-sm text-slate-500">Chọn file PDF</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Ảnh upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Ảnh
                </label>
                <div className="relative">
                  <input
                    id="cert-anh-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleCertificateFileInputChange('anh', e)}
                    className="hidden"
                  />
                  <label
                    htmlFor="cert-anh-input"
                    className="flex items-center gap-3 px-4 py-3 border border-slate-300 rounded-md cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    {certificateFormData.anh_url ? (
                      <>
                        <div className="w-10 h-10 rounded border border-slate-200 overflow-hidden">
                          <img
                            src={certificateFormData.anh_url}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <a href={certificateFormData.anh_url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-blue-600 hover:underline">
                          Xem ảnh
                        </a>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeCertificateFile('anh');
                          }}
                          className="p-1 hover:bg-slate-200 rounded transition-colors"
                        >
                          <X size={16} className="text-slate-500" />
                        </button>
                      </>
                    ) : (
                      <>
                        <Camera size={24} className="text-slate-400" />
                        <span className="text-sm text-slate-500">Chọn ảnh</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Ảnh 2 upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Ảnh 2
                </label>
                <div className="relative">
                  <input
                    id="cert-anh2-input"
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleCertificateFileInputChange('anh2', e)}
                    className="hidden"
                  />
                  <label
                    htmlFor="cert-anh2-input"
                    className="flex items-center gap-3 px-4 py-3 border border-slate-300 rounded-md cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    {certificateFormData.anh2_url ? (
                      <>
                        <div className="w-10 h-10 rounded border border-slate-200 overflow-hidden">
                          <img
                            src={certificateFormData.anh2_url}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <a href={certificateFormData.anh2_url} target="_blank" rel="noopener noreferrer" className="flex-1 text-sm text-blue-600 hover:underline">
                          Xem ảnh
                        </a>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeCertificateFile('anh2');
                          }}
                          className="p-1 hover:bg-slate-200 rounded transition-colors"
                        >
                          <X size={16} className="text-slate-500" />
                        </button>
                      </>
                    ) : (
                      <>
                        <Camera size={24} className="text-slate-400" />
                        <span className="text-sm text-slate-500">Chọn ảnh</span>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Ghi chú
                </label>
                <textarea
                  value={certificateFormData.ghiChu}
                  onChange={(e) => handleCertificateInputChange('ghiChu', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                  placeholder="Nhập ghi chú..."
                />
              </div>

              {/* CCHN */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    CCHN
                  </label>
                  <input
                    type="text"
                    value={certificateFormData.cchn}
                    onChange={(e) => handleCertificateInputChange('cchn', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="Nhập chứng chỉ hành nghề"
                  />
                </div>

                {/* Hạng CCHN */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Hạng CCHN
                  </label>
                  <input
                    type="text"
                    value={certificateFormData.hangCCHN}
                    onChange={(e) => handleCertificateInputChange('hangCCHN', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="Nhập hạng chứng chỉ"
                  />
                </div>
              </div>

              {/* Ngày hết hạn CC */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                  Ngày hết hạn CC <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={getDateInputValue(certificateFormData.ngayHetHanCC)}
                    onChange={(e) => handleCertificateInputChange('ngayHetHanCC', e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <CalendarIcon size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
