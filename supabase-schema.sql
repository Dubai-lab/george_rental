-- ═══════════════════════════════════════════════════════════════════════════
-- George Rental — database schema
--
-- Reconstructed on 2026-10-05 from the frontend code after the original
-- supabase-schema.sql / supabase-patches.sql were lost. Every table, column,
-- foreign-key name, bucket and realtime table below is one the app queries.
--
-- HOW TO RUN: Supabase Dashboard → SQL Editor → New query → paste this whole
-- file → Run. It is safe to run more than once.
--
-- NOTE: the service_role key and the SQL Editor bypass RLS, so you can never
-- be locked out of your own data from the dashboard.
-- ═══════════════════════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────────────────────
-- 1. TABLES
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'tenant' check (role in ('owner', 'tenant')),
  full_name  text not null default '',
  email      text,
  phone      text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.areas (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  city       text not null default 'Monrovia',
  created_at timestamptz not null default now()
);

create table if not exists public.stores (
  id         uuid primary key default gen_random_uuid(),
  area_id    uuid references public.areas(id) on delete set null,
  code       text not null unique,
  name       text not null,
  address    text,
  lat        double precision,
  lng        double precision,
  photo_url  text,
  photos     text[] not null default '{}',
  video_url  text,
  rent_usd   numeric(10,2) not null check (rent_usd > 0),
  status     text not null default 'vacant' check (status in ('occupied', 'vacant')),
  created_at timestamptz not null default now()
);

create table if not exists public.leases (
  id               uuid primary key default gen_random_uuid(),
  store_id         uuid not null,
  tenant_id        uuid not null,
  lease_code       text,
  business_name    text,
  business_type    text,
  monthly_rent_usd numeric(10,2) not null check (monthly_rent_usd >= 0),
  start_date       date not null default current_date,
  end_date         date,
  status           text not null default 'active' check (status in ('active', 'ended')),
  agreement_url    text,
  created_at       timestamptz not null default now(),
  -- The app embeds with profiles!leases_tenant_id_fkey — the name matters.
  constraint leases_store_id_fkey  foreign key (store_id)  references public.stores(id),
  constraint leases_tenant_id_fkey foreign key (tenant_id) references public.profiles(id)
);

-- The app reads "the" active lease with maybeSingle(), so there can be only one
-- active lease per store and one per tenant.
create unique index if not exists leases_one_active_per_store
  on public.leases (store_id) where status = 'active';
create unique index if not exists leases_one_active_per_tenant
  on public.leases (tenant_id) where status = 'active';

create sequence if not exists public.receipt_number_seq start 1;

create table if not exists public.payments (
  id              uuid primary key default gen_random_uuid(),
  lease_id        uuid not null,
  tenant_id       uuid not null,
  store_id        uuid not null,
  amount_usd      numeric(12,2) not null check (amount_usd > 0),
  amount_lrd      numeric(14,2),
  fx_rate         numeric(10,2) not null default 180,
  method          text not null check (method in ('mtn_momo', 'orange_money', 'bank_transfer', 'cash')),
  period_month    text not null check (period_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),  -- 'YYYY-MM'
  months_count    integer not null default 1 check (months_count between 1 and 24),
  due_day         integer check (due_day between 1 and 31),
  transaction_ref text,
  proof_url       text,
  status          text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  confirmed_at    timestamptz,
  -- References auth.users (not profiles) on purpose: payments must have exactly
  -- ONE foreign key to profiles, otherwise the dashboard's un-hinted
  -- `tenant:profiles(full_name)` embed becomes ambiguous and returns nothing.
  confirmed_by    uuid references auth.users(id) on delete set null,
  notes           text,
  receipt_number  text unique,
  created_at      timestamptz not null default now(),
  constraint payments_lease_id_fkey  foreign key (lease_id)  references public.leases(id),
  constraint payments_tenant_id_fkey foreign key (tenant_id) references public.profiles(id),
  constraint payments_store_id_fkey  foreign key (store_id)  references public.stores(id)
);

