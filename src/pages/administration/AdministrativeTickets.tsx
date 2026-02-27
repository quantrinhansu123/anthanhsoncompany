import React, { useState } from 'react';
import {
    ArrowLeft,
    Search,
    Plus,
    Filter,
    Calendar as CalendarIcon,
    X,
    Edit,
    Trash2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    User,
    Clock,
    Briefcase,
    AlertCircle
} from 'lucide-react';

// Mock Data
const mockMyTickets = [
    { id: 1, type: 'Xin nghỉ phép', shift: 'Cả ngày', date: '2026-03-04', status: 'Đã duyệt' },
    { id: 2, type: 'Đi muộn / về sớm', shift: 'Sáng', date: '2026-02-21', status: 'Quản lý đã duyệt' },
    { id: 3, type: 'Tăng ca', shift: 'Chiều', date: '2026-02-07', status: 'Từ chối' },
];

const mockManagedTickets = [
    { id: 1, sender: 'Lê Minh Công', department: 'Phòng Hành chính', type: 'Xin nghỉ phép', shift: 'Cả ngày', date: '2026-03-04', status: 'Đã duyệt' },
    { id: 2, sender: 'Ngô Hoàng Nam', department: 'Phòng Kỹ thuật', type: 'Xin nghỉ không lương', shift: 'Cả ngày', date: '2026-03-01', status: 'Chờ duyệt' },
    { id: 3, sender: 'Lê Minh Quân', department: 'Phòng Kinh doanh', type: 'Công tác', shift: 'Cả ngày', date: '2026-02-24', status: 'Chờ duyệt' },
    { id: 4, sender: 'Lê Minh Công', department: 'Phòng Hành chính', type: 'Đi muộn / về sớm', shift: 'Sáng', date: '2026-02-21', status: 'Quản lý đã duyệt' },
    { id: 5, sender: 'Phạm Thu Trang', department: 'Phòng Nhân sự', type: 'Quên chấm công', shift: 'Chiều', date: '2026-02-17', status: 'Đã duyệt' },
    { id: 6, sender: 'Lê Minh Công', department: 'Phòng Hành chính', type: 'Tăng ca', shift: 'Chiều', date: '2026-02-07', status: 'Từ chối' },
];

const mockQuotas = [
    { id: 1, type: 'Đi muộn / về sớm', quota: 3, used: 0, remaining: 3 },
    { id: 2, type: 'Công tác', quota: 6, used: 0, remaining: 6 },
    { id: 3, type: 'Quên chấm công', quota: 2, used: 0, remaining: 2 },
    { id: 4, type: 'Tăng ca', quota: 10, used: 0, remaining: 10 },
    { id: 5, type: 'Xin nghỉ không lương', quota: 2, used: 0, remaining: 2 },
    { id: 6, type: 'Xin nghỉ phép', quota: 12, used: 0, remaining: 12 },
];

