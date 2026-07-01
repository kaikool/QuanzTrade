import React, { useMemo, Suspense } from "react";
import {
  Plus,
  Settings,
  ShieldAlert,
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
  setIsQuickAddOpen, setIsSettingsOpen, t5Loading,
}: DashboardViewProps & { t5Loading?: boolean; setDarkMode?: (v: boolean) => void }) {

  return (
    <div className="space-y-6" id="dashboard-view">
      
      {/* 1. Header Actions & Alerts */}
      <div className="space-y-4">
        {/* Quick action buttons */}
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => setIsQuickAddOpen(true)} className="h-10 px-6 bg-[var(--ios-blue)] text-white rounded-full text-[15px] font-semibold flex items-center gap-2.5 cursor-pointer active:scale-95 transition-transform shadow-ios-sm">
            <Plus size={17} /> Ghi lệnh mới
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="h-10 px-5 ios26-glass text-[var(--ios-label)] rounded-full text-[15px] font-semibold flex items-center gap-2.5 cursor-pointer active:scale-95 transition-transform">
            <Settings size={17} className="text-[var(--ios-secondary-label)]" /> Cài đặt
          </button>
        </div>

        {/* Red Alert Banner */}
      </div>

      {/* 2. Apple Health / Stocks Style Analytics (BentoStats) */}
      {t5Loading ? (
        <div className="space-y-4 md:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            <div className="h-[180px] ios26-card shadow-ios-sm animate-pulse" />
            <div className="h-[180px] ios26-card shadow-ios-sm animate-pulse" />
          </div>
          <div className="h-[320px] ios26-card shadow-ios-sm animate-pulse" />
        </div>
      ) : (
        <Suspense fallback={<div className="h-[240px] ios26-card shadow-ios-sm animate-pulse" />}>
          <BentoStats trades={mergedTrades} darkMode={darkMode} />
        </Suspense>
      )}

      {/* 3. The5ers Funding Accounts */}
      {t5Loading ? (
        <div className="space-y-4 pt-2">
          <h2 className="text-[15px] font-bold text-[var(--ios-label)] uppercase tracking-wider px-1">Tài khoản Quỹ (The5ers)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
             <div className="h-[160px] ios26-card shadow-ios-sm animate-pulse border border-[var(--ios-separator)]" />
             <div className="h-[160px] ios26-card shadow-ios-sm animate-pulse border border-[var(--ios-separator)] hidden sm:block" />
             <div className="h-[160px] ios26-card shadow-ios-sm animate-pulse border border-[var(--ios-separator)] hidden lg:block" />
          </div>
        </div>
      ) : followedT5Accounts.length > 0 && (
        <div className="space-y-4 pt-2">
          <h2 className="text-[15px] font-bold text-[var(--ios-label)] uppercase tracking-wider px-1">Tài khoản Quỹ (The5ers)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {followedT5Accounts.map(account => {
              const dailyLimit = Math.abs(account.dailyLossLimit || 0);
              const dailyUsed = Math.max(0, -(account.dailyLoss || 0));
              const dailyRisk = dailyLimit > 0 ? Math.min(100, (dailyUsed / dailyLimit) * 100) : 0;
              const isDanger = dailyRisk >= 80;
              
              return (
                <button 
                  key={account.accountId} 
                  type="button" 
                  onClick={() => { setSelectedJournalAccountId(account.accountId); setCurrentTab("journal"); }} 
                  className="p-5 ios-glass ios26-card shadow-ios-sm text-left transition-all active:scale-[0.98] border border-[var(--ios-separator)] flex flex-col justify-between cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="min-w-0">
                      <p className="font-bold text-[18px] text-[var(--ios-label)] truncate">{account.name || account.accountId}</p>
                      <p className="text-[12px] font-mono text-[var(--ios-secondary-label)] mt-0.5">#{account.accountId}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${account.status === "active" || account.status === "available" ? "text-[var(--ios-green)] bg-[var(--sys-success-soft)]" : "text-[var(--ios-secondary-label)] bg-[var(--ios-fill)]"}`}>
                      {account.status}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[12px] font-bold text-[var(--ios-secondary-label)] uppercase tracking-wider mb-1">Balance</p>
                      <p className="text-[20px] font-bold font-mono tracking-tight text-[var(--ios-label)] leading-none">${account.balance?.toLocaleString("en-US", { maximumFractionDigits: 0 })}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[12px] font-bold text-[var(--ios-secondary-label)] uppercase tracking-wider mb-1">P&L</p>
                      <p className={`text-[20px] font-bold font-mono tracking-tight leading-none ${(account.pnl || 0) >= 0 ? "text-[var(--ios-green)]" : "text-[var(--ios-red)]"}`}>
                        {(account.pnl || 0) >= 0 ? "+" : ""}${(account.pnl || 0).toFixed(0)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-[var(--ios-fill)]/50 p-3 rounded-[14px]">
                    <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[var(--ios-secondary-label)] mb-2">
                      <span className="flex items-center gap-1"><ShieldAlert size={12} /> Daily Drawdown</span>
                      <span className={isDanger ? "text-[var(--ios-red)]" : "text-[var(--ios-green)]"}>{dailyRisk.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-[var(--ios-surface)] rounded-full overflow-hidden shadow-inner">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isDanger ? "bg-[var(--ios-red)]" : dailyRisk >= 55 ? "bg-amber-500" : "bg-[var(--ios-green)]"}`} 
                        style={{ width: `${dailyRisk}%` }} 
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
