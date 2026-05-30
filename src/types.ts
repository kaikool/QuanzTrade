export interface Trade {
  id: string;
  pair: string;
  type: "BUY" | "SELL";
  entry_price: number;
  exit_price: number | null;
  size: number; // lots
  pnl: number; // Profit/Loss in USD
  status: "OPEN" | "CLOSED";
  entry_date: string; // ISO string
  exit_date: string | null; // ISO string
  notes: string;
  timeframe: string; // e.g., M5, M15, H1, H4, D1
  rating: number; // 1 to 5 stars
  stop_loss?: number;
  take_profit?: number;
  tag?: string; // e.g., News-Trade, Trend-Follow, Breakout
}

export interface CalendarEvent {
  title: string;
  country: string;
  date: string; // ISO String
  impact: "High" | "Medium" | "Low";
  forecast: string;
  previous: string;
  actual: string;
}

export interface NewsItem {
  id: string;
  title: string;
  titleVi: string;
  source: string;
  category: "Forex" | "Macro" | "Central Bank" | "Energy";
  link: string;
  summary: string;
  summaryVi: string;
  publishedAt: string;
  impact: "High" | "Medium" | "Low";
  sentiment: "Bullish" | "Bearish" | "Neutral";
  effect: "Tốt" | "Xấu" | "Trung lập";
  affectedAssets: string[];
  sentimentScore: number;
  relevanceScore: number;
  score: number;
  tags: string[];
  scoredBy: "Marketaux" | "Local";
  translatedAt?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  connected: boolean;
}