export function AdministrativeTickets() {
    const [activeTab, setActiveTab] = useState('my-tickets');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };
    const isSelected = (id: number) => selectedIds.includes(id);
    const getCurrentData = () => {
        switch (activeTab) {
            case 'my-tickets': return mockMyTickets;
            case 'managed': return mockManagedTickets;
            case 'quotas': return mockQuotas;
            default: return [];
        }
    };
    const isAllSelected = getCurrentData().length > 0 && getCurrentData().every(r => selectedIds.includes(r.id));
    const toggleSelectAll = () => {
        setSelectedIds(isAllSelected ? [] : getCurrentData().map(r => r.id));
    };

    const renderStatus = (status: string) => {
        switch (status) {
            case 'Đã duyệt':
                return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">{status}</span>;
            case 'Chờ duyệt':
                return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 border border-blue-200">{status}</span>;
            case 'Quản lý đã duyệt':
                return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700 border border-amber-200">{status}</span>;
            case 'Từ chối':
                return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 border border-red-200">{status}</span>;
            default:
                return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200">{status}</span>;
        }
    };

    const renderShift = (shift: string) => {
        switch (shift) {
            case 'Cả ngày':
                return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">{shift}</span>;
            case 'Sáng':
                return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-50 text-amber-600 border border-amber-100">{shift}</span>;
            case 'Chiều':
                return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-600 border border-blue-100">{shift}</span>;
            default:
                return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-50 text-slate-600 border border-slate-100">{shift}</span>;
        }
    };

    const renderTypeIcon = (type: string) => {
        switch (type) {
            case 'Xin nghỉ phép':
            case 'Xin nghỉ không lương':
                return <User size={14} className="text-blue-500" />;
            case 'Đi muộn / về sớm':
            case 'Quên chấm công':
            case 'Tăng ca':
                return <Clock size={14} className="text-purple-500" />;
            case 'Công tác':
                return <Briefcase size={14} className="text-emerald-500" />;
            default:
                return <AlertCircle size={14} className="text-slate-500" />;
        }
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Tabs */}
                <div className="flex items-center gap-6 px-4 md:px-6 border-b border-slate-200 overflow-x-auto bg-slate-50/50">
                    <button
                        className={`py-3 md:py-4 text-xs md:text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'my-tickets'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        onClick={() => setActiveTab('my-tickets')}
                    >
                        <User size={16} />
                        Của tôi
                    </button>
                    <button
                        className={`py-3 md:py-4 text-xs md:text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'managed'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        onClick={() => setActiveTab('managed')}
                    >
                        <Briefcase size={16} /> {/* Thay bằng icon quản lý */}
                        Tôi quản lý
                    </button>
                    <button
                        className={`py-3 md:py-4 text-xs md:text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'quotas'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        onClick={() => setActiveTab('quotas')}
                    >
                        <Filter size={16} /> {/* Thay bằng icon định mức */}
                        Định mức
                    </button>
                </div>

                <div className="flex flex-col bg-white">
                    <div className="px-4 py-3 border-b border-slate-200 flex flex-col md:flex-row items-center gap-3 justify-between bg-white">
                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors bg-white">
                                <ArrowLeft size={16} /> Quay lại
                            </button>
                            <div className="relative flex-1 md:w-64 min-w-[200px]">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder={
                                        activeTab === 'my-tickets'
                                            ? "Tìm theo loại phiếu, ngày hoặc lý do..."
                                            : activeTab === 'managed'
                                                ? "Tìm theo nhân viên, loại phiếu hoặc ngày..."
                                                : "Tìm theo loại phiếu..."
                                    }
                                    className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-white"
                                />
                            </div>
                            {activeTab === 'quotas' && (
                                <button className="flex items-center gap-1.5 px-3 py-1.5 text-red-500 border border-red-100 bg-red-50 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors whitespace-nowrap">
                                    <X size={14} strokeWidth={3} /> Xóa 1 bộ lọc
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                            {activeTab === 'my-tickets' && (
                                <button className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap shadow-sm">
                                    <Plus size={16} /> Thêm mới
                                </button>
                            )}
                            {activeTab !== 'my-tickets' && (
                                <button className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors bg-white">
                                    <AlertCircle size={18} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filters Row */}
                    <div className="px-4 py-3 flex flex-wrap items-center gap-3 bg-slate-50/80 border-b border-slate-200">
                        {activeTab !== 'quotas' ? (
                            <>
                                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-1 text-slate-600 h-8">
                                    <Filter size={14} className="text-slate-400" />
                                    <select className="text-sm bg-transparent outline-none cursor-pointer pr-2 w-28 text-slate-700">
                                        <option>Trạng thái</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-1 text-slate-600 h-8">
                                    <Briefcase size={14} className="text-slate-400" />
                                    <select className="text-sm bg-transparent outline-none cursor-pointer pr-2 w-32 text-slate-700">
                                        <option>Loại phiếu</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-1 text-slate-600 h-8">
                                    <Clock size={14} className="text-slate-400" />
                                    <select className="text-sm bg-transparent outline-none cursor-pointer pr-2 w-20 text-slate-700">
                                        <option>Ca</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-1 font-medium hover:bg-slate-50 cursor-pointer h-8 transition-colors select-none text-slate-700">
                                    <CalendarIcon size={14} className="text-slate-500" />
                                    <span className="text-sm">------------</span>
                                    <CalendarIcon size={14} className="text-slate-400 ml-1" />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-1 text-slate-600 h-8">
                                    <Briefcase size={14} className="text-slate-400" />
                                    <select className="text-sm bg-transparent outline-none cursor-pointer pr-2 w-32 text-slate-700">
                                        <option>Loại phiếu</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-1 font-medium hover:bg-slate-50 cursor-pointer h-8 transition-colors select-none text-slate-700">
                                    <CalendarIcon size={14} className="text-slate-500" />
                                    <span className="text-sm">February 2026</span>
                                    <ChevronDown size={14} className="text-slate-400 ml-1" />
                                </div>
                            </>
                        )}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="text-[13px] text-slate-600 font-medium bg-slate-50/80 border-b border-slate-200">
                                <tr>
                                    <th className="px-5 py-3.5 w-12 font-medium">
                                        <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} className="rounded border-slate-300 w-4 h-4 cursor-pointer text-blue-600 focus:ring-blue-500 bg-white" />
                                    </th>

                                    {activeTab === 'my-tickets' && (
                                        <>
                                            <th className="px-5 py-3.5 font-medium">Loại phiếu</th>
                                            <th className="px-5 py-3.5 font-medium">Ca</th>
                                            <th className="px-5 py-3.5 font-medium">Ngày</th>
                                            <th className="px-5 py-3.5 font-medium">Trạng thái</th>
                                            <th className="px-5 py-3.5 font-medium text-right w-24">Thao tác</th>
                                        </>
                                    )}

                                    {activeTab === 'managed' && (
                                        <>
                                            <th className="px-5 py-3.5 font-medium">Người gửi</th>
                                            <th className="px-5 py-3.5 font-medium">Phòng ban</th>
                                            <th className="px-5 py-3.5 font-medium">Loại phiếu</th>
                                            <th className="px-5 py-3.5 font-medium">Ca</th>
                                            <th className="px-5 py-3.5 font-medium">Ngày</th>
                                            <th className="px-5 py-3.5 font-medium">Trạng thái</th>
                                            <th className="px-5 py-3.5 font-medium text-right w-20">Thao tác</th>
                                        </>
                                    )}

                                    {activeTab === 'quotas' && (
                                        <>
                                            <th className="px-5 py-3.5 font-medium">Loại phiếu</th>
                                            <th className="px-5 py-3.5 font-medium">Định mức/tháng</th>
                                            <th className="px-5 py-3.5 font-medium">Đã dùng</th>
                                            <th className="px-5 py-3.5 font-medium">Còn lại</th>
                                            <th className="px-5 py-3.5 font-medium text-right w-20">Thao tác</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {activeTab === 'my-tickets' && mockMyTickets.map((row) => (
                                    <tr key={row.id} className="hover:bg-blue-50/30 transition-colors bg-white group cursor-default">
                                        <td className="px-5 py-3.5">
                                            <input type="checkbox" checked={isSelected(row.id)} onChange={() => toggleSelect(row.id)} className="rounded border-slate-300 w-4 h-4 cursor-pointer text-blue-600 focus:ring-blue-500 bg-white" />
                                        </td>
                                        <td className="px-5 py-3.5 font-medium text-slate-800 flex items-center gap-2">
                                            <div className="w-6 h-6 rounded bg-slate-50 flex items-center justify-center border border-slate-100">
                                                {renderTypeIcon(row.type)}
                                            </div>
                                            {row.type}
                                        </td>
                                        <td className="px-5 py-3.5"><div className="w-16">{renderShift(row.shift)}</div></td>
                                        <td className="px-5 py-3.5 text-slate-800">{row.date}</td>
                                        <td className="px-5 py-3.5">{renderStatus(row.status)}</td>
                                        <td className="px-5 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="text-blue-500 hover:text-blue-600">
                                                    <Edit size={16} />
                                                </button>
                                                <button className="text-red-500 hover:text-red-600">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {activeTab === 'managed' && mockManagedTickets.map((row) => (
                                    <tr key={row.id} className="hover:bg-blue-50/30 transition-colors bg-white group cursor-default">
                                        <td className="px-5 py-3.5">
                                            <input type="checkbox" checked={isSelected(row.id)} onChange={() => toggleSelect(row.id)} className="rounded border-slate-300 w-4 h-4 cursor-pointer text-blue-600 focus:ring-blue-500 bg-white" />
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="font-medium text-slate-800">{row.sender}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">{row.department}</div>
                                        </td>
                                        <td className="px-5 py-3.5 text-slate-600">{row.department}</td>
                                        <td className="px-5 py-3.5 text-slate-800 font-medium flex items-center gap-2 h-full py-4 border-b-0">
                                            <div className="w-6 h-6 rounded bg-slate-50 flex items-center justify-center border border-slate-100 shrink-0">
                                                {renderTypeIcon(row.type)}
                                            </div>
                                            <span className="truncate">{row.type}</span>
                                        </td>
                                        <td className="px-5 py-3.5"><div className="w-16">{renderShift(row.shift)}</div></td>
                                        <td className="px-5 py-3.5 text-slate-800">{row.date}</td>
                                        <td className="px-5 py-3.5">{renderStatus(row.status)}</td>
                                        <td className="px-5 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="text-red-500 hover:text-red-600">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {activeTab === 'quotas' && mockQuotas.map((row) => (
                                    <tr key={row.id} className="hover:bg-blue-50/30 transition-colors bg-white group cursor-default">
                                        <td className="px-5 py-3.5">
                                            <input type="checkbox" checked={isSelected(row.id)} onChange={() => toggleSelect(row.id)} className="rounded border-slate-300 w-4 h-4 cursor-pointer text-blue-600 focus:ring-blue-500 bg-white" />
                                        </td>
                                        <td className="px-5 py-3.5 font-medium text-slate-800 flex items-center gap-2">
                                            <div className="w-6 h-6 rounded bg-slate-50 flex items-center justify-center border border-slate-100">
                                                {renderTypeIcon(row.type)}
                                            </div>
                                            {row.type}
                                        </td>
                                        <td className="px-5 py-3.5 text-slate-600">{row.quota}</td>
                                        <td className="px-5 py-3.5 text-slate-600">{row.used}</td>
                                        <td className="px-5 py-3.5 text-slate-600">{row.remaining}</td>
                                        <td className="px-5 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="text-slate-400">—</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-5 py-3 flex items-center justify-between text-sm text-slate-600 border-t border-slate-200 bg-white">
                        <div className="flex items-center gap-3">
                            <span className="font-medium">
                                {activeTab === 'my-tickets' ? mockMyTickets.length : (activeTab === 'managed' ? mockManagedTickets.length : mockQuotas.length)} bản ghi
                            </span>
                            <span className="text-slate-300">·</span>
                            <span>1—{activeTab === 'my-tickets' ? mockMyTickets.length : (activeTab === 'managed' ? mockManagedTickets.length : mockQuotas.length)}</span>
                            <div className="flex items-center gap-1.5 ml-2">
                                <select className="border border-slate-200 bg-white rounded px-2 py-0.5 outline-none hover:border-slate-300 cursor-pointer text-slate-700">
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

                            <button className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors outline-none focus:ring-2 focus:ring-slate-100 disabled:opacity-50" disabled><ChevronRight size={16} /></button>
                            <button className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors outline-none focus:ring-2 focus:ring-slate-100 disabled:opacity-50" disabled><ChevronsRight size={16} /></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
