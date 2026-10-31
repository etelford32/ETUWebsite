-- Steam account merge (auth-flow.md §9, "Account merge").
--
-- A player who signs in from the game first gets a Steam-only account
-- (synthetic email, ACCOUNT-01). If they later try to link that Steam ID to
-- the email account they made on the website, the link is refused because
-- profiles.steam_id is unique. merge_steam_account folds the Steam-only
-- account into the email account in one transaction:
--
--   * every row that points at the Steam account moves to the email account
--     (scores, ship designs, feedback, votes, telemetry, invites);
--   * the email account keeps its own identity (email, callsign, privacy)
--     and only fills blanks from the Steam account;
--   * access keeps the higher of the two: the higher role (user < moderator
--     < staff < dev < admin, the order of ROLES in lib/accountTiers.ts),
--     superuser and alpha access if either account had them (a superuser
--     is always an admin);
--   * game totals take the larger of the two (the game reports lifetime
--     totals that only move up, so summing would double count);
--   * the Steam ID and its ownership verification move across;
--   * the Steam account is left as status 'deleted' with no Steam ID or
--     callsign. The API route then deletes its auth user;
--   * one 'account_merge' row goes into admin_audit_log in the same
--     transaction, with both accounts' access before and after, so the
--     superuser console and /admin/users keep a history of every merge.
--
-- The caller (POST /api/steam/merge) has already proved the player controls
-- both accounts: a session on the email account, and a Steam OpenID
-- assertion for the Steam ID that signs in to the other one. Service role
-- only.

