import React, { useState, useEffect, useRef } from 'react';
import { Bell, Calendar, Clock, User, Settings, LogOut, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export function Header() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        {/* Left side content if needed, currently empty as sidebar handles logo */}
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-4 text-sm text-slate-600 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">
          <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
            <Clock size={16} className="text-red-500" />
            <span className="font-medium">{format(currentTime, 'HH:mm:ss')}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-red-500" />
            <span className="capitalize">{format(currentTime, 'EEEE, dd/MM/yyyy', { locale: vi })}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="relative p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full border border-white text-[10px] flex items-center justify-center text-white font-bold h-4 w-4 -mt-1 -mr-1">4</span>
          </button>
          
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-3 pl-4 border-l border-slate-200 hover:bg-slate-50 py-1 px-2 rounded-lg transition-colors"
            >
              <div className="w-9 h-9 bg-lime-200 rounded-full flex items-center justify-center text-lime-700 font-bold text-sm border border-lime-300 relative">
                ND
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-1">
                  Người dùng Demo
                  <ChevronDown size={14} className="text-slate-400" />
                </p>
                <p className="text-xs text-slate-500">Admin</p>
              </div>
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-2 animate-in fade-in slide-in-from-top-2 z-50">
                <Link to="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                  <User size={16} />
                  Hồ sơ cá nhân
                </Link>
                <Link to="/settings" className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                  <Settings size={16} />
                  Cài đặt hệ thống
                </Link>
                <div className="h-px bg-slate-100 my-1 mx-4"></div>
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors">
                  <LogOut size={16} />
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
