import { createClient } from "@supabase/supabase-js";

const NEWS_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
const MARKETAUX_CACHE_TTL_MS = 10 * 60 * 1000; // protect free API quota
const GEMINI_TRANSLATION_BATCH_LIMIT = Number(
  process.env.GEMINI_TRANSLATION_BATCH_LIMIT || 20,
);
const GEMINI_QUOTA_COOLDOWN_MS = Number(
  process.env.GEMINI_QUOTA_COOLDOWN_MS || 30 * 60 * 1000,
);
const NEWS_TABLE = "news_items";

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
let lastNewsDebug: any = {};
let geminiQuotaCooldownUntil = 0;

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
      .not("translated_at", "is", null)
      .order("published_at", { ascending: false })
      .limit(60);

    if (error) throw error;
    if (!data || data.length === 0) return null;

    return {
      data: data.map((row: any) => row.data).filter(Boolean),
      timestamp: new Date(data[0].fetched_at).getTime(),
      count: data.length,
    };
  } catch (error: any) {
    console.warn("Supabase news fresh read failed:", error.message);
    lastNewsDebug.dbReadError = error.message;
    return null;
  }
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

function deriveAffectedAssets(item: any) {
  const text = `${item.title || ""} ${item.summary || ""} ${(item.tags || []).join(" ")}`.toUpperCase();
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
    if (!text.includes(asset)) return;
    if (asset === "GOLD") assets.add("XAU");
    else if (asset === "SILVER") assets.add("XAG");
    else if (asset === "WTI" || asset === "BRENT") assets.add("OIL");
    else if (asset === "SPX") assets.add("US500");
    else if (asset === "NASDAQ") assets.add("NAS100");
    else assets.add(asset);
  });

  if (item.category === "Forex") assets.add("USD");
  if (item.category === "Energy") assets.add("OIL");
  if (item.category === "Central Bank") assets.add("USD");
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

function extractJsonArray(raw: string) {
  const cleaned = raw.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Gemini response did not contain a JSON array");
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

function getGeminiApiKeys() {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GOOGLE_API_KEY,
    process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  ].filter((key, index, all): key is string => {
    return Boolean(key) && all.indexOf(key) === index;
  });
}

function shortProviderError(message: string) {
  if (message.includes("429")) return "429 quota/rate limit";
  if (message.includes("403")) return "403 forbidden/quota";
  return message.replace(/\s+/g, " ").slice(0, 160);
}

