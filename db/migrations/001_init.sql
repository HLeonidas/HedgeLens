create table if not exists users (
  id text primary key,
  email text unique not null,
  name text,
  image text,
  provider text,
  provider_account_id text,
  active boolean not null default true,
  role text not null default 'enduser',
  preferred_currency text not null default 'EUR',
  created_at timestamptz not null,
  updated_at timestamptz not null,
  risk_profile text,
  preferences jsonb
);

create index if not exists users_email_idx on users (email);

create table if not exists projects (
  id text primary key,
  owner_uid text not null references users (id),
  name text not null,
  base_currency text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  ratios jsonb,
  constraints jsonb
);

create index if not exists projects_owner_uid_idx on projects (owner_uid);

create table if not exists instruments (
  isin text primary key,
  name text not null,
  issuer text not null,
  type text not null,
  underlying text not null,
  strike numeric not null,
  expiry date not null,
  currency text not null,
  price numeric not null,
  greeks jsonb,
  fetched_at timestamptz not null
);

create table if not exists positions (
  id text primary key,
  project_id text not null references projects (id),
  isin text not null references instruments (isin),
  side text not null,
  size numeric not null,
  entry_price numeric not null,
  date date not null
);

create index if not exists positions_project_id_idx on positions (project_id);
create index if not exists positions_isin_idx on positions (isin);
