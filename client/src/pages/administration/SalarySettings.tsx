import React, { useState } from 'react';
import {
    ArrowLeft,
    Search,
    Plus,
    Edit,
    Trash2,
    Calendar as CalendarIcon,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Network,
    FileText,
    Settings,
    Upload,
    Download,
    List
} from 'lucide-react';

const mockIPSettings = [
    { id: 1, branch: 'Chi nhánh TP. Hồ Chí Minh', code: 'branch-1', ip: '192.168.10.10', note: 'Văn phòng tầng 3', status: 'Hoạt động' },
    { id: 2, branch: 'Chi nhánh TP. Hồ Chí Minh', code: 'branch-1', ip: '192.168.10.11', note: 'Khu sản xuất', status: 'Hoạt động' },
    { id: 3, branch: 'Chi nhánh Hà Nội', code: 'branch-2', ip: '10.10.0.20', note: 'Tầng 2 - phòng Nhân sự', status: 'Hoạt động' },
    { id: 4, branch: 'Chi nhánh Hà Nội', code: 'branch-2', ip: '10.10.0.21', note: 'Sảnh tiếp tân', status: 'Ngừng' },
    { id: 5, branch: 'Chi nhánh Đà Nẵng', code: 'branch-3', ip: '172.16.5.5', note: 'Văn phòng chính', status: 'Hoạt động' },
];

const mockAdminTickets = [
    { id: 1, type: 'Đi muộn / về sớm', quota: 3, note: 'Áp dụng cho toàn công ty', status: 'Hoạt động' },
    { id: 2, type: 'Công tác', quota: 6, note: 'Giới hạn theo cấp bậc', status: 'Hoạt động' },
    { id: 3, type: 'Quên chấm công', quota: 2, note: 'Dùng cho trường hợp quên chấm công', status: 'Hoạt động' },
    { id: 4, type: 'Tăng ca', quota: 10, note: 'Không giới hạn theo bộ phận', status: 'Hoạt động' },
    { id: 5, type: 'Xin nghỉ không lương', quota: 2, note: 'Không lương', status: 'Hoạt động' },
    { id: 6, type: 'Xin nghỉ phép', quota: 12, note: 'Nghỉ phép năm', status: 'Hoạt động' },
];

const mockBonusPenaltyGroups = [
    { id: 1, code: 'VUOT_KPI', name: 'Hoàn thành vượt KPI', type: 'Cộng', order: 1, note: 'Đạt trên 100% chỉ tiêu', status: 'Hoạt động' },
    { id: 2, code: 'SANG_KIEN', name: 'Sáng kiến cải tiến', type: 'Cộng', order: 2, note: 'Đề xuất được áp dụng', status: 'Hoạt động' },
    { id: 3, code: 'HO_TRO_DONG_NGHIEP', name: 'Hỗ trợ đồng nghiệp', type: 'Cộng', order: 3, note: '—', status: 'Hoạt động' },
    { id: 4, code: 'DAO_TAO_NOI_BO', name: 'Đào tạo nội bộ', type: 'Cộng', order: 4, note: '—', status: 'Hoạt động' },
    { id: 5, code: 'CHUYEN_CAN', name: 'Chuyên cần (không đi trễ/về sớm)', type: 'Cộng', order: 5, note: '—', status: 'Hoạt động' },
    { id: 6, code: 'TANG_CA_TU_NGUYEN', name: 'Tự nguyện tăng ca', type: 'Cộng', order: 6, note: '—', status: 'Hoạt động' },
    { id: 7, code: 'DAT_GIAI_THI_DUA', name: 'Đạt giải thi đua', type: 'Cộng', order: 7, note: '—', status: 'Hoạt động' },
    { id: 8, code: 'DI_MUON', name: 'Đi muộn', type: 'Trừ', order: 10, note: '—', status: 'Hoạt động' },
    { id: 9, code: 'VE_SOM', name: 'Về sớm', type: 'Trừ', order: 11, note: '—', status: 'Hoạt động' },
    { id: 10, code: 'VI_PHAM_NOI_QUY', name: 'Vi phạm nội quy', type: 'Trừ', order: 12, note: '—', status: 'Hoạt động' },
    { id: 11, code: 'SAI_SOT_CONG_VIEC', name: 'Sai sót công việc', type: 'Trừ', order: 13, note: '—', status: 'Hoạt động' },
    { id: 12, code: 'KHONG_HOAN_THANH_KPI', name: 'Không hoàn thành KPI', type: 'Trừ', order: 14, note: '—', status: 'Hoạt động' },
    { id: 13, code: 'NGHI_KHONG_PHEP', name: 'Nghỉ không phép', type: 'Trừ', order: 15, note: '—', status: 'Hoạt động' },
    { id: 14, code: 'QUEN_CHAM_CONG', name: 'Quên chấm công', type: 'Trừ', order: 16, note: '—', status: 'Hoạt động' },
];

