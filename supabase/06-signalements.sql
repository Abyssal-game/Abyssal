-- ABYSSAL · étape 6 : modération des pseudos (demandée par les stores pour les classements publics).
-- À coller dans Supabase : SQL Editor → New query → Run. Peut être relancé sans risque.
--
-- 1. Filtre : le serveur refuse les pseudos insultants (mêmes listes que js/core/moderation.js).
-- 2. Signalement : un joueur connecté peut signaler le pseudo d'un autre joueur.
-- 3. Masquage automatique : un pseudo signalé par 3 joueurs différents est remplacé par « Joueur-xxxxxxxx ».
--    Le joueur concerné peut en choisir un autre (le filtre s'applique).
--
-- Pour voir les signalements (réservé au propriétaire, dans le SQL Editor) :
--   select r.created_at, r.pseudo, r.reason, p.pseudo as pseudo_actuel
--   from public.pseudo_reports r left join public.profiles p on p.id = r.target
--   order by r.created_at desc limit 100;

-- ——— 1. Filtre ————————————————————————————————————————————————————————
create or replace function public.pseudo_ok(p text)
returns boolean language plpgsql immutable set search_path = public as $$
declare
  parts text[] := array[
    'nazi', 'hitler', 'siegheil', 'whitepower', 'pedophil', 'pedoph', 'salope', 'connard', 'connasse',
    'encule', 'batard', 'putain', 'niquetamere', 'tamere', 'nigger', 'nigga', 'faggot',
    'fuck', 'bitch', 'pussy', 'penis', 'vagin', 'porno', 'pornhub', 'tapette', 'gouine', 'bougnoul',
    'youpin', 'bamboula', 'chinetoque', 'merde', 'couille', 'branleur', 'pouffiasse',
    'trisomique', 'terroriste', 'jihad', 'djihad'
  ];
  words text[] := array[
    'con', 'cons', 'conne', 'pd', 'fdp', 'ntm', 'tg', 'pute', 'putes', 'bite', 'cul', 'anus', 'sexe', 'sex',
    'viol', 'violeur', 'nique', 'niquer', 'negre', 'negro', 'cunt', 'cock', 'slut', 'whore',
    'kkk', 'pedale', 'zizi', 'shit', 'admin', 'moderateur', 'modo'
  ];
  n text; sq text;
begin
  if p is null then return false; end if;
  n := translate(lower(p), 'àáâãäåāçćèéêëēìíîïñòóôõöùúûüýÿ013457', 'aaaaaaacceeeeeiiiinooooouuuuyyoieast');
  n := replace(replace(n, 'œ', 'oe'), 'æ', 'ae');
  sq := regexp_replace(n, '[^a-z]', '', 'g');
  if exists (select 1 from unnest(parts) w where position(w in sq) > 0) then return false; end if;
  if regexp_split_to_array(n, '[^a-z]+') && words then return false; end if;
  return true;
end $$;

create or replace function public.profiles_pseudo_check()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.pseudo is not distinct from old.pseudo then return new; end if;
  if not public.pseudo_ok(new.pseudo) then
    raise exception 'Ce pseudo n’est pas accepté. Choisis-en un autre.';
  end if;
  return new;
end $$;
drop trigger if exists profiles_pseudo_check on public.profiles;
create trigger profiles_pseudo_check before insert or update of pseudo on public.profiles
  for each row execute function public.profiles_pseudo_check();

-- ——— 2. Signalements ——————————————————————————————————————————————————
create table if not exists public.pseudo_reports (
  reporter uuid not null references auth.users(id) on delete cascade,
  target uuid not null references public.profiles(id) on delete cascade,
  pseudo text not null,
  reason text not null check (reason in ('insulte', 'haine', 'sexuel', 'usurpation', 'autre')),
  created_at timestamptz not null default now(),
  primary key (reporter, target, pseudo)
);
create index if not exists pseudo_reports_target on public.pseudo_reports (target, pseudo);
create index if not exists pseudo_reports_reporter on public.pseudo_reports (reporter, created_at);
-- Table fermée : personne ne la lit ni ne l'écrit par l'API, tout passe par report_pseudo().
alter table public.pseudo_reports enable row level security;
revoke all on public.pseudo_reports from anon, authenticated;

-- Renvoie 'ok', ou 'masqué' quand ce signalement fait masquer le pseudo.
create or replace function public.report_pseudo(p_target uuid, p_reason text)
returns text language plpgsql security definer set search_path = public as $$
declare cur text; n int;
begin
  if auth.uid() is null then raise exception 'Connecte-toi d’abord.'; end if;
  if p_target = auth.uid() then raise exception 'Tu ne peux pas signaler ton propre pseudo.'; end if;
  if p_reason not in ('insulte', 'haine', 'sexuel', 'usurpation', 'autre') then raise exception 'Motif invalide.'; end if;
  select pseudo into cur from public.profiles where id = p_target;
  if cur is null then raise exception 'Ce joueur n’existe plus.'; end if;
  select count(*) into n from public.pseudo_reports where reporter = auth.uid() and created_at > now() - interval '1 day';
  if n >= 20 then raise exception 'Trop de signalements aujourd’hui. Réessaie demain.'; end if;
  insert into public.pseudo_reports (reporter, target, pseudo, reason)
  values (auth.uid(), p_target, cur, p_reason)
  on conflict do nothing;
  -- ——— 3. Masquage automatique ———
  select count(distinct reporter) into n from public.pseudo_reports where target = p_target and pseudo = cur;
  if n >= 3 then
    update public.profiles set pseudo = 'Joueur-' || substr(md5(p_target::text), 1, 8), updated_at = now() where id = p_target;
    return 'masqué';
  end if;
  return 'ok';
end $$;
revoke execute on function public.report_pseudo(uuid, text) from public, anon;
grant execute on function public.report_pseudo(uuid, text) to authenticated;

-- Vérification : doit afficher false, true, false.
select public.pseudo_ok('Gros con') as gros_con, public.pseudo_ok('Faucon noir') as faucon, public.pseudo_ok('C0nnard') as leet;
