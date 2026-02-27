import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Search, 
  Filter, 
  Plus, 
  LayoutGrid, 
  List, 
  ExternalLink, 
  Edit, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Settings2,
  RotateCcw,
  CheckSquare,
  Square
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface RecruitmentProposal {
  id: string;
  code: string;
  title: string;
  description: string;
  quantity: number;
  hired: number;
  resigned: number;
  remaining: number;
  link: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

const mockData: RecruitmentProposal[] = [
  {
    id: '1',
    code: 'DX-2025-001',
    title: 'Tuyển Lập trình viên Senior',
    description: 'Tham gia phát triển sản phẩm core,...',
    quantity: 2,
    hired: 0,
    resigned: 0,
    remaining: 2,
    link: 'https://example.com',
    status: 'rejected',
    createdAt: '01/12/2024'
  },
  {
    id: '2',
    code: 'DX-2025-002',
    title: 'Tuyển Chuyên viên Tuyển dụng',
    description: 'Phụ trách tuyển dụng cho các vị trí kỹ thu...',
    quantity: 1,
    hired: 1,
    resigned: 0,
    remaining: 0,
    link: 'https://example.com',
    status: 'approved',
    createdAt: '05/12/2024'
  },
  {
    id: '3',
    code: 'DX-2025-003',
    title: '---',
    description: 'Lead team phát triển phần mềm, quản lý...',
    quantity: 1,
    hired: 0,
    resigned: 0,
    remaining: 1,
    link: 'https://example.com',
    status: 'pending',
    createdAt: '10/12/2024'
  },
  {
    id: '4',
    code: 'DX-2025-004',
    title: 'Tuyển Lập trình viên Frontend',
    description: 'Phát triển giao diện người dùng, tối ưu tr...',
    quantity: 3,
    hired: 0,
    resigned: 0,
    remaining: 3,
    link: 'https://example.com',
    status: 'rejected',
    createdAt: '01/12/2024'
  },
  {
    id: '5',
    code: 'DX-2025-005',
    title: 'Tuyển Nhân viên Kinh doanh B2B',
    description: 'Chăm sóc khách hàng doanh nghiệp, mở...',
    quantity: 2,
    hired: 0,
    resigned: 0,
    remaining: 2,
    link: 'https://example.com',
    status: 'pending',
    createdAt: '16:30 - 15/01/2025'
  }
];

export function RecruitmentList() {
  const navigate = useNavigate();
  const [showColumnConfig, setShowColumnConfig] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-600 rounded-md">Đã duyệt</span>;
      case 'rejected':
        return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-600 rounded-md">Từ chối</span>;
      case 'pending':
        return <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-600 rounded-md">Chờ duyệt</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
        <Link to="/" className="hover:text-blue-600">Trang chủ</Link>
        <span>/</span>
        <Link to="/nhan-su" className="hover:text-blue-600">Nhân sự</Link>
        <span>/</span>
        <span className="font-semibold text-slate-800 bg-orange-500 text-white px-2 py-0.5 rounded text-xs">Đề xuất tuyển dụng</span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        <button className="px-4 py-2 text-sm font-medium text-orange-600 border-b-2 border-orange-600 flex items-center gap-2 bg-orange-50/50">
          <List size={16} />
          Danh sách
        </button>
        <button className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 flex items-center gap-2">
          <LayoutGrid size={16} />
          Thống kê
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-md border border-slate-200 transition-colors bg-white whitespace-nowrap"
          >
            <ArrowLeft size={16} />
            Quay lại
          </button>
          
          <div className="relative w-full md:w-80">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Tìm theo mã, tiêu đề, mô tả..." 
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <div className="relative">
             <button 
              onClick={() => setShowColumnConfig(!showColumnConfig)}
              className="p-2 text-slate-500 hover:bg-slate-50 rounded-md border border-slate-200 bg-white"
            >
              <Settings2 size={20} className="text-orange-500" />
            </button>
            
            {showColumnConfig && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 z-50 p-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-700">Cột hiển thị <span className="text-slate-400 font-normal">11/11</span></span>
                  <button className="text-slate-400 hover:text-slate-600">
                    <RotateCcw size={14} />
                  </button>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {['Mã đề xuất', 'Chức vụ', 'Tiêu đề', 'Mô tả', 'Số lượng', 'Đã tuyển (đang làm)', 'Đã nghỉ', 'Còn lại', 'Link', 'Trạng thái', 'Ngày tạo'].map((col) => (
                    <label key={col} className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer hover:bg-slate-50 p-1 rounded">
                      <div className="relative flex items-center">
                        <input type="checkbox" defaultChecked className="peer h-4 w-4 appearance-none rounded border border-slate-300 checked:bg-orange-500 checked:border-orange-500" />
                        <CheckSquare size={14} className="absolute text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                      </div>
                      {col}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-md transition-colors shadow-sm shadow-orange-200">
            <Plus size={18} />
            Thêm
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 whitespace-nowrap">
          <Filter size={14} />
          Trạng thái
          <ChevronLeft size={14} className="-rotate-90" />
        </button>
        <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 whitespace-nowrap">
          <Filter size={14} />
          Chức vụ
          <ChevronLeft size={14} className="-rotate-90" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-4 w-10">
                  <input type="checkbox" className="rounded border-slate-300" />
                </th>
                <th className="p-4 whitespace-nowrap">Mã đề xuất</th>
                <th className="p-4 whitespace-nowrap">Tiêu đề</th>
                <th className="p-4 min-w-[200px]">Mô tả</th>
                <th className="p-4 whitespace-nowrap text-center">Số lượng</th>
                <th className="p-4 whitespace-nowrap text-center">Đã tuyển (đang làm)</th>
                <th className="p-4 whitespace-nowrap text-center">Đã nghỉ</th>
                <th className="p-4 whitespace-nowrap text-center">Còn lại</th>
                <th className="p-4 whitespace-nowrap text-center">Link</th>
                <th className="p-4 whitespace-nowrap">Trạng thái</th>
                <th className="p-4 whitespace-nowrap">Ngày tạo</th>
                <th className="p-4 whitespace-nowrap text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mockData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <input type="checkbox" className="rounded border-slate-300" />
                  </td>
                  <td className="p-4 font-medium text-slate-700">{item.code}</td>
                  <td className="p-4 font-medium text-slate-800">{item.title}</td>
                  <td className="p-4 text-slate-500 truncate max-w-[200px]">{item.description}</td>
                  <td className="p-4 text-center font-medium">{item.quantity}</td>
                  <td className="p-4 text-center text-emerald-600 font-medium">{item.hired}</td>
                  <td className="p-4 text-center text-orange-600 font-medium">{item.resigned}</td>
                  <td className="p-4 text-center font-medium">{item.remaining}</td>
                  <td className="p-4 text-center">
                    <button className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-md transition-colors border border-orange-200 bg-orange-50/50">
                      <ExternalLink size={14} />
                    </button>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(item.status)}
                  </td>
                  <td className="p-4 text-slate-500">{item.createdAt}</td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <button className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-md transition-colors border border-orange-200">
                        <Edit size={14} />
                      </button>
                      <button className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors border border-red-200">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="font-semibold">5</span> bản ghi
            <div className="h-4 w-px bg-slate-300 mx-2"></div>
            <select className="bg-white border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-orange-500">
              <option>20</option>
              <option>50</option>
              <option>100</option>
            </select>
            <span>/ trang</span>
          </div>
          
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-50">
              <ChevronsLeft size={16} />
            </button>
            <button className="p-1.5 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-50">
              <ChevronLeft size={16} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded bg-orange-500 text-white text-sm font-medium shadow-sm shadow-orange-200">
              1
            </button>
            <button className="p-1.5 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-50">
              <ChevronRight size={16} />
            </button>
            <button className="p-1.5 rounded hover:bg-slate-200 text-slate-400 disabled:opacity-50">
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