create index if not exists payments_tenant_idx on public.payments (tenant_id, created_at desc);
create index if not exists payments_period_idx on public.payments (period_month, status);
create index if not exists payments_lease_idx  on public.payments (lease_id);

create table if not exists public.maintenance_requests (
  id          uuid primary key default gen_random_uuid(),
  lease_id    uuid not null,
  tenant_id   uuid not null,
  store_id    uuid not null,
  title       text not null,
  description text,
  status      text not null default 'open'   check (status in ('open', 'in_progress', 'resolved')),
  priority    text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint maintenance_requests_lease_id_fkey  foreign key (lease_id)  references public.leases(id),
  constraint maintenance_requests_tenant_id_fkey foreign key (tenant_id) references public.profiles(id),
  constraint maintenance_requests_store_id_fkey  foreign key (store_id)  references public.stores(id)
);

create index if not exists maintenance_tenant_idx on public.maintenance_requests (tenant_id, created_at desc);

create table if not exists public.store_enquiries (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references public.stores(id) on delete cascade,
  name       text not null,
  email      text,
  phone      text,
  message    text,
  status     text not null default 'new' check (status in ('new', 'read', 'contacted')),
  created_at timestamptz not null default now()
);

-- Set when the enquiry is sent by a signed-in user, so they can track it.
alter table public.store_enquiries
  add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists store_enquiries_user_idx on public.store_enquiries (user_id);

create table if not exists public.fx_rates (
  id         uuid primary key default gen_random_uuid(),
  rate       numeric(10,2) not null check (rate > 0),
  set_by     uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Exactly one row: how tenants pay (shown live on the Pay Rent page).
create table if not exists public.payment_settings (
  id            uuid primary key default gen_random_uuid(),
  momo_number   text not null default '',
  momo_name     text not null default '',
  orange_number text not null default '',
  orange_name   text not null default '',
  banks         jsonb not null default '[]'::jsonb,
  updated_at    timestamptz not null default now(),
  singleton     boolean not null default true unique check (singleton)
);

-- Written by the owner when inviting a tenant. This is what authorises the
-- invited person to create their own lease on the Accept Invite page — without
-- a matching row here, nobody but the owner can create a lease.
create table if not exists public.tenant_invites (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  full_name     text,
  store_id      uuid not null references public.stores(id) on delete cascade,
  business_name text,
  business_type text,
  start_date    date,
  rent_usd      numeric(10,2) not null,
  created_by    uuid default auth.uid() references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  accepted_at   timestamptz
);

create index if not exists tenant_invites_email_idx on public.tenant_invites (lower(email));


-- ───────────────────────────────────────────────────────────────────────────
-- 2. FUNCTIONS & TRIGGERS
-- ───────────────────────────────────────────────────────────────────────────

-- SECURITY DEFINER so it can read profiles regardless of the caller's RLS.
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'owner'
  );
$$;

-- Does the signed-in user (matched by the email in their login token) hold an
-- un-used invite for this store at this rent?
create or replace function public.has_pending_invite(p_store_id uuid, p_rent_usd numeric)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tenant_invites i
    where lower(i.email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
      and i.store_id    = p_store_id
      and i.rent_usd    = p_rent_usd
      and i.accepted_at is null
  );
$$;

revoke all on function public.is_owner()                         from public;
revoke all on function public.has_pending_invite(uuid, numeric)  from public;
grant execute on function public.is_owner()                        to anon, authenticated, service_role;
grant execute on function public.has_pending_invite(uuid, numeric) to authenticated, service_role;

-- Every new auth user gets a profile. The role is ALWAYS 'tenant' here — it is
-- never read from sign-up metadata, because metadata is supplied by the browser
-- and anyone could send role=owner. The owner is promoted by hand (SETUP.md).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, full_name, email, phone)
  values (
    new.id,
    'tenant',
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'phone'), '')
  )
  on conflict (id) do nothing;
  return new;
