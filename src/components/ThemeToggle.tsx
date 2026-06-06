import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex bg-slate-200/60 dark:bg-slate-800/60 p-1 rounded-lg border border-slate-300 dark:border-slate-700 shadow-inner">
      <button
        onClick={() => setTheme('light')}
        className={`flex items-center justify-center p-1.5 rounded-md transition-all ${
          theme === 'light'
            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-400 dark:border-slate-600'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 duration-200'
        }`}
        title="Light Mode"
      >
        <Sun size={14} />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={`flex items-center justify-center p-1.5 rounded-md transition-all ${
          theme === 'system'
            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-400 dark:border-slate-600'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 duration-200'
        }`}
        title="System Preference"
      >
        <Monitor size={14} />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`flex items-center justify-center p-1.5 rounded-md transition-all ${
          theme === 'dark'
            ? 'bg-slate-800 text-white shadow-sm border border-slate-900 dark:bg-slate-950 dark:border-slate-800'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 duration-200'
        }`}
        title="Dark Mode"
      >
        <Moon size={14} />
      </button>
    </div>
  );
}
