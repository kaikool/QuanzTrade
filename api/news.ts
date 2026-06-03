import { createClient } from "@supabase/supabase-js";

const NEWS_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
const MARKETAUX_CACHE_TTL_MS = 10 * 60 * 1000; // protect free API quota
const TRADINGVIEW_CACHE_TTL_MS = 60 * 1000;
const DEEPL_TRANSLATION_BATCH_LIMIT = Number(
  process.env.DEEPL_TRANSLATION_BATCH_LIMIT || 30,
);
const NEWS_TABLE = "news_items";
const DEFAULT_NEWS_LIMIT = 60;
const MAX_HISTORY_LIMIT = 100;
const MIN_VISIBLE_NEWS_ITEMS = 5;

const newsFeeds = [
  {
    source: "FXStreet VN",
    category: "Forex",
    url: "https://www.fxstreet-vn.com/rss/news",
  },
  {
    source: "Investing Forex",
    category: "Forex",
    url: "https://www.investing.com/rss/news_1.rss",
  },
  {
    source: "Investing Economy",
    category: "Macro",
    url: "https://www.investing.com/rss/news_14.rss",
  },
  {
    source: "Investing Indicators",
    category: "Macro",
    url: "https://www.investing.com/rss/news_95.rss",
  },
  {
    source: "Investing Central Banks",
    category: "Central Bank",
    url: "https://www.investing.com/rss/central_banks.rss",
  },
  {
    source: "Federal Reserve",
    category: "Central Bank",
    url: "https://www.federalreserve.gov/feeds/press_monetary.xml",
  },
  {
    source: "Fed Speeches",
    category: "Central Bank",
    url: "https://www.federalreserve.gov/feeds/speeches.xml",
  },
  {
    source: "EIA Energy",
    category: "Energy",
    url: "https://www.eia.gov/rss/todayinenergy.xml",
  },
];

let newsCache: { data: any[]; timestamp: number } | null = null;
let marketauxCache: { data: any[]; timestamp: number } | null = null;
let tradingViewCache: { data: any[]; timestamp: number } | null = null;
let lastNewsDebug: any = {};

function getServerSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  return createClient(url, key, {
    auth: {
      persistSession: false,
    },
  });
}

async function readFreshNewsFromDb(now: number) {
  const supabase = getServerSupabaseClient();
  if (!supabase) return null;

  try {
    const minFetchedAt = new Date(now - NEWS_CACHE_TTL_MS).toISOString();
    const { data, error } = await supabase
      .from(NEWS_TABLE)
      .select("data,fetched_at")
      .gte("fetched_at", minFetchedAt)
      .order("published_at", { ascending: false })
      .limit(DEFAULT_NEWS_LIMIT);

    if (error) throw error;
    if (!data || data.length === 0) return null;

    const rows = data
      .map((row: any) => row.data)
      .filter(Boolean);
    if (rows.length === 0) return null;

    return {
      data: sortNewsForDisplay(rows),
      timestamp: new Date(data[0].fetched_at).getTime(),
      count: rows.length,
    };
  } catch (error: any) {
    console.warn("Supabase news fresh read failed:", error.message);
    lastNewsDebug.dbReadError = error.message;
    return null;
  }
}

function parsePositiveInt(value: any, fallback: number, max: number) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
}

function parseAssetQuery(value: any) {
  const raw = Array.isArray(value) ? value.join(",") : String(value || "");
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((asset) => String(asset).toUpperCase().replace(/[^A-Z0-9]/g, ""))
        .filter(Boolean),
    ),
  );
}

function getAllowedAssetUniverse(selectedAssets: string[]) {
  const selected = new Set(selectedAssets);
  const currencies = ["USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF", "CNH", "CNY"];
  const allowed = new Set(selected);

  selectedAssets.forEach((asset) => {
    if (
      /^[A-Z]{6}$/.test(asset) &&
      currencies.includes(asset.slice(0, 3)) &&
      currencies.includes(asset.slice(3, 6))
    ) {
      allowed.add(asset.slice(0, 3));
      allowed.add(asset.slice(3, 6));
    }
    if (asset === "XAUUSD") {
      allowed.add("XAU");
      allowed.add("USD");
    }
    if (asset === "XAGUSD") {
      allowed.add("XAG");
      allowed.add("USD");
    }
  });

  currencies.forEach((base) => {
    currencies.forEach((quote) => {
      if (base !== quote && selected.has(base) && selected.has(quote)) {
        allowed.add(`${base}${quote}`);
      }
    });
  });

  if (selected.has("USD")) allowed.add("DXY");
  if (selected.has("XAU") && selected.has("USD")) allowed.add("XAUUSD");
  if (selected.has("XAG") && selected.has("USD")) allowed.add("XAGUSD");

  return allowed;
}

