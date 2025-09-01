import React, { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { Switch } from "./ui/switch";

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // Evitar error de hidratación asegurándose de que el componente esté montado
  useEffect(() => {
    setMounted(true);
  }, []);

  // Durante la hidratación inicial, mostrar un switch neutral para evitar mismatch
  if (!mounted) {
    return (
      <div className="flex items-center gap-2 p-1">
        <Moon className="h-4 w-4 text-zinc-400" />
        <Switch disabled className="opacity-50" />
        <Sun className="h-4 w-4 text-zinc-400" />
      </div>
    );
  }

  const isDark = theme === "dark";

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  return (
    <div className="flex items-center gap-2 p-1">
      <Moon className={`h-4 w-4 transition-colors ${!isDark ? 'text-zinc-400 dark:text-zinc-600' : 'text-blue-400'}`} />
      <Switch 
        checked={isDark}
        onCheckedChange={toggleTheme}
        aria-label="Toggle theme"
        className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-zinc-300 dark:data-[state=unchecked]:bg-zinc-600"
      />
      <Sun className={`h-4 w-4 transition-colors ${isDark ? 'text-zinc-400 dark:text-zinc-600' : 'text-amber-500'}`} />
    </div>
  );
}
