import { useMemo, useState } from "react";
import { Trade } from "../types";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

interface BentoStatsProps {
  trades: Trade[];
  darkMode: boolean;
}

export function BentoStats({ trades, darkMode }: BentoStatsProps) {
  const [selectedChartRange, setSelectedChartRange] = useState<"ALL" | "1M" | "1W">("ALL");

  const stats = useMemo(() => {
    const total = trades.length;
    if (total === 0) {
      return { totalTrades: 0, winRate: 0, netPnl: 0, profitFactor: 0, averagePnl: 0, bestPair: "-", bestPairWinRate: 0, winCount: 0, lossCount: 0, avgWin: 0, avgLoss: 0 };
    }
    const wins = trades.filter((t) => t.pnl > 0);
    const losses = trades.filter((t) => t.pnl < 0);
    const winRate = total > 0 ? (wins.length / total) * 100 : 0;
    const netPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
    const grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;
    const averagePnl = netPnl / total;

    // Find best pair
    const pairStats: Record<string, { total: number; wins: number }> = {};
    trades.forEach(t => {
      if (!pairStats[t.pair]) pairStats[t.pair] = { total: 0, wins: 0 };
      pairStats[t.pair].total += 1;
      if (t.pnl > 0) pairStats[t.pair].wins += 1;
    });
    
    let bestPair = "-";
    let maxWins = 0;
    let bestPairWinRate = 0;
    Object.entries(pairStats).forEach(([pair, data]) => {
      if (data.wins > maxWins && data.total >= 3) {
        maxWins = data.wins;
        bestPair = pair;
        bestPairWinRate = (data.wins / data.total) * 100;
      }
    });
    const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
    const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;

    return { totalTrades: total, winRate, netPnl, profitFactor, averagePnl, bestPair, bestPairWinRate, winCount: wins.length, lossCount: losses.length, avgWin, avgLoss };
  }, [trades]);

  const chartData = useMemo(() => {
    let filteredTrades = [...trades].sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime());
    
    if (selectedChartRange === "1W") {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      filteredTrades = filteredTrades.filter(t => new Date(t.entry_date) >= oneWeekAgo);
    } else if (selectedChartRange === "1M") {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      filteredTrades = filteredTrades.filter(t => new Date(t.entry_date) >= oneMonthAgo);
    }

    let runningSum = 0;
    return filteredTrades.map((t) => {
      runningSum += t.pnl;
      return {
        cumulative: runningSum,
        date: new Date(t.entry_date).toLocaleDateString("vi-VN", { month: "short", day: "numeric" }),
        pnl: t.pnl,
        pair: t.pair,
      };
    });
  }, [trades, selectedChartRange]);

  return (
    <div className="space-y-4 md:space-y-6">
      

      {/* Hero — Lợi nhuận ròng (full width) */}
      <div className="grid grid-cols-1 gap-4 md:gap-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
          className="ios26-hero-card rounded-[30px] p-6 text-white shadow-ios-xl flex flex-col justify-between min-h-[180px]"
        >
          <div className="flex justify-between items-start">
            <div className="p-2.5 bg-white/20 rounded-full backdrop-blur-md">
              {stats.netPnl >= 0 ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
            </div>
            <span className="text-[13px] font-bold tracking-widest uppercase opacity-80">Lợi nhuận ròng</span>
          </div>
          <div>
            <h2 className="text-[40px] md:text-[48px] font-bold font-mono tracking-tighter leading-none mb-1">
              {stats.netPnl >= 0 ? "+" : "-"}${Math.abs(stats.netPnl).toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </h2>
            <p className="text-[16px] font-medium opacity-90">Từ {stats.totalTrades} giao dịch</p>
          </div>
        </motion.div>
      </div>
      {/* Secondary performance — intentionally quieter than net P&L */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4"
      >
        <div className="ios-glass rounded-[22px] border border-[var(--ios-separator)]/25 bg-[var(--ios-surface)]/45 p-4 shadow-ios-sm min-h-[112px] flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--ios-secondary-label)]">Tỷ lệ thắng</p>
            <span className="text-[12px] font-bold text-[var(--ios-secondary-label)]">{stats.winCount}W / {stats.lossCount}L</span>
          </div>
          <div className="flex items-end justify-between gap-4">
            <p className="text-[28px] md:text-[30px] font-black font-mono text-[var(--ios-label)] leading-none tracking-[-0.04em]">
              {stats.winRate.toFixed(1)}%
            </p>
            <div className="flex-1 max-w-[180px] pb-1">
              <div className="flex h-2 rounded-full overflow-hidden bg-[var(--ios-fill)]">
                <div className="bg-[var(--ios-green)] h-full" style={{ width: `${stats.winRate}%` }} />
                <div className="bg-[var(--ios-red)]/70 h-full" style={{ width: `${100 - stats.winRate}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="ios-glass rounded-[22px] border border-[var(--ios-separator)]/25 bg-[var(--ios-surface)]/45 p-4 shadow-ios-sm min-h-[112px] flex flex-col justify-between">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[var(--ios-secondary-label)]">Profit Factor</p>
              <p className="text-[28px] md:text-[30px] font-black font-mono text-[var(--ios-label)] leading-none tracking-[-0.04em] mt-3">{stats.profitFactor.toFixed(2)}</p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${stats.profitFactor >= 1.5 ? "bg-[var(--ios-green)]/10 text-[var(--ios-green)]" : stats.profitFactor >= 1 ? "bg-[var(--ios-orange)]/10 text-[var(--ios-orange)]" : "bg-[var(--ios-red)]/10 text-[var(--ios-red)]"}`}>
              {stats.profitFactor >= 1.5 ? "Tốt" : stats.profitFactor >= 1 ? "Ổn" : "Yếu"}
            </span>
          </div>
        </div>
      </motion.div>

      {/* 3. Apple Stocks Style Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="ios-glass ios26-card shadow-ios-md p-5 pb-2"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[18px] font-bold text-[var(--ios-label)]">Tăng trưởng</h3>
            <p className="text-[13px] font-medium text-[var(--ios-secondary-label)]">P&L tích luỹ</p>
          </div>
          
          {/* iOS Segmented Control for Chart */}
          <div className="flex bg-[var(--ios-fill)] p-0.5 rounded-[10px] shadow-sm">
            <button onClick={() => setSelectedChartRange("1W")} className={`px-3.5 py-1.5 text-[12px] font-bold rounded-[8px] transition-all ${selectedChartRange === "1W" ? "bg-[var(--ios-surface)] shadow-ios-sm text-[var(--ios-label)]" : "text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)]"}`}>1W</button>
            <button onClick={() => setSelectedChartRange("1M")} className={`px-3.5 py-1.5 text-[12px] font-bold rounded-[8px] transition-all ${selectedChartRange === "1M" ? "bg-[var(--ios-surface)] shadow-ios-sm text-[var(--ios-label)]" : "text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)]"}`}>1M</button>
            <button onClick={() => setSelectedChartRange("ALL")} className={`px-3.5 py-1.5 text-[12px] font-bold rounded-[8px] transition-all ${selectedChartRange === "ALL" ? "bg-[var(--ios-surface)] shadow-ios-sm text-[var(--ios-label)]" : "text-[var(--ios-secondary-label)] hover:text-[var(--ios-label)]"}`}>ALL</button>
          </div>
        </div>

        <div className="w-full h-64 -ml-2">
          {chartData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-[var(--ios-secondary-label)]">
              <Calendar size={32} className="mb-2 opacity-30" />
              <p className="text-sm font-medium">Chưa có dữ liệu</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="stocksGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--ios-blue)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--ios-blue)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                {/* Remove Grid lines, keep axes minimal */}
                <XAxis dataKey="date" hide={true} />
                <YAxis hide={true} domain={['auto', 'auto']} />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[var(--sys-glass)] border border-[var(--sys-border)] p-3 rounded-[12px] shadow-ios-md backdrop-blur-[20px]">
                          <p className="text-[12px] font-bold text-[var(--ios-secondary-label)] mb-1">{label}</p>
                          <p className="text-[14px] font-bold font-mono text-[var(--ios-label)]">
                            P&L: ${Number(payload[0].value).toFixed(0)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                  cursor={{ stroke: "var(--ios-secondary-label)", strokeWidth: 1, strokeDasharray: "4 4" }}
                />
                <Area 
                  type="monotone" 
                  dataKey="cumulative" 
                  stroke="var(--ios-blue)" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#stocksGradient)" 
                  activeDot={{ r: 6, fill: "var(--ios-surface)", stroke: "var(--ios-blue)", strokeWidth: 3 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

    </div>
  );
}
