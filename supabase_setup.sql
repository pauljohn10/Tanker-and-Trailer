-- ====================================================================
-- AL NOOR UNITED TRANSPORTATION - SUPABASE DATABASE MIGRATION SCRIPT
-- ====================================================================
-- This script sets up the entire relational database system in Supabase.
-- Paste and execute this directly in the Supabase SQL Editor.
-- ====================================================================

-- 1. Enable Required Extensions
create extension if not exists "uuid-ossp" schema public;
create extension if not exists "pgcrypto" schema extensions;

-- 2. Create Custom Types & Enums
do $$
begin
    if not exists (select 1 from pg_type where typname = 'user_role') then
        create type public.user_role as enum ('super_admin', 'admin', 'manager', 'staff', 'viewer');
    end if;
    if not exists (select 1 from pg_type where typname = 'user_status') then
        create type public.user_status as enum ('active', 'suspended', 'inactive');
    end if;
end$$;

-- 3. Create Profiles Table (Linked to Supabase Auth)
create table if not exists public.profiles (
    id uuid primary key references auth.users on delete cascade,
    username text unique not null,
    email text not null,
    name text not null,
    role public.user_role not null default 'viewer'::public.user_role,
    status public.user_status not null default 'active'::public.user_status,
    avatar_url text,
    branch_station text, -- Password/Branch storage field (acts as password field for backend syncing)
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

-- 4. Create Tanker Records Table
create table if not exists public.tanker_records (
    sn serial primary key,
    aramco_tank_number text,
    new_tank_number text unique not null,
    classification text not null check (classification in ('STEEL', 'ALUMINUM')),
    model text not null,
    product text not null,
    quantity integer not null,
    authorized_vehicle text,
    plate_number text, -- Backup/alias column to support systems referencing plate_number or authorized_vehicle
    region text,
    status text default 'OPERATIONAL'::text not null,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

-- 5. Create Audit Logs Table
create table if not exists public.audit_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references public.profiles(id) on delete set null,
    username text not null,
    user_role text not null,
    action text not null,
    details text not null,
    timestamp timestamp with time zone default now() not null
);

-- 6. Create System Settings Table (Singleton Row constraint)
create table if not exists public.system_settings (
    id integer primary key check (id = 1) default 1,
    allow_public_sharing boolean default true not null,
    enable_audit_trails boolean default true not null,
    default_pagination_size integer default 15 not null,
    maintenance_mode boolean default false not null,
    updated_at timestamp with time zone default now() not null
);

-- 7. Automatic updated_at triggers
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists tr_profiles_updated_at on public.profiles;
create trigger tr_profiles_updated_at
    before update on public.profiles
    for each row execute function public.handle_updated_at();

drop trigger if exists tr_tanker_records_updated_at on public.tanker_records;
create trigger tr_tanker_records_updated_at
    before update on public.tanker_records
    for each row execute function public.handle_updated_at();

drop trigger if exists tr_system_settings_updated_at on public.system_settings;
create trigger tr_system_settings_updated_at
    before update on public.system_settings
    for each row execute function public.handle_updated_at();


-- Trigger to sync authorized_vehicle and plate_number columns for compatibility
create or replace function public.sync_tanker_plates()
returns trigger as $$
begin
    if (TG_OP = 'INSERT') then
        if new.authorized_vehicle is not null and new.plate_number is null then
            new.plate_number := new.authorized_vehicle;
        elsif new.plate_number is not null and new.authorized_vehicle is null then
            new.authorized_vehicle := new.plate_number;
        end if;
    elsif (TG_OP = 'UPDATE') then
        if new.authorized_vehicle is distinct from old.authorized_vehicle then
            new.plate_number := new.authorized_vehicle;
        elsif new.plate_number is distinct from old.plate_number then
            new.authorized_vehicle := new.plate_number;
        end if;
    end if;
    return new;
end;
$$ language plpgsql;

drop trigger if exists tr_sync_tanker_plates on public.tanker_records;
create trigger tr_sync_tanker_plates
    before insert or update on public.tanker_records
    for each row execute function public.sync_tanker_plates();


-- 8. Auth Sync Trigger (Autocreates Public Profile on Auth Sign Up)
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, username, email, name, role, status, avatar_url)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
        new.email,
        coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'viewer'::public.user_role),
        'active'::public.user_status,
        new.raw_user_meta_data->>'avatar_url'
    )
    on conflict (id) do nothing;
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();


