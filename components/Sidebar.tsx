"use client"
import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import {
  PanelLeftClose,
  PanelLeftOpen,
  SearchIcon,
  Plus,
  Clock,
  Settings,
  Asterisk,
  X,
} from "lucide-react"
import SidebarSection from "./SidebarSection"
import ConversationRow from "./ConversationRow"
import ThemeToggle from "./ThemeToggle"
import SearchModal from "./SearchModal"
import SettingsPopover from "./SettingsPopover"
import { useLanguage } from "../lib/i18n/LanguageContext"
import { Conversation } from "@/lib/types/chat"
import { ConversationSkeleton } from "./ui/skeleton"
import { LoadingSpinner } from "./ui/loading-spinner"

interface CollapsedState {
  pinned: boolean;
  recent: boolean;
}

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  collapsed: CollapsedState;
  setCollapsed: React.Dispatch<React.SetStateAction<CollapsedState>>;
  conversations: Conversation[];
  pinned: Conversation[];
  recent: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  togglePin: (id: string) => void;
  query: string;
  setQuery: (query: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  createNewChat: () => void;
  sidebarCollapsed?: boolean;
  setSidebarCollapsed?: (collapsed: boolean) => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => Promise<void>;
  isLoadingConversations?: boolean;
}

// ========== Componente interno para el contenido del sidebar ==========
function SidebarContent({
  collapsed,
  setCollapsed,
  recent,
  selectedId,
  onSelect,
  togglePin,
  query,
  setQuery,
  searchRef,
  createNewChat,
  hasMore,
  isLoadingMore,
  onLoadMore,
  isLoadingConversations,
  onShowSearch,
  onClose,
  showCollapseButton = false,
  onCollapse,
  isMobile = false,
}: {
  collapsed: CollapsedState;
  setCollapsed: React.Dispatch<React.SetStateAction<CollapsedState>>;
  recent: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  togglePin: (id: string) => void;
  query: string;
  setQuery: (query: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  createNewChat: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => Promise<void>;
  isLoadingConversations?: boolean;
  onShowSearch: () => void;
  onClose?: () => void;
  showCollapseButton?: boolean;
  onCollapse?: () => void;
  isMobile?: boolean;
}) {
  const { t } = useLanguage();

  // Handler para seleccionar conversación y cerrar sidebar en móvil
  const handleSelect = (id: string) => {
    onSelect(id);
    if (isMobile && onClose) {
      // Pequeño delay para que la animación se vea bien
      setTimeout(() => onClose(), 100);
    }
  };

  // Handler para crear chat y cerrar en móvil
  const handleCreateNewChat = () => {
    createNewChat();
    // No cerramos aquí porque createNewChat ya lo hace
  };

  return (
    <>
      {/* Header del sidebar */}
      <div className="flex items-center gap-2 border-b border-zinc-200/60 px-3 py-3 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-sm dark:from-zinc-200 dark:to-zinc-300 dark:text-zinc-900">
            <Asterisk className="h-4 w-4" />
          </div>
          <div className="text-sm font-semibold tracking-tight">AI Assistant</div>
        </div>
        <div className="ml-auto flex items-center gap-1">
          {/* Botón colapsar (solo desktop) */}
          {showCollapseButton && onCollapse && (
            <button
              onClick={onCollapse}
              className="rounded-xl p-2 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-zinc-800"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          )}
          {/* Botón cerrar (solo móvil) */}
          {isMobile && onClose && (
            <button
              onClick={onClose}
              className="rounded-xl p-2 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-zinc-800"
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Barra de búsqueda */}
      <div className="px-3 pt-3">
        <label htmlFor={isMobile ? "search-mobile" : "search-desktop"} className="sr-only">
          {t('search')}
        </label>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            id={isMobile ? "search-mobile" : "search-desktop"}
            ref={isMobile ? undefined : searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search')}
            onClick={onShowSearch}
            onFocus={onShowSearch}
            readOnly
            className="w-full rounded-full border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm outline-none ring-0 placeholder:text-zinc-400 cursor-pointer hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950/50 dark:hover:border-zinc-700"
          />
        </div>
      </div>

      {/* Botón nuevo chat */}
      <div className="px-3 pt-3">
        <button
          onClick={handleCreateNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          title={t('newChat')}
        >
          <Plus className="h-4 w-4" /> {t('newChat')}
        </button>
      </div>

      {/* Lista de conversaciones */}
      <nav className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2 pb-4">
        <SidebarSection
          icon={<Clock className="h-4 w-4" />}
          title={t('recent').toUpperCase()}
          collapsed={collapsed.recent}
          onToggle={() => setCollapsed({ ...collapsed, recent: !collapsed.recent })}
        >
          {isLoadingConversations ? (
            <ConversationSkeleton />
          ) : recent.length === 0 ? (
            <div className="select-none rounded-lg border border-dashed border-zinc-200 px-3 py-3 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              {t('noMessagesYet')}
            </div>
          ) : (
            recent.map((c) => (
              <ConversationRow
                key={c.id}
                data={c}
                active={c.id === selectedId}
                onSelect={() => handleSelect(c.id)}
                onTogglePin={() => togglePin(c.id)}
                showMeta
              />
            ))
          )}
          
          {/* Botón cargar más conversaciones */}
          {hasMore && onLoadMore && !isLoadingConversations && (
            <div className="mt-2 px-2">
              <button
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-600 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800/50"
              >
                {isLoadingMore && <LoadingSpinner size="sm" />}
                {isLoadingMore ? t('loading') : t('loadMoreConversations')}
              </button>
            </div>
          )}
        </SidebarSection>
      </nav>

      {/* Footer del sidebar */}
      <div className="mt-auto border-t border-zinc-200/60 px-3 py-3 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <SettingsPopover>
            <button className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-zinc-800">
              <Settings className="h-4 w-4" /> {t('settings')}
            </button>
          </SettingsPopover>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 rounded-xl bg-zinc-50 p-2 dark:bg-zinc-800/60">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-white dark:text-zinc-900">
            JD
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">John Doe</div>
            <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">Pro workspace</div>
          </div>
        </div>
      </div>
    </>
  );
}

// ========== Componente principal del Sidebar ==========
export default function Sidebar({
  open,
  onClose,
  collapsed,
  setCollapsed,
  conversations,
  pinned,
  recent,
  selectedId,
  onSelect,
  togglePin,
  query,
  setQuery,
  searchRef,
  createNewChat,
  sidebarCollapsed = false,
  setSidebarCollapsed = () => {},
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  isLoadingConversations = false,
}: SidebarProps) {
  const { t } = useLanguage();
  const [showSearchModal, setShowSearchModal] = useState(false);

  // ========== Sidebar colapsado (solo desktop) ==========
  if (sidebarCollapsed) {
    return (
      <aside className="hidden md:flex z-50 h-full w-16 shrink-0 flex-col border-r border-zinc-200/60 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-center border-b border-zinc-200/60 px-3 py-3 dark:border-zinc-800">
          <button
            onClick={() => setSidebarCollapsed(false)}
            className="rounded-xl p-2 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-zinc-800"
            aria-label="Open sidebar"
            title="Open sidebar"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center gap-4 pt-4">
          <button
            onClick={createNewChat}
            className="rounded-xl p-2 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-zinc-800"
            title={t('newChat')}
          >
            <Plus className="h-5 w-5" />
          </button>

          <button
            onClick={() => setShowSearchModal(true)}
            className="rounded-xl p-2 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-zinc-800"
            title="Search"
          >
            <SearchIcon className="h-5 w-5" />
          </button>

          <div className="mt-auto mb-4">
            <SettingsPopover>
              <button
                className="rounded-xl p-2 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-zinc-800"
                title={t('settings')}
              >
                <Settings className="h-5 w-5" />
              </button>
            </SettingsPopover>
          </div>
        </div>

        <SearchModal
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          conversations={conversations}
          selectedId={selectedId}
          onSelect={onSelect}
          togglePin={togglePin}
          createNewChat={createNewChat}
        />
      </aside>
    );
  }

  return (
    <>
      {/* ========== MOBILE: Overlay + Sidebar animado ========== */}
      <AnimatePresence>
        {open && (
          <>
            {/* Overlay oscuro - clickeable para cerrar */}
            <motion.div
              key="sidebar-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 z-40 bg-black/60"
              onClick={onClose}
              aria-hidden="true"
            />
            
            {/* Sidebar móvil animado */}
            <motion.aside
              key="sidebar-mobile"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="md:hidden fixed inset-y-0 left-0 z-50 flex h-full w-80 max-w-[85vw] flex-col bg-white shadow-2xl dark:bg-zinc-900"
            >
              <SidebarContent
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                recent={recent}
                selectedId={selectedId}
                onSelect={onSelect}
                togglePin={togglePin}
                query={query}
                setQuery={setQuery}
                searchRef={searchRef}
                createNewChat={createNewChat}
                hasMore={hasMore}
                isLoadingMore={isLoadingMore}
                onLoadMore={onLoadMore}
                isLoadingConversations={isLoadingConversations}
                onShowSearch={() => setShowSearchModal(true)}
                onClose={onClose}
                isMobile={true}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ========== DESKTOP: Sidebar estático ========== */}
      <aside className="hidden md:flex z-50 h-full w-80 shrink-0 flex-col border-r border-zinc-200/60 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <SidebarContent
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          recent={recent}
          selectedId={selectedId}
          onSelect={onSelect}
          togglePin={togglePin}
          query={query}
          setQuery={setQuery}
          searchRef={searchRef}
          createNewChat={createNewChat}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={onLoadMore}
          isLoadingConversations={isLoadingConversations}
          onShowSearch={() => setShowSearchModal(true)}
          showCollapseButton={true}
          onCollapse={() => setSidebarCollapsed(true)}
          isMobile={false}
        />
      </aside>

      {/* Modal de búsqueda (compartido) */}
      <SearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        conversations={conversations}
        selectedId={selectedId}
        onSelect={onSelect}
        togglePin={togglePin}
        createNewChat={createNewChat}
      />
    </>
  );
}
