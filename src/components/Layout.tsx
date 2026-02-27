import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useSettings } from '../contexts/SettingsContext';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const { logoUrl } = useSettings();
  const location = useLocation();
  
  // Hide watermark on chatbot page
  const showWatermark = !location.pathname.includes('tro-ly-ai');

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Sidebar 
        isOpen={sidebarOpen} 
        toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        isMobile={isMobile}
      />
      
      {/* Backdrop for mobile */}
      {isMobile && sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <div className={cn(
        "transition-all duration-300 flex flex-col min-h-screen",
        // Mobile: no margin, Desktop: margin based on sidebar state
        isMobile ? "ml-0" : (sidebarOpen ? "ml-64" : "ml-20")
      )}>
        <Header 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          isMobile={isMobile}
        />
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-x-hidden relative">
          {/* Watermark Logo */}
          {showWatermark && (
            <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center opacity-[0.25] md:opacity-[0.3]">
              <img
                src={logoUrl}
                alt="Watermark"
                className="w-[600px] h-[600px] md:w-[900px] md:h-[900px] lg:w-[1200px] lg:h-[1200px] object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
          <div className="relative z-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
