import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../lib/i18n';

type Theme = 'light' | 'dark' | 'system';

const DEFAULT_LOGO_URL = 'https://www.appsheet.com/template/gettablefileurl?appName=Appsheet-325045268&tableName=Kho%20%E1%BA%A3nh&fileName=Kho%20%E1%BA%A3nh_Images%2F13c7458d.%E1%BA%A2nh.064848.jpg';

interface SettingsContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    color: string;
    setColor: (color: string) => void;
    fontFamily: string;
    setFontFamily: (font: string) => void;
    fontSize: string;
    setFontSize: (size: string) => void;
    language: string;
    setLanguage: (lang: string) => void;
    logoUrl: string;
    setLogoUrl: (url: string) => void;
    t: (key: string) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('app-theme') as Theme) || 'light');
    const [color, setColor] = useState(() => localStorage.getItem('app-color') || 'blue');
    const [fontFamily, setFontFamily] = useState(() => localStorage.getItem('app-font') || 'Inter');
    const [fontSize, setFontSize] = useState(() => localStorage.getItem('app-fontsize') || 'Trung bình');
    const [language, setLanguage] = useState(() => localStorage.getItem('app-lang') || 'vi');
    const [logoUrl, setLogoUrl] = useState(() => localStorage.getItem('app-logo') || DEFAULT_LOGO_URL);

    useEffect(() => {
        localStorage.setItem('app-theme', theme);
        localStorage.setItem('app-color', color);
        localStorage.setItem('app-font', fontFamily);
        localStorage.setItem('app-fontsize', fontSize);
        localStorage.setItem('app-lang', language);
        localStorage.setItem('app-logo', logoUrl);

        // Apply Theme (Dark Mode)
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');

        if (theme === 'system') {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            root.classList.add(systemTheme);
        } else {
            root.classList.add(theme);
        }

        // Apply Font Family
        const fontMap: Record<string, string> = {
            'Inter': 'Inter, sans-serif',
            'Roboto': 'Roboto, sans-serif',
            'Open Sans': '"Open Sans", sans-serif'
        };
        root.style.setProperty('--font-family', fontMap[fontFamily] || 'Inter, sans-serif');
        root.style.fontFamily = fontMap[fontFamily] || 'Inter, sans-serif';

        // Apply Font Size
        const sizeMap: Record<string, string> = {
            'Nhỏ': '14px',
            'Trung bình': '16px',
            'Lớn': '18px'
        };
        root.style.fontSize = sizeMap[fontSize] || '16px';

        // Apply Primary Color Override Dynamically (Tailwind v4 hack for overriding default blue)
        let styleEl = document.getElementById('dynamic-theme-vars');
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.id = 'dynamic-theme-vars';
            document.head.appendChild(styleEl);
        }

        // Bằng cách ghi đè biến CSS của Tailwind v4, ta có thể đổi màu blue thành màu khác
        if (color !== 'blue') {
            let colorScale = color;
            if (color === 'green') colorScale = 'emerald';
            if (color === 'gray') colorScale = 'slate';

            styleEl.innerHTML = `
        :root, html, body {
          --color-blue-50: var(--color-${colorScale}-50, #f8fafc);
          --color-blue-100: var(--color-${colorScale}-100, #f1f5f9);
          --color-blue-200: var(--color-${colorScale}-200, #e2e8f0);
          --color-blue-300: var(--color-${colorScale}-300, #cbd5e1);
          --color-blue-400: var(--color-${colorScale}-400, #94a3b8);
          --color-blue-500: var(--color-${colorScale}-500, #64748b);
          --color-blue-600: var(--color-${colorScale}-600, #475569);
          --color-blue-700: var(--color-${colorScale}-700, #334155);
          --color-blue-800: var(--color-${colorScale}-800, #1e293b);
          --color-blue-900: var(--color-${colorScale}-900, #0f172a);
        }
      `;
        } else {
            styleEl.innerHTML = '';
        }

    }, [theme, color, fontFamily, fontSize, language, logoUrl]);

    const t = (key: string): string => {
        return translations[language]?.[key] || translations['vi']?.[key] || key;
    };

    return (
        <SettingsContext.Provider value={{
            theme, setTheme,
            color, setColor,
            fontFamily, setFontFamily,
            fontSize, setFontSize,
            language, setLanguage,
            logoUrl, setLogoUrl,
            t
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
