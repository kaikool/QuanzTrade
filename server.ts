import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares to parse bodies
  app.use(express.json());


  // In-memory cache for calendar data
  let calendarCache: { data: any[]; timestamp: number } | null = null;
  const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hour TTL

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
