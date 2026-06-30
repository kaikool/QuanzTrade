import React, { useMemo, Suspense, useState } from "react";
import {
  TrendingUp, TrendingDown, Activity, Award, Calendar as CalendarIcon,
  FileText, Newspaper, BookOpen, RefreshCw, AlertTriangle, CloudLightning,
  Plus, X, Moon, Sun, Filter, ChevronRight, BarChart2, Settings,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BentoStats } from "../components/BentoStats";
import type { Trade } from "../types";

interface Summary {
  balance: number;
  pnl: number;
  openCount: number;
  closedCount: number;
}

interface DashboardViewProps {
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  currentTab: string;
  setCurrentTab: (v: "dashboard" | "journal" | "calendar" | "news") => void;
  summary: Summary;
  mergedTrades: Trade[];
  filteredTrades: Trade[];
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  upcomingRedEvents: { title: string; date: string; impact: string }[];
  selectedT5AccountIds: string[];
  t5Accounts: any[];
  followedT5Accounts: any[];
  t5Trades: any[];
  setSelectedJournalAccountId: (v: string) => void;
  loadT5AccountTrades: (accountId: string) => void;
  setIsQuickAddOpen: (v: boolean) => void;
  setIsSettingsOpen: (v: boolean) => void;
}

export function DashboardView({
  darkMode, setDarkMode, currentTab, setCurrentTab,
  summary, mergedTrades, filteredTrades,
  upcomingRedEvents, selectedT5AccountIds, t5Accounts,
  followedT5Accounts, t5Trades,
  setSelectedJournalAccountId, loadT5AccountTrades,
  setIsQuickAddOpen, setIsSettingsOpen,
}: DashboardViewProps) {

  // Compute max daily drawdown from The5ers accounts
  const t5Metrics = useMemo(() => {
    if (followedT5Accounts.length === 0) return null;
    const totalBalance = followedT5Accounts.reduce((s, a) => s + (a.balance || 0), 0);
    const totalPnl = followedT5Accounts.reduce((s, a) => s + (a.pnl || 0), 0);
    const totalOpenTrades = t5Trades.filter(t => !t.closeTime).length;
    let maxRisk = 0;
    followedT5Accounts.forEach(a => {
      const dailyLoss = Math.abs(a.dailyLoss || 0);
      const dailyLimit = Math.abs(a.dailyLossLimit || 1);
      const risk = dailyLimit > 0 ? (dailyLoss / dailyLimit) * 100 : 0;
      if (risk > maxRisk) maxRisk = risk;
    });
    return { totalBalance, totalPnl, totalOpenTrades, maxRisk };
  }, [followedT5Accounts, t5Trades]);

  const winRate = useMemo(() => {
    const closed = mergedTrades.filter(t => t.status === "CLOSED");
    if (closed.length === 0) return 0;
    return (closed.filter(t => (t.pnl || 0) > 0).length / closed.length) * 100;
  }, [mergedTrades]);

  return (
    <div className="space-y-4 sm:space-y-5" id="dashboard-view">
      {/* Header Card — Balance + Quick Actions */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 bg-[var(--sys-surface)] rounded-[20px] border border-[var(--sys-border)] shadow-ios-sm gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-br from-[var(--sys-blue)] to-[var(--sys-violet)] text-white rounded-[14px] flex items-center justify-center shadow-ios-md flex-shrink-0">
            <CloudLightning size={22} className="sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-[var(--sys-text)] truncate">
              {selectedT5AccountIds.length > 0 && t5Accounts.length > 0 ? "QuanzTrade" : "Táo Tầu Journal"}
            </h1>
            <p className="text-sm text-[var(--sys-text-secondary)] mt-0.5 truncate">
              {summary.balance > 0 ? `Tổng tài sản: $${summary.balance.toLocaleString("en-US")}` : "Nhật ký giao dịch"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setDarkMode(!darkMode)} className="w-9 h-9 bg-[var(--sys-surface-2)] border border-[var(--sys-border)] rounded-full flex items-center justify-center cursor-pointer active:scale-90 transition-transform" title="Giao diện sáng/tối">
            {darkMode ? <Sun size={14} className="text-amber-500" /> : <Moon size={14} className="text-[var(--sys-text-secondary)]" />}
          </button>
          <button onClick={() => setIsQuickAddOpen(true)} className="h-9 px-3 bg-[var(--sys-blue)] text-white rounded-full text-sm font-semibold flex items-center gap-1.5 cursor-pointer active:scale-90 transition-transform">
            <Plus size={16} /> Thêm lệnh
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="w-9 h-9 bg-[var(--sys-surface-2)] border border-[var(--sys-border)] rounded-full flex items-center justify-center cursor-pointer active:scale-90 transition-transform">
            <Settings size={14} className="text-[var(--sys-text-secondary)]" />
          </button>
        </div>
      </header>

      {/* Red Alert Banner */}
      {upcomingRedEvents.length > 0 && (
        <div className="bg-gradient-to-r from-rose-600 to-rose-500 text-white p-3 sm:p-4 rounded-[20px] shadow-ios-md flex items-start gap-3 border border-rose-400/30">
          <AlertTriangle size={20} className="mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm tracking-wide">Cảnh báo tin đỏ</p>
            <p className="text-sm text-white/80 mt-0.5 line-clamp-2">
              {upcomingRedEvents.map(e => `${e.title} (${new Date(e.date).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })})`).join(" • ")}
            </p>
          </div>
        </div>
      )}

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 sm:p-4 bg-[var(--sys-surface)] rounded-[16px] border border-[var(--sys-border)] shadow-ios-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--sys-text-secondary)]">Tổng giao dịch</p>
          <p className="text-xl sm:text-2xl font-black text-[var(--sys-text)] mt-1">{mergedTrades.length}</p>
        </div>
        <div className="p-3 sm:p-4 bg-[var(--sys-surface)] rounded-[16px] border border-[var(--sys-border)] shadow-ios-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--sys-text-secondary)]">Win Rate</p>
          <p className="text-xl sm:text-2xl font-black text-[var(--sys-text)] mt-1">{winRate.toFixed(0)}%</p>
        </div>
        <div className="p-3 sm:p-4 bg-[var(--sys-surface)] rounded-[16px] border border-[var(--sys-border)] shadow-ios-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--sys-text-secondary)]">P&L</p>
          <p className={`text-xl sm:text-2xl font-black mt-1 ${summary.pnl >= 0 ? "text-[var(--sys-green)]" : "text-[var(--sys-red)]"}`}>
            {summary.pnl >= 0 ? "+" : ""}${summary.pnl.toFixed(0)}
          </p>
        </div>
        <div className="p-3 sm:p-4 bg-[var(--sys-surface)] rounded-[16px] border border-[var(--sys-border)] shadow-ios-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--sys-text-secondary)]">Đang mở</p>
          <p className="text-xl sm:text-2xl font-black text-[var(--sys-text)] mt-1">
            {t5Metrics?.totalOpenTrades ?? mergedTrades.filter(t => t.status === "OPEN").length}
          </p>
        </div>
      </div>

      {/* The5ers Account Cards */}
      {followedT5Accounts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--sys-text-secondary)] px-0.5">Tài khoản The5ers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {followedT5Accounts.map(account => {
              const accountTrades = t5Trades.filter(t => t.accountId === account.accountId);
              const openTrades = accountTrades.filter(t => !t.closeTime).length;
              const dailyLimit = Math.abs(account.dailyLossLimit || 0);
              const dailyUsed = Math.max(0, -(account.dailyLoss || 0));
              const dailyRisk = dailyLimit > 0 ? Math.min(100, (dailyUsed / dailyLimit) * 100) : 0;
              const riskLabel = dailyRisk >= 80 ? "Nguy hiểm" : dailyRisk >= 55 ? "Cần chú ý" : "Ổn";
              return (
                <button key={account.accountId} type="button" onClick={() => { setSelectedJournalAccountId(account.accountId); setCurrentTab("journal"); }} className="p-4 bg-[var(--sys-surface)] rounded-[16px] border border-[var(--sys-border)] shadow-ios-sm text-left transition-all hover:border-[var(--sys-blue)]/40 cursor-pointer active:scale-[0.98]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-[var(--sys-text)] truncate">{account.name || account.accountId}</p>
                      <p className="text-xs text-[var(--sys-text-secondary)] mt-0.5">#{account.accountId} · {account.type}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${account.status === "active" || account.status === "available" ? "text-[var(--sys-green)] bg-[var(--sys-green)]/10" : "text-[var(--sys-text-secondary)] bg-[var(--sys-surface-2)]"}`}>{account.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div><p className="text-[10px] font-semibold uppercase text-[var(--sys-text-secondary)]">Balance</p><p className="text-lg font-black text-[var(--sys-text)]">${account.balance?.toLocaleString("en-US", { maximumFractionDigits: 0 })}</p></div>
                    <div><p className="text-[10px] font-semibold uppercase text-[var(--sys-text-secondary)]">P&L</p><p className={`text-lg font-black ${(account.pnl || 0) >= 0 ? "text-[var(--sys-green)]" : "text-[var(--sys-red)]"}`}>{(account.pnl || 0) >= 0 ? "+" : ""}${(account.pnl || 0).toFixed(0)}</p></div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-[var(--sys-text-secondary)] mb-1"><span>Daily risk</span><span>{riskLabel} · {openTrades} mở</span></div>
                    <div className="h-1.5 bg-[var(--sys-surface-2)] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${dailyRisk >= 80 ? "bg-[var(--sys-red)]" : dailyRisk >= 55 ? "bg-amber-500" : "bg-[var(--sys-green)]"}`} style={{ width: `${dailyRisk}%` }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* BentoStats Chart */}
      <Suspense fallback={<div className="h-[260px] bg-[var(--sys-surface)] rounded-[20px] border border-[var(--sys-border)] shadow-ios-sm animate-pulse" />}>
        <BentoStats trades={mergedTrades} darkMode={darkMode} />
      </Suspense>

      {/* Recent Trades Preview */}
      <div className="p-4 sm:p-5 bg-[var(--sys-surface)] rounded-[20px] border border-[var(--sys-border)] shadow-ios-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--sys-text-secondary)] uppercase tracking-wider">Giao dịch gần đây</h3>
          <button onClick={() => setCurrentTab("journal")} className="text-xs font-semibold text-[var(--sys-blue)] cursor-pointer hover:underline">Xem tất cả →</button>
        </div>
        {mergedTrades.length === 0 ? (
          <div className="text-center py-10">
            <BookOpen size={32} className="mx-auto text-[var(--sys-text-secondary)]/40 mb-2" />
            <p className="text-sm text-[var(--sys-text-secondary)]">Chưa có giao dịch. Bấm nút + để thêm lệnh đầu tiên.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {mergedTrades.slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center gap-3 p-2.5 hover:bg-[var(--sys-surface-2)] rounded-[12px] transition-colors">
                <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center font-bold text-xs ${t.type === "BUY" ? "bg-[var(--sys-green)]/10 text-[var(--sys-green)]" : "bg-[var(--sys-red)]/10 text-[var(--sys-red)]"}`}>
                  {t.type}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-[var(--sys-text)]">{t.pair}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${t.status === "OPEN" ? "bg-[var(--sys-blue)]/10 text-[var(--sys-blue)]" : "bg-[var(--sys-surface-2)] text-[var(--sys-text-secondary)]"}`}>{t.status}</span>
                    {t.tag === "The5ers" && <span className="text-[10px] text-[var(--sys-violet)] font-semibold">T5</span>}
                  </div>
                  <p className="text-xs text-[var(--sys-text-secondary)] mt-0.5 truncate">
                    {new Date(t.entry_date).toLocaleDateString("vi-VN")} · {t.size} lots
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${(t.pnl || 0) >= 0 ? "text-[var(--sys-green)]" : "text-[var(--sys-red)]"}`}>
                    {(t.pnl || 0) >= 0 ? "+" : ""}${(t.pnl || 0).toFixed(0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
