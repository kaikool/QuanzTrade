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

        // ═══════════════════════════════════════════════════════
        // GOAL: Position the last candle at ~2/3 of viewport
        // ═══════════════════════════════════════════════════════

        const chartEl = await page.$('.layout__area--center');
        
        // Step 1: Click chart center to focus
        if (chartEl) {
            const box = await chartEl.boundingBox();
            if (box) {
                await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                await new Promise(r => setTimeout(r, 300));
            }
        }

        // Step 2: Jump to latest bar
        await page.keyboard.press('End');
        await new Promise(r => setTimeout(r, 800));

        // Step 3: Use TradingView's internal API to set right offset (~50 bars)
        await page.evaluate(() => {
            try {
                const w = window;
                if (w.TradingView && w.TradingView.activeChart) {
                    const chart = w.TradingView.activeChart();
                    if (typeof chart.setRightOffset === 'function') chart.setRightOffset(50);
                    if (typeof chart.applyOverrides === 'function') chart.applyOverrides({ 'timeScale.rightOffset': 50 });
                }
                if (w._exposed_chartWidgetCollection) {
                    const widgets = w._exposed_chartWidgetCollection;
                    if (widgets.activeChartWidget) {
                        const model = widgets.activeChartWidget.model();
                        if (model && model.timeScale) model.timeScale().setRightOffset(50);
                    }
                }
            } catch(e) {}
        });
        await new Promise(r => setTimeout(r, 500));

        // Step 4: Physical drag to the right as fallback (1/3 of viewport)
        if (chartEl) {
            const box = await chartEl.boundingBox();
            if (box) {
                const dragDistance = Math.round(box.width / 3);
                const centerY = box.y + box.height / 2;
                const startX = box.x + box.width / 2;

                await page.mouse.move(startX, centerY);
                await page.mouse.down();
                const steps = 15;
                for (let i = 1; i <= steps; i++) {
                    await page.mouse.move(startX + (dragDistance * i / steps), centerY);
                    await new Promise(r => setTimeout(r, 30));
                }
                await page.mouse.up();
                await new Promise(r => setTimeout(r, 500));
            }
        }

        // Step 5: Reset Price Scale (Alt + R) to auto-fit candles vertically
        await page.keyboard.down('Alt');
        await page.keyboard.press('r');
        await page.keyboard.up('Alt');

        await new Promise(r => setTimeout(r, 2000));

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
