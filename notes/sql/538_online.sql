-- 5.38 online update: apply with the Supabase MCP (apply_migration) when the release is merged.
-- 1) results: the bigger total wins; squad rating then time only break a tie; Seasonal CHAOS = most points
-- 2) the finisher (result.by) isn't notified about a result they've just watched
-- 3) a level per room (online defaults to Hard; Quick match is Hard)
-- 4) online_get hides your opponent's XI until you've finished yours
alter table public.rooms add column if not exists level text;

drop function if exists public.gm_finalise(text);
create or replace function public.gm_finalise(p_code text, p_by text default null)
 returns void language plpgsql security definer set search_path to 'public' as $function$
declare r public.rooms; h jsonb; g jsonb; hp numeric := 0; gp numeric := 0; ht numeric; gt numeric; w text := 'draw';
begin
  select * into r from public.rooms where code = p_code for update;
  h := r.race -> 'host'; g := r.race -> 'guest';
  if r.status = 'done' or not coalesce((h ->> 'done')::boolean, false) or not coalesce((g ->> 'done')::boolean, false) then return; end if;
  if r.variant = 'hattrick' then
    ht := coalesce((h ->> 't')::numeric, 0); gt := coalesce((g ->> 't')::numeric, 0);
    w := case when ht > gt then 'host' when gt > ht then 'guest' else 'draw' end;
  elsif r.kind = 'race' and r.variant in ('target', 'chaos', 'szchaos') then
    if r.variant = 'target' then ht := -coalesce((h ->> 'd')::numeric, 1e9); gt := -coalesce((g ->> 'd')::numeric, 1e9);
    else ht := coalesce((h ->> 'c')::numeric, 0); gt := coalesce((g ->> 'c')::numeric, 0); end if;
    w := case when ht > gt then 'host' when gt > ht then 'guest' else 'draw' end;
  else
    ht := coalesce((h ->> 't')::numeric, 0); gt := coalesce((g ->> 't')::numeric, 0);
    w := case when ht > gt then 'host' when gt > ht then 'guest' else 'draw' end;
    if w = 'draw' then
      ht := coalesce((h ->> 'r')::numeric, 0); gt := coalesce((g ->> 'r')::numeric, 0);
      w := case when ht > gt then 'host' when gt > ht then 'guest' else 'draw' end;
    end if;
    if w = 'draw' and r.kind = 'race' then
      ht := coalesce((h ->> 'ms')::numeric, 1e12); gt := coalesce((g ->> 'ms')::numeric, 1e12);
      w := case when ht < gt then 'host' when gt < ht then 'guest' else 'draw' end;
    end if;
  end if;
  if w = 'host' then hp := 100; elsif w = 'guest' then gp := 100; else hp := 50; gp := 50; end if;
  update public.rooms set status = 'done', turn = null, updated_at = now(),
    result = jsonb_build_object('host', hp, 'guest', gp, 'winner', w) || case when p_by is null then '{}'::jsonb else jsonb_build_object('by', p_by) end
  where code = p_code;
end $function$;

do $$ declare d text; begin
  d := pg_get_functiondef('public.online_move(text,text,text,integer,jsonb,jsonb,text,jsonb)'::regprocedure);
  d := replace(d, 'perform public.gm_finalise(r.code);', 'perform public.gm_finalise(r.code, seat);');
  execute d;
  d := pg_get_functiondef('public.app_inbox'::regproc);
  d := replace(d, $q$where r.status = 'done' and r.updated_at > now() - interval '2 days' and (r.host_user = me or r.guest_user = me)$q$,
                  $q$where r.status = 'done' and r.updated_at > now() - interval '2 days' and (r.host_user = me or r.guest_user = me) and coalesce(r.result ->> 'by', '') <> s.seat$q$);
  execute d;
  d := pg_get_functiondef('public.quick_match'::regproc);
  d := replace(d, $q$update public.rooms set quick = true where code = res ->> 'code';$q$, $q$update public.rooms set quick = true, level = 'hard' where code = res ->> 'code';$q$);
  d := replace(d, $q$(p_kind = 'race' and coalesce(p_variant, '') not in ('', 'chaos', 'target'))$q$, $q$(p_kind = 'race' and coalesce(p_variant, '') not in ('', 'chaos', 'target', 'szchaos'))$q$);
  execute d;
