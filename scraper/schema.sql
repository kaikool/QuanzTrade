DROP TABLE IF EXISTS t5_trades;
DROP TABLE IF EXISTS t5_purchases;
DROP TABLE IF EXISTS t5_accounts;
DROP TABLE IF EXISTS t5_config;

CREATE TABLE t5_accounts (
    account_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    balance NUMERIC NOT NULL,
    equity NUMERIC NOT NULL,
    pnl NUMERIC NOT NULL,
    status TEXT NOT NULL,
    stats JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE t5_trades (
    trade_id TEXT PRIMARY KEY,
    account_id TEXT REFERENCES t5_accounts(account_id) ON DELETE CASCADE,
    status TEXT,
    symbol TEXT NOT NULL,
    side TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    entry_price NUMERIC,
    exit_price NUMERIC,
    pips NUMERIC,
    profit NUMERIC,
    open_date TIMESTAMP WITH TIME ZONE NOT NULL,
    close_date TIMESTAMP WITH TIME ZONE
);

ALTER TABLE t5_trades ADD COLUMN IF NOT EXISTS status TEXT;

CREATE TABLE t5_purchases (
    purchase_id TEXT PRIMARY KEY,
    product_name TEXT NOT NULL,
    buying_power NUMERIC,
    price NUMERIC NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE TABLE t5_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
