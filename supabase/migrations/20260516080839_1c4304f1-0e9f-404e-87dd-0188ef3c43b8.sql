
-- Restrict has_role execute to authenticated users only
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- Trigger functions: keep SECURITY DEFINER but restrict execute
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- Tighten storage SELECT: only allow reading specific objects, not bucket listing.
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
CREATE POLICY "Public read product images" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'products' AND (storage.foldername(name))[1] IS NOT NULL);

-- ensure search_path set
ALTER FUNCTION public.set_updated_at() SET search_path = public;
