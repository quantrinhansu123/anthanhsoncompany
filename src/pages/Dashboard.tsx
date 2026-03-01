import React, { useState } from 'react';
import { 
  Users, 
  Calculator, 
  UserCircle, 
  GitBranch,
  Award,
  ArrowLeftRight,
  FolderKanban,
  FileSignature,
  BookOpen
} from 'lucide-react';
import { Link } from 'react-router-dom';

const modules = [
  {
    title: 'Hành chính nhân sự',
    description: 'Công văn, hợp đồng, tuyển dụng, chấm công, lương.',
    icon: Users,
    color: 'bg-orange-500',
    path: '/hanh-chinh'
  },
  {
    title: 'Kế toán',
    description: 'Kế toán, ngân sách, báo cáo tài chính.',
    icon: Calculator,
    color: 'bg-purple-600',
    path: '/tai-chinh'
  },
  {
    title: 'Khách hàng',
    description: 'Quản lý thông tin khách hàng, hợp đồng, dịch vụ.',
    icon: UserCircle,
    color: 'bg-emerald-500',
    path: '/khach-hang'
  },
  {
    title: 'Quy trình',
    description: 'Quản lý quy trình làm việc, phê duyệt, luồng công việc.',
    icon: GitBranch,
    color: 'bg-teal-600',
    path: '/quy-trinh'
  }
];

const allGroups = [
  {
    title: 'HCNS',
    fullTitle: 'Hành chính nhân sự',
    icon: Users,
    color: 'bg-orange-500',
    items: [
      { title: 'Nhân sự', description: 'Quản lý thông tin nhân viên, tuyển dụng, đào tạo.', icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-50', path: '/nhan-su' },
      { title: 'Chứng chỉ hành nghề', description: 'Quản lý chứng chỉ, giấy phép hành nghề của nhân viên.', icon: Award, color: 'text-emerald-600', bgColor: 'bg-emerald-50', path: '/hanh-chinh/chung-chi-hanh-nghe' },
    ]
  },
  {
    title: 'Kế toán',
    fullTitle: 'Kế toán',
    icon: Calculator,
    color: 'bg-purple-600',
    items: [
      { title: 'Thu chi', description: 'Quản lý thu chi, phiếu thu, phiếu chi, quỹ tiền mặt.', icon: ArrowLeftRight, color: 'text-blue-600', bgColor: 'bg-blue-50', path: '/tai-chinh/thu-chi' },
      { title: 'Thu chi nhân sự', description: 'Quản lý thu chi liên quan đến nhân sự, lương, phụ cấp.', icon: Users, color: 'text-emerald-600', bgColor: 'bg-emerald-50', path: '/tai-chinh/thu-chi-nhan-su' },
    ]
  },
  {
    title: 'Khách hàng',
    fullTitle: 'Khách hàng',
    icon: UserCircle,
    color: 'bg-emerald-500',
    items: [
      { title: 'DS Khách Hàng', description: 'Danh sách khách hàng, thông tin liên hệ, lịch sử giao dịch.', icon: UserCircle, color: 'text-blue-600', bgColor: 'bg-blue-50', path: '/khach-hang/danh-sach' },
      { title: 'Dự án', description: 'Quản lý dự án, tiến độ, ngân sách, nhân sự.', icon: FolderKanban, color: 'text-emerald-600', bgColor: 'bg-emerald-50', path: '/khach-hang/du-an' },
      { title: 'Hợp đồng', description: 'Quản lý hợp đồng, ký kết, gia hạn, thanh lý.', icon: FileSignature, color: 'text-purple-600', bgColor: 'bg-purple-50', path: '/khach-hang/hop-dong' },
    ]
  },
  {
    title: 'Quy trình',
    fullTitle: 'Quy trình',
    icon: GitBranch,
    color: 'bg-teal-600',
    items: [
      { title: 'Thư viện lỗi', description: 'Quản lý thư viện lỗi, phân loại, xử lý và giải pháp.', icon: BookOpen, color: 'text-blue-600', bgColor: 'bg-blue-50', path: '/quy-trinh/thu-vien-loi' },
    ]
  }
];

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<'chuc-nang' | 'danh-dau' | 'tat-ca'>('chuc-nang');

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2 flex-wrap">
          Chào buổi tối, <span className="text-red-600">Người dùng Demo</span> 👋
        </h2>
      </div>

      <div className="bg-white p-1 rounded-lg inline-flex border border-slate-200 shadow-sm overflow-x-auto max-w-full">
        <button 
          onClick={() => setActiveTab('chuc-nang')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'chuc-nang' 
              ? 'text-red-600 bg-red-50' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Chức năng
        </button>
        <button 
          onClick={() => setActiveTab('danh-dau')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'danh-dau' 
              ? 'text-red-600 bg-red-50' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Đánh dấu
        </button>
        <button 
          onClick={() => setActiveTab('tat-ca')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'tat-ca' 
              ? 'text-red-600 bg-red-50' 
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Tất cả
        </button>
      </div>

      {activeTab === 'chuc-nang' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {modules.map((module) => (
            <Link 
              key={module.title} 
              to={module.path}
              className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-row items-center text-left gap-4 h-full"
            >
              <div className={`${module.color} w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-md md:shadow-lg shadow-slate-200 group-hover:scale-110 transition-transform duration-300 shrink-0`}>
                <module.icon className="w-6 h-6 md:w-7 md:h-7" strokeWidth={1.5} />
              </div>
              <div className="space-y-1 md:space-y-2 flex-1">
                <h3 className="font-bold text-slate-800 text-base md:text-lg group-hover:text-red-600 transition-colors">
                  {module.title}
                </h3>
                <p className="text-xs md:text-sm text-slate-500 leading-relaxed line-clamp-2 md:line-clamp-none">
                  {module.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {activeTab === 'danh-dau' && (
        <div className="text-center py-12 text-slate-500">
          <p>Chưa có mục nào được đánh dấu</p>
        </div>
      )}

      {activeTab === 'tat-ca' && (
        <div className="space-y-6 md:space-y-8">
          {allGroups.map((group) => (
            <div key={group.title} className="space-y-3 md:space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b border-slate-200">
                <div className={`${group.color} w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center text-white shadow-sm`}>
                  <group.icon size={20} className="md:w-6 md:h-6" />
                </div>
                <h2 className="text-sm md:text-base font-bold text-slate-800">
                  {group.fullTitle}
                </h2>
              </div>
              <div className="flex flex-wrap gap-3 md:gap-4">
                {group.items.map((item) => (
                  <Link
                    key={item.title}
                    to={item.path || '#'}
                    className="bg-white p-3 md:p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col items-center gap-2 md:gap-3 min-w-[100px] md:min-w-[140px] text-center"
                  >
                    <div className={`${item.bgColor} ${item.color} w-16 h-16 md:w-20 md:h-20 rounded-lg flex items-center justify-center`}>
                      <item.icon size={32} className="md:w-10 md:h-10" />
                    </div>
                    <h3 className="font-medium text-slate-800 text-xs md:text-sm group-hover:text-blue-600 transition-colors px-1">
                      {item.title}
                    </h3>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
