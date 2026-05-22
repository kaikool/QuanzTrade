import { useMemo } from "react";
import { Trade } from "../types";
import { 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  Activity, 
  Award,
  Calendar,
  Layers
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
  Cell
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

    const wins = trades.filter(t => t.pnl > 0);
    const losses = trades.filter(t => t.pnl < 0);
    const winningTrades = wins.length;
    const losingTrades = losses.length;
    const winRate = total > 0 ? (winningTrades / total) * 100 : 0;
    
    // Sum pnl
    const netPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
    
    // Profit factor: Gross profits / Gross losses
    const grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;
    
    const averagePnl = netPnl / total;
    
    const pnlList = trades.map(t => t.pnl);
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
      (a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
    );

    let runningSum = 0;
    return sortedTrades.map((t, index) => {
      runningSum += t.pnl;
      return {
        tradeNum: `T${index + 1}`,
        pnl: t.pnl,
        cumulative: runningSum,
        pair: t.pair,
        date: new Date(t.entry_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      };
    });
  }, [trades]);

  // Map pairs distribution
  const pairData = useMemo(() => {
    const counts: { [key: string]: number } = {};
    trades.forEach(t => {
      counts[t.pair] = (counts[t.pair] || 0) + 1;
    });
    return Object.entries(counts).map(([name, val]) => ({
      name,
      value: val
    }));
  }, [trades]);

  return (
    <div className="space-y-6" id="google-bento-container-stats">
      {/* Material 3 Bento Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" id="m3-stats-grid">
        
        {/* Net Profit card */}
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className={`p-4 sm:p-6 rounded-[24px] ${darkMode ? "bg-google-dark-surface" : "bg-white"} flex flex-col justify-between min-h-[125px] sm:min-h-[155px] shadow-sm hover:shadow-md transition-all duration-250`}
          id="m3-card-pnl"
        >
          <div className="flex justify-between items-start gap-1">
            <span className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 font-display truncate">Lợi nhuận ròng</span>
            <div className={`p-1.5 sm:p-2 rounded-full flex-shrink-0 ${stats.netPnl >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
              {stats.netPnl >= 0 ? <TrendingUp size={16} className="sm:w-4.5 sm:h-4.5" /> : <TrendingDown size={16} className="sm:w-4.5 sm:h-4.5" />}
            </div>
          </div>
          <div className="min-w-0 mt-2">
            <h3 
              className={`text-lg xs:text-xl sm:text-2xl md:text-3xl font-black tracking-tight font-display truncate ${stats.netPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`} 
              id="net-pnl-val"
              title={`${stats.netPnl >= 0 ? "+" : ""}${stats.netPnl.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            >
              {stats.netPnl >= 0 ? "+" : ""}${stats.netPnl.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </h3>
            <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-1 font-medium truncate">Tổng kết toàn bộ tài sản</p>
          </div>
        </motion.div>

        {/* Win Rate card */}
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className={`p-4 sm:p-6 rounded-[24px] ${darkMode ? "bg-google-dark-surface" : "bg-white"} flex flex-col justify-between min-h-[125px] sm:min-h-[155px] shadow-sm hover:shadow-md transition-all duration-250`}
          id="m3-card-winrate"
        >
          <div className="flex justify-between items-start gap-1">
            <span className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 font-display truncate">Tỷ lệ thắng</span>
            <div className="p-1.5 sm:p-2 rounded-full bg-blue-100 text-google-blue-600 dark:bg-google-blue-100/10 dark:text-google-blue-200 flex-shrink-0">
              <Percent size={16} className="sm:w-4.5 sm:h-4.5" />
            </div>
          </div>
          <div className="min-w-0 mt-2">
            <h3 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white font-display truncate" id="win-rate-val">
              {stats.winRate.toFixed(1)}%
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium truncate">
              {stats.winningTrades} thắng / {stats.totalTrades} lệnh
            </p>
          </div>
        </motion.div>

        {/* Profit Factor card */}
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.15 }}
          className={`p-4 sm:p-6 rounded-[24px] ${darkMode ? "bg-google-dark-surface" : "bg-white"} flex flex-col justify-between min-h-[125px] sm:min-h-[155px] shadow-sm hover:shadow-md transition-all duration-250`}
          id="m3-card-pf"
        >
          <div className="flex justify-between items-start gap-1">
            <span className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 font-display truncate">Hệ số lợi nhuận</span>
            <div className="p-1.5 sm:p-2 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-100/10 dark:text-amber-400 flex-shrink-0">
              <Activity size={16} className="sm:w-4.5 sm:h-4.5" />
            </div>
          </div>
          <div className="min-w-0 mt-2">
            <h3 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-gray-900 dark:text-white font-display truncate" id="pf-val">
              {stats.profitFactor.toFixed(2)}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium truncate">Tổng lời / tổng lỗ</p>
          </div>
        </motion.div>

        {/* Average trade card */}
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.2 }}
          className={`p-4 sm:p-6 rounded-[24px] ${darkMode ? "bg-google-dark-surface" : "bg-white"} flex flex-col justify-between min-h-[125px] sm:min-h-[155px] shadow-sm hover:shadow-md transition-all duration-250`}
          id="m3-card-avg"
        >
          <div className="flex justify-between items-start gap-1">
            <span className="text-xs sm:text-sm font-bold text-gray-500 dark:text-gray-400 font-display truncate">Lợi nhuận trung bình</span>
            <div className={`p-1.5 sm:p-2 rounded-full flex-shrink-0 ${stats.averagePnl >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
              <Award size={16} className="sm:w-4.5 sm:h-4.5" />
            </div>
          </div>
          <div className="min-w-0 mt-2">
            <h3 className={`text-lg xs:text-xl sm:text-2xl md:text-3xl font-black tracking-tight font-display truncate ${stats.averagePnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`} id="avg-pnl-val">
              {stats.averagePnl >= 0 ? "+" : ""}${stats.averagePnl.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium truncate">Hiệu suất trung bình mỗi lệnh</p>
          </div>
        </motion.div>
      </div>

      {/* Main Charts Block - Material 3 Surface design */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="m3-charts-block">
        
        {/* Cumulative Profit Chart */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: 0.25 }}
          className={`lg:col-span-2 p-5 sm:p-6 rounded-[24px] ${darkMode ? "bg-google-dark-surface" : "bg-white"} flex flex-col justify-between min-h-[280px] sm:min-h-[370px] shadow-sm`}
          id="m3-chart-card-cumulative"
        >
          <div className="flex justify-between items-center mb-4 gap-2">
            <div>
              <h4 className="text-base sm:text-lg font-extrabold text-gray-950 dark:text-white font-display">Lợi Nhuận Tích Luỹ (USD)</h4>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">Sự tăng trưởng tài khoản theo thứ tự lệnh</p>
            </div>
            <div className="text-xs font-mono font-bold text-google-blue-600 dark:text-google-blue-300 bg-google-blue-50 dark:bg-google-blue-600/10 px-2.5 sm:px-3 py-1 rounded-full flex-shrink-0">
              Live Tracker
            </div>
          </div>

          <div className="w-full h-44 sm:h-64 mt-2">
            {chartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                <Calendar size={36} className="text-gray-300 dark:text-gray-700" />
                <p className="text-sm">Chưa có dữ liệu biểu đồ. Hãy thêm giao dịch!</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1a73e8" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#1a73e8" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="tradeNum" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "#9ca3af", fontSize: 10 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "#9ca3af", fontSize: 10 }}
                    tickFormatter={(val) => `$${val}`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: "12px", 
                      background: "rgba(30, 31, 32, 0.95)", 
                      border: "none", 
                      color: "#fff",
                      fontSize: "12px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.25)"
                    }}
                    formatter={(value: any, name: string, props: any) => {
                      if (name === "cumulative") return [`$${Number(value).toFixed(2)}`, "Cumulative"];
                      return [`$${value}`, "Từng lệnh"];
                    }}
                    labelFormatter={(label, items) => {
                      if (items && items[0]) {
                        return `${items[0].payload.pair} (${items[0].payload.date})`;
                      }
                      return label;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="cumulative" 
                    stroke="#1a73e8" 
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
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: 0.3 }}
          className={`p-5 sm:p-6 rounded-[24px] ${darkMode ? "bg-google-dark-surface" : "bg-white"} flex flex-col justify-between shadow-sm`}
          id="m3-chart-card-distribution"
        >
          <div className="mb-4">
            <h4 className="text-base sm:text-lg font-extrabold text-gray-950 dark:text-white font-display">Tần Suất Giao Dịch</h4>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Các cặp tiền tệ thường dùng nhất</p>
          </div>

          <div className="w-full h-40 sm:h-48 flex items-center justify-center mt-2">
            {pairData.length === 0 ? (
              <div className="text-gray-400 flex flex-col items-center">
                <Layers className="text-gray-300 dark:text-gray-700" size={32} />
                <p className="text-xs mt-2">Chưa đủ dữ liệu</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pairData}>
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "#9ca3af", fontSize: 10 }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: "#9ca3af", fontSize: 10 }}
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: "12px", 
                      background: "rgba(30, 31, 32, 0.95)", 
                      border: "none", 
                      color: "#fff",
                      fontSize: "12px"
                    }}
                    formatter={(value) => [`${value} lệnh`, "Tần suất"]}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {pairData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={index % 2 === 0 ? "#1a73e8" : "#8ab4f8"} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Quick Stats list */}
          <div className="space-y-3.5 mt-4 pt-4 border-t border-gray-100 dark:border-white/5 text-sm text-gray-550 dark:text-gray-400 font-medium">
            <div className="flex justify-between items-center">
              <span>Giao dịch thắng lớn nhất:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-base">+${stats.bestTrade.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Giao dịch lỗ lớn nhất:</span>
              <span className="font-mono font-bold text-rose-500 dark:text-rose-400 text-base">${stats.worstTrade.toLocaleString()}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
