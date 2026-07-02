import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase, syncAccount, syncTrades, syncPurchases, getConfig, setConfig } from './supabase.mjs';
import { captureAndSaveSnapshot } from './snapshot.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '.env') });

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let THE5ERS_EMAIL = process.env.THE5ERS_EMAIL || "";
const DESCOPE_PROJECT_ID = 'P37sOCdLJjVCAuLgqv2zMvS61Xbo';

let headers = {};

async function fetchApi(path) {
  const res = await fetch(`https://api.the5ers.com${path}`, { headers });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  const json = await res.json();
  return json.data || json;
}

async function getDescopeSession() {
  // Use stored Descope refresh token (DSR). Do not require/store The5ers password.
  if (supabase) {
    const storedRefresh = await getConfig('THE5ERS_REFRESH_TOKEN');
    if (storedRefresh) {
      const refreshRes = await fetch('https://api.descope.com/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + DESCOPE_PROJECT_ID + ':' + storedRefresh,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        let newRefresh = data.refreshJwt;
        if (!newRefresh) {
          const setCookie = refreshRes.headers.get('set-cookie') || '';
          const m = setCookie.match(/DSR=([^;]+)/);
          if (m) newRefresh = m[1];
        }
        if (newRefresh && newRefresh !== storedRefresh) {
          await setConfig('THE5ERS_REFRESH_TOKEN', newRefresh);
        }
        return data.sessionJwt;
      }
    }
  }

  throw new Error('DSR Token (Refresh Token) is missing or expired. You must update it in the UI and save to Supabase.');
}