async function enrichNewsForVietnameseDisplay(items: any[]) {
  const baseItems = items.map(withDisplayFields);
  const apiKeys = getGeminiApiKeys();
  lastNewsDebug.hasGeminiKey = apiKeys.length > 0;
  lastNewsDebug.geminiKeyCount = apiKeys.length;
  lastNewsDebug.aiProvider = "Gemini";
  if (apiKeys.length === 0) {
    lastNewsDebug.geminiAttempted = false;
    lastNewsDebug.geminiError = "Missing GEMINI_API_KEY/GOOGLE_API_KEY env";
    return baseItems;
  }

  if (Date.now() < geminiQuotaCooldownUntil) {
    lastNewsDebug.geminiAttempted = false;
    lastNewsDebug.geminiError = `Gemini quota cooldown until ${new Date(geminiQuotaCooldownUntil).toISOString()}`;
    return baseItems;
  }

  const targets = baseItems
    .filter((item) => !item.translatedAt)
    .slice(0, GEMINI_TRANSLATION_BATCH_LIMIT);
  lastNewsDebug.geminiAttempted = targets.length > 0;
  lastNewsDebug.geminiTargetCount = targets.length;
  lastNewsDebug.geminiBatchLimit = GEMINI_TRANSLATION_BATCH_LIMIT;
  if (targets.length === 0) return baseItems;

  const prompt = `
You translate and summarize financial market news for Vietnamese forex traders.
Return ONLY a valid JSON array. Keep each summary very short: maximum 2 Vietnamese sentences.

For each input item, return:
{
  "id": "same id",
  "titleVi": "Vietnamese headline",
  "effect": "Tốt|Xấu|Trung lập",
  "affectedAssets": ["USD", "XAU", "..."],
  "summaryVi": "Very short Vietnamese summary, 1-2 sentences"
}

Input:
${JSON.stringify(
  targets.map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary,
    category: item.category,
    impact: item.impact,
    sentiment: item.sentiment,
    tags: item.tags,
  })),
)}
`.trim();

  const keyAttempts: string[] = [];

  for (let keyIndex = 0; keyIndex < apiKeys.length; keyIndex += 1) {
    const apiKey = apiKeys[keyIndex];
    try {
      const geminiModel = process.env.GEMINI_MODEL || "gemini-flash-latest";
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent`,
        {
          method: "POST",
          signal: AbortSignal.timeout(30000),
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": apiKey,
          },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      },
    );

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        const message = `key${keyIndex + 1}: ${response.status} ${response.statusText}${errorText ? ` - ${errorText.slice(0, 180)}` : ""}`;
        keyAttempts.push(message);
        if (response.status === 429 || response.status === 403) {
          continue;
        }
        throw new Error(message);
      }

    const json: any = await response.json();
    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const enriched = extractJsonArray(raw);
    const enrichedById = new Map(enriched.map((item: any) => [item.id, item]));

      lastNewsDebug.geminiKeyAttempts = [...keyAttempts, `key${keyIndex + 1}: ok`];
      lastNewsDebug.geminiError = undefined;

      return baseItems.map((item) => {
        const match: any = enrichedById.get(item.id);
        if (!match) return item;

      return {
        ...item,
        titleVi: match.titleVi || item.titleVi,
        summaryVi: shortText(match.summaryVi || item.summaryVi, 260),
        translatedAt: new Date().toISOString(),
        effect: ["Tốt", "Xấu", "Trung lập"].includes(match.effect)
          ? match.effect
          : item.effect,
        affectedAssets: normalizeAffectedAssets(match.affectedAssets || item.affectedAssets),
      };
      });
    } catch (error: any) {
      keyAttempts.push(`key${keyIndex + 1}: ${shortProviderError(error.message)}`);
      if (keyIndex < apiKeys.length - 1) continue;
      console.warn("AI news display enrichment failed:", error.message);
      lastNewsDebug.geminiError = error.message;
      lastNewsDebug.geminiKeyAttempts = keyAttempts;
      return baseItems;
    }
  }

  const allQuotaErrors =
    keyAttempts.length >= apiKeys.length &&
    keyAttempts.every((attempt) => attempt.includes("429") || attempt.includes("403"));
  if (allQuotaErrors) {
    geminiQuotaCooldownUntil = Date.now() + GEMINI_QUOTA_COOLDOWN_MS;
  }
  lastNewsDebug.geminiError = allQuotaErrors
    ? `All Gemini keys are quota-limited. Cooling down for ${Math.round(GEMINI_QUOTA_COOLDOWN_MS / 60000)} minutes.`
    : keyAttempts.map(shortProviderError).join(" | ");
  lastNewsDebug.geminiKeyAttempts = keyAttempts.map(shortProviderError);
  return baseItems;
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
    hasGeminiKey: getGeminiApiKeys().length > 0,
    geminiKeyCount: getGeminiApiKeys().length,
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

  const freshDbCache = await readFreshNewsFromDb(now);
  if (freshDbCache && freshDbCache.data.length > 0) {
    return res.status(200).json({
      success: true,
      source: "supabase_cached",
      fetchedAt: new Date(freshDbCache.timestamp).toISOString(),
      nextRefreshSeconds: Math.ceil(
        (NEWS_CACHE_TTL_MS - (now - freshDbCache.timestamp)) / 1000,
      ),
      data: freshDbCache.data,
      debug: {
        ...lastNewsDebug,
        source: "supabase_cached",
        dbFreshHit: true,
        dbReadCount: freshDbCache.count,
        translatedCount: freshDbCache.data.filter((item: any) => item.translatedAt).length,
        untranslatedCount: freshDbCache.data.filter((item: any) => !item.translatedAt).length,
      },
    });
  }

  if (newsCache && now - newsCache.timestamp < NEWS_CACHE_TTL_MS) {
    return res.status(200).json({
      success: true,
      source: "rss_cached",
      fetchedAt: new Date(newsCache.timestamp).toISOString(),
      nextRefreshSeconds: Math.ceil(
        (NEWS_CACHE_TTL_MS - (now - newsCache.timestamp)) / 1000,
      ),
      data: newsCache.data,
      debug: {
        ...lastNewsDebug,
        source: "rss_cached",
        translatedCount: newsCache.data.filter((item: any) => item.translatedAt).length,
        untranslatedCount: newsCache.data.filter((item: any) => !item.translatedAt).length,
      },
    });
  }

  const results = await Promise.allSettled([
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
    return cached?.translatedAt ? { ...item, ...cached } : item;
  });
  const displayItems = await enrichNewsForVietnameseDisplay(mergedItems);
  const fetchedAt = new Date(now).toISOString();

  if (displayItems.length > 0) {
    newsCache = {
      data: displayItems,
      timestamp: now,
    };
    await upsertNewsToDb(displayItems, fetchedAt);
  }

  return res.status(200).json({
    success: true,
    source: "rss_live",
    fetchedAt,
    failedSources: results
      .map((result, index) =>
        result.status === "rejected"
          ? index < newsFeeds.length
            ? newsFeeds[index].source
            : "Marketaux"
          : null,
      )
      .filter(Boolean),
    nextRefreshSeconds: NEWS_CACHE_TTL_MS / 1000,
    data: displayItems.length > 0 ? displayItems : newsCache?.data || [],
    debug: {
      ...lastNewsDebug,
      source: "rss_live",
      failedSources: results
        .map((result, index) =>
          result.status === "rejected"
            ? index < newsFeeds.length
              ? newsFeeds[index].source
              : "Marketaux"
            : null,
        )
        .filter(Boolean),
      translatedCount: displayItems.filter((item: any) => item.translatedAt).length,
      untranslatedCount: displayItems.filter((item: any) => !item.translatedAt).length,
    },
  });
}
