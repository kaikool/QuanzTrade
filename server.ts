import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares to parse bodies
  app.use(express.json());


  // In-memory cache for calendar data
  let calendarCache: { data: any[]; timestamp: number } | null = null;
  const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hour TTL

  // In-memory cache for fast RSS news. Keep this short because stale market
  // headlines lose value quickly.
  let newsCache: { data: any[]; timestamp: number } | null = null;
  const NEWS_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
  let marketauxCache: { data: any[]; timestamp: number } | null = null;
  const MARKETAUX_CACHE_TTL_MS = 10 * 60 * 1000; // protect free API quota
  let tradingViewCache: { data: any[]; timestamp: number } | null = null;
  const TRADINGVIEW_CACHE_TTL_MS = 60 * 1000;
  const DEEPL_TRANSLATION_BATCH_LIMIT = Number(
    process.env.DEEPL_TRANSLATION_BATCH_LIMIT || 30,
  );
  const NEWS_TABLE = "news_items";
  const DEFAULT_NEWS_LIMIT = 60;
  const MAX_HISTORY_LIMIT = 100;
  const MIN_VISIBLE_NEWS_ITEMS = 5;
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

  async function readNewsHistoryFromDb(offset: number, limit: number) {
    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return { data: [], count: 0, hasMore: false };
    }

    try {
      const from = offset;
      const to = offset + limit - 1;
      const { data, error, count } = await supabase
        .from(NEWS_TABLE)
        .select("data", { count: "exact" })
        .order("published_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const rows = (data || [])
        .map((row: any) => row.data)
        .filter(Boolean);

      return {
        data: sortNewsForDisplay(rows),
        count: count || rows.length,
        hasMore: typeof count === "number" ? offset + rows.length < count : rows.length === limit,
      };
    } catch (error: any) {
      console.warn("Supabase news history read failed:", error.message);
      lastNewsDebug.dbReadError = error.message;
      return { data: [], count: 0, hasMore: false };
    }
  }

  async function fillNewsFromDb(items: any[], minimum = MIN_VISIBLE_NEWS_ITEMS) {
    if (items.length >= minimum) return items;

    const history = await readNewsHistoryFromDb(0, Math.max(DEFAULT_NEWS_LIMIT, minimum));
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
    if (/\bFED\b|\bFOMC\b|\bPOWELL\b|\bTREASURY\b|\bDOLLAR\b|\bUSD\b|\bUS\b/.test(text)) {
      assets.add("USD");
    }
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
      if (/^[A-Z]{6}$/.test(ticker)) {
        assets.add(ticker);
        if (ticker.includes("USD")) assets.add("USD");
      }
    });

    if (/\bDOLLAR\b|\bUSD\b|\bFED\b|\bFOMC\b/.test(text)) assets.add("USD");
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
    const link =
      item.link ||
      (storyPath
        ? `https://www.tradingview.com${storyPath}`
        : "https://www.tradingview.com/news-flow/");
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
      impact: item.urgency === 1 ? "High" : localScore.impact,
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

  function parseRssItems(xml: string, feed: { source: string; category: string; url: string }) {
    const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];

    return blocks.map((block, index) => {
      const title = extractRssTag(block, "title");
      const linkFromTag = extractRssTag(block, "link");
      const linkFromAttr = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1] || "";
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

  async function fetchNewsFeed(feed: { source: string; category: string; url: string }) {
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

  // Helpers for parsing XML feed
  function parseXmlDateAndTimeToISO(dateVal: string, timeVal: string): string {
    let year = "2026";
    let month = "05";
    let day = "22";

    if (dateVal) {
      const parts = dateVal.split("-");
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          year = parts[0];
          month = parts[1];
          day = parts[2];
        } else {
          month = parts[0];
          day = parts[1];
          year = parts[2];
        }
      }
    }

    let hours = "00";
    let minutes = "00";

    if (timeVal) {
      const cleanTime = timeVal.toLowerCase().trim();
      const timeMatch = cleanTime.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?/);
      if (timeMatch) {
        let h = parseInt(timeMatch[1], 10);
        const m = timeMatch[2];
        const ampm = timeMatch[3];
        if (ampm === "pm" && h < 12) {
          h += 12;
        }
        if (ampm === "am" && h === 12) {
          h = 0;
        }
        hours = h.toString().padStart(2, "0");
        minutes = m;
      }
    }

    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hours}:${minutes}:00-04:00`;
  }

  async function fetchAndParseXmlBackup(): Promise<any[]> {
    const xmlUrl = "https://nfs.faireconomy.media/ff_calendar_thisweek.xml?version=fb259b5c017e4253e166ae2914b82f7a";
    const xmlResponse = await fetch(xmlUrl, { signal: AbortSignal.timeout(5000) });
    if (!xmlResponse.ok) {
      throw new Error(`Failed to fetch XML: ${xmlResponse.status} ${xmlResponse.statusText}`);
    }
    const xmlText = await xmlResponse.text();
    
    const eventRegex = /<event>([\s\S]*?)<\/event>/g;
    const events: any[] = [];
    let match;
    
    const extractTag = (eventBlock: string, tag: string): string => {
      const r = new RegExp(`<${tag}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\/${tag}>`, "i");
      let m = eventBlock.match(r);
      if (!m) {
        const r2 = new RegExp(`<${tag}>([\\s\\S]*?)<\/${tag}>`, "i");
        m = eventBlock.match(r2);
      }
      return m ? m[1].trim() : "";
    };

    while ((match = eventRegex.exec(xmlText)) !== null) {
      const block = match[1];
      const title = extractTag(block, "title");
      const country = extractTag(block, "country");
      const dateVal = extractTag(block, "date");
      const timeVal = extractTag(block, "time");
      const impact = extractTag(block, "impact");
      const forecast = extractTag(block, "forecast");
      const previous = extractTag(block, "previous");

      if (country.toUpperCase() === "USD") {
        let mappedImpact = "Low";
        const cleanedImpact = impact.toLowerCase();
        if (cleanedImpact.includes("high") || impact === "3") {
          mappedImpact = "High";
        } else if (cleanedImpact.includes("medium") || impact === "2") {
          mappedImpact = "Medium";
        } else if (cleanedImpact.includes("low") || impact === "1") {
          mappedImpact = "Low";
        }

        const entryISO = parseXmlDateAndTimeToISO(dateVal, timeVal);

        events.push({
          title: title || "Economic Event",
          country: "USD",
          date: entryISO,
          impact: mappedImpact,
          forecast: forecast || "",
          previous: previous || "",
          actual: ""
        });
      }
    }

    return events;
  }

  // API endpoint for economic calendar
  app.get("/api/calendar", async (req, res) => {
    const now = Date.now();

    // 1. Return from cache if valid
    if (calendarCache && (now - calendarCache.timestamp < CACHE_TTL_MS)) {
      return res.json({
        success: true,
        source: "live_forex_factory_feed_cached",
        data: calendarCache.data
      });
    }

    try {
      // 2. Try fetching JSON feed
      const url = "https://nfs.faireconomy.media/ff_calendar_thisweek.json?version=c1ac8d47f5073ddfeeddc12d201c449f";
      const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch JSON: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(`Invalid response format from remote API: ${contentType}`);
      }
      
      const externalData: any[] = await response.json();
      
      // Map and filter for country "USD" only
      const formattedWeekly = externalData.map(item => {
        let mappedImpact = "Low";
        if (item.impact === "High" || item.impact === "3" || item.impact === "high") mappedImpact = "High";
        else if (item.impact === "Medium" || item.impact === "2" || item.impact === "medium") mappedImpact = "Medium";
        else if (item.impact === "Low" || item.impact === "1" || item.impact === "low") mappedImpact = "Low";
        else mappedImpact = "Low";

        return {
          title: item.title || "Economic Event",
          country: item.country || "USD",
          date: item.date,
          impact: mappedImpact,
          forecast: item.forecast || "",
          previous: item.previous || "",
          actual: item.actual || ""
        };
      }).filter(item => item.country === "USD");

      formattedWeekly.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Update Cache
      calendarCache = {
        data: formattedWeekly,
        timestamp: now
      };

      return res.json({
        success: true,
        source: "live_forex_factory_feed",
        data: formattedWeekly
      });
    } catch (jsonError: any) {
      console.warn("JSON feed extraction failed, attempting XML feed fallback:", jsonError.message);

      try {
        // 3. Try fetching XML fallback
        const parsedXmlData = await fetchAndParseXmlBackup();
        parsedXmlData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Update Cache
        calendarCache = {
          data: parsedXmlData,
          timestamp: now
        };

        return res.json({
          success: true,
          source: "live_forex_factory_xml_feed",
          data: parsedXmlData
        });
      } catch (xmlError: any) {
        console.error("Both JSON and XML feeds failed:", xmlError.message);

        // 4. Try returning expired cache as last resort
        if (calendarCache) {
          console.warn("Serving expired calendar cache due to remote errors:", xmlError.message);
          return res.json({
            success: true,
            source: "live_forex_factory_feed_cached_expired",
            warning: xmlError.message,
            data: calendarCache.data
          });
        }

        // 5. Ultimate fallback - return error
        return res.status(502).json({
          success: false,
          error: "Failed to fetch calendar data from all sources",
          details: `JSON: ${jsonError.message}. XML: ${xmlError.message}`
        });
      }
    }
  });

  // API endpoint for fast market news
  app.get("/api/news", async (req, res) => {
    const now = Date.now();
    lastNewsDebug = {
      hasDeepLKey: Boolean(getDeepLApiKey()),
      translationProvider: "DeepL",
      dbFreshHit: false,
      dbWriteAttempted: false,
    };

    const offset = parsePositiveInt(req.query?.offset, 0, 10000);
    const limit = parsePositiveInt(req.query?.limit, DEFAULT_NEWS_LIMIT, MAX_HISTORY_LIMIT);
    const historyOnly = req.query?.history === "1" || offset > 0;

    if (historyOnly) {
      const history = await readNewsHistoryFromDb(offset, limit);
      return res.json({
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
      const data = await fillNewsFromDb(freshDbCache.data);
      return res.json({
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
      const data = await fillNewsFromDb(newsCache.data);
      return res.json({
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

    const responseItems = await fillNewsFromDb(displayItems.length > 0 ? displayItems : newsCache?.data || []);

    return res.json({
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
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
