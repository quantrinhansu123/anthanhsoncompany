import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations } from '../lib/i18n';
import { settingService } from '../lib/services/settingService';

type Theme = 'light' | 'dark' | 'system';

const DEFAULT_LOGO_URL = 'https://www.appsheet.com/template/gettablefileurl?appName=Appsheet-325045268&tableName=Kho%20%E1%BA%A3nh&fileName=Kho%20%E1%BA%A3nh_Images%2F13c7458d.%E1%BA%A2nh.064848.jpg';
const DEFAULT_USER_ID = 'default'; // Có thể thay đổi sau khi có authentication

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
    timezone: string;
    setTimezone: (timezone: string) => void;
    emailNotifications: boolean;
    setEmailNotifications: (enabled: boolean) => void;
    pushNotifications: boolean;
    setPushNotifications: (enabled: boolean) => void;
    t: (key: string) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    // Load từ database hoặc dùng giá trị mặc định
    const [theme, setThemeState] = useState<Theme>('light');
    const [color, setColorState] = useState('blue');
    const [fontFamily, setFontFamilyState] = useState('Inter');
    const [fontSize, setFontSizeState] = useState('Trung bình');
    const [language, setLanguageState] = useState('vi');
    const [logoUrl, setLogoUrlState] = useState(DEFAULT_LOGO_URL);
    const [timezone, setTimezoneState] = useState('(GMT+07:00) Hà Nội, TP HCM, Bangkok');
    const [emailNotifications, setEmailNotificationsState] = useState(false);
    const [pushNotifications, setPushNotificationsState] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // Load settings từ database khi component mount
    useEffect(() => {
        (async () => {
            try {
                const setting = await settingService.get(DEFAULT_USER_ID);
                if (setting) {
                    setThemeState((setting.theme as Theme) || 'light');
                    setColorState(setting.color || 'blue');
                    setFontFamilyState(setting.font_family || 'Inter');
                    setFontSizeState(setting.font_size || 'Trung bình');
                    setLanguageState(setting.language || 'vi');
                    setLogoUrlState(setting.logo_url || DEFAULT_LOGO_URL);
                    setTimezoneState(setting.timezone || '(GMT+07:00) Hà Nội, TP HCM, Bangkok');
                    setEmailNotificationsState(setting.email_notifications ?? false);
                    setPushNotificationsState(setting.push_notifications ?? false);
                }
            } catch (error) {
                console.error('Error loading settings from database:', error);
                // Fallback to localStorage nếu database lỗi
                setThemeState((localStorage.getItem('app-theme') as Theme) || 'light');
                setColorState(localStorage.getItem('app-color') || 'blue');
                setFontFamilyState(localStorage.getItem('app-font') || 'Inter');
                setFontSizeState(localStorage.getItem('app-fontsize') || 'Trung bình');
                setLanguageState(localStorage.getItem('app-lang') || 'vi');
                setLogoUrlState(localStorage.getItem('app-logo') || DEFAULT_LOGO_URL);
            } finally {
                setIsLoaded(true);
            }
        })();
    }, []);

    // Hàm save vào database với debounce
    const saveToDatabase = useCallback(async (updates: Partial<any>) => {
        try {
            await settingService.upsert(DEFAULT_USER_ID, updates);
        } catch (error) {
            console.error('Error saving settings to database:', error);
        }
    }, []);

    // Wrapper functions để save vào database khi thay đổi
    const setTheme = useCallback((newTheme: Theme) => {
        setThemeState(newTheme);
        saveToDatabase({ theme: newTheme });
    }, [saveToDatabase]);

    const setColor = useCallback((newColor: string) => {
        setColorState(newColor);
        saveToDatabase({ color: newColor });
    }, [saveToDatabase]);

    const setFontFamily = useCallback((newFont: string) => {
        setFontFamilyState(newFont);
        saveToDatabase({ font_family: newFont });
    }, [saveToDatabase]);

    const setFontSize = useCallback((newSize: string) => {
        setFontSizeState(newSize);
        saveToDatabase({ font_size: newSize });
    }, [saveToDatabase]);

    const setLanguage = useCallback((newLang: string) => {
        setLanguageState(newLang);
        saveToDatabase({ language: newLang });
    }, [saveToDatabase]);

    const setLogoUrl = useCallback((newUrl: string) => {
        setLogoUrlState(newUrl);
        saveToDatabase({ logo_url: newUrl });
    }, [saveToDatabase]);

    const setTimezone = useCallback((newTimezone: string) => {
        setTimezoneState(newTimezone);
        saveToDatabase({ timezone: newTimezone });
    }, [saveToDatabase]);

    const setEmailNotifications = useCallback((enabled: boolean) => {
        setEmailNotificationsState(enabled);
        saveToDatabase({ email_notifications: enabled });
    }, [saveToDatabase]);

    const setPushNotifications = useCallback((enabled: boolean) => {
        setPushNotificationsState(enabled);
        saveToDatabase({ push_notifications: enabled });
    }, [saveToDatabase]);

    useEffect(() => {
        if (!isLoaded) return; // Chờ load xong mới apply

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

    }, [theme, color, fontFamily, fontSize, language, logoUrl, isLoaded]);

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
            timezone, setTimezone,
            emailNotifications, setEmailNotifications,
            pushNotifications, setPushNotifications,
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
