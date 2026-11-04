create table if not exists public.users (
  id uuid primary key,
  first_name text not null,
  last_name text not null,
  username text not null,
  username_key text generated always as (lower(username)) stored,
  phone text not null,
  email text not null,
  email_key text generated always as (lower(email)) stored,
  role text not null check (role in ('client', 'admin')),
  password_hash text not null,
  created_at timestamptz not null,
  constraint users_username_unique unique (username_key),
  constraint users_email_unique unique (email_key)
);

create table if not exists public.sessions (
  id text primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  expires_at timestamptz not null
);

create table if not exists public.holds (
  id uuid primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  username text not null,
  phone text not null,
  email text not null,
  date date not null,
  hour integer not null check (hour >= 0 and hour <= 23),
  coach boolean not null,
  pass text not null,
  created_at timestamptz not null,
  constraint holds_one_per_player unique (user_id, date, hour)
);

create unique index if not exists holds_pass on public.holds (pass);

create unique index if not exists holds_one_hour on public.holds (date, hour);

create table if not exists public.enquiries (
  id uuid primary key,
  name text not null,
  email text not null,
  date date not null,
  time text not null,
  format text not null check (format in ('singles', 'doubles')),
  note text not null default '',
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null
);

alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.holds enable row level security;
alter table public.enquiries enable row level security;

revoke all on table public.users from anon, authenticated;
revoke all on table public.sessions from anon, authenticated;
revoke all on table public.holds from anon, authenticated;
revoke all on table public.enquiries from anon, authenticated;

grant all on table public.users, public.sessions, public.holds, public.enquiries to service_role;

notify pgrst, 'reload schema';
