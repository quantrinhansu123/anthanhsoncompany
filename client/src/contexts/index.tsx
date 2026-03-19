import React, { ReactNode } from 'react';
import { SettingsProvider } from './SettingsContext';
import { DuAnModalProvider } from './DuAnModalContext';
import { KhachHangModalProvider } from './KhachHangModalContext';
import { NhanSuModalProvider } from './NhanSuModalContext';
import { HopDongModalProvider } from './HopDongModalContext';
import { ThuChiModalProvider } from './ThuChiModalContext';

interface AppProviderProps {
    children: ReactNode;
}

/**
 * AppProvider là nơi tập trung tất cả các Context của ứng dụng.
 * Việc này giúp main.tsx gọn gàng và dễ bảo trì hơn khi dự án phát triển mạnh.
 */
export function AppProvider({ children }: AppProviderProps) {
    return (
        <SettingsProvider>
            <DuAnModalProvider>
                <KhachHangModalProvider>
                    <NhanSuModalProvider>
                        <HopDongModalProvider>
                            <ThuChiModalProvider>
                                {children}
                            </ThuChiModalProvider>
                        </HopDongModalProvider>
                    </NhanSuModalProvider>
                </KhachHangModalProvider>
            </DuAnModalProvider>
        </SettingsProvider>
    );
}
