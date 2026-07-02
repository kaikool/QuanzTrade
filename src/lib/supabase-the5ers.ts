import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { T5AccountOverview, T5Trade, T5Purchase } from "../types";

function normalizeTradeStatus(rawStatus: any, closeDate: any): 'OPEN' | 'CLOSED' {
  const value = String(rawStatus ?? '').trim().toLowerCase();
  if (value) {
    if (['open', 'opened', 'active', 'running', 'live'].some(token => value.includes(token))) return 'OPEN';
    if (['closed', 'close', 'history', 'completed', 'done'].some(token => value.includes(token))) return 'CLOSED';
  }
  return closeDate ? 'CLOSED' : 'OPEN';
}

function getSupabase(): SupabaseClient | null {
  const metaEnv = (import.meta as any).env || {};
  const url = (window as any).ENV?.SUPABASE_URL || metaEnv.VITE_SUPABASE_URL || "";
  const anonKey = (window as any).ENV?.SUPABASE_ANON_KEY || metaEnv.VITE_SUPABASE_ANON_KEY || "";
  if (url && anonKey && url.includes("supabase.co")) {
    return createClient(url, anonKey);
  }
  return null;
}

// ─── Accounts ───────────────────────────────────────────────────────────────

export async function fetchT5Accounts(): Promise<T5AccountOverview[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("t5_accounts")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[T5] Lỗi tải accounts:", error.message);
    return [];
  }

  const mapped: T5AccountOverview[] = (data || []).map((acc: any) => ({
    accountId: String(acc.account_id),
    name: acc.name,
    type: acc.type,
    status: acc.status,
    balance: acc.balance ?? 0,
    equity: acc.equity ?? 0,
    pnl: acc.pnl ?? 0,
    dailyLoss: acc.stats?.balanceDetails?.dailyProfitAndLoss ?? 0,
    dailyLossLimit: acc.stats?.balanceDetails?.allowedDailyLosses ?? 0,
    maxLoss: acc.stats?.balanceDetails?.maxLoss ?? 0,
    baseBalance: acc.stats?.balanceDetails?.baseBalance ?? 0,
    _rawStats: acc.stats,
  }));

  mapped.sort((a, b) => Number(b.accountId) - Number(a.accountId));
  return mapped;
}

export async function fetchT5AccountDetail(accountId: string): Promise<{
  rawStats: any;
  trades: T5Trade[];
}> {
  const supabase = getSupabase();
  let rawStats: any = null;
  let trades: T5Trade[] = [];

  if (!supabase) return { rawStats, trades };

  // Get stats from accounts table
  const { data: accData } = await supabase
    .from("t5_accounts")
    .select("stats")
    .eq("account_id", accountId)
    .single();

  if (accData) rawStats = accData.stats;

  // Get trades
  const { data: tradeData, error: tradeError } = await supabase
    .from("t5_trades")
    .select("*")
    .eq("account_id", accountId)
    .order("open_date", { ascending: false });

  if (tradeError) {
    console.error("[T5] Lỗi tải trades:", tradeError.message);
  } else if (tradeData) {
    trades = tradeData.map((t: any) => ({
      tradeId: t.trade_id,
      accountId: String(t.account_id),
      status: normalizeTradeStatus(t.status, t.close_date),
      instrument: t.symbol || "Unknown",
      direction:
        String(t.side).toLowerCase() === "0" ||
        String(t.side).toLowerCase() === "buy"
          ? "buy"
          : "sell",
      volume: parseFloat(t.quantity) || 0,
      openPrice: parseFloat(t.entry_price) || 0,
      closePrice: t.exit_price ? parseFloat(t.exit_price) : null,
      pnl: parseFloat(t.profit) || 0,
      pnlPoints: parseFloat(t.pips) || 0,
      fees: 0,
      openTime: t.open_date || new Date().toISOString(),
      closeTime: t.close_date || null,
      duration: getDuration(t.open_date, t.close_date),
    }));
  }

  return { rawStats, trades };
}

// ─── Purchases ───────────────────────────────────────────────────────────────

export async function fetchT5Purchases(): Promise<T5Purchase[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("t5_purchases")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[T5] Lỗi tải purchases:", error.message);
    return [];
  }

  return (data || []).map((p: any) => ({
    id: p.purchase_id,
    productName: p.product_name,
    buyingPower: p.buying_power,
    price: p.price,
    currency: p.currency,
    status: p.status,
    createdAt: p.created_at,
  }));
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDuration(open: string | null, close: string | null): string {
  if (!open || !close) return "N/A";
  const diffMs = new Date(close).getTime() - new Date(open).getTime();
  if (diffMs < 0 || isNaN(diffMs)) return "N/A";
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h`;
  if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m`;
  if (diffMins > 0) return `${diffMins}m`;
  return "< 1m";
}
