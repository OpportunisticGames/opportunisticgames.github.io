-- 5.39 sweep. Already applied to the server (16 Oct 2026):
--   scores_score_check 0..1,000,000 (was 10,000: a 10,639 on CHAOS Hard was refused); scores_meta_check < 6000 (was 2000)
--   submit_score saves least(greatest(score, 0), 1,000,000), so a negative CHAOS score isn't refused outright
--   best_players: Easy boards count half (gm_easy_board); gm_board_name/gm_main_board/gm_easy_board search_path set
--   app_inbox: a result says the real totals ("912 v 1,828", "You were 10 off the target…"), not "Final score 100–0"
--   gm_push(text[]) no longer callable by anon (the triggers still run it); index on challenges(parent)
--   Edge Function push v5: skips what a phone has had already (notes/edge/push.ts) instead of failing inserts
--
-- Run 16 Oct 2026, after 5.39 went live (kept for the record):

-- 1) online_get needs your key to know your seat. Without it nobody's XI shows until a race is over (and "seen"
--    isn't written as you), so nobody can read their opponent's XI mid-race by calling it without a name.
drop function if exists public.online_get(text, text);
create or replace function public.online_get(p_code text, p_user text default null::text, p_key text default null::text)
 returns json language plpgsql security definer set search_path to 'public' as $function$
declare r public.rooms; seat text; other text; race jsonb; u text;
begin
  select * into r from public.rooms where code = upper(btrim(p_code));
  if not found then return null; end if;
  u := case when p_key is null then null else public.gm_auth(p_user, p_key) end;
  seat := case when u is null then null when lower(r.host_user) = lower(u) then 'host' when lower(r.guest_user) = lower(u) then 'guest' end;
  race := r.race;
  if seat is not null then
    update public.rooms set seen = seen || jsonb_build_object(seat, extract(epoch from now())) where code = r.code;
    other := case when seat = 'host' then 'guest' else 'host' end;
    if r.kind = 'race' and r.status <> 'done' and not coalesce((race -> seat ->> 'done')::boolean, false) and race ? other then
      race := race || jsonb_build_object(other, (race -> other) - 'x');
    end if;
  elsif r.kind = 'race' and r.status <> 'done' then
    if race ? 'host' then race := race || jsonb_build_object('host', (race -> 'host') - 'x'); end if;
    if race ? 'guest' then race := race || jsonb_build_object('guest', (race -> 'guest') - 'x'); end if;
  end if;
  return json_build_object('code', r.code, 'kind', r.kind, 'variant', r.variant, 'stat', r.stat, 'seed', r.seed, 'host', r.host_user, 'guest', r.guest_user,
    'moves', r.moves, 'race', race, 'turn', r.turn, 'status', r.status, 'result', r.result, 'seen', r.seen, 'level', r.level, 'reacts', r.reacts,
    'bids_in', (select coalesce(json_agg(k), '[]'::json) from jsonb_object_keys(r.secret) k where k in ('host', 'guest')),
    'now', extract(epoch from now()), 'quick', r.quick, 'created', r.created_at, 'updated', r.updated_at);
end $function$;
grant execute on function public.online_get(text, text, text) to anon, authenticated;

-- 2) renaming your account brings your challenges, 🔔 feed, invites and referrals with you; deleting it clears them,
--    so whoever takes the name later doesn't inherit them (friends keep their side of old challenges)
--    (written so line breaks and spaces don't matter when it's pasted)
do $$ declare d text; n text; begin
  d := pg_get_functiondef('public.rename_account'::regproc);
  n := regexp_replace(d, 'update public\.name_reports set reporter = nn where reporter = u;\s*return ''ok'';', 'update public.name_reports set reporter = nn where reporter = u; update public.challenges set owner = nn where owner_user = u; update public.challenges set owner_user = nn where owner_user = u; update public.challenges set to_user = nn where to_user = u; update public.challenge_plays set name = nn where username = u; update public.challenge_plays set username = nn where username = u; update public.challenge_invites set to_user = nn where to_user = u; update public.activity set username = nn where username = u; update public.referrals set inviter = nn where inviter = u; update public.referrals set invitee = nn where invitee = u; return ''ok'';');
  if n = d then raise exception 'rename_account: end not found'; end if;
  execute n;
  d := pg_get_functiondef('public.delete_account'::regproc);
  n := regexp_replace(d, 'delete from public\.players where username = u;', 'delete from public.activity where username = u; delete from public.challenge_invites where to_user = u; delete from public.referrals where inviter = u or invitee = u; update public.challenge_plays set username = null where username = u; update public.challenges set owner_user = null where owner_user = u; update public.challenges set to_user = null where to_user = u; delete from public.players where username = u;');
  if n = d then raise exception 'delete_account: end not found'; end if;
  execute n;
end $$;
