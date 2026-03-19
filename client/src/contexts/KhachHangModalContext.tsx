import React, { createContext, useContext, useState, ReactNode } from 'react';

interface KhachHangModalContextType {
    // Chi tiết khách hàng
    isDetailOpen: boolean;
    customerData: any;
    openChiTietKhachHang: (customer: any) => void;
    closeChiTietKhachHang: () => void;

    // Thêm/Sửa khách hàng
    isAddEditOpen: boolean;
    editData: any;
    openThemKhachHang: (initialData?: any) => void;
    closeThemKhachHang: () => void;
    
    // Xóa khách hàng
    isDeleteOpen: boolean;
    customerToDelete: { id: string | number; tenDonVi: string } | null;
    openDelete: (customer: { id: string | number; tenDonVi: string }) => void;
    closeDelete: () => void;
}

const KhachHangModalContext = createContext<KhachHangModalContextType | undefined>(undefined);

export function KhachHangModalProvider({ children }: { children: ReactNode }) {
    // State Chi tiết
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [customerData, setCustomerData] = useState<any>(null);

    // State Thêm/Sửa
    const [isAddEditOpen, setIsAddEditOpen] = useState(false);
    const [editData, setEditData] = useState<any>(null);
    
    // State Xóa
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState<{ id: string | number; tenDonVi: string } | null>(null);

    const openChiTietKhachHang = (customer: any) => {
        setCustomerData(customer);
        setIsDetailOpen(true);
    };

    const closeChiTietKhachHang = () => {
        setIsDetailOpen(false);
        setCustomerData(null);
    };

    const openThemKhachHang = (initialData?: any) => {
        setEditData(initialData || null);
        setIsAddEditOpen(true);
    };

    const closeThemKhachHang = () => {
        setIsAddEditOpen(false);
        setEditData(null);
    };
    
    const openDelete = (customer: { id: string | number; tenDonVi: string }) => {
        setCustomerToDelete(customer);
        setIsDeleteOpen(true);
    };
    
    const closeDelete = () => {
        setIsDeleteOpen(false);
        setCustomerToDelete(null);
    };

    return (
        <KhachHangModalContext.Provider 
            value={{ 
                isDetailOpen, 
                customerData, 
                openChiTietKhachHang, 
                closeChiTietKhachHang,
                isAddEditOpen,
                editData,
                openThemKhachHang,
                closeThemKhachHang,
                isDeleteOpen,
                customerToDelete,
                openDelete,
                closeDelete
            }}
        >
            {children}
        </KhachHangModalContext.Provider>
    );
}

export function useKhachHangModal() {
    const context = useContext(KhachHangModalContext);
    if (context === undefined) {
        throw new Error('useKhachHangModal must be used within a KhachHangModalProvider');
    }
    return context;
}
