-- ABYSSAL · v551 : filtre des pseudos renforcé (à coller dans Supabase : SQL Editor → New query → Run ; peut être relancé).
-- Remplace seulement la fonction pseudo_ok (le reste de 06-signalements.sql et 07-amis.sql ne change pas).
-- Les pseudos déjà choisis ne sont pas touchés : le filtre ne joue que quand un joueur choisit un pseudo.

-- v551 : mêmes règles que pseudoProblem (js/core/moderation.js) : chiffres déguisés (le 1 essayé comme i puis l),
-- lettres doublées ramenées à une, lettres seules séparées (« P U T E ») rassemblées, alphabet latin seulement, noms réservés.
create or replace function public.pseudo_ok(p text)
returns boolean language plpgsql immutable set search_path = public as $$
declare
  parts text[] := array[
    'nazi', 'hitler', 'siegheil', 'heilhitler', 'whitepower', 'pedophil', 'pedoph', 'salope', 'connard', 'connasse',
    'encule', 'batard', 'putain', 'niquetamere', 'tamere', 'nigger', 'nigga', 'faggot', 'fuck', 'bitch', 'pussy',
    'penis', 'vagin', 'porno', 'pornhub', 'tapette', 'gouine', 'bougnoul', 'youpin', 'bamboula', 'chinetoque', 'merde',
    'couille', 'branleur', 'pouffiasse', 'trisomique', 'terroriste', 'jihad', 'djihad', 'petasse', 'enfoire', 'salaud',
    'pedophile', 'grossepute', 'filsdepute', 'trouduc', 'suceuse', 'enculer', 'negresse', 'chintok', 'asshole',
    'bastard', 'motherf', 'cocksuck', 'dickhead', 'shithead', 'wanker', 'killyourself', 'blowjob', 'dildo', 'fvck',
    'phuck', 'biatch', 'hijodeputa', 'cabron', 'gilipollas', 'pendejo', 'maricon', 'mierda', 'joder', 'culero',
    'chingad', 'malparid', 'scheisse', 'arschloch', 'hurensohn', 'fotze', 'wichser', 'schlampe', 'missgeburt',
    'schwuchtel', 'ficken', 'fickdich', 'vaffanculo', 'stronzo', 'stronza', 'cazzo', 'puttana', 'frocio', 'minchia',
    'coglion', 'porcodio', 'porcamadonna', 'bastardo', 'caralho', 'fodase', 'buceta', 'arrombad', 'filhodaputa',
    'cuzao', 'vagabunda'
  ];
  words text[] := array[
    'con', 'cons', 'conne', 'pd', 'fdp', 'ntm', 'tg', 'pute', 'putes', 'bite', 'cul', 'anus', 'sexe', 'sex', 'viol',
    'violeur', 'nique', 'niquer', 'negre', 'negro', 'cunt', 'cock', 'slut', 'whore', 'kkk', 'pedale', 'zizi', 'shit',
    'admin', 'moderateur', 'modo', 'pede', 'pedo', 'dick', 'fag', 'kys', 'puta', 'putas', 'zorra', 'polla', 'verga',
    'hure', 'neger', 'fick', 'figa', 'twat', 'retard', 'rapist', 'viado', 'otario', 'porra', 'foder', 'puto', 'fck',
    'fuk', 'staff', 'support', 'moderator', 'mod', 'officiel', 'official'
  ];
  reserved text[] := array[
    'abysal', 'abisal', 'abyzal', 'abizal', 'abysai', 'abisai', 'legardien', 'leguardien', 'createur', 'creator',
    'developpeur', 'developer'
  ];
  base text; n text; sq text; one text; t text; run text; ws text[]; w text;
begin
  if p is null then return false; end if;
  p := btrim(p, E' \t\n\r');
  if char_length(p) < 3 or char_length(p) > 16 then return false; end if;
  if p !~ '^[A-Za-zÀ-ÖØ-öø-ÿŒœÆæ0-9_ -]+$' then return false; end if;
  if position('1488' in regexp_replace(p, '[^0-9]', '', 'g')) > 0 then return false; end if;
  base := lower(regexp_replace(normalize(p, NFD), '[\u0300-\u036f]', '', 'g'));
  base := replace(replace(replace(replace(replace(base, 'Œ', 'oe'), 'œ', 'oe'), 'Æ', 'ae'), 'æ', 'ae'), 'ß', 'ss');
  foreach one in array array['i', 'l'] loop
    n := translate(base, '0123456789', 'o' || one || 'zeasgtbg');
    sq := regexp_replace(regexp_replace(n, '[^a-z]', '', 'g'), '(.)\1+', '\1', 'g');
    if exists (select 1 from unnest(reserved || parts) x where position(regexp_replace(x, '(.)\1+', '\1', 'g') in sq) > 0) then return false; end if;
    ws := '{}'; run := '';
    foreach t in array regexp_split_to_array(n, '[^a-z]+') loop
      if t = '' then continue; end if;
      if char_length(t) = 1 then run := run || t; continue; end if;
      if run <> '' then ws := ws || run; run := ''; end if;
      ws := ws || t;
    end loop;
    if run <> '' then ws := ws || run; end if;
    foreach w in array ws loop
      if w = any(words) then return false; end if;
      if exists (select 1 from unnest(words) x where char_length(regexp_replace(x, '(.)\1+', '\1', 'g')) > 1
                 and regexp_replace(x, '(.)\1+', '\1', 'g') = regexp_replace(w, '(.)\1+', '\1', 'g')) then return false; end if;
    end loop;
  end loop;
  return true;
end $$;

-- Vérification : doit afficher false, true, false, false, false.
select public.pseudo_ok('Gros con') as gros_con, public.pseudo_ok('Faucon noir') as faucon, public.pseudo_ok('C0NN4RD') as leet, public.pseudo_ok('L3  G4rd1en') as reserve, public.pseudo_ok('B 1 T C H') as espaces;