-- 9. Helper Security Definer Functions (Bypasses Profile RLS recursion)
drop function if exists public.get_current_user_role() cascade;
create or replace function public.get_current_user_role()
returns public.user_role as $$
    select role::public.user_role from public.profiles where id = auth.uid();
$$ language sql security definer set search_path = public;

drop function if exists public.is_active_user() cascade;
create or replace function public.is_active_user()
returns boolean as $$
    select status::text = 'active' from public.profiles where id = auth.uid();
$$ language sql security definer set search_path = public;


-- 10. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.tanker_records enable row level security;
alter table public.audit_logs enable row level security;
alter table public.system_settings enable row level security;


-- 11. Profile Policies
drop policy if exists "Allow select profiles for anyone" on public.profiles;
create policy "Allow select profiles for anyone" on public.profiles
    for select using (true);

drop policy if exists "Allow insert profiles for anyone" on public.profiles;
create policy "Allow insert profiles for anyone" on public.profiles
    for insert with check (true);

drop policy if exists "Allow users to update own profile or admins to update all" on public.profiles;
create policy "Allow users to update own profile or admins to update all" on public.profiles
    for update using (
        auth.uid() = id or 
        public.get_current_user_role() in ('admin', 'super_admin')
    );

drop policy if exists "Allow admin/super_admin to delete profiles" on public.profiles;
create policy "Allow admin/super_admin to delete profiles" on public.profiles
    for delete using (public.get_current_user_role() in ('admin', 'super_admin'));


-- 12. Tanker Records Policies
drop policy if exists "Allow select for active users or public sharing" on public.tanker_records;
create policy "Allow select for active users or public sharing" on public.tanker_records
    for select using (
        public.is_active_user() or 
        (select allow_public_sharing from public.system_settings where id = 1)
    );

drop policy if exists "Allow writing for authorized roles" on public.tanker_records;
create policy "Allow writing for authorized roles" on public.tanker_records
    for insert with check (
        public.is_active_user() and 
        public.get_current_user_role() in ('super_admin', 'admin', 'manager', 'staff')
    );

drop policy if exists "Allow update for authorized roles" on public.tanker_records;
create policy "Allow update for authorized roles" on public.tanker_records
    for update using (
        public.is_active_user() and 
        public.get_current_user_role() in ('super_admin', 'admin', 'manager', 'staff')
    );

drop policy if exists "Allow delete for authorized roles" on public.tanker_records;
create policy "Allow delete for authorized roles" on public.tanker_records
    for delete using (
        public.is_active_user() and 
        public.get_current_user_role() in ('super_admin', 'admin', 'manager')
    );


-- 13. Audit Log Policies
drop policy if exists "Allow select audit logs for managers/admins" on public.audit_logs;
create policy "Allow select audit logs for managers/admins" on public.audit_logs
    for select using (
        public.is_active_user() and 
        public.get_current_user_role() in ('super_admin', 'admin', 'manager')
    );

drop policy if exists "Allow insert audit logs for active users" on public.audit_logs;
create policy "Allow insert audit logs for active users" on public.audit_logs
    for insert with check (public.is_active_user());


-- 14. System Settings Policies
drop policy if exists "Allow read settings" on public.system_settings;
create policy "Allow read settings" on public.system_settings
    for select using (true);

drop policy if exists "Allow update settings for admins" on public.system_settings;
create policy "Allow update settings for admins" on public.system_settings
    for update using (
        public.is_active_user() and 
        public.get_current_user_role() in ('super_admin', 'admin')
    );


-- 15. Insert Initial Default Singleton Row for Settings
insert into public.system_settings (id, allow_public_sharing, enable_audit_trails, default_pagination_size, maintenance_mode)
values (1, true, true, 15, false)
on conflict (id) do nothing;