exception when others then
  -- Never block a sign-up because of the profile row; section 7 backfills.
  raise warning 'handle_new_user failed for %: %', new.id, sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- When an active lease is created: mark the store occupied and close the invite.
create or replace function public.handle_new_lease()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'active' then
    update public.stores set status = 'occupied' where id = new.store_id;

    update public.tenant_invites i
       set accepted_at = now()
     where i.store_id = new.store_id
       and i.accepted_at is null
       and lower(i.email) = (select lower(p.email) from public.profiles p where p.id = new.tenant_id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_lease_created on public.leases;
create trigger on_lease_created
  after insert on public.leases
  for each row execute function public.handle_new_lease();

-- Payments: normalise the period to 'YYYY-MM' (the owner's Record Payment form
-- used to send 'YYYY-MM-DD'), and issue receipt numbers GR-00001, GR-00002 …
-- the moment a payment is confirmed.
create or replace function public.handle_payment_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.period_month := left(new.period_month, 7);

  -- Only the owner (or the dashboard / service role, where auth.uid() is null)
  -- can confirm, so only they consume a receipt number.
  if new.status = 'confirmed' and ((select auth.uid()) is null or public.is_owner()) then
    if new.receipt_number is null then
      new.receipt_number := 'GR-' || lpad(nextval('public.receipt_number_seq')::text, 5, '0');
    end if;
    if new.confirmed_at is null then
      new.confirmed_at := now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_payment_write on public.payments;
create trigger on_payment_write
  before insert or update on public.payments
  for each row execute function public.handle_payment_write();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists on_maintenance_update on public.maintenance_requests;
create trigger on_maintenance_update
  before update on public.maintenance_requests
  for each row execute function public.touch_updated_at();


-- ───────────────────────────────────────────────────────────────────────────
-- 3. GRANTS
-- RLS (section 4) decides which ROWS; these decide which tables each API role
-- may touch at all.
-- ───────────────────────────────────────────────────────────────────────────

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;

grant select, insert, update, delete on
  public.areas, public.stores, public.leases, public.payments,
  public.maintenance_requests, public.store_enquiries, public.fx_rates,
  public.payment_settings, public.tenant_invites
to authenticated;

-- Visitors who are not signed in: browse stores, send an enquiry. Nothing else.
revoke all on all tables in schema public from anon;
grant select on public.areas, public.stores to anon;
grant insert on public.store_enquiries     to anon;

-- Profiles: signed-in users can read (rows limited by RLS) and edit ONLY their
-- name, phone and avatar. `role` can not be changed through the API at all.
revoke all on public.profiles from authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone, avatar_url) on public.profiles to authenticated;


-- ───────────────────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY
-- ───────────────────────────────────────────────────────────────────────────

alter table public.profiles             enable row level security;
alter table public.areas                enable row level security;
alter table public.stores               enable row level security;
alter table public.leases               enable row level security;
alter table public.payments             enable row level security;
alter table public.maintenance_requests enable row level security;
alter table public.store_enquiries      enable row level security;
alter table public.fx_rates             enable row level security;
alter table public.payment_settings     enable row level security;
alter table public.tenant_invites       enable row level security;

-- ── profiles ───────────────────────────────────────────────────────────────
-- (No insert/delete policy: rows are created by the trigger and removed when
--  the auth user is deleted.)
drop policy if exists "profiles: read own or owner reads all" on public.profiles;
create policy "profiles: read own or owner reads all" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_owner());

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

drop policy if exists "profiles: owner updates any" on public.profiles;
create policy "profiles: owner updates any" on public.profiles
  for update to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- ── areas (public reference data) ──────────────────────────────────────────
drop policy if exists "areas: anyone can read" on public.areas;
create policy "areas: anyone can read" on public.areas
  for select to anon, authenticated
  using (true);

drop policy if exists "areas: owner manages" on public.areas;
create policy "areas: owner manages" on public.areas
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- ── stores (public listing) ────────────────────────────────────────────────
drop policy if exists "stores: anyone can read" on public.stores;
create policy "stores: anyone can read" on public.stores
  for select to anon, authenticated
  using (true);

