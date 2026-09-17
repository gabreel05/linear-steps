begin;

create table public.calculations (
  id uuid not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  operation text not null check (operation in ('system', 'rref', 'inverse')),
  method text not null,
  title text not null check (btrim(title) <> '' and char_length(title) <= 120),
  schema_version integer not null check (schema_version = 1),
  algorithm_version text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint calculations_method_version check (
    (operation = 'system' and method = 'gauss' and algorithm_version = 'gauss-1')
    or (operation in ('rref', 'inverse') and method = 'gauss-jordan'
        and algorithm_version = 'gauss-jordan-1')
  ),
  -- Bound storage and check the envelope. This is not a mathematical proof.
  constraint calculations_payload_size check (octet_length(payload::text) <= 1048576),
  constraint calculations_payload_envelope check (coalesce(
    jsonb_typeof(payload) = 'object'
    and payload->'schemaVersion' = to_jsonb(schema_version)
    and payload->>'algorithmVersion' = algorithm_version
    and payload->>'method' = method
    and jsonb_typeof(payload->'steps') = 'array'
    and jsonb_typeof(payload->'pivots') = 'array'
    and jsonb_typeof(payload->'rank') = 'number'
    and case operation
      when 'system' then
        jsonb_typeof(payload->'input') = 'object'
        and jsonb_typeof(payload->'input'->'coefficients') = 'array'
        and jsonb_typeof(payload->'input'->'constants') = 'array'
        and jsonb_typeof(payload->'echelon') = 'array'
        and payload->>'classification' in ('unique', 'infinite', 'inconsistent')
      when 'rref' then
        jsonb_typeof(payload->'input') = 'array'
        and jsonb_typeof(payload->'reduced') = 'array'
        and not (payload ? 'classification')
      when 'inverse' then
        jsonb_typeof(payload->'input') = 'array'
        and jsonb_typeof(payload->'reduced') = 'array'
        and (payload->>'classification' = 'singular'
          or (payload->>'classification' = 'invertible'
              and jsonb_typeof(payload->'inverse') = 'array'))
      else false
    end,
    false
  ))
);

create index calculations_history_order
  on public.calculations (user_id, created_at desc, id desc);
create index calculations_history_operation
  on public.calculations (user_id, operation, created_at desc, id desc);

alter table public.calculations enable row level security;

-- Do not depend on the dashboard's default grants or automatic RLS settings.
revoke all on public.calculations from public, anon, authenticated;
grant select, delete on public.calculations to authenticated;
-- Identity and timestamp are supplied only by the database. No UPDATE grant.
grant insert (id, operation, method, title, schema_version, algorithm_version, payload)
  on public.calculations to authenticated;

create policy calculations_select_own on public.calculations
  for select to authenticated
  using ((select auth.uid()) = user_id);
create policy calculations_insert_own on public.calculations
  for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy calculations_delete_own on public.calculations
  for delete to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.calculations is
  'Private immutable client-produced calculation snapshots; not certified mathematical results.';

commit;
