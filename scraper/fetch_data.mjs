import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase, syncAccount, syncTrades, syncPurchases, getConfig, setConfig } from './supabase.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '.env') });

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const THE5ERS_TOKEN_ENV = process.env.THE5ERS_TOKEN || "";
const THE5ERS_REFRESH_TOKEN = process.env.THE5ERS_REFRESH_TOKEN || "";
const DESCOPE_PROJECT_ID = 'P37sOCdLJjVCAuLgqv2zMvS61Xbo';

let headers = {};

async function fetchApi(path) {
  const res = await fetch(`https://api.the5ers.com${path}`, { headers });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  const json = await res.json();
  return json.data || json;
}

async function run() {
  try {
    let activeToken = THE5ERS_TOKEN_ENV;
    let currentRefreshToken = THE5ERS_REFRESH_TOKEN;

    if (supabase) {
      const dbRefreshToken = await getConfig('THE5ERS_REFRESH_TOKEN');
      if (dbRefreshToken) {
        console.log('Cloud lay Refresh Token moi tu Supabase');
        currentRefreshToken = dbRefreshToken;
      }
    }

    if (currentRefreshToken) {
      console.log('Dang tu dong lam moi Token...');
      const refreshRes = await fetch('https://api.descope.com/v1/auth/refresh', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + DESCOPE_PROJECT_ID + ':' + currentRefreshToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json();
        activeToken = data.sessionJwt;
        console.log('Da lay duoc Token 15 phut moi!');

        let newRefreshToken = data.refreshJwt;
        if (!newRefreshToken) {
          const setCookie = refreshRes.headers.get('set-cookie');
          if (setCookie && setCookie.includes('DSR=')) {
            newRefreshToken = setCookie.split('DSR=')[1].split(';')[0];
          }
        }
        if (newRefreshToken && newRefreshToken !== currentRefreshToken) {
          console.log('Dang luu Refresh Token moi...');
          const envPath = path.join(__dirname, '.env');
          if (fs.existsSync(envPath)) {
            let envContent = fs.readFileSync(envPath, 'utf8');
            const key = 'THE5ERS_REFRESH_TOKEN=';
            if (envContent.includes(key)) {
              envContent = envContent.replace(
                new RegExp(key + '.*', 'g'),
                key + newRefreshToken
              );
            } else {
              envContent += '\n' + key + newRefreshToken;
            }
            fs.writeFileSync(envPath, envContent);
          }
          if (supabase) {
            await setConfig('THE5ERS_REFRESH_TOKEN', newRefreshToken);
          }
        }
      } else {
        console.error('Loi lam moi Token:', await refreshRes.text());
      }
    }

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
    if (supabase) {
      const { data } = await supabase.from('t5_accounts').select('account_id, status');
      if (data) existingAccounts = data;
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

    const pubDataDir = path.join(process.cwd(), '../public/data');
    if (!fs.existsSync(pubDataDir)) fs.mkdirSync(pubDataDir, { recursive: true });

    fs.copyFileSync(path.join(DATA_DIR, 'profile.json'), path.join(pubDataDir, 'profile.json'));

    for (const acc of profileData.accounts) {
      const f = path.join(DATA_DIR, 'account_' + acc.accountId + '.json');
      if (fs.existsSync(f)) fs.copyFileSync(f, path.join(pubDataDir, 'account_' + acc.accountId + '.json'));
    }

    console.log('Hoan tat! Da dong bo du lieu.');
    if (supabase) console.log('Da dong bo len Supabase!');

  } catch (err) {
    console.error('Loi he thong:', err.message);
  }
}

run();