drop policy if exists "stores: owner manages" on public.stores;
create policy "stores: owner manages" on public.stores
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- ── leases ─────────────────────────────────────────────────────────────────
drop policy if exists "leases: tenant reads own" on public.leases;
create policy "leases: tenant reads own" on public.leases
  for select to authenticated
  using (tenant_id = (select auth.uid()));

drop policy if exists "leases: invited tenant creates own" on public.leases;
create policy "leases: invited tenant creates own" on public.leases
  for insert to authenticated
  with check (
    tenant_id = (select auth.uid())
    and status = 'active'
    and end_date is null
    and agreement_url is null
    and public.has_pending_invite(store_id, monthly_rent_usd)
  );

drop policy if exists "leases: owner manages" on public.leases;
create policy "leases: owner manages" on public.leases
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- ── payments ───────────────────────────────────────────────────────────────
drop policy if exists "payments: tenant reads own" on public.payments;
create policy "payments: tenant reads own" on public.payments
  for select to authenticated
  using (tenant_id = (select auth.uid()));

-- A tenant can only submit a PENDING payment against their own active lease.
-- Confirming / rejecting / editing / deleting is owner-only.
drop policy if exists "payments: tenant submits own pending" on public.payments;
create policy "payments: tenant submits own pending" on public.payments
  for insert to authenticated
  with check (
    tenant_id = (select auth.uid())
    and status = 'pending'
    and confirmed_at   is null
    and confirmed_by   is null
    and receipt_number is null
    and exists (
      select 1 from public.leases l
      where l.id        = payments.lease_id
        and l.store_id  = payments.store_id
        and l.tenant_id = (select auth.uid())
        and l.status    = 'active'
    )
  );

drop policy if exists "payments: owner manages" on public.payments;
create policy "payments: owner manages" on public.payments
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- ── maintenance_requests ───────────────────────────────────────────────────
drop policy if exists "maintenance: tenant reads own" on public.maintenance_requests;
create policy "maintenance: tenant reads own" on public.maintenance_requests
  for select to authenticated
  using (tenant_id = (select auth.uid()));

drop policy if exists "maintenance: tenant submits own" on public.maintenance_requests;
create policy "maintenance: tenant submits own" on public.maintenance_requests
  for insert to authenticated
  with check (
    tenant_id = (select auth.uid())
    and status = 'open'
    and exists (
      select 1 from public.leases l
      where l.id        = maintenance_requests.lease_id
        and l.store_id  = maintenance_requests.store_id
        and l.tenant_id = (select auth.uid())
    )
  );

drop policy if exists "maintenance: owner manages" on public.maintenance_requests;
create policy "maintenance: owner manages" on public.maintenance_requests
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- ── store_enquiries (public form on the store page) ────────────────────────
drop policy if exists "enquiries: anyone can submit" on public.store_enquiries;
create policy "enquiries: anyone can submit" on public.store_enquiries
  for insert to anon, authenticated
  with check (
    status = 'new'
    and (user_id is null or user_id = (select auth.uid()))
    and char_length(name) between 1 and 120
    and char_length(coalesce(email,   '')) <= 200
    and char_length(coalesce(phone,   '')) <= 40
    and char_length(coalesce(message, '')) <= 4000
  );

drop policy if exists "enquiries: user reads own" on public.store_enquiries;
create policy "enquiries: user reads own" on public.store_enquiries
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "enquiries: owner manages" on public.store_enquiries;
create policy "enquiries: owner manages" on public.store_enquiries
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- ── fx_rates ───────────────────────────────────────────────────────────────
drop policy if exists "fx_rates: signed-in users read" on public.fx_rates;
create policy "fx_rates: signed-in users read" on public.fx_rates
  for select to authenticated
  using (true);

drop policy if exists "fx_rates: owner manages" on public.fx_rates;
create policy "fx_rates: owner manages" on public.fx_rates
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- ── payment_settings ───────────────────────────────────────────────────────
drop policy if exists "payment_settings: signed-in users read" on public.payment_settings;
create policy "payment_settings: signed-in users read" on public.payment_settings
  for select to authenticated
  using (true);

