-- Staff accounts for Arden Stores. School ledger stays shared;
-- these rows record who signed in and (optionally) which staff identifier they hold.

create table if not exists app_users (
  user_id text primary key,
  email text,
  display_name text,
  role text not null default 'storekeeper'
    check (role in ('admin', 'storekeeper', 'teacher', 'viewer')),
  staff_identifier text references staff(identifier),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table stock_movements
  add column if not exists actor_user_id text;

create index if not exists app_users_staff_idx on app_users (staff_identifier);
create index if not exists movements_actor_idx on stock_movements (actor_user_id);
