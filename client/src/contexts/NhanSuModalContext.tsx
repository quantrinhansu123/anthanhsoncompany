import React, { createContext, useContext, useState, ReactNode } from 'react';

interface NhanSuModalContextType {
    // Chi tiết nhân viên
    isDetailOpen: boolean;
    employeeData: any;
    openChiTietNhanVien: (employee: any) => void;
    closeChiTietNhanVien: () => void;
}

const NhanSuModalContext = createContext<NhanSuModalContextType | undefined>(undefined);

export function NhanSuModalProvider({ children }: { children: ReactNode }) {
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [employeeData, setEmployeeData] = useState<any>(null);

    const openChiTietNhanVien = (employee: any) => {
        setEmployeeData(employee);
        setIsDetailOpen(true);
    };

    const closeChiTietNhanVien = () => {
        setIsDetailOpen(false);
        setEmployeeData(null);
    };

    return (
        <NhanSuModalContext.Provider 
            value={{ 
                isDetailOpen, 
                employeeData, 
                openChiTietNhanVien, 
                closeChiTietNhanVien 
            }}
        >
            {children}
        </NhanSuModalContext.Provider>
    );
}

export function useNhanSuModal() {
    const context = useContext(NhanSuModalContext);
    if (context === undefined) {
        throw new Error('useNhanSuModal must be used within a NhanSuModalProvider');
    }
    return context;
}
