import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Calculator,
  UserCircle,
  GitBranch,
  Award,
  ArrowLeftRight,
  FolderKanban,
  FileSignature,
  BookOpen,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Loader2,
  ClipboardList,
  CalendarDays,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { motion } from 'motion/react';
import { employeeService } from '../lib/services/employeeService';
import { thuChiService, ThuChiRow } from '../lib/services/thuChiService';
import { customerService } from '../lib/services/customerService';
import { projectService } from '../lib/services/projectService';
// import { taskService, type TaskRow } from '../lib/services/taskService';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { vi } from 'date-fns/locale';

// Format số tiền theo VND
function formatVND(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(value) + ' đ';
}

// Lấy lời chào theo giờ
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Chào buổi sáng';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

const modules = [
  {
    title: 'Hành chính nhân sự',
    description: 'Công văn, hợp đồng, tuyển dụng, chấm công, lương.',
    icon: Users,
    color: 'bg-orange-500',
    path: '/hanh-chinh',
  },
  {
    title: 'Kế toán',
    description: 'Kế toán, ngân sách, báo cáo tài chính.',
    icon: Calculator,
    color: 'bg-purple-600',
    path: '/tai-chinh',
  },
  {
    title: 'Khách hàng',
    description: 'Quản lý thông tin khách hàng, hợp đồng, dịch vụ.',
    icon: UserCircle,
    color: 'bg-emerald-500',
    path: '/khach-hang',
  },
  {
    title: 'Quy trình',
    description: 'Quản lý quy trình làm việc, phê duyệt, luồng công việc.',
    icon: GitBranch,
    color: 'bg-teal-600',
    path: '/quy-trinh',
  },
];

const allGroups = [
  {
    title: 'HCNS',
    fullTitle: 'Hành chính nhân sự',
    icon: Users,
    color: 'bg-orange-500',
    items: [
      { title: 'Nhân sự', description: 'Quản lý thông tin nhân viên, tuyển dụng, đào tạo.', icon: Users, color: 'text-blue-600', bgColor: 'bg-blue-50', path: '/nhan-su' },
      { title: 'Lịch làm việc', description: 'Theo dõi ca làm, nghỉ phép, họp và đào tạo theo nhân sự.', icon: CalendarDays, color: 'text-sky-600', bgColor: 'bg-sky-50', path: '/nhan-su/lich-lam-viec' },
      { title: 'Chứng chỉ hành nghề', description: 'Quản lý chứng chỉ, giấy phép hành nghề của nhân viên.', icon: Award, color: 'text-emerald-600', bgColor: 'bg-emerald-50', path: '/hanh-chinh/chung-chi-hanh-nghe' },
    ],
  },
  {
    title: 'Kế toán',
    fullTitle: 'Kế toán',
    icon: Calculator,
    color: 'bg-purple-600',
    items: [
      { title: 'Thu chi', description: 'Quản lý thu chi, phiếu thu, phiếu chi, quỹ tiền mặt.', icon: ArrowLeftRight, color: 'text-blue-600', bgColor: 'bg-blue-50', path: '/tai-chinh/thu-chi' },
      { title: 'Thu chi nhân sự', description: 'Quản lý thu chi liên quan đến nhân sự, lương, phụ cấp.', icon: Users, color: 'text-emerald-600', bgColor: 'bg-emerald-50', path: '/tai-chinh/thu-chi-nhan-su' },
    ],
  },
  {
    title: 'Khách hàng',
    fullTitle: 'Khách hàng',
    icon: UserCircle,
    color: 'bg-emerald-500',
    items: [
      { title: 'DS Khách Hàng', description: 'Danh sách khách hàng, thông tin liên hệ, lịch sử giao dịch.', icon: UserCircle, color: 'text-blue-600', bgColor: 'bg-blue-50', path: '/khach-hang/danh-sach' },
      { title: 'Dự án', description: 'Quản lý dự án, tiến độ, ngân sách, nhân sự.', icon: FolderKanban, color: 'text-emerald-600', bgColor: 'bg-emerald-50', path: '/khach-hang/du-an' },
      { title: 'Hợp đồng', description: 'Quản lý hợp đồng, ký kết, gia hạn, thanh lý.', icon: FileSignature, color: 'text-purple-600', bgColor: 'bg-purple-50', path: '/khach-hang/hop-dong' },
    ],
  },
  {
    title: 'Quy trình',
    fullTitle: 'Quy trình',
    icon: GitBranch,
    color: 'bg-teal-600',
    items: [
      { title: 'Thư viện lỗi', description: 'Quản lý thư viện lỗi, phân loại, xử lý và giải pháp.', icon: BookOpen, color: 'text-blue-600', bgColor: 'bg-blue-50', path: '/quy-trinh/thu-vien-loi' },
      { title: 'Danh sách Task', description: 'Xem danh sách task theo quy trình (folder view).', icon: ClipboardList, color: 'text-orange-600', bgColor: 'bg-orange-50', path: '/quy-trinh/task-list' },
    ],
  },
];

