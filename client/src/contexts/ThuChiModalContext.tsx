import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ThuChiModalContextType {
    // Chi tiết chứng từ
    isDetailOpen: boolean;
    thuChiData: any;
    openChiTietThuChi: (item: any) => void;
    closeChiTietThuChi: () => void;

    // Xóa chứng từ
    isDeleteOpen: boolean;
    itemToDelete: any;
    openDelete: (item: any) => void;
    closeDelete: () => void;

    // Thêm/Sửa chứng từ
    isThemOpen: boolean;
    themMode: 'add' | 'edit';
    themInitialData: any;
    themDefaultType: 'Phiếu thu' | 'Phiếu chi' | undefined;
    openThemThuChi: (mode: 'add' | 'edit', data?: any, defaultType?: 'Phiếu thu' | 'Phiếu chi') => void;
    closeThemThuChi: () => void;
}

const ThuChiModalContext = createContext<ThuChiModalContextType | undefined>(undefined);

export function ThuChiModalProvider({ children }: { children: ReactNode }) {
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [thuChiData, setThuChiData] = useState<any>(null);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<any>(null);

    const [isThemOpen, setIsThemOpen] = useState(false);
    const [themMode, setThemMode] = useState<'add' | 'edit'>('add');
    const [themInitialData, setThemInitialData] = useState<any>(null);
    const [themDefaultType, setThemDefaultType] = useState<'Phiếu thu' | 'Phiếu chi' | undefined>(undefined);

    const openChiTietThuChi = (item: any) => {
        setThuChiData(item);
        setIsDetailOpen(true);
    };

    const closeChiTietThuChi = () => {
        setIsDetailOpen(false);
        setThuChiData(null);
    };

    const openDelete = (item: any) => {
        setItemToDelete(item);
        setIsDeleteOpen(true);
    };

    const closeDelete = () => {
        setIsDeleteOpen(false);
        setItemToDelete(null);
    };

    const openThemThuChi = (mode: 'add' | 'edit', data?: any, defaultType?: 'Phiếu thu' | 'Phiếu chi') => {
        setThemMode(mode);
        setThemInitialData(data || null);
        setThemDefaultType(defaultType);
        setIsThemOpen(true);
    };

    const closeThemThuChi = () => {
        setIsThemOpen(false);
        setThemInitialData(null);
        setThemDefaultType(undefined);
    };

    return (
        <ThuChiModalContext.Provider 
            value={{ 
                isDetailOpen, 
                thuChiData, 
                openChiTietThuChi, 
                closeChiTietThuChi,
                isDeleteOpen,
                itemToDelete,
                openDelete,
                closeDelete,
                isThemOpen,
                themMode,
                themInitialData,
                themDefaultType,
                openThemThuChi,
                closeThemThuChi
            }}
        >
            {children}
        </ThuChiModalContext.Provider>
    );
}

export function useThuChiModal() {
    const context = useContext(ThuChiModalContext);
    if (context === undefined) {
        throw new Error('useThuChiModal must be used within a ThuChiModalProvider');
    }
    return context;
}
