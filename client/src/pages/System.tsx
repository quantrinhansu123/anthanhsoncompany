import React, { useState, useMemo } from 'react';
import {
  Building2,
  ListOrdered,
  Briefcase,
  ClipboardList,
  Users,
  Building,
  MapPin,
  Shield,
  DatabaseBackup,
  Monitor,
  ArrowLeft,
  Search,
  ChevronRight,
  CheckCircle,
  X
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

// Toast component
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'info' | 'warning'; onClose: () => void }) {
  React.useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);
  const bgColor = type === 'success' ? 'bg-emerald-500' : type === 'warning' ? 'bg-amber-500' : 'bg-blue-500';
  return (
    <div className={`fixed top-5 right-5 z-[100] ${bgColor} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 toast-enter`}>
      <CheckCircle size={18} />
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded p-0.5 transition-colors"><X size={14} /></button>
    </div>
  );
}

interface SystemItemProps {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  hasArrow?: boolean;
  onClick?: () => void;
}

const SystemCard: React.FC<SystemItemProps> = ({ title, description, icon: Icon, color, bgColor, hasArrow, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="card-hover bg-white p-4 rounded-xl border border-slate-200 shadow-sm group flex items-center gap-4 cursor-pointer"
    >
      <div className={`${bgColor} ${color} w-12 h-12 rounded-xl flex items-center justify-center shrink-0`}>
        <Icon size={24} strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-slate-800 text-base group-hover:text-blue-600 transition-colors">
          {title}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          {description}
        </p>
      </div>
      {hasArrow && (
        <ChevronRight size={20} className="text-blue-500" />
      )}
    </div>
  );
}

const sections = [
  {
    title: 'Sơ đồ',
    items: [
      { title: 'Phòng ban', description: 'Cơ cấu tổ chức đơn vị.', icon: Building2, color: 'text-blue-600', bgColor: 'bg-blue-50', hasArrow: true, route: '/he-thong/phong-ban' },
      { title: 'Cấp bậc', description: 'Hệ thống thang bảng lương/level.', icon: ListOrdered, color: 'text-orange-600', bgColor: 'bg-orange-50', route: '' },
      { title: 'Chức vụ', description: 'Quản lý các vị trí công việc.', icon: Briefcase, color: 'text-blue-600', bgColor: 'bg-blue-50', route: '' },
      { title: 'Chức năng nhiệm vụ', description: 'Sứ mệnh, chức năng phòng ban và nhiệm vụ, bộ chỉ số KPI.', icon: ClipboardList, color: 'text-slate-600', bgColor: 'bg-slate-100', route: '' },
      { title: 'Nhân viên', description: 'Hồ sơ và thông tin nhân sự.', icon: Users, color: 'text-emerald-600', bgColor: 'bg-emerald-50', route: '/nhan-su' },
    ]
  },
  {
    title: 'Bảo mật & Cấu hình',
    items: [
      { title: 'Thông tin công ty', description: 'Thiết lập thông tin pháp nhân.', icon: Building, color: 'text-purple-600', bgColor: 'bg-purple-50', route: '' },
      { title: 'Chi nhánh', description: 'Quản lý danh sách chi nhánh và địa điểm.', icon: MapPin, color: 'text-slate-600', bgColor: 'bg-slate-100', route: '' },
      { title: 'Phân quyền', description: 'Vai trò và quyền hạn.', icon: Shield, color: 'text-red-600', bgColor: 'bg-red-50', route: '' },
      { title: 'Sao lưu & Khôi phục', description: 'Xuất, nhập và khôi phục dữ liệu hệ thống.', icon: DatabaseBackup, color: 'text-cyan-600', bgColor: 'bg-cyan-50', route: '' },
      { title: 'Thiết bị đăng nhập', description: 'Quản lý tài khoản đã đăng nhập trên những thiết bị nào. Đăng xuất thiết bị từ xa.', icon: Monitor, color: 'text-teal-600', bgColor: 'bg-teal-50', route: '' },
    ]
  }
];

export function System() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'marked'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  // Filter sections by search term
  const filteredSections = useMemo(() => {
    if (!searchTerm) return sections;
    const term = searchTerm.toLowerCase();
    return sections.map(section => ({
      ...section,
      items: section.items.filter(item =>
        item.title.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term)
      )
    })).filter(section => section.items.length > 0);
  }, [searchTerm]);

  const handleCardClick = (item: typeof sections[0]['items'][0]) => {
    if (item.route) {
      navigate(item.route);
    } else {
      setToast({ message: `Module "${item.title}" đang phát triển`, type: 'info' });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Top Toolbar */}
      <div className="bg-white p-2 rounded-lg border border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => navigate(-1)}
            className="btn-secondary flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-md border border-slate-200"
          >
            <ArrowLeft size={16} />
            Quay lại
          </button>

          <div className="h-6 w-px bg-slate-200 mx-1"></div>

          <button
            onClick={() => setActiveTab('all')}
            className={`tab-btn px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'all' ? 'font-bold text-blue-600 bg-blue-50 active' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setActiveTab('marked')}
            className={`tab-btn px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === 'marked' ? 'font-bold text-blue-600 bg-blue-50 active' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Đánh dấu
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm module theo tên hoặc mô tả.."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Content Sections */}
      <div className="space-y-8">
        {activeTab === 'marked' ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <ClipboardList size={28} className="text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">Chưa có module nào được đánh dấu</p>
            <p className="text-xs text-slate-400 mt-1">Tính năng đánh dấu đang phát triển</p>
          </div>
        ) : filteredSections.length > 0 ? (
          filteredSections.map((section) => (
            <div key={section.title} className="space-y-4">
              <div className="flex items-center gap-2 border-l-4 border-blue-600 pl-3">
                <h2 className="text-sm font-bold text-blue-600 uppercase tracking-wide">
                  {section.title}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {section.items.map((item) => (
                  <SystemCard
                    key={item.title}
                    title={item.title}
                    description={item.description}
                    icon={item.icon}
                    color={item.color}
                    bgColor={item.bgColor}
                    hasArrow={item.hasArrow}
                    onClick={() => handleCardClick(item)}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <Search size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">Không tìm thấy module nào</p>
            <p className="text-xs text-slate-400 mt-1">Thử thay đổi từ khóa tìm kiếm</p>
          </div>
        )}
      </div>
    </div>
  );
}
