import { cls } from "@/lib/utils/helpers";

interface MessageProps {
  role: "user" | "assistant";
  children: React.ReactNode;
  isNew?: boolean; // Para controlar la animación de entrada
}

export default function Message({ role, children, isNew = false }: MessageProps) {
  const isUser = role === "user";
  return (
    <div 
      className={cls(
        "flex gap-2 sm:gap-3 transition-all duration-500 ease-out",
        isUser ? "justify-end" : "justify-start",
        // Animación de entrada suave
        isNew 
          ? "animate-in slide-in-from-bottom-2 fade-in-0" 
          : "opacity-100 translate-y-0"
      )}
    >
      {!isUser && (
        <div className="mt-0.5 grid h-6 w-6 sm:h-7 sm:w-7 shrink-0 place-items-center rounded-full bg-zinc-900 text-[9px] sm:text-[10px] font-bold text-white dark:bg-white dark:text-zinc-900">
          AI
        </div>
      )}
      <div
        className={cls(
          "max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm transition-all duration-300 ease-out break-words",
          // Animación específica para el contenido de la burbuja
          isNew && "animate-in fade-in-0 slide-in-from-bottom-1",
          isUser
            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
            : "bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-800",
        )}
      >
        {children}
      </div>
      {isUser && (
        <div className="mt-0.5 grid h-6 w-6 sm:h-7 sm:w-7 shrink-0 place-items-center rounded-full bg-zinc-900 text-[9px] sm:text-[10px] font-bold text-white dark:bg-white dark:text-zinc-900">
          JD
        </div>
      )}
    </div>
  );
}
