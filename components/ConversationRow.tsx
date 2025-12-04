import React from "react";
import { Star } from "lucide-react";
import { useLanguage } from "../lib/i18n/LanguageContext";
import { cls, timeAgo } from "@/lib/utils/helpers";
import { Conversation } from "@/lib/types/chat";

interface ConversationRowProps {
  data: Conversation;
  active: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
  showMeta: boolean;
}

export default function ConversationRow({ data, active, onSelect, onTogglePin, showMeta }: ConversationRowProps) {
  const { t, language } = useLanguage();
  
  return (
    <div className="group relative">
      <div
        className={cls(
          "-mx-1 flex w-[calc(100%+8px)] items-center gap-2 rounded-lg px-2 py-2.5 sm:py-2 cursor-pointer touch-manipulation",
          active
            ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800/60 dark:text-zinc-100"
            : "hover:bg-zinc-100 dark:hover:bg-zinc-800 active:bg-zinc-100 dark:active:bg-zinc-800"
        )}
        onClick={onSelect}
        title={data.preview || data.title}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium tracking-tight">{data.title}</span>
            <span className="shrink-0 text-[11px] text-zinc-500 dark:text-zinc-400">
              {timeAgo(data.updatedAt || new Date().toISOString(), language)}
            </span>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          title={data.pinned ? t('unpin') : t('pin')}
          className="rounded-md p-1 text-zinc-500 opacity-0 transition group-hover:opacity-100 hover:bg-zinc-200/50 dark:text-zinc-300 dark:hover:bg-zinc-700/60"
          aria-label={data.pinned ? t('unpinConversation') : t('pinConversation')}
        >
          {/* {data.pinned ? (
            <Star className="h-4 w-4 fill-zinc-800 text-zinc-800 dark:fill-zinc-200 dark:text-zinc-200" />
          ) : (
            <Star className="h-4 w-4" />
          )} */}
        </button>
      </div>
    </div>
  );
}
