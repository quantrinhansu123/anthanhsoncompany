import React, { useState, useEffect } from 'react';
import { addMonths, isBefore, parse, parseISO, startOfDay } from 'date-fns';
import {
  X, User, Mail, Phone, MapPin, CreditCard, Calendar as CalendarIcon, FileText, Users, Eye, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { employeeService, type Employee } from '../../lib/services/employeeService';
import { certificateService, type ProfessionalCertificate } from '../../lib/services/certificateService';
import { dependentPersonService, type DependentPerson } from '../../lib/services/dependentPersonService';
import { contractService, ContractRow } from '../../lib/services/contractService';
import { thuChiService, ThuChiRow } from '../../lib/services/thuChiService';
import { projectService } from '../../lib/services/projectService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    employeeId: string | number | null;
}

export function ChiTietNhanVienModal({ isOpen, onClose, employeeId }: Props) {
  const navigate = useNavigate();
  const [viewingEmployee, setViewingEmployee] = useState<Employee | null>(null);
  const [activeTab, setActiveTab] = useState<'employee' | 'license' | 'dependent' | 'finance' | 'projects'>('employee');
  const [certificates, setCertificates] = useState<ProfessionalCertificate[]>([]);
  const [dependentPersons, setDependentPersons] = useState<DependentPerson[]>([]);
  const [loadingCertificates, setLoadingCertificates] = useState(false);
  const [loadingDependents, setLoadingDependents] = useState(false);
  const [employeeContracts, setEmployeeContracts] = useState<ContractRow[]>([]);
  const [employeeThuChi, setEmployeeThuChi] = useState<ThuChiRow[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [loadingThuChi, setLoadingThuChi] = useState(false);
  const [projectsByEmployee, setProjectsByEmployee] = useState<Map<string, { project: any; contracts: ContractRow[] }>>(new Map());
  const [loadingBase, setLoadingBase] = useState(false);

  useEffect(() => {
    if (isOpen && employeeId) {
      loadAllData(employeeId);
    } else {
        // Reset states when closed
        setViewingEmployee(null);
        setActiveTab('employee');
    }
  }, [isOpen, employeeId]);

  const loadAllData = async (id: string | number) => {
    try {
      setLoadingBase(true);
      // Load employee data
      const employee = await employeeService.getById(id);
      setViewingEmployee(employee);
      setLoadingBase(false);

      // Load certificates data
      setLoadingCertificates(true);
      certificateService.getByEmployeeId(id.toString())
        .then(setCertificates)
        .catch(err => { console.error('Error loading certificates:', err); setCertificates([]); })
        .finally(() => setLoadingCertificates(false));

      // Load dependent persons data
      setLoadingDependents(true);
      dependentPersonService.getByEmployeeId(id)
        .then(setDependentPersons)
        .catch(err => { console.error('Error loading dependents:', err); setDependentPersons([]); })
        .finally(() => setLoadingDependents(false));

      // Load contracts, projects, and finance
      setLoadingContracts(true);
      try {
        const allContracts = await contractService.getAll();
        const employeeContractsList = allContracts.filter(c => c.nhan_su_id === id.toString());
        setEmployeeContracts(employeeContractsList);

        const allProjects = await projectService.getAll();
        const employeeProjects = allProjects.filter(p => 
          p.manager_id === id.toString() || p.executor_id === id.toString()
        );

        const projectsMap = new Map<string, { project: any; contracts: ContractRow[] }>();
        
        employeeProjects.forEach(project => {
          if (!projectsMap.has(project.id)) {
            projectsMap.set(project.id, { project, contracts: [] });
          }
          const projectContracts = allContracts.filter(c => c.du_an_id === project.id);
          projectsMap.get(project.id)!.contracts = projectContracts;
        });

        employeeContractsList.forEach(contract => {
          if (contract.du_an_id) {
            const project = allProjects.find(p => p.id === contract.du_an_id);
            if (project && !projectsMap.has(contract.du_an_id)) {
              projectsMap.set(contract.du_an_id, { project, contracts: [] });
            }
            if (project && projectsMap.has(contract.du_an_id)) {
              const existingContracts = projectsMap.get(contract.du_an_id)!.contracts;
              if (!existingContracts.find(c => c.id === contract.id)) {
                existingContracts.push(contract);
              }
            }
          }
        });
        
        setProjectsByEmployee(projectsMap);

        setLoadingThuChi(true);
        thuChiService.getAll()
          .then(all => setEmployeeThuChi(all.filter(tc => tc.nhan_su_id === id.toString())))
          .catch(err => console.error('Error loading thu chi:', err))
          .finally(() => setLoadingThuChi(false));

      } catch (err) {
        console.error('Error loading extended data:', err);
      } finally {
        setLoadingContracts(false);
      }
    } catch (err: any) {
      console.error('Error loading employee details:', err);
      setLoadingBase(false);
    }
  };

  if (!isOpen) return null;

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
    } catch { return null; }
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

  if (loadingBase || !viewingEmployee) {
    return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-lg shadow-xl p-8 flex flex-col items-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                <p className="text-sm text-slate-500">Đang tải thông tin nhân viên...</p>
            </div>
        </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <User size={20} />
            Chi tiết nhân viên: {(viewingEmployee as any).full_name || viewingEmployee.full_name || viewingEmployee.name || viewingEmployee.hoTen || ''}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded transition-colors"
          >
            <X size={20} className="text-slate-600" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 bg-slate-50">
          <div className="flex gap-1 px-6 overflow-x-auto no-scrollbar">
            {[
                { id: 'employee', label: 'Thông tin nhân viên', icon: <User size={16} /> },
                { id: 'license', label: 'Chứng chỉ hành nghề', icon: <FileText size={16} /> },
                { id: 'dependent', label: 'Người phụ thuộc', icon: <Users size={16} /> },
                { id: 'finance', label: 'Thu chi', icon: <CreditCard size={16} /> },
                { id: 'projects', label: 'Dự án phụ trách', icon: <FileText size={16} /> },
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id
                        ? 'text-blue-600 border-blue-600 bg-white'
                        : 'text-slate-600 border-transparent hover:text-slate-800'
                    }`}
                >
                    {tab.icon}
                    {tab.label}
                </button>
            ))}
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'employee' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ảnh nhân viên */}
              <div className="md:col-span-2">
                <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  {(() => {
                    const fullName = (viewingEmployee as any).full_name || viewingEmployee.full_name || viewingEmployee.name || viewingEmployee.hoTen || 'NV';
                    const avatarUrl = (viewingEmployee as any).anh_nhan_su || (viewingEmployee as any).avatar_url || null;
                    const fallbackUrl = 'https://ui-avatars.com/api/?background=0f172a&color=ffffff&size=256&name=' + encodeURIComponent(fullName);

                    return (
                      <>
                        <div className="flex items-center gap-4">
                          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-white shadow-md bg-slate-100">
                            <img
                              src={(avatarUrl && String(avatarUrl).trim() !== '') ? String(avatarUrl) : fallbackUrl}
                              alt={`Ảnh nhân viên ${fullName}`}
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).src = fallbackUrl; }}
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Ảnh chuyên nghiệp</div>
                            <div className="text-base sm:text-lg font-bold text-slate-900 truncate">{fullName}</div>
                            <div className="text-sm text-slate-600 truncate">
                              {(viewingEmployee as any).chuc_vu || viewingEmployee.chucVu || '(Chưa có chức vụ)'}
                              {' · '}
                              {(viewingEmployee as any).phong_ban || viewingEmployee.phongBan || '(Chưa có phòng ban)'}
                            </div>
                          </div>
                        </div>
                        <div className="sm:ml-auto flex items-center gap-2">
                          <span className="text-xs text-slate-500">{(viewingEmployee as any).code || viewingEmployee.code || '(Chưa có mã)'}</span>
                          <span className="h-4 w-px bg-slate-200" />
                          <div className="text-xs">{getStatusBadge(viewingEmployee.status || 'active')}</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Thông tin cơ bản & cá nhân */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-2">Thông tin cơ bản</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><label className="block text-xs font-medium text-slate-500">Mã nhân viên</label><p className="font-medium">{(viewingEmployee as any).code || viewingEmployee.code || '(Trống)'}</p></div>
                    <div><label className="block text-xs font-medium text-slate-500">Phòng ban</label><p>{(viewingEmployee as any).phong_ban || viewingEmployee.phongBan || '(Trống)'}</p></div>
                    <div><label className="block text-xs font-medium text-slate-500">Chức vụ</label><p>{(viewingEmployee as any).chuc_vu || viewingEmployee.chucVu || '(Trống)'}</p></div>
                    <div><label className="block text-xs font-medium text-slate-500 flex items-center gap-1"><Mail size={12}/> Email</label><p>{viewingEmployee.email || '(Trống)'}</p></div>
                    <div className="col-span-2"><label className="block text-xs font-medium text-slate-500 flex items-center gap-1"><Phone size={12}/> Số điện thoại</label><p>{(viewingEmployee as any).sdt_nhan_vien || (viewingEmployee as any).phone || '(Trống)'}</p></div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-2">Thông tin cá nhân</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><label className="block text-xs font-medium text-slate-500 flex items-center gap-1"><CalendarIcon size={12}/> Ngày sinh</label><p>{viewingEmployee.ngaySinh ? new Date(viewingEmployee.ngaySinh).toLocaleDateString('vi-VN') : '(Trống)'}</p></div>
                    <div><label className="block text-xs font-medium text-slate-500">Số CCCD</label><p>{viewingEmployee.soCCCD || '(Trống)'}</p></div>
                    <div><label className="block text-xs font-medium text-slate-500">MST cá nhân</label><p>{viewingEmployee.mstCaNhan || '(Trống)'}</p></div>
                    <div><label className="block text-xs font-medium text-slate-500">Mã số BHXH</label><p>{viewingEmployee.maSoBHXH || '(Trống)'}</p></div>
                    <div className="col-span-2"><label className="block text-xs font-medium text-slate-500 flex items-center gap-1"><MapPin size={12}/> Địa chỉ</label><p>{viewingEmployee.diaChi || '(Trống)'}</p></div>
                </div>
              </div>

              {/* Học vấn & Khác */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-2">Học vấn</h4>
                <div className="text-sm space-y-2">
                    <div><label className="block text-xs font-medium text-slate-500">Bằng đại học chuyên ngành</label><p>{viewingEmployee.bangDHChuyenNganh || '(Trống)'}</p></div>
                    <div><label className="block text-xs font-medium text-slate-500">Năm tốt nghiệp</label><p>{viewingEmployee.namTotNghiep || '(Trống)'}</p></div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-2">Hành chính</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><label className="block text-xs font-medium text-slate-500">Ngày vào làm</label><p>{viewingEmployee.ngayVaoLam ? new Date(viewingEmployee.ngayVaoLam).toLocaleDateString('vi-VN') : '(Trống)'}</p></div>
                    <div><label className="block text-xs font-medium text-slate-500">Trạng thái</label><div className="mt-1">{getStatusBadge(viewingEmployee.status || 'active')}</div></div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'license' && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-2 mb-4">Chứng chỉ hành nghề</h4>
              {loadingCertificates ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600"/><span className="ml-2 text-sm text-slate-600">Đang tải...</span></div>
              ) : certificates.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3 text-left">Tên file</th>
                        <th className="p-3 text-left">CCHN</th>
                        <th className="p-3 text-left">Hạng</th>
                        <th className="p-3 text-left">Ngày hết hạn</th>
                        <th className="p-3 text-left">File/Ảnh</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {certificates.map((cert, index) => (
                        <tr key={index} className="hover:bg-slate-50">
                          <td className="p-3">{cert.tenFileLuu || '(Trống)'}</td>
                          <td className="p-3">{cert.cchn || '(Trống)'}</td>
                          <td className="p-3 text-center">{cert.hangCCHN || '-'}</td>
                          <td className={`p-3 ${isExpiryWithinTwoMonths(cert.ngayHetHanCC) ? 'text-red-600 font-semibold' : ''}`}>
                            {formatExpiryDate(cert.ngayHetHanCC)}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2 text-xs">
                                {cert.file_url && <a href={cert.file_url} target="_blank" className="text-blue-600 hover:underline">File</a>}
                                {cert.anh_url && <a href={cert.anh_url} target="_blank" className="text-blue-600 hover:underline">Ảnh 1</a>}
                                {cert.anh2_url && <a href={cert.anh2_url} target="_blank" className="text-blue-600 hover:underline">Ảnh 2</a>}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div className="text-center py-8 text-slate-500 text-sm italic">Không có dữ liệu chứng chỉ</div>}
            </div>
          )}

          {activeTab === 'dependent' && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-2 mb-4">Người phụ thuộc</h4>
              {loadingDependents ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600"/><span className="ml-2 text-sm text-slate-600">Đang tải...</span></div>
              ) : dependentPersons.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3 text-left">Họ tên</th>
                        <th className="p-3 text-left">Ngày sinh</th>
                        <th className="p-3 text-left">Số CCCD</th>
                        <th className="p-3 text-left">MST</th>
                        <th className="p-3 text-left">Quan hệ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {dependentPersons.map((person, index) => (
                        <tr key={index} className="hover:bg-slate-50">
                          <td className="p-3 font-medium">{person.ho_ten_npt || person.hoTenNPT || '(Trống)'}</td>
                          <td className="p-3">{person.ngay_sinh_npt || person.ngaySinhNPT ? new Date(person.ngay_sinh_npt || person.ngaySinhNPT).toLocaleDateString('vi-VN') : '(Trống)'}</td>
                          <td className="p-3">{person.so_cccd_npt || person.soCCCDNPT || '(Trống)'}</td>
                          <td className="p-3">{person.mst_npt || person.mstNPT || '(Trống)'}</td>
                          <td className="p-3">{person.quan_he || person.quanHe || '(Trống)'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div className="text-center py-8 text-slate-500 text-sm italic">Không có dữ liệu người phụ thuộc</div>}
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-2 mb-4">Thu chi phụ trách</h4>
              {loadingThuChi ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600"/><span className="ml-2 text-sm text-slate-600">Đang tải...</span></div>
              ) : employeeThuChi.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3 text-left">Loại phiếu</th>
                        <th className="p-3 text-left">Ngày</th>
                        <th className="p-3 text-right">Số tiền</th>
                        <th className="p-3 text-left">Nội dung</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {employeeThuChi.map((tc, index) => (
                        <tr key={index} className="hover:bg-slate-50">
                          <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${tc.loai_phieu === 'Phiếu thu' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{tc.loai_phieu}</span></td>
                          <td className="p-3 text-xs">{tc.ngay ? new Date(tc.ngay).toLocaleDateString('vi-VN') : ''}</td>
                          <td className="p-3 text-right font-medium">{tc.so_tien?.toLocaleString()} đ</td>
                          <td className="p-3 text-xs truncate max-w-[200px]">{tc.noi_dung}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div className="text-center py-8 text-slate-500 text-sm italic">Không có dữ liệu thu chi</div>}
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide border-b border-slate-200 pb-2 mb-4">Dự án & Hợp đồng phụ trách</h4>
              {loadingContracts ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600"/><span className="ml-2 text-sm text-slate-600">Đang tải...</span></div>
              ) : projectsByEmployee.size > 0 ? (
                <div className="space-y-4">
                  {Array.from(projectsByEmployee.entries()).map(([projectId, { project, contracts }]) => (
                    <div key={projectId} className="border border-slate-200 rounded-lg overflow-hidden text-sm">
                      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                        <span className="font-bold text-slate-800">{project.ten_du_an}</span>
                        <button onClick={() => { onClose(); navigate('/khach-hang/du-an', { state: { projectId } }); }} className="text-blue-600 hover:text-blue-800 transition-colors"><Eye size={16}/></button>
                      </div>
                      <div className="p-3 text-xs space-y-1">
                        {contracts.map((c, i) => (
                            <div key={i} className="flex justify-between items-center p-2 bg-white border border-slate-100 rounded">
                                <span>{c.so_hop_dong || '(Trống)'}</span>
                                <span className="font-semibold text-slate-700">{c.gia_tri_hd?.toLocaleString()} đ</span>
                            </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <div className="text-center py-8 text-slate-500 text-sm italic">Không có dự án phụ trách</div>}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-6 py-2 border border-slate-300 bg-white text-slate-700 font-semibold rounded-lg text-sm hover:bg-slate-50 transition-all">Đóng</button>
          <button
            onClick={() => { onClose(); navigate(`/nhan-su/them/${employeeId}`); }}
            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg text-sm hover:bg-blue-700 transition-all"
          >
            Chỉnh sửa
          </button>
        </div>
      </div>
    </div>
  );
}
