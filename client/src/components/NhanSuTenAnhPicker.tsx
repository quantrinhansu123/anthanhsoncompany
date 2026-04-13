import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, User } from 'lucide-react';
import type { NhanSuOption } from '../lib/formatNhanSu';

export function NhanSuAvatar({
    src,
    name,
    className = 'w-9 h-9 text-sm',
}: {
    src?: string | null;
    name: string;
    /** Kích thước + cỡ chữ placeholder, ví dụ w-8 h-8 text-xs */
    className?: string;
}) {
    const [err, setErr] = useState(false);
    const initial = name.trim().slice(0, 1).toUpperCase() || '?';
    if (src && !err) {
        return (
            <img
                src={src}
                alt=""
                className={`${className} rounded-full object-cover border border-slate-200 shrink-0 bg-slate-100`}
                onError={() => setErr(true)}
            />
        );
    }
    return (
        <div
            className={`${className} rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold shrink-0 border border-slate-200`}
        >
            {initial}
        </div>
    );
}

type Props = {
    value: string;
    onChange: (id: string) => void;
    employees: NhanSuOption[];
    placeholder?: string;
    className?: string;
    /** Ô lọc trong danh sách (gộp tìm + chọn) */
    enableSearch?: boolean;
};

/** Chọn nhân sự: chỉ hiển thị tên + ảnh (không mã) */
export function NhanSuTenAnhPicker({
    value,
    onChange,
    employees,
    placeholder,
    className,
    enableSearch = false,
}: Props) {
    const [open, setOpen] = useState(false);
    const [listQuery, setListQuery] = useState('');
    const rootRef = useRef<HTMLDivElement>(null);
    const selected = employees.find((e) => e.id === value);

    const listEmployees = useMemo(() => {
        if (!enableSearch || !listQuery.trim()) return employees;
        const t = listQuery.trim().toLowerCase();
        return employees.filter(
            (e) =>
                (e.full_name || '').toLowerCase().includes(t) || (e.code || '').toLowerCase().includes(t),
        );
    }, [employees, enableSearch, listQuery]);

    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    useEffect(() => {
        if (!open) setListQuery('');
    }, [open]);

    const ph = placeholder ?? 'Chọn nhân sự';

    return (
        <div ref={rootRef} className={`relative ${className ?? ''}`}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-center gap-3 px-3 py-2 min-h-[42px] bg-white border border-slate-300 rounded-md text-left hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
            >
                {selected ? (
                    <>
                        <NhanSuAvatar src={selected.anh_nhan_su} name={selected.full_name || ''} />
                        <span className="truncate flex-1 text-sm text-slate-800 font-medium">
                            {selected.full_name || '—'}
                        </span>
                    </>
                ) : (
                    <span className="flex items-center gap-2 flex-1 text-sm text-slate-400">
                        <User size={18} className="shrink-0 opacity-60" />
                        {ph}
                    </span>
                )}
                <ChevronDown
                    size={16}
                    className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>
            {open && (
                <ul className="absolute z-[80] mt-1 max-h-56 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg py-1">
                    {enableSearch ? (
                        <li className="px-2 py-1.5 border-b border-slate-100 sticky top-0 bg-white">
                            <input
                                type="search"
                                autoComplete="off"
                                value={listQuery}
                                onChange={(e) => setListQuery(e.target.value)}
                                onMouseDown={(e) => e.stopPropagation()}
                                placeholder="Gõ tìm tên hoặc mã…"
                                className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                            />
                        </li>
                    ) : null}
                    <li>
                        <button
                            type="button"
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 text-left"
                            onClick={() => {
                                onChange('');
                                setOpen(false);
                            }}
                        >
                            — {ph} —
                        </button>
                    </li>
                    {listEmployees.length === 0 && enableSearch && listQuery.trim() ? (
                        <li className="px-3 py-2 text-sm text-slate-500">Không tìm thấy nhân sự</li>
                    ) : (
                        listEmployees.map((emp) => (
                            <li key={emp.id}>
                                <button
                                    type="button"
                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 text-left"
                                    onClick={() => {
                                        onChange(emp.id);
                                        setOpen(false);
                                    }}
                                >
                                    <NhanSuAvatar src={emp.anh_nhan_su} name={emp.full_name || ''} />
                                    <span className="truncate text-sm text-slate-800">{emp.full_name || '—'}</span>
                                </button>
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    );
}
