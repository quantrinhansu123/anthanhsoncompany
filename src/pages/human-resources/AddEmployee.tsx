import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Edit,
  Calendar as CalendarIcon,
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  GraduationCap,
  Award,
  Users,
  FileText,
  Image as ImageIcon,
  Camera,
  ChevronDown,
  X,
  Loader2
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { employeeService } from '@/lib/services/employeeService';
import { dependentService } from '@/lib/services/dependentService';
import { certificateService } from '@/lib/services/certificateService';

interface Dependent {
  id: string;
  hoTenNPT: string;
  ngaySinhNPT: string;
  soCCCDNPT: string;
  mstNPT: string;
  quanHe: string;
}

interface ProfessionalCertificate {
  id: string;
  tenFileLuu: string;
  file: File | null;
  file_url?: string;
  anh: File | null;
  anh_url?: string;
  anh2: File | null;
  anh2_url?: string;
  ghiChu: string;
  cchn: string;
  hangCCHN: string;
  ngayHetHanCC: string;
}

export function AddEmployee() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const [loadingEmployee, setLoadingEmployee] = useState(false);

  const [formData, setFormData] = useState({
    hoTen: '', // Họ tên - sẽ map sang full_name
    phongBan: '', // Phòng ban
    chucVu: '', // Chức vụ
    ngayVaoLam: '', // Ngày vào làm
    email: '',
    sdtNhanVien: '',
    ngaySinh: '',
    diaChi: '',
    soCCCD: '',
    ngayCapCCCD: '',
    mstCaNhan: '',
    maSoBHXH: '',
    bangDHChuyenNganh: '',
    namTotNghiep: 0,
    anhNhanSuUrl: '' as string | null // URL ảnh nhân sự (link)
  });

  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [certificates, setCertificates] = useState<ProfessionalCertificate[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDependentModal, setShowDependentModal] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [editingDependent, setEditingDependent] = useState<Dependent | null>(null);
  const [editingCertificate, setEditingCertificate] = useState<ProfessionalCertificate | null>(null);
  const [dependentFormData, setDependentFormData] = useState<Dependent>({
    id: '',
    hoTenNPT: '',
    ngaySinhNPT: '',
    soCCCDNPT: '',
    mstNPT: '',
    quanHe: ''
  });
  const [certificateFormData, setCertificateFormData] = useState<ProfessionalCertificate>({
    id: '',
    tenFileLuu: '',
    file: null,
    anh: null,
    anh2: null,
    ghiChu: '',
    cchn: '',
    hangCCHN: '',
    ngayHetHanCC: ''
  });
  const [certificateFileNameSearch, setCertificateFileNameSearch] = useState('');
  const [showCertificateFileNameDropdown, setShowCertificateFileNameDropdown] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load employee data nếu là edit mode
  useEffect(() => {
    if (isEditMode && id) {
      loadEmployeeData(id);
    }
  }, [isEditMode, id]);

  const loadEmployeeData = async (employeeId: string | number) => {
    try {
      setLoadingEmployee(true);
      setLoadingEmployee(true);
      const employee = await employeeService.getById(employeeId);

      // Map data từ database vào form - ưu tiên snake_case từ database
      const emp: any = employee;
      setFormData({
        hoTen: emp.full_name || emp.name || emp.hoTen || emp.ho_ten || '',
        phongBan: emp.phong_ban || emp.phongBan || emp.department || '',
        chucVu: emp.chuc_vu || emp.chucVu || emp.position || '',
        ngayVaoLam: emp.ngay_vao_lam || emp.ngayVaoLam || emp.joinDate || '',
        email: emp.email || '',
        sdtNhanVien: emp.sdt_nhan_vien || emp.sdtNhanVien || emp.phone || emp.dien_thoai || '',
        ngaySinh: emp.ngay_sinh || emp.ngaySinh || '',
        diaChi: emp.dia_chi || emp.diaChi || '',
        soCCCD: emp.so_cccd || emp.soCCCD || '',
        ngayCapCCCD: emp.ngay_cap_cccd || emp.ngayCapCCCD || '',
        mstCaNhan: emp.mst_ca_nhan || emp.mstCaNhan || '',
        maSoBHXH: emp.ma_so_bhxh || emp.maSoBHXH || '',
        bangDHChuyenNganh: emp.bang_dh_chuyen_nganh || emp.bangDHChuyenNganh || '',
        namTotNghiep: emp.nam_tot_nghiep || emp.namTotNghiep || 0,
        anhNhanSuUrl: emp.anh_nhan_su || null
      });

      // Load dependents
      const deps = await dependentService.getByEmployeeId(employeeId.toString());
      setDependents(deps);

      // Load certificates từ nhan_su_chi_tiet
      const employeeCerts = await certificateService.getByEmployeeId(employeeId.toString());
      // Map certificates để có cả file_url, anh_url, anh2_url
      setCertificates(employeeCerts.map(cert => ({
        id: cert.id,
        tenFileLuu: cert.tenFileLuu,
        file: null,
        file_url: cert.file_url,
        anh: null,
        anh_url: cert.anh_url,
        anh2: null,
        anh2_url: cert.anh2_url,
        ghiChu: cert.ghiChu,
        cchn: cert.cchn,
        hangCCHN: cert.hangCCHN,
        ngayHetHanCC: cert.ngayHetHanCC
      })));
    } catch (err: any) {
      alert('Có lỗi xảy ra khi tải dữ liệu: ' + (err.message || 'Unknown error'));
      console.error('Error loading employee:', err);
    } finally {
      setLoadingEmployee(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleDateChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const getDateInputValue = (dateString: string): string => {
    if (!dateString) return '';
    // If already in YYYY-MM-DD format, return as is
    if (dateString.includes('-') && dateString.length === 10) {
      return dateString;
    }
    // Convert from DD/MM/YYYY to YYYY-MM-DD for input
    const parts = dateString.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return '';
  };


  const handleIncrement = () => {
    setFormData(prev => ({ ...prev, namTotNghiep: prev.namTotNghiep + 1 }));
  };

  const handleDecrement = () => {
    setFormData(prev => ({ ...prev, namTotNghiep: Math.max(0, prev.namTotNghiep - 1) }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.hoTen.trim()) newErrors.hoTen = 'Vui lòng nhập họ tên';
    if (!formData.ngaySinh) newErrors.ngaySinh = 'Vui lòng chọn ngày sinh';
    if (!formData.soCCCD.trim()) newErrors.soCCCD = 'Vui lòng nhập số CCCD';
    if (!formData.ngayCapCCCD) newErrors.ngayCapCCCD = 'Vui lòng chọn ngày cấp CCCD';
    if (!formData.mstCaNhan.trim()) newErrors.mstCaNhan = 'Vui lòng nhập MST cá nhân';
    if (!formData.maSoBHXH.trim()) newErrors.maSoBHXH = 'Vui lòng nhập mã số BHXH';
    if (formData.namTotNghiep === 0) newErrors.namTotNghiep = 'Vui lòng nhập năm tốt nghiệp';
    // Note: ngayHetHanCC là field của certificate, không phải employee form

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      // 1. Lấy URL ảnh nhân sự (chỉ lưu link, không upload)
      const anhNhanSuUrl = formData.anhNhanSuUrl?.trim() || null;

      // 2. Save employee
      let finalEmployeeId: string;

      // Map form data sang database format - ưu tiên camelCase vì schema đã chuẩn hóa về camelCase
      const employeeData: any = {
        full_name: formData.hoTen, // Họ và tên - ưu tiên (snake_case cho full_name vì có thể đã tồn tại)
        name: formData.hoTen, // Fallback
        hoTen: formData.hoTen, // Fallback
        phongBan: formData.phongBan, // Phòng ban - camelCase (schema đã chuẩn hóa)
        department: formData.phongBan, // Fallback
        chucVu: formData.chucVu, // Chức vụ - camelCase (schema đã chuẩn hóa)
        position: formData.chucVu, // Fallback
        ngayVaoLam: formData.ngayVaoLam || (isEditMode ? undefined : new Date().toISOString().split('T')[0]), // Ngày vào làm - camelCase
        joinDate: formData.ngayVaoLam || (isEditMode ? undefined : new Date().toISOString().split('T')[0]), // Fallback
        email: formData.email,
        sdtNhanVien: formData.sdtNhanVien, // Số điện thoại - camelCase (schema đã chuẩn hóa)
        phone: formData.sdtNhanVien, // Fallback
        ngaySinh: formData.ngaySinh, // Ngày sinh - camelCase
        diaChi: formData.diaChi, // Địa chỉ - camelCase
        soCCCD: formData.soCCCD, // Số CCCD - camelCase
        ngayCapCCCD: formData.ngayCapCCCD, // Ngày cấp CCCD - camelCase
        mstCaNhan: formData.mstCaNhan, // MST cá nhân - camelCase
        maSoBHXH: formData.maSoBHXH, // Mã số BHXH - camelCase
        bangDHChuyenNganh: formData.bangDHChuyenNganh, // Bằng đại học - camelCase
        namTotNghiep: formData.namTotNghiep, // Năm tốt nghiệp - camelCase
        anh_nhan_su: anhNhanSuUrl || null, // URL ảnh nhân sự - sử dụng null thay vì empty string
        status: 'active' as const
      };

      console.log('[AddEmployee] Saving employee with anh_nhan_su:', anhNhanSuUrl);

      if (isEditMode && id) {
        // Update existing employee - không cần id và code
        console.log('[AddEmployee] Updating employee with data:', employeeData);
        const updated = await employeeService.update(id, employeeData);
        console.log('[AddEmployee] Employee updated, result:', updated);
        // Đảm bảo id là UUID string
        finalEmployeeId = String(id);
      } else {
        // Create new employee - không cần id vì database tự tạo UUID
        // Chỉ cần code - KHÔNG truyền id vào employeeData
        employeeData.code = formData.soCCCD || `NV${Date.now()}`;

        // Đảm bảo không có id trong employeeData để database tự tạo UUID
        delete employeeData.id;

        console.log('[AddEmployee] Creating employee with data:', employeeData);
        const savedEmployee = await employeeService.create(employeeData);
        console.log('[AddEmployee] Employee created, result:', savedEmployee);

        // savedEmployee.id phải là UUID từ database
        if (!savedEmployee || !savedEmployee.id) {
          throw new Error('Không nhận được ID nhân viên sau khi tạo. Vui lòng thử lại.');
        }
        finalEmployeeId = String(savedEmployee.id);

        // Kiểm tra xem finalEmployeeId có phải UUID format không
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(finalEmployeeId)) {
          console.error('Invalid UUID format:', finalEmployeeId);
          throw new Error(`ID nhân viên không hợp lệ (UUID): ${finalEmployeeId}. Vui lòng kiểm tra database schema. Có thể bảng nhan_su.id không phải kiểu UUID.`);
        }
      }

      // 2. Save dependents
      if (isEditMode) {
        // Khi edit: xóa tất cả dependents cũ và tạo lại
        const existingDeps = await dependentService.getByEmployeeId(finalEmployeeId);
        for (const dep of existingDeps) {
          await dependentService.delete(dep.id);
        }
      }

      for (const dependent of dependents) {
        if (dependent.id && isEditMode) {
          // Update existing dependent
          await dependentService.update(dependent.id, {
            ...dependent,
            employee_id: finalEmployeeId
          });
        } else {
          // Create new dependent
          await dependentService.create({
            ...dependent,
            employee_id: finalEmployeeId
          });
        }
      }

      // 3. Save certificates (with file uploads) - id_nhan_su sẽ tự điền
      if (isEditMode) {
        // Khi edit: xóa tất cả certificates cũ và tạo lại (hoặc update nếu có id)
        const existingCerts = await certificateService.getByEmployeeId(finalEmployeeId);
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        for (const cert of existingCerts) {
          // Chỉ xóa nếu không có trong danh sách mới và id là UUID hợp lệ
          if (cert.id && uuidRegex.test(String(cert.id))) {
            if (!certificates.find(c => String(c.id) === String(cert.id))) {
              await certificateService.delete(cert.id);
            }
          }
        }
      }

      for (const cert of certificates) {
        let file_url = cert.file_url || '';
        let anh_url = cert.anh_url || '';
        let anh2_url = cert.anh2_url || '';

        // Upload files nếu là file mới (File object)
        try {
          if (cert.file && cert.file instanceof File) {
            const filePath = `certificates/${Date.now()}_${cert.file.name}`;
            file_url = await certificateService.uploadFile('certificates', filePath, cert.file);
          }
        } catch (err: any) {
          console.error('Error uploading file:', err);
          // Tiếp tục với file_url rỗng nếu upload thất bại
          file_url = '';
        }

        try {
          if (cert.anh && cert.anh instanceof File) {
            const filePath = `certificates/${Date.now()}_${cert.anh.name}`;
            anh_url = await certificateService.uploadFile('certificates', filePath, cert.anh);
          }
        } catch (err: any) {
          console.error('Error uploading image 1:', err);
          anh_url = '';
        }

        try {
          if (cert.anh2 && cert.anh2 instanceof File) {
            const filePath = `certificates/${Date.now()}_${cert.anh2.name}`;
            anh2_url = await certificateService.uploadFile('certificates', filePath, cert.anh2);
          }
        } catch (err: any) {
          console.error('Error uploading image 2:', err);
          anh2_url = '';
        }

        // Lưu chứng chỉ hành nghề vào bảng nhan_su_chi_tiet
        // Kiểm tra xem cert.id có phải UUID hợp lệ không
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isValidUUID = cert.id && uuidRegex.test(String(cert.id));

        if (isValidUUID && isEditMode) {
          // Update existing certificate trong nhan_su_chi_tiet (chỉ nếu id là UUID hợp lệ)
          try {
            await certificateService.update(String(cert.id), {
              tenFileLuu: cert.tenFileLuu,
              file_url,
              anh_url,
              anh2_url,
              ghiChu: cert.ghiChu,
              cchn: cert.cchn,
              hangCCHN: cert.hangCCHN,
              ngayHetHanCC: cert.ngayHetHanCC,
              employee_id: finalEmployeeId // Sẽ được map sang id_nhan_su trong service
            });
          } catch (err: any) {
            console.error('Error updating certificate, creating new one instead:', err);
            // Nếu update thất bại, tạo mới
            await certificateService.create({
              tenFileLuu: cert.tenFileLuu,
              file_url,
              anh_url,
              anh2_url,
              ghiChu: cert.ghiChu,
              cchn: cert.cchn,
              hangCCHN: cert.hangCCHN,
              ngayHetHanCC: cert.ngayHetHanCC,
              employee_id: finalEmployeeId
            });
          }
        } else {
          // Create new certificate trong nhan_su_chi_tiet
          await certificateService.create({
            tenFileLuu: cert.tenFileLuu,
            file_url,
            anh_url,
            anh2_url,
            ghiChu: cert.ghiChu,
            cchn: cert.cchn,
            hangCCHN: cert.hangCCHN,
            ngayHetHanCC: cert.ngayHetHanCC,
            employee_id: finalEmployeeId // Sẽ được map sang id_nhan_su trong service
          });
        }
      }

      alert('Lưu thông tin thành công!');
      navigate('/nhan-su');
    } catch (err: any) {
      alert('Có lỗi xảy ra khi lưu: ' + (err.message || 'Unknown error'));
      console.error('Error saving employee:', err);
    } finally {
      setSaving(false);
    }
  };

  const openDependentModal = (dependent?: Dependent) => {
    if (dependent) {
      setEditingDependent(dependent);
      setDependentFormData(dependent);
    } else {
      setEditingDependent(null);
      setDependentFormData({
        id: '', // Không set id, để database tự tạo UUID khi lưu
        hoTenNPT: '',
        ngaySinhNPT: '',
        soCCCDNPT: '',
        mstNPT: '',
        quanHe: ''
      });
    }
    setShowDependentModal(true);
  };

  const closeDependentModal = () => {
    setShowDependentModal(false);
    setEditingDependent(null);
    setDependentFormData({
      id: '',
      hoTenNPT: '',
      ngaySinhNPT: '',
      soCCCDNPT: '',
      mstNPT: '',
      quanHe: ''
    });
  };

  const handleDependentInputChange = (field: keyof Dependent, value: string) => {
    setDependentFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateDependentForm = (): boolean => {
    if (!dependentFormData.hoTenNPT.trim()) {
      alert('Vui lòng nhập họ tên người phụ thuộc');
      return false;
    }
    if (!dependentFormData.ngaySinhNPT) {
      alert('Vui lòng chọn ngày sinh');
      return false;
    }
    return true;
  };

  const saveDependent = () => {
    if (!validateDependentForm()) return;

    if (editingDependent) {
      // Update existing
      setDependents(prev =>
        prev.map(dep => dep.id === editingDependent.id ? dependentFormData : dep)
      );
    } else {
      // Add new
      setDependents(prev => [...prev, dependentFormData]);
    }
    closeDependentModal();
  };

  const removeDependent = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa người phụ thuộc này?')) {
      setDependents(prev => prev.filter(dep => dep.id !== id));
    }
  };

  const editDependent = (dependent: Dependent) => {
    openDependentModal(dependent);
  };

  // Certificate handlers
  const openCertificateModal = (certificate?: ProfessionalCertificate) => {
    if (certificate) {
      setEditingCertificate(certificate);
      setCertificateFormData(certificate);
    } else {
      setEditingCertificate(null);
      setCertificateFormData({
        id: '', // Không set id, để database tự tạo UUID khi lưu
        tenFileLuu: '',
        file: null,
        anh: null,
        anh2: null,
        ghiChu: '',
        cchn: '',
        hangCCHN: '',
        ngayHetHanCC: ''
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
      file: null,
      anh: null,
      anh2: null,
      ghiChu: '',
      cchn: '',
      hangCCHN: '',
      ngayHetHanCC: ''
    });
  };

  const handleCertificateInputChange = (field: keyof ProfessionalCertificate, value: string | File | null) => {
    setCertificateFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCertificateFileInputChange = (field: 'file' | 'anh' | 'anh2', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleCertificateInputChange(field, file);
  };

  const removeCertificateFile = (field: 'file' | 'anh' | 'anh2') => {
    handleCertificateInputChange(field, null);
    const input = document.getElementById(`cert-${field}-input`) as HTMLInputElement;
    if (input) input.value = '';
  };

  const validateCertificateForm = (): boolean => {
    if (!certificateFormData.ngayHetHanCC) {
      alert('Vui lòng chọn ngày hết hạn chứng chỉ');
      return false;
    }
    return true;
  };

  const saveCertificate = () => {
    if (!validateCertificateForm()) return;

    if (editingCertificate) {
      setCertificates(prev =>
        prev.map(cert => cert.id === editingCertificate.id ? certificateFormData : cert)
      );
    } else {
      setCertificates(prev => [...prev, certificateFormData]);
    }
    closeCertificateModal();
  };

  const removeCertificate = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa chứng chỉ này?')) {
      setCertificates(prev => prev.filter(cert => cert.id !== id));
    }
  };

  const editCertificate = (certificate: ProfessionalCertificate) => {
    openCertificateModal(certificate);
  };

  // Mock data for file name dropdown
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="px-4 md:px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <h2 className="text-lg font-bold text-slate-700 uppercase">
              Thêm nhân sự
            </h2>
          </div>
        </div>

        {/* Form */}
        {loadingEmployee ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Đang tải dữ liệu...</p>
          </div>
        ) : (
          <div className="p-4 md:p-6 space-y-6">
            {/* Personal Information Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                <User size={16} />
                Thông tin cá nhân
              </h3>

              {/* Ảnh nhân sự */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                  <Camera size={16} />
                  Ảnh nhân sự
                </label>
                <div className="space-y-3">
                  {/* Input URL ảnh */}
                  <input
                    type="url"
                    value={formData.anhNhanSuUrl || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, anhNhanSuUrl: e.target.value }))}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  
                  {/* Preview ảnh nếu có URL */}
                  {formData.anhNhanSuUrl && formData.anhNhanSuUrl.trim() !== '' && (
                    <div className="relative inline-block">
                      <img
                        src={formData.anhNhanSuUrl}
                        alt="Ảnh nhân sự"
                        className="w-32 h-32 object-cover rounded-lg border-2 border-slate-200"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, anhNhanSuUrl: null }));
                        }}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Họ tên */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Họ tên
                  </label>
                  <input
                    type="text"
                    value={formData.hoTen}
                    onChange={(e) => handleInputChange('hoTen', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${errors.hoTen ? 'border-red-300' : 'border-slate-300'
                      }`}
                    placeholder="Nhập họ tên"
                  />
                  {errors.hoTen && (
                    <p className="mt-1 text-xs text-red-600">{errors.hoTen}</p>
                  )}
                </div>

                {/* Phòng ban */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Phòng ban
                  </label>
                  <input
                    type="text"
                    value={formData.phongBan}
                    onChange={(e) => handleInputChange('phongBan', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="Nhập phòng ban"
                  />
                </div>

                {/* Chức vụ */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Chức vụ
                  </label>
                  <input
                    type="text"
                    value={formData.chucVu}
                    onChange={(e) => handleInputChange('chucVu', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="Nhập chức vụ"
                  />
                </div>

                {/* Ngày vào làm */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                    <CalendarIcon size={14} />
                    Ngày vào làm
                  </label>
                  <input
                    type="date"
                    value={formData.ngayVaoLam}
                    onChange={(e) => handleDateChange('ngayVaoLam', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                    <Mail size={14} />
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="example@email.com"
                  />
                </div>

                {/* SĐT nhân viên */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                    <Phone size={14} />
                    SĐT nhân viên
                  </label>
                  <input
                    type="tel"
                    value={formData.sdtNhanVien}
                    onChange={(e) => handleInputChange('sdtNhanVien', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="0912345678"
                  />
                </div>

                {/* Ngày sinh */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                    Ngày sinh <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={getDateInputValue(formData.ngaySinh)}
                      onChange={(e) => handleDateChange('ngaySinh', e.target.value)}
                      className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${errors.ngaySinh ? 'border-red-300' : 'border-slate-300'
                        }`}
                    />
                    <CalendarIcon size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  {errors.ngaySinh && (
                    <p className="mt-1 text-xs text-red-600">{errors.ngaySinh}</p>
                  )}
                </div>

                {/* Địa chỉ */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                    <MapPin size={14} />
                    Địa chỉ
                  </label>
                  <input
                    type="text"
                    value={formData.diaChi}
                    onChange={(e) => handleInputChange('diaChi', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="Nhập địa chỉ"
                  />
                </div>
              </div>
            </div>

            {/* Identity Information Section */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                <CreditCard size={16} />
                Thông tin định danh
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Số CCCD */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Số CCCD <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.soCCCD}
                    onChange={(e) => handleInputChange('soCCCD', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${errors.soCCCD ? 'border-red-300' : 'border-slate-300'
                      }`}
                    placeholder="Nhập số CCCD"
                  />
                  {errors.soCCCD && (
                    <p className="mt-1 text-xs text-red-600">{errors.soCCCD}</p>
                  )}
                </div>

                {/* Ngày cấp CCCD */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                    Ngày cấp CCCD <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={getDateInputValue(formData.ngayCapCCCD)}
                      onChange={(e) => handleDateChange('ngayCapCCCD', e.target.value)}
                      className={`w-full px-3 py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${errors.ngayCapCCCD ? 'border-red-300' : 'border-slate-300'
                        }`}
                    />
                    <CalendarIcon size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  {errors.ngayCapCCCD && (
                    <p className="mt-1 text-xs text-red-600">{errors.ngayCapCCCD}</p>
                  )}
                </div>

                {/* MST cá nhân */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    MST cá nhân <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.mstCaNhan}
                    onChange={(e) => handleInputChange('mstCaNhan', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${errors.mstCaNhan ? 'border-red-300' : 'border-slate-300'
                      }`}
                    placeholder="Nhập MST cá nhân"
                  />
                  {errors.mstCaNhan && (
                    <p className="mt-1 text-xs text-red-600">{errors.mstCaNhan}</p>
                  )}
                </div>

                {/* Mã số BHXH */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Mã số BHXH <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.maSoBHXH}
                    onChange={(e) => handleInputChange('maSoBHXH', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${errors.maSoBHXH ? 'border-red-300' : 'border-slate-300'
                      }`}
                    placeholder="Nhập mã số BHXH"
                  />
                  {errors.maSoBHXH && (
                    <p className="mt-1 text-xs text-red-600">{errors.maSoBHXH}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Education Section */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                <GraduationCap size={16} />
                Thông tin học vấn
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Bằng ĐH chuyên ngành */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Bằng ĐH chuyên ngành
                  </label>
                  <input
                    type="text"
                    value={formData.bangDHChuyenNganh}
                    onChange={(e) => handleInputChange('bangDHChuyenNganh', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    placeholder="Nhập bằng đại học chuyên ngành"
                  />
                </div>

                {/* Năm tốt nghiệp */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Năm tốt nghiệp <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDecrement}
                      className="px-3 py-2 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors font-medium text-slate-600"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={formData.namTotNghiep}
                      onChange={(e) => handleInputChange('namTotNghiep', parseInt(e.target.value) || 0)}
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-center"
                      min="0"
                    />
                    <button
                      type="button"
                      onClick={handleIncrement}
                      className="px-3 py-2 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors font-medium text-slate-600"
                    >
                      +
                    </button>
                  </div>
                  {errors.namTotNghiep && (
                    <p className="mt-1 text-xs text-red-600">{errors.namTotNghiep}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Professional Certificate Section */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <Award size={16} />
                  Chứng chỉ hành nghề
                </h3>
                <button
                  onClick={() => openCertificateModal()}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md transition-colors shadow-sm"
                >
                  <Plus size={16} />
                  New
                </button>
              </div>

              {certificates.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">STT</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Tên file lưu</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">File</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Ảnh</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Ảnh 2</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">CCHN</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Hạng CCHN</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Ngày hết hạn</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Số tháng còn lại</th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-700">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {certificates.map((certificate, index) => {
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

                        return (
                          <tr key={certificate.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-slate-600">{index + 1}</td>
                            <td className="px-4 py-3 text-slate-700 font-medium">{certificate.tenFileLuu || '(Trống)'}</td>
                            <td className="px-4 py-3 text-slate-600">{certificate.file ? certificate.file.name : '(Trống)'}</td>
                            <td className="px-4 py-3">
                              {certificate.anh ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-10 h-10 rounded border border-slate-200 overflow-hidden">
                                    <img
                                      src={URL.createObjectURL(certificate.anh)}
                                      alt="Ảnh 1"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <span className="text-sm text-slate-600">{certificate.anh.name}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400">(Trống)</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {certificate.anh2 ? (
                                <div className="flex items-center gap-2">
                                  <div className="w-10 h-10 rounded border border-slate-200 overflow-hidden">
                                    <img
                                      src={URL.createObjectURL(certificate.anh2)}
                                      alt="Ảnh 2"
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <span className="text-sm text-slate-600">{certificate.anh2.name}</span>
                                </div>
                              ) : (
                                <span className="text-slate-400">(Trống)</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600">{certificate.cchn || '(Trống)'}</td>
                            <td className="px-4 py-3 text-slate-600">{certificate.hangCCHN || '(Trống)'}</td>
                            <td className="px-4 py-3 text-slate-600">{formatDate(certificate.ngayHetHanCC)}</td>
                            <td className="px-4 py-3 text-slate-600 font-medium">{calculateRemainingMonths(certificate.ngayHetHanCC)}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
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
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Dependents Section */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                  <Users size={16} />
                  Người phụ thuộc
                </h3>
                <button
                  onClick={() => openDependentModal()}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md transition-colors shadow-sm"
                >
                  <Plus size={16} />
                  New
                </button>
              </div>

              {dependents.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">STT</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Họ tên</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Ngày sinh</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Số CCCD</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">MST</th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-700">Quan hệ</th>
                        <th className="px-4 py-3 text-center font-semibold text-slate-700">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dependents.map((dependent, index) => {
                        const formatDate = (dateStr: string): string => {
                          if (!dateStr) return '(Trống)';
                          if (dateStr.includes('/')) return dateStr;
                          const parts = dateStr.split('-');
                          if (parts.length === 3) {
                            return `${parts[2]}/${parts[1]}/${parts[0]}`;
                          }
                          return dateStr;
                        };
                        return (
                          <tr key={dependent.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-slate-600">{index + 1}</td>
                            <td className="px-4 py-3 text-slate-700 font-medium">{dependent.hoTenNPT || '(Trống)'}</td>
                            <td className="px-4 py-3 text-slate-600">{formatDate(dependent.ngaySinhNPT)}</td>
                            <td className="px-4 py-3 text-slate-600">{dependent.soCCCDNPT || '(Trống)'}</td>
                            <td className="px-4 py-3 text-slate-600">{dependent.mstNPT || '(Trống)'}</td>
                            <td className="px-4 py-3 text-slate-600">{dependent.quanHe || '(Trống)'}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => editDependent(dependent)}
                                  className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
                                  title="Sửa"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => removeDependent(dependent.id)}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                  title="Xóa"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    {isEditMode ? 'Cập nhật' : 'Lưu trữ thông tin'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dependent Modal */}
      {showDependentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={closeDependentModal}
                  className="p-1 hover:bg-slate-100 rounded transition-colors"
                >
                  <X size={20} className="text-slate-600" />
                </button>
                <h3 className="text-lg font-bold text-slate-800">
                  {editingDependent ? `NPT_${dependents.findIndex(d => d.id === editingDependent.id) + 1}` : 'NPT_01'}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={closeDependentModal}
                  className="px-4 py-2 border border-blue-500 text-blue-600 rounded-md hover:bg-blue-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={saveDependent}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Ho_Ten_NPT */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Ho_Ten_NPT
                </label>
                <input
                  type="text"
                  value={dependentFormData.hoTenNPT}
                  onChange={(e) => handleDependentInputChange('hoTenNPT', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="Nhập họ tên người phụ thuộc"
                />
              </div>

              {/* Ngay_Sinh_NPT */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Ngay_Sinh_NPT <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={getDateInputValue(dependentFormData.ngaySinhNPT)}
                    onChange={(e) => handleDependentInputChange('ngaySinhNPT', e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                  <CalendarIcon size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* So_CCCD_NPT */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  So_CCCD_NPT
                </label>
                <input
                  type="text"
                  value={dependentFormData.soCCCDNPT}
                  onChange={(e) => handleDependentInputChange('soCCCDNPT', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="(Trống)"
                />
              </div>

              {/* MST_NPT */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  MST_NPT
                </label>
                <input
                  type="text"
                  value={dependentFormData.mstNPT}
                  onChange={(e) => handleDependentInputChange('mstNPT', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="(Trống)"
                />
              </div>

              {/* Quan_He */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Quan_He
                </label>
                <input
                  type="text"
                  value={dependentFormData.quanHe}
                  onChange={(e) => handleDependentInputChange('quanHe', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  placeholder="Nhập quan hệ (VD: Con, Vợ, Chồng...)"
                />
              </div>
            </div>
          </div>
        </div>
      )}

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
                      {filteredFileNameOptions.filter(opt =>
                        opt.toLowerCase().includes(certificateFileNameSearch.toLowerCase())
                      ).length > 0 ? (
                        filteredFileNameOptions.filter(opt =>
                          opt.toLowerCase().includes(certificateFileNameSearch.toLowerCase())
                        ).map((option, index) => (
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
                    {certificateFormData.file ? (
                      <>
                        <FileText size={24} className="text-slate-600" />
                        <span className="flex-1 text-sm text-slate-700">{certificateFormData.file.name}</span>
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
                    {certificateFormData.anh ? (
                      <>
                        <div className="w-10 h-10 rounded border border-slate-200 overflow-hidden">
                          <img
                            src={URL.createObjectURL(certificateFormData.anh)}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="flex-1 text-sm text-slate-700">{certificateFormData.anh.name}</span>
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
                    {certificateFormData.anh2 ? (
                      <>
                        <div className="w-10 h-10 rounded border border-slate-200 overflow-hidden">
                          <img
                            src={URL.createObjectURL(certificateFormData.anh2)}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <span className="flex-1 text-sm text-slate-700">{certificateFormData.anh2.name}</span>
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
