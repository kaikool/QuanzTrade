import { motion } from "motion/react";
import {
  ArrowLeft,
  AlertTriangle,
  Shield,
  Verified,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Target,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { T5AccountOverview, T5AccountDetail, T5Trade } from "../types";
import { calculateT5RiskBuffer } from "../utils/risk-the5ers";

interface Props {
  account: T5AccountOverview;
  detail: T5AccountDetail | null;
  trades: T5Trade[];
  onClose: () => void;
  formatCurrency: (value: number) => string;
}

const mockDrawdownData = [
  { day: "T2", balance: 50000, equity: 50200, dailyLimit: -1500, overallLimit: -5000 },
  { day: "T3", balance: 49800, equity: 49900, dailyLimit: -1500, overallLimit: -5000 },
  { day: "T4", balance: 50100, equity: 50500, dailyLimit: -1500, overallLimit: -5000 },
  { day: "T5", balance: 50300, equity: 50200, dailyLimit: -1500, overallLimit: -5000 },
  { day: "T6", balance: 50500, equity: 50800, dailyLimit: -1500, overallLimit: -5000 },
  { day: "T7", balance: 50700, equity: 50600, dailyLimit: -1500, overallLimit: -5000 },
  { day: "CN", balance: 51000, equity: 51200, dailyLimit: -1500, overallLimit: -5000 },
];

export default function The5ersDetailPanel({ account, detail, trades, onClose, formatCurrency }: Props) {
  const risk = calculateT5RiskBuffer(account, detail);

  const getRiskInfo = () => {
    if (risk.dailyStatus === "danger")
      return { text: "Nguy hiểm — Sắp chạm mức lỗ tối đa", icon: AlertTriangle, color: "text-rose-500 bg-rose-500/10" };
    if (risk.overallStatus === "danger")
      return { text: "Nguy hiểm — Rủi ro tổng thể cao", icon: Shield, color: "text-orange-500 bg-orange-500/10" };
    if (risk.dailyStatus === "warning")
      return { text: "Cảnh báo — Giảm khối lượng giao dịch", icon: AlertTriangle, color: "text-amber-500 bg-amber-500/10" };
    return { text: "An toàn — Các thông số bình thường", icon: Verified, color: "text-emerald-500 bg-emerald-500/10" };
  };

  const riskInfo = getRiskInfo();
  const RiskIcon = riskInfo.icon;

  const metrics = [
    { label: "Số dư", value: formatCurrency(detail?.balance ?? account.balance), icon: DollarSign },
    { label: "Vốn thực", value: formatCurrency(detail?.equity ?? account.equity), icon: BarChart3 },
    { label: "Lợi nhuận", value: formatCurrency(detail?.pnl ?? account.pnl), color: (detail?.pnl ?? account.pnl) > 0 ? "text-emerald-500" : (detail?.pnl ?? account.pnl) < 0 ? "text-rose-500" : undefined, icon: TrendingUp },
    { label: "DD Ngày", value: detail?.dailyDrawdown !== undefined ? formatCurrency(detail.dailyDrawdown) : "N/A", icon: TrendingDown },
    { label: "DD Tối đa", value: detail?.maxDrawdown !== undefined ? formatCurrency(detail.maxDrawdown) : "N/A", icon: TrendingDown },
    { label: "TL thắng", value: detail?.winRate !== undefined ? `${detail.winRate.toFixed(1)}%` : "N/A", icon: Target },
    { label: "Tổng lệnh", value: detail?.totalTrades !== undefined ? String(detail.totalTrades) : "N/A", icon: BarChart3 },
    { label: "Profit Factor", value: detail?.profitFactor !== undefined ? detail.profitFactor.toFixed(2) : "N/A", icon: TrendingUp },
  ];

  const chartData = detail?.stats?.balanceDetails?.dailyBalances?.map((d: any) => ({
    day: d.date?.slice(5, 10) || d.label || "",
    balance: d.balance || 0,
    equity: d.equity || 0,
    dailyLimit: detail.dailyDrawdownLimit || -1500,
    overallLimit: detail.maxDrawdownLimit || -5000,
  })) || mockDrawdownData;

  return (
    <div className="space-y-6">
      <button onClick={onClose} className="flex items-center gap-2 text-sm font-semibold text-m3-primary hover:underline">
        <ArrowLeft size={16} /> Quay lại
      </button>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="text-lg font-bold text-m3-on-surface">{account.name}</h2>
        <p className="text-xs text-m3-on-surface-variant font-mono mt-1">{account.accountId} • {account.type.toUpperCase()}</p>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className={`flex items-center gap-2 text-sm font-semibold px-4 py-3 rounded-[16px] ${riskInfo.color}`}>
        <RiskIcon size={16} /> {riskInfo.text}
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <motion.div key={m.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="bg-m3-surface p-4 rounded-[20px] shadow-level1">
              <div className="flex items-center gap-2 text-[10px] font-semibold text-m3-on-surface-variant uppercase tracking-wider mb-2">
                <Icon size={12} /> {m.label}
              </div>
              <div className={`font-black text-base font-mono truncate ${m.color || "text-m3-on-surface"}`}>{m.value}</div>
            </motion.div>
          );
        })}
      </div>

      <div className="bg-m3-surface p-4 sm:p-5 rounded-[24px] shadow-level1">
        <div className="flex items-center gap-2 text-xs font-semibold text-m3-on-surface-variant uppercase tracking-wider mb-4">
          <BarChart3 size={14} /> Equity Curve
        </div>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--md-outline-variant)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--md-on-surface-variant)" fontSize={11} tickMargin={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--md-on-surface-variant)" fontSize={11} domain={["dataMin - 1000", "dataMax + 1000"]} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--m3-surface)", border: "1px solid var(--md-outline-variant)", borderRadius: "12px", fontSize: "12px" }} itemStyle={{ fontWeight: 600 }} labelStyle={{ opacity: 0.7 }} />
              <ReferenceLine y={chartData[0]?.dailyLimit} stroke="#f43f5e" strokeDasharray="4 4" label={{ position: "insideTopLeft", value: "DAILY", fill: "#f43f5e", fontSize: 10, fontWeight: 600 }} />
              <ReferenceLine y={chartData[0]?.overallLimit} stroke="#f43f5e" strokeDasharray="4 4" label={{ position: "insideBottomLeft", value: "MAX", fill: "#f43f5e", fontSize: 10, fontWeight: 600 }} />
              <Line type="monotone" dataKey="balance" stroke="var(--md-outline)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="equity" stroke="var(--md-primary)" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {trades.length > 0 && (
        <div className="bg-m3-surface p-4 sm:p-5 rounded-[24px] shadow-level1">
          <div className="flex items-center gap-2 text-xs font-semibold text-m3-on-surface-variant uppercase tracking-wider mb-4">
            <TrendingUp size={14} /> Lịch sử giao dịch ({trades.length})
          </div>
          <div className="space-y-2">
            {trades.map((trade) => {
              const isWin = trade.pnl > 0;
              return (
                <div key={trade.tradeId} className="flex items-center gap-3 p-3 hover:bg-m3-surface-container-low rounded-[16px] transition-colors">
                  <div className={`p-2 rounded-xl flex-shrink-0 ${trade.direction === "buy" ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"}`}>
                    {trade.direction === "buy" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-m3-on-surface">{trade.instrument}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-m3-surface-container text-m3-on-surface-variant font-semibold">• {trade.direction === "buy" ? "Mua" : "Bán"}</span>
                    </div>
                    <div className="text-xs text-m3-on-surface-variant mt-0.5">
                      {new Date(trade.openTime).toLocaleDateString("vi-VN")} {new Date(trade.openTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} • {trade.duration}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`font-black font-mono text-sm ${isWin ? "text-emerald-500" : "text-rose-500"}`}>
                      {isWin ? "+" : ""}{formatCurrency(trade.pnl)}
                    </div>
                    <div className="text-[10px] text-m3-on-surface-variant mt-0.5">{trade.openPrice} → {trade.closePrice}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!detail && (
        <div className="flex flex-col items-center py-12 gap-3">
          <div className="w-6 h-6 border-2 border-m3-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-m3-on-surface-variant">Đang tải dữ liệu...</span>
        </div>
      )}
    </div>
  );
}
