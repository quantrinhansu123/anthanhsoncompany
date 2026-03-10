import React from 'react';
import {
  UserCircle,
  FolderKanban,
  FileSignature,
  ClipboardList,
  Star,
  HelpCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface CustomerItemProps {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  path?: string;
}

function CustomerCard({ title, description, icon: Icon, color, bgColor, path }: CustomerItemProps) {
  // @ts-ignore
  const CardWrapper = path ? Link : 'div';
  const props = path ? { to: path } : {};

  return (
    // @ts-ignore
    <CardWrapper {...props} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group flex items-start gap-4 relative h-full block w-full text-left">
      <div className={`${bgColor} ${color} w-10 h-10 rounded-lg flex items-center justify-center shrink-0`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-slate-800 text-sm truncate pr-6 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>
        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
          {description}
        </p>
      </div>
      <div className="flex flex-col gap-2 absolute right-3 top-3 text-slate-300">
        <button className="hover:text-yellow-400 transition-colors">
          <Star size={14} />
        </button>
        <button className="hover:text-blue-400 transition-colors">
          <HelpCircle size={14} />
        </button>
      </div>
    </CardWrapper>
  );
}

const sections = [
  {
    title: '',
    items: [
      { title: 'DS Khách Hàng', description: 'Danh sách khách hàng, thông tin liên hệ, lịch sử giao dịch.', icon: UserCircle, color: 'text-blue-600', bgColor: 'bg-blue-50', path: '/khach-hang/danh-sach' },
      { title: 'Dự án', description: 'Quản lý dự án, tiến độ, ngân sách, nhân sự.', icon: FolderKanban, color: 'text-emerald-600', bgColor: 'bg-emerald-50', path: '/khach-hang/du-an' },
      { title: 'Hợp đồng', description: 'Quản lý hợp đồng, ký kết, gia hạn, thanh lý.', icon: FileSignature, color: 'text-purple-600', bgColor: 'bg-purple-50', path: '/khach-hang/hop-dong' },
      { title: 'Task', description: 'Quản lý task theo hợp đồng, theo dõi tiến độ công việc.', icon: ClipboardList, color: 'text-orange-600', bgColor: 'bg-orange-50', path: '/khach-hang/task' },
    ]
  }
];

export function Customer() {
  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <div key={section.title || 'main'} className="space-y-4">
          {section.title && (
            <div className="flex items-center gap-2 border-l-4 border-blue-600 pl-3">
              <h2 className="text-sm font-bold text-blue-600 uppercase tracking-wide">
                {section.title}
              </h2>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {section.items.map((item) => (
              <CustomerCard
                key={item.title}
                title={item.title}
                description={item.description}
                icon={item.icon}
                color={item.color}
                bgColor={item.bgColor}
                path={item.path}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