-- 16. Pre-seed Default Users inside Supabase auth.users (triggers profile creation)
do $$
begin
    -- 16.1 Seed Admin if not exists by email or ID
    begin
        if not exists (select 1 from auth.users where email = 'admin@alnoor.com' or id = '00000000-0000-0000-0000-000000000001') then
            insert into auth.users (
                id,
                instance_id,
                email,
                encrypted_password,
                email_confirmed_at,
                raw_app_meta_data,
                raw_user_meta_data,
                created_at,
                updated_at,
                aud,
                role
            ) values (
                '00000000-0000-0000-0000-000000000001',
                '00000000-0000-0000-0000-000000000000',
                'admin@alnoor.com',
                extensions.crypt('adminpassword', extensions.gen_salt('bf', 10)),
                now(),
                '{"provider":"email","providers":["email"]}',
                '{"name":"Mr. Mana Ahmed","username":"admin","role":"admin"}',
                now(),
                now(),
                'authenticated',
                'authenticated'
            );
        end if;
    exception when others then
        raise notice 'Admin user already exists or seeding failed: %', SQLERRM;
    end;

    -- 16.2 Seed Staff if not exists by email or ID
    begin
        if not exists (select 1 from auth.users where email = 'staff@alnoor.com' or id = '00000000-0000-0000-0000-000000000002') then
            insert into auth.users (
                id,
                instance_id,
                email,
                encrypted_password,
                email_confirmed_at,
                raw_app_meta_data,
                raw_user_meta_data,
                created_at,
                updated_at,
                aud,
                role
            ) values (
                '00000000-0000-0000-0000-000000000002',
                '00000000-0000-0000-0000-000000000000',
                'staff@alnoor.com',
                extensions.crypt('staffpassword', extensions.gen_salt('bf', 10)),
                now(),
                '{"provider":"email","providers":["email"]}',
                '{"name":"Gyno Tayobong","username":"staff","role":"staff"}',
                now(),
                now(),
                'authenticated',
                'authenticated'
            );
        end if;
    exception when others then
        raise notice 'Staff user already exists or seeding failed: %', SQLERRM;
    end;

    -- 16.3 Seed Viewer if not exists by email or ID
    begin
        if not exists (select 1 from auth.users where email = 'viewer@alnoor.com' or id = '00000000-0000-0000-0000-000000000003') then
            insert into auth.users (
                id,
                instance_id,
                email,
                encrypted_password,
                email_confirmed_at,
                raw_app_meta_data,
                raw_user_meta_data,
                created_at,
                updated_at,
                aud,
                role
            ) values (
                '00000000-0000-0000-0000-000000000003',
                '00000000-0000-0000-0000-000000000000',
                'viewer@alnoor.com',
                extensions.crypt('viewerpassword', extensions.gen_salt('bf', 10)),
                now(),
                '{"provider":"email","providers":["email"]}',
                '{"name":"Ahmed Rafat","username":"viewer","role":"viewer"}',
                now(),
                now(),
                'authenticated',
                'authenticated'
            );
        end if;
    exception when others then
        raise notice 'Viewer user already exists or seeding failed: %', SQLERRM;
    end;
end$$;


-- ====================================================================
-- 17. CAPACITY APPLICATION CATEGORIES & SPECIAL STANDBY LEDGER TABLES
-- ====================================================================

