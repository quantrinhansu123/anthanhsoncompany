import React from 'react';
import { 
  Users, 
  ClipboardList, 
  UserPlus, 
  DollarSign, 
  Award, 
  Target, 
  ListTodo, 
  CalendarCheck 
} from 'lucide-react';
import { Link } from 'react-router-dom';

const hrModules = [
  {
    title: 'Bảng tin nội bộ',
    description: 'Mở ứng dụng',
    icon: Users,
    color: 'bg-pink-600',
    path: '/nhan-su/bang-tin'
  },
  {
    title: 'Hồ sơ nhân sự',
    description: 'Mở ứng dụng',
    icon: ClipboardList,
    color: 'bg-pink-600',
    path: '/nhan-su/ho-so'
  },
  {
    title: 'Tuyển dụng',
    description: 'Mở ứng dụng',
    icon: UserPlus,
    color: 'bg-pink-600',
    path: '/nhan-su/tuyen-dung'
  },
  {
    title: 'Bậc lương & thăng tiến',
    description: 'Mở ứng dụng',
    icon: DollarSign,
    color: 'bg-pink-600',
    path: '/nhan-su/luong-thuong'
  },
  {
    title: 'Năng lực nhân sự',
    description: 'Mở ứng dụng',
    icon: Award,
    color: 'bg-pink-600',
    path: '/nhan-su/nang-luc'
  },
  {
    title: 'KPI',
    description: 'Mở ứng dụng',
    icon: Target,
    color: 'bg-pink-600',
    path: '/nhan-su/kpi'
  },
  {
    title: 'Giao việc',
    description: 'Mở ứng dụng',
    icon: ListTodo,
    color: 'bg-pink-600',
    path: '/nhan-su/giao-viec'
  },
  {
    title: 'Chấm công & lương',
    description: 'Mở ứng dụng',
    icon: CalendarCheck,
    color: 'bg-pink-600',
    path: '/nhan-su/cham-cong'
  }
];

export function HumanResources() {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-slate-700 uppercase">
        Quản lý Nhân sự
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {hrModules.map((module, index) => (
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
