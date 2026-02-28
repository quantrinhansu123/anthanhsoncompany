import React, { useState } from 'react';
import {
    Clock,
    Search,
    X,
    Filter,
    Download,
    User,
    CalendarDays,
    ArrowLeft,
    Calendar,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Building2,
    MapPin,
    AlertCircle,
    FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';

const mockRealtimeData = [
    {
        id: 1,
        employee: 'Nguyễn Đắc Công',
        department: 'Phòng Hành chính',
        branch: 'Chi nhánh TP. Hồ Chí Minh',
        checkIn: '--',
        status: 'Chưa check-in'
    }
];

const mockTimesheetData = [
    { id: 1, employee: 'Lê Minh Công', department: 'Phòng Hành chính', branch: 'Chi nhánh TP. Hồ Chí Minh', days: 20, hours: 181.2, late: 20 },
    { id: 2, employee: 'Nguyễn Văn Thành', department: 'Phòng Hành chính', branch: 'Chi nhánh TP. Hồ Chí Minh', days: 20, hours: 182.1, late: 20 },
    { id: 3, employee: 'Trần Thị Mai', department: 'Phòng Hành chính', branch: 'Chi nhánh TP. Hồ Chí Minh', days: 20, hours: 184.8, late: 20 },
    { id: 4, employee: 'Lê Hoàng Nam', department: 'Phòng Kỹ thuật', branch: 'Chi nhánh TP. Hồ Chí Minh', days: 20, hours: 183.5, late: 20 },
    { id: 5, employee: 'Phạm Minh Tuấn', department: 'Nhóm Phát triển phần mềm', branch: 'Chi nhánh TP. Hồ Chí Minh', days: 20, hours: 186.5, late: 20 },
    { id: 6, employee: 'Vũ Thị Hương', department: 'Nhóm Phát triển phần mềm', branch: 'Chi nhánh TP. Hồ Chí Minh', days: 20, hours: 187.2, late: 20 },
    { id: 7, employee: 'Đặng Quốc Bảo', department: 'Nhóm Hạ tầng IT', branch: 'Chi nhánh TP. Hồ Chí Minh', days: 20, hours: 184.8, late: 20 },
    { id: 8, employee: 'Ngô Thanh Tùng', department: 'Nhóm Hạ tầng IT', branch: 'Chi nhánh TP. Hồ Chí Minh', days: 20, hours: 188.5, late: 20 },
    { id: 9, employee: 'Bùi Thị Lan', department: 'Phòng Nhân sự', branch: 'Chi nhánh Hà Nội', days: 20, hours: 182.2, late: 20 },
    { id: 10, employee: 'Hoàng Văn Đức', department: 'Phòng Nhân sự', branch: 'Chi nhánh Hà Nội', days: 20, hours: 187, late: 20 },
    { id: 11, employee: 'Trịnh Thị Ngọc', department: 'Phòng Tài chính - Kế toán', branch: 'Chi nhánh Hà Nội', days: 20, hours: 189.8, late: 20 },
    { id: 12, employee: 'Lý Văn Phú', department: 'Phòng Tài chính - Kế toán', branch: '--', days: 20, hours: 183.5, late: 20 },
    { id: 13, employee: 'Đinh Công Vinh', department: 'Phòng Kinh doanh', branch: '--', days: 20, hours: 172.2, late: 20 },
    { id: 14, employee: 'Phan Thị Hạnh', department: 'Phòng Kinh doanh', branch: '--', days: 20, hours: 182.4, late: 20 },
    { id: 15, employee: 'Vũ Đình Khoa', department: 'Phòng Kinh doanh', branch: '--', days: 20, hours: 185.6, late: 20 },
    { id: 16, employee: 'Cao Văn Long', department: 'Phòng Kho vận', branch: '--', days: 20, hours: 173.2, late: 20 },
    { id: 17, employee: 'Đỗ Thị Hằng', department: 'Phòng Kho vận', branch: '--', days: 20, hours: 177.2, late: 20 },
    { id: 18, employee: 'Nguyễn Thùy Linh', department: 'Phòng Marketing', branch: '--', days: 20, hours: 188.5, late: 20 },
    { id: 19, employee: 'Trần Quang Huy', department: 'Phòng Marketing', branch: '--', days: 20, hours: 175.3, late: 20 },
    { id: 20, employee: 'Lê Anh Dũng', department: 'Phòng Kỹ thuật', branch: '--', days: 20, hours: 178.8, late: 20 },
];

export function TimekeepingSummary() {
    const [activeTab, setActiveTab] = useState('realtime');

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Tabs */}
                <div className="flex items-center gap-6 px-4 md:px-6 border-b border-slate-200 overflow-x-auto bg-slate-50/50">
                    <button
                        className={`py-3 md:py-4 text-xs md:text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'realtime'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        onClick={() => setActiveTab('realtime')}
                    >
                        <Clock size={16} />
                        Theo dõi thời gian thực
                    </button>
                    <button
                        className={`py-3 md:py-4 text-xs md:text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'timesheet'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        onClick={() => setActiveTab('timesheet')}
                    >
                        <FileText size={16} />
                        Bảng công
                    </button>
                </div>

                {/* Content */}
                <div className="bg-white flex flex-col animate-in fade-in">
                    {/* Toolbar Top Row */}
                    <div className="px-4 py-3 border-b border-slate-200 flex flex-col md:flex-row items-center gap-3 justify-between bg-white">
                        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                            <Link to="/hanh-chinh" className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors bg-white">
                                <ArrowLeft size={16} /> Quay lại
                            </Link>
                            <div className="relative flex-1 md:w-80 min-w-[250px]">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm theo nhân viên hoặc phòng ban..."
                                    className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-white"
                                />
                            </div>
                            {activeTab === 'timesheet' && (
                                <button className="flex items-center gap-1.5 px-3 py-1.5 text-red-500 border border-red-100 bg-red-50 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors whitespace-nowrap">
                                    <X size={14} strokeWidth={3} /> Xóa bộ lọc
                                </button>
                            )}
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                            {activeTab === 'realtime' && (
                                <button className="p-1.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors bg-white shadow-sm">
                                    <Filter size={18} />
                                </button>
                            )}
                            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors bg-white whitespace-nowrap shadow-sm">
                                <Download size={16} /> Xuất Excel
                            </button>
                        </div>
                    </div>

                    {/* Filters Row */}
                    <div className="px-4 py-3 flex flex-wrap items-center gap-3 bg-slate-50/80 border-b border-slate-200">
                        {activeTab === 'realtime' && (
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-1 text-slate-600 h-8">
                                <AlertCircle size={14} className="text-slate-400" />
                                <select className="text-sm bg-transparent outline-none cursor-pointer pr-2 w-28">
                                    <option>Trạng thái</option>
                                    <option>Chưa check-in</option>
                                    <option>Đã check-in</option>
                                </select>
                            </div>
                        )}
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-1 text-slate-600 h-8">
                            <Building2 size={14} className="text-slate-400" />
                            <select className="text-sm bg-transparent outline-none cursor-pointer pr-2 w-32">
                                <option>Phòng ban</option>
                                <option>Phòng Hành chính</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-1 text-slate-600 h-8">
                            <MapPin size={14} className="text-slate-400" />
                            <select className="text-sm bg-transparent outline-none cursor-pointer pr-2 w-32">
                                <option>Chi nhánh</option>
                                <option>Chi nhánh TP. HCM</option>
                            </select>
                        </div>

                        {activeTab === 'timesheet' && (
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-1 font-medium hover:bg-slate-50 cursor-pointer h-8 transition-colors select-none text-slate-600">
                                <CalendarDays size={14} className="text-slate-500" />
                                <span className="text-sm">February 2026</span>
                                <Calendar size={14} className="text-slate-400 ml-1" />
                            </div>
                        )}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="text-[13px] text-slate-600 font-medium bg-slate-50/80 border-b border-slate-200">
                                {activeTab === 'realtime' ? (
                                    <tr>
                                        <th className="px-5 py-3.5 w-12 font-medium"><input type="checkbox" className="rounded border-slate-300 w-4 h-4 cursor-pointer text-blue-600 focus:ring-blue-500" /></th>
                                        <th className="px-5 py-3.5 font-medium">Nhân viên</th>
                                        <th className="px-5 py-3.5 font-medium">Phòng ban</th>
                                        <th className="px-5 py-3.5 font-medium">Chi nhánh</th>
                                        <th className="px-5 py-3.5 font-medium">Giờ check-in</th>
                                        <th className="px-5 py-3.5 font-medium">Trạng thái</th>
                                        <th className="px-5 py-3.5 font-medium text-right">Thao tác</th>
                                    </tr>
                                ) : (
                                    <tr>
                                        <th className="px-5 py-3.5 w-12 font-medium"><input type="checkbox" className="rounded border-slate-300 w-4 h-4 cursor-pointer text-blue-600 focus:ring-blue-500" /></th>
                                        <th className="px-5 py-3.5 font-medium">Nhân viên</th>
                                        <th className="px-5 py-3.5 font-medium">Phòng ban</th>
                                        <th className="px-5 py-3.5 font-medium">Chi nhánh</th>
                                        <th className="px-5 py-3.5 font-medium">Ngày công</th>
                                        <th className="px-5 py-3.5 font-medium">Giờ làm</th>
                                        <th className="px-5 py-3.5 font-medium">Đi muộn</th>
                                        <th className="px-5 py-3.5 font-medium text-right">Thao tác</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {activeTab === 'realtime' ? (
                                    mockRealtimeData.map((row) => (
                                        <tr key={row.id} className="hover:bg-blue-50/30 transition-colors bg-white group cursor-default">
                                            <td className="px-5 py-3.5"><input type="checkbox" className="rounded border-slate-300 w-4 h-4 cursor-pointer text-blue-600 focus:ring-blue-500" /></td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                                                        {row.employee.split(' ').map(n => n[0]).join('').slice(-2)}
                                                    </div>
                                                    <span className="text-slate-800 font-medium">{row.employee}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5 text-slate-600">{row.department}</td>
                                            <td className="px-5 py-3.5 text-slate-600">{row.branch}</td>
                                            <td className="px-5 py-3.5 text-slate-600">{row.checkIn}</td>
                                            <td className="px-5 py-3.5 text-slate-500">{row.status}</td>
                                            <td className="px-5 py-3.5"></td>
                                        </tr>
                                    ))
                                ) : (
                                    mockTimesheetData.map((row) => (
                                        <tr key={row.id} className="hover:bg-blue-50/30 transition-colors bg-white group cursor-default">
                                            <td className="px-5 py-3.5"><input type="checkbox" className="rounded border-slate-300 w-4 h-4 cursor-pointer text-blue-600 focus:ring-blue-500" /></td>
                                            <td className="px-5 py-3.5 font-medium text-slate-800">{row.employee}</td>
                                            <td className="px-5 py-3.5 text-slate-600">{row.department}</td>
                                            <td className="px-5 py-3.5 text-slate-600">{row.branch}</td>
                                            <td className="px-5 py-3.5 text-slate-600">{row.days}</td>
                                            <td className="px-5 py-3.5 text-slate-600">{row.hours}</td>
                                            <td className="px-5 py-3.5 text-slate-600">{row.late}</td>
                                            <td className="px-5 py-3.5"></td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-5 py-3 flex items-center justify-between text-sm text-slate-600 border-t border-slate-200 bg-white">
                        <div className="flex items-center gap-3">
                            <span className="font-medium text-slate-700">
                                {activeTab === 'realtime' ? mockRealtimeData.length : mockTimesheetData.length} bản ghi
                            </span>
                            <span className="text-slate-400">
                                1-{activeTab === 'realtime' ? mockRealtimeData.length : Math.min(20, mockTimesheetData.length)}
                            </span>
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
                            {activeTab === 'timesheet' && (
                                <button className="w-7 h-7 hover:bg-slate-100 rounded flex items-center justify-center transition-colors outline-none focus:ring-2 focus:ring-slate-100">2</button>
                            )}

                            <button className={`p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors outline-none focus:ring-2 focus:ring-slate-100 ${activeTab === 'realtime' ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={activeTab === 'realtime'}><ChevronRight size={16} /></button>
                            <button className={`p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors outline-none focus:ring-2 focus:ring-slate-100 ${activeTab === 'realtime' ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={activeTab === 'realtime'}><ChevronsRight size={16} /></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
