import React, { useState } from 'react';
import {
    ArrowLeft,
    Search,
    Plus,
    Filter,
    Calendar as CalendarIcon,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    User,
    BarChart,
    Briefcase,
    Edit,
    Trash2,
    Save,
    CheckCircle,
    XCircle,
    List,
    Download
} from 'lucide-react';

const mockManaged = [
    { id: 1, name: 'Lê Minh Quân', code: 'NV002', period: '2025-01', department: 'Phòng Hành chính', position: 'Lập trình viên Senior', kpiScore: 86.5, totalKpi: 85.5, evaluation: 'Đạt' },
    { id: 2, name: 'Nguyễn Văn Thành', code: 'NV001', period: '2025-02', department: 'Phòng Hành chính', position: 'Trưởng Phòng Hành chính', kpiScore: 83.2, totalKpi: 84.2, evaluation: 'Không đạt' },
    { id: 3, name: 'Nguyễn Văn Thành', code: 'NV001', period: '2025-01', department: 'Phòng Hành chính', position: 'Nhân viên Hành chính', kpiScore: 88.4, totalKpi: 88.4, evaluation: 'Đạt' },
    { id: 4, name: 'Trần Thị Hà', code: 'NV003', period: '2025-01', department: 'Phòng Kỹ thuật', position: 'Lập trình viên Senior', kpiScore: 88.0, totalKpi: 88.0, evaluation: 'Đạt' },
    { id: 5, name: 'Phạm Minh Tuấn', code: 'NV004', period: '2025-01', department: 'Nhóm Phát triển phần mềm', position: 'Lập trình viên Senior', kpiScore: 92.2, totalKpi: 92.2, evaluation: 'Đạt' },
    { id: 6, name: 'Bùi Thị Lan', code: 'NV008', period: '2025-01', department: 'Phòng Nhân sự', position: 'Chuyên viên Tuyển dụng', kpiScore: 87.5, totalKpi: 87.5, evaluation: 'Đạt' },
    { id: 7, name: 'Trịnh Thị Ngọc', code: 'NV010', period: '2025-01', department: 'Phòng Tài chính - Kế toán', position: 'Kế toán viên', kpiScore: 99.0, totalKpi: 99.0, evaluation: 'Đạt' },
    { id: 8, name: 'Đinh Công Vinh', code: 'NV012', period: '2025-01', department: 'Phòng Kinh doanh', position: 'Nhân viên Kinh doanh', kpiScore: 76.0, totalKpi: 76.0, evaluation: 'Không đạt' },
    { id: 9, name: 'Lê Anh Dũng', code: 'NV015', period: '2025-01', department: 'Nhóm Văn phòng', position: 'Trưởng Nhóm Văn phòng', kpiScore: 90.2, totalKpi: 90.2, evaluation: 'Đạt' },
];

const mockMyKPIs = [
    { id: 1, period: '2025-01', department: 'Phòng Hành chính', position: 'Trưởng Phòng Hành chính', kpiScore: 89.0, totalKpi: 91.0, evaluation: 'Đạt' },
    { id: 2, period: '2025-02', department: 'Phòng Hành chính', position: 'Trưởng Phòng Hành chính', kpiScore: 89.0, totalKpi: 89.0, evaluation: 'Đạt' },
    { id: 3, period: '2024-12', department: 'Phòng Hành chính', position: 'Trưởng Phòng Hành chính', kpiScore: 83.5, totalKpi: 83.5, evaluation: 'Không đạt' },
];

