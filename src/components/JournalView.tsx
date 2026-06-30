import React from "react";
import {
  FileText, Filter, Search, Pencil, Trash2, BookOpen,
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
  currentTab, setCurrentTab,
  searchQuery, setSearchQuery,
  selectedPairFilter, setSelectedPairFilter,
  selectedStatusFilter, setSelectedStatusFilter,
  selectedJournalAccountId, setSelectedJournalAccountId,
  journalAccountOptions,
  uniquePairs,
  filteredTrades,
  visibleCount, setVisibleCount,
  mergedTrades,
  darkMode,
  handleBeginEditTrade,
  handleDeleteTrade,
  handleOpenAddTrade,
}: JournalViewProps) {
  return (
    <div className="grid grid-cols-1 gap-6" id="journal-standalone-section">
      <div className="p-4 sm:p-5 bg-[var(--ios-surface)] rounded-[20px] border border-[var(--ios-separator)] shadow-ios-sm">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-semibold text-[var(--ios-label)] flex items-center gap-1.5">
            <FileText className="text-[var(--ios-blue)]" size={16} />
            Lịch sử giao dịch
          </h3>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Account filter */}
            <div className="flex items-center gap-1 bg-[var(--ios-surface-2)] border border-[var(--ios-separator)] px-2.5 py-1.5 rounded-[10px] text-sm">
              <select value={selectedJournalAccountId} onChange={(e) => setSelectedJournalAccountId(e.target.value)} className="bg-transparent focus:outline-none cursor-pointer text-[var(--ios-label)] font-medium text-sm max-w-[120px]">
                <option value="">Tất cả</option>
                {journalAccountOptions.map((a) => (
                  <option key={a.accountId} value={a.accountId}>{a.name}</option>
                ))}
              </select>
            </div>
            {/* Pair filter */}
            <div className="flex items-center gap-1 bg-[var(--ios-surface-2)] border border-[var(--ios-separator)] px-2.5 py-1.5 rounded-[10px] text-sm">
              <Filter size={12} className="text-[var(--ios-secondary-label)]" />
              <select value={selectedPairFilter} onChange={(e) => setSelectedPairFilter(e.target.value)} className="bg-transparent focus:outline-none cursor-pointer text-[var(--ios-label)] font-medium text-sm max-w-[100px]">
                <option value="ALL">Cặp: Tất cả</option>
                {uniquePairs.filter(p => p !== "ALL").map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            {/* Status filter */}
            <div className="flex items-center gap-1 bg-[var(--ios-surface-2)] border border-[var(--ios-separator)] px-2.5 py-1.5 rounded-[10px] text-sm">
              <select value={selectedStatusFilter} onChange={(e) => setSelectedStatusFilter(e.target.value)} className="bg-transparent focus:outline-none cursor-pointer text-[var(--ios-label)] font-medium text-sm">
                <option value="ALL">Tất cả lệnh</option>
                <option value="OPEN">Mở (OPEN)</option>
                <option value="CLOSED">Đã Đóng (CLOSED)</option>
              </select>
            </div>
            <button onClick={() => handleOpenAddTrade()} className="h-8 px-3 bg-[var(--ios-blue)] text-white rounded-[8px] text-xs font-semibold cursor-pointer active:scale-90 transition-transform">
              + Thêm lệnh
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ios-secondary-label)]" />
          <input type="text" placeholder="Tìm kiếm cặp tiền, notes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} id="trade-search-input" className="w-full pl-9 pr-4 py-2 bg-[var(--ios-surface-2)] rounded-[10px] text-sm border border-[var(--ios-separator)]/50 focus:border-[var(--ios-blue)] focus:outline-none text-[var(--ios-label)] placeholder:text-[var(--ios-secondary-label)]/50" />
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto" id="trades-table-scroller">
          {filteredTrades.length === 0 ? (
            <div className="text-center py-12 text-[var(--ios-secondary-label)]">
              <BookOpen size={36} className="mx-auto mb-2 opacity-40" />
              <p className="font-semibold">Không tìm thấy giao dịch</p>
              <p className="text-sm mt-1">Sử dụng bộ lọc khác hoặc thêm lệnh mới.</p>
            </div>
          ) : (
            <>
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="border-b border-[var(--ios-separator)] text-[11px] font-semibold uppercase text-[var(--ios-secondary-label)] tracking-wider">
                    <th className="py-3 px-3">Cặp / Hướng</th>
                    <th className="py-3 px-3">Khối lượng</th>
                    <th className="py-3 px-3">Vào → Ra / SL • TP</th>
                    <th className="py-3 px-3">Tag</th>
                    <th className="py-3 px-3 text-right">Lời / Lỗ</th>
                    <th className="py-3 px-3 text-center">Sửa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ios-separator)]/60">
                  {filteredTrades.slice(0, visibleCount).map((t) => {
                    const pnlBarWidth = Math.min(Math.abs(t.pnl) / 1000, 1) * 100;
                    return (
                      <tr key={t.id} className="hover:bg-[var(--ios-surface-2)]/50 transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${t.type === "BUY" ? "bg-[var(--ios-green)]/10 text-[var(--ios-green)]" : "bg-[var(--ios-red)]/10 text-[var(--ios-red)]"}`}>{t.type}</span>
                            <span className="font-semibold text-sm text-[var(--ios-label)]">{t.pair}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${t.status === "OPEN" ? "bg-[var(--ios-blue)]/10 text-[var(--ios-blue)]" : "bg-[var(--ios-surface-2)] text-[var(--ios-secondary-label)]"}`}>{t.status}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-sm text-[var(--ios-label)] font-mono">{t.size}</td>
                        <td className="py-3 px-3">
                          <div className="text-sm text-[var(--ios-label)] font-mono">{t.entry_price}{t.exit_price ? ` → ${t.exit_price}` : ""}</div>
                          <div className="text-[11px] text-[var(--ios-secondary-label)]">SL: {t.stop_loss ?? "—"} • TP: {t.take_profit ?? "—"}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-1">
                            {t.tag && <span className="text-[10px] uppercase tracking-wider bg-[var(--ios-blue)]/10 text-[var(--ios-blue)] px-1.5 py-0.5 rounded font-bold w-fit">{t.tag}</span>}
                            <div className="flex gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <span key={i} className={`text-[10px] ${i < (t.rating || 0) ? "text-amber-500" : "text-[var(--ios-secondary-label)]/40"}`}>★</span>
                              ))}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-sm font-bold ${(t.pnl || 0) >= 0 ? "text-[var(--ios-green)]" : "text-[var(--ios-red)]"}`}>{(t.pnl || 0) >= 0 ? "+" : ""}${(t.pnl || 0).toFixed(0)}</span>
                            <div className="w-20 h-1 bg-[var(--ios-surface-2)] rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${(t.pnl || 0) >= 0 ? "bg-[var(--ios-green)]" : "bg-[var(--ios-red)]"}`} style={{ width: `${pnlBarWidth}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleBeginEditTrade(t)} className="p-1.5 rounded-[8px] bg-[var(--ios-surface-2)] border border-[var(--ios-separator)] text-[var(--ios-secondary-label)] hover:text-[var(--ios-blue)] cursor-pointer active:scale-90 transition-all" title="Sửa">
                              <Pencil size={11} />
                            </button>
                            <button onClick={() => handleDeleteTrade(t.id)} className="p-1.5 rounded-[8px] bg-[var(--ios-surface-2)] border border-[var(--ios-separator)] text-[var(--ios-secondary-label)] hover:text-[var(--ios-red)] cursor-pointer active:scale-90 transition-all" title="Xoá">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {visibleCount < filteredTrades.length && (
                <div className="text-center py-3">
                  <button onClick={() => setVisibleCount(prev => prev + 50)} className="px-4 py-2 rounded-full bg-[var(--ios-surface-2)] border border-[var(--ios-separator)] text-[var(--ios-label)] text-sm font-semibold cursor-pointer active:scale-95 transition-transform">
                    Xem thêm ({filteredTrades.length - visibleCount} giao dịch)
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="block md:hidden space-y-2" id="trades-mobile-scroller">
          {filteredTrades.length === 0 ? (
            <div className="text-center py-12 text-[var(--ios-secondary-label)]">
              <BookOpen size={36} className="mx-auto mb-2 opacity-40" />
              <p className="font-semibold">Không tìm thấy giao dịch</p>
              <p className="text-sm mt-1">Sử dụng bộ lọc khác hoặc thêm lệnh mới.</p>
            </div>
          ) : (
            filteredTrades.slice(0, visibleCount).map((t) => {
              const pnlBarWidth = Math.min(Math.abs(t.pnl) / 1000, 1) * 100;
              return (
                <div key={t.id} className="bg-[var(--ios-surface)] rounded-[16px] border border-[var(--ios-separator)] shadow-ios-sm overflow-hidden">
                  {/* Chart snaps */}
                  {(t.tv_snapshot_url || t.tv_snapshot_url_close) && (
                    <div className={`grid ${t.tv_snapshot_url && t.tv_snapshot_url_close ? "grid-cols-2 gap-0.5" : "grid-cols-1"}`}>
                      {t.tv_snapshot_url && <img src={t.tv_snapshot_url} alt="" className="w-full h-24 object-cover" />}
                      {t.tv_snapshot_url_close && <img src={t.tv_snapshot_url_close} alt="" className="w-full h-24 object-cover" />}
                    </div>
                  )}
                  <div className="p-3.5 space-y-2.5">
                    {/* Header row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${t.type === "BUY" ? "bg-[var(--ios-green)]/10 text-[var(--ios-green)]" : "bg-[var(--ios-red)]/10 text-[var(--ios-red)]"}`}>{t.type}</span>
                        <span className="font-semibold text-sm text-[var(--ios-label)]">{t.pair}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${t.status === "OPEN" ? "bg-[var(--ios-blue)]/10 text-[var(--ios-blue)]" : "bg-[var(--ios-surface-2)] text-[var(--ios-secondary-label)]"}`}>{t.status}</span>
                      </div>
                      <span className={`text-base font-black ${(t.pnl || 0) >= 0 ? "text-[var(--ios-green)]" : "text-[var(--ios-red)]"}`}>{(t.pnl || 0) >= 0 ? "+" : ""}${(t.pnl || 0).toFixed(0)}</span>
                    </div>
                    {/* Details */}
                    <div className="flex items-center gap-3 text-xs text-[var(--ios-secondary-label)]">
                      <span>{t.entry_price}{t.exit_price ? ` → ${t.exit_price}` : ""}</span>
                      <span>•</span>
                      <span>{t.size} lots</span>
                      <span>•</span>
                      <span>{new Date(t.entry_date).toLocaleDateString("vi-VN")}</span>
                    </div>
                    {/* SL/TP */}
                    {(t.stop_loss || t.take_profit) && (
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-[var(--ios-red)]">SL: {t.stop_loss ?? "—"}</span>
                        <span className="text-[var(--ios-green)]">TP: {t.take_profit ?? "—"}</span>
                      </div>
                    )}
                    {/* Tags + Rating */}
                    <div className="flex items-center justify-between pt-2 border-t border-[var(--ios-separator)]/15">
                      <div className="flex items-center gap-2 flex-wrap">
                        {t.tag && <span className="text-[10px] uppercase tracking-wider bg-[var(--ios-blue)]/10 text-[var(--ios-blue)] px-2 py-0.5 rounded-full font-bold">{t.tag}</span>}
                        <div className="flex gap-px">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className={`text-[11px] ${i < (t.rating || 0) ? "text-amber-500" : "text-[var(--ios-secondary-label)]/40"}`}>★</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleBeginEditTrade(t)} className="p-1.5 rounded-[8px] bg-[var(--ios-surface-2)] border border-[var(--ios-separator)] text-[var(--ios-secondary-label)] hover:text-[var(--ios-blue)] cursor-pointer active:scale-90 transition-all" title="Sửa">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => handleDeleteTrade(t.id)} className="p-1.5 rounded-[8px] bg-[var(--ios-surface-2)] border border-[var(--ios-separator)] text-[var(--ios-secondary-label)] hover:text-[var(--ios-red)] cursor-pointer active:scale-90 transition-all" title="Xoá">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {visibleCount < filteredTrades.length && (
            <div className="text-center py-2">
              <button onClick={() => setVisibleCount(prev => prev + 50)} className="px-4 py-2 rounded-full bg-[var(--ios-surface-2)] border border-[var(--ios-separator)] text-[var(--ios-label)] text-sm font-semibold cursor-pointer">
                Xem thêm ({filteredTrades.length - visibleCount} giao dịch)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
