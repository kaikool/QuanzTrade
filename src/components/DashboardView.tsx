import React, { useMemo, Suspense } from "react";
import {
  TrendingUp, TrendingDown, Activity, Award, BookOpen,
  AlertTriangle, CloudLightning, ChevronRight,
  Plus, X,
} from "lucide-react";
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
  currentTab: string;
  setCurrentTab: (v: "dashboard" | "journal" | "calendar" | "news") => void;
  summary: Summary;
  mergedTrades: Trade[];
  filteredTrades: Trade[];
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
  darkMode, currentTab, setCurrentTab,
  summary, mergedTrades,
  upcomingRedEvents, followedT5Accounts, t5Trades,
  setSelectedJournalAccountId, loadT5AccountTrades,
  setIsQuickAddOpen, setIsSettingsOpen,
}: DashboardViewProps) {

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

  const openCount = mergedTrades.filter(t => t.status === "OPEN").length;

  return (
    <div className="space-y-4" id="dashboard-view">

      {/* Quick action buttons */}
      <div className="flex items-center gap-2">
        <button onClick={() => setIsQuickAddOpen(true)} className="h-9 px-4 bg-[var(--ios-blue)] text-white rounded-full text-sm font-semibold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform shadow-ios-sm">
          <Plus size={16} /> Thêm lệnh
        </button>
        <button onClick={() => setIsSettingsOpen(true)} className="h-9 px-3 bg-[var(--ios-surface)] border border-[var(--ios-separator)] rounded-full text-sm font-medium text-[var(--ios-secondary-label)] cursor-pointer active:scale-95 transition-transform">
          Cài đặt
        </button>
      </div>

      {/* Red Alert Banner */}
      {upcomingRedEvents.length > 0 && (
        <div className="p-3 bg-rose-600 rounded-[14px] flex items-center gap-3 shadow-ios-sm">
          <AlertTriangle size={18} className="text-white flex-shrink-0" />
          <p className="text-sm text-white/90 line-clamp-1 font-medium">
            {upcomingRedEvents.map(e => `${e.title} (${new Date(e.date).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })})`).join(" • ")}
          </p>
        </div>
      )}

      {/* Quick Stats — iOS Widget Style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Tổng giao dịch", value: mergedTrades.length.toString(), color: "text-[var(--ios-label)]" },
          { label: "Win Rate", value: `${winRate.toFixed(0)}%`, color: "text-[var(--ios-label)]" },
          { label: "P&L", value: `${summary.pnl >= 0 ? "+" : ""}$${summary.pnl.toFixed(0)}`, color: summary.pnl >= 0 ? "text-[var(--ios-green)]" : "text-[var(--ios-red)]" },
          { label: "Đang mở", value: (t5Metrics?.totalOpenTrades ?? openCount).toString(), color: "text-[var(--ios-blue)]" },
        ].map((stat, i) => (
          <div key={i} className="p-4 sm:p-5 ios-glass bg-[var(--ios-surface)] rounded-[24px] shadow-ios-sm">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ios-secondary-label)]">{stat.label}</p>
            <p className={`text-[28px] font-bold mt-1 leading-none ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* The5ers Account Cards */}
      {followedT5Accounts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-[13px] font-semibold text-[var(--ios-secondary-label)] uppercase tracking-wider px-0.5">Tài khoản The5ers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {followedT5Accounts.map(account => {
              const accountTrades = t5Trades.filter(t => t.accountId === account.accountId);
              const openTrades = accountTrades.filter(t => !t.closeTime).length;
              const dailyLimit = Math.abs(account.dailyLossLimit || 0);
              const dailyUsed = Math.max(0, -(account.dailyLoss || 0));
              const dailyRisk = dailyLimit > 0 ? Math.min(100, (dailyUsed / dailyLimit) * 100) : 0;
              const riskLabel = dailyRisk >= 80 ? "Nguy hiểm" : dailyRisk >= 55 ? "Cần chú ý" : "Ổn";
              return (
                <button key={account.accountId} type="button" onClick={() => { setSelectedJournalAccountId(account.accountId); setCurrentTab("journal"); }} className="p-4 sm:p-5 ios-glass bg-[var(--ios-surface)] rounded-[24px] shadow-ios-sm text-left transition-all hover:border-[var(--ios-blue)]/40 cursor-pointer active:scale-[0.98] border border-[var(--ios-separator)]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-[var(--ios-label)] truncate">{account.name || account.accountId}</p>
                      <p className="text-[11px] text-[var(--ios-secondary-label)] mt-0.5">#{account.accountId}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${account.status === "active" || account.status === "available" ? "text-[var(--ios-green)] bg-[var(--ios-green)]/10" : "text-[var(--ios-secondary-label)] bg-[var(--ios-surface-2)]"}`}>{account.status}</span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div><p className="text-[10px] font-semibold text-[var(--ios-secondary-label)]">Balance</p><p className="text-[17px] font-bold text-[var(--ios-label)]">${account.balance?.toLocaleString("en-US", { maximumFractionDigits: 0 })}</p></div>
                    <div className="text-right"><p className="text-[10px] font-semibold text-[var(--ios-secondary-label)]">P&L</p><p className={`text-[17px] font-bold ${(account.pnl || 0) >= 0 ? "text-[var(--ios-green)]" : "text-[var(--ios-red)]"}`}>{(account.pnl || 0) >= 0 ? "+" : ""}${(account.pnl || 0).toFixed(0)}</p></div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] text-[var(--ios-secondary-label)] mb-1"><span>Daily risk</span><span>{riskLabel}</span></div>
                    <div className="h-1.5 bg-[var(--ios-surface-2)] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${dailyRisk >= 80 ? "bg-[var(--ios-red)]" : dailyRisk >= 55 ? "bg-amber-500" : "bg-[var(--ios-green)]"}`} style={{ width: `${dailyRisk}%` }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* BentoStats Chart */}
      <Suspense fallback={<div className="h-[240px] bg-[var(--ios-surface)] rounded-[24px] shadow-ios-sm animate-pulse" />}>
        <BentoStats trades={mergedTrades} darkMode={darkMode} />
      </Suspense>

      {/* Recent Trades — iOS List Style */}
      <div className="ios-glass bg-[var(--ios-surface)] rounded-[24px] shadow-ios-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--ios-separator)]">
          <h3 className="text-[13px] font-semibold text-[var(--ios-secondary-label)] uppercase tracking-wider">Giao dịch gần đây</h3>
          <button onClick={() => setCurrentTab("journal")} className="text-[13px] font-medium text-[var(--ios-blue)] cursor-pointer flex items-center gap-0.5">Xem tất cả <ChevronRight size={14} /></button>
        </div>
        {mergedTrades.length === 0 ? (
          <div className="text-center py-10 px-4">
            <BookOpen size={28} className="mx-auto text-[var(--ios-tertiary-label)] mb-2" />
            <p className="text-[13px] text-[var(--ios-secondary-label)]">Bấm <span className="font-semibold">+</span> để thêm giao dịch đầu tiên.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--ios-separator)]">
            {mergedTrades.slice(0, 5).map(t => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3 active:bg-[var(--ios-surface-2)] transition-colors">
                <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center font-bold text-[11px] ${t.type === "BUY" ? "bg-[var(--ios-green)]/10 text-[var(--ios-green)]" : "bg-[var(--ios-red)]/10 text-[var(--ios-red)]"}`}>
                  {t.type}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[15px] font-semibold text-[var(--ios-label)]">{t.pair}</span>
                    {t.status === "OPEN" && <span className="text-[10px] font-semibold text-[var(--ios-blue)] bg-[var(--ios-blue)]/10 px-1.5 py-0.5 rounded">OPEN</span>}
                    {t.tag === "The5ers" && <span className="text-[10px] text-[var(--ios-indigo)] font-semibold">T5</span>}
                  </div>
                  <p className="text-[12px] text-[var(--ios-secondary-label)] mt-0.5">{new Date(t.entry_date).toLocaleDateString("vi-VN")} · {t.size} lots</p>
                </div>
                <div className="text-right">
                  <p className={`text-[15px] font-bold ${(t.pnl || 0) >= 0 ? "text-[var(--ios-green)]" : "text-[var(--ios-red)]"}`}>
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