async function run() {
  try {
    if (!THE5ERS_EMAIL) {
      if (supabase) {
        THE5ERS_EMAIL = await getConfig('THE5ERS_EMAIL') || "";
      }
    }

    if (!THE5ERS_EMAIL) {
      console.error('Thiếu THE5ERS_EMAIL. Vui lòng lưu email và DSR token trên giao diện trước.');
      return;
    }

    console.log('Dang refresh Descope session bang DSR token...');
    const activeToken = await getDescopeSession();

    headers = {
      "accept": "application/json, text/plain, */*",
      "accept-language": "vi,en-US;q=0.9,en;q=0.8,de;q=0.7",
      "authorization": activeToken.startsWith('Bearer') ? activeToken : 'Bearer ' + activeToken,
      "cache-control": "no-cache",
      "dnt": "1",
      "origin": "https://hub.the5ers.com",
      "pragma": "no-cache",
      "referer": "https://hub.the5ers.com/",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "x-brand": "5ers",
      "x-idp-provider": "descope"
    };

    console.log('Dang ket noi toi The5ers...');
    const user = await fetchApi('/user');
    const accounts = user.tsUsers || [];
    console.log('Lay ho so: ' + user.displayName + ' (' + accounts.length + ' tai khoan)');

    // Purchases
    try {
      console.log('Dang lay Purchases...');
      let allPurchases = [];
      let page = 1;
      while (true) {
        const purchaseData = await fetchApi('/purchase?page=' + page + '&limit=50');
        if (purchaseData && purchaseData.results && purchaseData.results.length > 0) {
          allPurchases = allPurchases.concat(purchaseData.results);
          if (purchaseData.results.length < 50) break;
          page++;
        } else break;
      }
      console.log('Tong cong: ' + allPurchases.length + ' hoa don');
      if (supabase) await syncPurchases(allPurchases);
    } catch (err) {
      console.error('Loi lay purchases:', err.message);
    }

    const profileData = {
      scrapedAt: new Date().toISOString(),
      userName: user.firstName + ' ' + user.lastName,
      accounts: []
    };

    let existingAccounts = [];
    let existingTradeIds = new Set();
    let openTradeIds = new Set();
    if (supabase) {
      const { data } = await supabase.from('t5_accounts').select('account_id, status');
      if (data) existingAccounts = data;
      
      const { data: tData } = await supabase.from('t5_trades').select('trade_id, close_date');
      if (tData) {
        tData.forEach(t => {
          existingTradeIds.add(t.trade_id);
          if (!t.close_date) {
            openTradeIds.add(t.trade_id);
          }
        });
      }
    }

    if (accounts && accounts.length > 0) {
      console.log('Tim thay ' + accounts.length + ' tai khoan...');
      for (const acc of accounts) {
        const accId = acc.externalId;
        const existingAcc = existingAccounts.find(a => a.account_id === String(accId));
        if (existingAcc && existingAcc.status === 'disabled') {
          console.log('Bo qua ' + accId + ' (da vo hieu hoa)');
          continue;
        }

        console.log('Lay du lieu tai khoan ' + accId + '...');

        try {
          let balanceData = { balance: 0, equity: 0 };
          let statsData = { totalNetProfit: 0 };
          let positionsData = [];
          let tsData = {};

          try { tsData = await fetchApi('/account/ts/' + accId); } catch(e) { console.log('Khong lay duoc ts ' + accId); }
          try { balanceData = await fetchApi('/account/' + accId + '/balance'); } catch(e) { console.log('Khong lay duoc balance ' + accId); }
          try { statsData = await fetchApi('/account/' + accId + '/stats'); } catch(e) { console.log('Khong lay duoc stats ' + accId); }
          try {
            const posRes = await fetchApi('/position/all/' + accId + '?page=1&limit=50');
            positionsData = Array.isArray(posRes) ? posRes : (posRes.results || posRes.data || posRes.positions || []);
            
            const normalizeTradeStatus = (t) => {
                const raw = String(t.status ?? t.positionStatus ?? t.state ?? t.statusName ?? '').trim().toLowerCase();
                if (raw) {
                    if (['open', 'opened', 'active', 'running', 'live'].some(token => raw.includes(token))) return 'OPEN';
                    if (['closed', 'close', 'history', 'completed', 'done'].some(token => raw.includes(token))) return 'CLOSED';
                }
                if (t.isOpen === true) return 'OPEN';
                if (t.isClosed === true) return 'CLOSED';
                return (t.closeDate || t.closeTime || t.closedAt) ? 'CLOSED' : 'OPEN';
            };

            // Check for new trades to snapshot, or trades that have just closed
            for (const t of positionsData) {
                const tid = String(t.id || t._id);
                const isClosedNow = normalizeTradeStatus(t) === 'CLOSED';

                if (!existingTradeIds.has(tid)) {
                    // NEW TRADE DETECTED! Take open snapshot!
                    const symbol = t.symbol || '';
                    const pair = symbol.replace(/(.{3})/, "$1/");
                    await captureAndSaveSnapshot(
                        tid,
                        symbol,
                        pair,
                        t.side || t.direction,
                        t.entry || t.openPrice,
                        t.quantity || t.volume,
                        t.openDate || t.openTime,
                        false // isClose = false
                    );
                    existingTradeIds.add(tid); // Mark as processed
                    
                    // If it is also closed now (meaning it closed before we could run the scraper),
                    // we should ALSO capture the close snapshot!
                    if (isClosedNow) {
                        await captureAndSaveSnapshot(
                            tid,
                            symbol,
                            pair,
                            t.side || t.direction,
                            t.entry || t.openPrice,
                            t.quantity || t.volume,
                            t.openDate || t.openTime,
                            true // isClose = true
                        );
                    }
                } else if (openTradeIds.has(tid) && isClosedNow) {
                    // This trade was previously OPEN in the database, but is now CLOSED!
                    // Take the close snapshot!
                    const symbol = t.symbol || '';
                    const pair = symbol.replace(/(.{3})/, "$1/");
                    await captureAndSaveSnapshot(
                        tid,
                        symbol,
                        pair,
                        t.side || t.direction,
                        t.entry || t.openPrice,
                        t.quantity || t.volume,
                        t.openDate || t.openTime,
                        true // isClose = true
                    );
                    // Remove from openTradeIds so we don't snapshot it again in this run
                    openTradeIds.delete(tid);
                }
            }
          } catch(e) { console.log('Khong lay duoc lenh ' + accId); }

          const finalType = tsData.type || acc.accountType || 'unknown';
          const finalStatus = tsData.status || 'unknown';

          const overview = {
            accountId: accId,
            name: finalType.toUpperCase() + ' ' + accId,
            balance: balanceData.balance || 0,
            equity: balanceData.equity || 0,
            pnl: statsData.totalNetProfit || 0,
            status: finalStatus,
            type: finalType,
            state: tsData.state || {},
            createdAt: tsData.createdAt || null
          };
          profileData.accounts.push(overview);

          const detail = { ...tsData, ...overview, stats: statsData, balanceDetails: balanceData, trades: positionsData };
          fs.writeFileSync(path.join(DATA_DIR, 'account_' + accId + '.json'), JSON.stringify(detail, null, 2));

          if (supabase) {
            await syncAccount(overview, { ...statsData, balanceDetails: balanceData, accountState: tsData });
            await syncTrades(accId, positionsData);
          }

        } catch (e) {
          console.log('Loi ' + accId + ': ' + e.message);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    fs.writeFileSync(path.join(DATA_DIR, 'profile.json'), JSON.stringify(profileData, null, 2));

    console.log('Hoan tat! Da dong bo du lieu.');
    if (supabase) console.log('Da dong bo len Supabase!');

  } catch (err) {
    console.error('Loi he thong:', err.message);
  }
}

run();
