import React, { useState } from 'react';
import {
  BookOpen,
  Star,
  HelpCircle,
  CheckCircle,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';

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

interface ProcessItemProps {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  path?: string;
  isStarred?: boolean;
  onToggleStar?: () => void;
  onHelp?: () => void;
}

function ProcessCard({ title, description, icon: Icon, color, bgColor, path, isStarred, onToggleStar, onHelp }: ProcessItemProps) {
  // @ts-ignore
  const CardWrapper = path ? Link : 'div';
  const props = path ? { to: path } : {};

  return (
    // @ts-ignore
    <CardWrapper {...props} className="card-hover bg-white p-4 rounded-xl border border-slate-200 shadow-sm group flex items-start gap-4 relative h-full block w-full text-left">
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
        <button
          className={`icon-btn p-0.5 rounded transition-colors ${isStarred ? 'text-yellow-400' : 'hover:text-yellow-400'}`}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleStar?.(); }}
          title={isStarred ? 'Bỏ đánh dấu' : 'Đánh dấu yêu thích'}
        >
          <Star size={14} fill={isStarred ? 'currentColor' : 'none'} />
        </button>
        <button
          className="icon-btn p-0.5 rounded hover:text-blue-400 transition-colors"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onHelp?.(); }}
          title="Trợ giúp"
        >
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
      { id: 'thu-vien-loi', title: 'Thư viện lỗi', description: 'Quản lý thư viện lỗi, phân loại, xử lý và giải pháp.', icon: BookOpen, color: 'text-blue-600', bgColor: 'bg-blue-50', path: '/quy-trinh/thu-vien-loi' },
    ]
  }
];

export function Process() {
  const [starredItems, setStarredItems] = useState<string[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  const toggleStar = (itemId: string, itemTitle: string) => {
    setStarredItems(prev => {
      const isStarred = prev.includes(itemId);
      if (isStarred) {
        setToast({ message: `Đã bỏ đánh dấu "${itemTitle}"`, type: 'info' });
        return prev.filter(id => id !== itemId);
      } else {
        setToast({ message: `Đã đánh dấu yêu thích "${itemTitle}"`, type: 'success' });
        return [...prev, itemId];
      }
    });
  };

  const showHelp = (itemTitle: string) => {
    setToast({ message: `Hướng dẫn sử dụng "${itemTitle}" đang phát triển`, type: 'info' });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

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
              <ProcessCard
                key={item.title}
                title={item.title}
                description={item.description}
                icon={item.icon}
                color={item.color}
                bgColor={item.bgColor}
                path={item.path}
                isStarred={starredItems.includes(item.id)}
                onToggleStar={() => toggleStar(item.id, item.title)}
                onHelp={() => showHelp(item.title)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
