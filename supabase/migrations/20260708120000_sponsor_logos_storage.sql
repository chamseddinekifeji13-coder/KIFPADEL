-- Bucket public pour les logos sponsors (upload super admin + lecture publique).

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sponsor-logos',
  'sponsor-logos',
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "sponsor_logos_public_read" ON storage.objects;
CREATE POLICY "sponsor_logos_public_read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'sponsor-logos');

DROP POLICY IF EXISTS "sponsor_logos_super_admin_insert" ON storage.objects;
CREATE POLICY "sponsor_logos_super_admin_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'sponsor-logos'
    AND public.is_super_admin()
  );

DROP POLICY IF EXISTS "sponsor_logos_super_admin_update" ON storage.objects;
CREATE POLICY "sponsor_logos_super_admin_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'sponsor-logos'
    AND public.is_super_admin()
  )
  WITH CHECK (
    bucket_id = 'sponsor-logos'
    AND public.is_super_admin()
  );

DROP POLICY IF EXISTS "sponsor_logos_super_admin_delete" ON storage.objects;
CREATE POLICY "sponsor_logos_super_admin_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'sponsor-logos'
    AND public.is_super_admin()
  );
