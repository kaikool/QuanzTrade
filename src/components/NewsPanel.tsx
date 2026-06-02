import { Check, ExternalLink, Filter, RefreshCw, X } from "lucide-react";
import { useMemo, useState } from "react";
import { NewsDebugInfo, NewsItem } from "../types";

interface NewsPanelProps {
  newsItems: NewsItem[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
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
  "Tốt": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  "Tá»‘t": "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  "Xấu": "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  "Xáº¥u": "bg-rose-500/10 text-rose-700 dark:text-rose-300",
  "Trung lập": "bg-m3-surface-container-high text-m3-on-surface-variant",
  "Trung láº­p": "bg-m3-surface-container-high text-m3-on-surface-variant",
};

const defaultEffectClass =
  "bg-m3-surface-container-high text-m3-on-surface-variant";

const NEWS_ASSET_FILTER_KEY = "trade_app_news_asset_filters";

const assetFilterOptions = [
  "USD",
  "DXY",
  "EUR",
  "GBP",
  "JPY",
  "AUD",
  "NZD",
  "CAD",
  "CHF",
  "XAU",
  "XAG",
  "OIL",
  "BTC",
  "ETH",
  "US500",
  "NAS100",
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "AUDUSD",
  "USDCAD",
];

function readSavedAssetFilters() {
  if (typeof window === "undefined") return [];
  try {
    const saved = window.localStorage.getItem(NEWS_ASSET_FILTER_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed)
      ? parsed
          .map((asset) => String(asset).toUpperCase().replace(/[^A-Z0-9]/g, ""))
          .filter((asset) => assetFilterOptions.includes(asset))
      : [];
  } catch {
    return [];
  }
}

function saveAssetFilters(assets: string[]) {
  window.localStorage.setItem(NEWS_ASSET_FILTER_KEY, JSON.stringify(assets));
}

function normalizeSearchText(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function newsMatchesAssetFilter(item: NewsItem, selectedAssets: string[]) {
  if (selectedAssets.length === 0) return true;

  const affectedAssets = item.affectedAssets.map(normalizeSearchText);
  const searchableText = normalizeSearchText(
    [
      item.title,
      item.titleVi,
      item.summary,
      item.summaryVi,
      item.category,
      item.source,
      ...item.tags,
      ...item.affectedAssets,
    ].join(" "),
  );

  return selectedAssets.some((selectedAsset) => {
    if (affectedAssets.includes(selectedAsset)) return true;
    if (searchableText.includes(selectedAsset)) return true;

    if (selectedAsset === "XAU") return searchableText.includes("GOLD");
    if (selectedAsset === "XAG") return searchableText.includes("SILVER");
    if (selectedAsset === "OIL") {
      return (
        searchableText.includes("WTI") ||
        searchableText.includes("BRENT") ||
        searchableText.includes("CRUDE")
      );
    }

    if (selectedAsset.length === 3) {
      return affectedAssets.some((asset) => asset.includes(selectedAsset));
    }

    return false;
  });
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
  darkMode,
  lastUpdatedAt,
}: NewsPanelProps) {
  const [selectedAssets, setSelectedAssets] = useState<string[]>(
    readSavedAssetFilters,
  );
  const [draftAssets, setDraftAssets] = useState<string[]>(selectedAssets);
  const [assetFilterOpen, setAssetFilterOpen] = useState(false);

  const filteredNewsItems = useMemo(
    () => newsItems.filter((item) => newsMatchesAssetFilter(item, selectedAssets)),
    [newsItems, selectedAssets],
  );

  const toggleDraftAsset = (asset: string) => {
    setDraftAssets((current) =>
      current.includes(asset)
        ? current.filter((item) => item !== asset)
        : [...current, asset],
    );
  };

  const openAssetFilter = () => {
    setDraftAssets(selectedAssets);
    setAssetFilterOpen(true);
  };

  const applyAssetFilter = () => {
    const normalized = assetFilterOptions.filter((asset) =>
      draftAssets.includes(asset),
    );
    setSelectedAssets(normalized);
    saveAssetFilters(normalized);
    setAssetFilterOpen(false);
  };

  const clearAssetFilter = () => {
    setDraftAssets([]);
    setSelectedAssets([]);
    saveAssetFilters([]);
    setAssetFilterOpen(false);
  };

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
              Tổng hợp tin mới từ các nguồn thị trường.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {lastUpdatedAt && (
              <span className="m3-body-small text-m3-on-surface-variant font-mono">
                {new Date(lastUpdatedAt).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            )}
            <div className="relative">
              <button
                onClick={openAssetFilter}
                className={`px-3 py-2 rounded-full border m3-label-medium flex items-center gap-1.5 m3-state-layer ${
                  selectedAssets.length > 0
                    ? "bg-m3-primary-container text-m3-on-primary-container border-m3-primary"
                    : "bg-m3-surface-container-lowest text-m3-primary border-m3-outline-variant"
                }`}
                type="button"
                title="Lọc tin theo tài sản"
              >
                <Filter size={14} />
                Tài sản
                {selectedAssets.length > 0 && (
                  <span className="font-mono">({selectedAssets.length})</span>
                )}
              </button>

              {assetFilterOpen && (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-[min(22rem,calc(100vw-2rem))] rounded-[20px] bg-m3-surface border border-m3-outline-variant shadow-level4 p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="m3-label-large font-bold text-m3-on-surface">
                      Lọc theo tài sản
                    </p>
                    <button
                      type="button"
                      onClick={() => setAssetFilterOpen(false)}
                      className="p-1.5 rounded-full bg-m3-surface-container-high text-m3-on-surface-variant m3-state-layer"
                      title="Đóng"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
                    {assetFilterOptions.map((asset) => {
                      const checked = draftAssets.includes(asset);

                      return (
                        <button
                          key={asset}
                          type="button"
                          onClick={() => toggleDraftAsset(asset)}
                          className={`h-9 px-2 rounded-[12px] border m3-label-medium font-mono flex items-center justify-center gap-1.5 m3-state-layer ${
                            checked
                              ? "bg-m3-primary text-m3-on-primary border-m3-primary"
                              : "bg-m3-surface-container-lowest text-m3-on-surface-variant border-m3-outline-variant"
                          }`}
                        >
                          {checked && <Check size={13} />}
                          {asset}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-m3-outline-variant">
                    <button
                      type="button"
                      onClick={clearAssetFilter}
                      className="px-3 py-2 rounded-full text-m3-primary border border-m3-outline-variant m3-label-medium m3-state-layer"
                    >
                      Hiện tất cả
                    </button>
                    <button
                      type="button"
                      onClick={applyAssetFilter}
                      className="px-4 py-2 rounded-full bg-m3-primary text-m3-on-primary m3-label-medium m3-state-layer"
                    >
                      Lưu filter
                    </button>
                  </div>
                </div>
              )}
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
              Chưa có tin mới từ các nguồn tin.
            </p>
            <p className="m3-body-small mt-1">
              Bấm làm mới hoặc kiểm tra lại kết nối mạng.
            </p>
          </div>
        ) : filteredNewsItems.length === 0 ? (
          <div className="py-16 text-center text-m3-on-surface-variant">
            <p className="m3-body-medium font-semibold">
              Không có tin khớp filter tài sản đã lưu.
            </p>
            <p className="m3-body-small mt-1">
              Bấm Tài sản và chọn Hiện tất cả để bỏ lọc.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filteredNewsItems.map((item) => (
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
                        className={`px-2 py-0.5 rounded-full m3-label-small font-bold ${effectClasses[item.effect] || defaultEffectClass}`}
                        title={`Sentiment: ${item.sentiment} (${item.sentimentScore})`}
                      >
                        {item.effect}
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
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
