create table if not exists public.news_items (
  id text primary key,
  source text not null,
  link text not null,
  title text not null,
  published_at timestamptz not null,
  fetched_at timestamptz not null default now(),
  translated_at timestamptz,
  data jsonb not null
);

create index if not exists news_items_published_at_idx
  on public.news_items (published_at desc);

create index if not exists news_items_fetched_at_idx
  on public.news_items (fetched_at desc);

create index if not exists news_items_translated_at_idx
  on public.news_items (translated_at desc);
