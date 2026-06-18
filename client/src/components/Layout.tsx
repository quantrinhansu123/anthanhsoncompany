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
import { customerService } from '../lib/services/customerService';
import { LoadingExportOverlay } from './LoadingExportOverlay';

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
    thuChiCreatePrefill: thuChiThemPrefill,
    closeThemThuChi: closeThuChiThem
  } = useThuChiModal();
  const { 
    isThemOpen: isHopDongThemOpen, 
    editData: hopDongEditData,
    contractCreatePrefill: hopDongCreatePrefill,
    closeThemHopDong,
    isDetailOpen: isHopDongDetailOpen,
    contractData: hopDongData,
    closeChiTietHopDong,
    isAddDocumentOpen, closeAddDocument,
    isAddFinanceOpen, closeAddFinance,
    isAddTaskOpen, closeAddTask,
    isNghiemThuOpen, selectedTask, closeNghiemThu,
    isDeleteOpen, contractToDelete, closeDelete,
    openThemHopDong,
    isExporting
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
    <div className="min-h-screen bg-slate-200 font-sans text-slate-900">
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
          isOpen={sidebarOpen}
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
        onSave={async (data) => {
          const payload = {
            ten_don_vi: data.Ten_Don_Vi,
            loai_hinh: data.Loai_Hinh,
            mst: data.MST,
            dia_chi: data.Dia_Chi,
            nguoi_lien_he: data.Nguoi_Lien_He,
            chuc_vu_lien_he: data.Chuc_Vu_Lien_He,
            sdt_lien_he: data.SDT_Lien_He,
          };

          try {
            if (editData?.id) {
              await customerService.update(String(editData.id), payload);
            } else {
              await customerService.create(payload);
            }

            // Refresh so list reflects newly saved data
            window.location.reload();
          } catch (err: any) {
            console.error('[KhachHang] Save failed:', err);
            const message =
              err?.message ||
              err?.error_description ||
              'Không thể lưu dữ liệu khách hàng. Hãy kiểm tra kết nối Supabase / quyền truy cập.';
            alert(message);
            throw err;
          }
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
        contractCreatePrefill={hopDongCreatePrefill}
        onSuccess={() => {
            console.log('Contract saved');
            // Refresh list to reflect updated contract fields (including HR responsibility).
            window.location.reload();
        }}
      />

      <ThemThuChiModal 
        isOpen={isThuChiThemOpen}
        onClose={closeThuChiThem}
        mode={thuChiThemMode}
        initialData={thuChiThemInitialData}
        defaultType={thuChiThemDefaultType}
        customerScope={thuChiThemPrefill}
        onSuccess={() => {
            console.log('Financial item saved');
            window.location.reload();
        }}
      />

      <ThemTaiLieuHopDongModal
        isOpen={isAddDocumentOpen}
        onClose={closeAddDocument}
      />

      <ThemThuChiHopDongModal
        isOpen={isAddFinanceOpen}
        onClose={closeAddFinance}
        onSuccess={() => {
          window.location.reload();
        }}
      />

      <ThemCongViecHopDongModal
        isOpen={isAddTaskOpen}
        onClose={closeAddTask}
        onSuccess={() => {
          console.log('Task added');
          // Refresh so the task list in ChiTietHopDongModal updates immediately
          window.location.reload();
        }}
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
      {isExporting && <LoadingExportOverlay />}
    </div>
  );
}