-- 17.1 Create Capacity Application Categories Table
create table if not exists public.capacity_categories (
    id serial primary key,
    name text unique not null,
    min_capacity integer not null,
    max_capacity integer not null,
    quantity integer default 0,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 17.2 Create Special Standby / Exception Ledger Table
create table if not exists public.special_standby_ledger (
    id serial primary key,
    sn text unique not null,
    product text not null,
    capacity integer not null,
    status text not null,
    created_at timestamp with time zone default now() not null,
    updated_at timestamp with time zone default now() not null
);

-- 17.3 Triggers for updated_at
drop trigger if exists tr_capacity_categories_updated_at on public.capacity_categories;
create trigger tr_capacity_categories_updated_at
    before update on public.capacity_categories
    for each row execute function public.handle_updated_at();

drop trigger if exists tr_special_standby_ledger_updated_at on public.special_standby_ledger;
create trigger tr_special_standby_ledger_updated_at
    before update on public.special_standby_ledger
    for each row execute function public.handle_updated_at();

-- 17.4 Enable RLS
alter table public.capacity_categories enable row level security;
alter table public.special_standby_ledger enable row level security;

-- 17.10 Insert default capacity categories if empty
insert into public.capacity_categories (name, min_capacity, max_capacity, quantity)
select 'DAYNA', 5000, 12000, 8
where not exists (select 1 from public.capacity_categories where name = 'DAYNA');

insert into public.capacity_categories (name, min_capacity, max_capacity, quantity)
select 'SIX', 14000, 22000, 16
where not exists (select 1 from public.capacity_categories where name = 'SIX');

insert into public.capacity_categories (name, min_capacity, max_capacity, quantity)
select 'TN-2', 30000, 42000, 78
where not exists (select 1 from public.capacity_categories where name = 'TN-2');

-- 17.5 RLS Policies for Capacity Categories
drop policy if exists "Allow select capacity_categories" on public.capacity_categories;
create policy "Allow select capacity_categories" on public.capacity_categories
    for select using (true);

drop policy if exists "Allow writing capacity_categories for authorized roles" on public.capacity_categories;
create policy "Allow writing capacity_categories for authorized roles" on public.capacity_categories
    for insert with check (
        public.is_active_user() and 
        public.get_current_user_role() in ('super_admin', 'admin', 'manager')
    );

drop policy if exists "Allow update capacity_categories for authorized roles" on public.capacity_categories;
create policy "Allow update capacity_categories for authorized roles" on public.capacity_categories
    for update using (
        public.is_active_user() and 
        public.get_current_user_role() in ('super_admin', 'admin', 'manager')
    );

drop policy if exists "Allow delete capacity_categories for authorized roles" on public.capacity_categories;
create policy "Allow delete capacity_categories for authorized roles" on public.capacity_categories
    for delete using (
        public.is_active_user() and 
        public.get_current_user_role() in ('super_admin', 'admin', 'manager')
    );

-- 17.6 RLS Policies for Special Standby Ledger
drop policy if exists "Allow select special_standby_ledger" on public.special_standby_ledger;
create policy "Allow select special_standby_ledger" on public.special_standby_ledger
    for select using (true);

drop policy if exists "Allow writing special_standby_ledger for authorized roles" on public.special_standby_ledger;
create policy "Allow writing special_standby_ledger for authorized roles" on public.special_standby_ledger
    for insert with check (
        public.is_active_user() and 
        public.get_current_user_role() in ('super_admin', 'admin', 'manager', 'staff')
    );

drop policy if exists "Allow update special_standby_ledger for authorized roles" on public.special_standby_ledger;
create policy "Allow update special_standby_ledger for authorized roles" on public.special_standby_ledger
    for update using (
        public.is_active_user() and 
        public.get_current_user_role() in ('super_admin', 'admin', 'manager', 'staff')
    );

drop policy if exists "Allow delete special_standby_ledger for authorized roles" on public.special_standby_ledger;
create policy "Allow delete special_standby_ledger for authorized roles" on public.special_standby_ledger
    for delete using (
        public.is_active_user() and 
        public.get_current_user_role() in ('super_admin', 'admin', 'manager')
    );

-- 17.7 Pre-seed initial default categories
insert into public.capacity_categories (name, min_capacity, max_capacity)
values 
('DAYNA', 5000, 12000),
('SIX', 14000, 22000),
('TN-2', 30000, 42000)
on conflict (name) do nothing;

-- 17.8 Pre-seed initial default special standby ledger entries
insert into public.special_standby_ledger (sn, product, capacity, status)
values 
('275747', 'PETROL', 36000, 'NOT USE'),
('275749', 'PETROL', 36000, 'NOT USE'),
('277068', 'DIESEL', 36000, 'NOT USE'),
('277038', 'DIESEL', 36000, 'NOT USE'),
('277039', 'DIESEL', 36000, 'NOT USE'),
('273521', 'PETROL', 36000, 'SAIF CUSTODY'),
('276948', 'FUEL OIL', 36000, 'NOT USE'),
('156776', 'PETROL', 36000, 'FOR UPDATES'),
('269866', 'DIESEL', 36000, 'IN WORKSHOP'),
('272549', 'PETROL', 36000, 'IN WORKSHOP')
on conflict (sn) do nothing;
