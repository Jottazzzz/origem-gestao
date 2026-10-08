-- Origem Gestao - estrutura completa para Supabase/PostgreSQL
-- Execute este arquivo uma unica vez no SQL Editor do Supabase.
-- Usuarios devem ser provisionados separadamente com uma senha forte.

begin;

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('gestor', 'administrativo');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.contract_status as enum ('draft', 'active', 'expiring', 'expired', 'closed', 'archived');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.collection_status as enum ('planned', 'completed', 'pending', 'rescheduled', 'cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.pile_status as enum ('active', 'curing', 'ready', 'closed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.alert_status as enum ('open', 'viewed', 'resolved', 'dismissed');
exception when duplicate_object then null; end $$;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (username = lower(username)),
  password_hash text not null,
  display_name text not null,
  email text,
  role public.app_role not null default 'administrativo',
  active boolean not null default true,
  must_change_password boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  user_id uuid not null references public.app_users(id) on delete cascade,
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  trade_name text,
  document text not null unique,
  contact_name text,
  email text,
  phone text,
  whatsapp text,
  postal_code text,
  street text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  country text not null default 'Brasil',
  notes text,
  active boolean not null default true,
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  title text not null,
  object text not null,
  start_date date not null,
  end_date date not null,
  monthly_value_cents integer not null check (monthly_value_cents >= 0),
  payment_terms text not null,
  collection_frequency text not null,
  container_type text not null default 'Baldão',
  container_quantity integer not null default 0 check (container_quantity >= 0),
  internal_responsible_id uuid references public.app_users(id) on delete set null,
  notes text,
  status public.contract_status not null default 'draft',
  archived_at timestamptz,
  archived_by uuid references public.app_users(id) on delete set null,
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.contract_events (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  user_id uuid references public.app_users(id) on delete set null,
  event_type text not null,
  description text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  area text not null,
  weekday smallint check (weekday between 0 and 6),
  active boolean not null default true,
  notes text,
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  contract_id uuid references public.contracts(id) on delete set null,
  route_id uuid references public.routes(id) on delete set null,
  scheduled_at timestamptz not null,
  completed_at timestamptz,
  status public.collection_status not null default 'planned',
  container_type text not null,
  container_quantity integer not null default 0 check (container_quantity >= 0),
  expected_weight_kg numeric(12,3),
  actual_weight_kg numeric(12,3),
  address_snapshot jsonb not null default '{}'::jsonb,
  contact_name text,
  contact_phone text,
  access_instructions text,
  recurrence text not null default 'none',
  pending_reason text,
  notes text,
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.collection_events (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.collections(id) on delete cascade,
  user_id uuid references public.app_users(id) on delete set null,
  previous_status public.collection_status,
  new_status public.collection_status,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.piles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  status public.pile_status not null default 'active',
  started_at date not null default current_date,
  closed_at date,
  initial_weight_kg numeric(12,3),
  current_weight_kg numeric(12,3),
  material_description text,
  notes text,
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pile_measurements (
  id uuid primary key default gen_random_uuid(),
  pile_id uuid not null references public.piles(id) on delete cascade,
  temperature_c numeric(5,2) not null,
  humidity_percent numeric(5,2) check (humidity_percent between 0 and 100),
  notes text,
  measured_by uuid references public.app_users(id) on delete set null,
  measured_at timestamptz not null default now()
);

create table if not exists public.pile_turnings (
  id uuid primary key default gen_random_uuid(),
  pile_id uuid not null references public.piles(id) on delete cascade,
  performed_by uuid references public.app_users(id) on delete set null,
  notes text,
  performed_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_by uuid references public.app_users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.setting_history (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null,
  previous_value jsonb,
  new_value jsonb not null,
  reason text not null,
  changed_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  source_table text,
  source_id uuid,
  title text not null,
  message text not null,
  severity text not null default 'warning' check (severity in ('info', 'warning', 'critical')),
  status public.alert_status not null default 'open',
  persistent boolean not null default false,
  due_at timestamptz,
  resolved_at timestamptz,
  resolved_by uuid references public.app_users(id) on delete set null,
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.alert_views (
  alert_id uuid not null references public.alerts(id) on delete cascade,
  user_id uuid not null references public.app_users(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (alert_id, user_id)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users(id) on delete set null,
  user_name_snapshot text,
  role_snapshot public.app_role,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  description text not null,
  details jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.impact_metrics (
  id uuid primary key default gen_random_uuid(),
  reference_date date not null unique,
  diverted_weight_kg numeric(14,3) not null default 0,
  compost_produced_kg numeric(14,3) not null default 0,
  co2_avoided_kg numeric(14,3) not null default 0,
  notes text,
  recorded_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  storage_bucket text not null,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  uploaded_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_role_active on public.app_users(role, active);
create index if not exists idx_sessions_user on public.user_sessions(user_id);
create index if not exists idx_sessions_expiration on public.user_sessions(expires_at);
create index if not exists idx_clients_name on public.clients(legal_name);
create index if not exists idx_contracts_client on public.contracts(client_id);
create index if not exists idx_contracts_status_end on public.contracts(status, end_date);
create index if not exists idx_contract_events_contract on public.contract_events(contract_id, created_at desc);
create index if not exists idx_collections_date on public.collections(scheduled_at);
create index if not exists idx_collections_status_date on public.collections(status, scheduled_at);
create index if not exists idx_collections_route on public.collections(route_id);
create index if not exists idx_collection_events_collection on public.collection_events(collection_id, created_at desc);
create index if not exists idx_measurements_pile_date on public.pile_measurements(pile_id, measured_at desc);
create index if not exists idx_turnings_pile_date on public.pile_turnings(pile_id, performed_at desc);
create index if not exists idx_alerts_status_due on public.alerts(status, due_at);
create index if not exists idx_alerts_source on public.alerts(source_table, source_id);
create index if not exists idx_audit_created on public.audit_logs(created_at desc);
create index if not exists idx_audit_entity on public.audit_logs(entity_type, entity_id);
create index if not exists idx_attachments_entity on public.attachments(entity_type, entity_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_users_updated_at on public.app_users;
create trigger set_users_updated_at before update on public.app_users for each row execute function public.set_updated_at();
drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at before update on public.clients for each row execute function public.set_updated_at();
drop trigger if exists set_contracts_updated_at on public.contracts;
create trigger set_contracts_updated_at before update on public.contracts for each row execute function public.set_updated_at();
drop trigger if exists set_routes_updated_at on public.routes;
create trigger set_routes_updated_at before update on public.routes for each row execute function public.set_updated_at();
drop trigger if exists set_collections_updated_at on public.collections;
create trigger set_collections_updated_at before update on public.collections for each row execute function public.set_updated_at();
drop trigger if exists set_piles_updated_at on public.piles;
create trigger set_piles_updated_at before update on public.piles for each row execute function public.set_updated_at();
drop trigger if exists set_alerts_updated_at on public.alerts;
create trigger set_alerts_updated_at before update on public.alerts for each row execute function public.set_updated_at();
drop trigger if exists set_impact_metrics_updated_at on public.impact_metrics;
create trigger set_impact_metrics_updated_at before update on public.impact_metrics for each row execute function public.set_updated_at();

insert into public.app_settings (key, value, description)
values
  ('temperature_rule', '{"limit_c":40,"warning_margin_c":3}'::jsonb, 'Regra operacional para alertas de temperatura'),
  ('business_timezone', '"America/Cuiaba"'::jsonb, 'Fuso horario oficial da operacao')
on conflict (key) do nothing;

-- O acesso direto pela chave anon fica bloqueado. A aplicacao deve consultar
-- estas tabelas apenas pelo backend com a service role, nunca no navegador.
alter table public.app_users enable row level security;
alter table public.user_sessions enable row level security;
alter table public.clients enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_events enable row level security;
alter table public.routes enable row level security;
alter table public.collections enable row level security;
alter table public.collection_events enable row level security;
alter table public.piles enable row level security;
alter table public.pile_measurements enable row level security;
alter table public.pile_turnings enable row level security;
alter table public.app_settings enable row level security;
alter table public.setting_history enable row level security;
alter table public.alerts enable row level security;
alter table public.alert_views enable row level security;
alter table public.audit_logs enable row level security;
alter table public.impact_metrics enable row level security;
alter table public.attachments enable row level security;

commit;

-- Verificacao: deve listar 18 tabelas do sistema.
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'app_users','user_sessions','clients','contracts','contract_events','routes',
    'collections','collection_events','piles','pile_measurements','pile_turnings',
    'app_settings','setting_history','alerts','alert_views','audit_logs',
    'impact_metrics','attachments'
  )
order by table_name;
