import React, { useState } from 'react';
import {
    Settings as SettingsIcon,
    RotateCcw,
    CheckCircle2,
    Sun,
    Moon,
    Monitor,
    Type,
    Globe,
    Clock,
    Bell,
    Palette,
    ImageIcon
} from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

export function Settings() {
    const {
        theme, setTheme,
        color, setColor,
        fontFamily, setFontFamily,
        fontSize, setFontSize,
        language, setLanguage,
        logoUrl, setLogoUrl,
        t
    } = useSettings();

    const colors = [
        { id: 'blue', name: t('color.blue'), class: 'bg-blue-600' },
        { id: 'purple', name: t('color.purple'), class: 'bg-purple-600' },
        { id: 'green', name: t('color.green'), class: 'bg-emerald-500' },
        { id: 'red', name: t('color.red'), class: 'bg-red-500' },
        { id: 'yellow', name: t('color.yellow'), class: 'bg-yellow-500' },
        { id: 'orange', name: t('color.orange'), class: 'bg-orange-500' },
        { id: 'cyan', name: t('color.cyan'), class: 'bg-cyan-500' },
        { id: 'gray', name: t('color.gray'), class: 'bg-slate-600' },
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                        <SettingsIcon size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">{t('settings.title')}</h2>
                        <p className="text-sm text-slate-500">{t('settings.subtitle')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <p className="text-sm text-emerald-600 flex items-center gap-1.5 font-medium">
                        <CheckCircle2 size={16} /> {t('settings.autoSave')}
                    </p>
                    <button
                        onClick={() => {
                            setTheme('light');
                            setColor('blue');
                            setFontFamily('Inter');
                            setFontSize('Trung bình');
                            setLanguage('vi');
                            setLogoUrl('https://www.appsheet.com/template/gettablefileurl?appName=Appsheet-325045268&tableName=Kho%20%E1%BA%A3nh&fileName=Kho%20%E1%BA%A3nh_Images%2F13c7458d.%E1%BA%A2nh.064848.jpg');
                        }}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors bg-white"
                    >
                        <RotateCcw size={16} />
                        {t('settings.reset')}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Giao diện & Hiển thị - Span 2 columns */}
                <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 p-5 md:p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-blue-600 flex items-center gap-2 mb-5 uppercase tracking-wide">
                        <Palette size={16} /> {t('settings.appearance')}
                    </h3>

                    <div className="space-y-6">
                        {/* Chế độ hiển thị */}
                        <div>
                            <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                                <Sun size={16} className="text-slate-400" /> {t('settings.theme')}
                            </p>
                            <div className="flex flex-wrap items-center gap-3">
                                <button
                                    onClick={() => setTheme('light')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${theme === 'light' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    <Sun size={16} /> {t('settings.light')}
                                </button>
                                <button
                                    onClick={() => setTheme('dark')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${theme === 'dark' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    <Moon size={16} /> {t('settings.dark')}
                                </button>
                                <button
                                    onClick={() => setTheme('system')}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${theme === 'system' ? 'border-blue-600 text-blue-600 bg-blue-50' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    <Monitor size={16} /> {t('settings.system')}
                                </button>
                            </div>
                        </div>

                        {/* Tông màu chủ đạo */}
                        <div>
                            <p className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                                <Palette size={16} className="text-slate-400" /> {t('settings.color')}
                            </p>
                            <div className="flex flex-wrap items-center gap-3">
                                {colors.map((c) => (
                                    <button
                                        key={c.id}
                                        onClick={() => setColor(c.id)}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-colors ${color === c.id ? 'border-blue-600 bg-slate-50 font-medium text-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                            }`}
                                    >
                                        <div className={`w-3.5 h-3.5 rounded-full ${c.class}`}></div>
                                        {c.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Kiểu chữ & Kích thước */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                    <Type size={16} className="text-slate-400" /> {t('settings.typography')}
                                </p>
                                <select
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white cursor-pointer"
                                    value={fontFamily}
                                    onChange={(e) => setFontFamily(e.target.value)}
                                >
                                    <option value="Inter">Inter</option>
                                    <option value="Roboto">Roboto</option>
                                    <option value="Open Sans">Open Sans</option>
                                </select>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                    <Type size={16} className="text-slate-400" /> {t('settings.textSize')}
                                </p>
                                <select
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white cursor-pointer"
                                    value={fontSize}
                                    onChange={(e) => setFontSize(e.target.value)}
                                >
                                    <option value="Nhỏ">{t('settings.size.small')}</option>
                                    <option value="Trung bình">{t('settings.size.medium')}</option>
                                    <option value="Lớn">{t('settings.size.large')}</option>
                                </select>
                                <div className="mt-3 p-3 bg-slate-50/80 border border-slate-100 rounded-lg border-dashed">
                                    <p className="text-sm text-slate-800">{t('settings.size.desc1')}</p>
                                    <p className="text-xs text-slate-500 mt-1">{t('settings.size.desc2')}</p>
                                </div>
                            </div>
                        </div>

                        {/* Logo App */}
                        <div>
                            <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                <ImageIcon size={16} className="text-slate-400" /> Logo ứng dụng
                            </p>
                            <div className="flex items-center gap-3">
                                <img
                                    src={logoUrl}
                                    alt="App Logo Preview"
                                    className="w-10 h-10 object-contain rounded-lg border border-slate-200 bg-slate-50 p-1 shrink-0"
                                    onError={(e) => { (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%2394a3b8%22><rect width=%2224%22 height=%2224%22 rx=%224%22 fill=%22%23f1f5f9%22/><text x=%2212%22 y=%2216%22 text-anchor=%22middle%22 font-size=%2210%22>?</text></svg>'; }}
                                />
                                <input
                                    type="text"
                                    value={logoUrl}
                                    onChange={(e) => setLogoUrl(e.target.value)}
                                    placeholder="Nhập URL logo..."
                                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                                />
                            </div>
                            <p className="text-xs text-slate-400 mt-1.5">Dán link ảnh logo để thay đổi logo hiển thị trên sidebar.</p>
                        </div>
                    </div>
                </div>

                {/* Cấu hình vùng */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 md:p-6 shadow-sm">
                    <h3 className="text-sm font-bold text-blue-600 flex items-center gap-2 mb-5 uppercase tracking-wide">
                        <Globe size={16} /> {t('settings.region')}
                    </h3>
                    <div className="space-y-5">
                        <div>
                            <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                <Globe size={16} className="text-slate-400" /> {t('settings.language')}
                            </p>
                            <select
                                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white cursor-pointer shadow-sm"
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                            >
                                <option value="vi">Tiếng Việt (Việt Nam)</option>
                                <option value="en">English (US/UK)</option>
                                <option value="ja">日本語 (Nhật Bản)</option>
                                <option value="ko">한국어 (Hàn Quốc)</option>
                                <option value="zh">中文 (Trung Quốc)</option>
                            </select>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                                <Clock size={16} className="text-slate-400" /> {t('settings.timezone')}
                            </p>
                            <select className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white cursor-pointer shadow-sm">
                                <option>(GMT+07:00) Hà Nội, TP HCM, Bangkok</option>
                                <option>(GMT+08:00) Singapore, KL, Beijing</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Thông báo */}
                <div className="bg-white rounded-xl border border-slate-200 p-5 md:p-6 shadow-sm relative overflow-hidden flex flex-col justify-between">
                    <div>
                        <div className="absolute top-5 right-5 z-10">
                            <span className="bg-slate-100/80 border border-slate-200 text-slate-600 text-xs font-medium px-2 py-1 rounded-md">{t('settings.soon')}</span>
                        </div>
                        <h3 className="text-sm font-bold text-blue-600 flex items-center gap-2 mb-5 uppercase tracking-wide opacity-50">
                            <Bell size={16} /> {t('settings.notifications')}
                        </h3>
                        <div className="space-y-4 opacity-50 pointer-events-none">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-slate-700">{t('settings.emailNoti')}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{t('settings.emailNotiDesc')}</p>
                                </div>
                                <div className="w-10 h-5 bg-slate-200/80 rounded-full relative">
                                    <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm"></div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                                <div>
                                    <p className="text-sm font-medium text-slate-700">{t('settings.pushNoti')}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{t('settings.pushNotiDesc')}</p>
                                </div>
                                <div className="w-10 h-5 bg-slate-200/80 rounded-full relative">
                                    <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 left-0.5 shadow-sm"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-8 text-center pb-2">
                        <p className="text-[11px] text-blue-500/80 font-medium py-1 px-3 bg-blue-50/50 inline-block rounded-full">{t('settings.developing')}</p>
                    </div>
                </div>

            </div>
        </div>
    );
}