export function KPIGrading() {
    const [activeTab, setActiveTab] = useState('managed');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };
    const isSelected = (id: number) => selectedIds.includes(id);
    const currentData = activeTab === 'managed' ? mockManaged : mockMyKPIs;
    const isAllSelected = currentData.length > 0 && currentData.every(r => selectedIds.includes(r.id));
    const toggleSelectAll = () => {
        setSelectedIds(isAllSelected ? [] : currentData.map(r => r.id));
    };

    const renderEvaluation = (evalStatus: string) => {
        if (evalStatus === 'Đạt') {
            return <span className="px-3 py-1 font-medium rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs">Đạt</span>;
        }
        return <span className="px-3 py-1 font-medium rounded-full bg-rose-50 text-rose-600 border border-rose-200 text-xs">Không đạt</span>;
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden text-slate-700">
                {/* Tabs */}
                <div className="flex items-center gap-6 px-4 md:px-6 border-b border-slate-200 bg-slate-50">
                    <button
                        className={`py-3 md:py-4 text-xs md:text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'my-kpis'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        onClick={() => setActiveTab('my-kpis')}
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
                        <Briefcase size={16} />
                        Tôi quản lý
                    </button>
                    <button
                        className={`py-3 md:py-4 text-xs md:text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'statistics'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        onClick={() => setActiveTab('statistics')}
                    >
                        <BarChart size={16} />
                        Thống kê
                    </button>
                </div>

                {/* Content Wrapper */}
                <div className="flex flex-col bg-white ">
                    {/* Top Toolbar */}
                    <div className="px-4 py-3 border-b border-slate-200 flex flex-col md:flex-row items-center gap-3 justify-between">
                        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
                            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                                <ArrowLeft size={16} /> Quay lại
                            </button>

                            {activeTab !== 'statistics' && (
                                <div className="relative flex-1 md:w-80 max-w-md">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder={
                                            activeTab === 'managed'
                                                ? "Tìm theo tên, mã NV, phòng ban..."
                                                : "Tìm theo kỳ, phòng ban, chức vụ..."
                                        }
                                        className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                    />
                                </div>
                            )}

                            {activeTab === 'statistics' && (
                                <>
                                    <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-md px-3 py-1 text-slate-600 h-8">
                                        <Filter size={14} className="text-slate-400" />
                                        <select className="text-sm bg-transparent outline-none cursor-pointer pr-2 w-24 text-slate-700">
                                            <option>Chọn kỳ</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-md px-3 py-1 text-slate-600 h-8">
                                        <Briefcase size={14} className="text-slate-400" />
                                        <select className="text-sm bg-transparent outline-none cursor-pointer pr-2 w-32 text-slate-700">
                                            <option>Phòng ban</option>
                                        </select>
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                            {activeTab !== 'statistics' && (
                                <>
                                    <button className="p-1.5 border border-slate-300 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors">
                                        <Download size={18} />
                                    </button>
                                    <button className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap shadow-sm">
                                        <Plus size={16} /> Thêm mới
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Filters Row */}
                    {activeTab !== 'statistics' && (
                        <div className="px-4 py-3 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50/50">
                            {activeTab === 'managed' && (
                                <>
                                    <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-md px-3 py-1 text-slate-600 h-8">
                                        <Briefcase size={14} className="text-slate-400" />
                                        <select className="text-sm bg-transparent outline-none cursor-pointer pr-2 w-32 text-slate-700">
                                            <option>Phòng ban</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-md px-3 py-1 text-slate-600 h-8">
                                        <User size={14} className="text-slate-400" />
                                        <select className="text-sm bg-transparent outline-none cursor-pointer pr-2 w-20 text-slate-700">
                                            <option>Nhóm</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-md px-3 py-1 text-slate-600 h-8">
                                <CheckCircle size={14} className="text-slate-400" />
                                <select className="text-sm bg-transparent outline-none cursor-pointer pr-2 w-28 text-slate-700">
                                    <option>Đánh giá</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-md px-3 py-1 font-medium hover:bg-slate-50 cursor-pointer h-8 transition-colors select-none text-slate-600">
                                <CalendarIcon size={14} className="text-slate-400" />
                                <span className="text-sm tracking-widest leading-none mt-0.5">---------</span>
                                <CalendarIcon size={14} className="text-slate-400 ml-1 opacity-50" />
                            </div>
                        </div>
                    )}

                    {/* Content Section */}
                    {activeTab === 'statistics' ? (
                        <div className="p-4 space-y-4 bg-slate-50/30">
                            {/* Stats Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between h-24 shadow-sm">
                                    <div className="flex items-start justify-between">
                                        <span className="text-slate-500 text-sm font-medium flex items-center justify-between w-full">Tổng số bản ghi
                                            <List size={16} className="text-slate-400" />
                                        </span>
                                    </div>
                                    <span className="text-2xl font-bold text-slate-800">12</span>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between h-24 relative overflow-hidden shadow-sm">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-50 rounded-bl-[100px]"></div>
                                    <div className="flex items-start justify-between z-10">
                                        <span className="text-emerald-600 text-sm font-medium flex items-center justify-between w-full">Đạt
                                            <CheckCircle size={16} className="text-emerald-500" />
                                        </span>
                                    </div>
                                    <span className="text-2xl font-bold text-slate-800 z-10">9</span>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between h-24 relative overflow-hidden shadow-sm">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-rose-50 rounded-bl-[100px]"></div>
                                    <div className="flex items-start justify-between z-10">
                                        <span className="text-rose-600 text-sm font-medium flex items-center justify-between w-full">Không đạt
                                            <XCircle size={16} className="text-rose-500" />
                                        </span>
                                    </div>
                                    <span className="text-2xl font-bold text-slate-800 z-10">3</span>
                                </div>
                                <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between h-24 shadow-sm">
                                    <div className="flex items-start justify-between">
                                        <span className="text-blue-600 text-sm font-medium flex items-center justify-between w-full">Điểm trung bình
                                            <BarChart size={16} className="text-blue-500" />
                                        </span>
                                    </div>
                                    <span className="text-2xl font-bold text-slate-800">87.9</span>
                                </div>
                            </div>

                            {/* Charts */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Chart 1: Theo phòng ban (Doughnut) */}
                                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-6 font-semibold">
                                        <BarChart size={16} className="text-blue-500" />
                                        Theo phòng ban
                                    </div>
                                    <div className="flex flex-col md:flex-row items-center justify-center gap-8 py-4">
                                        <div className="relative w-40 h-40 drop-shadow-sm">
                                            {/* CSS Doughnut Chart representation logic */}
                                            <div
                                                className="w-full h-full rounded-full"
                                                style={{
                                                    background: `conic-gradient(
                                                        #3b82f6 0% 50%,        
                                                        #f59e0b 50% 58.3%,     
                                                        #ec4899 58.3% 66.6%,   
                                                        #8b5cf6 66.6% 75%,     
                                                        #06b6d4 75% 83.3%,     
                                                        #ef4444 83.3% 91.6%,   
                                                        #10b981 91.6% 100%     
                                                    )`
                                                }}
                                            />
                                            {/* Inner circle to make it a doughnut */}
                                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-white rounded-full"></div>
                                        </div>
                                        {/* Legends */}
                                        <div className="flex flex-wrap md:flex-col gap-2 justify-center text-xs text-slate-600">
                                            <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-blue-500 inline-block rounded-sm"></span> Phòng Hành chính</div>
                                            <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-cyan-500 inline-block rounded-sm"></span> Phòng Kỹ thuật</div>
                                            <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-amber-500 inline-block rounded-sm"></span> Phát triển phần mềm</div>
                                            <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-500 inline-block rounded-sm"></span> Phòng Nhân sự</div>
                                            <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-emerald-500 inline-block rounded-sm"></span> Tài chính - Kế toán</div>
                                            <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-purple-500 inline-block rounded-sm"></span> Phòng Kinh doanh</div>
                                            <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-pink-500 inline-block rounded-sm"></span> Nhóm Văn phòng</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Chart 2: Theo kỳ (Bar) */}
                                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                    <div className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-6 font-semibold">
                                        <BarChart size={16} className="text-blue-500" />
                                        Theo kỳ
                                    </div>
                                    <div className="h-48 flex items-end justify-center gap-12 px-6 pb-6 border-b border-slate-200 relative">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-6 h-12 bg-purple-500 rounded-t-sm shadow-sm hover:opacity-80 transition-opacity"></div>
                                            <span className="text-xs text-slate-500 mt-1 font-medium">2025-02</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-6 h-32 bg-cyan-500 rounded-t-sm shadow-sm hover:opacity-80 transition-opacity"></div>
                                            <span className="text-xs text-slate-500 mt-1 font-medium">2025-01</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-6 h-4 bg-amber-500 rounded-t-sm shadow-sm hover:opacity-80 transition-opacity"></div>
                                            <span className="text-xs text-slate-500 mt-1 font-medium">2024-12</span>
                                        </div>

                                        {/* Y-axis labels simplified */}
                                        <div className="absolute left-0 top-0 bottom-6 w-6 flex flex-col justify-between text-[10px] text-slate-400 border-r border-slate-200 pr-2 items-end font-medium">
                                            <span>10</span>
                                            <span>8</span>
                                            <span>6</span>
                                            <span>4</span>
                                            <span>2</span>
                                            <span>0</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Data Tables block for Statistics */}
                            <div className="grid grid-cols-1 gap-4">
                                {/* Table: Theo kỳ */}
                                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                    <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2 text-sm font-semibold text-slate-700 bg-slate-50">
                                        <List size={16} className="text-blue-500" />
                                        Theo kỳ
                                    </div>
                                    <table className="w-full text-xs text-left text-slate-600">
                                        <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500">
                                            <tr>
                                                <th className="px-4 py-2.5 font-semibold">Kỳ</th>
                                                <th className="px-4 py-2.5 font-semibold text-right">Tổng số bản ghi</th>
                                                <th className="px-4 py-2.5 font-semibold text-right text-emerald-600">Đạt</th>
                                                <th className="px-4 py-2.5 font-semibold text-right text-rose-600">Không đạt</th>
                                                <th className="px-4 py-2.5 font-semibold text-right">Điểm trung bình</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-2.5 font-medium text-slate-700">2025-02</td>
                                                <td className="px-4 py-2.5 text-right font-medium">2</td>
                                                <td className="px-4 py-2.5 text-right font-medium text-emerald-600">1</td>
                                                <td className="px-4 py-2.5 text-right font-medium text-rose-600">1</td>
                                                <td className="px-4 py-2.5 text-right font-semibold text-blue-600">86.6</td>
                                            </tr>
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-2.5 font-medium text-slate-700">2025-01</td>
                                                <td className="px-4 py-2.5 text-right font-medium">9</td>
                                                <td className="px-4 py-2.5 text-right font-medium text-emerald-600">8</td>
                                                <td className="px-4 py-2.5 text-right font-medium text-rose-600">1</td>
                                                <td className="px-4 py-2.5 text-right font-semibold text-blue-600">88.6</td>
                                            </tr>
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-2.5 font-medium text-slate-700">2024-12</td>
                                                <td className="px-4 py-2.5 text-right font-medium">1</td>
                                                <td className="px-4 py-2.5 text-right font-medium text-emerald-600">0</td>
                                                <td className="px-4 py-2.5 text-right font-medium text-rose-600">1</td>
                                                <td className="px-4 py-2.5 text-right font-semibold text-blue-600">83.5</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                {/* Table: Theo phòng ban */}
                                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                    <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2 text-sm font-semibold text-slate-700 bg-slate-50">
                                        <List size={16} className="text-blue-500" />
                                        Theo phòng ban
                                    </div>
                                    <table className="w-full text-xs text-left text-slate-600">
                                        <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500">
                                            <tr>
                                                <th className="px-4 py-2.5 font-medium">Phòng ban</th>
                                                <th className="px-4 py-2.5 font-medium text-right">Tổng số bản ghi</th>
                                                <th className="px-4 py-2.5 font-medium text-right text-emerald-600">Đạt</th>
                                                <th className="px-4 py-2.5 font-medium text-right text-rose-600">Không đạt</th>
                                                <th className="px-4 py-2.5 font-medium text-right">Điểm trung bình</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-2.5 font-medium text-slate-700">Phòng Hành chính</td><td className="px-4 py-2.5 text-right font-medium">6</td><td className="px-4 py-2.5 text-right font-medium text-emerald-600">4</td><td className="px-4 py-2.5 text-right font-medium text-rose-600">2</td><td className="px-4 py-2.5 text-right font-semibold text-blue-600">86.8</td>
                                            </tr>
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-2.5 font-medium text-slate-700">Phòng Kỹ thuật</td><td className="px-4 py-2.5 text-right font-medium">1</td><td className="px-4 py-2.5 text-right font-medium text-emerald-600">1</td><td className="px-4 py-2.5 text-right font-medium text-rose-600">0</td><td className="px-4 py-2.5 text-right font-semibold text-blue-600">88.0</td>
                                            </tr>
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-2.5 font-medium text-slate-700">Nhóm Phát triển phần mềm</td><td className="px-4 py-2.5 text-right font-medium">1</td><td className="px-4 py-2.5 text-right font-medium text-emerald-600">1</td><td className="px-4 py-2.5 text-right font-medium text-rose-600">0</td><td className="px-4 py-2.5 text-right font-semibold text-blue-600">92.2</td>
                                            </tr>
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-2.5 font-medium text-slate-700">Phòng Nhân sự</td><td className="px-4 py-2.5 text-right font-medium">1</td><td className="px-4 py-2.5 text-right font-medium text-emerald-600">1</td><td className="px-4 py-2.5 text-right font-medium text-rose-600">0</td><td className="px-4 py-2.5 text-right font-semibold text-blue-600">87.5</td>
                                            </tr>
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-2.5 font-medium text-slate-700">Phòng Tài chính - Kế toán</td><td className="px-4 py-2.5 text-right font-medium">1</td><td className="px-4 py-2.5 text-right font-medium text-emerald-600">1</td><td className="px-4 py-2.5 text-right font-medium text-rose-600">0</td><td className="px-4 py-2.5 text-right font-semibold text-blue-600">99.0</td>
                                            </tr>
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-2.5 font-medium text-slate-700">Phòng Kinh doanh</td><td className="px-4 py-2.5 text-right font-medium">1</td><td className="px-4 py-2.5 text-right font-medium text-emerald-600">0</td><td className="px-4 py-2.5 text-right font-medium text-rose-600">1</td><td className="px-4 py-2.5 text-right font-semibold text-blue-600">76.0</td>
                                            </tr>
                                            <tr className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-2.5 font-medium text-slate-700">Nhóm Văn phòng</td><td className="px-4 py-2.5 text-right font-medium">1</td><td className="px-4 py-2.5 text-right font-medium text-emerald-600">1</td><td className="px-4 py-2.5 text-right font-medium text-rose-600">0</td><td className="px-4 py-2.5 text-right font-semibold text-blue-600">90.2</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-sm text-left whitespace-nowrap">
                                <thead className="text-[13px] text-slate-600 font-semibold bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-5 py-3 w-12 font-medium">
                                            <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} className="rounded border-slate-300 bg-white w-4 h-4 cursor-pointer text-blue-600 focus:ring-blue-500/50 focus:ring-offset-0" />
                                        </th>

                                        {activeTab === 'managed' && (
                                            <th className="px-5 py-3 font-semibold">Nhân viên</th>
                                        )}

                                        <th className="px-5 py-3 font-semibold">Kỳ</th>
                                        <th className="px-5 py-3 font-semibold">Phòng ban</th>
                                        <th className="px-5 py-3 font-semibold">Chức vụ</th>
                                        <th className="px-5 py-3 font-semibold text-center">Điểm KPI</th>
                                        <th className="px-5 py-3 font-semibold text-center">Tổng KPI</th>
                                        <th className="px-5 py-3 font-semibold text-center">Đánh giá</th>
                                        <th className="px-5 py-3 font-semibold text-right w-24">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-600">
                                    {(activeTab === 'managed' ? mockManaged : mockMyKPIs).map((row) => (
                                        <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-5 py-4">
                                                <input type="checkbox" checked={isSelected(row.id)} onChange={() => toggleSelect(row.id)} className="rounded border-slate-300 bg-white w-4 h-4 cursor-pointer text-blue-600 focus:ring-blue-500/50 focus:ring-offset-0" />
                                            </td>

                                            {activeTab === 'managed' && 'name' in row && (
                                                <td className="px-5 py-4">
                                                    <div className="font-semibold text-slate-800">{(row as any).name}</div>
                                                    <div className="text-xs text-slate-500 mt-0.5">{(row as any).code}</div>
                                                </td>
                                            )}

                                            <td className="px-5 py-4 text-slate-700 font-medium">{row.period}</td>
                                            <td className="px-5 py-4">{row.department}</td>
                                            <td className="px-5 py-4">{row.position}</td>

                                            <td className="px-5 py-4 text-center font-medium text-slate-700">{row.kpiScore.toFixed(1)}</td>
                                            <td className="px-5 py-4 text-center font-bold text-blue-600">{row.totalKpi.toFixed(1)}</td>

                                            <td className="px-5 py-4 text-center">
                                                <div className="flex justify-center">
                                                    {renderEvaluation(row.evaluation)}
                                                </div>
                                            </td>

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
                    )}

                    {/* Pagination */}
                    {activeTab !== 'statistics' && (
                        <div className="px-5 py-3 flex items-center justify-between text-sm text-slate-600 border-t border-slate-200 bg-slate-50">
                            <div className="flex items-center gap-3">
                                <span className="font-medium">
                                    {activeTab === 'managed' ? mockManaged.length : mockMyKPIs.length} bản ghi
                                </span>
                                <span className="text-slate-400">·</span>
                                <span>1—{activeTab === 'managed' ? mockManaged.length : mockMyKPIs.length}</span>
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
                    )}
                </div>
            </div>
        </div>
    );
}
