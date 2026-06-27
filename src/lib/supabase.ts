import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Trade } from "../types";

// Key for storage
const SUPABASE_URL_KEY = "trade_app_supabase_url";
const SUPABASE_ANON_KEY = "trade_app_supabase_anon";
const LOCAL_TRADES_KEY = "trade_app_local_trades";

// Default empty trades for a clean production setup
const DEFAULT_TRADES: Trade[] = [];

export function getSavedSupabaseKeys() {
  const metaEnv = (import.meta as any).env || {};
  const url = metaEnv.VITE_SUPABASE_URL || localStorage.getItem(SUPABASE_URL_KEY) || "";
  const anonKey = metaEnv.VITE_SUPABASE_ANON_KEY || localStorage.getItem(SUPABASE_ANON_KEY) || "";
  return { url, anonKey };
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getSavedSupabaseKeys();
  if (url && anonKey) {
    try {
      return createClient(url, anonKey);
    } catch (e) {
      console.error("Invalid Supabase keys", e);
      return null;
    }
  }
  return null;
}

// Low level CRUD wrappers
export async function fetchTradesFromDB(): Promise<Trade[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .order("entry_date", { ascending: false });
      
      if (error) throw error;
      if (data) return data as Trade[];
    } catch (err: any) {
      console.warn("Supabase fetch failed, falling back to local storage:", err.message);
    }
  }

  // Fallback to local storage
  const local = localStorage.getItem(LOCAL_TRADES_KEY);
  if (!local) {
    localStorage.setItem(LOCAL_TRADES_KEY, JSON.stringify(DEFAULT_TRADES));
    return DEFAULT_TRADES;
  }
  try {
    return JSON.parse(local) as Trade[];
  } catch (e) {
    return DEFAULT_TRADES;
  }
}

export async function saveTradeToDB(trade: Trade): Promise<Trade> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      // Upsert to database
      const { data, error } = await supabase
        .from("trades")
        .upsert({
          id: trade.id,
          pair: trade.pair,
          type: trade.type,
          entry_price: trade.entry_price,
          exit_price: trade.exit_price,
          size: trade.size,
          pnl: trade.pnl,
          status: trade.status,
          entry_date: trade.entry_date,
          exit_date: trade.exit_date,
          notes: trade.notes,
          timeframe: trade.timeframe,
          rating: trade.rating,
          stop_loss: trade.stop_loss,
          take_profit: trade.take_profit,
          tag: trade.tag,
          tv_snapshot_url: trade.tv_snapshot_url
        })
        .select()
        .single();

      if (error) throw error;
      if (data) return data as Trade;
    } catch (err: any) {
      console.warn("Supabase write failed, falling back to local storage:", err.message);
    }
  }

  // Write to local storage
  const current = await fetchTradesFromDB();
  const index = current.findIndex(t => t.id === trade.id);
  const updated = [...current];
  if (index >= 0) {
    updated[index] = trade;
  } else {
    updated.unshift(trade);
  }
  localStorage.setItem(LOCAL_TRADES_KEY, JSON.stringify(updated));
  return trade;
}

export async function deleteTradeFromDB(tradeId: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { error } = await supabase
        .from("trades")
        .delete()
        .eq("id", tradeId);
      
      if (error) throw error;
      return true;
    } catch (err: any) {
      console.warn("Supabase delete failed, falling back to local storage:", err.message);
    }
  }

  // Local storage delete
  const current = await fetchTradesFromDB();
  const updated = current.filter(t => t.id !== tradeId);
  localStorage.setItem(LOCAL_TRADES_KEY, JSON.stringify(updated));
  return true;
}

