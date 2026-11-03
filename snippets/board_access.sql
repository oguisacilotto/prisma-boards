-- Who can see a board, decided in the database (written for this showcase).
-- Rules: the owner; invited members; managers of the board's department (read-only).
-- Someone marked on a single card is handled by the card policy, not here.

create table boards (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id),
  department_id uuid,
  title         text not null
);

create table board_members (
  board_id    uuid references boards(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,
  can_edit    boolean not null default false,
  can_comment boolean not null default true,
  primary key (board_id, user_id)
);

-- security definer: reads profiles/members without recursing into their own policies
create function can_read_board(b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from boards where id = b and owner_id = auth.uid())
      or exists (select 1 from board_members where board_id = b and user_id = auth.uid())
      or exists (
           select 1
             from boards bd
             join profiles p on p.id = auth.uid()
            where bd.id = b
              and p.role in ('manager', 'admin')
              and bd.department_id = any (array_append(p.extra_department_ids, p.department_id))
         );
$$;

alter table boards enable row level security;
create policy boards_read  on boards for select using (can_read_board(id));
create policy boards_write on boards for update using (owner_id = auth.uid());

alter table board_members enable row level security;
create policy members_read  on board_members for select using (can_read_board(board_id));
-- only the owner shares
create policy members_write on board_members for all
  using      (exists (select 1 from boards where id = board_id and owner_id = auth.uid()))
  with check (exists (select 1 from boards where id = board_id and owner_id = auth.uid()));

-- Each person orders their sidebar: one array per user, saved through an RPC that
-- runs as the caller (security invoker), so the policy below still applies.
create table user_prefs (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  board_order uuid[] not null default '{}'
);
alter table user_prefs enable row level security;
create policy prefs_own on user_prefs for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create function set_board_order(ids uuid[]) returns void
language sql security invoker as $$
  insert into user_prefs (user_id, board_order) values (auth.uid(), coalesce(ids, '{}'))
  on conflict (user_id) do update set board_order = excluded.board_order;
$$;
