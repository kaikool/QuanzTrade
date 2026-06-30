import { ChevronLeft, ChevronRight, ExternalLink, RefreshCw, Layers } from "lucide-react";
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
  Forex: "bg-[var(--sys-success-soft)] text-[var(--ios-green)]",
  Macro: "bg-[var(--sys-tint-soft)] text-[var(--ios-blue)]",
  "Central Bank": "bg-indigo-500/10 text-indigo-500",
  Energy: "bg-amber-500/10 text-amber-600",
};

const impactColors: Record<string, string> = {
  High: "bg-[var(--sys-red)] text-white shadow-sm",
  Medium: "bg-amber-500 text-white shadow-sm",
  Low: "bg-yellow-400 text-yellow-900 shadow-sm",
};

const effectColors: Record<string, string> = {
  Tốt: "text-[var(--ios-green)] font-bold",
  Xấu: "text-[var(--ios-red)] font-bold",
  "Trung lập": "text-[var(--ios-secondary-label)] font-medium",
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
  lastUpdatedAt,
}: NewsPanelProps) {
  const pageLabel = `Trang ${page + 1}`;
  const canGoPrevious = page > 0 && !loadingOlder;
  const canGoNext = hasMore && !loadingOlder;

  return (
    <div className="space-y-4 sm:space-y-5" id="news-panel">
      {/* Header bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold tracking-widest uppercase text-[var(--ios-secondary-label)]">{pageLabel}</span>
          {lastUpdatedAt && (
            <span className="text-[12px] text-[var(--ios-tertiary-label)] font-mono">
              Cập nhật lúc {new Date(lastUpdatedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[var(--ios-surface-2)] border border-[var(--ios-separator)] rounded-[12px] p-1">
            <button type="button" onClick={() => onPageChange(page - 1)} disabled={!canGoPrevious}
              className="w-8 h-8 rounded-[8px] text-[var(--ios-blue)] flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-[var(--ios-surface)]">
              <ChevronLeft size={18} />
            </button>
            <span className="min-w-[50px] text-center text-[12px] font-bold text-[var(--ios-label)]">{pageLabel}</span>
            <button type="button" onClick={() => onPageChange(page + 1)} disabled={!canGoNext}
              className="w-8 h-8 rounded-[8px] text-[var(--ios-blue)] flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-[var(--ios-surface)]">
              <ChevronRight size={18} />
            </button>
          </div>
          <button onClick={onRefresh} type="button" className="w-10 h-10 bg-[var(--ios-blue)] text-white rounded-[12px] flex items-center justify-center active:scale-90 transition-transform cursor-pointer shadow-ios-sm">
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* News cards */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 rounded-[30px] bg-[var(--ios-surface-2)] animate-pulse border border-[var(--ios-separator)]/40" />
          ))}
        </div>
      ) : newsItems.length === 0 ? (
        <div className="py-20 text-center text-[var(--ios-secondary-label)] ios-glass ios26-card bg-[var(--ios-surface)]">
          <Layers size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-[17px] text-[var(--ios-label)]">Chưa có tin tức</p>
          <p className="text-[15px] mt-1">Bấm làm mới hoặc quay lại trang trước.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {newsItems.map((item) => {
            const effect = deriveEffectLabel(item.sentiment);
            return (
              <article key={item.id} className="ios-glass ios26-card bg-[var(--ios-surface)] p-5 transition-colors hover:border-[var(--ios-blue)]/30 group">
                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${impactColors[item.impact]}`}>{item.impact}</span>
                  <span className={`text-[13px] tracking-tight ${effectColors[effect]}`}>{effect}</span>
                  <div className="w-1 h-1 rounded-full bg-[var(--ios-separator)]"></div>
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${categoryColors[item.category] || "bg-[var(--ios-surface-2)] text-[var(--ios-secondary-label)]"}`}>{item.category}</span>
                  <div className="w-1 h-1 rounded-full bg-[var(--ios-separator)]"></div>
                  <span className="text-[12px] font-medium text-[var(--ios-secondary-label)]">{item.source} · {formatRelativeTime(item.publishedAt)}</span>
                </div>
                
                {/* Title */}
                <div className="flex items-start justify-between gap-4 mb-2">
                  <h4 className="text-[18px] sm:text-[20px] font-bold text-[var(--ios-label)] leading-tight flex-1">{item.titleVi || item.title}</h4>
                  <a href={item.link} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-full bg-[var(--ios-surface-2)] border border-[var(--ios-separator)] text-[var(--ios-blue)] flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform hover:bg-[var(--sys-tint-soft)] opacity-80 group-hover:opacity-100" title="Đọc chi tiết gốc">
                    <ExternalLink size={16} />
                  </a>
                </div>
                
                {/* Summary */}
                <p className="text-[15px] text-[var(--ios-label)] leading-relaxed line-clamp-3 mb-3">{compactSummary(item)}</p>
                
                {/* Assets & Tags */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[var(--ios-separator)]/40">
                  {item.affectedAssets.map((asset) => (
                    <span key={asset} className="px-2 py-1 rounded-md bg-[var(--sys-tint-soft)] text-[var(--ios-blue)] text-[12px] font-mono font-bold tracking-widest uppercase">{asset}</span>
                  ))}
                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 ml-2">
                      {item.tags.map((tag) => (
                        <span key={tag} className="text-[12px] text-[var(--ios-tertiary-label)] font-mono">#{tag.toLowerCase()}</span>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
