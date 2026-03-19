import React, { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useSettings } from '../contexts/SettingsContext';
import { useDuAnModal } from '../contexts/DuAnModalContext';
import { useKhachHangModal } from '../contexts/KhachHangModalContext';
import { useNhanSuModal } from '../contexts/NhanSuModalContext';
import { useThuChiModal } from '../contexts/ThuChiModalContext';
import { ThemDuAnModal } from '../pages/customer/ThemDuAnModal';
import { ChiTietKhachHangModal } from '../pages/customer/ChiTietKhachHangModal';
import { ChiTietDuAnModal } from '../pages/customer/ChiTietDuAnModal';
import { XacNhanXoaDuAnModal } from '../pages/customer/XacNhanXoaDuAnModal';
import { XacNhanXoaKhachHangModal } from '../pages/customer/XacNhanXoaKhachHangModal';
import { ChiTietThuChiModal } from '../pages/finance/ChiTietThuChiModal';
import { XacNhanXoaThuChiModal } from '../pages/finance/XacNhanXoaThuChiModal';
import { ThemThuChiModal } from '../pages/finance/ThemThuChiModal';
import { ThemKhachHangModal } from '../pages/customer/ThemKhachHangModal';
import { ChiTietNhanVienModal } from '../pages/human-resources/ChiTietNhanVienModal';
import { useHopDongModal } from '../contexts/HopDongModalContext';
import { ThemHopDongModal } from '../pages/customer/ThemHopDongModal';
import { ChiTietHopDongModal } from '../pages/customer/ChiTietHopDongModal';
import { ThemTaiLieuHopDongModal } from '../pages/customer/ThemTaiLieuHopDongModal';
import { ThemThuChiHopDongModal } from '../pages/customer/ThemThuChiHopDongModal';
import { ThemCongViecHopDongModal } from '../pages/customer/ThemCongViecHopDongModal';
import { NghiemThuCongViecModal } from '../pages/customer/NghiemThuCongViecModal';
import { XacNhanXoaHopDongModal } from '../pages/customer/XacNhanXoaHopDongModal';

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const { logoUrl } = useSettings();
  const location = useLocation();
  const { 
    isAddEditOpen: isDuAnOpen, 
    initialData: duAnData, 
    closeDuAnModal, 
    onSaveCallback,
    isDetailOpen: isDuAnDetailOpen,
    projectData: duAnDetailData,
    closeChiTietDuAn,
    isDeleteOpen: isDuAnDeleteOpen,
    projectToDelete: duAnToDelete,
    closeDelete: closeDuAnDelete
  } = useDuAnModal();
  const { 
    isDetailOpen: isKhachHangDetailOpen, 
    customerData, 
    closeChiTietKhachHang,
    isAddEditOpen: isKhachHangAddEditOpen,
    editData,
    closeThemKhachHang,
    isDeleteOpen: isKhachHangDeleteOpen,
    customerToDelete,
    closeDelete: closeKhachHangDelete
  } = useKhachHangModal();
  const { isDetailOpen: isNhanSuDetailOpen, employeeData, closeChiTietNhanVien } = useNhanSuModal();
  const { 
    isDetailOpen: isThuChiDetailOpen, 
    thuChiData, 
    closeChiTietThuChi,
    isDeleteOpen: isThuChiDeleteOpen,
    itemToDelete: thuChiToDelete,
    closeDelete: closeThuChiDelete,
    isThemOpen: isThuChiThemOpen,
    themMode: thuChiThemMode,
    themInitialData: thuChiThemInitialData,
    themDefaultType: thuChiThemDefaultType,
    closeThemThuChi: closeThuChiThem
  } = useThuChiModal();
  const { 
    isThemOpen: isHopDongThemOpen, 
    editData: hopDongEditData, 
    closeThemHopDong,
    isDetailOpen: isHopDongDetailOpen,
    contractData: hopDongData,
    closeChiTietHopDong,
    isAddDocumentOpen, closeAddDocument,
    isAddFinanceOpen, closeAddFinance,
    isAddTaskOpen, closeAddTask,
    isNghiemThuOpen, selectedTask, closeNghiemThu,
    isDeleteOpen, contractToDelete, closeDelete,
    openThemHopDong
  } = useHopDongModal();
  
  // Hide watermark on chatbot page and iframe pages
  const showWatermark = !location.pathname.includes('tro-ly-ai') && !location.pathname.includes('danh-sach-van-don');

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

      {/* --- DETAIL MODALS (z-[60]) --- */}
      <ChiTietKhachHangModal 
        isOpen={isKhachHangDetailOpen}
        selectedCustomer={customerData}
        onClose={closeChiTietKhachHang}
      />

      <ChiTietDuAnModal 
        isOpen={isDuAnDetailOpen}
        onClose={closeChiTietDuAn}
        project={duAnDetailData}
        onAddContract={() => {
            closeChiTietDuAn();
            openThemHopDong();
        }}
      />

      <ChiTietHopDongModal
        isOpen={isHopDongDetailOpen}
        onClose={closeChiTietHopDong}
        contract={hopDongData}
      />

      <ChiTietThuChiModal 
        isOpen={isThuChiDetailOpen}
        onClose={closeChiTietThuChi}
        item={thuChiData}
      />

      <ChiTietNhanVienModal
        isOpen={isNhanSuDetailOpen}
        onClose={closeChiTietNhanVien}
        employeeId={employeeData?.id}
      />

      {/* --- ACTION & CONFIRMATION MODALS (z-[70]) --- */}
      <ThemKhachHangModal
        isOpen={isKhachHangAddEditOpen}
        onClose={closeThemKhachHang}
        initialData={editData}
        onSave={(data) => {
            console.log('Customer saved:', data);
        }}
      />

      <ThemDuAnModal
        isOpen={isDuAnOpen}
        onClose={closeDuAnModal}
        initialData={duAnData}
        onSave={onSaveCallback || (() => {})}
      />

      <ThemHopDongModal
        isOpen={isHopDongThemOpen}
        onClose={closeThemHopDong}
        editData={hopDongEditData}
        onSuccess={() => {
            console.log('Contract saved');
        }}
      />

      <ThemThuChiModal 
        isOpen={isThuChiThemOpen}
        onClose={closeThuChiThem}
        mode={thuChiThemMode}
        initialData={thuChiThemInitialData}
        defaultType={thuChiThemDefaultType}
        onSuccess={() => {
            console.log('Financial item saved');
            window.location.reload();
        }}
      />

      <ThemTaiLieuHopDongModal
        isOpen={isAddDocumentOpen}
        onClose={closeAddDocument}
        onSuccess={(data) => console.log('Document added:', data)}
      />

      <ThemThuChiHopDongModal
        isOpen={isAddFinanceOpen}
        onClose={closeAddFinance}
        onSuccess={(data) => console.log('Finance added:', data)}
      />

      <ThemCongViecHopDongModal
        isOpen={isAddTaskOpen}
        onClose={closeAddTask}
        onSuccess={(data) => console.log('Task added:', data)}
      />

      <NghiemThuCongViecModal
        isOpen={isNghiemThuOpen}
        onClose={closeNghiemThu}
        task={selectedTask}
        onSuccess={(data) => console.log('Task accepted:', data)}
      />

      <XacNhanXoaKhachHangModal 
        isOpen={isKhachHangDeleteOpen}
        onClose={closeKhachHangDelete}
        customer={customerToDelete}
        onSuccess={() => {
            console.log('Customer deleted');
            window.location.reload();
        }}
      />

      <XacNhanXoaDuAnModal 
        isOpen={isDuAnDeleteOpen}
        onClose={closeDuAnDelete}
        project={duAnToDelete}
        onSuccess={() => {
            console.log('Project deleted');
            window.location.reload();
        }}
      />

      <XacNhanXoaHopDongModal 
        isOpen={isDeleteOpen}
        onClose={closeDelete}
        contract={contractToDelete}
        onSuccess={() => {
            console.log('Contract deleted');
            window.location.reload();
        }}
      />

      <XacNhanXoaThuChiModal 
        isOpen={isThuChiDeleteOpen}
        onClose={closeThuChiDelete}
        item={thuChiToDelete}
        onSuccess={() => {
            console.log('Financial item deleted');
            window.location.reload();
        }}
      />
    </div>
  );
}
