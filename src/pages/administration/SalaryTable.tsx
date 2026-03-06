import React, { useState } from 'react';
import {
    ArrowLeft, Search, Plus, Calendar, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    User, List, BarChart2, Briefcase, Edit, Trash2, CheckSquare, Square
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

const mockMySalary = [
    { id: 1, period: '2025-02', department: 'Phòng Hành chính', workDays: '20/22', baseSalary: 22727273, kpiSalary: 7272727, respSalary: 4545455, allowance: 1818182, bonusPenalty: -200000, total: 36163637 },
    { id: 2, period: '2025-01', department: 'Phòng Hành chính', workDays: '23/22', baseSalary: 26136364, kpiSalary: 8363636, respSalary: 5227273, allowance: 2090909, bonusPenalty: 500000, total: 42318182 },
    { id: 3, period: '2024-12', department: 'Phòng Hành chính', workDays: '22/22', baseSalary: 25000000, kpiSalary: 5000000, respSalary: 5000000, allowance: 2000000, bonusPenalty: 0, total: 37800000 },
];

const mockListSalary = [
    { id: 1, name: 'Nguyễn Đình Cường', code: 'NV035', period: '2025-02', department: 'Phòng Kho vận', workDays: '20/22', baseSalary: 0, kpiSalary: 0, respSalary: 0, allowance: 0, bonusPenalty: 0, total: 0 },
    { id: 2, name: 'Huỳnh Thị Yến Nhi', code: 'NV034', period: '2025-02', department: 'Phòng Nhân sự', workDays: '20/22', baseSalary: 0, kpiSalary: 0, respSalary: 0, allowance: 0, bonusPenalty: 0, total: 0 },
    { id: 3, name: 'Đoàn Văn Hải', code: 'NV033', period: '2025-02', department: 'Nhóm Phát triển phần mềm', workDays: '20/22', baseSalary: 0, kpiSalary: 0, respSalary: 0, allowance: 0, bonusPenalty: 0, total: 0 },
    { id: 4, name: 'Phạm Thị Mỹ Linh', code: 'NV032', period: '2025-02', department: 'Phòng Hành chính', workDays: '20/22', baseSalary: 0, kpiSalary: 0, respSalary: 0, allowance: 0, bonusPenalty: 0, total: 0 },
    { id: 5, name: 'Vũ Hoàng Minh', code: 'NV031', period: '2025-02', department: 'Phòng Kinh doanh', workDays: '20/22', baseSalary: 0, kpiSalary: 0, respSalary: 0, allowance: 0, bonusPenalty: 0, total: 0 },
    { id: 6, name: 'Trần Ngọc Diễm', code: 'NV030', period: '2025-02', department: 'Phòng Tài chính - Kế toán', workDays: '20/22', baseSalary: 0, kpiSalary: 0, respSalary: 0, allowance: 0, bonusPenalty: 0, total: 0 },
];

const pieData = [
    { name: 'Nhóm Hạ tầng IT', value: 12, color: '#f59e0b' },
    { name: 'Nhóm Phát triển phần mềm', value: 15, color: '#0ea5e9' },
    { name: 'Phòng Hành chính', value: 12, color: '#10b981' },
    { name: 'Phòng Nhân sự', value: 12, color: '#ef4444' },
    { name: 'Phòng Kho vận', value: 12, color: '#eab308' },
    { name: 'Phòng Kinh doanh', value: 18, color: '#3b82f6' },
    { name: 'Phòng Kỹ thuật', value: 9, color: '#d946ef' },
    { name: 'Phòng Marketing', value: 8, color: '#14b8a6' },
];

const barData = [
    { name: '2025-02', value: 36, color: '#8b5cf6' },
    { name: '2025-01', value: 36, color: '#06b6d4' },
    { name: '2024-12', value: 36, color: '#f59e0b' },
];

const formatCur = (num: number) => {
    return typeof num === 'number' ? num.toLocaleString('vi-VN') + ' đ' : num;
};

// Common Class Names for Light Theme consistency (System Sync)
const clx = {
    bgBase: 'bg-white', // Component main background
    bgCard: 'bg-white', // Inner card backgrounds
    bgHeader: 'bg-slate-50', // Table / List headers
    bgRow: 'bg-white', // Table rows
    bgRowHover: 'hover:bg-slate-50', // Table row hover
    border: 'border-slate-200',
    borderInput: 'border-slate-300',
    textPrimary: 'text-slate-800',
    textSecondary: 'text-slate-600',
    textMuted: 'text-slate-500',
    accentBlue: 'text-blue-600',
    btnPrimary: 'bg-blue-600 hover:bg-blue-700 text-white',
};

export function SalaryTable() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'me' | 'list' | 'stats'>('me');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const isSelected = (id: number) => selectedIds.includes(id);

    const containerVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut", staggerChildren: 0.05 } },
        exit: { opacity: 0, y: -10, transition: { duration: 0.2, ease: "easeIn" } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className={`space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10`}>
            <div className={`w-full ${clx.bgBase} rounded-xl shadow-sm border ${clx.border} overflow-hidden text-sm`}>
                {/* 1. TABS */}
                <div className={`flex items-center gap-6 px-4 md:px-6 border-b ${clx.border} ${clx.bgHeader}`}>
                    <button
                        onClick={() => setActiveTab('me')}
                        className={`py-3 md:py-4 text-xs md:text-sm font-medium flex items-center gap-2 border-b-2 transition-all duration-300 relative ${activeTab === 'me'
                            ? `border-blue-600 text-blue-600`
                            : `border-transparent ${clx.textSecondary} hover:text-slate-800`
                            }`}
                    >
                        <User size={16} /> Của tôi
                    </button>
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`py-3 md:py-4 text-xs md:text-sm font-medium flex items-center gap-2 border-b-2 transition-all duration-300 relative ${activeTab === 'list'
                            ? `border-blue-600 text-blue-600`
                            : `border-transparent ${clx.textSecondary} hover:text-slate-800`
                            }`}
                    >
                        <List size={16} /> Danh sách
                    </button>
                    <button
                        onClick={() => setActiveTab('stats')}
                        className={`py-3 md:py-4 text-xs md:text-sm font-medium flex items-center gap-2 border-b-2 transition-all duration-300 relative ${activeTab === 'stats'
                            ? `border-blue-600 text-blue-600`
                            : `border-transparent ${clx.textSecondary} hover:text-slate-800`
                            }`}
                    >
                        <BarChart2 size={16} /> Thống kê
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="flex flex-col bg-white"
                    >

                        {/* -------------------- ME & LIST TABS -------------------- */}
                        {(activeTab === 'me' || activeTab === 'list') && (
                            <motion.div variants={itemVariants} className="flex flex-col">
                                {/* Toolbar */}
                                <div className={`px-4 py-3 border-b ${clx.border} flex flex-col md:flex-row items-center gap-3 justify-between bg-white`}>
                                    <div className="flex items-center gap-3 w-full md:w-auto flex-1">
                                        <button
                                            onClick={() => navigate(-1)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 border ${clx.borderInput} rounded-lg text-sm font-medium ${clx.textSecondary} hover:bg-slate-50 transition-colors`}
                                        >
                                            <ArrowLeft size={16} /> Quay lại
                                        </button>

                                        <div className="relative flex-1 md:w-80 max-w-md">
                                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input
                                                type="text"
                                                placeholder={activeTab === 'me' ? "Tìm theo kỳ, phòng ban..." : "Tìm theo tên, mã NV, phòng ban..."}
                                                className={`w-full pl-9 pr-3 py-1.5 bg-white border ${clx.borderInput} rounded-lg text-sm ${clx.textPrimary} placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all`}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                                        <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors">
                                            <List size={16} />
                                        </button>
                                        <button className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm ${clx.btnPrimary}`}>
                                            <Plus size={16} /> Thêm mới
                                        </button>
                                    </div>
                                </div>

                                {/* Filters for LIST specific tab */}
                                <AnimatePresence>
                                    {activeTab === 'list' && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className={`px-4 py-3 flex flex-wrap items-center gap-3 border-b ${clx.border} bg-slate-50/50 overflow-hidden`}
                                        >
                                            <div className={`flex items-center gap-2 bg-white border ${clx.borderInput} rounded-md px-3 py-1 text-slate-600 h-8`}>
                                                <Briefcase size={14} className="text-slate-400" />
                                                <select className="text-sm bg-transparent outline-none cursor-pointer pr-2 text-slate-700">
                                                    <option>Phòng ban</option>
                                                </select>
                                            </div>
                                            <div className={`flex items-center gap-2 bg-white border ${clx.borderInput} rounded-md px-3 py-1 text-slate-600 h-8 font-medium hover:bg-slate-50 cursor-pointer transition-colors select-none`}>
                                                <Calendar size={14} className="text-slate-400" />
                                                <span className="text-sm tracking-widest leading-none mt-0.5">---------</span>
                                                <Calendar size={14} className="text-slate-400 ml-1 opacity-50" />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Table wrapper */}
                                <div className={`overflow-x-auto flex-1`}>
                                    <table className="w-full text-sm text-left whitespace-nowrap">
                                        <thead className={`text-[13px] ${clx.textSecondary} font-semibold ${clx.bgHeader} border-b ${clx.border}`}>
                                            <tr>
                                                <th className="px-5 py-3 w-12 font-medium">
                                                    <input type="checkbox" checked={(() => { const data = activeTab === 'me' ? mockMySalary : mockListSalary; return data.length > 0 && data.every(r => selectedIds.includes(r.id)); })()} onChange={() => { const data = activeTab === 'me' ? mockMySalary : mockListSalary; const allSelected = data.every(r => selectedIds.includes(r.id)); setSelectedIds(allSelected ? [] : data.map(r => r.id)); }} className="rounded border-slate-300 bg-white w-4 h-4 cursor-pointer text-blue-600 focus:ring-blue-500/50 focus:ring-offset-0" />
                                                </th>
                                                {activeTab === 'list' && <th className="px-5 py-3 font-semibold">Nhân viên</th>}
                                                <th className="px-5 py-3 font-semibold">Kỳ</th>
                                                <th className="px-5 py-3 font-semibold">Phòng ban</th>
                                                <th className="px-5 py-3 font-semibold">Ngày công</th>
                                                <th className="px-5 py-3 font-semibold">Lương cơ bản</th>
                                                <th className="px-5 py-3 font-semibold">Lương KPI</th>
                                                <th className="px-5 py-3 font-semibold">Lương trách nhiệm</th>
                                                <th className="px-5 py-3 font-semibold">Phụ cấp</th>
                                                <th className="px-5 py-3 font-semibold">Cộng trừ</th>
                                                <th className="px-5 py-3 font-semibold">Tổng lương</th>
                                                <th className="px-5 py-3 font-semibold text-right w-24">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody className={`divide-y divide-slate-100 ${clx.textSecondary}`}>
                                            {(activeTab === 'me' ? mockMySalary : mockListSalary).map((row, idx) => (
                                                <motion.tr
                                                    key={row.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    className={`${clx.bgRow} ${clx.bgRowHover} transition-colors group`}
                                                    onClick={() => toggleSelect(row.id)}
                                                >
                                                    <td className="px-5 py-4">
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected(row.id)}
                                                            onChange={() => toggleSelect(row.id)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="rounded border-slate-300 bg-white w-4 h-4 cursor-pointer text-blue-600 focus:ring-blue-500/50 focus:ring-offset-0"
                                                        />
                                                    </td>
                                                    {activeTab === 'list' && 'name' in row && (
                                                        <td className="px-5 py-4">
                                                            <div className="font-semibold text-slate-800">{(row as any).name}</div>
                                                            <div className="text-xs text-slate-500 mt-0.5">{(row as any).code}</div>
                                                        </td>
                                                    )}
                                                    <td className={`px-5 py-4 font-medium ${clx.textPrimary}`}>{row.period}</td>
                                                    <td className="px-5 py-4 text-slate-700">{row.department}</td>
                                                    <td className="px-5 py-4 text-slate-700">{row.workDays}</td>
                                                    <td className="px-5 py-4 font-medium text-slate-700">{formatCur(row.baseSalary)}</td>
                                                    <td className="px-5 py-4 font-medium text-slate-700">{formatCur(row.kpiSalary)}</td>
                                                    <td className="px-5 py-4 font-medium text-slate-700">{formatCur(row.respSalary)}</td>
                                                    <td className="px-5 py-4 font-medium text-slate-700">{formatCur(row.allowance)}</td>
                                                    <td className={`px-5 py-4 font-medium ${row.bonusPenalty < 0 ? 'text-rose-600' : row.bonusPenalty > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                        {row.bonusPenalty > 0 ? '+' : ''}{formatCur(row.bonusPenalty)}
                                                    </td>
                                                    <td className="px-5 py-4 font-bold text-blue-600">{formatCur(row.total)}</td>
                                                    <td className="px-5 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-3 text-slate-400 transition-opacity">
                                                            <button className="text-blue-500 hover:text-blue-600 transition-colors p-1" onClick={(e) => e.stopPropagation()}>
                                                                <Edit size={16} />
                                                            </button>
                                                            <button className="text-rose-500 hover:text-rose-600 transition-colors p-1" onClick={(e) => e.stopPropagation()}>
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination */}
                                <div className={`px-5 py-3 flex items-center justify-between text-sm ${clx.textSecondary} border-t ${clx.border} ${clx.bgHeader}`}>
                                    <div className="flex items-center gap-3">
                                        <span className="font-medium">{activeTab === 'me' ? 3 : 105} bản ghi</span>
                                        <span className="text-slate-400">•</span>
                                        <span>1—{activeTab === 'me' ? 3 : 50}</span>
                                        <div className={`flex items-center gap-1.5 ml-2`}>
                                            <select defaultValue="50" className={`border ${clx.borderInput} bg-white rounded px-2 py-0.5 outline-none hover:border-slate-400 cursor-pointer text-slate-700`}>
                                                <option value="20">20</option>
                                                <option value="50">50</option>
                                            </select>
                                            <span className="text-slate-500">/ trang</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50" disabled><ChevronsLeft size={16} /></button>
                                        <button className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50" disabled><ChevronLeft size={16} /></button>
                                        <button className="w-7 h-7 bg-blue-600 text-white rounded flex items-center justify-center font-medium shadow-sm outline-none focus:ring-2 focus:ring-blue-500/50">1</button>
                                        {activeTab === 'list' && (
                                            <button className="w-7 h-7 border border-transparent hover:bg-slate-200 text-slate-600 rounded flex items-center justify-center font-medium transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-blue-500/50">6</button>
                                        )}
                                        <button className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors outline-none focus:ring-2 focus:ring-blue-500/50"><ChevronRight size={16} /></button>
                                        <button className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors outline-none focus:ring-2 focus:ring-blue-500/50"><ChevronsRight size={16} /></button>
                                    </div>
                                </div>

                            </motion.div>
                        )}

                        {/* -------------------- STATS TAB -------------------- */}
                        {activeTab === 'stats' && (
                            <motion.div variants={itemVariants} className="p-4 space-y-4 bg-slate-50/30">
                                {/* Stats Toolbar */}
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className={`flex items-center gap-2 bg-white border ${clx.borderInput} rounded-md px-3 py-1 text-slate-600 h-8`}>
                                        <Calendar size={14} className="text-slate-400" />
                                        <select className="text-sm bg-transparent outline-none cursor-pointer pr-2 w-24 text-slate-700">
                                            <option>Chọn kỳ</option>
                                        </select>
                                    </div>
                                    <div className={`flex items-center gap-2 bg-white border ${clx.borderInput} rounded-md px-3 py-1 text-slate-600 h-8`}>
                                        <Briefcase size={14} className="text-slate-400" />
                                        <select className="text-sm bg-transparent outline-none cursor-pointer pr-2 w-32 text-slate-700">
                                            <option>Phòng ban</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Cards row */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <motion.div variants={itemVariants} className={`p-4 rounded-xl border ${clx.border} bg-white shadow-sm flex items-center gap-4`}>
                                        <div className="bg-slate-100 p-3 rounded-lg text-slate-500">
                                            <List size={20} />
                                        </div>
                                        <div>
                                            <div className="text-sm text-slate-500 font-medium">Tổng số bản ghi</div>
                                            <div className="text-2xl font-bold text-slate-800">108</div>
                                        </div>
                                    </motion.div>
                                    <motion.div variants={itemVariants} className={`p-4 rounded-xl border border-blue-200 bg-white shadow-[0_4px_15px_-3px_rgba(59,130,246,0.1)] flex items-center gap-4 relative overflow-hidden`}>
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full z-0 opacity-50"></div>
                                        <div className="bg-blue-50 p-3 rounded-lg text-blue-500 z-10">
                                            <BarChart2 size={20} />
                                        </div>
                                        <div className="z-10">
                                            <div className="text-sm text-blue-600 font-medium">Tổng quỹ lương</div>
                                            <div className="text-2xl font-bold text-blue-600">978.969.095 đ</div>
                                        </div>
                                    </motion.div>
                                    <motion.div variants={itemVariants} className={`p-4 rounded-xl border border-emerald-200 bg-white shadow-[0_4px_15px_-3px_rgba(16,185,129,0.1)] flex items-center gap-4 relative overflow-hidden`}>
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full z-0 opacity-50"></div>
                                        <div className="bg-emerald-50 p-3 rounded-lg text-emerald-500 z-10">
                                            <User size={20} />
                                        </div>
                                        <div className="z-10">
                                            <div className="text-sm text-emerald-600 font-medium">Lương TB</div>
                                            <div className="text-2xl font-bold text-emerald-600">9.064.529 đ</div>
                                        </div>
                                    </motion.div>
                                </div>

                                {/* Charts Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <motion.div variants={itemVariants} className={`p-5 rounded-xl border ${clx.border} bg-white shadow-sm`}>
                                        <div className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-6 font-semibold">
                                            <PieChart size={16} className="text-blue-500" /> Theo phòng ban
                                        </div>
                                        <div className="h-64 cursor-pointer relative z-10">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={pieData}
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={2}
                                                        dataKey="value"
                                                    >
                                                        {pieData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip
                                                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: '8px' }}
                                                        itemStyle={{ color: '#334155' }}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="flex flex-wrap items-center justify-center gap-3 mt-4 text-xs font-medium text-slate-600">
                                            {pieData.map(d => (
                                                <div key={d.name} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }}></span> {d.name}</div>
                                            ))}
                                        </div>
                                    </motion.div>

                                    <motion.div variants={itemVariants} className={`p-5 rounded-xl border ${clx.border} bg-white shadow-sm`}>
                                        <div className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-6 font-semibold">
                                            <BarChart2 size={16} className="text-blue-500" /> Theo kỳ
                                        </div>
                                        <div className="h-64">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={barData} margin={{ top: 20, right: 30, left: -20, bottom: 5 }}>
                                                    <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                                                    <YAxis stroke="#64748b" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} tickCount={5} />
                                                    <Tooltip
                                                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                                                        contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#1e293b', borderRadius: '8px' }}
                                                    />
                                                    <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                                        {barData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </motion.div>
                                </div>

                                {/* Data Tables */}
                                <div className="grid grid-cols-1 gap-4">
                                    {/* Theo kỳ table */}
                                    <motion.div variants={itemVariants} className={`rounded-xl border ${clx.border} bg-white overflow-hidden shadow-sm`}>
                                        <div className={`px-4 py-3 border-b ${clx.border} flex items-center gap-2 text-sm font-semibold text-slate-700 ${clx.bgHeader}`}>
                                            <List size={16} className="text-blue-500" /> Theo kỳ
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left whitespace-nowrap">
                                                <thead className={`text-xs text-slate-500 bg-slate-50/50 border-b ${clx.border}`}>
                                                    <tr>
                                                        <th className="px-5 py-3 font-medium">Kỳ</th>
                                                        <th className="px-5 py-3 font-medium text-right">Tổng số bản ghi</th>
                                                        <th className="px-5 py-3 font-medium text-right">Tổng quỹ lương</th>
                                                        <th className="px-5 py-3 font-medium text-right">Lương TB</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                                                    <tr className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-5 py-3 font-medium text-slate-700">2025-02</td>
                                                        <td className="px-5 py-3 text-right">36</td>
                                                        <td className="px-5 py-3 text-right">298.981.822 đ</td>
                                                        <td className="px-5 py-3 text-right font-medium text-slate-700">8.305.051 đ</td>
                                                    </tr>
                                                    <tr className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-5 py-3 font-medium text-slate-700">2025-01</td>
                                                        <td className="px-5 py-3 text-right">36</td>
                                                        <td className="px-5 py-3 text-right">353.617.273 đ</td>
                                                        <td className="px-5 py-3 text-right font-medium text-slate-700">9.822.702 đ</td>
                                                    </tr>
                                                    <tr className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-5 py-3 font-medium text-slate-700">2024-12</td>
                                                        <td className="px-5 py-3 text-right">36</td>
                                                        <td className="px-5 py-3 text-right">326.370.000 đ</td>
                                                        <td className="px-5 py-3 text-right font-medium text-slate-700">9.065.833 đ</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </motion.div>

                                    {/* Theo phòng ban table */}
                                    <motion.div variants={itemVariants} className={`rounded-xl border ${clx.border} bg-white overflow-hidden shadow-sm`}>
                                        <div className={`px-4 py-3 border-b ${clx.border} flex items-center gap-2 text-sm font-semibold text-slate-700 ${clx.bgHeader}`}>
                                            <Briefcase size={16} className="text-blue-500" /> Theo phòng ban
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left whitespace-nowrap">
                                                <thead className={`text-xs text-slate-500 bg-slate-50/50 border-b ${clx.border}`}>
                                                    <tr>
                                                        <th className="px-5 py-3 font-medium">Phòng ban</th>
                                                        <th className="px-5 py-3 font-medium text-right">Tổng số bản ghi</th>
                                                        <th className="px-5 py-3 font-medium text-right">Tổng quỹ lương</th>
                                                        <th className="px-5 py-3 font-medium text-right">Lương TB</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                                                    <tr className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-5 py-3 font-medium text-slate-700">Phòng Kinh doanh</td>
                                                        <td className="px-5 py-3 text-right">18</td>
                                                        <td className="px-5 py-3 text-right">63.965.910 đ</td>
                                                        <td className="px-5 py-3 text-right font-medium text-slate-700">3.553.662 đ</td>
                                                    </tr>
                                                    <tr className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-5 py-3 font-medium text-slate-700">Nhóm Phát triển phần mềm</td>
                                                        <td className="px-5 py-3 text-right">15</td>
                                                        <td className="px-5 py-3 text-right">139.397.729 đ</td>
                                                        <td className="px-5 py-3 text-right font-medium text-slate-700">9.293.182 đ</td>
                                                    </tr>
                                                    <tr className="hover:bg-slate-50 transition-colors">
                                                        <td className="px-5 py-3 font-medium text-slate-700">Phòng Hành chính</td>
                                                        <td className="px-5 py-3 text-right">12</td>
                                                        <td className="px-5 py-3 text-right">295.231.819 đ</td>
                                                        <td className="px-5 py-3 text-right font-medium text-slate-700">24.602.652 đ</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </motion.div>
                                </div>

                            </motion.div>
                        )}

                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
