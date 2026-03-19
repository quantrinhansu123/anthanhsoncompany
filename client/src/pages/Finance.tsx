import React from 'react';
import {
  ArrowLeftRight,
  Users,
  ArrowLeft,
  Search,
  Star,
  HelpCircle
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

interface FinanceItemProps {
  title: string;
  description: string;
  icon: any;
  color: string;
  bgColor: string;
  key?: string | React.Key;
}

interface FinanceItemProps {
  title: string;
  description: string;
  icon: any;
  color: string;
  bgColor: string;
  path?: string;
  key?: string | React.Key;
}

function FinanceCard({ title, description, icon: Icon, color, bgColor, path }: FinanceItemProps) {
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
      { title: 'Thu chi', description: 'Quản lý thu chi, phiếu thu, phiếu chi, quỹ tiền mặt.', icon: ArrowLeftRight, color: 'text-blue-600', bgColor: 'bg-blue-50', path: '/tai-chinh/thu-chi' },
      { title: 'Thu chi nhân sự', description: 'Quản lý thu chi liên quan đến nhân sự, lương, phụ cấp.', icon: Users, color: 'text-emerald-600', bgColor: 'bg-emerald-50', path: '/tai-chinh/thu-chi-nhan-su' },
    ]
  }
];

export function Finance() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="bg-white p-2 rounded-lg border border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-md border border-slate-200 transition-colors"
          >
            <ArrowLeft size={16} />
            Quay lại
          </button>

          <div className="h-6 w-px bg-slate-200 mx-1"></div>

          <button className="px-3 py-1.5 text-sm font-bold text-blue-600 bg-blue-50 rounded-md transition-colors">
            Tất cả
          </button>
          <button className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-md transition-colors">
            Đánh dấu
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm module theo tên hoặc mô tả.."
            className="w-full pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Content Sections */}
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
                <FinanceCard key={item.title} {...item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