end $$;

drop function if exists public.online_create(text, text, text, text, text, text);
create or replace function public.online_create(p_user text, p_key text, p_kind text, p_stat text, p_opp text default null::text, p_variant text default null::text, p_level text default null::text)
 returns json language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare u text := public.gm_auth(p_user, p_key); o text; c text; alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int;
begin
  if u is null then return json_build_object('error', 'auth'); end if;
  if p_kind not in ('race', 'duel', 'auction') or coalesce(p_stat, 'goals') not in ('goals', 'assists', 'apps')
    or (p_variant is not null and p_variant !~ '^[a-z]{1,12}$') or coalesce(p_level, 'normal') not in ('easy', 'normal', 'hard') then return json_build_object('error', 'bad'); end if;
  if nullif(btrim(p_opp), '') is not null then
    select username into o from public.players where lower(username) = lower(btrim(p_opp));
    if o is null then return json_build_object('error', 'no_user'); end if;
    if o = u then return json_build_object('error', 'self'); end if;
  end if;
  delete from public.rooms where (status = 'open' and updated_at < now() - interval '14 days')
    or (status in ('playing', 'declined') and updated_at < now() - interval '60 days')
    or (host_user is null and updated_at < now() - interval '2 days')
    or updated_at < now() - interval '365 days';
  loop
    c := '';
    for i in 1..5 loop c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1); end loop;
    exit when not exists (select 1 from public.rooms where code = c);
  end loop;
  insert into public.rooms (code, kind, variant, stat, seed, host, host_user, guest, guest_user, status, turn, level)
  values (c, p_kind, p_variant, coalesce(p_stat, 'goals'), 'online:' || c || ':' || encode(extensions.gen_random_bytes(4), 'hex'),
    u, u, o, o, case when o is null then 'open' else 'playing' end,
    case p_kind when 'duel' then 'guest' when 'auction' then 'both' else 'host' end, nullif(p_level, 'normal'));
  if o is not null then perform public.gm_befriend(u, o); end if;
  return json_build_object('code', c, 'seat', 'host');
end $function$;

create or replace function public.online_get(p_code text, p_user text default null::text)
 returns json language plpgsql security definer set search_path to 'public' as $function$
declare r public.rooms; seat text; other text; race jsonb;
begin
  select * into r from public.rooms where code = upper(btrim(p_code));
  if not found then return null; end if;
  seat := case when lower(r.host_user) = lower(p_user) then 'host' when lower(r.guest_user) = lower(p_user) then 'guest' end;
  race := r.race;
  if seat is not null then
    update public.rooms set seen = seen || jsonb_build_object(seat, extract(epoch from now())) where code = r.code;
    other := case when seat = 'host' then 'guest' else 'host' end;
    if r.kind = 'race' and r.status <> 'done' and not coalesce((race -> seat ->> 'done')::boolean, false) and race ? other then
      race := race || jsonb_build_object(other, (race -> other) - 'x');
    end if;
  end if;
  return json_build_object('code', r.code, 'kind', r.kind, 'variant', r.variant, 'stat', r.stat, 'seed', r.seed, 'host', r.host_user, 'guest', r.guest_user,
    'moves', r.moves, 'race', race, 'turn', r.turn, 'status', r.status, 'result', r.result, 'seen', r.seen, 'level', r.level,
    'bids_in', (select coalesce(json_agg(k), '[]'::json) from jsonb_object_keys(r.secret) k where k in ('host', 'guest')),
    'now', extract(epoch from now()), 'quick', r.quick, 'created', r.created_at, 'updated', r.updated_at);
end $function$;