function newsMatchesAssetUniverse(item: any, selectedAssets: string[]) {
  if (selectedAssets.length === 0) return true;

  const affectedAssets = normalizeAffectedAssets(item.affectedAssets || deriveAffectedAssets(item));
  if (affectedAssets.length === 0) return false;

  const allowed = getAllowedAssetUniverse(selectedAssets);
  return affectedAssets.every((asset) => allowed.has(asset));
}

function filterNewsByAssets(items: any[], selectedAssets: string[]) {
  return selectedAssets.length === 0
    ? items
    : items.filter((item) => newsMatchesAssetUniverse(item, selectedAssets));
}

async function readNewsHistoryFromDb(offset: number, limit: number, selectedAssets: string[] = []) {
  const supabase = getServerSupabaseClient();
  if (!supabase) {
    return { data: [], count: 0, hasMore: false };
  }

  try {
    const from = 0;
    const to = selectedAssets.length > 0 ? Math.max(499, offset + limit * 4 - 1) : offset + limit - 1;
    const { data, error, count } = await supabase
      .from(NEWS_TABLE)
      .select("data", { count: "exact" })
      .order("published_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    const rows = (data || [])
      .map((row: any) => row.data)
      .filter(Boolean);
    const filteredRows = filterNewsByAssets(sortNewsForDisplay(rows), selectedAssets);
    const pagedRows = selectedAssets.length > 0
      ? filteredRows.slice(offset, offset + limit)
      : filteredRows;

    return {
      data: pagedRows,
      count: selectedAssets.length > 0 ? filteredRows.length : count || rows.length,
      hasMore: selectedAssets.length > 0
        ? offset + pagedRows.length < filteredRows.length
        : typeof count === "number" ? offset + rows.length < count : rows.length === limit,
    };
  } catch (error: any) {
    console.warn("Supabase news history read failed:", error.message);
    lastNewsDebug.dbReadError = error.message;
    return { data: [], count: 0, hasMore: false };
  }
}

async function fillNewsFromDb(items: any[], minimum = MIN_VISIBLE_NEWS_ITEMS, selectedAssets: string[] = []) {
  if (items.length >= minimum) return items;

  const history = await readNewsHistoryFromDb(0, Math.max(DEFAULT_NEWS_LIMIT, minimum), selectedAssets);
  if (history.data.length === 0) return items;

  const seen = new Set(items.map((item) => item.id || item.link || item.title));
  const filled = [...items];
  history.data.forEach((item) => {
    const key = item.id || item.link || item.title;
    if (!key || seen.has(key)) return;
    seen.add(key);
    filled.push(item);
  });

  return sortNewsForDisplay(filled)
    .slice(0, Math.max(DEFAULT_NEWS_LIMIT, minimum));
}

async function readNewsByIdsFromDb(ids: string[]) {
  const supabase = getServerSupabaseClient();
  if (!supabase || ids.length === 0) return new Map<string, any>();

  try {
    const { data, error } = await supabase
      .from(NEWS_TABLE)
      .select("id,data")
      .in("id", ids);

    if (error) throw error;
    return new Map((data || []).map((row: any) => [row.id, row.data]));
  } catch (error: any) {
    console.warn("Supabase news id read failed:", error.message);
    lastNewsDebug.dbReadError = error.message;
    return new Map<string, any>();
  }
}

async function upsertNewsToDb(items: any[], fetchedAt: string) {
  const supabase = getServerSupabaseClient();
  if (!supabase || items.length === 0) return;

  try {
    const rows = items.map((item) => ({
      id: item.id,
      source: item.source,
      link: item.link,
      title: item.title,
      published_at: item.publishedAt,
      fetched_at: fetchedAt,
      translated_at: item.translatedAt || null,
      data: item,
    }));

    const { error } = await supabase.from(NEWS_TABLE).upsert(rows, {
      onConflict: "id",
    });

    if (error) throw error;
    lastNewsDebug.dbWriteAttempted = true;
  } catch (error: any) {
    console.warn("Supabase news upsert failed:", error.message);
    lastNewsDebug.dbWriteAttempted = true;
    lastNewsDebug.dbWriteError = error.message;
  }
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractRssTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXmlEntities(match[1]) : "";
}

function scoreNewsText(title: string, summary = "") {
  const text = `${title} ${summary}`.toLowerCase();
  const highTerms = [
    "fomc",
    "fed",
    "powell",
    "rate decision",
    "interest rate",
    "inflation",
    "cpi",
    "pce",
    "nonfarm",
    "nfp",
    "payroll",
    "unemployment",
    "jobs",
    "gdp",
    "retail sales",
    "tariff",
    "war",
    "ceasefire",
  ];
  const mediumTerms = [
    "pmi",
    "ism",
    "claims",
    "treasury yield",
    "yield",
    "oil inventories",
    "crude",
    "housing",
    "consumer confidence",
    "speech",
    "ecb",
    "boj",
    "boe",
  ];
  const bullishTerms = [
    "rises",
    "rise",
    "gains",
    "jumps",
    "surges",
    "strong",
    "hawkish",
    "beats",
    "higher",
    "rebounds",
  ];
  const bearishTerms = [
    "falls",
    "fall",
    "drops",
    "slides",
    "weak",
    "dovish",
    "misses",
    "lower",
    "declines",
    "slumps",
  ];

  const matches = (terms: string[]) => terms.filter((term) => text.includes(term));
  const highMatches = matches(highTerms);
  const mediumMatches = matches(mediumTerms);
  const bullishMatches = matches(bullishTerms);
  const bearishMatches = matches(bearishTerms);
  const impact = highMatches.length > 0 ? "High" : mediumMatches.length > 0 ? "Medium" : "Low";
  const sentimentScore = Math.max(
    -1,
    Math.min(1, (bullishMatches.length - bearishMatches.length) / 3),
  );
  const sentiment =
    sentimentScore > 0.15 ? "Bullish" : sentimentScore < -0.15 ? "Bearish" : "Neutral";
  const impactScore = impact === "High" ? 55 : impact === "Medium" ? 35 : 20;
  const score = Math.min(
    100,
    Math.round(impactScore + Math.abs(sentimentScore) * 25 + Math.min(20, (highMatches.length + mediumMatches.length) * 5)),
  );

  return {
    impact,
    sentiment,
    sentimentScore: Number(sentimentScore.toFixed(3)),
    relevanceScore: score / 100,
    score,
    tags: [...highMatches, ...mediumMatches].slice(0, 5),
    scoredBy: "Local",
  };
}

function scoreFromMarketaux(sentimentScore: number, relevanceScore: number) {
  const normalizedSentiment = Number.isFinite(sentimentScore) ? sentimentScore : 0;
  const normalizedRelevance = Number.isFinite(relevanceScore) ? relevanceScore : 0.5;
  const sentiment =
    normalizedSentiment > 0.15
      ? "Bullish"
      : normalizedSentiment < -0.15
        ? "Bearish"
        : "Neutral";
  const score = Math.min(
    100,
    Math.round(normalizedRelevance * 65 + Math.abs(normalizedSentiment) * 35),
  );
  const impact = score >= 70 ? "High" : score >= 45 ? "Medium" : "Low";

  return {
    impact,
    sentiment,
    sentimentScore: Number(normalizedSentiment.toFixed(3)),
    relevanceScore: Number(normalizedRelevance.toFixed(3)),
    score,
    scoredBy: "Marketaux",
  };
}

function shortText(value: string, maxLength = 220) {
  const normalized = (value || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3).trim()}...`;
}

function getNewsSourceRank(item: any) {
  const source = String(item.source || "");
  if (/FXStreet|Investing|Federal Reserve|Fed Speeches|EIA/i.test(source)) return 0;
  if (source.startsWith("TradingView")) return 2;
  return 1;
}

function sortNewsForDisplay(items: any[]) {
  return [...items].sort((a, b) => {
    const rankDiff = getNewsSourceRank(a) - getNewsSourceRank(b);
    if (rankDiff !== 0) return rankDiff;
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
  });
}

function deriveAffectedAssets(item: any) {
  const text = `${item.title || ""} ${item.summary || ""} ${(item.tags || []).join(" ")}`.toUpperCase();
  const compactText = text.replace(/[^A-Z0-9]/g, "");
  const assets = new Set<string>();
  const candidates = [
    "USD",
    "DXY",
    "XAU",
    "XAUUSD",
    "GOLD",
    "SILVER",
    "XAG",
    "EUR",
    "EURUSD",
    "GBP",
    "GBPUSD",
    "JPY",
    "USDJPY",
    "AUD",
    "AUDUSD",
    "NZD",
    "NZDUSD",
    "CAD",
    "USDCAD",
    "CHF",
    "USDCHF",
    "OIL",
    "WTI",
    "BRENT",
    "BTC",
    "ETH",
    "US500",
    "SPX",
    "NASDAQ",
    "NAS100",
  ];

  candidates.forEach((asset) => {
    const mentioned =
      asset.length === 6
        ? compactText.includes(asset)
        : new RegExp(`\\b${asset}\\b`).test(text);
    if (!mentioned) return;
    if (asset === "GOLD") assets.add("XAU");
    else if (asset === "SILVER") assets.add("XAG");
    else if (asset === "WTI" || asset === "BRENT") assets.add("OIL");
    else if (asset === "SPX") assets.add("US500");
    else if (asset === "NASDAQ") assets.add("NAS100");
    else assets.add(asset);
  });

  if (item.category === "Energy") assets.add("OIL");
  if (/\bFED\b|\bFOMC\b|\bPOWELL\b|\bTREASURY\b|\bDOLLAR\b|\bUSD\b/.test(text)) {
    assets.add("USD");
  }
  if (/\bYEN\b|\bJPY\b|YÊN NHẬT/.test(text)) assets.add("JPY");
  if (/\bPOUND\b|\bSTERLING\b|\bGBP\b|BẢNG ANH/.test(text)) assets.add("GBP");
  if (/\bEURO\b|\bEUR\b|ĐỒNG EURO/.test(text)) assets.add("EUR");
  if (/\bAUSSIE\b|\bAUSTRALIAN DOLLAR\b|\bAUD\b|ĐÔ LA ÚC/.test(text)) assets.add("AUD");
  if (/\bCANADIAN DOLLAR\b|\bLOONIE\b|\bCAD\b|ĐÔ LA CANADA/.test(text)) assets.add("CAD");
  if (/\bSWISS FRANC\b|\bFRANC\b|\bCHF\b|FRANC THỤY SĨ/.test(text)) assets.add("CHF");
  if (/\bYUAN\b|\bRENMINBI\b|\bCNY\b|\bCNH\b|NHÂN DÂN TỆ/.test(text)) assets.add("CNY");
  if (/\bGOLD\b|\bXAU\b|\bXAUUSD\b/.test(text)) assets.add("XAU");
  if (/\bCRUDE\b|\bWTI\b|\bBRENT\b|\bOIL\b/.test(text)) assets.add("OIL");
  if (/\bS&P\b|\bSPX\b|\bUS500\b/.test(text)) assets.add("US500");
  if (/\bNASDAQ\b|\bNAS100\b/.test(text)) assets.add("NAS100");

  return Array.from(assets).slice(0, 6);
}

function normalizeAffectedAssets(value: any) {
  const values = Array.isArray(value) ? value : [];
  const normalized = values
    .map((asset) => String(asset).toUpperCase().replace(/[^A-Z0-9]/g, ""))
    .map((asset) => {
      if (asset === "GOLD") return "XAU";
      if (asset === "SILVER") return "XAG";
      if (asset === "WTI" || asset === "BRENT" || asset === "CRUDE") return "OIL";
      if (asset === "SPX" || asset === "SP500" || asset === "SANDP500") return "US500";
      if (asset === "NASDAQ" || asset === "NDX") return "NAS100";
      return asset;
    })
    .filter(Boolean);

  return Array.from(new Set(normalized)).slice(0, 6);
}

function deriveTradingViewAssets(item: any) {
  const symbols = Array.isArray(item.relatedSymbols) ? item.relatedSymbols : [];
  const text = `${item.title || ""} ${symbols
    .map((symbol: any) => symbol?.symbol || "")
    .join(" ")}`.toUpperCase();
  const assets = new Set<string>();
  const currencies = new Set([
    "USD",
    "EUR",
    "GBP",
    "JPY",
    "AUD",
    "NZD",
    "CAD",
    "CHF",
    "CNH",
    "CNY",
  ]);

  symbols.forEach((symbol: any) => {
    const rawSymbol = String(symbol?.symbol || "").toUpperCase();
    const ticker = rawSymbol.split(":").pop()?.replace(/[^A-Z0-9!]/g, "") || "";

    if (/BTC/.test(ticker)) assets.add("BTC");
    if (/ETH/.test(ticker)) assets.add("ETH");
    if (/GOLD|XAU/.test(ticker)) assets.add("XAU");
    if (/SILVER|XAG/.test(ticker)) assets.add("XAG");
    if (/CL1!|BRN1!|WTI|BRENT|OIL/.test(ticker)) assets.add("OIL");
    if (/DXY|USDOLLAR/.test(ticker)) assets.add("DXY");
    if (/SPX|SPY|US500|ES1!/.test(ticker)) assets.add("US500");
    if (/NDX|QQQ|NAS100|IXIC|NQ1!/.test(ticker)) assets.add("NAS100");
    if (
      /^[A-Z]{6}$/.test(ticker) &&
      currencies.has(ticker.slice(0, 3)) &&
      currencies.has(ticker.slice(3, 6))
    ) {
      assets.add(ticker);
      if (ticker.includes("USD")) assets.add("USD");
    }
  });

  if (/\bDOLLAR\b|\bUSD\b|\bFED\b|\bFOMC\b/.test(text)) assets.add("USD");
  if (/\bYEN\b|\bJPY\b|YÊN NHẬT/.test(text)) assets.add("JPY");
  if (/\bPOUND\b|\bSTERLING\b|\bGBP\b|BẢNG ANH/.test(text)) assets.add("GBP");
  if (/\bEURO\b|\bEUR\b|ĐỒNG EURO/.test(text)) assets.add("EUR");
  if (/\bAUSSIE\b|\bAUSTRALIAN DOLLAR\b|\bAUD\b|ĐÔ LA ÚC/.test(text)) assets.add("AUD");
  if (/\bCANADIAN DOLLAR\b|\bLOONIE\b|\bCAD\b|ĐÔ LA CANADA/.test(text)) assets.add("CAD");
  if (/\bSWISS FRANC\b|\bFRANC\b|\bCHF\b|FRANC THỤY SĨ/.test(text)) assets.add("CHF");
  if (/\bYUAN\b|\bRENMINBI\b|\bCNY\b|\bCNH\b|NHÂN DÂN TỆ/.test(text)) assets.add("CNY");
  if (/\bGOLD\b|\bXAU\b/.test(text)) assets.add("XAU");
  if (/\bOIL\b|\bWTI\b|\bBRENT\b|\bCRUDE\b/.test(text)) assets.add("OIL");
  if (/\bBITCOIN\b|\bBTC\b/.test(text)) assets.add("BTC");
  if (/\bETHEREUM\b|\bETH\b/.test(text)) assets.add("ETH");

  return Array.from(assets).slice(0, 6);
}

function deriveTradingViewCategory(item: any, affectedAssets: string[]) {
  const text = `${item.title || ""} ${affectedAssets.join(" ")}`.toUpperCase();

  if (affectedAssets.includes("OIL")) return "Energy";
  if (/\bFED\b|\bFOMC\b|\bECB\b|\bBOJ\b|\bBOE\b|\bCENTRAL BANK\b/.test(text)) {
    return "Central Bank";
  }
  if (
    affectedAssets.some((asset) => /^[A-Z]{6}$/.test(asset)) ||
    affectedAssets.includes("USD") ||
    affectedAssets.includes("DXY")
  ) {
    return "Forex";
  }
  return "Macro";
}

function mapTradingViewNewsItem(item: any) {
  const title = String(item.title || "").trim();
  const affectedAssets = deriveTradingViewAssets(item);
  const category = deriveTradingViewCategory(item, affectedAssets);
  const providerName = item.provider?.name || item.provider?.id || "TradingView";
  const storyPath = String(item.storyPath || "");
  const link = item.link || (storyPath ? `https://www.tradingview.com${storyPath}` : "https://www.tradingview.com/news-flow/");
  const publishedAt =
    typeof item.published === "number"
      ? new Date(item.published * 1000).toISOString()
      : new Date().toISOString();
  const localScore = scoreNewsText(title, providerName);

  return withDisplayFields({
    id: `TradingView-${item.id || item.storyPath || title}`,
    title,
    source: `TradingView / ${providerName}`,
    category,
    link,
    summary: title,
    publishedAt,
    ...localScore,
    score: Math.min(100, Math.max(localScore.score, item.urgency === 1 ? 70 : 0)),
    impact:
      item.urgency === 1
        ? "High"
        : localScore.impact,
    affectedAssets,
    tags: [
      providerName,
      ...(Array.isArray(item.relatedSymbols)
        ? item.relatedSymbols
            .map((symbol: any) => String(symbol?.symbol || "").split(":").pop())
            .filter(Boolean)
        : []),
    ].slice(0, 5),
    scoredBy: "Local",
  });
}

