import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calculator,
  UserCircle,
  GitBranch,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useSettings } from '../contexts/SettingsContext';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  isMobile?: boolean;
}

export function Sidebar({ isOpen, toggleSidebar, isMobile = false }: SidebarProps) {
  const { t, logoUrl } = useSettings();

  const navItems = [
    { icon: LayoutDashboard, label: t('nav.home'), path: '/' },
    { icon: Users, label: t('nav.adminHr'), path: '/hanh-chinh' },
    { icon: Calculator, label: t('nav.accounting'), path: '/tai-chinh' },
    { icon: UserCircle, label: t('nav.customer'), path: '/khach-hang' },
    { icon: GitBranch, label: t('nav.process'), path: '/quy-trinh' },
  ];

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-white border-r border-slate-200 transition-all duration-300 flex flex-col",
        // Mobile: overlay behavior with full width, Desktop: always visible
        isMobile 
          ? (isOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full") 
          : (isOpen ? "w-64" : "w-20")
      )}
    >
      <div className="h-24 md:h-28 flex items-center justify-between px-4 border-b border-slate-100">
        <div className="flex items-center gap-3 overflow-hidden">
          <img
            src={logoUrl}
            alt="Logo"
            className="w-20 h-20 md:w-24 md:h-24 object-contain shrink-0"
          />
          <div className={cn("transition-opacity duration-300", (isOpen || isMobile) ? "opacity-100" : "opacity-0 w-0")}>
            <h1 className="font-bold text-slate-800 text-sm whitespace-nowrap">upcare</h1>
            <p className="text-[10px] text-slate-500 whitespace-nowrap">Ứng dụng quản lý</p>
          </div>
        </div>
        {(isOpen || isMobile) && (
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
            aria-label="Đóng menu"
          >
            <PanelLeftClose size={18} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={() => {
              // Close sidebar on mobile when clicking a nav item
              if (isMobile) {
                toggleSidebar();
              }
            }}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group relative",
              isActive
                ? "bg-red-50 text-red-600 font-medium"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-md shrink-0 transition-colors",
                  isActive ? "bg-red-600 text-white" : "text-slate-500 group-hover:text-slate-700"
                )}>
                  <item.icon size={18} />
                </div>
                <span className={cn("transition-all duration-300 whitespace-nowrap", (isOpen || isMobile) ? "opacity-100" : "opacity-0 w-0 hidden")}>
                  {item.label}
                </span>
                {!isOpen && !isMobile && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                    {item.label}
                  </div>
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>

      {!isOpen && !isMobile && (
        <div className="p-4 border-t border-slate-100 flex justify-center">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
            aria-label="Mở menu"
          >
            <PanelLeftOpen size={20} />
          </button>
        </div>
      )}
    </aside>
  );
}
