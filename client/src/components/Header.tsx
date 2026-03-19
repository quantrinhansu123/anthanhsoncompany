import React, { useState, useEffect, useRef } from 'react';
import { Bell, Calendar, Clock, User, Settings, LogOut, ChevronDown, Home, ChevronRight, Menu } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Link, useLocation } from 'react-router-dom';

interface HeaderProps {
  onMenuClick?: () => void;
  isMobile?: boolean;
}

export function Header({ onMenuClick, isMobile = false }: HeaderProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const pathnames = location.pathname.split('/').filter(x => x);
  const breadcrumbNameMap: Record<string, string> = {
    'hanh-chinh': 'Hành chính',
    'cham-cong': 'Chấm công',
    'tong-hop-cham-cong': 'Tổng hợp chấm công',
    'marketing': 'Marketing',
    'nhan-su': 'Nhân sự',
    'kho-van': 'Kho vận',
    'mua-hang': 'Mua hàng',
    'tai-chinh': 'Tài chính',
    'he-thong': 'Hệ thống',
    'tro-ly-ai': 'Trợ lý AI',
    'settings': 'Cài đặt',
    'ho-so-ca-nhan': 'Hồ sơ cá nhân',
    'phieu-hanh-chinh': 'Phiếu hành chính',
    'cham-diem-kpi': 'Chấm điểm KPI',
    'diem-cong-tru': 'Điểm cộng trừ',
    'thiet-lap-cong-luong': 'Thiết lập công lương'
  };

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-4 md:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {/* Mobile menu button */}
        {isMobile && onMenuClick && (
          <button
            onClick={onMenuClick}
            className="p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors shrink-0"
            aria-label="Mở menu"
          >
            <Menu size={20} />
          </button>
        )}

        {/* Breadcrumb - responsive */}
        <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm overflow-x-auto whitespace-nowrap hide-scrollbar min-w-0 flex-1">
          {pathnames.length > 0 && (
            <Link to="/" className="text-slate-400 hover:text-blue-600 transition-colors border border-slate-200 p-1 rounded bg-slate-50 flex items-center justify-center shrink-0">
              <Home size={12} className="sm:w-[14px] sm:h-[14px]" />
            </Link>
          )}
          {pathnames.map((name, index) => {
            const isLast = index === pathnames.length - 1;
            const displayName = breadcrumbNameMap[name] || name;
            return (
              <React.Fragment key={name}>
                <span className="text-slate-300 shrink-0">
                  <ChevronRight size={12} className="sm:w-[14px] sm:h-[14px]" />
                </span>
                {isLast ? (
                  <span className="bg-blue-600 text-white px-2 sm:px-3 py-0.5 rounded-full font-medium text-xs shrink-0">
                    {displayName}
                  </span>
                ) : (
                  <Link to={`/${pathnames.slice(0, index + 1).join('/')}`} className="text-slate-600 hover:text-blue-600 transition-colors bg-slate-50 border border-slate-200 px-1.5 sm:px-2 py-0.5 rounded-md text-xs font-medium shrink-0">
                    {displayName}
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 md:gap-6 shrink-0">
        {/* Time/Date - hidden on very small screens, compact on mobile */}
        <div className="hidden sm:flex items-center gap-2 md:gap-4 text-xs md:text-sm text-slate-600 bg-slate-50 px-2 md:px-4 py-1 md:py-1.5 rounded-full border border-slate-100">
          <div className="flex items-center gap-1 md:gap-2 border-r border-slate-200 pr-2 md:pr-4">
            <Clock size={14} className="md:w-4 md:h-4 text-red-500 shrink-0" />
            <span className="font-medium whitespace-nowrap">{format(currentTime, 'HH:mm:ss')}</span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Calendar size={16} className="text-red-500" />
            <span className="capitalize whitespace-nowrap">{format(currentTime, 'EEEE, dd/MM/yyyy', { locale: vi })}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-1.5 sm:p-2 text-slate-500 hover:bg-slate-50 rounded-full bell-ring icon-btn"
              aria-label="Thông báo"
            >
              <Bell size={18} className="sm:w-5 sm:h-5" />
              <span className="absolute top-0.5 right-0.5 sm:top-1.5 sm:right-1.5 w-2 h-2 bg-blue-600 rounded-full border border-white text-[10px] flex items-center justify-center text-white font-bold sm:h-4 sm:w-4 sm:-mt-1 sm:-mr-1">4</span>
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50 scale-in">
                <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-slate-800">Thông báo</h3>
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">4 mới</span>
                </div>
                {[
                  { title: 'Hợp đồng mới được tạo', time: '5 phút trước', read: false },
                  { title: 'Nhân viên mới đăng ký', time: '15 phút trước', read: false },
                  { title: 'Dự án được cập nhật', time: '1 giờ trước', read: false },
                  { title: 'Hệ thống bảo trì', time: '2 giờ trước', read: true },
                ].map((notif, i) => (
                  <div key={i} className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-slate-50 transition-colors flex items-start gap-3 ${!notif.read ? 'bg-blue-50/30' : ''}`}>
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!notif.read ? 'bg-blue-500' : 'bg-transparent'}`} />
                    <div>
                      <p className={`text-slate-700 ${!notif.read ? 'font-medium' : ''}`}>{notif.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{notif.time}</p>
                    </div>
                  </div>
                ))}
                <div className="px-4 py-2 border-t border-slate-100">
                  <button className="text-xs text-blue-600 hover:text-blue-700 font-medium w-full text-center py-1">Xem tất cả thông báo</button>
                </div>
              </div>
            )}
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-slate-200 hover:bg-slate-50 py-1 px-1 sm:px-2 rounded-lg transition-colors"
              aria-label="Menu người dùng"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-lime-200 rounded-full flex items-center justify-center text-lime-700 font-bold text-xs sm:text-sm border border-lime-300 relative shrink-0">
                ND
                <span className="absolute bottom-0 right-0 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-xs sm:text-sm font-semibold text-slate-800 flex items-center gap-1">
                  Người dùng Demo
                  <ChevronDown size={12} className="sm:w-[14px] sm:h-[14px] text-slate-400" />
                </p>
                <p className="text-[10px] sm:text-xs text-slate-500">Admin</p>
              </div>
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 sm:w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-2 animate-in fade-in slide-in-from-top-2 z-50">
                <Link
                  to="/ho-so-ca-nhan"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <User size={14} className="sm:w-4 sm:h-4" />
                  Hồ sơ cá nhân
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  <Settings size={14} className="sm:w-4 sm:h-4" />
                  Cài đặt hệ thống
                </Link>
                <div className="h-px bg-slate-100 my-1 mx-3 sm:mx-4"></div>
                <button
                  onClick={() => {
                    setIsProfileOpen(false);
                    if (window.confirm('Đăng xuất khỏi hệ thống?')) {
                      window.location.hash = '/';
                      window.location.reload();
                    }
                  }}
                  className="w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={14} className="sm:w-4 sm:h-4" />
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
