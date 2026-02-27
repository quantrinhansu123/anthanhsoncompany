import React from 'react';
import { 
  FileText, 
  Users, 
  Megaphone, 
  Wallet, 
  ShoppingCart, 
  Package, 
  Settings, 
  Bot, 
  Copyright 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const modules = [
  {
    title: 'Hành chính',
    description: 'Công văn, hợp đồng, văn thư lưu trữ.',
    icon: FileText,
    color: 'bg-orange-500',
    path: '/hanh-chinh'
  },
  {
    title: 'Nhân sự',
    description: 'Tuyển dụng, đào tạo, chấm công, lương.',
    icon: Users,
    color: 'bg-emerald-500',
    path: '/nhan-su'
  },
  {
    title: 'Marketing',
    description: 'Chiến dịch, khách hàng, báo cáo marketing.',
    icon: Megaphone,
    color: 'bg-pink-600',
    path: '/marketing'
  },
  {
    title: 'Tài chính',
    description: 'Kế toán, ngân sách, báo cáo tài chính.',
    icon: Wallet,
    color: 'bg-purple-600',
    path: '/tai-chinh'
  },
  {
    title: 'Mua hàng',
    description: 'Đặt hàng, nhà cung cấp, đấu thầu.',
    icon: ShoppingCart,
    color: 'bg-orange-600',
    path: '/mua-hang'
  },
  {
    title: 'Kho vận',
    description: 'Tồn kho, xuất nhập kho, vận chuyển.',
    icon: Package,
    color: 'bg-teal-600',
    path: '/kho-van'
  },
  {
    title: 'Hệ thống',
    description: 'Cấu hình, phân quyền và nhân sự.',
    icon: Settings,
    color: 'bg-slate-700',
    path: '/he-thong'
  },
  {
    title: 'Trợ lý AI',
    description: 'Cấu hình, phân quyền và nhân sự.',
    icon: Bot,
    color: 'bg-indigo-500',
    path: '/tro-ly-ai'
  }
];

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg md:text-xl font-bold text-slate-800 flex items-center gap-2 flex-wrap">
          Chào buổi tối, <span className="text-red-600">Người dùng Demo</span> 👋
        </h2>
      </div>

      <div className="bg-white p-1 rounded-lg inline-flex border border-slate-200 shadow-sm overflow-x-auto max-w-full">
        <button className="px-4 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-md transition-colors">
          Chức năng
        </button>
        <button className="px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors">
          Đánh dấu
        </button>
        <button className="px-4 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-md transition-colors">
          Tất cả
        </button>
      </div>

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
    </div>
  );
}
