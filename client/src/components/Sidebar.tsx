import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Calculator,
  UserCircle,
  GitBranch,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut
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
    { icon: LayoutDashboard, label: t('nav.home'), path: '/', colorClass: 'text-blue-700' },
    { icon: Users, label: t('nav.adminHr'), path: '/hanh-chinh', colorClass: 'text-purple-500' },
    { icon: Calculator, label: t('nav.accounting'), path: '/tai-chinh', colorClass: 'text-green-500' },
    { icon: UserCircle, label: t('nav.customer'), path: '/khach-hang', colorClass: 'text-amber-500' },
    { icon: GitBranch, label: t('nav.process'), path: '/quy-trinh', colorClass: 'text-slate-600' },
  ];

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen w-64 pointer-events-none transition-all duration-300 flex flex-col no-scrollbar",
        isMobile && !isOpen && "w-0 -translate-x-full"
      )}
    >
      <div 
        className={cn(
          "h-full bg-white border-r border-slate-200 transition-all duration-300 flex flex-col pointer-events-auto shadow-xl relative overflow-visible",
          isMobile 
            ? (isOpen ? "w-64 translate-x-0" : "w-0 -translate-x-full") 
            : (isOpen ? "w-64" : "w-20")
        )}
      >
        <div className={cn(
          "h-24 md:h-28 border-b border-slate-100 transition-all duration-300 overflow-hidden shrink-0 flex items-center",
          (isOpen || isMobile) ? "px-4" : "px-0 justify-center"
        )}>
          <div className="flex items-center gap-3 overflow-hidden">
            <img
              src={logoUrl}
              alt="Logo"
              className={cn(
                "object-contain shrink-0 transition-all duration-300", 
                (isOpen || isMobile) ? "w-20 h-20 md:w-24 md:h-24" : "w-10 h-10"
              )}
            />
            <div className={cn("transition-opacity duration-300", (isOpen || isMobile) ? "opacity-100" : "opacity-0 w-0")}>
              <h1 className="font-bold text-slate-800 text-sm whitespace-nowrap">upcare</h1>
              <p className="text-[10px] text-slate-500 whitespace-nowrap">Ứng dụng quản lý</p>
            </div>
          </div>
        </div>

        <div className={cn(
          "flex-1 py-4 px-3 space-y-1 no-scrollbar overflow-x-visible",
          (isOpen || isMobile) ? "overflow-y-auto" : "overflow-y-visible"
        )}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                if (isMobile) {
                  toggleSidebar();
                }
              }}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group relative",
                  isActive
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className={cn(
                    "w-8 h-8 flex items-center justify-center rounded-md shrink-0 transition-colors",
                    isActive
                      ? "bg-blue-600 text-white"
                      : cn(item.colorClass, "group-hover:text-slate-900")
                  )}>
                    <item.icon size={18} />
                  </div>
                  <span className={cn("transition-all duration-300 whitespace-nowrap", (isOpen || isMobile) ? "opacity-100" : "opacity-0 w-0 hidden")}>
                    {item.label}
                  </span>
                  {!isOpen && !isMobile && (
                    <div className="absolute left-[calc(100%+8px)] ml-2 px-3 py-2 bg-slate-900 text-white text-[11px] font-bold rounded-lg shadow-xl hidden group-hover:block pointer-events-none whitespace-nowrap z-[100] animate-in fade-in slide-in-from-left-2 duration-200 border border-slate-700">
                      <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-900 rotate-45 border-l border-b border-slate-700" />
                      {item.label}
                    </div>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className={cn(
          "border-t border-slate-100 py-3 transition-all duration-300 overflow-hidden shrink-0",
          (isOpen || isMobile) ? "px-3" : "px-0 flex flex-col items-center"
        )}>
          <div className={cn(
            "flex items-center gap-3 rounded-lg px-2 py-2",
            !(isOpen || isMobile) && "justify-center"
          )}>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-800 text-xs font-semibold text-white shrink-0">
              AD
            </div>
            {(isOpen || isMobile) && (
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-xs font-semibold text-slate-900">
                  Admin
                </span>
                <span className="truncate text-[11px] text-slate-500">
                  admin@company.com
                </span>
              </div>
            )}
          </div>

          {(isOpen || isMobile) && (
            <button
              type="button"
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-md bg-red-100 py-2 text-xs font-semibold text-red-600"
            >
              <LogOut className="h-4 w-4" />
              <span>Thoát</span>
            </button>
          )}
        </div>

      </div>
    </aside>
  );
}
