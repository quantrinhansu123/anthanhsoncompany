import React, { createContext, useContext, useState, ReactNode } from 'react';

/** Khi tạo HĐ mới từ Chi tiết khách hàng — gắn customer_id + tên chủ đầu tư. */
export interface ContractCreatePrefill {
  customer_id: string;
  ten_don_vi?: string;
  /** Dự án thuộc khách (giống tab Dự án trong chi tiết). Rỗng = khách chưa có dự án. */
  projects_for_customer?: Array<{ id: string; ten_du_an: string }>;
}

interface HopDong {
    id: number;
    uuid?: string;
    duAnId?: string | null;
    fileStatus: string;
    files?: any[] | null;
    ngayKyHD: string;
    soHopDong: string;
    tenGoiThau: string;
    loaiDichVu: string;
    giaTriHD: number;
    giaTriQT: number;
    nguongChiNhanSu?: number;
    nguongChiNhanSuLoai?: 'tien' | 'phan_tram';
    daThu: number;
    conPhaiThu: number;
    ngayUpdate: string;
    nhanSuId?: string | null;
    nhanSuIds?: string[];
    nhanSuTen?: string | null;
}

interface ContractToDelete {
    id: number;
    uuid?: string;
    soHopDong?: string;
}

interface Task {
    id: string;
    ten_task: string;
    // ... other fields if needed, but for now we mostly need the task for Nghiệm thu
}

interface HopDongModalContextType {
    // Add/Edit Contract
    isThemOpen: boolean;
    editData: HopDong | null;
    contractCreatePrefill: ContractCreatePrefill | null;
    openThemHopDong: (data?: HopDong | null, prefill?: ContractCreatePrefill | null) => void;
    closeThemHopDong: () => void;

    // Contract Detail
    isDetailOpen: boolean;
    contractData: HopDong | null;
    openChiTietHopDong: (data: HopDong) => void;
    closeChiTietHopDong: () => void;

    // Sub-modals inside Detail
    isAddDocumentOpen: boolean;
    openAddDocument: () => void;
    closeAddDocument: () => void;

    isAddFinanceOpen: boolean;
    openAddFinance: () => void;
    closeAddFinance: () => void;

    isAddTaskOpen: boolean;
    openAddTask: () => void;
    closeAddTask: () => void;

    isNghiemThuOpen: boolean;
    selectedTask: any | null;
    openNghiemThu: (task: any) => void;
    closeNghiemThu: () => void;

    // Delete Confirmation
    isDeleteOpen: boolean;
    contractToDelete: ContractToDelete | null;
    openDelete: (data: ContractToDelete) => void;
    closeDelete: () => void;

    // Export Loading
    isExporting: boolean;
    setIsExporting: (isExporting: boolean) => void;
}

const HopDongModalContext = createContext<HopDongModalContextType | undefined>(undefined);

export function HopDongModalProvider({ children }: { children: ReactNode }) {
    const [isThemOpen, setIsThemOpen] = useState(false);
    const [editData, setEditData] = useState<HopDong | null>(null);
    const [contractCreatePrefill, setContractCreatePrefill] = useState<ContractCreatePrefill | null>(null);

    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [contractData, setContractData] = useState<HopDong | null>(null);

    const [isAddDocumentOpen, setIsAddDocumentOpen] = useState(false);
    const [isAddFinanceOpen, setIsAddFinanceOpen] = useState(false);
    const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);

    const [isNghiemThuOpen, setIsNghiemThuOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any | null>(null);

    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [contractToDelete, setContractToDelete] = useState<ContractToDelete | null>(null);

    const [isExporting, setIsExporting] = useState(false);

    const openThemHopDong = (data?: HopDong | null, prefill?: ContractCreatePrefill | null) => {
        setEditData(data != null ? data : null);
        setContractCreatePrefill(prefill ?? null);
        setIsThemOpen(true);
    };

    const closeThemHopDong = () => {
        setIsThemOpen(false);
        setEditData(null);
        setContractCreatePrefill(null);
    };

    const openChiTietHopDong = (data: HopDong) => {
        setContractData(data);
        setIsDetailOpen(true);
    };

    const closeChiTietHopDong = () => {
        setIsDetailOpen(false);
        setContractData(null);
    };

    const openAddDocument = () => setIsAddDocumentOpen(true);
    const closeAddDocument = () => setIsAddDocumentOpen(false);

    const openAddFinance = () => setIsAddFinanceOpen(true);
    const closeAddFinance = () => setIsAddFinanceOpen(false);

    const openAddTask = () => setIsAddTaskOpen(true);
    const closeAddTask = () => setIsAddTaskOpen(false);

    const openNghiemThu = (task: any) => {
        setSelectedTask(task);
        setIsNghiemThuOpen(true);
    };

    const closeNghiemThu = () => {
        setSelectedTask(null);
        setIsNghiemThuOpen(false);
    };

    const openDelete = (data: ContractToDelete) => {
        setContractToDelete(data);
        setIsDeleteOpen(true);
    };

    const closeDelete = () => {
        setIsDeleteOpen(false);
        setContractToDelete(null);
    };

    return (
        <HopDongModalContext.Provider
            value={{
                isThemOpen,
                editData,
                contractCreatePrefill,
                openThemHopDong,
                closeThemHopDong,
                isDetailOpen,
                contractData,
                openChiTietHopDong,
                closeChiTietHopDong,
                isAddDocumentOpen,
                openAddDocument,
                closeAddDocument,
                isAddFinanceOpen,
                openAddFinance,
                closeAddFinance,
                isAddTaskOpen,
                openAddTask,
                closeAddTask,
                isNghiemThuOpen,
                selectedTask,
                openNghiemThu,
                closeNghiemThu,
                isDeleteOpen,
                contractToDelete,
                openDelete,
                closeDelete,
                isExporting,
                setIsExporting,
            }}
        >
            {children}
        </HopDongModalContext.Provider>
    );
}

export function useHopDongModal() {
    const context = useContext(HopDongModalContext);
    if (!context) {
        throw new Error('useHopDongModal must be used within a HopDongModalProvider');
    }
    return context;
}