export function SalarySettings() {
    const [activeTab, setActiveTab] = useState('ip-settings'); // 'ip-settings', 'admin-tickets', 'bonus-penalty'
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const isSelected = (id: number) => selectedIds.includes(id);

    const getCurrentData = () => {
        switch (activeTab) {
            case 'ip-settings': return mockIPSettings;
            case 'admin-tickets': return mockAdminTickets;
            case 'bonus-penalty': return mockBonusPenaltyGroups;
            default: return [];
        }
    };

    const isAllSelected = getCurrentData().length > 0 && getCurrentData().every(row => selectedIds.includes(row.id));

    const toggleSelectAll = () => {
        const data = getCurrentData();
        if (isAllSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(data.map(row => row.id));
        }
    };

    const renderTypeBadge = (type: string) => {
        if (type === 'Cộng') {
            return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">Cộng</span>;
        }
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-rose-50 text-rose-600 border border-rose-200">Trừ</span>;
    };

    const renderStatusBadge = (status: string) => {
        if (status === 'Hoạt động') {
            return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-600 border border-blue-200">Hoạt động</span>;
        }
        return <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-50 text-slate-600 border border-slate-200">Ngừng</span>;
    };

    const getSearchPlaceholder = () => {
        switch (activeTab) {
            case 'ip-settings':
                return "Tìm theo chi nhánh hoặc IP...";
            case 'admin-tickets':
                return "Tìm theo loại phiếu hoặc ghi chú...";
            case 'bonus-penalty':
                return "Tìm theo mã, tên hoặc loại...";
            default:
                return "Tìm kiếm...";
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden text-slate-700">
                {/* Tabs */}
                <div className="flex items-center gap-6 px-4 md:px-6 border-b border-slate-200 bg-slate-50/50 overflow-x-auto">
                    <button
                        className={`py-3 md:py-4 text-xs md:text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'ip-settings'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        onClick={() => setActiveTab('ip-settings')}
                    >
                        <Network size={16} />
                        Thiết lập IP
                    </button>
                    <button
                        className={`py-3 md:py-4 text-xs md:text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'admin-tickets'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        onClick={() => setActiveTab('admin-tickets')}
                    >
                        <FileText size={16} />
                        Nhóm phiếu hành chính
                    </button>
                    <button
                        className={`py-3 md:py-4 text-xs md:text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'bonus-penalty'
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                            }`}
                        onClick={() => setActiveTab('bonus-penalty')}
                    >
                        <Settings size={16} />
                        Nhóm điểm cộng trừ
                    </button>
                </div>

                {/* Content Wrapper */}
                <div className="flex flex-col bg-white min-h-[500px]">
                    {/* Top Toolbar */}
                    <div className="px-4 py-4 border-b border-slate-200 flex flex-col md:flex-row items-center gap-3 justify-between bg-white">
                        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
                            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
                                <ArrowLeft size={16} /> Quay lại
                            </button>

                            <div className="relative flex-1 md:w-80 max-w-md">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder={getSearchPlaceholder()}
                                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-sm"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                            {activeTab === 'ip-settings' && (
                                <>
                                    <button className="p-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm bg-white">
                                        <Upload size={18} />
                                    </button>
                                    <button className="p-1.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors shadow-sm bg-white">
                                        <Download size={18} />
                                    </button>
                                </>
                            )}
                            <button className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap shadow-sm">
                                <Plus size={16} /> Thêm mới
                            </button>
                        </div>
                    </div>

                    {/* Filters Row */}
                    <div className="px-4 py-3 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50/50">
                        {activeTab === 'ip-settings' && (
                            <>
                                <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-md px-3 py-1 text-slate-600 h-8 shadow-sm">
                                    <FileText size={14} className="text-slate-400" />
                                    <select className="text-sm bg-transparent outline-none cursor-pointer pr-2 w-28 text-slate-700">
                                        <option>Trạng thái</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-md px-3 py-1 text-slate-600 h-8 shadow-sm">
                                    <Network size={14} className="text-slate-400" />
                                    <select className="text-sm bg-transparent outline-none cursor-pointer pr-2 w-32 text-slate-700">
                                        <option>Chi nhánh</option>
                                    </select>
                                </div>
                            </>
                        )}

                        {activeTab === 'admin-tickets' && (
                            <>
                                <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-md px-3 py-1 text-slate-600 h-8 shadow-sm">
                                    <FileText size={14} className="text-slate-400" />
                                    <select className="text-sm bg-transparent outline-none cursor-pointer pr-2 w-28 text-slate-700">
                                        <option>Trạng thái</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-md px-3 py-1 text-slate-600 h-8 shadow-sm">
                                    <List size={14} className="text-slate-400" />
                                    <select className="text-sm bg-transparent outline-none cursor-pointer pr-2 w-32 text-slate-700">
                                        <option>Loại phiếu</option>
                                    </select>
                                </div>
                            </>
                        )}

                        {activeTab === 'bonus-penalty' && (
                            <>
                                <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-md px-3 py-1 text-slate-600 h-8 shadow-sm">
                                    <FileText size={14} className="text-slate-400" />
                                    <select className="text-sm bg-transparent outline-none cursor-pointer pr-2 w-28 text-slate-700">
                                        <option>Trạng thái</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 bg-white border border-slate-300 rounded-md px-3 py-1 text-slate-600 h-8 shadow-sm">
                                    <List size={14} className="text-slate-400" />
                                    <select className="text-sm bg-transparent outline-none cursor-pointer pr-2 w-24 text-slate-700">
                                        <option>Loại</option>
                                    </select>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto flex-1">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="text-[13px] text-slate-600 font-semibold bg-slate-50/80 border-b border-slate-200">
                                <tr>
                                    <th className="px-5 py-3 w-12 font-medium">
                                        <input type="checkbox" checked={isAllSelected} onChange={toggleSelectAll} className="rounded border-slate-300 bg-white w-4 h-4 cursor-pointer text-blue-600 focus:ring-blue-500/50" />
                                    </th>

                                    {activeTab === 'ip-settings' && (
                                        <>
                                            <th className="px-5 py-3 font-medium">Chi nhánh</th>
                                            <th className="px-5 py-3 font-medium">IP wifi</th>
                                            <th className="px-5 py-3 font-medium">Ghi chú</th>
                                            <th className="px-5 py-3 font-medium text-center">Trạng thái</th>
                                            <th className="px-5 py-3 font-medium text-right w-24">Thao tác</th>
                                        </>
                                    )}

                                    {activeTab === 'admin-tickets' && (
                                        <>
                                            <th className="px-5 py-3 font-medium">Loại phiếu</th>
                                            <th className="px-5 py-3 font-medium">Số lượng/tháng</th>
                                            <th className="px-5 py-3 font-medium">Ghi chú</th>
                                            <th className="px-5 py-3 font-medium text-center">Trạng thái</th>
                                            <th className="px-5 py-3 font-medium text-right w-24">Thao tác</th>
                                        </>
                                    )}

                                    {activeTab === 'bonus-penalty' && (
                                        <>
                                            <th className="px-5 py-3 font-medium">Mã</th>
                                            <th className="px-5 py-3 font-medium">Tên hạng mục</th>
                                            <th className="px-5 py-3 font-medium text-center">Loại</th>
                                            <th className="px-5 py-3 font-medium text-center">Thứ tự</th>
                                            <th className="px-5 py-3 font-medium">Ghi chú</th>
                                            <th className="px-5 py-3 font-medium text-center">Trạng thái</th>
                                            <th className="px-5 py-3 font-medium text-right w-24">Thao tác</th>
                                        </>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-600">
                                {activeTab === 'ip-settings' && mockIPSettings.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-5 py-4">
                                            <input type="checkbox" checked={isSelected(row.id)} onChange={() => toggleSelect(row.id)} className="rounded border-slate-300 bg-white w-4 h-4 cursor-pointer text-blue-600 focus:ring-blue-500/50" />
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="font-semibold text-slate-800">{row.branch}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">{row.code}</div>
                                        </td>
                                        <td className="px-5 py-4"><span className="flex items-center gap-1.5"><Network size={14} className="text-blue-500" /> <span className="font-medium text-slate-700">{row.ip}</span></span></td>
                                        <td className="px-5 py-4 text-slate-500 truncate max-w-[200px]">{row.note}</td>
                                        <td className="px-5 py-4 text-center">{renderStatusBadge(row.status)}</td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-3 transition-opacity">
                                                <button className="text-blue-500 hover:text-blue-600">
                                                    <Edit size={16} />
                                                </button>
                                                <button className="text-rose-500 hover:text-rose-600">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {activeTab === 'admin-tickets' && mockAdminTickets.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-5 py-4">
                                            <input type="checkbox" checked={isSelected(row.id)} onChange={() => toggleSelect(row.id)} className="rounded border-slate-300 bg-white w-4 h-4 cursor-pointer text-blue-600 focus:ring-blue-500/50" />
                                        </td>
                                        <td className="px-5 py-4 font-semibold text-slate-800 flex items-center gap-2">
                                            <FileText size={16} className="text-blue-500" />
                                            {row.type}
                                        </td>
                                        <td className="px-5 py-4 font-bold text-slate-800">{row.quota}</td>
                                        <td className="px-5 py-4 text-slate-500 truncate max-w-[300px]">{row.note}</td>
                                        <td className="px-5 py-4 text-center">{renderStatusBadge(row.status)}</td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-3 transition-opacity">
                                                <button className="text-blue-500 hover:text-blue-600">
                                                    <Edit size={16} />
                                                </button>
                                                <button className="text-rose-500 hover:text-rose-600">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {activeTab === 'bonus-penalty' && mockBonusPenaltyGroups.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-5 py-3.5">
                                            <input type="checkbox" checked={isSelected(row.id)} onChange={() => toggleSelect(row.id)} className="rounded border-slate-300 bg-white w-4 h-4 cursor-pointer text-blue-600 focus:ring-blue-500/50" />
                                        </td>
                                        <td className="px-5 py-3.5 font-bold text-slate-700 uppercase">{row.code}</td>
                                        <td className="px-5 py-3.5 font-medium text-slate-800">{row.name}</td>
                                        <td className="px-5 py-3.5 text-center">
                                            <div className="flex justify-center">{renderTypeBadge(row.type)}</div>
                                        </td>
                                        <td className="px-5 py-3.5 text-center font-semibold text-slate-700">{row.order}</td>
                                        <td className="px-5 py-3.5 text-slate-500">{row.note}</td>
                                        <td className="px-5 py-3.5 text-center">{renderStatusBadge(row.status)}</td>
                                        <td className="px-5 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-3 transition-opacity">
                                                <button className="text-blue-500 hover:text-blue-600">
                                                    <Edit size={16} />
                                                </button>
                                                <button className="text-rose-500 hover:text-rose-600">
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
                                {activeTab === 'ip-settings' ? mockIPSettings.length : activeTab === 'admin-tickets' ? mockAdminTickets.length : mockBonusPenaltyGroups.length} bản ghi
                            </span>
                            <span className="text-slate-400">·</span>
                            <span>1—{activeTab === 'ip-settings' ? mockIPSettings.length : activeTab === 'admin-tickets' ? mockAdminTickets.length : mockBonusPenaltyGroups.length}</span>
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
