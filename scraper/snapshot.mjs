import puppeteer from 'puppeteer-core';
import { supabase, getConfig } from './supabase.mjs';

export async function captureAndSaveSnapshot(tradeId, symbol, pair, type, entryPrice, size, openTime) {
    if (!supabase) return;

    try {
        console.log(`[Snapshot] Kiem tra xem trade ${tradeId} da co snapshot chua...`);
        // Check if trade already exists in manual trades table
        const { data: existing } = await supabase.from('trades').select('id, tv_snapshot_url').eq('id', `t5-${tradeId}`).single();
        if (existing && existing.tv_snapshot_url) {
            console.log(`[Snapshot] Trade ${tradeId} da co snapshot roi, bo qua.`);
            return;
        }

        console.log(`[Snapshot] Chuan bi chup anh cho trade ${tradeId} (${symbol})...`);
        const token = await getConfig('BROWSERLESS_TOKEN');
        const sessionId = await getConfig('TV_SESSION_ID');
        const sessionSign = await getConfig('TV_SESSION_SIGN');

        if (!token) {
            console.log('[Snapshot] Khong tim thay BROWSERLESS_TOKEN trong Database. Bo qua chuc nang tu dong chup anh.');
            return;
        }

        const browser = await puppeteer.connect({
            browserWSEndpoint: `wss://chrome.browserless.io?token=${token}&stealth`
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

        if (sessionId && sessionSign) {
            await page.setCookie(
                { name: "sessionid", value: sessionId, url: "https://vn.tradingview.com", secure: true, httpOnly: true },
                { name: "sessionid_sign", value: sessionSign, url: "https://vn.tradingview.com", secure: true, httpOnly: true }
            );
        }

        const layout = "fCLTltqk";
        const encodedSymbol = encodeURIComponent(symbol);
        const chartUrl = `https://vn.tradingview.com/chart/${layout}/?symbol=${encodedSymbol}`;
        
        console.log(`[Snapshot] Dang load chart: ${chartUrl}`);
        await page.goto(chartUrl, { waitUntil: 'networkidle2', timeout: 30000 });

        // Wait for chart to render
        await new Promise(r => setTimeout(r, 6000));
        
        // Hide UI elements to keep only the chart
        await page.evaluate(() => {
            const selectors = [
                ".layout__area--top", 
                ".layout__area--left", 
                ".layout__area--right",
                ".layout__area--bottom",
                "[class*='widgetbar']",
                "[class*='drawingToolbar']",
                "[class*='header-']",
                "#overlap-manager-root",
                ".tv-floating-toolbar"
            ];
            selectors.forEach(sel => {
                const els = document.querySelectorAll(sel);
                els.forEach(el => el.style.display = 'none');
            });
        });

        await new Promise(r => setTimeout(r, 1000));

        // Get the chart container bounding box
        const chartEl = await page.$('.layout__area--center');
        let clip = null;
        if (chartEl) {
            const box = await chartEl.boundingBox();
            if (box) {
                clip = {
                    x: box.x,
                    y: box.y,
                    width: box.width,
                    height: box.height
                };
            }
        }

        const buffer = await page.screenshot({ type: 'png', clip: clip || undefined });
        await browser.close();

        // Upload to Supabase Storage
        const fileName = `snapshot_${Date.now()}_${Math.random().toString(36).substring(7)}.png`;
        const { error: uploadError } = await supabase.storage
            .from('trades_snapshots')
            .upload(fileName, buffer, {
                contentType: 'image/png',
                cacheControl: '3600',
                upsert: true
            });

        if (uploadError) {
            console.error('[Snapshot] Loi upload hinh anh:', uploadError.message);
            return;
        }

        const { data: publicUrlData } = supabase.storage
            .from('trades_snapshots')
            .getPublicUrl(fileName);
        
        const imageUrl = publicUrlData.publicUrl;
        console.log(`[Snapshot] Chup thanh cong: ${imageUrl}`);

        // Insert into the manual 'trades' table so the UI merges it!
        // We use the existing trade if it was already created, or create a new one.
        const tradeRecord = existing ? {
            ...existing,
            tv_snapshot_url: imageUrl
        } : {
            id: `t5-${tradeId}`,
            pair: pair,
            type: type === 'buy' ? 'BUY' : 'SELL',
            entry_price: parseFloat(entryPrice) || 0,
            exit_price: null,
            size: parseFloat(size) || 0,
            pnl: 0,
            status: "OPEN",
            entry_date: openTime || new Date().toISOString(),
            exit_date: null,
            notes: "Auto-Snapshot",
            timeframe: "N/A",
            rating: 0,
            tag: "The5ers",
            tv_snapshot_url: imageUrl
        };

        const { error: dbError } = await supabase.from('trades').upsert(tradeRecord);
        if (dbError) {
            console.error('[Snapshot] Loi luu trade vao DB:', dbError.message);
        } else {
            console.log(`[Snapshot] Da luu trade vao DB thanh cong!`);
        }

    } catch (e) {
        console.error(`[Snapshot] Loi xay ra khi chup trade ${tradeId}:`, e.message);
    }
}
