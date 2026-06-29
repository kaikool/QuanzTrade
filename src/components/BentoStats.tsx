import { useMemo } from "react";
import { Trade } from "../types";
import {
  TrendingUp,
  TrendingDown,
  Percent,
  Activity,
  Award,
  Calendar,
  Layers,
  ChevronRight,
} from "lucide-react";
import { motion } from "motion/react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

interface BentoStatsProps {
  trades: Trade[];
  darkMode: boolean;
}

export function BentoStats({ trades, darkMode }: BentoStatsProps) {
  const stats = useMemo(() => {
    const total = trades.length;
    if (total === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        netPnl: 0,
        profitFactor: 0,
        averagePnl: 0,
        winningTrades: 0,
        losingTrades: 0,
        bestTrade: 0,
        worstTrade: 0,
      };
    }

    const wins = trades.filter((t) => t.pnl > 0);
    const losses = trades.filter((t) => t.pnl < 0);
    const winningTrades = wins.length;
    const losingTrades = losses.length;
    const winRate = total > 0 ? (winningTrades / total) * 100 : 0;

    // Sum pnl
    const netPnl = trades.reduce((sum, t) => sum + t.pnl, 0);

    // Profit factor: Gross profits / Gross losses
    const grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor =
      grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;

    const averagePnl = netPnl / total;

    const pnlList = trades.map((t) => t.pnl);
    const bestTrade = Math.max(...pnlList, 0);
    const worstTrade = Math.min(...pnlList, 0);

    return {
      totalTrades: total,
      winRate,
      netPnl,
      profitFactor,
      averagePnl,
      winningTrades,
      losingTrades,
      bestTrade,
      worstTrade,
    };
  }, [trades]);

  // Chart Data: Cumulative P&L over time
  const chartData = useMemo(() => {
    // Sort trades by entry date ascending
    const sortedTrades = [...trades].sort(
      (a, b) =>
        new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime(),
    );

    let runningSum = 0;
    return sortedTrades.map((t, index) => {
      runningSum += t.pnl;
      return {
        tradeNum: `T${index + 1}`,
        pnl: t.pnl,
        cumulative: runningSum,
        pair: t.pair,
        date: new Date(t.entry_date).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
      };
    });
  }, [trades]);

  // Map pairs distribution
  const pairData = useMemo(() => {
    const counts: { [key: string]: number } = {};
    trades.forEach((t) => {
      counts[t.pair] = (counts[t.pair] || 0) + 1;
    });
    return Object.entries(counts).map(([name, val]) => ({
      name,
      value: val,
    }));
  }, [trades]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-10" id="ios-dashboard-container">
      {/* 1. Hero Card: Apple Card / Wallet Style for Net Profit */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="ios26-hero-card w-full rounded-[28px] overflow-hidden relative shadow-ios-md aspect-[1.8/1] sm:aspect-[2.2/1] flex flex-col justify-between p-6 sm:p-8"
      >
        <div className="flex justify-between items-start text-white">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-white/20 rounded-full backdrop-blur-md">
              {stats.netPnl >= 0 ? (
                <TrendingUp size={20} />
              ) : (
                <TrendingDown size={20} />
              )}
            </div>
            <span className="text-white/90 font-medium text-lg tracking-wide truncate">
              Tổng Tài Sản
            </span>
          </div>
          <div className="ios26-brand-wordmark text-white/80 text-base font-black truncate">Táo Tầu Journal</div>
        </div>

        <div className="text-white">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-1">
            {stats.netPnl >= 0 ? "+" : "-"}$
            {Math.abs(stats.netPnl).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </h2>
          <p className="text-white/80 text-base sm:text-lg font-medium">
            Lợi nhuận ròng hiện tại
          </p>
        </div>
      </motion.div>

      {/* 2. Settings-Style Inset Grouped List for Secondary Stats */}
      <div className="mt-8">
        <h3 className="text-[var(--sys-text-secondary)] uppercase text-sm font-semibold tracking-wider ml-4 mb-2">
          Hiệu Suất Giao Dịch
        </h3>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="ios26-list-group overflow-hidden"
        >
          {/* Row: Win Rate */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--sys-border)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--sys-blue)] flex items-center justify-center text-white">
                <Percent size={18} />
              </div>
              <span className="text-[var(--sys-text)] font-medium text-lg truncate pr-2">Tỷ lệ thắng</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--sys-text-secondary)]">
              <span className="font-semibold text-[var(--sys-text)] text-lg">{stats.winRate.toFixed(1)}%</span>
              <ChevronRight size={16} />
            </div>
          </div>

          {/* Row: Profit Factor */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--sys-border)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--sys-blue)] flex items-center justify-center text-white">
                <Activity size={18} />
              </div>
              <span className="text-[var(--sys-text)] font-medium text-lg truncate pr-2">Hệ số lợi nhuận</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--sys-text-secondary)]">
              <span className="font-semibold text-[var(--sys-text)] text-lg">{stats.profitFactor.toFixed(2)}</span>
              <ChevronRight size={16} />
            </div>
          </div>

          {/* Row: Average Pnl */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--sys-border)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--sys-blue)] flex items-center justify-center text-white">
                <Award size={18} />
              </div>
              <span className="text-[var(--sys-text)] font-medium text-lg truncate pr-2">Lệnh trung bình</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--sys-text-secondary)]">
              <span className={`font-semibold text-lg ${stats.averagePnl >= 0 ? 'text-[var(--sys-green)]' : 'text-[var(--sys-red)]'}`}>
                {stats.averagePnl >= 0 ? "+" : ""}${stats.averagePnl.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </span>
              <ChevronRight size={16} />
            </div>
          </div>
          
          {/* Row: Best Trade */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--sys-border)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--sys-green)] flex items-center justify-center text-white">
                <TrendingUp size={18} />
              </div>
              <span className="text-[var(--sys-text)] font-medium text-lg truncate pr-2">Lệnh thắng lớn nhất</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--sys-text-secondary)]">
              <span className="font-semibold text-[var(--sys-green)] text-lg">+${stats.bestTrade.toLocaleString()}</span>
              <ChevronRight size={16} />
            </div>
          </div>

          {/* Row: Worst Trade */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--sys-red)] flex items-center justify-center text-white">
                <TrendingDown size={18} />
              </div>
              <span className="text-[var(--sys-text)] font-medium text-lg truncate pr-2">Lệnh lỗ lớn nhất</span>
            </div>
            <div className="flex items-center gap-2 text-[var(--sys-text-secondary)]">
              <span className="font-semibold text-[var(--sys-red)] text-lg">${stats.worstTrade.toLocaleString()}</span>
              <ChevronRight size={16} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* 3. iOS Health / Stocks Style Chart Cards */}
      <div className="mt-8 space-y-6">
        <h3 className="text-[var(--sys-text-secondary)] uppercase text-sm font-semibold tracking-wider ml-4 mb-2">
          Biểu Đồ Trực Quan
        </h3>
        
        {/* Cumulative Profit Chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="ios26-chart-card p-6"
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <h4 className="text-xl font-bold text-[var(--sys-text)] tracking-tight">
                Lợi Nhuận Tích Luỹ
              </h4>
              <p className="text-base text-[var(--sys-text-secondary)] mt-1 font-medium">
                Sự tăng trưởng tài khoản qua các lệnh
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-[var(--sys-blue)]/10 text-[var(--sys-blue)] flex items-center justify-center">
              <Activity size={16} />
            </div>
          </div>

          <div className="w-full h-56 mt-2">
            {chartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[var(--sys-text-secondary)]">
                <Calendar size={32} className="mb-2 opacity-50" />
                <p className="text-base font-medium">Chưa có dữ liệu giao dịch.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ left: -20, right: 0, top: 10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--sys-blue)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--sys-blue)" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="tradeNum"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--sys-text-secondary)", fontSize: 11, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--sys-text-secondary)", fontSize: 11, fontWeight: 500 }}
                    tickFormatter={(val) => `$${val}`}
                    dx={-10}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: "16px",
                      background: "var(--sys-surface-2)",
                      border: "1px solid var(--sys-border)",
                      color: "var(--sys-text)",
                      fontSize: "13px",
                      fontWeight: 500,
                      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                      backdropFilter: "blur(20px)"
                    }}
                    itemStyle={{ color: "var(--sys-blue)", fontWeight: 700 }}
                    formatter={(value: any, name: string) => {
                      if (name === "cumulative") return [`$${Number(value).toFixed(2)}`, "Lợi nhuận"];
                      return [`$${value}`, "Lệnh"];
                    }}
                    labelFormatter={(label, items) => {
                      return items?.[0]?.payload?.pair || label;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cumulative"
                    stroke="var(--sys-blue)"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorCumulative)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        {/* Pair Performance Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="ios26-chart-card p-6"
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <h4 className="text-xl font-bold text-[var(--sys-text)] tracking-tight">
                Tần Suất Cặp Tiền
              </h4>
              <p className="text-base text-[var(--sys-text-secondary)] mt-1 font-medium">
                Các tài sản giao dịch nhiều nhất
              </p>
            </div>
            <div className="w-8 h-8 rounded-full bg-[var(--sys-blue)]/10 text-[var(--sys-blue)] flex items-center justify-center">
              <Layers size={16} />
            </div>
          </div>

          <div className="w-full h-48 mt-2">
            {pairData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-[var(--sys-text-secondary)]">
                <Layers size={32} className="mb-2 opacity-50" />
                <p className="text-base font-medium">Chưa đủ dữ liệu</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pairData} margin={{ left: -20, right: 0, top: 10, bottom: 0 }}>
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--sys-text-secondary)", fontSize: 11, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "var(--sys-text-secondary)", fontSize: 11, fontWeight: 500 }}
                    allowDecimals={false}
                    dx={-10}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--sys-border)', opacity: 0.5 }}
                    contentStyle={{
                      borderRadius: "16px",
                      background: "var(--sys-surface-2)",
                      border: "1px solid var(--sys-border)",
                      color: "var(--sys-text)",
                      fontSize: "13px",
                      fontWeight: 500,
                      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1)",
                    }}
                    itemStyle={{ color: "var(--sys-blue)", fontWeight: 700 }}
                    formatter={(value) => [`${value} lệnh`, "Tần suất"]}
                  />
                  <Bar dataKey="value" radius={[8, 8, 8, 8]}>
                    {pairData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill="var(--sys-blue)"
                        fillOpacity={index % 2 === 0 ? 1 : 0.6}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
