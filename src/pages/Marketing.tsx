import React from 'react';
import { 
  TrendingUp, 
  BarChart3, 
  ClipboardList, 
  ListChecks, 
  Database 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const marketingModules = [
  {
    title: 'Nhập báo cáo',
    description: 'Mở ứng dụng',
    icon: TrendingUp,
    color: 'bg-emerald-500',
    path: '/marketing/nhap-bao-cao'
  },
  {
    title: 'Xem báo cáo MKT',
    description: 'Mở ứng dụng',
    icon: BarChart3,
    color: 'bg-orange-500',
    path: '/marketing/xem-bao-cao'
  },
  {
    title: 'Danh sách đơn',
    description: 'Mở ứng dụng',
    icon: ClipboardList,
    color: 'bg-blue-500',
    path: '/marketing/danh-sach-don'
  },
  {
    title: 'Danh sách Page',
    description: 'Mở ứng dụng',
    icon: ListChecks,
    color: 'bg-purple-600',
    path: '/marketing/danh-sach-page'
  },
  {
    title: 'Ds báo cáo tay',
    description: 'Mở ứng dụng',
    icon: Database,
    color: 'bg-teal-600',
    path: '/marketing/ds-bao-cao-tay'
  }
];

export function Marketing() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-slate-700 uppercase">
        Quản lý Marketing
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {marketingModules.map((module) => (
          <Link 
            key={module.title} 
            to={module.path}
            className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group flex items-center gap-4"
          >
            <div className={`${module.color} w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md shadow-slate-200 group-hover:scale-110 transition-transform duration-300 shrink-0`}>
              <module.icon className="w-6 h-6" strokeWidth={2} />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-slate-800 text-base group-hover:text-red-600 transition-colors">
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
