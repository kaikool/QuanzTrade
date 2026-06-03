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

const categoryClasses: Record<NewsItem["category"], string> = {
  Forex:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  Macro:
    "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
  "Central Bank":
    "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
  Energy:
    "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
};

const impactClasses: Record<NewsItem["impact"], string> = {
  High: "bg-rose-500 text-white",
  Medium: "bg-orange-500 text-white",
  Low: "bg-yellow-400 text-yellow-950",
};

const effectClasses: Record<string, string> = {
  Tốt: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  Xấu: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  "Trung lập": "bg-m3-surface-container-high text-m3-on-surface-variant",
};

const defaultEffectClass =
  "bg-m3-surface-container-high text-m3-on-surface-variant";

function deriveEffectLabel(sentiment: NewsItem["sentiment"]) {
  if (sentiment === "Bullish") return "Tốt";
  if (sentiment === "Bearish") return "Xấu";
  return "Trung lập";
}

function formatRelativeTime(value: string) {
  const published = new Date(value).getTime();
  if (!Number.isFinite(published)) return "";

  const diffMinutes = Math.max(
    0,
    Math.round((Date.now() - published) / (1000 * 60)),
  );

  if (diffMinutes < 1) return "Vừa xong";
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;

  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function compactSummary(item: NewsItem) {
  const source = item.summaryVi || item.summary || item.titleVi || item.title;
  const normalized = source.replace(/\s+/g, " ").trim();
  if (normalized.length <= 260) return normalized;
  return `${normalized.slice(0, 257).trim()}...`;
}

export function NewsPanel({
  newsItems,
  loading,
  refreshing,
  onRefresh,
  page,
  pageSize,
  onPageChange,
  loadingOlder,
  hasMore,
  darkMode,
  lastUpdatedAt,
}: NewsPanelProps) {
  const pageLabel = `Trang ${page + 1}`;
  const pageStart = page * pageSize + 1;
  const pageEnd = page * pageSize + newsItems.length;
  const canGoPrevious = page > 0 && !loadingOlder;
  const canGoNext = hasMore && !loadingOlder;

  return (
    <div className="space-y-5" id="news-panel">
      <section
        className={`p-4 sm:p-6 rounded-[24px] shadow-level1 ${darkMode ? "bg-m3-surface" : "bg-m3-surface"}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-m3-outline-variant pb-4 mb-4">
          <div>
            <h3 className="m3-title-medium text-m3-on-surface font-display">
              Tin tức thị trường
            </h3>
            <p className="m3-body-small text-m3-on-surface-variant mt-1">
              Mới nhất lên trước, mỗi trang hiển thị {pageSize} tin.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {lastUpdatedAt && (
              <span className="m3-body-small text-m3-on-surface-variant font-mono">
                {new Date(lastUpdatedAt).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            )}
            <div className="flex items-center gap-1 rounded-full border border-m3-outline-variant bg-m3-surface-container-lowest p-1">
              <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={!canGoPrevious}
                className="h-9 w-9 rounded-full text-m3-primary grid place-items-center m3-state-layer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Trang mới hơn"
              >
                <ChevronLeft size={17} />
              </button>
              <span className="min-w-20 px-2 text-center m3-label-medium text-m3-on-surface">
                {pageLabel}
              </span>
              <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={!canGoNext}
                className="h-9 w-9 rounded-full text-m3-primary grid place-items-center m3-state-layer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Trang cũ hơn"
              >
                <ChevronRight size={17} />
              </button>
            </div>
            <button
              onClick={onRefresh}
              className="px-3 py-2 rounded-full bg-m3-primary text-m3-on-primary m3-label-medium flex items-center gap-1.5 m3-state-layer"
              type="button"
            >
              <RefreshCw
                size={14}
                className={refreshing ? "animate-spin" : ""}
              />
              Làm mới
            </button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="h-24 rounded-[16px] bg-m3-surface-container animate-pulse"
              />
            ))}
          </div>
        ) : newsItems.length === 0 ? (
          <div className="py-16 text-center text-m3-on-surface-variant">
            <p className="m3-body-medium font-semibold">
              Chưa có tin trong trang này.
            </p>
            <p className="m3-body-small mt-1">
              Bấm làm mới hoặc quay lại trang trước để đọc tin gần hơn.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {newsItems.map((item) => {
              const effect = deriveEffectLabel(item.sentiment);

              return (
                <article
                  key={item.id}
                  className="p-4 rounded-[16px] bg-m3-surface-container-lowest border border-m3-outline-variant hover:border-m3-primary/60 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-0.5 rounded-full m3-label-small font-black ${impactClasses[item.impact]}`}
                          title={`Điểm quan trọng: ${item.score}/100`}
                        >
                          {item.impact} {item.score}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full m3-label-small font-bold ${effectClasses[effect] || defaultEffectClass}`}
                          title={`Sentiment: ${item.sentiment} (${item.sentimentScore})`}
                        >
                          {effect}
                        </span>
                        {item.affectedAssets.map((asset) => (
                          <span
                            key={asset}
                            className="px-2 py-0.5 rounded-full bg-m3-surface-container m3-label-small text-m3-on-surface-variant font-mono"
                          >
                            {asset}
                          </span>
                        ))}
                        <span
                          className={`px-2 py-0.5 rounded-full border m3-label-small font-bold ${categoryClasses[item.category]}`}
                        >
                          {item.category}
                        </span>
                        <span className="m3-body-small text-m3-on-surface-variant font-mono">
                          {item.source}
                        </span>
                        <span className="m3-body-small text-m3-on-surface-variant">
                          {formatRelativeTime(item.publishedAt)}
                        </span>
                      </div>
                      <h4 className="m3-body-medium sm:m3-body-large font-extrabold text-m3-on-surface leading-snug">
                        {item.titleVi || item.title}
                      </h4>
                    </div>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-full bg-m3-surface-container-high text-m3-primary flex-shrink-0 m3-state-layer"
                      title="Mở tin gốc"
                    >
                      <ExternalLink size={15} />
                    </a>
                  </div>

                  <p className="m3-body-small text-m3-on-surface-variant mt-3 line-clamp-3">
                    {compactSummary(item)}
                  </p>

                  {item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-full bg-m3-surface-container m3-label-small text-m3-on-surface-variant font-mono"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {newsItems.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5">
            <span className="m3-body-small text-m3-on-surface-variant">
              Đang xem tin {pageStart}-{pageEnd}
            </span>
            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => onPageChange(page - 1)}
                disabled={!canGoPrevious}
                className="px-4 py-2.5 rounded-full border border-m3-outline-variant bg-m3-surface-container-lowest text-m3-primary m3-label-medium flex items-center justify-center gap-2 m3-state-layer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
                Mới hơn
              </button>
              <button
                type="button"
                onClick={() => onPageChange(page + 1)}
                disabled={!canGoNext}
                className="px-4 py-2.5 rounded-full border border-m3-outline-variant bg-m3-surface-container-lowest text-m3-primary m3-label-medium flex items-center justify-center gap-2 m3-state-layer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cũ hơn
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
