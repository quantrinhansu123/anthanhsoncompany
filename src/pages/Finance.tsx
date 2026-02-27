import React from 'react';
import {
  BookOpen,
  Calculator,
  CalendarRange,
  RefreshCw,
  FileText,
  Settings,
  HandCoins,
  CreditCard,
  Wallet,
  Banknote,
  ArrowLeftRight,
  PieChart,
  Share2,
  TrendingUp,
  BarChart3,
  Landmark,
  LineChart,
  CheckCircle2,
  FileSpreadsheet,
  Receipt,
  ArrowLeft,
  Search,
  Star,
  HelpCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FinanceItemProps {
  title: string;
  description: string;
  icon: any;
  color: string;
  bgColor: string;
  key?: string | React.Key;
}

function FinanceCard({ title, description, icon: Icon, color, bgColor }: FinanceItemProps) {
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 group flex items-start gap-4 relative cursor-pointer">
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
    title: 'Kế toán tổng hợp',
    items: [
      { title: 'Sổ cái', description: 'Sổ cái tài khoản, đối chiếu số dư.', icon: BookOpen, color: 'text-purple-600', bgColor: 'bg-purple-50' },
      { title: 'Định khoản / Hạch toán', description: 'Chứng từ, bút toán, luồng duyệt.', icon: Calculator, color: 'text-blue-600', bgColor: 'bg-blue-50' },
      { title: 'Kỳ kế toán', description: 'Đóng kỳ, khóa sổ, mở kỳ mới.', icon: CalendarRange, color: 'text-blue-600', bgColor: 'bg-blue-50' },
      { title: 'Đối soát số liệu', description: 'Đối chiếu nội bộ, số liệu liên kết.', icon: RefreshCw, color: 'text-teal-600', bgColor: 'bg-teal-50' },
      { title: 'Báo cáo tài chính', description: 'BCKQKD, CĐKT, Lưu chuyển tiền tệ.', icon: FileText, color: 'text-teal-600', bgColor: 'bg-teal-50' },
      { title: 'Thiết lập kế toán', description: 'Danh mục tài khoản, kỳ, phân quyền.', icon: Settings, color: 'text-slate-600', bgColor: 'bg-slate-100' },
    ]
  },
  {
    title: 'Công nợ & Thu chi',
    items: [
      { title: 'Công nợ phải thu', description: 'Công nợ khách hàng, theo dõi thu, đối soát.', icon: HandCoins, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
      { title: 'Công nợ phải trả', description: 'Công nợ nhà cung cấp, lịch thanh toán.', icon: CreditCard, color: 'text-orange-600', bgColor: 'bg-orange-50' },
      { title: 'Thu tiền / Phiếu thu', description: 'Phiếu thu, đối ứng công nợ, quỹ.', icon: Wallet, color: 'text-teal-600', bgColor: 'bg-teal-50' },
      { title: 'Chi tiền / Phiếu chi', description: 'Phiếu chi, tạm ứng, thanh toán.', icon: Banknote, color: 'text-red-600', bgColor: 'bg-red-50' },
      { title: 'Đối soát công nợ', description: 'Đối chiếu công nợ, số dư, điều chỉnh.', icon: ArrowLeftRight, color: 'text-orange-600', bgColor: 'bg-orange-50' },
      { title: 'Thiết lập công nợ', description: 'Loại chứng từ, quy trình duyệt.', icon: Settings, color: 'text-slate-600', bgColor: 'bg-slate-100' },
    ]
  },
  {
    title: 'Ngân sách',
    items: [
      { title: 'Kế hoạch ngân sách', description: 'Lập ngân sách năm, quý theo phòng ban, mục.', icon: PieChart, color: 'text-purple-600', bgColor: 'bg-purple-50' },
      { title: 'Phân bổ ngân sách', description: 'Phân bổ theo dự án, chi phí, điều chuyển.', icon: Share2, color: 'text-blue-600', bgColor: 'bg-blue-50' },
      { title: 'Theo dõi thực chi', description: 'So sánh dự toán vs thực chi, cảnh báo vượt.', icon: TrendingUp, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
      { title: 'Báo cáo ngân sách', description: 'Báo cáo sử dụng, còn lại, biến động.', icon: BarChart3, color: 'text-teal-600', bgColor: 'bg-teal-50' },
      { title: 'Thiết lập ngân sách', description: 'Cấu trúc ngân sách, mẫu, quy trình phê duyệt.', icon: Settings, color: 'text-slate-600', bgColor: 'bg-slate-100' },
    ]
  },
  {
    title: 'Quỹ, Ngân hàng & Thuế',
    items: [
      { title: 'Quỹ tiền mặt', description: 'Sổ quỹ, thu chi tiền mặt, tồn quỹ.', icon: Wallet, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
      { title: 'Tài khoản ngân hàng', description: 'Sổ phụ ngân hàng, giao dịch, số dư.', icon: Landmark, color: 'text-blue-600', bgColor: 'bg-blue-50' },
      { title: 'Dự báo dòng tiền', description: 'Dự báo thu chi theo kỳ, kịch bản.', icon: LineChart, color: 'text-teal-600', bgColor: 'bg-teal-50' },
      { title: 'Đối soát ngân hàng', description: 'Đối chiếu sổ sách vs sao kê.', icon: CheckCircle2, color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
      { title: 'Kê khai thuế', description: 'Tờ khai GTGT, TNCN, TNDN, tạm tính.', icon: FileSpreadsheet, color: 'text-orange-600', bgColor: 'bg-orange-50' },
      { title: 'Hóa đơn', description: 'Hóa đơn điện tử, phát hành, hủy, đối soát.', icon: Receipt, color: 'text-red-600', bgColor: 'bg-red-50' },
      { title: 'Thiết lập quỹ & thuế', description: 'Thuế suất, mã thuế, tài khoản ngân hàng.', icon: Settings, color: 'text-slate-600', bgColor: 'bg-slate-100' },
    ]
  }
];

export function Finance() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="bg-white p-2 rounded-lg border border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-md border border-slate-200 transition-colors"
          >
            <ArrowLeft size={16} />
            Quay lại
          </button>

          <div className="h-6 w-px bg-slate-200 mx-1"></div>

          <button className="px-3 py-1.5 text-sm font-bold text-blue-600 bg-blue-50 rounded-md transition-colors">
            Tất cả
          </button>
          <button className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-md transition-colors">
            Đánh dấu
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm module theo tên hoặc mô tả.."
            className="w-full pl-9 pr-4 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </div>
      </div>

      {/* Content Sections */}
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
                <FinanceCard key={item.title} {...item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
