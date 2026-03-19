import React from 'react';
import { 
  Package, 
  ListChecks, 
  BarChart3, 
  PenLine, 
  ClipboardList, 
  History 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const logisticsModules = [
  {
    title: 'Quản lý vận đơn',
    description: 'Mở ứng dụng',
    icon: Package,
    color: 'bg-orange-500',
    path: '/kho-van/quan-ly-van-don'
  },
  {
    title: 'Danh sách vận đơn',
    description: 'Mở ứng dụng',
    icon: ListChecks,
    color: 'bg-blue-500',
    path: '/kho-van/danh-sach-van-don'
  },
  {
    title: 'Báo cáo vận đơn',
    description: 'Mở ứng dụng',
    icon: BarChart3,
    color: 'bg-teal-500',
    path: '/kho-van/bao-cao-van-don'
  },
  {
    title: 'Chỉnh sửa đơn',
    description: 'Mở ứng dụng',
    icon: PenLine,
    color: 'bg-cyan-500',
    path: '/kho-van/chinh-sua-don'
  },
  {
    title: 'FFM',
    description: 'Mở ứng dụng',
    icon: ClipboardList,
    color: 'bg-indigo-500',
    path: '/kho-van/ffm'
  },
  {
    title: 'Lịch sử thay đổi',
    description: 'Mở ứng dụng',
    icon: History,
    color: 'bg-slate-500',
    path: '/kho-van/lich-su-thay-doi'
  }
];

export function Logistics() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-slate-700 uppercase">
        Quản lý Giao hàng
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {logisticsModules.map((module, index) => (
          <Link 
            key={module.title} 
            to={module.path}
            className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group flex items-center gap-4"
          >
            <div className={`${module.color} w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md shadow-slate-200 group-hover:scale-110 transition-transform duration-300 shrink-0`}>
              <module.icon className="w-6 h-6" strokeWidth={2} />
            </div>
            <div className="space-y-1">
              <h3 className={`font-bold text-base transition-colors ${index === 0 ? 'text-pink-600' : 'text-slate-800 group-hover:text-pink-600'}`}>
                {module.title}
              </h3>
              <p className="text-xs text-slate-500">
                {module.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
