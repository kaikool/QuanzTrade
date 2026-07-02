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
  accountId?: string;
  notes: string;
  timeframe: string; // e.g., M5, M15, H1, H4, D1
  rating: number; // 1 to 5 stars
  stop_loss?: number;
  take_profit?: number;
  tag?: string; // e.g., News-Trade, Trend-Follow, Breakout
  tv_snapshot_url?: string | null;
  tv_snapshot_url_close?: string | null;
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
  translationProvider?: string;
}

export interface NewsDebugInfo {
  source?: string;
  hasDeepLKey?: boolean;
  translationProvider?: string;
  translationAttempted?: boolean;
  translationError?: string;
  translationResult?: string;
  translationTargetCount?: number;
  translationBatchLimit?: number;
  translatedCount?: number;
  untranslatedCount?: number;
  dbFreshHit?: boolean;
  dbReadCount?: number;
  dbWriteAttempted?: boolean;
  dbWriteError?: string;
  failedSources?: string[];
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  connected: boolean;
}

// ─── The5ers Types ──────────────────────────────────────────────────────────

export interface T5AccountOverview {
  accountId: string;
  name: string;
  type: string;
  status: string;
  balance: number;
  equity: number;
  pnl: number;
  pnlPercent?: number;
    maxLoss?: number;
    dailyLoss?: number;
    dailyLossLimit?: number;
    baseBalance?: number;
  currency?: string;
  _rawStats?: any;
  state?: any;
  createdAt?: string;
}

export interface T5Purchase {
  id: string;
  productName: string;
  buyingPower: number;
  price: number;
  currency: string;
  status: string;
  createdAt: string;
}

export interface T5Profile {
  userName: string;
  email?: string;
  scrapedAt: string;
  accounts: T5AccountOverview[];
  purchases?: T5Purchase[];
}

export interface T5ChallengeInfo {
  phase: string;
  profitTarget: number;
  profitTargetProgress: number;
  minTradingDays: number;
  daysTraded: number;
  daysRemaining: number;
  lossLimit: number;
  breaches: number;
}

export interface T5TradingRule {
  ruleName: string;
  status: 'ok' | 'warning' | 'breached' | 'na';
  currentValue: number;
  limit: number;
  description: string;
}

export interface T5AccountDetail {
  accountId: string;
  name: string;
  type: string;
  status: string;
  currency: string;
  scrapedAt: string;
  balance: number;
  equity: number;
  pnl: number;
  pnlPercent: number;
  floatingPnl: number;
  dailyDrawdown: number;
  dailyDrawdownLimit: number;
  maxDrawdown: number;
  maxDrawdownLimit: number;
  maxDrawdownPeriod: string;
  challenge?: T5ChallengeInfo;
  rules: T5TradingRule[];
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  totalDaysTraded: number;
  consistencyTarget?: number;
  createdAt: string;
  expiresAt?: string;
  lastActivityAt?: string;
  trades?: T5Trade[];
  stats?: any;
}

export interface T5Trade {
  tradeId: string;
  accountId: string;
  status?: 'OPEN' | 'CLOSED';
  instrument: string;
  direction: 'buy' | 'sell';
  volume: number;
  openTime: string;
  closeTime: string | null;
  openPrice: number;
  closePrice: number | null;
  pnl: number;
  pnlPoints: number;
  fees: number;
  duration: string;
  strategy?: string;
}

export interface T5RiskMetrics {
  dailyBuffer: number;
  overallBuffer: number;
  dailyStatus: 'safe' | 'warning' | 'danger';
  overallStatus: 'safe' | 'warning' | 'danger';
  targetRemaining: number;
}
