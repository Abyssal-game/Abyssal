-- Classement de l'Épreuve du jour (à exécuter une fois dans Supabase : SQL Editor > New query > Run).
-- Même principe que le classement de la Descente : chacun ne garde que son meilleur score du jour.
create table if not exists public.trial_scores (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  score int not null check (score between 0 and 2000),
  rounds int not null check (rounds between 1 and 99),
  hp int not null check (hp between 0 and 100),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
create index if not exists trial_scores_day on public.trial_scores (day, score desc);
alter table public.trial_scores enable row level security;
drop policy if exists "épreuve lisible" on public.trial_scores;
create policy "épreuve lisible" on public.trial_scores for select to authenticated using (true);
revoke all on public.trial_scores from anon;
grant select on public.trial_scores to authenticated;

create or replace function public.submit_trial(p_day date, p_score int, p_rounds int, p_hp int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Non connecté'; end if;
  if p_day < current_date - 1 or p_day > current_date + 1 then raise exception 'Jour invalide'; end if;
  insert into public.trial_scores (user_id, day, score, rounds, hp)
  values (auth.uid(), p_day, p_score, p_rounds, p_hp)
  on conflict (user_id, day) do update
    set rounds = case when excluded.score > trial_scores.score then excluded.rounds else trial_scores.rounds end,
        hp = case when excluded.score > trial_scores.score then excluded.hp else trial_scores.hp end,
        score = greatest(trial_scores.score, excluded.score),
        updated_at = case when excluded.score > trial_scores.score then now() else trial_scores.updated_at end;
end $$;
revoke execute on function public.submit_trial(date, int, int, int) from public, anon;
grant execute on function public.submit_trial(date, int, int, int) to authenticated;