create or replace function public.merge_steam_account(
  p_source  uuid,
  p_target  uuid,
  p_steam_id text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  src            public.profiles%rowtype;
  dst            public.profiles%rowtype;
  v_scores       integer := 0;
  v_dup_scores   integer := 0;
  v_designs      integer := 0;
  v_feedback     integer := 0;
  v_votes        integer := 0;
  v_roles        constant text[] := array['user', 'moderator', 'staff', 'dev', 'admin'];
  v_role         text;
  v_superuser    boolean;
  v_src_email    text;
  v_dst_email    text;
  v_after        public.profiles%rowtype;
begin
  if p_source is null or p_target is null or p_source = p_target then
    raise exception 'merge_same_account' using errcode = '22023';
  end if;

  -- Lock both rows in a fixed order so two merges can't deadlock.
  perform 1 from public.profiles where id in (p_source, p_target) order by id for update;

  select * into src from public.profiles where id = p_source;
  select * into dst from public.profiles where id = p_target;
  if src.id is null or dst.id is null then
    raise exception 'merge_account_missing' using errcode = 'P0002';
  end if;
  if src.steam_id is distinct from p_steam_id then
    raise exception 'merge_steam_mismatch' using errcode = '22023';
  end if;
  if dst.steam_id is not null then
    raise exception 'merge_target_has_steam' using errcode = '22023';
  end if;
  if coalesce(src.status, 'active') <> 'active' or coalesce(dst.status, 'active') <> 'active' then
    raise exception 'merge_account_inactive' using errcode = '22023';
  end if;
  -- Only Steam-only accounts are folded away: one with a real email has its
  -- own way in, and deleting it would surprise its owner.
  select u.email into v_src_email from auth.users u where u.id = p_source;
  if v_src_email is null
     or lower(v_src_email) not like '%@steam.players.exploretheuniverse2175.com' then
    raise exception 'merge_source_not_steam_only' using errcode = '22023';
  end if;
  select u.email into v_dst_email from auth.users u where u.id = p_target;
  v_dst_email := coalesce(v_dst_email, dst.email);

  -- Access: whichever account had more keeps it.
  v_superuser := coalesce(dst.is_superuser, false) or coalesce(src.is_superuser, false);
  v_role := case
    when coalesce(array_position(v_roles, src.role), 1) > coalesce(array_position(v_roles, dst.role), 1)
      then src.role
    else coalesce(dst.role, 'user')
  end;
  if v_superuser then v_role := 'admin'; end if;

  -- 1 ── rows owned by the Steam account ─────────────────────────────────

  -- The same game run submitted under both accounts keeps the email
  -- account's copy (unique (user_id, run_id)).
  delete from public.player_scores s
   where s.user_id = p_source
     and s.run_id is not null
     and exists (select 1 from public.player_scores t
                  where t.user_id = p_target and t.run_id = s.run_id);
  get diagnostics v_dup_scores = row_count;

  update public.player_scores set user_id = p_target where user_id = p_source;
  get diagnostics v_scores = row_count;

  update public.ship_designs set user_id = p_target where user_id = p_source;
  get diagnostics v_designs = row_count;

  update public.feedback set user_id = p_target where user_id = p_source;
  get diagnostics v_feedback = row_count;
  update public.feedback_notifications set user_id = p_target where user_id = p_source;
  update public.backlog_items set user_id = p_target where user_id = p_source;

  -- One vote per player per item: drop the Steam account's vote where the
  -- email account already voted (the delete trigger fixes the counts).
  delete from public.feedback_votes v
   where v.user_id = p_source
     and exists (select 1 from public.feedback_votes t
                  where t.user_id = p_target and t.feedback_id = v.feedback_id);
  update public.feedback_votes set user_id = p_target where user_id = p_source;
  get diagnostics v_votes = row_count;

  delete from public.backlog_votes v
   where v.user_id = p_source
     and exists (select 1 from public.backlog_votes t
                  where t.user_id = p_target and t.backlog_item_id = v.backlog_item_id);
  update public.backlog_votes set user_id = p_target where user_id = p_source;

  -- History follows the player.
  update public.auth_events      set user_id = p_target where user_id = p_source;
  update public.user_sessions    set user_id = p_target where user_id = p_source;
  update public.analytics_events set user_id = p_target where user_id = p_source;
  update public.user_invites set accepted_user_id = p_target where accepted_user_id = p_source;
  update public.user_invites set invited_by       = p_target where invited_by       = p_source;
  -- lifecycle_jobs are emails for the synthetic address; they go with it.
  -- admin_audit_log is left as written.

  -- 2 ── free the unique values, then hand them over ────────────────────

  update public.profiles
     set steam_id = null,
         username = null,
         is_verified_owner = false,
         steam_purchase_verified_at = null,
         steam_ownership_checked_at = null,
         status = 'deleted'
   where id = p_source;

  update public.profiles d
     set steam_id                   = p_steam_id,
         username                   = coalesce(dst.username, src.username),
         username_changed_at        = case when dst.username is null then src.username_changed_at
                                           else dst.username_changed_at end,
         display_name               = coalesce(dst.display_name, src.display_name),
         avatar_url                 = coalesce(dst.avatar_url, src.avatar_url),
         faction_choice             = coalesce(dst.faction_choice, src.faction_choice),
         ship_class                 = coalesce(dst.ship_class, src.ship_class),
         role                       = v_role,
         is_superuser               = v_superuser,
         is_alpha_tester            = coalesce(dst.is_alpha_tester, false) or coalesce(src.is_alpha_tester, false),
         level                      = greatest(dst.level, src.level),
         xp                         = greatest(dst.xp, src.xp),
         total_kills                = greatest(dst.total_kills, src.total_kills),
         total_deaths               = greatest(dst.total_deaths, src.total_deaths),
         total_wins                 = greatest(dst.total_wins, src.total_wins),
         total_losses               = greatest(dst.total_losses, src.total_losses),
         total_playtime             = greatest(dst.total_playtime, src.total_playtime),
         highest_score              = greatest(dst.highest_score, src.highest_score),
         is_verified_owner          = coalesce(src.is_verified_owner, false),
         steam_purchase_verified_at = src.steam_purchase_verified_at,
         steam_ownership_checked_at = src.steam_ownership_checked_at,
         first_login_at             = least(dst.first_login_at, src.first_login_at),
         last_login_at              = greatest(dst.last_login_at, src.last_login_at),
         last_seen_at               = greatest(dst.last_seen_at, src.last_seen_at),
         login_count                = coalesce(dst.login_count, 0) + coalesce(src.login_count, 0)
   where d.id = p_target
  returning d.* into v_after;

  -- 3 ── history ─────────────────────────────────────────────────────────

  insert into public.admin_audit_log (actor_id, actor_email, target_id, target_email, action, details)
  values (
    p_target, v_dst_email, p_target, v_dst_email, 'account_merge',
    jsonb_build_object(
      'source', 'steam_merge',
      'steam_id', p_steam_id,
      'merged_user_id', p_source,
      'merged_email', v_src_email,
      'merged_username', src.username,
      'access_changed', v_after.role is distinct from dst.role
                        or v_after.is_superuser is distinct from dst.is_superuser
                        or v_after.is_alpha_tester is distinct from dst.is_alpha_tester,
      'before', jsonb_build_object(
        'account', jsonb_build_object('role', dst.role, 'tier', dst.tier, 'is_superuser', dst.is_superuser,
                                      'is_alpha_tester', dst.is_alpha_tester, 'username', dst.username),
        'merged_account', jsonb_build_object('role', src.role, 'tier', src.tier, 'is_superuser', src.is_superuser,
                                             'is_alpha_tester', src.is_alpha_tester, 'username', src.username,
                                             'is_verified_owner', src.is_verified_owner)
      ),
      'after', jsonb_build_object('role', v_after.role, 'tier', v_after.tier, 'is_superuser', v_after.is_superuser,
                                  'is_alpha_tester', v_after.is_alpha_tester, 'username', v_after.username),
      'moved', jsonb_build_object('scores', v_scores, 'duplicate_scores_dropped', v_dup_scores,
                                  'ship_designs', v_designs, 'feedback', v_feedback, 'votes', v_votes)
    )
  );

  return jsonb_build_object(
    'scores_moved', v_scores,
    'duplicate_scores_dropped', v_dup_scores,
    'ship_designs_moved', v_designs,
    'feedback_moved', v_feedback,
    'votes_moved', v_votes,
    'username', coalesce(dst.username, src.username),
    'adopted_username', dst.username is null and src.username is not null,
    'role', v_after.role,
    'role_before', dst.role,
    'is_superuser', v_after.is_superuser
  );
end;
$$;

revoke all on function public.merge_steam_account(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.merge_steam_account(uuid, uuid, text) to service_role;

comment on function public.merge_steam_account(uuid, uuid, text) is
  'Fold a Steam-only account (synthetic email) into an email account and move its Steam ID across. Called by POST /api/steam/merge after the player proved control of both.';
