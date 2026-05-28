const NEWS_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
const MARKETAUX_CACHE_TTL_MS = 10 * 60 * 1000; // protect free API quota

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

    return {
      id: `${feed.source}-${link || title || index}`,
      title: title || "Market news update",
      source: feed.source,
      category: feed.category,
      link,
      summary,
      publishedAt,
      ...localScore,
    };
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

    return {
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
    };
  });

  marketauxCache = {
    data: mapped,
    timestamp: now,
  };

  return mapped;
}

export default async function handler(req: any, res: any) {
  const now = Date.now();

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

  if (newsCache && now - newsCache.timestamp < NEWS_CACHE_TTL_MS) {
    return res.status(200).json({
      success: true,
      source: "rss_cached",
      fetchedAt: new Date(newsCache.timestamp).toISOString(),
      nextRefreshSeconds: Math.ceil(
        (NEWS_CACHE_TTL_MS - (now - newsCache.timestamp)) / 1000,
      ),
      data: newsCache.data,
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

  if (deduped.length > 0) {
    newsCache = {
      data: deduped,
      timestamp: now,
    };
  }

  return res.status(200).json({
    success: true,
    source: "rss_live",
    fetchedAt: new Date(now).toISOString(),
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
    data: deduped.length > 0 ? deduped : newsCache?.data || [],
  });
}
