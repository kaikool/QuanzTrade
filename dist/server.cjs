var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_supabase_js = require("@supabase/supabase-js");
var import_crypto = __toESM(require("crypto"), 1);
import_dotenv.default.config({ path: ".env.local" });
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = process.env.PORT ? parseInt(process.env.PORT) : 3e3;
app.use(import_express.default.json());
var activeSessions = /* @__PURE__ */ new Set();
var memorySupabaseUrl = "";
var memorySupabaseAnon = "";
async function startServer() {
  function getServerSupabaseClient() {
    const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || memorySupabaseUrl;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || memorySupabaseAnon;
    if (!url || !key) return null;
    return (0, import_supabase_js.createClient)(url, key, {
      auth: {
        persistSession: false
      }
    });
  }
  app.post("/api/auth/login", async (req, res) => {
    const { password, url, anon } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, message: "Vui l\xF2ng nh\u1EADp m\u1EADt kh\u1EA9u" });
    }
    if (url) memorySupabaseUrl = url;
    if (anon) memorySupabaseAnon = anon;
    let sitePassword = process.env.SITE_PASSWORD || "";
    const supabase = getServerSupabaseClient();
    if (supabase) {
      try {
        const { data } = await supabase.from("t5_config").select("value").eq("key", "SITE_PASSWORD").single();
        if (data?.value) sitePassword = data.value;
      } catch (err) {
      }
    }
    if (password === sitePassword || !sitePassword) {
      const token = import_crypto.default.randomBytes(32).toString("hex");
      activeSessions.add(token);
      return res.json({ success: true, token, configured: !!sitePassword });
    }
    return res.status(401).json({ success: false, message: "Sai m\u1EADt kh\u1EA9u truy c\u1EADp" });
  });
  app.use("/api", (req, res, next) => {
    if (req.path === "/auth/login") return next();
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized: Missing Token" });
    }
    const token = authHeader.split(" ")[1];
    if (!activeSessions.has(token)) {
      return res.status(401).json({ success: false, message: "Unauthorized: Invalid or expired token" });
    }
    next();
  });
  let calendarCache = null;
  const CACHE_TTL_MS = 2 * 60 * 60 * 1e3;
  let newsCache = null;
  const NEWS_CACHE_TTL_MS = 2 * 60 * 1e3;
  let marketauxCache = null;
  const MARKETAUX_CACHE_TTL_MS = 10 * 60 * 1e3;
  let tradingViewCache = null;
  const TRADINGVIEW_CACHE_TTL_MS = 60 * 1e3;
  const DEEPL_TRANSLATION_BATCH_LIMIT = Number(
    process.env.DEEPL_TRANSLATION_BATCH_LIMIT || 30
  );
  const NEWS_TABLE = "news_items";
  const DEFAULT_NEWS_LIMIT = 60;
  const DEFAULT_RESPONSE_NEWS_LIMIT = 10;
  const MAX_HISTORY_LIMIT = 100;
  const MIN_VISIBLE_NEWS_ITEMS = 5;
  let lastNewsDebug = {};
  async function readFreshNewsFromDb(now) {
    const supabase = getServerSupabaseClient();
    if (!supabase) return null;
    try {
      const minFetchedAt = new Date(now - NEWS_CACHE_TTL_MS).toISOString();
      const { data, error } = await supabase.from(NEWS_TABLE).select("data,fetched_at").gte("fetched_at", minFetchedAt).order("published_at", { ascending: false }).limit(DEFAULT_NEWS_LIMIT);
      if (error) throw error;
      if (!data || data.length === 0) return null;
      const rows = data.map((row) => row.data).filter(Boolean);
      if (rows.length === 0) return null;
      return {
        data: sortNewsForDisplay(rows),
        timestamp: new Date(data[0].fetched_at).getTime(),
        count: rows.length
      };
    } catch (error) {
      console.warn("Supabase news fresh read failed:", error.message);
      lastNewsDebug.dbReadError = error.message;
      return null;
    }
  }
  function parsePositiveInt(value, fallback, max) {
    const raw = Array.isArray(value) ? value[0] : value;
    const parsed = Number.parseInt(String(raw ?? ""), 10);
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    return Math.min(parsed, max);
  }
  function parseAssetQuery(value) {
    const raw = Array.isArray(value) ? value.join(",") : String(value || "");
    return Array.from(
      new Set(
        raw.split(",").map((asset) => String(asset).toUpperCase().replace(/[^A-Z0-9]/g, "")).filter(Boolean)
      )
    );
  }
  function getAllowedAssetUniverse(selectedAssets) {
    const selected = new Set(selectedAssets);
    const currencies = ["USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF", "CNH", "CNY"];
    const allowed = new Set(selected);
    selectedAssets.forEach((asset) => {
      if (/^[A-Z]{6}$/.test(asset) && currencies.includes(asset.slice(0, 3)) && currencies.includes(asset.slice(3, 6))) {
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
  function newsMatchesAssetUniverse(item, selectedAssets) {
    if (selectedAssets.length === 0) return true;
    const affectedAssets = normalizeAffectedAssets(item.affectedAssets || deriveAffectedAssets(item));
    if (affectedAssets.length === 0) return false;
    const allowed = getAllowedAssetUniverse(selectedAssets);
    return affectedAssets.every((asset) => allowed.has(asset));
  }
  function filterNewsByAssets(items, selectedAssets) {
    return selectedAssets.length === 0 ? items : items.filter((item) => newsMatchesAssetUniverse(item, selectedAssets));
  }
  async function readNewsHistoryFromDb(offset, limit, selectedAssets = []) {
    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return { data: [], count: 0, hasMore: false };
    }
    try {
      const from = 0;
      const to = selectedAssets.length > 0 ? Math.max(499, offset + limit * 4 - 1) : offset + limit - 1;
      const { data, error, count } = await supabase.from(NEWS_TABLE).select("data", { count: "exact" }).order("published_at", { ascending: false }).range(from, to);
      if (error) throw error;
      const rows = (data || []).map((row) => row.data).filter(Boolean);
      const filteredRows = filterNewsByAssets(sortNewsForDisplay(rows), selectedAssets);
      const pagedRows = selectedAssets.length > 0 ? filteredRows.slice(offset, offset + limit) : filteredRows;
      return {
        data: pagedRows,
        count: selectedAssets.length > 0 ? filteredRows.length : count || rows.length,
        hasMore: selectedAssets.length > 0 ? offset + pagedRows.length < filteredRows.length : typeof count === "number" ? offset + rows.length < count : rows.length === limit
      };
    } catch (error) {
      console.warn("Supabase news history read failed:", error.message);
      lastNewsDebug.dbReadError = error.message;
      return { data: [], count: 0, hasMore: false };
    }
  }
  async function fillNewsFromDb(items, minimum = MIN_VISIBLE_NEWS_ITEMS, selectedAssets = []) {
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
    return sortNewsForDisplay(filled).slice(0, Math.max(DEFAULT_NEWS_LIMIT, minimum));
  }
  async function readNewsByIdsFromDb(ids) {
    const supabase = getServerSupabaseClient();
    if (!supabase || ids.length === 0) return /* @__PURE__ */ new Map();
    try {
      const { data, error } = await supabase.from(NEWS_TABLE).select("id,data").in("id", ids);
      if (error) throw error;
      return new Map((data || []).map((row) => [row.id, row.data]));
    } catch (error) {
      console.warn("Supabase news id read failed:", error.message);
      lastNewsDebug.dbReadError = error.message;
      return /* @__PURE__ */ new Map();
    }
  }
  async function upsertNewsToDb(items, fetchedAt) {
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
        data: item
      }));
      const { error } = await supabase.from(NEWS_TABLE).upsert(rows, {
        onConflict: "id"
      });
      if (error) throw error;
      lastNewsDebug.dbWriteAttempted = true;
    } catch (error) {
      console.warn("Supabase news upsert failed:", error.message);
      lastNewsDebug.dbWriteAttempted = true;
      lastNewsDebug.dbWriteError = error.message;
    }
  }
  const newsFeeds = [
    {
      source: "FXStreet VN",
      category: "Forex",
      url: "https://www.fxstreet-vn.com/rss/news"
    },
    {
      source: "Investing Forex",
      category: "Forex",
      url: "https://www.investing.com/rss/news_1.rss"
    },
    {
      source: "Investing Economy",
      category: "Macro",
      url: "https://www.investing.com/rss/news_14.rss"
    },
    {
      source: "Investing Indicators",
      category: "Macro",
      url: "https://www.investing.com/rss/news_95.rss"
    },
    {
      source: "Investing Central Banks",
      category: "Central Bank",
      url: "https://www.investing.com/rss/central_banks.rss"
    },
    {
      source: "Federal Reserve",
      category: "Central Bank",
      url: "https://www.federalreserve.gov/feeds/press_monetary.xml"
    },
    {
      source: "Fed Speeches",
      category: "Central Bank",
      url: "https://www.federalreserve.gov/feeds/speeches.xml"
    },
    {
      source: "EIA Energy",
      category: "Energy",
      url: "https://www.eia.gov/rss/todayinenergy.xml"
    }
  ];
  function decodeXmlEntities(value) {
    return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code))).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
  function extractRssTag(block, tag) {
    const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
    return match ? decodeXmlEntities(match[1]) : "";
  }
  function scoreNewsText(title, summary = "") {
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
      "ceasefire"
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
      "boe"
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
      "rebounds"
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
      "slumps"
    ];
    const matches = (terms) => terms.filter((term) => text.includes(term));
    const highMatches = matches(highTerms);
    const mediumMatches = matches(mediumTerms);
    const bullishMatches = matches(bullishTerms);
    const bearishMatches = matches(bearishTerms);
    const impact = highMatches.length > 0 ? "High" : mediumMatches.length > 0 ? "Medium" : "Low";
    const sentimentScore = Math.max(
      -1,
      Math.min(1, (bullishMatches.length - bearishMatches.length) / 3)
    );
    const sentiment = sentimentScore > 0.15 ? "Bullish" : sentimentScore < -0.15 ? "Bearish" : "Neutral";
    const impactScore = impact === "High" ? 55 : impact === "Medium" ? 35 : 20;
    const score = Math.min(
      100,
      Math.round(impactScore + Math.abs(sentimentScore) * 25 + Math.min(20, (highMatches.length + mediumMatches.length) * 5))
    );
    return {
      impact,
      sentiment,
      sentimentScore: Number(sentimentScore.toFixed(3)),
      relevanceScore: score / 100,
      score,
      tags: [...highMatches, ...mediumMatches].slice(0, 5),
      scoredBy: "Local"
    };
  }
  function scoreFromMarketaux(sentimentScore, relevanceScore) {
    const normalizedSentiment = Number.isFinite(sentimentScore) ? sentimentScore : 0;
    const normalizedRelevance = Number.isFinite(relevanceScore) ? relevanceScore : 0.5;
    const sentiment = normalizedSentiment > 0.15 ? "Bullish" : normalizedSentiment < -0.15 ? "Bearish" : "Neutral";
    const score = Math.min(
      100,
      Math.round(normalizedRelevance * 65 + Math.abs(normalizedSentiment) * 35)
    );
    const impact = score >= 70 ? "High" : score >= 45 ? "Medium" : "Low";
    return {
      impact,
      sentiment,
      sentimentScore: Number(normalizedSentiment.toFixed(3)),
      relevanceScore: Number(normalizedRelevance.toFixed(3)),
      score,
      scoredBy: "Marketaux"
    };
  }
  function shortText(value, maxLength = 220) {
    const normalized = (value || "").replace(/\s+/g, " ").trim();
    if (normalized.length <= maxLength) return normalized;
    return `${normalized.slice(0, maxLength - 3).trim()}...`;
  }
  function getNewsSourceRank(item) {
    const source = String(item.source || "");
    if (/FXStreet|Investing|Federal Reserve|Fed Speeches|EIA/i.test(source)) return 0;
    if (source.startsWith("TradingView")) return 2;
    return 1;
  }
  function sortNewsForDisplay(items) {
    return [...items].sort((a, b) => {
      const rankDiff = getNewsSourceRank(a) - getNewsSourceRank(b);
      if (rankDiff !== 0) return rankDiff;
      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
    });
  }
  function deriveAffectedAssets(item) {
    const text = `${item.title || ""} ${item.summary || ""} ${(item.tags || []).join(" ")}`.toUpperCase();
    const compactText = text.replace(/[^A-Z0-9]/g, "");
    const assets = /* @__PURE__ */ new Set();
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
      "NAS100"
    ];
    candidates.forEach((asset) => {
      const mentioned = asset.length === 6 ? compactText.includes(asset) : new RegExp(`\\b${asset}\\b`).test(text);
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
  function normalizeAffectedAssets(value) {
    const values = Array.isArray(value) ? value : [];
    const normalized = values.map((asset) => String(asset).toUpperCase().replace(/[^A-Z0-9]/g, "")).map((asset) => {
      if (asset === "GOLD") return "XAU";
      if (asset === "SILVER") return "XAG";
      if (asset === "WTI" || asset === "BRENT" || asset === "CRUDE") return "OIL";
      if (asset === "SPX" || asset === "SP500" || asset === "SANDP500") return "US500";
      if (asset === "NASDAQ" || asset === "NDX") return "NAS100";
      return asset;
    }).filter(Boolean);
    return Array.from(new Set(normalized)).slice(0, 6);
  }
  function deriveTradingViewAssets(item) {
    const symbols = Array.isArray(item.relatedSymbols) ? item.relatedSymbols : [];
    const text = `${item.title || ""} ${symbols.map((symbol) => symbol?.symbol || "").join(" ")}`.toUpperCase();
    const assets = /* @__PURE__ */ new Set();
    const currencies = /* @__PURE__ */ new Set([
      "USD",
      "EUR",
      "GBP",
      "JPY",
      "AUD",
      "NZD",
      "CAD",
      "CHF",
      "CNH",
      "CNY"
    ]);
    symbols.forEach((symbol) => {
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
      if (/^[A-Z]{6}$/.test(ticker) && currencies.has(ticker.slice(0, 3)) && currencies.has(ticker.slice(3, 6))) {
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
  function deriveTradingViewCategory(item, affectedAssets) {
    const text = `${item.title || ""} ${affectedAssets.join(" ")}`.toUpperCase();
    if (affectedAssets.includes("OIL")) return "Energy";
    if (/\bFED\b|\bFOMC\b|\bECB\b|\bBOJ\b|\bBOE\b|\bCENTRAL BANK\b/.test(text)) {
      return "Central Bank";
    }
    if (affectedAssets.some((asset) => /^[A-Z]{6}$/.test(asset)) || affectedAssets.includes("USD") || affectedAssets.includes("DXY")) {
      return "Forex";
    }
    return "Macro";
  }
  function mapTradingViewNewsItem(item) {
    const title = String(item.title || "").trim();
    const affectedAssets = deriveTradingViewAssets(item);
    const category = deriveTradingViewCategory(item, affectedAssets);
    const providerName = item.provider?.name || item.provider?.id || "TradingView";
    const storyPath = String(item.storyPath || "");
    const link = item.link || (storyPath ? `https://www.tradingview.com${storyPath}` : "https://www.tradingview.com/news-flow/");
    const publishedAt = typeof item.published === "number" ? new Date(item.published * 1e3).toISOString() : (/* @__PURE__ */ new Date()).toISOString();
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
        ...Array.isArray(item.relatedSymbols) ? item.relatedSymbols.map((symbol) => String(symbol?.symbol || "").split(":").pop()).filter(Boolean) : []
      ].slice(0, 5),
      scoredBy: "Local"
    });
  }
  async function fetchTradingViewNewsFlow() {
    const now = Date.now();
    if (tradingViewCache && now - tradingViewCache.timestamp < TRADINGVIEW_CACHE_TTL_MS) {
      return tradingViewCache.data;
    }
    const url = new URL("https://news-mediator.tradingview.com/public/news-flow/v2/news");
    url.searchParams.set("client", "web");
    url.searchParams.set("streaming", "false");
    url.searchParams.append("filter", "lang:en");
    const response = await fetch(url, {
      signal: AbortSignal.timeout(6e3),
      headers: {
        "user-agent": "Mozilla/5.0 TradeNews TradingView News Flow Reader",
        origin: "https://www.tradingview.com",
        referer: "https://www.tradingview.com/news-flow/",
        accept: "application/json"
      }
    });
    if (!response.ok) {
      throw new Error(`TradingView News Flow: ${response.status} ${response.statusText}`);
    }
    const json = await response.json();
    const items = Array.isArray(json.items) ? json.items : [];
    const mapped = items.filter((item) => item?.title && (item?.storyPath || item?.link)).slice(0, 50).map(mapTradingViewNewsItem).filter(
      (item) => item.affectedAssets.length > 0 || item.impact !== "Low" || item.tags.some(
        (tag) => /FED|FOMC|ECB|BOJ|BOE|CPI|PCE|PMI|GDP|NFP|PAYROLL|DXY|GOLD|XAU|OIL/i.test(tag)
      )
    ).slice(0, 25);
    tradingViewCache = {
      data: mapped,
      timestamp: now
    };
    return mapped;
  }
  function deriveEffect(sentiment) {
    if (sentiment === "Bullish") return "T\u1ED1t";
    if (sentiment === "Bearish") return "X\u1EA5u";
    return "Trung l\u1EADp";
  }
  function withDisplayFields(item) {
    return {
      ...item,
      titleVi: item.titleVi || item.title || "Tin th\u1ECB tr\u01B0\u1EDDng",
      summaryVi: item.summaryVi || shortText(item.summary || item.title || "Ch\u01B0a c\xF3 t\xF3m t\u1EAFt ng\u1EAFn."),
      effect: item.effect || deriveEffect(item.sentiment),
      affectedAssets: normalizeAffectedAssets(item.affectedAssets || deriveAffectedAssets(item))
    };
  }
  function shortProviderError(message) {
    if (message.includes("429")) return "429 quota/rate limit";
    if (message.includes("403")) return "403 forbidden/quota";
    return message.replace(/\s+/g, " ").slice(0, 160);
  }
  function getDeepLApiKey() {
    return process.env.DEEPL_API_KEY || "";
  }
  function getDeepLApiUrl(apiKey) {
    if (process.env.DEEPL_API_URL) return process.env.DEEPL_API_URL.replace(/\/$/, "");
    return apiKey.endsWith(":fx") ? "https://api-free.deepl.com" : "https://api.deepl.com";
  }
  async function translateTextsWithDeepL(texts, apiKey) {
    const apiUrl = getDeepLApiUrl(apiKey);
    const response = await fetch(`${apiUrl}/v2/translate`, {
      method: "POST",
      signal: AbortSignal.timeout(2e4),
      headers: {
        authorization: `DeepL-Auth-Key ${apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        text: texts,
        target_lang: "VI",
        preserve_formatting: true
      })
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `${response.status} ${response.statusText}${errorText ? ` - ${errorText.slice(0, 180)}` : ""}`
      );
    }
    const json = await response.json();
    const translations = Array.isArray(json.translations) ? json.translations : [];
    if (translations.length !== texts.length) {
      throw new Error(`DeepL returned ${translations.length}/${texts.length} translations`);
    }
    return translations.map((translation) => String(translation.text || "").trim());
  }
  async function enrichNewsForVietnameseDisplay(items) {
    const baseItems = items.map(withDisplayFields);
    const apiKey = getDeepLApiKey();
    lastNewsDebug.hasDeepLKey = Boolean(apiKey);
    lastNewsDebug.translationProvider = "DeepL";
    if (!apiKey) {
      lastNewsDebug.translationAttempted = false;
      lastNewsDebug.translationError = "Missing DEEPL_API_KEY env";
      return baseItems;
    }
    const targets = baseItems.filter((item) => !item.translatedAt).slice(0, DEEPL_TRANSLATION_BATCH_LIMIT);
    lastNewsDebug.translationAttempted = targets.length > 0;
    lastNewsDebug.translationTargetCount = targets.length;
    lastNewsDebug.translationBatchLimit = DEEPL_TRANSLATION_BATCH_LIMIT;
    if (targets.length === 0) return baseItems;
    const texts = targets.flatMap((item) => [
      item.title || "",
      shortText(item.summary || item.title || "", 500)
    ]);
    try {
      const translatedTexts = await translateTextsWithDeepL(texts, apiKey);
      const translatedAt = (/* @__PURE__ */ new Date()).toISOString();
      const translatedById = /* @__PURE__ */ new Map();
      targets.forEach((item, index) => {
        translatedById.set(item.id, {
          titleVi: translatedTexts[index * 2] || item.titleVi,
          summaryVi: shortText(translatedTexts[index * 2 + 1] || item.summaryVi, 260)
        });
      });
      lastNewsDebug.translationError = void 0;
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
          affectedAssets: normalizeAffectedAssets(item.affectedAssets || deriveAffectedAssets(item))
        };
      });
    } catch (error) {
      console.warn("DeepL news translation failed:", error.message);
      lastNewsDebug.translationError = shortProviderError(error.message);
      lastNewsDebug.translationResult = "failed";
      return baseItems;
    }
  }
  function parseRssItems(xml, feed) {
    const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
    return blocks.map((block, index) => {
      const title = extractRssTag(block, "title");
      const linkFromTag = extractRssTag(block, "link");
      const linkFromAttr = block.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1] || "";
      const link = linkFromTag || linkFromAttr || feed.url;
      const published = extractRssTag(block, "pubDate") || extractRssTag(block, "published") || extractRssTag(block, "updated") || (/* @__PURE__ */ new Date()).toISOString();
      const summary = extractRssTag(block, "description") || extractRssTag(block, "summary") || extractRssTag(block, "content:encoded");
      const publishedAt = Number.isFinite(new Date(published).getTime()) ? new Date(published).toISOString() : (/* @__PURE__ */ new Date()).toISOString();
      const localScore = scoreNewsText(title, summary);
      return withDisplayFields({
        id: `${feed.source}-${link || title || index}`,
        title: title || "Market news update",
        source: feed.source,
        category: feed.category,
        link,
        summary,
        publishedAt,
        ...localScore
      });
    });
  }
  async function fetchNewsFeed(feed) {
    const response = await fetch(feed.url, {
      signal: AbortSignal.timeout(3500),
      headers: {
        "user-agent": "Mozilla/5.0 TradeNews RSS Reader",
        accept: "application/rss+xml, application/xml, text/xml"
      }
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
      signal: AbortSignal.timeout(5e3),
      headers: {
        "user-agent": "Mozilla/5.0 TradeNews Marketaux Reader",
        accept: "application/json"
      }
    });
    if (!response.ok) {
      throw new Error(`Marketaux: ${response.status} ${response.statusText}`);
    }
    const json = await response.json();
    const data = Array.isArray(json.data) ? json.data : [];
    const mapped = data.map((item) => {
      const entities = Array.isArray(item.entities) ? item.entities : [];
      const bestEntity = entities.filter((entity) => typeof entity.sentiment_score === "number").sort((a, b) => (b.match_score || 0) - (a.match_score || 0))[0];
      const sentimentScore = typeof item.sentiment_score === "number" ? item.sentiment_score : bestEntity?.sentiment_score || 0;
      const relevanceScore = bestEntity?.match_score ? Math.min(1, bestEntity.match_score / 100) : 0.65;
      const scored = scoreFromMarketaux(sentimentScore, relevanceScore);
      const tags = entities.map((entity) => entity.symbol || entity.name).filter(Boolean).slice(0, 5);
      return withDisplayFields({
        id: `Marketaux-${item.uuid || item.url || item.title}`,
        title: item.title || "Marketaux market update",
        source: item.source || "Marketaux",
        category: "Macro",
        link: item.url || item.source_url || "https://www.marketaux.com/",
        summary: item.description || item.snippet || "",
        publishedAt: item.published_at ? new Date(item.published_at).toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
        ...scored,
        tags
      });
    });
    marketauxCache = {
      data: mapped,
      timestamp: now
    };
    return mapped;
  }
  function parseXmlDateAndTimeToISO(dateVal, timeVal) {
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
  async function fetchAndParseXmlBackup() {
    const xmlUrl = "https://nfs.faireconomy.media/ff_calendar_thisweek.xml?version=fb259b5c017e4253e166ae2914b82f7a";
    const xmlResponse = await fetch(xmlUrl, { signal: AbortSignal.timeout(5e3) });
    if (!xmlResponse.ok) {
      throw new Error(`Failed to fetch XML: ${xmlResponse.status} ${xmlResponse.statusText}`);
    }
    const xmlText = await xmlResponse.text();
    const eventRegex = /<event>([\s\S]*?)<\/event>/g;
    const events = [];
    let match;
    const extractTag = (eventBlock, tag) => {
      const r = new RegExp(`<${tag}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i");
      let m = eventBlock.match(r);
      if (!m) {
        const r2 = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i");
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
  app.get("/api/calendar", async (req, res) => {
    const now = Date.now();
    if (calendarCache && now - calendarCache.timestamp < CACHE_TTL_MS) {
      return res.json({
        success: true,
        source: "live_forex_factory_feed_cached",
        data: calendarCache.data
      });
    }
    try {
      const url = "https://nfs.faireconomy.media/ff_calendar_thisweek.json?version=c1ac8d47f5073ddfeeddc12d201c449f";
      const response = await fetch(url, { signal: AbortSignal.timeout(5e3) });
      if (!response.ok) {
        throw new Error(`Failed to fetch JSON: ${response.status} ${response.statusText}`);
      }
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(`Invalid response format from remote API: ${contentType}`);
      }
      const externalData = await response.json();
      const formattedWeekly = externalData.map((item) => {
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
      }).filter((item) => item.country === "USD");
      formattedWeekly.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      calendarCache = {
        data: formattedWeekly,
        timestamp: now
      };
      return res.json({
        success: true,
        source: "live_forex_factory_feed",
        data: formattedWeekly
      });
    } catch (jsonError) {
      console.warn("JSON feed extraction failed, attempting XML feed fallback:", jsonError.message);
      try {
        const parsedXmlData = await fetchAndParseXmlBackup();
        parsedXmlData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        calendarCache = {
          data: parsedXmlData,
          timestamp: now
        };
        return res.json({
          success: true,
          source: "live_forex_factory_xml_feed",
          data: parsedXmlData
        });
      } catch (xmlError) {
        console.error("Both JSON and XML feeds failed:", xmlError.message);
        if (calendarCache) {
          console.warn("Serving expired calendar cache due to remote errors:", xmlError.message);
          return res.json({
            success: true,
            source: "live_forex_factory_feed_cached_expired",
            warning: xmlError.message,
            data: calendarCache.data
          });
        }
        return res.status(502).json({
          success: false,
          error: "Failed to fetch calendar data from all sources",
          details: `JSON: ${jsonError.message}. XML: ${xmlError.message}`
        });
      }
    }
  });
  app.get("/api/news", async (req, res) => {
    const now = Date.now();
    lastNewsDebug = {
      hasDeepLKey: Boolean(getDeepLApiKey()),
      translationProvider: "DeepL",
      dbFreshHit: false,
      dbWriteAttempted: false
    };
    const offset = parsePositiveInt(req.query?.offset, 0, 1e4);
    const limit = parsePositiveInt(req.query?.limit, DEFAULT_RESPONSE_NEWS_LIMIT, MAX_HISTORY_LIMIT);
    const selectedAssets = parseAssetQuery(req.query?.assets);
    const historyOnly = req.query?.history === "1" || offset > 0;
    if (historyOnly) {
      const history = await readNewsHistoryFromDb(offset, limit, selectedAssets);
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
          dbReadCount: history.data.length
        }
      });
    }
    const freshDbCache = await readFreshNewsFromDb(now);
    if (freshDbCache && freshDbCache.data.length > 0) {
      const data = await fillNewsFromDb(
        filterNewsByAssets(freshDbCache.data, selectedAssets),
        MIN_VISIBLE_NEWS_ITEMS,
        selectedAssets
      );
      return res.json({
        success: true,
        source: "supabase_cached",
        fetchedAt: new Date(freshDbCache.timestamp).toISOString(),
        nextRefreshSeconds: Math.ceil(
          (NEWS_CACHE_TTL_MS - (now - freshDbCache.timestamp)) / 1e3
        ),
        hasMore: data.length > limit,
        data: sortNewsForDisplay(data).slice(0, limit),
        debug: {
          ...lastNewsDebug,
          source: "supabase_cached",
          dbFreshHit: true,
          dbReadCount: data.length,
          translatedCount: data.filter((item) => item.translatedAt).length,
          untranslatedCount: data.filter((item) => !item.translatedAt).length
        }
      });
    }
    if (newsCache && now - newsCache.timestamp < NEWS_CACHE_TTL_MS) {
      const data = await fillNewsFromDb(
        filterNewsByAssets(newsCache.data, selectedAssets),
        MIN_VISIBLE_NEWS_ITEMS,
        selectedAssets
      );
      return res.json({
        success: true,
        source: "rss_cached",
        fetchedAt: new Date(newsCache.timestamp).toISOString(),
        nextRefreshSeconds: Math.ceil(
          (NEWS_CACHE_TTL_MS - (now - newsCache.timestamp)) / 1e3
        ),
        hasMore: data.length > limit,
        data: sortNewsForDisplay(data).slice(0, limit),
        debug: {
          ...lastNewsDebug,
          source: "rss_cached",
          translatedCount: data.filter((item) => item.translatedAt).length,
          untranslatedCount: data.filter((item) => !item.translatedAt).length
        }
      });
    }
    const results = await Promise.allSettled([
      fetchTradingViewNewsFlow(),
      ...newsFeeds.map(fetchNewsFeed),
      fetchMarketauxNews()
    ]);
    const items = results.flatMap((result) => result.status === "fulfilled" ? result.value : []).filter((item) => item.title && item.link);
    const seen = /* @__PURE__ */ new Set();
    const deduped = items.filter((item) => {
      const key = `${item.title.toLowerCase()}|${item.link}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    ).slice(0, 60);
    const cachedById = await readNewsByIdsFromDb(deduped.map((item) => item.id));
    const mergedItems = deduped.map((item) => {
      const cached = cachedById.get(item.id);
      return cached?.translatedAt && cached.translationProvider === "DeepL" ? { ...item, ...cached } : item;
    });
    const displayItems = sortNewsForDisplay(await enrichNewsForVietnameseDisplay(mergedItems));
    const fetchedAt = new Date(now).toISOString();
    if (displayItems.length > 0) {
      newsCache = {
        data: displayItems,
        timestamp: now
      };
      await upsertNewsToDb(displayItems, fetchedAt);
    }
    const responseItems = await fillNewsFromDb(
      filterNewsByAssets(displayItems.length > 0 ? displayItems : newsCache?.data || [], selectedAssets),
      MIN_VISIBLE_NEWS_ITEMS,
      selectedAssets
    );
    return res.json({
      success: true,
      source: "rss_live",
      fetchedAt,
      failedSources: results.map(
        (result, index) => result.status === "rejected" ? index === 0 ? "TradingView News Flow" : index - 1 < newsFeeds.length ? newsFeeds[index - 1].source : "Marketaux" : null
      ).filter(Boolean),
      nextRefreshSeconds: NEWS_CACHE_TTL_MS / 1e3,
      hasMore: responseItems.length > limit,
      data: sortNewsForDisplay(responseItems).slice(0, limit),
      debug: {
        ...lastNewsDebug,
        source: "rss_live",
        failedSources: results.map(
          (result, index) => result.status === "rejected" ? index === 0 ? "TradingView News Flow" : index - 1 < newsFeeds.length ? newsFeeds[index - 1].source : "Marketaux" : null
        ).filter(Boolean),
        translatedCount: displayItems.filter((item) => item.translatedAt).length,
        untranslatedCount: displayItems.filter((item) => !item.translatedAt).length
      }
    });
  });
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.resolve(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    const SPA_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no" />
    <title>Trade Journal & Economic Calendar</title>
    <link rel="manifest" href="/manifest.json" />
    <link rel="icon" type="image/svg+xml" href="/icon.svg" />
    <link rel="apple-touch-icon" href="/icon.svg" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="QuantumTrade" />
    <meta name="theme-color" content="#1a73e8" />
    <script type="module" crossorigin src="/assets/index-k9cknLci.js"></script>
    <link rel="modulepreload" crossorigin href="/assets/icons-BNG3S5bi.js">
    <link rel="modulepreload" crossorigin href="/assets/react-DJr-hLVh.js">
    <link rel="modulepreload" crossorigin href="/assets/supabase-BYBfiHzV.js">
    <link rel="modulepreload" crossorigin href="/assets/motion-g0aTdGad.js">
    <link rel="stylesheet" crossorigin href="/assets/index-BOtLDKGs.css">
  </head>
  <body>
    <div id="root"></div>
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
          navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('SW registered:', reg.scope))
            .catch(err => console.error('SW registration failed:', err));
        });
      }
    </script>
  </body>
</html>`;
    app.post("/api/the5ers/sync", async (req, res) => {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ success: false, message: "Missing email or password" });
      }
      const supabase = getServerSupabaseClient();
      const descopeProjectId = "P37sOCdLJjVCAuLgqv2zMvS61Xbo";
      const baseUrl = "https://api.the5ers.com";
      async function getDescopeSession(loginId, pass) {
        if (supabase) {
          const storedRefresh = await supabase.from("t5_config").select("value").eq("key", "THE5ERS_REFRESH_TOKEN").single();
          if (storedRefresh.data?.value) {
            const refreshRes = await fetch("https://api.descope.com/v1/auth/refresh", {
              method: "POST",
              headers: { "Authorization": `Bearer ${descopeProjectId}:${storedRefresh.data.value}`, "Content-Type": "application/json" },
              body: JSON.stringify({})
            });
            if (refreshRes.ok) {
              const d = await refreshRes.json();
              if (d.sessionJwt) {
                let newRefresh = d.refreshJwt;
                if (!newRefresh) {
                  const setCookie = refreshRes.headers.get("set-cookie") || "";
                  const m = setCookie.match(/DSR=([^;]+)/);
                  if (m) newRefresh = m[1];
                }
                if (newRefresh && newRefresh !== storedRefresh.data.value) {
                  await supabase.from("t5_config").upsert({ key: "THE5ERS_REFRESH_TOKEN", value: newRefresh, updated_at: (/* @__PURE__ */ new Date()).toISOString() });
                }
                return d.sessionJwt;
              }
            } else {
              const errBody = await refreshRes.text().catch(() => "");
              console.error("[Descope Refresh Error]", refreshRes.status, errBody);
              throw new Error(`DSR Token h\u1EBFt h\u1EA1n ho\u1EB7c kh\xF4ng h\u1EE3p l\u1EC7 (M\xE3: ${refreshRes.status}). Chi ti\u1EBFt: ${errBody.slice(0, 150)}`);
            }
          } else {
            throw new Error("Kh\xF4ng t\xECm th\u1EA5y DSR Token trong h\u1EC7 th\u1ED1ng. B\u1ED1 c\u1EA7n l\u01B0u DSR Token tr\u01B0\u1EDBc.");
          }
        }
        throw new Error("Supabase is not configured.");
      }
      async function t5Fetch(path2, token) {
        const r = await fetch(`${baseUrl}${path2}`, {
          headers: {
            authorization: `Bearer ${token}`,
            accept: "application/json, text/plain, */*",
            "user-agent": "Mozilla/5.0 TradeNews Sync",
            "x-brand": "5ers",
            "x-idp-provider": "descope",
            origin: "https://hub.the5ers.com",
            referer: "https://hub.the5ers.com/"
          }
        });
        if (!r.ok) throw new Error(`T5 ${path2}: ${r.status} ${r.statusText}`);
        return r.json();
      }
      try {
        const sessionToken = await getDescopeSession(email, password);
        const user = await t5Fetch("/user", sessionToken);
        const accounts = user.tsUsers || user.accounts || user.data?.tsUsers || [];
        if (!accounts || accounts.length === 0) {
          throw new Error("Kh\xF4ng t\xECm th\u1EA5y t\xE0i kho\u1EA3n (Debug API): " + JSON.stringify(user).slice(0, 300));
        }
        const userInfo = { userName: `${user.firstName || ""} ${user.lastName || ""}`.trim(), scrapedAt: (/* @__PURE__ */ new Date()).toISOString() };
        const accountResults = [];
        let syncedAccounts = 0;
        let syncedTrades = 0;
        let existingAccounts = [];
        if (supabase) {
          const { data } = await supabase.from("t5_accounts").select("account_id, status");
          if (data) existingAccounts = data;
        }
        for (const acc of accounts) {
          const accId = acc.externalId;
          const existingAcc = existingAccounts.find((a) => a.account_id === String(accId));
          if (existingAcc && existingAcc.status === "disabled") {
            continue;
          }
          let balanceData = { balance: 0, equity: 0 };
          let statsData = { totalNetProfit: 0 };
          let tsData = {};
          let positions = [];
          try {
            tsData = await t5Fetch(`/account/ts/${accId}`, sessionToken);
          } catch (e) {
          }
          try {
            balanceData = await t5Fetch(`/account/${accId}/balance`, sessionToken);
          } catch (e) {
          }
          try {
            statsData = await t5Fetch(`/account/${accId}/stats`, sessionToken);
          } catch (e) {
          }
          try {
            const d = await t5Fetch(`/position/all/${accId}?page=1&limit=50`, sessionToken);
            positions = Array.isArray(d) ? d : d.results || d.data || d.positions || [];
          } catch (e) {
          }
          const finalType = tsData.type || acc.accountType || "unknown";
          const finalStatus = tsData.status || "unknown";
          const overview = {
            accountId: accId,
            name: `${finalType.toUpperCase()} ${accId}`,
            balance: balanceData.balance || 0,
            equity: balanceData.equity || 0,
            pnl: statsData.totalNetProfit || 0,
            status: finalStatus,
            type: finalType
          };
          const stats = { ...statsData, balanceDetails: balanceData, accountState: tsData };
          await new Promise((r) => setTimeout(r, 200));
          if (supabase) {
            const { error: accErr } = await supabase.from("t5_accounts").upsert({
              account_id: accId,
              name: overview.name,
              type: overview.type,
              balance: overview.balance,
              equity: overview.equity,
              pnl: overview.pnl,
              status: overview.status,
              stats,
              updated_at: (/* @__PURE__ */ new Date()).toISOString()
            }, { onConflict: "account_id" });
            if (accErr) console.error("[sync] upsert account error:", accErr.message);
            else syncedAccounts++;
            if (positions.length > 0) {
              const tradeRows = positions.map((t) => ({
                trade_id: String(t.id || t._id),
                account_id: accId,
                symbol: t.symbol || "Unknown",
                side: t.side || "Unknown",
                quantity: parseFloat(t.quantity) || 0,
                entry_price: parseFloat(t.entry) || 0,
                exit_price: t.exit ? parseFloat(t.exit) : null,
                pips: t.pips ? parseFloat(t.pips) : null,
                profit: parseFloat(t.profitAndLoss) || 0,
                open_date: t.openDate || (/* @__PURE__ */ new Date()).toISOString(),
                close_date: t.closeDate || null
              }));
              const { error: trErr } = await supabase.from("t5_trades").upsert(tradeRows, { onConflict: "trade_id" });
              if (trErr) console.error("[sync] upsert trades error:", trErr.message);
              else syncedTrades += tradeRows.length;
            }
          }
          accountResults.push({ overview, stats, accountId: accId, positions });
        }
        try {
          let allPurchases = [];
          for (let page = 1; page <= 5; page++) {
            const purchaseData = await t5Fetch(`/purchase?page=${page}&limit=50`, sessionToken);
            const results = purchaseData?.results || [];
            allPurchases.push(...results);
            if (results.length < 50) break;
          }
          if (allPurchases.length > 0) {
            const purchaseRows = allPurchases.map((p) => ({
              purchase_id: p.purchaseId,
              product_name: p.items?.[0]?.metadata?.productName || "N/A",
              buying_power: p.items?.[0]?.metadata?.buyingPower || 0,
              price: p.paymentData?.convertedPrice || 0,
              currency: p.paymentData?.currency || "USD",
              status: p.status || "unknown",
              created_at: p.createdAt || (/* @__PURE__ */ new Date()).toISOString()
            }));
            await supabase.from("t5_purchases").upsert(purchaseRows, { onConflict: "purchase_id" });
          }
        } catch (e) {
          console.error("[sync] purchases error:", e.message);
        }
        res.json({
          success: true,
          message: `Synced ${syncedAccounts} accounts, ${syncedTrades} trades`,
          data: { user: userInfo, accounts: accountResults.map((r) => r.overview) }
        });
      } catch (err) {
        console.error("[sync] error:", err.message);
        res.status(500).json({ success: false, message: err.message });
      }
    });
    app.post("/api/save-site-password", async (req, res) => {
      const { sitePassword } = req.body || {};
      if (typeof sitePassword !== "string") {
        return res.status(400).json({ success: false, message: "Missing sitePassword" });
      }
      const supabase = getServerSupabaseClient();
      if (!supabase) {
        return res.status(500).json({ success: false, message: "Supabase not configured" });
      }
      try {
        await supabase.from("t5_config").upsert({ key: "SITE_PASSWORD", value: sitePassword, updated_at: (/* @__PURE__ */ new Date()).toISOString() });
        process.env.SITE_PASSWORD = sitePassword;
        res.json({ success: true, message: "\u0110\xE3 l\u01B0u m\u1EADt kh\u1EA9u b\u1EA3o v\u1EC7 Web App!" });
      } catch (e) {
        res.status(500).json({ success: false, message: e.message });
      }
    });
    app.get("*", (req, res) => {
      res.type("html").send(SPA_HTML);
    });
  }
  app.post("/api/save-t5-creds", async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Missing email or DSR token" });
    }
    const supabase = getServerSupabaseClient();
    if (!supabase) {
      return res.status(500).json({ success: false, message: "Supabase not configured" });
    }
    try {
      await supabase.from("t5_config").upsert({ key: "THE5ERS_EMAIL", value: email, updated_at: (/* @__PURE__ */ new Date()).toISOString() });
      await supabase.from("t5_config").upsert({ key: "THE5ERS_REFRESH_TOKEN", value: password, updated_at: (/* @__PURE__ */ new Date()).toISOString() });
      res.json({ success: true, message: "\u2705 Saved! T5 will now use DSR Token." });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  });
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
