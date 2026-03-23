import React from 'react';
import { FileText } from 'lucide-react';

export function LoadingExportOverlay() {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 flex flex-col items-center gap-4 max-w-xs w-full mx-4">
                <div className="relative">
                    <div className="w-12 h-12 rounded-full border-4 border-slate-100 border-t-blue-600 animate-spin" />
                    <FileText className="absolute inset-0 m-auto text-blue-600" size={20} />
                </div>
                <div className="text-center">
                    <h3 className="text-sm font-bold text-slate-800">Đang khởi tạo tài liệu</h3>
                    <p className="text-[11px] text-slate-500 mt-1">Hệ thống đang đồng bộ dữ liệu với Google Docs. Vui lòng chờ trong giây lát...</p>
                </div>
            </div>
        </div>
    );
}
