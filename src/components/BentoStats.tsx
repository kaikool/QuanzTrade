import { useMemo, useState } from "react";
import { Trade } from "../types";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  Layers,
  Sparkles,
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
      return { totalTrades: 0, winRate: 0, netPnl: 0, profitFactor: 0, averagePnl: 0, bestPair: "-", bestPairWinRate: 0 };
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

    return { totalTrades: total, winRate, netPnl, profitFactor, averagePnl, bestPair, bestPairWinRate };
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

  const winRateCircumference = 2 * Math.PI * 38;
  const winRateStrokeDashoffset = winRateCircumference - (stats.winRate / 100) * winRateCircumference;

  // Generate Smart Insight
  const insightMessage = useMemo(() => {
    if (stats.totalTrades === 0) return "Hãy ghi lại giao dịch đầu tiên của bạn để xem phân tích thông minh.";
    if (stats.netPnl < 0) return "Tài khoản đang âm nhẹ. Hãy rà soát lại các lệnh lỗ và giữ kỷ luật quản lý vốn nhé!";
    if (stats.bestPair !== "-") return `Phong độ xuất sắc! Bạn đang giao dịch cực tốt cặp ${stats.bestPair} với tỷ lệ thắng ${stats.bestPairWinRate.toFixed(0)}%.`;
    if (stats.winRate > 60) return "Tỷ lệ thắng đang duy trì ở mức cao. Tiếp tục phát huy chiến lược hiện tại!";
    return "Tài khoản đang tăng trưởng ổn định. Hãy giữ vững kỷ luật giao dịch.";
  }, [stats]);

  return (
    <div className="space-y-4 md:space-y-6">
      

      {/* 2. Apple Fitness Style Activity Rings & Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
        
        {/* Total Assets (Apple Card style) */}
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

        {/* Activity Rings (Win Rate & PF) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}
          className="ios-glass ios26-card bg-[var(--ios-surface)] p-6 shadow-ios-md flex items-center justify-between"
        >
          <div className="space-y-4 flex-1">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-wider text-[var(--ios-secondary-label)]">Tỷ lệ thắng</p>
              <p className="text-[24px] font-bold font-mono text-[var(--ios-label)] leading-none mt-1">{stats.winRate.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-[12px] font-bold uppercase tracking-wider text-[var(--ios-secondary-label)]">Profit Factor</p>
              <p className="text-[24px] font-bold font-mono text-[var(--ios-label)] leading-none mt-1">{stats.profitFactor.toFixed(2)}</p>
            </div>
          </div>

          <div className="relative w-[100px] h-[100px] flex-shrink-0 flex items-center justify-center">
            {/* Background Ring */}
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="50" cy="50" r="38" stroke="var(--ios-separator)" strokeWidth="10" fill="none" className="opacity-30" />
              {/* Progress Ring */}
              <circle 
                cx="50" cy="50" r="38" 
                stroke={stats.winRate >= 50 ? "var(--ios-green)" : "var(--ios-red)"} 
                strokeWidth="10" fill="none" 
                strokeLinecap="round"
                strokeDasharray={winRateCircumference}
                strokeDashoffset={winRateStrokeDashoffset}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <Activity size={24} className={stats.winRate >= 50 ? "text-[var(--ios-green)]" : "text-[var(--ios-red)]"} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* 3. Apple Stocks Style Chart */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="ios-glass ios26-card bg-[var(--ios-surface)] shadow-ios-md p-5 pb-2"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[18px] font-bold text-[var(--ios-label)]">Tăng trưởng</h3>
            <p className="text-[13px] font-medium text-[var(--ios-secondary-label)]">P&L tích luỹ</p>
          </div>
          
          {/* iOS Segmented Control for Chart */}
          <div className="flex bg-[var(--ios-fill)] p-0.5 rounded-[10px]">
            <button onClick={() => setSelectedChartRange("1W")} className={`px-3 py-1.5 text-[12px] font-bold rounded-[8px] transition-all ${selectedChartRange === "1W" ? "bg-[var(--ios-surface)] shadow-ios-sm text-[var(--ios-label)]" : "text-[var(--ios-secondary-label)]"}`}>1W</button>
            <button onClick={() => setSelectedChartRange("1M")} className={`px-3 py-1.5 text-[12px] font-bold rounded-[8px] transition-all ${selectedChartRange === "1M" ? "bg-[var(--ios-surface)] shadow-ios-sm text-[var(--ios-label)]" : "text-[var(--ios-secondary-label)]"}`}>1M</button>
            <button onClick={() => setSelectedChartRange("ALL")} className={`px-3 py-1.5 text-[12px] font-bold rounded-[8px] transition-all ${selectedChartRange === "ALL" ? "bg-[var(--ios-surface)] shadow-ios-sm text-[var(--ios-label)]" : "text-[var(--ios-secondary-label)]"}`}>ALL</button>
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
