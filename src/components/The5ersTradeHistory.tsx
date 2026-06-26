import { useMemo } from "react";
import { TrendingUp, TrendingDown, Search } from "lucide-react";
import type { T5Trade, T5AccountOverview } from "../types";

interface Props {
  trades: T5Trade[];
  accounts: T5AccountOverview[];
  selectedAccountId: string | null;
  onAccountFilterChange: (accountId: string | null) => void;
  formatCurrency: (value: number) => string;
}

export default function The5ersTradeHistory({
  trades,
  accounts,
  selectedAccountId,
  onAccountFilterChange,
  formatCurrency,
}: Props) {
  const filteredTrades = useMemo(() => {
    let list = trades;
    const accountsMap = new Map(accounts.map((a) => [a.accountId, a]));
    if (selectedAccountId) {
      list = list.filter((t) => t.accountId === selectedAccountId);
    }
    return { list, accountsMap };
  }, [trades, selectedAccountId, accounts]);

  return (
    <div className="space-y-4">
      {filteredTrades.list.length === 0 ? (
        <div className="text-center py-16 text-m3-on-surface-variant">
          <Search size={32} className="mx-auto text-m3-outline-variant mb-3" />
          <p className="text-sm font-semibold">Không có giao dịch</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTrades.list.map((trade) => {
            const isWin = trade.pnl > 0;
            const DirIcon = trade.direction === "buy" ? TrendingUp : TrendingDown;
            return (
              <div
                key={trade.tradeId}
                className="flex items-center gap-3 p-3 bg-m3-surface rounded-[16px]"
              >
                <div
                  className={`p-2 rounded-xl flex-shrink-0 ${
                    trade.direction === "buy"
                      ? "bg-emerald-500/10 text-emerald-500"
                      : "bg-rose-500/10 text-rose-500"
                  }`}
                >
                  <DirIcon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-sm text-m3-on-surface">
                    {trade.instrument}
                  </span>
                  <div className="text-xs text-m3-on-surface-variant mt-0.5">
                    {trade.duration}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className={`font-black font-mono text-sm ${isWin ? "text-emerald-500" : "text-rose-500"}`}>
                    {isWin ? "+" : ""}{formatCurrency(trade.pnl)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
