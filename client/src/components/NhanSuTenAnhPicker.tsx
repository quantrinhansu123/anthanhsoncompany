import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, User } from 'lucide-react';
import type { NhanSuOption } from '../lib/formatNhanSu';

function Avatar({ src, name }: { src?: string | null; name: string }) {
    const [err, setErr] = useState(false);
    const initial = name.trim().slice(0, 1).toUpperCase() || '?';
    if (src && !err) {
        return (
            <img
                src={src}
                alt=""
                className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0 bg-slate-100"
                onError={() => setErr(true)}
            />
        );
    }
    return (
        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-sm font-bold shrink-0 border border-slate-200">
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
};

/** Chọn nhân sự: chỉ hiển thị tên + ảnh (không mã) */
export function NhanSuTenAnhPicker({ value, onChange, employees, placeholder, className }: Props) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const selected = employees.find((e) => e.id === value);

    useEffect(() => {
        const onDoc = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

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
                        <Avatar src={selected.anh_nhan_su} name={selected.full_name || ''} />
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
                    {employees.map((emp) => (
                        <li key={emp.id}>
                            <button
                                type="button"
                                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 text-left"
                                onClick={() => {
                                    onChange(emp.id);
                                    setOpen(false);
                                }}
                            >
                                <Avatar src={emp.anh_nhan_su} name={emp.full_name || ''} />
                                <span className="truncate text-sm text-slate-800">{emp.full_name || '—'}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
