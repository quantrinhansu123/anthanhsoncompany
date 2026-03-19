import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CustomerDetailContextType {
    isOpen: boolean;
    customerData: any;
    openCustomerDetail: (customer: any) => void;
    closeCustomerDetail: () => void;
}

const CustomerDetailContext = createContext<CustomerDetailContextType | undefined>(undefined);

export function CustomerDetailProvider({ children }: { children: ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [customerData, setCustomerData] = useState<any>(null);

    const openCustomerDetail = (customer: any) => {
        setCustomerData(customer);
        setIsOpen(true);
    };

    const closeCustomerDetail = () => {
        setIsOpen(false);
        setCustomerData(null);
    };

    return (
        <CustomerDetailContext.Provider value={{ isOpen, customerData, openCustomerDetail, closeCustomerDetail }}>
            {children}
        </CustomerDetailContext.Provider>
    );
}

export function useCustomerDetail() {
    const context = useContext(CustomerDetailContext);
    if (context === undefined) {
        throw new Error('useCustomerDetail must be used within a CustomerDetailProvider');
    }
    return context;
}
