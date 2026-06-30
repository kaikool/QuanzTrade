import React from "react";
import {
  FileText, Filter, Search, Pencil, Trash2, BookOpen, Plus,
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
    <div className="space-y-4" id="journal-standalone-section">
      {/* Filters + Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {journalAccountOptions.length > 0 && (
          <div className="flex items-center gap-1 bg-[var(--ios-surface-2)] border border-[var(--ios-separator)] px-2.5 py-1.5 rounded-[10px] text-sm">
            <select value={selectedJournalAccountId} onChange={(e) => setSelectedJournalAccountId(e.target.value)} className="bg-transparent focus:outline-none cursor-pointer text-[var(--ios-label)] font-medium text-sm max-w-[120px]">
              <option value="ALL">Tất cả TK</option>
              {journalAccountOptions.map((a) => (
                <option key={a.accountId} value={a.accountId}>{a.name}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-center gap-1 bg-[var(--ios-surface-2)] border border-[var(--ios-separator)] px-2.5 py-1.5 rounded-[10px] text-sm">
          <Filter size={12} className="text-[var(--ios-secondary-label)]" />
          <select value={selectedPairFilter} onChange={(e) => setSelectedPairFilter(e.target.value)} className="bg-transparent focus:outline-none cursor-pointer text-[var(--ios-label)] font-medium text-sm max-w-[100px]">
            <option value="ALL">Cặp</option>
            {uniquePairs.filter(p => p !== "ALL").map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1 bg-[var(--ios-surface-2)] border border-[var(--ios-separator)] px-2.5 py-1.5 rounded-[10px] text-sm">
          <select value={selectedStatusFilter} onChange={(e) => setSelectedStatusFilter(e.target.value)} className="bg-transparent focus:outline-none cursor-pointer text-[var(--ios-label)] font-medium text-sm">
            <option value="ALL">Tất cả lệnh</option>
            <option value="OPEN">Mở (OPEN)</option>
            <option value="CLOSED">Đã Đóng</option>
          </select>
        </div>
        <button onClick={() => handleOpenAddTrade()} className="h-8 px-3 bg-[var(--ios-blue)] text-white rounded-[8px] text-xs font-semibold cursor-pointer active:scale-90 transition-transform flex items-center gap-1">
          <Plus size={12} /> Thêm
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ios-secondary-label)]" />
        <input type="text" placeholder="Tìm kiếm cặp tiền, notes..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} id="trade-search-input" className="w-full pl-9 pr-4 py-2 bg-[var(--ios-surface-2)] rounded-[10px] text-sm border border-[var(--ios-separator)]/50 focus:border-[var(--ios-blue)] focus:outline-none text-[var(--ios-label)] placeholder:text-[var(--ios-secondary-label)]/50" />
      </div>

      {/* Desktop Table — iOS List Style */}
      <div className="hidden md:block bg-[var(--ios-surface)] rounded-[14px] shadow-ios-sm overflow-hidden" id="trades-table-scroller">
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
              <tbody className="divide-y divide-[var(--ios-separator)]">
                {filteredTrades.slice(0, visibleCount).map((t) => (
                  <tr key={t.id} className="hover:bg-[var(--ios-surface-2)] transition-colors">
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
                      <div className="text-[11px] text-[var(--ios-secondary-label)] mt-0.5">SL: {t.stop_loss ?? "—"} • TP: {t.take_profit ?? "—"}</div>
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
                          <div className={`h-full rounded-full ${(t.pnl || 0) >= 0 ? "bg-[var(--ios-green)]" : "bg-[var(--ios-red)]"}`} style={{ width: `${Math.min(Math.abs(t.pnl) / 1000, 1) * 100}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleBeginEditTrade(t)} className="w-8 h-8 rounded-[8px] bg-[var(--ios-surface-2)] border border-[var(--ios-separator)] text-[var(--ios-secondary-label)] hover:text-[var(--ios-blue)] cursor-pointer active:scale-90 transition-all flex items-center justify-center" title="Sửa">
                          <Pencil size={11} />
                        </button>
                        <button onClick={() => handleDeleteTrade(t.id)} className="w-8 h-8 rounded-[8px] bg-[var(--ios-surface-2)] border border-[var(--ios-separator)] text-[var(--ios-secondary-label)] hover:text-[var(--ios-red)] cursor-pointer active:scale-90 transition-all flex items-center justify-center" title="Xoá">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visibleCount < filteredTrades.length && (
              <div className="text-center py-3 border-t border-[var(--ios-separator)]">
                <button onClick={() => setVisibleCount(prev => prev + 50)} className="text-sm font-medium text-[var(--ios-blue)] cursor-pointer">
                  Xem thêm {filteredTrades.length - visibleCount} giao dịch
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Mobile Cards — iOS List Style */}
      <div className="block md:hidden space-y-2" id="trades-mobile-scroller">
        {filteredTrades.length === 0 ? (
          <div className="text-center py-12 text-[var(--ios-secondary-label)]">
            <BookOpen size={28} className="mx-auto mb-2 opacity-40" />
            <p className="font-semibold text-sm">Không tìm thấy giao dịch</p>
            <p className="text-xs mt-1">Sử dụng bộ lọc khác hoặc thêm lệnh mới.</p>
          </div>
        ) : (
          filteredTrades.slice(0, visibleCount).map((t) => (
            <div key={t.id} className="bg-[var(--ios-surface)] rounded-[14px] shadow-ios-sm overflow-hidden border border-[var(--ios-separator)]">
              {/* Chart snaps */}
              {(t.tv_snapshot_url || t.tv_snapshot_url_close) && (
                <div className={`grid ${t.tv_snapshot_url && t.tv_snapshot_url_close ? "grid-cols-2 gap-0.5" : "grid-cols-1"}`}>
                  {t.tv_snapshot_url && <img src={t.tv_snapshot_url} alt="" className="w-full h-24 object-cover" />}
                  {t.tv_snapshot_url_close && <img src={t.tv_snapshot_url_close} alt="" className="w-full h-24 object-cover" />}
                </div>
              )}
              <div className="p-3 space-y-2">
                {/* Pair + Direction + PnL */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.type === "BUY" ? "bg-[var(--ios-green)]/10 text-[var(--ios-green)]" : "bg-[var(--ios-red)]/10 text-[var(--ios-red)]"}`}>{t.type}</span>
                    <span className="font-semibold text-[15px] text-[var(--ios-label)]">{t.pair}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${t.status === "OPEN" ? "bg-[var(--ios-blue)]/10 text-[var(--ios-blue)]" : "bg-[var(--ios-surface-2)] text-[var(--ios-secondary-label)]"}`}>{t.status}</span>
                  </div>
                  <span className={`text-[17px] font-bold ${(t.pnl || 0) >= 0 ? "text-[var(--ios-green)]" : "text-[var(--ios-red)]"}`}>{(t.pnl || 0) >= 0 ? "+" : ""}${(t.pnl || 0).toFixed(0)}</span>
                </div>
                {/* Price, size, date */}
                <p className="text-[12px] text-[var(--ios-secondary-label)]">
                  {t.entry_price}{t.exit_price ? ` → ${t.exit_price}` : ""} · {t.size} lots · {new Date(t.entry_date).toLocaleDateString("vi-VN")}
                </p>
                {/* Tags + actions */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    {t.tag && <span className="text-[10px] font-semibold text-[var(--ios-blue)] bg-[var(--ios-blue)]/10 px-2 py-0.5 rounded">{t.tag}</span>}
                    <div className="flex gap-px">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={`text-[10px] ${i < (t.rating || 0) ? "text-amber-500" : "text-[var(--ios-secondary-label)]/40"}`}>★</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleBeginEditTrade(t)} className="w-7 h-7 rounded-[6px] bg-[var(--ios-surface-2)] border border-[var(--ios-separator)] text-[var(--ios-secondary-label)] cursor-pointer active:scale-90 transition-all flex items-center justify-center" title="Sửa">
                      <Pencil size={10} />
                    </button>
                    <button onClick={() => handleDeleteTrade(t.id)} className="w-7 h-7 rounded-[6px] bg-[var(--ios-surface-2)] border border-[var(--ios-separator)] text-[var(--ios-secondary-label)] cursor-pointer active:scale-90 transition-all flex items-center justify-center" title="Xoá">
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        {visibleCount < filteredTrades.length && (
          <div className="text-center py-3">
            <button onClick={() => setVisibleCount(prev => prev + 50)} className="text-sm font-medium text-[var(--ios-blue)] cursor-pointer">
              Xem thêm {filteredTrades.length - visibleCount} giao dịch
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
