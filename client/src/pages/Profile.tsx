import React, { useState, useRef } from 'react';
import {
    User, Mail, Phone, Building, Calendar, ShieldCheck, Camera, KeyRound,
    Briefcase, PhoneCall, Heart, GraduationCap, Landmark, Info, MapPin,
    X, CheckCircle, Eye, EyeOff
} from 'lucide-react';

// Toast component
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'info' | 'warning'; onClose: () => void }) {
    React.useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);
    const bgColor = type === 'success' ? 'bg-emerald-500' : type === 'warning' ? 'bg-amber-500' : 'bg-blue-500';
    return (
        <div className={`fixed top-5 right-5 z-[100] ${bgColor} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 toast-enter`}>
            <CheckCircle size={18} />
            <span className="text-sm font-medium">{message}</span>
            <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded p-0.5 transition-colors"><X size={14} /></button>
        </div>
    );
}

export function Profile() {
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showOldPw, setShowOldPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [pwForm, setPwForm] = useState({ oldPw: '', newPw: '', confirmPw: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAvatarChange = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setToast({ message: `Đã chọn ảnh: ${file.name}. Tính năng đang phát triển.`, type: 'info' });
        }
        e.target.value = '';
    };

    const handlePasswordChange = () => {
        if (!pwForm.oldPw || !pwForm.newPw || !pwForm.confirmPw) {
            setToast({ message: 'Vui lòng nhập đầy đủ thông tin', type: 'warning' });
            return;
        }
        if (pwForm.newPw !== pwForm.confirmPw) {
            setToast({ message: 'Mật khẩu xác nhận không khớp', type: 'warning' });
            return;
        }
        setShowPasswordModal(false);
        setPwForm({ oldPw: '', newPw: '', confirmPw: '' });
        setToast({ message: 'Đã đổi mật khẩu thành công!', type: 'success' });
    };
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

                        <input type="file" ref={fileInputRef} onChange={handleFileSelected} accept="image/*" className="hidden" />
                        <div className="w-full grid grid-cols-2 gap-3 mt-8 pt-6 border-t border-slate-100">
                            <button onClick={handleAvatarChange} className="action-btn flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-blue-200 hover:text-blue-600 group shadow-sm hover:shadow">
                                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                                    <Camera size={18} />
                                </div>
                                <span className="text-xs font-medium text-slate-600 group-hover:text-blue-600">Đổi ảnh đại diện</span>
                            </button>
                            <button onClick={() => setShowPasswordModal(true)} className="action-btn flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 group shadow-sm hover:shadow">
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

            {/* Toast */}
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            {/* Password Change Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 modal-overlay p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-lg modal-content">
                        <div className="px-6 py-4 flex justify-between items-center border-b border-slate-200">
                            <h2 className="text-lg font-bold text-slate-800">Đổi mật khẩu</h2>
                            <button onClick={() => setShowPasswordModal(false)} className="icon-btn p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu cũ</label>
                                <div className="relative">
                                    <input type={showOldPw ? 'text' : 'password'} value={pwForm.oldPw} onChange={(e) => setPwForm({ ...pwForm, oldPw: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" placeholder="Nhập mật khẩu cũ..." />
                                    <button onClick={() => setShowOldPw(!showOldPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        {showOldPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu mới</label>
                                <div className="relative">
                                    <input type={showNewPw ? 'text' : 'password'} value={pwForm.newPw} onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" placeholder="Nhập mật khẩu mới..." />
                                    <button onClick={() => setShowNewPw(!showNewPw)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        {showNewPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Xác nhận mật khẩu mới</label>
                                <input type="password" value={pwForm.confirmPw} onChange={(e) => setPwForm({ ...pwForm, confirmPw: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500" placeholder="Nhập lại mật khẩu mới..." />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
                            <button onClick={() => setShowPasswordModal(false)} className="btn-secondary px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Hủy</button>
                            <button onClick={handlePasswordChange} className="btn-primary ripple px-4 py-2 bg-blue-600 border border-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700">Đổi mật khẩu</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
