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

// Default headers to be populated after token refresh
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
    
    // Đọc token mới nhất từ Supabase (tránh bị văng khi chạy trên Github Actions)
    if (supabase) {
        const dbRefreshToken = await getConfig('THE5ERS_REFRESH_TOKEN');
        if (dbRefreshToken) {
            console.log('☁️ Đã lấy Refresh Token mới nhất từ Supabase');
            currentRefreshToken = dbRefreshToken;
        }
    }
    
    // Auto-refresh token if Refresh Token is provided
    if (currentRefreshToken) {
        console.log('🔄 Đang tự động làm mới Token bằng DSR...');
        const refreshRes = await fetch('https://api.descope.com/v1/auth/refresh', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DESCOPE_PROJECT_ID}:${currentRefreshToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });
        
        if (refreshRes.ok) {
            const data = await refreshRes.json();
            activeToken = data.sessionJwt;
            console.log('✅ Đã lấy được Token 15 phút mới tinh!');
            
            // Xử lý cơ chế Xoay Vòng Refresh Token (Token Rotation) của Descope
            let newRefreshToken = data.refreshJwt;
            if (!newRefreshToken) {
                // Thử tìm trong header Set-Cookie
                const setCookie = refreshRes.headers.get('set-cookie');
                if (setCookie && setCookie.includes('DSR=')) {
                    newRefreshToken = setCookie.split('DSR=')[1].split(';')[0];
                }
            }
            if (newRefreshToken && newRefreshToken !== currentRefreshToken) {
                console.log('🔄 Đã nhận được Refresh Token mới, đang lưu vào .env và Supabase...');
                const envPath = path.join(__dirname, '.env');
                if (fs.existsSync(envPath)) {
                    let envContent = fs.readFileSync(envPath, 'utf8');
                    if (envContent.includes('THE5ERS_REFRESH_TOKEN=*** {
                        envContent = envContent.replace(/THE5ERS_REFRESH_TOKEN=*** `THE5ERS_REFRESH_TOKEN=${newR...}`);
                    } else {
                        envContent += `\nTHE5ERS_REFRESH_TOKEN=${newR...n}`;
                    }
                    fs.writeFileSync(envPath, envContent);
                }
                if (supabase) {
                    await setConfig('THE5ERS_REFRESH_TOKEN', newRefreshToken);
                }
            }
        } else {
            console.error('❌ Cảnh báo: Lỗi làm mới Token, sẽ sử dụng Token cũ.', await refreshRes.text());
        }
    }

    // Populate headers
    headers = {
      "accept": "application/json, text/plain, */*",
      "accept-language": "vi,en-US;q=0.9,en;q=0.8,de;q=0.7",
      "authorization": activeToken.startsWith('Bearer') ? activeToken : `Bearer ${activeToken}`,
      "baggage": "sentry-environment=production,sentry-release=production-local,sentry-public_key=9e8f7197c32c2fcb49fac14c205d51c0,sentry-trace_id=2a45296a5feb456d9d71d88d0401bf0c,sentry-sample_rate=0.1,sentry-sampled=false",
      "cache-control": "no-cache",
      "dnt": "1",
      "origin": "https://hub.the5ers.com",
      "pragma": "no-cache",
      "priority": "u=1, i",
      "referer": "https://hub.the5ers.com/",
      "sec-ch-ua": "\"Microsoft Edge\";v=\"149\", \"Chromium\";v=\"149\", \"Not)A;Brand\";v=\"24\"",
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": "\"Windows\"",
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-site",
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 Edg/149.0.0.0",
      "x-brand": "5ers",
      "x-idp-provider": "descope"
    };

    console.log('🚀 Đang kết nối tới The5ers...');
    // 1. Fetch user data (get list of accounts)
    const user = await fetchApi('/user');
    const accounts = user.tsUsers || [];
    console.log(`✅ Lấy thành công hồ sơ: ${user.displayName} (${accounts.length} tài khoản)`);

    // --- NEW: Fetch and Sync Purchases ---
    try {
        console.log(`⏳ Đang lấy dữ liệu chi phí đầu vào (Purchases)...`);
        let allPurchases = [];
        let page = 1;
        while (true) {
            const purchaseData = await fetchApi(`/purchase?page=${page}&limit=50`);
            if (purchaseData && purchaseData.results && purchaseData.results.length > 0) {
                allPurchases = allPurchases.concat(purchaseData.results);
                if (purchaseData.results.length < 50) break; // Last page
                page++;
            } else {
                break;
            }
        }
        console.log(`   + Tổng cộng: ${allPurchases.length} hóa đơn`);
        if (supabase) {
            await syncPurchases(allPurchases);
            console.log(`   + Đã đồng bộ chi phí lên Supabase`);
        }
    } catch (err) {
        console.error(`❌ Lỗi lấy chi phí đầu vào:`, err.message);
    }
    // -------------------------------------
    
    // Bỏ filter demo để lấy toàn bộ danh sách tài khoản
    const accountsRes = accounts;
    
    const profileData = {
      scrapedAt: new Date().toISOString(),
      userName: `${user.firstName} ${user.lastName}`,
      accounts: []
    };

    let existingAccounts = [];
    if (supabase) {
        const { data } = await supabase.from('t5_accounts').select('account_id, status');
        if (data) existingAccounts = data;
    }

    if (accountsRes && accountsRes.length > 0) {
      console.log(`\n📦 Tìm thấy ${accountsRes.length} tài khoản. Đang lấy chi tiết...`);
      for (const acc of accountsRes) {
        const accId = acc.externalId;
        
        // Optimize: Skip disabled accounts to save time and API requests
        const existingAcc = existingAccounts.find(a => a.account_id === String(accId));
        if (existingAcc && existingAcc.status === 'disabled') {
            console.log(`⏭️ Bỏ qua ${accId} vì đã vô hiệu hóa (tiết kiệm thời gian)`);
            continue;
        }

        console.log(`⏳ Lấy dữ liệu tài khoản ${accId}...`);
      
      try {
        let balanceData = { balance: 0, equity: 0 };
        let statsData = { totalNetProfit: 0 };
        let positionsData = [];
        let tsData = {};

        try {
          tsData = await fetchApi(`/account/ts/${accId}`);
        } catch(e) {
          console.log(`   ⚠️ Không lấy được thông tin trạng thái của ${accId} (${e.message})`);
        }

        try {
          balanceData = await fetchApi(`/account/${accId}/balance`);
        } catch(e) {
          console.log(`   ⚠️ Không lấy được balance của ${accId} (${e.message})`);
        }

        try {
          statsData = await fetchApi(`/account/${accId}/stats`);
        } catch(e) {
          console.log(`   ⚠️ Không lấy được stats của ${accId} (${e.message})`);
        }
        
        try {
          const posRes = await fetchApi(`/position/all/${accId}?page=1&limit=50`);
          positionsData = Array.isArray(posRes) ? posRes : (posRes.results || posRes.data || posRes.positions || []);
        } catch(e) {
          console.log(`   ⚠️ Không lấy được lệnh của ${accId}`);
        }
        
        console.log(`   + Trạng thái: ${tsData.status || 'unknown'} (${tsData.type || 'unknown'})`);
        console.log(`   + Balance: $${balanceData.balance}`);
        console.log(`   + Equity: $${balanceData.equity}`);
        console.log(`   + Profit: $${statsData.totalNetProfit}`);
        console.log(`   + Lịch sử lệnh: ${positionsData.length} lệnh`);

        const finalType = tsData.type || acc.accountType || 'unknown';
        const finalStatus = tsData.status || 'unknown';

        const overview = {
          accountId: accId,
          name: `${finalType.toUpperCase()} ${accId}`,
          balance: balanceData.balance || 0,
          equity: balanceData.equity || 0,
          pnl: statsData.totalNetProfit || 0,
          status: finalStatus,
          type: finalType,
          state: tsData.state || {},
          createdAt: tsData.createdAt || null
        };
        profileData.accounts.push(overview);

        // Save detailed account data
        const detail = {
          ...tsData,
          ...overview,
          stats: statsData,
          balanceDetails: balanceData,
          trades: positionsData
        };
        fs.writeFileSync(path.join(DATA_DIR, `account_${accId}.json`), JSON.stringify(detail, null, 2));

        // Sync to Supabase in background
        if (supabase) {
            await syncAccount(overview, { ...statsData, balanceDetails: balanceData });
            await syncTrades(accId, positionsData);
        }

      } catch (e) {
        console.log(`   ❌ Lỗi không xác định ở tài khoản ${accId}: ${e.message}`);
      }

      // Đợi 1 giây để tránh bị Cloudfront/WAF chặn do gửi request quá nhanh
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    }
    // Save profile data
    fs.writeFileSync(path.join(DATA_DIR, 'profile.json'), JSON.stringify(profileData, null, 2));
    
    // Copy to dashboard
    const pubDataDir = path.join(process.cwd(), '../public/data');
    if (!fs.existsSync(pubDataDir)) fs.mkdirSync(pubDataDir, { recursive: true });
    
    fs.copyFileSync(path.join(DATA_DIR, 'profile.json'), path.join(pubDataDir, 'profile.json'));
    
    for (const acc of profileData.accounts) {
        if (fs.existsSync(path.join(DATA_DIR, `account_${acc.accountId}.json`))) {
            fs.copyFileSync(path.join(DATA_DIR, `account_${acc.accountId}.json`), path.join(pubDataDir, `account_${acc.accountId}.json`));
        }
    }
    
    console.log('\n🎉 Hoàn tất! Đã lưu toàn bộ dữ liệu ra dashboard/public/data/');
    if (supabase) console.log('✅ Đã đồng bộ thành công lên Supabase!');
    
  } catch (err) {
    console.error('\n❌ Lỗi hệ thống:', err.message);
  }
}

run();