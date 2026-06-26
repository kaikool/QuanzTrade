import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.includes('supabase.co'))
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

export async function syncAccount(accountData, statsData = null) {
    if (!supabase) return;
    const { error } = await supabase.from('t5_accounts').upsert({
        account_id: accountData.accountId,
        name: accountData.name,
        type: accountData.type,
        balance: accountData.balance,
        equity: accountData.equity,
        pnl: accountData.pnl,
        status: accountData.status,
        stats: statsData,
        updated_at: new Date().toISOString()
    }, { onConflict: 'account_id' });
    if (error) console.error('[Supabase] Loi sync account:', error.message);
}

export async function syncTrades(accountId, tradesArray) {
    if (!supabase || !tradesArray || tradesArray.length === 0) return;
    const rows = tradesArray.map(t => ({
        trade_id: String(t.id || t._id),
        account_id: accountId,
        symbol: t.symbol || 'Unknown',
        side: t.side || 'Unknown',
        quantity: parseFloat(t.quantity) || 0,
        entry_price: parseFloat(t.entry) || 0,
        exit_price: t.exit ? parseFloat(t.exit) : null,
        pips: t.pips ? parseFloat(t.pips) : null,
        profit: parseFloat(t.profitAndLoss) || 0,
        open_date: t.openDate || new Date().toISOString(),
        close_date: t.closeDate || null
    }));
    const { error } = await supabase.from('t5_trades').upsert(rows, { onConflict: 'trade_id' });
    if (error) console.error('[Supabase] Loi sync trades:', error.message);
}

export async function syncPurchases(purchases) {
    if (!supabase || !purchases || purchases.length === 0) return;
    const formatted = purchases.map(p => ({
        purchase_id: p.purchaseId,
        product_name: p.items?.[0]?.metadata?.productName || 'N/A',
        buying_power: p.items?.[0]?.metadata?.buyingPower || 0,
        price: p.paymentData?.convertedPrice || 0,
        currency: p.paymentData?.currency || 'USD',
        status: p.status || 'unknown',
        created_at: p.createdAt || new Date().toISOString()
    }));
    const { error } = await supabase.from('t5_purchases').upsert(formatted, { onConflict: 'purchase_id' });
    if (error) console.error('[Supabase] Loi sync purchases:', error.message);
}

export async function getConfig(key) {
    if (!supabase) return null;
    const { data } = await supabase.from('t5_config').select('value').eq('key', key).single();
    return data ? data.value : null;
}

export async function setConfig(key, value) {
    if (!supabase) return;
    const { error } = await supabase.from('t5_config').upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) console.error('[Supabase] Loi save config:', error.message);
}
