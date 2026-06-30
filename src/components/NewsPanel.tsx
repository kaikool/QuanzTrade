import { ChevronLeft, ChevronRight, ExternalLink, RefreshCw } from "lucide-react";
import { NewsDebugInfo, NewsItem } from "../types";

interface NewsPanelProps {
  newsItems: NewsItem[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  loadingOlder: boolean;
  hasMore: boolean;
  darkMode: boolean;
  lastUpdatedAt: string | null;
  debug: NewsDebugInfo | null;
}

const categoryColors: Record<string, string> = {
  Forex: "bg-[var(--ios-green)]/10 text-[var(--ios-green)]",
  Macro: "bg-[var(--ios-blue)]/10 text-[var(--ios-blue)]",
  "Central Bank": "bg-[var(--ios-blue)]/10 text-[var(--ios-indigo)]",
  Energy: "bg-amber-500/10 text-amber-600",
};

const impactColors: Record<string, string> = {
  High: "bg-[var(--ios-red)] text-white",
  Medium: "bg-orange-500 text-white",
  Low: "bg-yellow-400 text-yellow-900",
};

const effectColors: Record<string, string> = {
  Tốt: "bg-[var(--ios-green)]/10 text-[var(--ios-green)]",
  Xấu: "bg-[var(--ios-red)]/10 text-[var(--ios-red)]",
  "Trung lập": "bg-[var(--ios-surface-2)] text-[var(--ios-secondary-label)]",
};

function deriveEffectLabel(sentiment: NewsItem["sentiment"]) {
  if (sentiment === "Bullish") return "Tốt";
  if (sentiment === "Bearish") return "Xấu";
  return "Trung lập";
}

function formatRelativeTime(value: string) {
  const published = new Date(value).getTime();
  if (!Number.isFinite(published)) return "";
  const diffMinutes = Math.max(0, Math.round((Date.now() - published) / (1000 * 60)));
  if (diffMinutes < 1) return "Vừa xong";
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  return new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function compactSummary(item: NewsItem) {
  const source = item.summaryVi || item.summary || item.titleVi || item.title;
  const normalized = source.replace(/\s+/g, " ").trim();
  if (normalized.length <= 260) return normalized;
  return `${normalized.slice(0, 257).trim()}...`;
}

export function NewsPanel({
  newsItems, loading, refreshing, onRefresh,
  page, pageSize, onPageChange, loadingOlder, hasMore,
  darkMode, lastUpdatedAt,
}: NewsPanelProps) {
  const pageLabel = `Trang ${page + 1}`;
  const pageStart = page * pageSize + 1;
  const pageEnd = page * pageSize + newsItems.length;
  const canGoPrevious = page > 0 && !loadingOlder;
  const canGoNext = hasMore && !loadingOlder;

  return (
    <div className="space-y-4" id="news-panel">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--ios-secondary-label)]">{pageLabel}</span>
          {lastUpdatedAt && (
            <span className="text-[11px] text-[var(--ios-secondary-label)] font-mono">
              {new Date(lastUpdatedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[var(--ios-surface-2)] rounded-[10px] p-0.5">
            <button type="button" onClick={() => onPageChange(page - 1)} disabled={!canGoPrevious}
              className="w-8 h-8 rounded-[8px] text-[var(--ios-blue)] flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
              <ChevronLeft size={16} />
            </button>
            <span className="min-w-[60px] text-center text-[11px] font-medium text-[var(--ios-label)]">{pageLabel}</span>
            <button type="button" onClick={() => onPageChange(page + 1)} disabled={!canGoNext}
              className="w-8 h-8 rounded-[8px] text-[var(--ios-blue)] flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
              <ChevronRight size={16} />
            </button>
          </div>
          <button onClick={onRefresh} type="button" className="w-8 h-8 bg-[var(--ios-blue)] text-white rounded-[8px] flex items-center justify-center active:scale-90 transition-transform cursor-pointer">
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* News cards */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-20 rounded-[14px] bg-[var(--ios-surface-2)] animate-pulse" />
          ))}
        </div>
      ) : newsItems.length === 0 ? (
        <div className="py-16 text-center text-[var(--ios-secondary-label)]">
          <p className="font-semibold text-sm">Chưa có tin trong trang này.</p>
          <p className="text-xs mt-1">Bấm làm mới hoặc quay lại trang trước.</p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--ios-separator)] ios-glass bg-[var(--ios-surface)] rounded-[14px] shadow-ios-sm overflow-hidden">
          {newsItems.map((item) => {
            const effect = deriveEffectLabel(item.sentiment);
            return (
              <article key={item.id} className="p-3 hover:bg-[var(--ios-surface-2)] transition-colors">
                {/* Impact badges row */}
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${impactColors[item.impact]}`}>{item.impact}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${effectColors[effect]}`}>{effect}</span>
                  {item.affectedAssets.map((asset) => (
                    <span key={asset} className="px-1.5 py-0.5 rounded bg-[var(--ios-surface-2)] text-[10px] text-[var(--ios-secondary-label)] font-mono">{asset}</span>
                  ))}
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${categoryColors[item.category] || "bg-[var(--ios-surface-2)] text-[var(--ios-secondary-label)]"}`}>{item.category}</span>
                  <span className="text-[10px] text-[var(--ios-secondary-label)]">{item.source} · {formatRelativeTime(item.publishedAt)}</span>
                </div>
                {/* Title */}
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-[15px] font-semibold text-[var(--ios-label)] leading-snug flex-1">{item.titleVi || item.title}</h4>
                  <a href={item.link} target="_blank" rel="noreferrer" className="w-7 h-7 rounded-full bg-[var(--ios-surface-2)] border border-[var(--ios-separator)] text-[var(--ios-blue)] flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform" title="Mở tin gốc">
                    <ExternalLink size={12} />
                  </a>
                </div>
                {/* Summary */}
                <p className="text-[12px] text-[var(--ios-secondary-label)] mt-1 line-clamp-2">{compactSummary(item)}</p>
                {/* Tags */}
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {item.tags.map((tag) => (
                      <span key={tag} className="px-1.5 py-0.5 rounded bg-[var(--ios-surface-2)] text-[9px] text-[var(--ios-secondary-label)] font-mono">{tag}</span>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Footer pagination */}
      {newsItems.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[var(--ios-secondary-label)]">Tin {pageStart}-{pageEnd}</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => onPageChange(page - 1)} disabled={!canGoPrevious}
              className="px-3 py-1.5 rounded-[8px] border border-[var(--ios-separator)] bg-[var(--ios-surface)] text-[var(--ios-blue)] text-xs font-medium flex items-center gap-1 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
              <ChevronLeft size={12} /> Mới hơn
            </button>
            <button type="button" onClick={() => onPageChange(page + 1)} disabled={!canGoNext}
              className="px-3 py-1.5 rounded-[8px] border border-[var(--ios-separator)] bg-[var(--ios-surface)] text-[var(--ios-blue)] text-xs font-medium flex items-center gap-1 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
              Cũ hơn <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
