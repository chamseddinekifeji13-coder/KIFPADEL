-- Bucket public pour les logos club (upload staff + lecture publique).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'club-logos',
  'club-logos',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "club_logos_public_read" ON storage.objects;
CREATE POLICY "club_logos_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'club-logos');

DROP POLICY IF EXISTS "club_logos_staff_insert" ON storage.objects;
CREATE POLICY "club_logos_staff_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'club-logos'
    AND (
      public.is_super_admin()
      OR public.has_club_role(
        (storage.foldername(name))[1]::uuid,
        ARRAY['club_staff', 'club_manager', 'club_admin', 'platform_admin']
      )
    )
  );

DROP POLICY IF EXISTS "club_logos_staff_update" ON storage.objects;
CREATE POLICY "club_logos_staff_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'club-logos'
    AND (
      public.is_super_admin()
      OR public.has_club_role(
        (storage.foldername(name))[1]::uuid,
        ARRAY['club_staff', 'club_manager', 'club_admin', 'platform_admin']
      )
    )
  )
  WITH CHECK (
    bucket_id = 'club-logos'
    AND (
      public.is_super_admin()
      OR public.has_club_role(
        (storage.foldername(name))[1]::uuid,
        ARRAY['club_staff', 'club_manager', 'club_admin', 'platform_admin']
      )
    )
  );

DROP POLICY IF EXISTS "club_logos_staff_delete" ON storage.objects;
CREATE POLICY "club_logos_staff_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'club-logos'
    AND (
      public.is_super_admin()
      OR public.has_club_role(
        (storage.foldername(name))[1]::uuid,
        ARRAY['club_staff', 'club_manager', 'club_admin', 'platform_admin']
      )
    )
  );
