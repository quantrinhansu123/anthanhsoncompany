import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DuAnModalContextType {
    isAddEditOpen: boolean;
    initialData: any;
    onSaveCallback: ((data: any) => void) | null;
    openDuAnModal: (initialData?: any, onSave?: (data: any) => void) => void;
    closeDuAnModal: () => void;
    
    // Detail modal
    isDetailOpen: boolean;
    projectData: any | null;
    openChiTietDuAn: (project: any) => void;
    closeChiTietDuAn: () => void;
    
    // Delete modal
    isDeleteOpen: boolean;
    projectToDelete: { id: string | number; projectName: string } | null;
    openDelete: (project: { id: string | number; projectName: string }) => void;
    closeDelete: () => void;
}

const DuAnModalContext = createContext<DuAnModalContextType | undefined>(undefined);

export function DuAnModalProvider({ children }: { children: ReactNode }) {
    const [isAddEditOpen, setIsAddEditOpen] = useState(false);
    const [initialData, setInitialData] = useState<any>(null);
    const [onSaveCallback, setOnSaveCallback] = useState<((data: any) => void) | null>(null);

    // Detail modal state
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [projectData, setProjectData] = useState<any | null>(null);

    // Delete modal state
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<{ id: string | number; projectName: string } | null>(null);

    const openDuAnModal = (data: any = null, onSave: ((data: any) => void) | null = null) => {
        setInitialData(data);
        setOnSaveCallback(() => onSave);
        setIsAddEditOpen(true);
    };

    const closeDuAnModal = () => {
        setIsAddEditOpen(false);
        setInitialData(null);
        setOnSaveCallback(null);
    };

    const openChiTietDuAn = (project: any) => {
        setProjectData(project);
        setIsDetailOpen(true);
    };

    const closeChiTietDuAn = () => {
        setIsDetailOpen(false);
        setProjectData(null);
    };

    const openDelete = (project: { id: string | number; projectName: string }) => {
        setProjectToDelete(project);
        setIsDeleteOpen(true);
    };

    const closeDelete = () => {
        setIsDeleteOpen(false);
        setProjectToDelete(null);
    };

    return (
        <DuAnModalContext.Provider 
            value={{ 
                isAddEditOpen, 
                initialData, 
                onSaveCallback, 
                openDuAnModal, 
                closeDuAnModal,
                isDetailOpen,
                projectData,
                openChiTietDuAn,
                closeChiTietDuAn,
                isDeleteOpen,
                projectToDelete,
                openDelete,
                closeDelete
            }}
        >
            {children}
        </DuAnModalContext.Provider>
    );
}

export function useDuAnModal() {
    const context = useContext(DuAnModalContext);
    if (context === undefined) {
        throw new Error('useDuAnModal must be used within a DuAnModalProvider');
    }
    return context;
}
