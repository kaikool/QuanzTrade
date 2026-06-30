import React, { useState } from "react";
import {
  Search, Filter, Plus, BookOpen, Trash2, Pencil,
  ChevronLeft, Calendar, Tag, Activity, Expand, ArrowLeft, Edit2
} from "lucide-react";
import type { Trade } from "../types";
import { motion, AnimatePresence } from "motion/react";

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
  setLightboxUrl: (url: string | null) => void;
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
  setLightboxUrl,
}: JournalViewProps) {
  
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const filteredPnl = filteredTrades.reduce((sum, trade) => sum + Number(trade.pnl || 0), 0);
  const openTrades = filteredTrades.filter((trade) => trade.status === "OPEN").length;
  const closedTrades = filteredTrades.filter((trade) => trade.status === "CLOSED").length;
  const winningTrades = filteredTrades.filter((trade) => Number(trade.pnl || 0) > 0).length;
  const winRate = closedTrades > 0 ? Math.round((winningTrades / closedTrades) * 100) : 0;

  const formatAccountLabel = (account: { accountId: string; name: string }) => {
    if (account.accountId === "ALL") return "Tất cả";
    const fromName = account.name.match(/\d{4,}/)?.[0];
    const fromId = account.accountId.match(/\d{4,}/)?.[0];
    return fromName || fromId || account.accountId;
  };

  const formatTradeDate = (value?: string | null) => {
    if (!value || isNaN(new Date(value).getTime())) return "-";
    return new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  };

  const formatTradeTime = (value?: string | null) => {
    if (!value || isNaN(new Date(value).getTime())) return "-";
    return new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  };

  // Master List Item
  const renderMasterItem = (t: Trade) => {
    const isSelected = selectedTrade?.id === t.id;
    return (
      <button
        key={t.id} 
        onClick={() => setSelectedTrade(t)}
        className={`w-full text-left p-4 transition-colors cursor-pointer border-b border-[var(--ios-separator)]/50 last:border-0
          ${isSelected ? "bg-[var(--sys-tint-soft)]" : "hover:bg-[var(--ios-fill)]/45"}`}
      >
        <div className="flex justify-between items-start gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide shrink-0 ${t.type === "BUY" ? "bg-[var(--sys-success-soft)] text-[var(--ios-green)]" : "bg-[var(--sys-danger-soft)] text-[var(--ios-red)]"}`}>
              {t.type}
            </span>
            <span className="font-bold text-[17px] text-[var(--ios-label)] truncate">{t.pair}</span>
            {t.status === "OPEN" && <span className="bg-[var(--sys-tint-soft)] text-[var(--ios-blue)] text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0">OPEN</span>}
          </div>
          <span className={`text-[16px] font-bold font-mono tracking-tight ${Number(t.pnl || 0) >= 0 ? "text-[var(--ios-green)]" : "text-[var(--ios-red)]"}`}>
            {Number(t.pnl || 0) >= 0 ? "+" : ""}${Number(t.pnl || 0).toFixed(0)}
          </span>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-3 text-[12px] text-[var(--ios-secondary-label)]">
          <span className="min-w-0 truncate font-mono">
            {formatTradeDate(t.entry_date)} · {formatTradeTime(t.entry_date)} · {t.timeframe || "N/A"}
          </span>
          {t.tag && <span className="text-[var(--ios-tertiary-label)] uppercase font-semibold truncate max-w-[96px]">#{t.tag}</span>}
        </div>
        <div className="mt-2 flex items-center gap-2 text-[11px] font-mono text-[var(--ios-tertiary-label)]">
          <span>Entry {t.entry_price ?? "-"}</span>
          <span className="w-1 h-1 rounded-full bg-[var(--ios-separator)]" />
          <span>Exit {t.exit_price ?? "-"}</span>
        </div>
      </button>
    );
  };

  return (
    <div className="h-full flex flex-col md:h-[calc(100vh-140px)]" id="journal-standalone-section">
      
      {/* Header + filters */}
      <div className="space-y-3 mb-4 shrink-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between px-1">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-bold tracking-widest uppercase text-[var(--ios-secondary-label)]">Nhật ký giao dịch</span>
              <span className={`text-[13px] font-mono font-bold ${filteredPnl > 0 ? "text-[var(--ios-green)]" : filteredPnl < 0 ? "text-[var(--ios-red)]" : "text-[var(--ios-secondary-label)]"}`}>
                {filteredPnl > 0 ? "+" : ""}${filteredPnl.toFixed(0)}
              </span>
            </div>
            <p className="text-[13px] text-[var(--ios-secondary-label)] mt-1">
              {filteredTrades.length} lệnh · {openTrades} đang mở · Win rate {winRate}%
            </p>
          </div>
          <button onClick={() => handleOpenAddTrade()} className="hidden sm:flex h-9 px-4 bg-[var(--ios-blue)] text-white rounded-[12px] items-center justify-center gap-2 shrink-0 cursor-pointer shadow-ios-sm active:scale-95 text-[13px] font-bold">
            <Plus size={16} /> Ghi lệnh
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2">
        <div className="relative min-w-0">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ios-secondary-label)]" />
          <input 
            type="text" 
            placeholder="Tìm kiếm..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
            className="w-full h-10 pl-10 pr-4 bg-[var(--ios-fill)] rounded-[12px] text-[15px] focus:outline-none text-[var(--ios-label)] placeholder:text-[var(--ios-secondary-label)] border-0 focus:ring-2 focus:ring-[var(--ios-blue)]/50 transition-shadow shadow-sm"
          />
        </div>

        <div className="grid grid-cols-[minmax(92px,0.85fr)_minmax(104px,1fr)_minmax(92px,0.8fr)_40px] gap-2 min-w-0">
          {journalAccountOptions.length > 0 && (
            <select value={selectedJournalAccountId} onChange={(e) => setSelectedJournalAccountId(e.target.value)} className="min-w-0 h-10 bg-[var(--ios-fill)] border-0 px-3 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[var(--ios-blue)]/50 cursor-pointer text-[var(--ios-label)] font-bold text-[13px] shadow-sm appearance-none truncate">
              {journalAccountOptions.map((account) => (
                <option key={account.accountId} value={account.accountId}>{formatAccountLabel(account)}</option>
              ))}
            </select>
          )}
          
          <select value={selectedPairFilter} onChange={(e) => setSelectedPairFilter(e.target.value)} className="min-w-0 h-10 bg-[var(--ios-fill)] border-0 px-3 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[var(--ios-blue)]/50 cursor-pointer text-[var(--ios-label)] font-bold text-[13px] shadow-sm appearance-none truncate">
            <option value="ALL">Cặp (Tất cả)</option>
            {uniquePairs.filter(p => p !== "ALL").map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <select value={selectedStatusFilter} onChange={(e) => setSelectedStatusFilter(e.target.value)} className="min-w-0 h-10 bg-[var(--ios-fill)] border-0 px-3 rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[var(--ios-blue)]/50 cursor-pointer text-[var(--ios-label)] font-bold text-[13px] shadow-sm appearance-none truncate">
            <option value="ALL">Tất cả</option>
            <option value="OPEN">Mở</option>
            <option value="CLOSED">Đóng</option>
          </select>
          
          <button onClick={() => handleOpenAddTrade()} className="w-10 h-10 bg-[var(--ios-blue)] text-white rounded-[12px] flex items-center justify-center shrink-0 cursor-pointer shadow-ios-sm active:scale-95 sm:hidden">
            <Plus size={18} />
          </button>
        </div>
        </div>
      </div>

      {/* Split View Container */}
      <div className="flex flex-1 overflow-hidden gap-4 pb-16 md:pb-0 relative">
        
        {/* Left Pane (Master List) */}
        <div className={`w-full md:w-[320px] lg:w-[360px] shrink-0 flex flex-col ios-glass ios26-card bg-[var(--ios-surface)] border border-[var(--ios-separator)] shadow-ios-sm overflow-hidden
          ${selectedTrade ? "hidden md:flex" : "flex"}`}>
          <div className="overflow-y-auto flex-1 no-scrollbar p-0 m-0">
            {filteredTrades.length === 0 ? (
              <div className="p-8 text-center text-[var(--ios-secondary-label)]">
                <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-bold text-[17px] text-[var(--ios-label)]">Chưa có giao dịch phù hợp</p>
                <p className="text-[13px] mt-1">Đổi bộ lọc hoặc bấm + để ghi lệnh mới.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {filteredTrades.slice(0, visibleCount).map(renderMasterItem)}
              </div>
            )}
            {visibleCount < filteredTrades.length && (
              <button onClick={() => setVisibleCount(prev => prev + 50)} className="w-full p-4 text-[14px] font-bold text-[var(--ios-blue)] hover:bg-[var(--sys-tint-soft)] cursor-pointer">
                Tải thêm
              </button>
            )}
          </div>
        </div>

        {/* Right Pane (Detail View) */}
        {selectedTrade ? (
          <div className="flex-1 flex flex-col ios-glass ios26-card bg-[var(--ios-surface)] border border-[var(--ios-separator)] shadow-ios-sm overflow-hidden relative z-20 min-h-0 w-full md:w-auto">
            {/* Header Detail */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--ios-separator)] shrink-0 bg-[var(--ios-surface)]">
              <div className="flex items-center gap-2 md:gap-3 shrink-0">
                <button onClick={() => setSelectedTrade(null)} className="md:hidden w-8 h-8 flex items-center justify-center bg-[var(--sys-tint-soft)] text-[var(--ios-blue)] rounded-full">
                  <ArrowLeft size={18} />
                </button>
                <div className="min-w-0">
                  <h2 className="text-[22px] font-bold text-[var(--ios-label)] leading-none truncate">{selectedTrade.pair}</h2>
                  <p className="text-[12px] font-semibold text-[var(--ios-secondary-label)] mt-1">{selectedTrade.type} · {selectedTrade.size} lots · {selectedTrade.timeframe || "N/A"}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { handleBeginEditTrade(selectedTrade); setSelectedTrade(null); }} className="w-9 h-9 flex items-center justify-center bg-[var(--sys-tint-soft)] text-[var(--ios-blue)] rounded-full hover:scale-105 transition-transform" title="Sửa lệnh">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => { handleDeleteTrade(selectedTrade.id); setSelectedTrade(null); }} className="w-9 h-9 flex items-center justify-center bg-[var(--sys-danger-soft)] text-[var(--ios-red)] rounded-full hover:scale-105 transition-transform" title="Xóa lệnh">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {/* Content Detail */}
            <div className="flex-1 overflow-y-auto p-5 md:p-8 no-scrollbar min-h-0 h-full">
              
              {/* PnL Hero & Status */}
              <div className="flex items-center justify-between gap-4 mb-6 bg-[var(--sys-glass)] border border-[var(--sys-border)] p-5 rounded-[24px] shadow-ios-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Activity size={82} />
                </div>
                <div className="relative z-10">
                  <p className="text-[12px] font-bold uppercase tracking-widest text-[var(--ios-secondary-label)] mb-1">Lợi nhuận ròng</p>
                  <p className={`text-[34px] sm:text-[38px] font-bold font-mono tracking-tighter leading-none ${Number(selectedTrade.pnl || 0) > 0 ? "text-[var(--ios-green)]" : Number(selectedTrade.pnl || 0) < 0 ? "text-[var(--ios-red)]" : "text-[var(--ios-label)]"}`}>
                    {Number(selectedTrade.pnl || 0) > 0 ? "+" : ""}{Number(selectedTrade.pnl || 0).toFixed(2)}
                  </p>
                </div>
                <div className="relative z-10 text-right">
                  {selectedTrade.status === "OPEN" ? (
                    <div className="bg-[var(--sys-tint-soft)] text-[var(--ios-blue)] px-3 py-1 rounded-full font-bold text-[12px] inline-block mb-2">Đang mở</div>
                  ) : (
                    <div className={`px-3 py-1 rounded-full font-bold text-[12px] inline-block mb-2 ${Number(selectedTrade.pnl || 0) > 0 ? "bg-green-500/10 text-[var(--ios-green)]" : Number(selectedTrade.pnl || 0) < 0 ? "bg-red-500/10 text-[var(--ios-red)]" : "bg-gray-500/10 text-gray-500"}`}>
                      {Number(selectedTrade.pnl || 0) > 0 ? "WIN" : Number(selectedTrade.pnl || 0) < 0 ? "LOSS" : "BREAKEVEN"}
                    </div>
                  )}
                  <p className="text-[12px] font-mono text-[var(--ios-secondary-label)] mt-1">{formatTradeDate(selectedTrade.entry_date)} · {formatTradeTime(selectedTrade.entry_date)}</p>
                </div>
              </div>

              {/* Execution Stats Grid */}
              <h3 className="text-[13px] font-bold text-[var(--ios-secondary-label)] uppercase tracking-widest mb-3">Vào / ra lệnh</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-[var(--ios-fill)] p-4 rounded-[18px]">
                  <p className="text-[11px] font-bold uppercase text-[var(--ios-secondary-label)] mb-1">Entry</p>
                  <p className="text-[18px] font-mono font-bold text-[var(--ios-label)]">{selectedTrade.entry_price}</p>
                </div>
                <div className="bg-[var(--ios-fill)] p-4 rounded-[18px]">
                  <p className="text-[11px] font-bold uppercase text-[var(--ios-secondary-label)] mb-1">Exit</p>
                  <p className="text-[18px] font-mono font-bold text-[var(--ios-label)]">{selectedTrade.exit_price || "-"}</p>
                </div>
                <div className="bg-red-500/5 p-4 rounded-[18px]">
                  <p className="text-[11px] font-bold uppercase text-[var(--ios-red)] opacity-80 mb-1">Stop Loss</p>
                  <p className="text-[18px] font-mono font-bold text-[var(--ios-red)]">{selectedTrade.stop_loss || "-"}</p>
                </div>
                <div className="bg-green-500/5 p-4 rounded-[18px]">
                  <p className="text-[11px] font-bold uppercase text-[var(--ios-green)] opacity-80 mb-1">Take Profit</p>
                  <p className="text-[18px] font-mono font-bold text-[var(--ios-green)]">{selectedTrade.take_profit || "-"}</p>
                </div>
              </div>

              {/* Context Stats */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-[var(--ios-fill)] p-4 rounded-[18px] flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--sys-surface)] flex items-center justify-center shadow-sm">
                    <Calendar size={18} className="text-[var(--ios-blue)]" />
                  </div>
                  <div>
                    <p className="text-[12px] font-bold uppercase text-[var(--ios-secondary-label)]">Thời gian</p>
                    <p className="text-[14px] font-bold text-[var(--ios-label)]">
                      {selectedTrade.entry_date && !isNaN(new Date(selectedTrade.entry_date).getTime()) 
                        ? new Date(selectedTrade.entry_date).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) 
                        : "-"}
                    </p>
                  </div>
                </div>
                <div className="bg-[var(--ios-fill)] p-4 rounded-[18px] flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--sys-surface)] flex items-center justify-center shadow-sm">
                    <Tag size={18} className="text-[var(--ios-orange)]" />
                  </div>
                  <div>
                    <p className="text-[12px] font-bold uppercase text-[var(--ios-secondary-label)]">Gắn thẻ</p>
                    <p className="text-[14px] font-bold text-[var(--ios-label)]">{selectedTrade.tag || "Không có"}</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="mb-6">
                <h3 className="text-[13px] font-bold text-[var(--ios-secondary-label)] uppercase tracking-widest mb-3">Bài học / ghi chú</h3>
                {selectedTrade.notes ? (
                  <div className="bg-[var(--ios-fill)] shadow-sm p-5 rounded-[24px] text-[16px] text-[var(--ios-label)] leading-relaxed whitespace-pre-wrap font-medium">
                    {selectedTrade.notes}
                  </div>
                ) : (
                  <div className="bg-[var(--ios-fill)] border border-dashed border-[var(--ios-separator)] p-6 rounded-[24px] flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[var(--sys-tint-soft)] transition-colors" onClick={() => handleBeginEditTrade(selectedTrade)}>
                    <Pencil size={24} className="text-[var(--ios-secondary-label)] mb-2" />
                    <p className="text-[15px] font-bold text-[var(--ios-label)]">Chưa có bài học cho lệnh này</p>
                    <p className="text-[13px] text-[var(--ios-secondary-label)] mt-1">Bấm vào đây để thêm ghi chú hoặc bài học rút ra từ lệnh này.</p>
                  </div>
                )}
              </div>

              {/* Chart Snapshots */}
              <div>
                <h3 className="text-[13px] font-bold text-[var(--ios-secondary-label)] uppercase tracking-widest mb-3">Hình ảnh phân tích</h3>
                {selectedTrade.tv_snapshot_url || selectedTrade.tv_snapshot_url_close ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedTrade.tv_snapshot_url && (
                      <div onClick={() => setLightboxUrl(selectedTrade.tv_snapshot_url)} className="relative rounded-[24px] overflow-hidden border border-[var(--ios-separator)] group aspect-video bg-black/5 cursor-pointer">
                        <img src={selectedTrade.tv_snapshot_url} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" alt="Entry Chart" />
                        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white px-3 py-1 text-[11px] font-bold rounded-full uppercase tracking-wider">Entry Chart</div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                           <Expand className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" size={32} />
                        </div>
                      </div>
                    )}
                    {selectedTrade.tv_snapshot_url_close && (
                      <div onClick={() => setLightboxUrl(selectedTrade.tv_snapshot_url_close)} className="relative rounded-[24px] overflow-hidden border border-[var(--ios-separator)] group aspect-video bg-black/5 cursor-pointer">
                        <img src={selectedTrade.tv_snapshot_url_close} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" alt="Exit Chart" />
                        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white px-3 py-1 text-[11px] font-bold rounded-full uppercase tracking-wider">Exit Chart</div>
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                           <Expand className="text-white opacity-0 group-hover:opacity-100 drop-shadow-md" size={32} />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-[var(--ios-fill)] border border-dashed border-[var(--ios-separator)] p-6 rounded-[24px] flex flex-col items-center justify-center text-center cursor-pointer hover:bg-[var(--sys-tint-soft)] transition-colors" onClick={() => handleBeginEditTrade(selectedTrade)}>
                    <BookOpen size={24} className="text-[var(--ios-secondary-label)] mb-2" />
                    <p className="text-[15px] font-bold text-[var(--ios-label)]">Chưa có ảnh phân tích</p>
                    <p className="text-[13px] text-[var(--ios-secondary-label)] mt-1">Cập nhật link TradingView để lưu lại khoảnh khắc vào/ra lệnh.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center text-[var(--ios-secondary-label)]">
            <div className="text-center">
              <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-[18px] font-bold text-[var(--ios-label)]">Chọn một giao dịch</p>
              <p className="text-[15px] mt-2">Xem điểm vào/ra, P&L và bài học của từng lệnh.</p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