async function fetchTradingViewNewsFlow() {
  const now = Date.now();
  if (
    tradingViewCache &&
    now - tradingViewCache.timestamp < TRADINGVIEW_CACHE_TTL_MS
  ) {
    return tradingViewCache.data;
  }

  const url = new URL("https://news-mediator.tradingview.com/public/news-flow/v2/news");
  url.searchParams.set("client", "web");
  url.searchParams.set("streaming", "false");
  url.searchParams.append("filter", "lang:en");

  const response = await fetch(url, {
    signal: AbortSignal.timeout(6000),
    headers: {
      "user-agent": "Mozilla/5.0 TradeNews TradingView News Flow Reader",
      origin: "https://www.tradingview.com",
      referer: "https://www.tradingview.com/news-flow/",
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`TradingView News Flow: ${response.status} ${response.statusText}`);
  }

  const json: any = await response.json();
  const items = Array.isArray(json.items) ? json.items : [];
  const mapped = items
    .filter((item: any) => item?.title && (item?.storyPath || item?.link))
    .slice(0, 50)
    .map(mapTradingViewNewsItem)
    .filter(
      (item: any) =>
        item.affectedAssets.length > 0 ||
        item.impact !== "Low" ||
        item.tags.some((tag: string) =>
          /FED|FOMC|ECB|BOJ|BOE|CPI|PCE|PMI|GDP|NFP|PAYROLL|DXY|GOLD|XAU|OIL/i.test(tag),
        ),
    )
    .slice(0, 25);

  tradingViewCache = {
    data: mapped,
    timestamp: now,
  };

  return mapped;
}

function deriveEffect(sentiment: string) {
  if (sentiment === "Bullish") return "Tốt";
  if (sentiment === "Bearish") return "Xấu";
  return "Trung lập";
}

function withDisplayFields(item: any) {
  return {
    ...item,
    titleVi: item.titleVi || item.title || "Tin thị trường",
    summaryVi: item.summaryVi || shortText(item.summary || item.title || "Chưa có tóm tắt ngắn."),
    effect: item.effect || deriveEffect(item.sentiment),
    affectedAssets: normalizeAffectedAssets(item.affectedAssets || deriveAffectedAssets(item)),
  };
}

function shortProviderError(message: string) {
  if (message.includes("429")) return "429 quota/rate limit";
  if (message.includes("403")) return "403 forbidden/quota";
  return message.replace(/\s+/g, " ").slice(0, 160);
}

function getDeepLApiKey() {
  return process.env.DEEPL_API_KEY || "";
}

function getDeepLApiUrl(apiKey: string) {
  if (process.env.DEEPL_API_URL) return process.env.DEEPL_API_URL.replace(/\/$/, "");
  return apiKey.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
}

async function translateTextsWithDeepL(texts: string[], apiKey: string) {
  const apiUrl = getDeepLApiUrl(apiKey);
  const response = await fetch(`${apiUrl}/v2/translate`, {
    method: "POST",
    signal: AbortSignal.timeout(20000),
    headers: {
      authorization: `DeepL-Auth-Key ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      text: texts,
      target_lang: "VI",
      preserve_formatting: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `${response.status} ${response.statusText}${errorText ? ` - ${errorText.slice(0, 180)}` : ""}`,
    );
  }

  const json: any = await response.json();
  const translations = Array.isArray(json.translations) ? json.translations : [];
  if (translations.length !== texts.length) {
    throw new Error(`DeepL returned ${translations.length}/${texts.length} translations`);
  }

  return translations.map((translation: any) => String(translation.text || "").trim());
}

async function enrichNewsForVietnameseDisplay(items: any[]) {
  const baseItems = items.map(withDisplayFields);
  const apiKey = getDeepLApiKey();
  lastNewsDebug.hasDeepLKey = Boolean(apiKey);
  lastNewsDebug.translationProvider = "DeepL";
  if (!apiKey) {
    lastNewsDebug.translationAttempted = false;
    lastNewsDebug.translationError = "Missing DEEPL_API_KEY env";
    return baseItems;
  }

  const targets = baseItems
    .filter((item) => !item.translatedAt)
    .slice(0, DEEPL_TRANSLATION_BATCH_LIMIT);
  lastNewsDebug.translationAttempted = targets.length > 0;
  lastNewsDebug.translationTargetCount = targets.length;
  lastNewsDebug.translationBatchLimit = DEEPL_TRANSLATION_BATCH_LIMIT;
  if (targets.length === 0) return baseItems;

  const texts = targets.flatMap((item) => [
    item.title || "",
    shortText(item.summary || item.title || "", 500),
  ]);

  try {
    const translatedTexts = await translateTextsWithDeepL(texts, apiKey);
    const translatedAt = new Date().toISOString();
    const translatedById = new Map<string, { titleVi: string; summaryVi: string }>();

    targets.forEach((item, index) => {
      translatedById.set(item.id, {
        titleVi: translatedTexts[index * 2] || item.titleVi,
        summaryVi: shortText(translatedTexts[index * 2 + 1] || item.summaryVi, 260),
      });
    });

    lastNewsDebug.translationError = undefined;
    lastNewsDebug.translationResult = "ok";

    return baseItems.map((item) => {
      const match = translatedById.get(item.id);
      if (!match) return item;

      return {
        ...item,
        ...match,
        translatedAt,
        translationProvider: "DeepL",
        effect: item.effect,
        affectedAssets: normalizeAffectedAssets(item.affectedAssets || deriveAffectedAssets(item)),
      };
    });
  } catch (error: any) {
    console.warn("DeepL news translation failed:", error.message);
    lastNewsDebug.translationError = shortProviderError(error.message);
    lastNewsDebug.translationResult = "failed";
    return baseItems;
  }
}

function parseRssItems(
  xml: string,
  feed: { source: string; category: string; url: string },
) {
  const blocks =
    xml.match(/<item[\s\S]*?<\/item>/gi) ||
    xml.match(/<entry[\s\S]*?<\/entry>/gi) ||
    [];

  return blocks.map((block, index) => {
    const title = extractRssTag(block, "title");
    const linkFromTag = extractRssTag(block, "link");
    const linkFromAttr =
      block.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1] || "";
    const link = linkFromTag || linkFromAttr || feed.url;
    const published =
      extractRssTag(block, "pubDate") ||
      extractRssTag(block, "published") ||
      extractRssTag(block, "updated") ||
      new Date().toISOString();
    const summary =
      extractRssTag(block, "description") ||
      extractRssTag(block, "summary") ||
      extractRssTag(block, "content:encoded");
    const publishedAt = Number.isFinite(new Date(published).getTime())
      ? new Date(published).toISOString()
      : new Date().toISOString();

    const localScore = scoreNewsText(title, summary);

    return withDisplayFields({
      id: `${feed.source}-${link || title || index}`,
      title: title || "Market news update",
      source: feed.source,
      category: feed.category,
      link,
      summary,
      publishedAt,
      ...localScore,
    });
  });
}

async function fetchNewsFeed(feed: {
  source: string;
  category: string;
  url: string;
}) {
  const response = await fetch(feed.url, {
    signal: AbortSignal.timeout(3500),
    headers: {
      "user-agent": "Mozilla/5.0 TradeNews RSS Reader",
      accept: "application/rss+xml, application/xml, text/xml",
    },
  });

  if (!response.ok) {
    throw new Error(`${feed.source}: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  return parseRssItems(xml, feed);
}

async function fetchMarketauxNews() {
  const apiKey = process.env.MARKETAUX_API_KEY;
  if (!apiKey) return [];

  const now = Date.now();
  if (marketauxCache && now - marketauxCache.timestamp < MARKETAUX_CACHE_TTL_MS) {
    return marketauxCache.data;
  }

  const url = new URL("https://api.marketaux.com/v1/news/all");
  url.searchParams.set("api_token", apiKey);
  url.searchParams.set("language", "en");
  url.searchParams.set("filter_entities", "true");
  url.searchParams.set("limit", "20");
  url.searchParams.set("countries", "us");

  const response = await fetch(url, {
    signal: AbortSignal.timeout(5000),
    headers: {
      "user-agent": "Mozilla/5.0 TradeNews Marketaux Reader",
      accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Marketaux: ${response.status} ${response.statusText}`);
  }

  const json: any = await response.json();
  const data = Array.isArray(json.data) ? json.data : [];
  const mapped = data.map((item: any) => {
    const entities = Array.isArray(item.entities) ? item.entities : [];
    const bestEntity = entities
      .filter((entity: any) => typeof entity.sentiment_score === "number")
      .sort((a: any, b: any) => (b.match_score || 0) - (a.match_score || 0))[0];
    const sentimentScore =
      typeof item.sentiment_score === "number"
        ? item.sentiment_score
        : bestEntity?.sentiment_score || 0;
    const relevanceScore = bestEntity?.match_score
      ? Math.min(1, bestEntity.match_score / 100)
      : 0.65;
    const scored = scoreFromMarketaux(sentimentScore, relevanceScore);
    const tags = entities
      .map((entity: any) => entity.symbol || entity.name)
      .filter(Boolean)
      .slice(0, 5);

    return withDisplayFields({
      id: `Marketaux-${item.uuid || item.url || item.title}`,
      title: item.title || "Marketaux market update",
      source: item.source || "Marketaux",
      category: "Macro",
      link: item.url || item.source_url || "https://www.marketaux.com/",
      summary: item.description || item.snippet || "",
      publishedAt: item.published_at
        ? new Date(item.published_at).toISOString()
        : new Date().toISOString(),
      ...scored,
      tags,
    });
  });

  marketauxCache = {
    data: mapped,
    timestamp: now,
  };

  return mapped;
}

export default async function handler(req: any, res: any) {
  const now = Date.now();
  lastNewsDebug = {
    hasDeepLKey: Boolean(getDeepLApiKey()),
    translationProvider: "DeepL",
    dbFreshHit: false,
    dbWriteAttempted: false,
  };

  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  const offset = parsePositiveInt(req.query?.offset, 0, 10000);
  const limit = parsePositiveInt(req.query?.limit, DEFAULT_NEWS_LIMIT, MAX_HISTORY_LIMIT);
  const selectedAssets = parseAssetQuery(req.query?.assets);
  const historyOnly = req.query?.history === "1" || offset > 0;

  if (historyOnly) {
    const history = await readNewsHistoryFromDb(offset, limit, selectedAssets);
    return res.status(200).json({
      success: true,
      source: "supabase_history",
      fetchedAt: new Date(now).toISOString(),
      data: history.data,
      totalCount: history.count,
      hasMore: history.hasMore,
      debug: {
        ...lastNewsDebug,
        source: "supabase_history",
        dbReadCount: history.data.length,
      },
    });
  }

  const freshDbCache = await readFreshNewsFromDb(now);
  if (freshDbCache && freshDbCache.data.length > 0) {
    const data = await fillNewsFromDb(
      filterNewsByAssets(freshDbCache.data, selectedAssets),
      MIN_VISIBLE_NEWS_ITEMS,
      selectedAssets,
    );
    return res.status(200).json({
      success: true,
      source: "supabase_cached",
      fetchedAt: new Date(freshDbCache.timestamp).toISOString(),
      nextRefreshSeconds: Math.ceil(
        (NEWS_CACHE_TTL_MS - (now - freshDbCache.timestamp)) / 1000,
      ),
      hasMore: data.length >= MIN_VISIBLE_NEWS_ITEMS,
      data,
      debug: {
        ...lastNewsDebug,
        source: "supabase_cached",
        dbFreshHit: true,
        dbReadCount: data.length,
        translatedCount: data.filter((item: any) => item.translatedAt).length,
        untranslatedCount: data.filter((item: any) => !item.translatedAt).length,
      },
    });
  }

  if (newsCache && now - newsCache.timestamp < NEWS_CACHE_TTL_MS) {
    const data = await fillNewsFromDb(
      filterNewsByAssets(newsCache.data, selectedAssets),
      MIN_VISIBLE_NEWS_ITEMS,
      selectedAssets,
    );
    return res.status(200).json({
      success: true,
      source: "rss_cached",
      fetchedAt: new Date(newsCache.timestamp).toISOString(),
      nextRefreshSeconds: Math.ceil(
        (NEWS_CACHE_TTL_MS - (now - newsCache.timestamp)) / 1000,
      ),
      hasMore: data.length >= MIN_VISIBLE_NEWS_ITEMS,
      data,
      debug: {
        ...lastNewsDebug,
        source: "rss_cached",
        translatedCount: data.filter((item: any) => item.translatedAt).length,
        untranslatedCount: data.filter((item: any) => !item.translatedAt).length,
      },
    });
  }

  const results = await Promise.allSettled([
    fetchTradingViewNewsFlow(),
    ...newsFeeds.map(fetchNewsFeed),
    fetchMarketauxNews(),
  ]);
  const items = results
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((item) => item.title && item.link);

  const seen = new Set<string>();
  const deduped = items
    .filter((item) => {
      const key = `${item.title.toLowerCase()}|${item.link}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    )
    .slice(0, 60);

  const cachedById = await readNewsByIdsFromDb(deduped.map((item) => item.id));
  const mergedItems = deduped.map((item) => {
    const cached = cachedById.get(item.id);
    return cached?.translatedAt && cached.translationProvider === "DeepL"
      ? { ...item, ...cached }
      : item;
  });
  const displayItems = sortNewsForDisplay(await enrichNewsForVietnameseDisplay(mergedItems));
  const fetchedAt = new Date(now).toISOString();

  if (displayItems.length > 0) {
    newsCache = {
      data: displayItems,
      timestamp: now,
    };
    await upsertNewsToDb(displayItems, fetchedAt);
  }

  const responseItems = await fillNewsFromDb(
    filterNewsByAssets(displayItems.length > 0 ? displayItems : newsCache?.data || [], selectedAssets),
    MIN_VISIBLE_NEWS_ITEMS,
    selectedAssets,
  );

  return res.status(200).json({
    success: true,
    source: "rss_live",
    fetchedAt,
    failedSources: results
      .map((result, index) =>
        result.status === "rejected"
          ? index === 0
            ? "TradingView News Flow"
            : index - 1 < newsFeeds.length
              ? newsFeeds[index - 1].source
              : "Marketaux"
          : null,
      )
      .filter(Boolean),
    nextRefreshSeconds: NEWS_CACHE_TTL_MS / 1000,
    hasMore: responseItems.length >= MIN_VISIBLE_NEWS_ITEMS,
    data: responseItems,
    debug: {
      ...lastNewsDebug,
      source: "rss_live",
      failedSources: results
        .map((result, index) =>
          result.status === "rejected"
            ? index === 0
              ? "TradingView News Flow"
              : index - 1 < newsFeeds.length
                ? newsFeeds[index - 1].source
                : "Marketaux"
            : null,
        )
        .filter(Boolean),
      translatedCount: displayItems.filter((item: any) => item.translatedAt).length,
      untranslatedCount: displayItems.filter((item: any) => !item.translatedAt).length,
    },
  });
}
