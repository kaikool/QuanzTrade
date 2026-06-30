import React from "react";
import {
  FileText, Filter, Search, Pencil, Trash2, BookOpen, Plus, ChevronRight
} from "lucide-react";
import type { Trade } from "../types";

interface JournalViewProps {
  currentTab: string;
  setCurrentTab: (v: "dashboard" | "journal" | "calendar" | "news") => void;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  selectedPairFilter: string;
  setSelectedPairFilter: (v: string) => void;
  selectedStatusFilter: string;
  setSelectedStatusFilter: (v: string) => void;
  selectedJournalAccountId: string;
  setSelectedJournalAccountId: (v: string) => void;
  journalAccountOptions: { accountId: string; name: string }[];
  uniquePairs: string[];
  filteredTrades: Trade[];
  visibleCount: number;
  setVisibleCount: (v: number | ((prev: number) => number)) => void;
  mergedTrades: Trade[];
  darkMode: boolean;
  handleBeginEditTrade: (trade: Trade) => void;
  handleDeleteTrade: (id: string) => void;
  handleOpenAddTrade: () => void;
}

export function JournalView({
  searchQuery, setSearchQuery,
  selectedPairFilter, setSelectedPairFilter,
  selectedStatusFilter, setSelectedStatusFilter,
  selectedJournalAccountId, setSelectedJournalAccountId,
  journalAccountOptions,
  uniquePairs,
  filteredTrades,
  visibleCount, setVisibleCount,
  handleBeginEditTrade,
  handleDeleteTrade,
  handleOpenAddTrade,
}: JournalViewProps) {
  return (
    <div className="space-y-4" id="journal-standalone-section">
      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ios-secondary-label)]" />
        <input 
          type="text" 
          placeholder="Tìm kiếm giao dịch, cặp tiền, tag..." 
          value={searchQuery} 
          onChange={(e) => setSearchQuery(e.target.value)} 
          className="w-full pl-10 pr-4 py-2.5 bg-[var(--ios-surface-2)] rounded-[12px] text-[17px] focus:outline-none text-[var(--ios-label)] placeholder:text-[var(--ios-secondary-label)]/70 ios-glass border border-[var(--ios-separator)]/30 focus:border-[var(--ios-blue)]/50 transition-colors" 
        />
      </div>

      {/* Filters (Segmented Controls & Pills) */}
      <div className="flex flex-wrap items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {journalAccountOptions.length > 0 && (
          <div className="flex bg-[var(--ios-surface-2)] p-1 rounded-[12px] text-[13px] font-medium border border-[var(--ios-separator)] shrink-0">
            <button onClick={() => setSelectedJournalAccountId("ALL")} className={`px-3 py-1.5 rounded-[8px] transition-all duration-200 cursor-pointer ${selectedJournalAccountId === "ALL" ? "bg-[var(--ios-surface)] shadow-ios-sm text-[var(--ios-label)] font-semibold" : "text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)]"}`}>Tất cả TK</button>
            {journalAccountOptions.map((a) => (
              <button key={a.accountId} onClick={() => setSelectedJournalAccountId(a.accountId)} className={`px-3 py-1.5 rounded-[8px] transition-all duration-200 cursor-pointer ${selectedJournalAccountId === a.accountId ? "bg-[var(--ios-surface)] shadow-ios-sm text-[var(--ios-label)] font-semibold" : "text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)]"}`}>{a.name}</button>
            ))}
          </div>
        )}
        
        <div className="flex items-center gap-1.5 bg-[var(--ios-surface-2)] border border-[var(--ios-separator)] pl-3 pr-2 py-1 rounded-[12px] shrink-0 h-[36px]">
          <Filter size={14} className="text-[var(--ios-secondary-label)]" />
          <select value={selectedPairFilter} onChange={(e) => setSelectedPairFilter(e.target.value)} className="bg-transparent focus:outline-none cursor-pointer text-[var(--ios-label)] font-medium text-[13px] w-20 appearance-none">
            <option value="ALL">Cặp</option>
            {uniquePairs.filter(p => p !== "ALL").map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="flex bg-[var(--ios-surface-2)] p-1 rounded-[12px] text-[13px] font-medium border border-[var(--ios-separator)] shrink-0">
          <button onClick={() => setSelectedStatusFilter("ALL")} className={`px-3 py-1.5 rounded-[8px] transition-all duration-200 cursor-pointer ${selectedStatusFilter === "ALL" ? "bg-[var(--ios-surface)] shadow-ios-sm text-[var(--ios-label)] font-semibold" : "text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)]"}`}>Tất cả</button>
          <button onClick={() => setSelectedStatusFilter("OPEN")} className={`px-3 py-1.5 rounded-[8px] transition-all duration-200 cursor-pointer ${selectedStatusFilter === "OPEN" ? "bg-[var(--ios-surface)] shadow-ios-sm text-[var(--ios-label)] font-semibold" : "text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)]"}`}>Mở</button>
          <button onClick={() => setSelectedStatusFilter("CLOSED")} className={`px-3 py-1.5 rounded-[8px] transition-all duration-200 cursor-pointer ${selectedStatusFilter === "CLOSED" ? "bg-[var(--ios-surface)] shadow-ios-sm text-[var(--ios-label)] font-semibold" : "text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)]"}`}>Đã đóng</button>
        </div>

        <button onClick={() => handleOpenAddTrade()} className="h-[36px] px-3.5 bg-[var(--ios-blue)] text-white rounded-[12px] text-[13px] font-semibold cursor-pointer active:scale-95 transition-transform flex items-center gap-1.5 shrink-0 shadow-ios-sm ml-auto">
          <Plus size={16} /> Thêm
        </button>
      </div>

      {/* iOS Inset Grouped List (Unified for Desktop & Mobile) */}
      <div className="ios-glass ios26-card bg-[var(--ios-surface)] rounded-[24px] shadow-ios-md border border-[var(--ios-separator)]/50 overflow-hidden mb-6">
        {filteredTrades.length === 0 ? (
          <div className="text-center py-16 text-[var(--ios-secondary-label)]">
            <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-[17px] text-[var(--ios-label)]">Không tìm thấy giao dịch</p>
            <p className="text-[15px] mt-1">Vui lòng điều chỉnh bộ lọc hoặc thêm mới.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--ios-separator)]/60">
            {filteredTrades.slice(0, visibleCount).map((t) => (
              <div key={t.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-5 hover:bg-[var(--ios-surface-2)]/40 transition-colors group">
                
                {/* Left: Info */}
                <div className="flex gap-4 w-full sm:w-auto items-start sm:items-center">
                  <div className="hidden sm:block">
                    {(t.tv_snapshot_url || t.tv_snapshot_url_close) ? (
                      <div className="w-16 h-16 rounded-[12px] overflow-hidden bg-[var(--ios-surface-2)] border border-[var(--ios-separator)]">
                        <img src={t.tv_snapshot_url || t.tv_snapshot_url_close} className="w-full h-full object-cover" alt="chart" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-[12px] bg-[var(--ios-surface-2)] border border-[var(--ios-separator)] flex items-center justify-center">
                        <BookOpen size={20} className="text-[var(--ios-secondary-label)]/40" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold tracking-wide ${t.type === "BUY" ? "bg-[var(--sys-success-soft)] text-[var(--ios-green)]" : "bg-[var(--sys-danger-soft)] text-[var(--ios-red)]"}`}>{t.type}</span>
                      <span className="font-bold text-[17px] text-[var(--ios-label)]">{t.pair}</span>
                      {t.status === "OPEN" && <span className="bg-[var(--sys-tint-soft)] text-[var(--ios-blue)] text-[10px] px-1.5 py-0.5 rounded-full font-semibold">OPEN</span>}
                    </div>
                    <div className="text-[13px] text-[var(--ios-secondary-label)] font-mono tracking-tight flex items-center gap-1.5">
                      {t.size} lots <span className="text-[var(--ios-separator)]">•</span> {t.entry_price}{t.exit_price ? ` → ${t.exit_price}` : ""}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {t.tag && <span className="text-[11px] font-semibold text-[var(--ios-blue)] bg-[var(--sys-tint-soft)] px-2 py-0.5 rounded-md uppercase">{t.tag}</span>}
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span key={i} className={`text-[12px] ${i < (t.rating || 0) ? "text-amber-500" : "text-[var(--ios-secondary-label)]/30"}`}>★</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: P&L & Actions */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t border-[var(--ios-separator)]/40 sm:border-0">
                  <div className="text-left sm:text-right">
                    <span className={`text-[20px] font-bold font-mono tracking-tight ${(t.pnl || 0) >= 0 ? "text-[var(--ios-green)]" : "text-[var(--ios-red)]"}`}>
                      {(t.pnl || 0) >= 0 ? "+" : ""}${(t.pnl || 0).toFixed(0)}
                    </span>
                    <div className="text-[12px] text-[var(--ios-secondary-label)] mt-0.5">
                      {new Date(t.entry_date).toLocaleDateString("vi-VN")}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 mt-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleBeginEditTrade(t)} className="w-8 h-8 rounded-full bg-[var(--ios-surface-2)] text-[var(--ios-label)] cursor-pointer active:scale-90 transition-all flex items-center justify-center hover:bg-[var(--sys-tint-soft)] hover:text-[var(--ios-blue)]" title="Sửa">
                      <Pencil size={12} />
                    </button>
                    <button onClick={() => handleDeleteTrade(t.id)} className="w-8 h-8 rounded-full bg-[var(--ios-surface-2)] text-[var(--ios-label)] cursor-pointer active:scale-90 transition-all flex items-center justify-center hover:bg-[var(--sys-danger-soft)] hover:text-[var(--ios-red)]" title="Xoá">
                      <Trash2 size={12} />
                    </button>
                    <div className="w-8 h-8 flex items-center justify-center text-[var(--ios-tertiary-label)] sm:hidden">
                       <ChevronRight size={16} />
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
        
        {visibleCount < filteredTrades.length && (
          <div className="text-center py-4 bg-[var(--ios-surface-2)]/30 cursor-pointer hover:bg-[var(--ios-surface-2)]/50 transition-colors" onClick={() => setVisibleCount(prev => prev + 50)}>
            <span className="text-[15px] font-medium text-[var(--ios-blue)]">
              Tải thêm {filteredTrades.length - visibleCount} giao dịch
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
