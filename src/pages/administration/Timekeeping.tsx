import React, { useState } from 'react';
import {
    Clock,
    Wifi,
    LogIn,
    CalendarDays,
    FileText,
    ArrowLeft,
    Search,
    X,
    Filter,
    Download,
    User,
    Calendar,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight
} from 'lucide-react';

const mockHistoryData = Array.from({ length: 14 }).map((_, i) => ({
    id: i,
    date: `2026-02-${String(i + 2).padStart(2, '0')}`,
    checkIn: i % 3 === 0 ? '08:27' : `08:${28 + (i % 5)}`,
    checkOut: '17:30',
    status: 'Đi muộn'
}));

export function Timekeeping() {
    const [activeTab, setActiveTab] = useState('history');

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Tabs */}
                <div className="flex items-center gap-6 px-4 md:px-6 border-b border-slate-200 overflow-x-auto bg-slate-50/50">
                    <button
                        className={`py-3 md:py-4 text-xs md:text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'today'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        onClick={() => setActiveTab('today')}
                    >
                        <CalendarDays size={16} />
                        Chấm công hôm nay
                    </button>
                    <button
                        className={`py-3 md:py-4 text-xs md:text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'history'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        onClick={() => setActiveTab('history')}
                    >
                        <Clock size={16} />
                        Lịch sử của tôi
                    </button>
                    <button
                        className={`py-3 md:py-4 text-xs md:text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'report'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        onClick={() => setActiveTab('report')}
                    >
                        <FileText size={16} />
                        Báo cáo cá nhân
                    </button>
                </div>

                {/* Content */}
                {activeTab === 'today' && (
                    <div className="p-4 md:p-6 bg-white animate-in fade-in">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                                <Clock size={20} className="md:w-6 md:h-6" />
                            </div>
                            <div className="mt-0.5">
                                <h3 className="text-base md:text-lg font-bold text-slate-800">Chấm công hôm nay</h3>
                                <p className="text-xs md:text-sm text-slate-500 mt-1">
                                    Thực hiện check-in / check-out theo ca làm việc.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
                            <div className="border border-slate-200 rounded-xl p-4 md:p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
                                <p className="text-xs text-slate-500 font-medium mb-1.5 md:mb-2">IP hiện tại</p>
                                <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm md:text-base">
                                    <Wifi size={16} className="text-blue-500" />
                                    192.168.10.10
                                </div>
                            </div>
                            <div className="border border-slate-200 rounded-xl p-4 md:p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
                                <p className="text-xs text-slate-500 font-medium mb-1.5 md:mb-2">Giờ check-in</p>
                                <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm md:text-base">
                                    --
                                </div>
                            </div>
                            <div className="border border-slate-200 rounded-xl p-4 md:p-5 bg-white shadow-sm hover:shadow-md transition-shadow">
                                <p className="text-xs text-slate-500 font-medium mb-1.5 md:mb-2">Giờ check-out</p>
                                <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm md:text-base">
                                    --
                                </div>
                            </div>
                        </div>

                        <button className="flex items-center gap-2 bg-blue-400 text-white px-5 md:px-6 py-2 md:py-2.5 rounded-lg text-sm md:text-base font-medium hover:bg-blue-500 transition-colors shadow-sm whitespace-nowrap">
                            <LogIn size={18} />
                            Chờ đến giờ
                        </button>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="bg-white flex flex-col animate-in fade-in">
                        {/* Toolbar */}
                        <div className="px-4 py-3 border-b border-slate-200 flex flex-col md:flex-row items-center gap-3 justify-between bg-white">
                            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                                <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors bg-white">
                                    <ArrowLeft size={16} /> Quay lại
                                </button>
                                <div className="relative flex-1 md:w-64 min-w-[200px]">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Tìm theo ngày hoặc giờ..."
                                        className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-white"
                                    />
                                </div>
                                <button className="flex items-center gap-1.5 px-3 py-1.5 text-red-500 border border-red-100 bg-red-50 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors whitespace-nowrap">
                                    <X size={14} strokeWidth={3} /> Xóa 1 bộ lọc
                                </button>
                            </div>
                            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                                <button className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors bg-white">
                                    <Filter size={18} />
                                </button>
                                <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors bg-white whitespace-nowrap">
                                    <Download size={16} /> Xuất Excel
                                </button>
                            </div>
                        </div>

                        {/* Filters Row */}
                        <div className="px-4 py-3 flex flex-wrap items-center gap-3 bg-slate-50/80 border-b border-slate-200">
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-1 text-slate-600 h-8">
                                <Clock size={14} className="text-slate-400" />
                                <select className="text-sm bg-transparent outline-none cursor-pointer pr-2 w-24">
                                    <option>Trạng thái</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-1 text-slate-600 h-8">
                                <User size={14} className="text-slate-400" />
                                <select className="text-sm bg-transparent outline-none cursor-pointer pr-2 w-24">
                                    <option>Chi nhánh</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-1 font-medium hover:bg-slate-50 cursor-pointer h-8 transition-colors select-none">
                                <CalendarDays size={14} className="text-slate-500" />
                                <span className="text-sm text-slate-700">February 2026</span>
                                <Calendar size={14} className="text-slate-400 ml-1" />
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto min-h-[400px]">
                            <table className="w-full text-sm text-left whitespace-nowrap">
                                <thead className="text-[13px] text-slate-600 font-medium bg-slate-50/80 border-b border-slate-200">
                                    <tr>
                                        <th className="px-5 py-3.5 w-12 font-medium"><input type="checkbox" className="rounded border-slate-300 w-4 h-4 cursor-pointer text-blue-600 focus:ring-blue-500" /></th>
                                        <th className="px-5 py-3.5 font-medium">Ngày</th>
                                        <th className="px-5 py-3.5 font-medium">Check-in</th>
                                        <th className="px-5 py-3.5 font-medium">Check-out</th>
                                        <th className="px-5 py-3.5 font-medium">Trạng thái</th>
                                        <th className="px-5 py-3.5 font-medium text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {mockHistoryData.map((row, i) => (
                                        <tr key={i} className="hover:bg-blue-50/30 transition-colors bg-white group cursor-default">
                                            <td className="px-5 py-3.5"><input type="checkbox" className="rounded border-slate-300 w-4 h-4 cursor-pointer text-blue-600 focus:ring-blue-500" /></td>
                                            <td className="px-5 py-3.5 text-slate-800 font-medium">{row.date}</td>
                                            <td className="px-5 py-3.5 text-slate-600">{row.checkIn}</td>
                                            <td className="px-5 py-3.5 text-slate-600">{row.checkOut}</td>
                                            <td className="px-5 py-3.5 text-red-500">{row.status}</td>
                                            <td className="px-5 py-3.5"></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="px-5 py-3 flex items-center justify-between text-sm text-slate-600 border-t border-slate-200 bg-white">
                            <div className="flex items-center gap-3">
                                <span className="font-medium">{mockHistoryData.length} bản ghi</span>
                                <span className="text-slate-300">1—20</span>
                                <div className="flex items-center gap-1.5 ml-2">
                                    <select className="border border-slate-200 rounded px-2 py-0.5 outline-none hover:border-slate-300 cursor-pointer bg-white">
                                        <option>20</option>
                                        <option>50</option>
                                    </select>
                                    <span className="text-slate-500">/ trang</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button className="p-1 hover:bg-slate-100 rounded text-slate-400 transition-colors outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50" disabled><ChevronsLeft size={16} /></button>
                                <button className="p-1 hover:bg-slate-100 rounded text-slate-400 transition-colors outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50" disabled><ChevronLeft size={16} /></button>

                                <button className="w-7 h-7 bg-blue-600 text-white rounded flex items-center justify-center font-medium shadow-sm outline-none focus:ring-2 focus:ring-blue-200">1</button>
                                <button className="w-7 h-7 hover:bg-slate-100 rounded flex items-center justify-center transition-colors outline-none focus:ring-2 focus:ring-slate-100">2</button>

                                <button className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors outline-none focus:ring-2 focus:ring-slate-100"><ChevronRight size={16} /></button>
                                <button className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors outline-none focus:ring-2 focus:ring-slate-100"><ChevronsRight size={16} /></button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'report' && (
                    <div className="bg-slate-50 p-4 md:p-6 animate-in fade-in">
                        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 mb-6 w-full md:max-w-[280px] flex items-center justify-between shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                            <div className="flex items-center gap-3">
                                <CalendarDays size={18} className="text-slate-400" />
                                <span className="text-sm font-medium text-slate-800">February 2026</span>
                            </div>
                            <Calendar size={18} className="text-slate-400" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                                    <CalendarDays size={22} />
                                </div>
                                <div className="mt-0.5">
                                    <p className="text-xs md:text-sm text-slate-500 font-medium mb-1 line-clamp-1">Tổng ngày công</p>
                                    <p className="text-2xl font-bold text-slate-800">20</p>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                                    <Clock size={22} />
                                </div>
                                <div className="mt-0.5">
                                    <p className="text-xs md:text-sm text-slate-500 font-medium mb-1 line-clamp-1">Tổng giờ làm</p>
                                    <p className="text-2xl font-bold text-slate-800">181.2<span className="text-sm font-medium text-slate-500 ml-0.5">h</span></p>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                                    <Clock size={22} />
                                </div>
                                <div className="mt-0.5">
                                    <p className="text-xs md:text-sm text-slate-500 font-medium mb-1 line-clamp-1">Số lần đi muộn</p>
                                    <p className="text-2xl font-bold text-slate-800">20</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