drop policy if exists "payment_settings: owner manages" on public.payment_settings;
create policy "payment_settings: owner manages" on public.payment_settings
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());

-- ── tenant_invites (owner only) ────────────────────────────────────────────
drop policy if exists "tenant_invites: owner manages" on public.tenant_invites;
create policy "tenant_invites: owner manages" on public.tenant_invites
  for all to authenticated
  using (public.is_owner())
  with check (public.is_owner());


-- ───────────────────────────────────────────────────────────────────────────
-- 5. STORAGE
-- store-photos is public (it feeds the public listing). payment-proofs and
-- lease-agreements are PRIVATE: they hold personal information, so the app
-- opens them through short-lived signed links, which the policies below gate.
-- ───────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('payment-proofs',   'payment-proofs',   false, 10485760, array['image/*', 'application/pdf']),
  ('store-photos',     'store-photos',     true, null,     array['image/*', 'video/*']),
  ('lease-agreements', 'lease-agreements', false, 10485760, array['image/*', 'application/pdf'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Tenants upload proofs into a folder named after their own user id.
drop policy if exists "proofs: tenant uploads to own folder" on storage.objects;
create policy "proofs: tenant uploads to own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Tenants can open their own proofs …
drop policy if exists "proofs: tenant reads own folder" on storage.objects;
create policy "proofs: tenant reads own folder" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- … and the agreement for their own lease (files are stored as <lease id>/…).
drop policy if exists "agreements: tenant reads own lease" on storage.objects;
create policy "agreements: tenant reads own lease" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'lease-agreements'
    and exists (
      select 1 from public.leases l
      where l.id::text    = (storage.foldername(name))[1]
        and l.tenant_id   = (select auth.uid())
    )
  );

-- The owner can read / upload / replace / delete in all three buckets.
drop policy if exists "storage: owner manages app buckets" on storage.objects;
create policy "storage: owner manages app buckets" on storage.objects
  for all to authenticated
  using (
    bucket_id in ('payment-proofs', 'store-photos', 'lease-agreements')
    and public.is_owner()
  )
  with check (
    bucket_id in ('payment-proofs', 'store-photos', 'lease-agreements')
    and public.is_owner()
  );


-- ───────────────────────────────────────────────────────────────────────────
-- 6. REALTIME (the owner dashboard listens to these two tables)
-- ───────────────────────────────────────────────────────────────────────────

do $$
begin
  begin
    alter publication supabase_realtime add table public.payments;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.maintenance_requests;
  exception when duplicate_object then null;
  end;
end;
$$;


-- ───────────────────────────────────────────────────────────────────────────
-- 7. STARTING DATA
-- ───────────────────────────────────────────────────────────────────────────

insert into public.areas (name, city) values
  ('Broad Street',   'Monrovia'),
  ('Carey Street',   'Monrovia'),
  ('Randall Street', 'Monrovia'),
  ('Paynesville',    'Monrovia')
on conflict (name) do nothing;

insert into public.fx_rates (rate)
select 180 where not exists (select 1 from public.fx_rates);

insert into public.payment_settings (momo_number, momo_name)
select '088 605 5575', 'George Rental'
where not exists (select 1 from public.payment_settings);

-- Give a profile to any auth user that does not have one yet (for example an
-- owner account created in the dashboard before this file was run).
insert into public.profiles (id, role, full_name, email)
select u.id, 'tenant', split_part(coalesce(u.email, ''), '@', 1), u.email
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);


-- ───────────────────────────────────────────────────────────────────────────
-- 8. SELF-CHECK — the result grid should list 10 tables, all with rls_on = true
-- ───────────────────────────────────────────────────────────────────────────

select
  c.relname                                                        as table_name,
  c.relrowsecurity                                                 as rls_on,
  (select count(*) from pg_policies p
    where p.schemaname = 'public' and p.tablename = c.relname)     as policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;
