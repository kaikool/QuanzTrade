import puppeteer from 'puppeteer-core';
import { supabase, getConfig } from './supabase.mjs';

export async function captureAndSaveSnapshot(tradeId, symbol, pair, type, entryPrice, size, openTime, isClose = false) {
    if (!supabase) return;

    try {
        console.log(`[Snapshot] Kiem tra xem trade ${tradeId} da co snapshot (${isClose ? 'close' : 'open'}) chua...`);
        // Check if trade already exists in manual trades table
        const { data: existing } = await supabase.from('trades').select('id, tv_snapshot_url, tv_snapshot_url_close').eq('id', `t5-${tradeId}`).single();
        
        if (isClose) {
            if (existing && existing.tv_snapshot_url_close) {
                console.log(`[Snapshot] Trade ${tradeId} da co close snapshot roi, bo qua.`);
                return;
            }
        } else {
            if (existing && existing.tv_snapshot_url) {
                console.log(`[Snapshot] Trade ${tradeId} da co open snapshot roi, bo qua.`);
                return;
            }
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

        // Dismiss any popups, cookie banners, trial dialogs, overlay managers
        await page.evaluate(() => {
            try {
                const selectors = [
                    '.tv-dialog',
                    '[class*="dialog-"]',
                    '[class*="overlap-"]',
                    '[class*="toast-"]',
                    '[class*="banner-"]',
                    '[class*="notification-"]',
                    '[id*="cookie"]',
                    '[class*="cookie"]',
                    '.toast'
                ];
                selectors.forEach(sel => {
                    document.querySelectorAll(sel).forEach(el => el.remove());
                });
            } catch (e) {}
        });

        const canvasEl = await page.$('.chart-gui-wrapper canvas');
        if (canvasEl) {
            const box = await canvasEl.boundingBox();
            if (box) {
                // Click center of the canvas to focus it
                await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                await new Promise(r => setTimeout(r, 300));
                
                // Press Escape to dismiss any drawing tools/legend selection
                await page.keyboard.press('Escape');
                await new Promise(r => setTimeout(r, 200));

                // Jump to realtime (latest bar)
                await page.keyboard.press('End');
                await new Promise(r => setTimeout(r, 1200));

                // Press Shift + ArrowRight 5 times to scroll the chart into the "future".
                // We add a delay between presses to make sure TradingView handles each key event.
                for (let i = 0; i < 5; i++) {
                    await page.keyboard.down('Shift');
                    await page.keyboard.press('ArrowRight');
                    await page.keyboard.up('Shift');
                    await new Promise(r => setTimeout(r, 150));
                }
                await new Promise(r => setTimeout(r, 500));

                // Reset Price Scale (Alt + R)
                await page.keyboard.down('Alt');
                await page.keyboard.press('r');
                await page.keyboard.up('Alt');
            }
        }

        await new Promise(r => setTimeout(r, 2500));

        const chartEl = await page.$('.layout__area--center');
        let buffer;
        if (chartEl) {
            buffer = await chartEl.screenshot({ type: 'png' });
        } else {
            buffer = await page.screenshot({ type: 'png' });
        }
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
        const tradeRecord = existing ? {
            ...existing,
            [isClose ? 'tv_snapshot_url_close' : 'tv_snapshot_url']: imageUrl,
            status: isClose ? "CLOSED" : existing.status
        } : {
            id: `t5-${tradeId}`,
            pair: pair,
            type: type === 'buy' ? 'BUY' : 'SELL',
            entry_price: parseFloat(entryPrice) || 0,
            exit_price: null,
            size: parseFloat(size) || 0,
            pnl: 0,
            status: isClose ? "CLOSED" : "OPEN",
            entry_date: openTime || new Date().toISOString(),
            exit_date: null,
            notes: "Auto-Snapshot",
            timeframe: "N/A",
            rating: 0,
            tag: "The5ers",
            [isClose ? 'tv_snapshot_url_close' : 'tv_snapshot_url']: imageUrl
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
