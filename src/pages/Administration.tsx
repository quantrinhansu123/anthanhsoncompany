import React from 'react';
import { 
  Calendar, 
  ClipboardCheck, 
  FileText, 
  Target, 
  Banknote, 
  Scale, 
  Settings,
  FileInput,
  Send,
  FileEdit,
  Archive,
  FileSignature,
  FolderKanban,
  ListTodo,
  BarChart,
  Monitor,
  ArrowRightLeft,
  ClipboardList,
  Wrench,
  Calculator,
  Car,
  CalendarClock,
  CalendarDays,
  Fuel,
  UserCog,
  Star,
  HelpCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface AdminItemProps {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

function AdminCard({ title, description, icon: Icon, color, bgColor }: AdminItemProps) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group flex items-start gap-4 relative">
      <div className={`${bgColor} ${color} w-10 h-10 rounded-lg flex items-center justify-center shrink-0`}>
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-slate-800 text-sm truncate pr-6 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>
        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
          {description}
        </p>
      </div>
      <div className="flex flex-col gap-2 absolute right-3 top-3 text-slate-300">
        <button className="hover:text-yellow-400 transition-colors">
          <Star size={14} />
        </button>
        <button className="hover:text-blue-400 transition-colors">
          <HelpCircle size={14} />
        </button>
      </div>
    </div>
  );
}

const sections = [
  {
    title: 'Công lương',
    items: [
      { title: 'Chấm công', description: 'Quản lý chấm công, ca làm việc.', icon: Calendar, color: 'text-blue-600', bgColor: 'bg-blue-50' },
      { title: 'Tổng hợp chấm công', description: 'Tổng hợp và báo cáo chấm công theo nhân viên.', icon: ClipboardCheck, color: 'text-orange-600', bgColor: 'bg-orange-50' },
      { title: 'Phiếu hành chính', description: 'Phiếu đề xuất, xác nhận hành chính.', icon: FileText, color: 'text-purple-600', bgColor: 'bg-purple-50' },
      { title: 'Chấm điểm KPI', description: 'Đánh giá và chấm điểm KPI theo kỳ, nhân viên.', icon: Target, color: 'text-pink-600', bgColor: 'bg-pink-50' },
      { title: 'Bảng lương', description: 'Tính lương, phiếu lương, báo cáo.', icon: Banknote, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
      { title: 'Điểm cộng trừ', description: 'Ghi nhận điểm cộng, trừ của nhân viên theo tháng.', icon: Scale, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
      { title: 'Thiết lập công lương', description: 'Cấu hình hệ số, quy tắc tính lương.', icon: Settings, color: 'text-slate-600', bgColor: 'bg-slate-100' },
    ]
  },
  {
    title: 'Tài liệu',
    items: [
      { title: 'Văn bản đến', description: 'Tiếp nhận, vào sổ công văn đến.', icon: FileInput, color: 'text-blue-600', bgColor: 'bg-blue-50' },
      { title: 'Văn bản đi', description: 'Soạn, phát hành công văn đi.', icon: Send, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
      { title: 'Soạn thảo văn bản', description: 'Soạn thảo, trình duyệt, ký số.', icon: FileEdit, color: 'text-purple-600', bgColor: 'bg-purple-50' },
      { title: 'Lưu trữ hồ sơ', description: 'Lưu trữ, tra cứu, mượn trả hồ sơ.', icon: Archive, color: 'text-teal-600', bgColor: 'bg-teal-50' },
      { title: 'Quản lý hợp đồng', description: 'Hợp đồng, gia hạn, lưu trữ.', icon: FileSignature, color: 'text-red-600', bgColor: 'bg-red-50' },
      { title: 'Thiết lập tài liệu', description: 'Quy trình, mẫu văn bản, phân quyền.', icon: Settings, color: 'text-slate-600', bgColor: 'bg-slate-100' },
    ]
  },
  {
    title: 'Công việc',
    items: [
      { title: 'Dự án', description: 'Quản lý dự án, phòng ban, thời gian, mục tiêu.', icon: FolderKanban, color: 'text-blue-600', bgColor: 'bg-blue-50' },
      { title: 'Công việc', description: 'Giao việc, theo dõi tiến độ, báo cáo kết quả.', icon: ListTodo, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
      { title: 'Báo cáo', description: 'Thống kê công việc theo dự án, phòng ban, người, thời gian.', icon: BarChart, color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
      { title: 'Thiết lập công việc', description: 'Cảnh báo đến hạn, mẫu công việc, quy tắc mặc định.', icon: Settings, color: 'text-slate-600', bgColor: 'bg-slate-100' },
    ]
  },
  {
    title: 'Tài sản',
    items: [
      { title: 'Danh mục tài sản', description: 'Mã tài sản, nhóm, phòng ban quản lý.', icon: Monitor, color: 'text-blue-600', bgColor: 'bg-blue-50' },
      { title: 'Cấp phát / Thu hồi', description: 'Cấp phát, bàn giao, thu hồi tài sản.', icon: ArrowRightLeft, color: 'text-indigo-600', bgColor: 'bg-indigo-50' },
      { title: 'Kiểm kê tài sản', description: 'Đợt kiểm kê, đối chiếu, biên bản.', icon: ClipboardList, color: 'text-teal-600', bgColor: 'bg-teal-50' },
      { title: 'Bảo trì – Sửa chữa', description: 'Kế hoạch bảo trì, yêu cầu sửa chữa.', icon: Wrench, color: 'text-orange-600', bgColor: 'bg-orange-50' },
      { title: 'Khấu hao tài sản', description: 'Tính khấu hao, báo cáo khấu hao.', icon: Calculator, color: 'text-purple-600', bgColor: 'bg-purple-50' },
      { title: 'Thiết lập tài sản', description: 'Nhóm tài sản, tham số khấu hao.', icon: Settings, color: 'text-slate-600', bgColor: 'bg-slate-100' },
    ]
  },
  {
    title: 'Quản lý xe',
    items: [
      { title: 'Danh sách xe', description: 'Thông tin xe, biển số, trạng thái.', icon: Car, color: 'text-blue-600', bgColor: 'bg-blue-50' },
      { title: 'Đăng ký sử dụng xe', description: 'Đặt xe, phê duyệt, lịch sử dụng.', icon: CalendarClock, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
      { title: 'Lịch bảo dưỡng', description: 'Định kỳ bảo dưỡng, nhắc lịch.', icon: CalendarDays, color: 'text-orange-600', bgColor: 'bg-orange-50' },
      { title: 'Phiếu xăng – Chi phí xe', description: 'Đổ xăng, chi phí đi lại, đối soát.', icon: Fuel, color: 'text-red-600', bgColor: 'bg-red-50' },
      { title: 'Quản lý lái xe', description: 'Danh sách lái xe, phân công, bằng lái.', icon: UserCog, color: 'text-pink-600', bgColor: 'bg-pink-50' },
      { title: 'Thiết lập quản lý xe', description: 'Loại xe, quy trình đặt xe, phân quyền.', icon: Settings, color: 'text-slate-600', bgColor: 'bg-slate-100' },
    ]
  }
];

export function Administration() {
  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <div key={section.title} className="space-y-4">
          <div className="flex items-center gap-2 border-l-4 border-blue-600 pl-3">
            <h2 className="text-sm font-bold text-blue-600 uppercase tracking-wide">
              {section.title}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {section.items.map((item) => (
              <AdminCard key={item.title} {...item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