const COLORS = ['#f97316', '#8b5cf6', '#10b981', '#06b6d4', '#f59e0b'];

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<'tong-quan' | 'chuc-nang' | 'danh-dau' | 'tat-ca'>('tong-quan');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    employees: 0,
    totalThu: 0,
    totalChi: 0,
    customers: 0,
    projects: 0,
  });
  const [thuChiData, setThuChiData] = useState<ThuChiRow[]>([]);
  const [projects, setProjects] = useState<{ status: string }[]>([]);

  // Fetch tất cả dữ liệu song song
  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const [employees, thuChi, customers, projectList] = await Promise.all([
          employeeService.getAll(),
          thuChiService.getAll(),
          customerService.getAll(),
          projectService.getAll(),
        ]);

        if (cancelled) return;

        const totalThu = thuChi
          .filter((r) => r.loai_phieu === 'Phiếu thu')
          .reduce((sum, r) => sum + (r.so_tien || 0), 0);
        const totalChi = thuChi
          .filter((r) => r.loai_phieu === 'Phiếu chi')
          .reduce((sum, r) => sum + (r.so_tien || 0), 0);

        setStats({
          employees: employees?.length ?? 0,
          totalThu,
          totalChi,
          customers: customers?.length ?? 0,
          projects: projectList?.length ?? 0,
        });
        setThuChiData(thuChi);
        setProjects(projectList || []);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, []);

  // Dữ liệu biểu đồ thu chi 6 tháng gần nhất
  const chartData = useMemo(() => {
    const result: { month: string; thu: number; chi: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const start = startOfMonth(d);
      const end = endOfMonth(d);
      const thu = thuChiData
        .filter(
          (r) =>
            r.loai_phieu === 'Phiếu thu' &&
            r.ngay &&
            new Date(r.ngay) >= start &&
            new Date(r.ngay) <= end
        )
        .reduce((sum, r) => sum + (r.so_tien || 0), 0);
      const chi = thuChiData
        .filter(
          (r) =>
            r.loai_phieu === 'Phiếu chi' &&
            r.ngay &&
            new Date(r.ngay) >= start &&
            new Date(r.ngay) <= end
        )
        .reduce((sum, r) => sum + (r.so_tien || 0), 0);
      result.push({
        month: format(d, 'MMM', { locale: vi }),
        thu,
        chi,
      });
    }
    return result;
  }, [thuChiData]);

  // Dữ liệu biểu đồ tròn: dự án theo trạng thái
  const projectStatusData = useMemo(() => {
    const map = new Map<string, number>();
    projects.forEach((p) => {
      const status = p.status || 'Khác';
      map.set(status, (map.get(status) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [projects]);

  // Phiếu thu chi gần đây (5 mục)
  const recentThuChi = useMemo(
    () => thuChiData.slice(0, 5),
    [thuChiData]
  );

  // Task việc gần đây: đã bỏ bảng Task gần đây nên không cần recentTasks

  const statCards = [
    {
      title: 'Nhân sự',
      value: stats.employees,
      icon: Users,
      color: 'from-orange-500 to-orange-600',
      bgIcon: 'bg-orange-100',
      iconColor: 'text-orange-600',
      path: '/nhan-su',
    },
    {
      title: 'Tổng thu',
      value: formatVND(stats.totalThu),
      icon: TrendingUp,
      color: 'from-emerald-500 to-emerald-600',
      bgIcon: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      path: '/tai-chinh/thu-chi',
    },
    {
      title: 'Tổng chi',
      value: formatVND(stats.totalChi),
      icon: TrendingDown,
      color: 'from-rose-500 to-rose-600',
      bgIcon: 'bg-rose-100',
      iconColor: 'text-rose-600',
      path: '/tai-chinh/thu-chi',
    },
    {
      title: 'Khách hàng',
      value: stats.customers,
      icon: UserCircle,
      color: 'from-blue-500 to-blue-600',
      bgIcon: 'bg-blue-100',
      iconColor: 'text-blue-600',
      path: '/khach-hang/danh-sach',
    },
    {
      title: 'Dự án',
      value: stats.projects,
      icon: FolderKanban,
      color: 'from-purple-500 to-purple-600',
      bgIcon: 'bg-purple-100',
      iconColor: 'text-purple-600',
      path: '/khach-hang/du-an',
    },
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-3 h-[calc(100vh-96px)] min-h-0 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 shrink-0">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 uppercase tracking-tight">
            Trang chủ
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5 font-medium">
            Tổng quan hoạt động và điều hướng nhanh
          </p>
        </div>
      </div>

      <div className="flex-1 min-h-0 bg-white border-2 border-slate-400 rounded-xl shadow-lg flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 md:p-5 space-y-6 [scrollbar-gutter:stable]">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-lg md:text-xl font-extrabold text-slate-900 flex items-center gap-2 flex-wrap tracking-tight">
              {getGreeting()}, <span className="text-[var(--primary)]">Người dùng Demo</span>{' '}
              👋
            </h2>
            <p className="text-sm md:text-[15px] font-medium text-slate-700">
              Tổng quan hoạt động của công ty
            </p>
          </div>

      {/* Tabs */}
      <div className="bg-slate-100/90 p-1 rounded-lg inline-flex border-2 border-slate-300 shadow-sm overflow-x-auto max-w-full">
        <button
          onClick={() => setActiveTab('tong-quan')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'tong-quan'
              ? 'text-[var(--primary)] bg-orange-50'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Tổng quan
        </button>
        <button
          onClick={() => setActiveTab('chuc-nang')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'chuc-nang'
              ? 'text-[var(--primary)] bg-orange-50'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Chức năng
        </button>
        <button
          onClick={() => setActiveTab('danh-dau')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'danh-dau'
              ? 'text-[var(--primary)] bg-orange-50'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Đánh dấu
        </button>
        <button
          onClick={() => setActiveTab('tat-ca')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'tat-ca'
              ? 'text-[var(--primary)] bg-orange-50'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Tất cả
        </button>
      </div>

      {/* Tab: Tổng quan */}
      {activeTab === 'tong-quan' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {/* Stat cards */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse"
                >
                  <div className="h-10 w-10 rounded-lg bg-slate-200 mb-3" />
                  <div className="h-5 w-20 bg-slate-200 rounded mb-2" />
                  <div className="h-8 w-24 bg-slate-200 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {statCards.map((card, idx) => (
                <Link
                  key={card.title}
                  to={card.path}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all duration-300 card-hover group"
                >
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-start justify-between"
                  >
                    <div className={`${card.bgIcon} ${card.iconColor} w-11 h-11 rounded-lg flex items-center justify-center`}>
                      <card.icon className="w-5 h-5" strokeWidth={2} />
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all" />
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.05 + 0.1 }}
                    className="mt-3 text-sm font-medium text-slate-500"
                  >
                    {card.title}
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.05 + 0.15 }}
                    className="text-xl font-bold text-slate-800 truncate"
                  >
                    {card.value}
                  </motion.p>
                </Link>
              ))}
            </div>
          )}

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Thu chi theo tháng */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-800 mb-4">
                Thu chi 6 tháng gần nhất
              </h3>
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              ) : chartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorThu" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorChi" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#64748b" />
                      <YAxis tick={{ fontSize: 12 }} stroke="#64748b" tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(0)}M` : v)} />
                      <Tooltip
                        formatter={(value: number) => formatVND(value)}
                        contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0' }}
                      />
                      <Area type="monotone" dataKey="thu" stroke="#10b981" fillOpacity={1} fill="url(#colorThu)" name="Thu" strokeWidth={2} />
                      <Area type="monotone" dataKey="chi" stroke="#f43f5e" fillOpacity={1} fill="url(#colorChi)" name="Chi" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                  Chưa có dữ liệu thu chi
                </div>
              )}
            </div>

            {/* Dự án theo trạng thái */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <h3 className="text-base font-semibold text-slate-800 mb-4">
                Dự án theo trạng thái
              </h3>
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              ) : projectStatusData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={projectStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {projectStatusData.map((_, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value} dự án`, '']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-slate-400 text-sm">
                  Chưa có dự án
                </div>
              )}
            </div>
          </div>

          {/* Phiếu thu chi gần đây */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-slate-800">
                Phiếu thu chi gần đây
              </h3>
              <Link
                to="/tai-chinh/thu-chi"
                className="text-sm font-medium text-[var(--primary)] hover:underline flex items-center gap-1"
              >
                Xem phiếu <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Phiếu thu chi gần đây
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {recentThuChi.length} phiếu
                  </span>
                </div>
                {recentThuChi.length > 0 ? (
                  recentThuChi.map((item) => (
                    <Link
                      key={item.id}
                      to="/tai-chinh/thu-chi"
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                            item.loai_phieu === 'Phiếu thu'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {item.loai_phieu === 'Phiếu thu' ? 'THU' : 'CHI'}
                        </div>
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-800 text-xs line-clamp-1">
                            {item.noi_dung || 'Không có nội dung'}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {item.ngay
                              ? format(new Date(item.ngay), 'dd/MM/yyyy', {
                                  locale: vi,
                                })
                              : '-'}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`font-bold text-xs tabular-nums ${
                          item.loai_phieu === 'Phiếu thu'
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {item.loai_phieu === 'Phiếu thu' ? '+' : '-'}
                        {formatVND(item.so_tien || 0)}
                      </span>
                    </Link>
                  ))
                ) : (
                  <p className="text-center py-4 text-slate-400 text-xs">
                    Chưa có phiếu thu chi nào
                  </p>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Tab: Chức năng */}
      {activeTab === 'chuc-nang' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          {modules.map((module) => (
            <Link
              key={module.title}
              to={module.path}
              className="bg-white p-4 md:p-6 rounded-xl md:rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-row items-center text-left gap-4 h-full card-hover"
            >
              <div
                className={`${module.color} w-12 h-12 md:w-14 md:h-14 rounded-xl md:rounded-2xl flex items-center justify-center text-white shadow-md md:shadow-lg shadow-slate-200 group-hover:scale-110 transition-transform duration-300 shrink-0`}
              >
                <module.icon className="w-6 h-6 md:w-7 md:h-7" strokeWidth={1.5} />
              </div>
              <div className="space-y-1 md:space-y-2 flex-1">
                <h3 className="font-bold text-slate-800 text-base md:text-lg group-hover:text-[var(--primary)] transition-colors">
                  {module.title}
                </h3>
                <p className="text-xs md:text-sm text-slate-500 leading-relaxed line-clamp-2 md:line-clamp-none">
                  {module.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Tab: Đánh dấu */}
      {activeTab === 'danh-dau' && (
        <div className="text-center py-12 text-slate-500">
          <p>Chưa có mục nào được đánh dấu</p>
        </div>
      )}

      {/* Tab: Tất cả */}
      {activeTab === 'tat-ca' && (
        <div className="space-y-6 md:space-y-8">
          {allGroups.map((group) => (
            <div key={group.title} className="space-y-3 md:space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b-2 border-slate-300">
                <div
                  className={`${group.color} w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center text-white shadow-sm border border-black/10`}
                >
                  <group.icon size={20} className="md:w-6 md:h-6" />
                </div>
                <h2 className="text-sm md:text-base font-bold text-slate-800">
                  {group.fullTitle}
                </h2>
              </div>
              <div className="flex flex-wrap gap-3 md:gap-4">
                {group.items.map((item) => (
                  <Link
                    key={item.title}
                    to={item.path || '#'}
                    className="bg-slate-50 p-3 md:p-4 rounded-xl border-2 border-slate-300 shadow-sm hover:shadow-md transition-all duration-300 group flex flex-col items-center gap-2 md:gap-3 min-w-[100px] md:min-w-[140px] text-center card-hover"
                  >
                    <div
                      className={`${item.bgColor} ${item.color} w-16 h-16 md:w-20 md:h-20 rounded-lg flex items-center justify-center`}
                    >
                      <item.icon size={32} className="md:w-10 md:h-10" />
                    </div>
                    <h3 className="font-medium text-slate-800 text-xs md:text-sm group-hover:text-blue-600 transition-colors px-1">
                      {item.title}
                    </h3>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
