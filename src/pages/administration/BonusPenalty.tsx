import React, { useState } from 'react';
import {
    ArrowLeft,
    Search,
    Plus,
    Calendar as CalendarIcon,
    Edit,
    Trash2,
    List,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from 'lucide-react';

const mockData = [
    { id: 1, name: 'Lê Minh Công', code: 'NV000', period: '2025-01', type: 'Cộng', category: 'Hoàn thành vượt KPI', points: 2, description: 'Đạt 120% chỉ tiêu quý' },
    { id: 2, name: 'Lê Minh Quân', code: 'NV002', period: '2025-01', type: 'Trừ', category: 'Đi muộn', points: 1, description: 'Đi muộn 15 phút ngày 10/01' },
    { id: 3, name: 'Nguyễn Văn Thành', code: 'NV001', period: '2025-02', type: 'Cộng', category: 'Chuyên cần (không đi trễ/về sớm)', points: 1, description: '—' },
];

export function BonusPenalty() {
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };
    const isSelected = (id: number) => selectedIds.includes(id);
    const isAllSelected = mockData.length > 0 && mockData.every(r => selectedIds.includes(r.id));
    const toggleSelectAll = () => {
        setSelectedIds(isAllSelected ? [] : mockData.map(r => r.id));
    };

    const renderTypeBadge = (type: string) => {
        if (type === 'Cộng') {
            return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">Cộng</span>;
        }
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-rose-50 text-rose-600 border border-rose-200">Trừ</span>;
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden text-slate-700">

                {/* Content Wrapper */}
                <div className="flex flex-col bg-white ">
                    {/* Top Toolbar */}
                    <div className="px-4 py-4 border-b border-slate-200 flex flex-col md:flex-row items-center gap-3 justify-between bg-slate-50">
                        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
                            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-800 transition-colors bg-white shadow-sm">
                                <ArrowLeft size={16} /> Quay lại
                            </button>

                            <div className="relative flex-1 md:w-80 max-w-md">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm theo nhân viên, hạng mục, mô tả..."
                                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                            <button className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap shadow-sm">
                                <Plus size={16} /> Thêm mới
                            </button>
                        </div>
                    </div>

                    {/* Filters Row */}
                    <div className="px-4 py-3 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white">
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-3 py-1 text-slate-600 h-8">
                            <List size={14} className="text-slate-400" />
                            <select className="text-sm bg-transparent outline-none cursor-pointer pr-2 w-20 text-slate-700 leading-none">
                                <option>Loại</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-3 py-1 font-medium hover:bg-slate-100 cursor-pointer h-8 transition-colors select-none text-slate-600">
                            <CalendarIcon size={14} className="text-slate-400" />
                            <span className="text-sm tracking-widest leading-none mt-0.5">---------</span>
                            <CalendarIcon size={14} className="text-slate-400 ml-1 opacity-50" />
                        </div>
                    </div>

                    {/* Content Section (Table) */}
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="text-[13px] text-slate-600 font-semibold bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-5 py-3 w-12 font-medium">
                                        <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} className="rounded border-slate-300 bg-white w-4 h-4 cursor-pointer text-blue-600 focus:ring-blue-500/50 focus:ring-offset-0" />
                                    </th>

                                    <th className="px-5 py-3 font-semibold">Nhân viên</th>
                                    <th className="px-5 py-3 font-semibold">Kỳ (Năm-Tháng)</th>
                                    <th className="px-5 py-3 font-semibold text-center w-24">Loại</th>
                                    <th className="px-5 py-3 font-semibold">Hạng mục</th>
                                    <th className="px-5 py-3 font-semibold text-center w-20">Điểm</th>
                                    <th className="px-5 py-3 font-semibold">Mô tả</th>
                                    <th className="px-5 py-3 font-semibold text-right w-24">Thao tác</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-600">
                                {mockData.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-5 py-4">
                                            <input type="checkbox" checked={isSelected(row.id)} onChange={() => toggleSelect(row.id)} className="rounded border-slate-300 bg-white w-4 h-4 cursor-pointer text-blue-600 focus:ring-blue-500/50 focus:ring-offset-0" />
                                        </td>

                                        <td className="px-5 py-4">
                                            <div className="font-semibold text-slate-800">{row.name}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">{row.code}</div>
                                        </td>

                                        <td className="px-5 py-4 text-slate-700 font-medium">{row.period}</td>

                                        <td className="px-5 py-4 text-center">
                                            <div className="flex justify-center shrink-0">
                                                {renderTypeBadge(row.type)}
                                            </div>
                                        </td>

                                        <td className="px-5 py-4 text-slate-700 max-w-[200px] truncate">{row.category}</td>

                                        <td className="px-5 py-4 text-center font-bold text-slate-800">{row.points}</td>

                                        <td className="px-5 py-4 text-slate-500 max-w-[250px] truncate">{row.description}</td>

                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button className="text-blue-500 hover:text-blue-600 transition-colors">
                                                    <Edit size={16} />
                                                </button>
                                                <button className="text-rose-500 hover:text-rose-600 transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-5 py-3 flex items-center justify-between text-sm text-slate-600 border-t border-slate-200 bg-slate-50">
                        <div className="flex items-center gap-3">
                            <span className="font-medium">
                                {mockData.length} bản ghi
                            </span>
                            <span className="text-slate-400">·</span>
                            <span>1—{mockData.length}</span>
                            <div className="flex items-center gap-1.5 ml-2">
                                <select className="border border-slate-300 bg-white rounded px-2 py-0.5 outline-none hover:border-slate-400 cursor-pointer text-slate-700">
                                    <option>20</option>
                                    <option>50</option>
                                </select>
                                <span className="text-slate-500">/ trang</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50" disabled><ChevronsLeft size={16} /></button>
                            <button className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50" disabled><ChevronLeft size={16} /></button>

                            <button className="w-7 h-7 bg-blue-600 text-white rounded flex items-center justify-center font-medium shadow-sm outline-none focus:ring-2 focus:ring-blue-500/50">1</button>

                            <button className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50" disabled><ChevronRight size={16} /></button>
                            <button className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50" disabled><ChevronsRight size={16} /></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

