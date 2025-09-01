import React, { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { useLanguage } from "../lib/i18n/LanguageContext";

export default function ThemeToggle({ theme, setTheme }) {
  const [mounted, setMounted] = useState(false);
  const { t } = useLanguage();

  // Evitar error de hidratación asegurándose de que el componente esté montado
  useEffect(() => {
    setMounted(true);
  }, []);

  // Durante la hidratación inicial, mostrar un ícono neutral para evitar mismatch
  if (!mounted) {
    return (
      <button
        className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-2.5 py-1.5 text-sm hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-800"
        aria-label="Toggle theme"
        title="Toggle theme"
        disabled
      >
        <div className="h-4 w-4" /> {/* Espacio reservado para el ícono */}
        <span className="hidden sm:inline">{t('theme')}</span>
      </button>
    );
  }

  return (
    <button
      className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-2.5 py-1.5 text-sm hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-800"
      onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      aria-label={t('theme')}
      title={t('theme')}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="hidden sm:inline">{theme === "dark" ? (t('lightMode') || "Light") : (t('darkMode') || "Dark")}</span>
    </button>
  );
}
