import { useState } from "react";
import { motion } from "motion/react";
import { TrendingUp, TrendingDown, DollarSign, Target, History, ChevronRight, RefreshCw } from "lucide-react";
import type { T5AccountOverview, T5Purchase } from "../types";

interface Props {
  accounts: T5AccountOverview[];
  purchases: T5Purchase[];
  onSelectAccount: (account: T5AccountOverview) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  formatCurrency: (value: number) => string;
}

export default function The5ersOverview({ accounts, purchases, onSelectAccount, onRefresh, refreshing, formatCurrency }: Props) {
  const [showDisabled, setShowDisabled] = useState(false);

  const totalSpend = purchases.reduce((sum, p) => sum + p.price, 0);
  const totalPnl = accounts.reduce((sum, a) => sum + a.pnl, 0);
  const netRoi = totalPnl - totalSpend;

  const activeAccounts = accounts.filter(
    (a) => a.status === "active" || a.status === "available"
  );
  const disabledAccounts = accounts.filter(
    (a) => a.status !== "active" && a.status !== "available"
  );

  const groupByType = (group: T5AccountOverview[]) => ({
    funded: group.filter((a) => a.type === "funded"),
    evaluation: group.filter((a) => a.type === "evaluation"),
    demo: group.filter((a) => a.type === "demo"),
  });

  const activeGroup = groupByType(activeAccounts);
  const disabledGroup = groupByType(disabledAccounts);

  const renderAccountCard = (account: T5AccountOverview) => {
    const pnlPercent = account.pnl > 0 && account.balance > 0
      ? ((account.pnl / (account.balance - account.pnl)) * 100).toFixed(1)
      : null;

    return (
      <motion.div
        key={account.accountId}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-m3-surface p-5 rounded-[24px] shadow-level1 hover:shadow-level2 transition-all cursor-pointer"
        onClick={() => onSelectAccount(account)}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold m3-body-medium text-m3-on-surface truncate mr-2">
            {account.name}
          </span>
          <span
            className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider flex-shrink-0 ${
              account.type === "funded"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : account.type === "evaluation"
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  : "bg-m3-surface-container text-m3-on-surface-variant"
            }`}
          >
            {account.type === "funded"
              ? "Funded"
              : account.type === "evaluation"
                ? "Eval"
                : "Demo"}
          </span>
        </div>

        {/* Quick P&L Banner */}
        <div className={`flex items-center gap-2 text-xs font-semibold mb-3 px-3 py-2 rounded-[12px] ${
          account.pnl > 0
            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : account.pnl < 0
              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
              : "bg-m3-surface-container text-m3-on-surface-variant"
        }`}>
          {account.pnl > 0 ? <TrendingUp size={14} /> : account.pnl < 0 ? <TrendingDown size={14} /> : null}
          P&L: {account.pnl >= 0 ? "+" : ""}{formatCurrency(account.pnl)}
          {pnlPercent && ` (${pnlPercent}%)`}
        </div>

        {/* Metrics */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-m3-on-surface-variant">Số dư</span>
            <span className="font-bold text-sm text-m3-on-surface font-mono">
              {formatCurrency(account.balance)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-m3-on-surface-variant">Vốn thực</span>
            <span className="font-bold text-sm text-m3-on-surface font-mono">
              {formatCurrency(account.equity)}
            </span>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderSection = (title: string, items: T5AccountOverview[], dimmed = false) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-3" style={{ opacity: dimmed ? 0.6 : 1 }}>
        {title && (
          <div className="flex items-center gap-2 px-1">
            <span className="text-xs font-semibold text-m3-on-surface-variant uppercase tracking-wider">
              {title}
            </span>
            <span className="text-xs bg-m3-surface-container text-m3-on-surface-variant px-2 py-0.5 rounded-full font-bold">
              {items.length}
            </span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(renderAccountCard)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-m3-on-surface">Tổng quan tài khoản</h2>
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-m3-primary-container text-m3-primary rounded-full text-xs font-bold hover:bg-m3-primary-container/80 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Đang đồng bộ..." : "Đồng bộ"}
          </button>
        )}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <div className="bg-m3-surface p-4 sm:p-5 rounded-[24px] shadow-level1">
          <div className="flex items-center gap-2 text-xs font-semibold text-m3-on-surface-variant mb-2">
            <DollarSign size={14} className="text-m3-primary" />
            Tổng chi phí
          </div>
          <div className="text-xl sm:text-2xl font-black text-m3-on-surface font-display">
            {formatCurrency(totalSpend)}
          </div>
        </div>
        <div className="bg-m3-surface p-4 sm:p-5 rounded-[24px] shadow-level1">
          <div className="flex items-center gap-2 text-xs font-semibold text-m3-on-surface-variant mb-2">
            <TrendingUp size={14} className={totalPnl >= 0 ? "text-emerald-500" : "text-rose-500"} />
            Tổng P&L
          </div>
          <div
            className={`text-xl sm:text-2xl font-black font-display ${
              totalPnl > 0
                ? "text-emerald-500"
                : totalPnl < 0
                  ? "text-rose-500"
                  : "text-m3-on-surface"
            }`}
          >
            {totalPnl >= 0 ? "+" : ""}
            {formatCurrency(totalPnl)}
          </div>
        </div>
        <div className="bg-m3-surface p-4 sm:p-5 rounded-[24px] shadow-level1">
          <div className="flex items-center gap-2 text-xs font-semibold text-m3-on-surface-variant mb-2">
            <Target size={14} className={netRoi >= 0 ? "text-emerald-500" : "text-rose-500"} />
            ROI ròng
          </div>
          <div
            className={`text-xl sm:text-2xl font-black font-display ${
              netRoi > 0
                ? "text-emerald-500"
                : netRoi < 0
                  ? "text-rose-500"
                  : "text-m3-on-surface"
            }`}
          >
            {netRoi >= 0 ? "+" : ""}
            {formatCurrency(netRoi)}
          </div>
        </div>
      </motion.div>

      {/* Active Accounts Section */}
      <div className="flex items-center gap-2 px-1">
        <div className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg">
          <TrendingUp size={14} />
        </div>
        <span className="text-sm font-bold text-m3-on-surface">Đang hoạt động</span>
        <span className="text-xs bg-m3-primary-container text-m3-primary px-2 py-0.5 rounded-full font-bold">
          {activeAccounts.length}
        </span>
      </div>

      {activeAccounts.length === 0 ? (
        <div className="text-center py-12 text-m3-on-surface-variant text-sm">
          Không có tài khoản nào đang hoạt động
        </div>
      ) : (
        <>
          {activeGroup.funded.length > 0 && renderSection("Cấp vốn", activeGroup.funded)}
          {activeGroup.evaluation.length > 0 && renderSection("Đánh giá", activeGroup.evaluation)}
          {activeGroup.demo.length > 0 && renderSection("Demo", activeGroup.demo)}
        </>
      )}

      {/* Disabled Accounts */}
      {disabledAccounts.length > 0 && (
        <>
          <hr className="border-m3-outline-variant" />
          <div>
            <button
              onClick={() => setShowDisabled(!showDisabled)}
              className="flex items-center gap-2 text-sm font-semibold text-m3-on-surface-variant hover:text-m3-on-surface transition-colors px-1"
            >
              <History size={14} />
              Đã vô hiệu hóa
              <span className="text-xs bg-m3-surface-container text-m3-on-surface-variant px-2 py-0.5 rounded-full font-bold">
                {disabledAccounts.length}
              </span>
              <ChevronRight
                size={14}
                className={`transition-transform ${showDisabled ? "rotate-90" : ""}`}
              />
            </button>
            {showDisabled && (
              <div className="mt-4 space-y-4">
                {disabledGroup.funded.length > 0 && renderSection("Cấp vốn", disabledGroup.funded, true)}
                {disabledGroup.evaluation.length > 0 && renderSection("Đánh giá", disabledGroup.evaluation, true)}
                {disabledGroup.demo.length > 0 && renderSection("Demo", disabledGroup.demo, true)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
