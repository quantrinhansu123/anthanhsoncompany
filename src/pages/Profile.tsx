import React from 'react';
import {
    User, Mail, Phone, Building, Calendar, ShieldCheck, Camera, KeyRound,
    Briefcase, PhoneCall, Heart, GraduationCap, Landmark, Info, MapPin
} from 'lucide-react';

export function Profile() {
    const CardSection = ({ title, icon: Icon, children }: { title: string, icon: any, children: React.ReactNode }) => (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
                <Icon size={18} className="text-blue-600" />
                <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wide">{title}</h3>
            </div>
            {children}
        </div>
    );

    const InfoField = ({ label, value, icon: Icon }: { label: string, value?: string, icon?: any }) => (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium h-5">
                {Icon && <Icon size={14} className="text-slate-400" />}
                {label}
            </div>
            {value ? (
                <span className="text-sm text-slate-800 font-medium">{value}</span>
            ) : (
                <span className="text-sm text-slate-400 italic font-medium">Chưa cập nhật</span>
            )}
        </div>
    );

    return (
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <User className="text-blue-600 font-bold" size={28} />
                        Hồ sơ cá nhân
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 ml-9">Quản lý thông tin tài khoản và cài đặt của bạn.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Sidebar */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center shadow-sm relative overflow-hidden">
                        {/* Background decoration */}
                        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-br from-blue-50 to-blue-100/50 -z-10"></div>

                        <div className="w-24 h-24 bg-slate-900 rounded-full flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-md relative mt-4">
                            <span className="bg-gradient-to-br from-white to-slate-200 bg-clip-text text-transparent">NĐC</span>
                            <span className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
                        </div>

                        <div className="text-center mt-4 mb-6">
                            <h2 className="text-lg font-bold text-slate-800">Nguyễn Đắc Công</h2>
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold mt-1 inline-block">Admin</span>
                        </div>

                        <div className="w-full space-y-3.5 mt-2">
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <Mail size={16} className="text-slate-400" />
                                <span>Upcare</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <Phone size={16} className="text-slate-400" />
                                <span>0900000000</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <Building size={16} className="text-slate-400" />
                                <span>Phòng Hành chính</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <Briefcase size={16} className="text-slate-400" />
                                <span>Giám đốc</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-slate-600">
                                <Calendar size={16} className="text-slate-400" />
                                <span>Tham gia 10/01/2019</span>
                            </div>
                            <div className="flex items-center gap-3 text-sm text-emerald-600 font-medium">
                                <ShieldCheck size={16} />
                                <span>Tài khoản xác thực</span>
                            </div>
                        </div>

                        <div className="w-full grid grid-cols-2 gap-3 mt-8 pt-6 border-t border-slate-100">
                            <button className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-blue-200 hover:text-blue-600 transition-all group shadow-sm hover:shadow">
                                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                    <Camera size={18} />
                                </div>
                                <span className="text-xs font-medium text-slate-600 group-hover:text-blue-600">Đổi ảnh đại diện</span>
                            </button>
                            <button className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 transition-all group shadow-sm hover:shadow">
                                <div className="w-10 h-10 rounded-full border border-slate-200 bg-white text-slate-600 flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                                    <KeyRound size={18} />
                                </div>
                                <span className="text-xs font-medium text-slate-600 group-hover:text-slate-800">Đổi mật khẩu</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Content */}
                <div className="lg:col-span-9">

                    <CardSection title="Thông tin cá nhân" icon={User}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-8">
                            <InfoField label="Họ tên" value="Nguyễn Đắc Công" icon={User} />
                            <InfoField label="Ngày sinh" icon={Calendar} />
                            <InfoField label="Nơi sinh" icon={MapPin} />

                            <InfoField label="CMND/CCCD" icon={ShieldCheck} />
                            <InfoField label="Ngày cấp" icon={Calendar} />
                            <InfoField label="Nơi cấp" icon={MapPin} />

                            <InfoField label="Quốc tịch" icon={MapPin} />
                            <InfoField label="Dân tộc" icon={User} />
                            <InfoField label="Tôn giáo" icon={User} />
                        </div>
                    </CardSection>

                    <CardSection title="Thông tin công việc" icon={Briefcase}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-8">
                            <InfoField label="Mã nhân viên" value="NV000" icon={Briefcase} />
                            <InfoField label="Chức vụ" value="Giám đốc" icon={Briefcase} />
                            <InfoField label="Phòng ban" value="Phòng Hành chính" icon={Building} />

                            <InfoField label="Cấp bậc" icon={Briefcase} />
                            <InfoField label="Ngày vào làm" value="10/01/2019" icon={Calendar} />
                            <InfoField label="Thâm niên" value="7 năm 1 tháng" icon={Calendar} />

                            <InfoField label="Loại hợp đồng" icon={Briefcase} />
                            <InfoField label="Ngày hết hạn HĐ" icon={Calendar} />
                            <InfoField label="Nơi làm việc" icon={MapPin} />
                        </div>
                    </CardSection>

                    <CardSection title="Thông tin liên hệ" icon={PhoneCall}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-8">
                            <InfoField label="Email công việc" value="Upcare" icon={Mail} />
                            <InfoField label="Email cá nhân" icon={Mail} />
                            <InfoField label="Điện thoại" value="0900000000" icon={Phone} />

                            <InfoField label="Người liên hệ khẩn cấp" icon={User} />
                            <InfoField label="SĐT khẩn cấp" icon={Phone} />
                            <InfoField label="Quan hệ" icon={User} />
                        </div>

                        <div className="mt-8">
                            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4"><MapPin size={14} className="text-slate-400" /> Địa chỉ</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-8 ml-5">
                                <InfoField label="Tỉnh/Thành phố" />
                                <InfoField label="Quận/Huyện" />
                                <InfoField label="Phường/Xã" />
                            </div>
                            <div className="mt-6 ml-5">
                                <InfoField label="Địa chỉ chi tiết" />
                            </div>
                        </div>
                    </CardSection>

                    <CardSection title="Hôn nhân & gia đình" icon={Heart}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                            <InfoField label="Tình trạng hôn nhân" icon={Heart} />
                            <InfoField label="Số người phụ thuộc" icon={User} />
                        </div>
                    </CardSection>

                    <CardSection title="Học vấn & chứng chỉ" icon={GraduationCap}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-8">
                            <InfoField label="Trình độ học vấn" icon={GraduationCap} />
                            <InfoField label="Chuyên ngành" icon={Briefcase} />
                            <InfoField label="Trường đào tạo" icon={Building} />

                            <InfoField label="Năm tốt nghiệp" icon={Calendar} />
                            <div className="md:col-span-2">
                                <InfoField label="Chứng chỉ bổ sung" icon={GraduationCap} />
                            </div>
                        </div>
                    </CardSection>

                    <CardSection title="Tài chính & ngân hàng" icon={Landmark}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-8">
                            <InfoField label="Số tài khoản" icon={Landmark} />
                            <InfoField label="Ngân hàng" icon={Building} />
                            <InfoField label="Chi nhánh" icon={MapPin} />

                            <InfoField label="Mã số thuế cá nhân" icon={Briefcase} />
                        </div>

                        <div className="mt-8">
                            <h4 className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2"><ShieldCheck size={14} className="text-slate-400" /> Bảo hiểm</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-8 ml-5">
                                <InfoField label="Số BHXH" />
                                <InfoField label="Số BHYT" />
                                <InfoField label="Ngày tham gia BH" />

                                <div className="md:col-span-3">
                                    <InfoField label="Nơi đăng ký KCB" />
                                </div>
                            </div>
                        </div>
                    </CardSection>

                    <CardSection title="Thông tin hệ thống" icon={Info}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-6 gap-x-8">
                            <InfoField label="Ngày tạo" value="10/01/2019" icon={Calendar} />
                            <InfoField label="Người tạo" value="system" icon={User} />
                            <InfoField label="Cập nhật lần cuối" value="15/01/2025" icon={Calendar} />
                        </div>
                    </CardSection>

                </div>
            </div>
        </div>
    );
}
