-- ---------------------------------------------------------------------------
-- Applique d'un bloc : fonctions RLS + policies club_membres + policies clubs.
-- Si Supabase dit "syntax error at end of input" / LINE 0 : soit la requete
-- envoyee est vide, soit vous avez execute "selection" sans texte selectionne.
-- Conseil : Ctrl+A puis Run sur TOUT ce fichier (pas uniquement une ligne vide).
-- ---------------------------------------------------------------------------

SELECT 1 AS sanity_check;

-- Renommage facultatif pour les vieux schemas (init historique utilisait player_id).
DO $rename$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'club_memberships'
      AND column_name = 'player_id'
  )
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'club_memberships'
      AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.club_memberships RENAME COLUMN player_id TO user_id;
  END IF;
END;
$rename$
LANGUAGE plpgsql;

-- Compatible ENUM club_role OU text pour role (cast vers text dans les comparaisons).
-- Fonctionne que la colonne compte soit user_id ou player_id sur club_memberships.
CREATE OR REPLACE FUNCTION public.has_club_role(target_club_id uuid, allowed_roles text[])
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $fn$
DECLARE
  has_user_id_col boolean := EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'club_memberships'
      AND c.column_name = 'user_id'
  );
BEGIN
  IF has_user_id_col THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.club_memberships cm
      WHERE cm.club_id = target_club_id
        AND cm.user_id = auth.uid()
        AND cm.role::text = ANY (allowed_roles)
    );
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.club_memberships cm
    WHERE cm.club_id = target_club_id
      AND cm.player_id = auth.uid()
      AND cm.role::text = ANY (allowed_roles)
  );
END;
$fn$;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $fn$
DECLARE
  has_user_id_col boolean := EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'club_memberships'
      AND c.column_name = 'user_id'
  );
BEGIN
  IF has_user_id_col THEN
    RETURN EXISTS (
      SELECT 1 FROM public.club_memberships cm
      WHERE cm.user_id = auth.uid()
        AND cm.role::text = 'platform_admin'
    );
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.club_memberships cm
    WHERE cm.player_id = auth.uid()
      AND cm.role::text = 'platform_admin'
  );
END;
$fn$;

-- Policy sur club_memberships (une seule ligne; colonne UID detectee dynamiquement)
DO $mpol$
BEGIN
  EXECUTE 'drop policy if exists "club_memberships_select_self_or_admin" on public.club_memberships';

  IF EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'club_memberships'
      AND c.column_name = 'user_id'
  ) THEN
    EXECUTE $sql$
      create policy "club_memberships_select_self_or_admin"
      on public.club_memberships for select
      using (
        user_id = auth.uid() or public.is_platform_admin()
      );
    $sql$;
  ELSE
    EXECUTE $sql2$
      create policy "club_memberships_select_self_or_admin"
      on public.club_memberships for select
      using (
        player_id = auth.uid() or public.is_platform_admin()
      );
    $sql2$;
  END IF;
END;
$mpol$
LANGUAGE plpgsql;

-- Policies clubs (reposent sur has_club_role, pas besoin du nom exact de colonne UID ici).
DROP POLICY IF EXISTS "clubs_select_by_membership" ON public.clubs;

CREATE POLICY "clubs_select_by_membership"
  ON public.clubs FOR SELECT
  USING (
    public.has_club_role(id, ARRAY['player','club_staff','club_manager','platform_admin']::text[])
  );

DROP POLICY IF EXISTS "clubs_update_staff" ON public.clubs;

CREATE POLICY "clubs_update_staff"
  ON public.clubs FOR UPDATE
  USING (
    public.has_club_role(id, ARRAY['club_staff','club_manager','platform_admin']::text[])
  )
  WITH CHECK (
    public.has_club_role(id, ARRAY['club_staff','club_manager','platform_admin']::text[])
  );

