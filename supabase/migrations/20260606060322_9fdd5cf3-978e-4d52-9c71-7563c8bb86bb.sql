ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS variety text,
  ADD COLUMN IF NOT EXISTS harvest_season text,
  ADD COLUMN IF NOT EXISTS negotiable boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS availability_timeline text NOT NULL DEFAULT 'Ready Now',
  ADD COLUMN IF NOT EXISTS ready_date date,
  ADD COLUMN IF NOT EXISTS moisture_content text,
  ADD COLUMN IF NOT EXISTS grade text,
  ADD COLUMN IF NOT EXISTS organic_status text NOT NULL DEFAULT 'Conventional',
  ADD COLUMN IF NOT EXISTS storage_method text,
  ADD COLUMN IF NOT EXISTS pickup_available boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS delivery_available boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS transport_assistance boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS district text,
  ADD COLUMN IF NOT EXISTS parish text,
  ADD COLUMN IF NOT EXISTS village text,
  ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS moderation_notes text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

UPDATE public.products
SET moderation_status = CASE WHEN available THEN 'approved' ELSE 'submitted' END
WHERE moderation_status IS NULL
   OR moderation_status NOT IN ('submitted', 'under_review', 'approved', 'rejected', 'requires_changes');

CREATE TABLE IF NOT EXISTS public.verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  full_legal_name text NOT NULL,
  contact_number text NOT NULL,
  email text,
  district text NOT NULL,
  parish text NOT NULL,
  village text NOT NULL,
  crops text NOT NULL,
  acres numeric,
  season_production_estimate text,
  bags_available numeric,
  expected_harvest_date date,
  availability_timeline text NOT NULL DEFAULT 'Ready Now',
  custom_availability_date date,
  momo_name text,
  momo_number text NOT NULL,
  momo_network text NOT NULL DEFAULT 'MTN',
  farm_photos text[] NOT NULL DEFAULT '{}'::text[],
  crop_photos text[] NOT NULL DEFAULT '{}'::text[],
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.verifications TO authenticated;
GRANT ALL ON public.verifications TO service_role;
ALTER TABLE public.verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own verification" ON public.verifications;
CREATE POLICY "Users manage own verification"
ON public.verifications
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins view all verifications" ON public.verifications;
CREATE POLICY "Admins view all verifications"
ON public.verifications
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins update verifications" ON public.verifications;
CREATE POLICY "Admins update verifications"
ON public.verifications
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users update own notifications" ON public.notifications;
CREATE POLICY "Users update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.verification_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  action text NOT NULL,
  previous_status text,
  new_status text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.verification_audit TO authenticated;
GRANT ALL ON public.verification_audit TO service_role;
ALTER TABLE public.verification_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage verification audit" ON public.verification_audit;
CREATE POLICY "Admins manage verification audit"
ON public.verification_audit
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP VIEW IF EXISTS public.seller_orders;
CREATE VIEW public.seller_orders
WITH (security_invoker = true) AS
SELECT
  o.id,
  o.product_id,
  p.title AS product_title,
  o.quantity,
  o.total_ugx,
  o.total_usd,
  o.currency,
  o.status,
  o.created_at,
  o.notes,
  o.seller_id
FROM public.orders o
LEFT JOIN public.products p ON p.id = o.product_id
WHERE o.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin');
GRANT SELECT ON public.seller_orders TO authenticated;
GRANT ALL ON public.seller_orders TO service_role;

DROP POLICY IF EXISTS "Anyone can view available products" ON public.products;
CREATE POLICY "Anyone can view available products"
ON public.products
FOR SELECT
TO anon, authenticated
USING (
  ((available = true) AND (moderation_status = 'approved'))
  OR (seller_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Buyers create orders" ON public.orders;
CREATE POLICY "Buyers create orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = buyer_id
  AND EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.id = product_id
      AND p.available = true
      AND p.moderation_status = 'approved'
  )
);

DROP POLICY IF EXISTS "Sellers select own orders" ON public.orders;
DROP POLICY IF EXISTS "Sellers update own orders status" ON public.orders;
CREATE POLICY "Sellers update own orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);

CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id uuid,
  _kind text,
  _title text,
  _body text DEFAULT NULL,
  _link text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
  VALUES (_user_id, _kind, _title, _body, _link, COALESCE(_metadata, '{}'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_admins(
  _kind text,
  _title text,
  _body text DEFAULT NULL,
  _link text DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, kind, title, body, link, metadata)
  SELECT ur.user_id, _kind, _title, _body, _link, COALESCE(_metadata, '{}'::jsonb)
  FROM public.user_roles ur
  WHERE ur.role = 'admin';
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_product_workflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT public.has_role(NEW.seller_id, 'admin') THEN
      SELECT v.status
      INTO v_status
      FROM public.verifications v
      WHERE v.user_id = NEW.seller_id
      ORDER BY v.updated_at DESC, v.created_at DESC
      LIMIT 1;

      IF COALESCE(v_status, 'not_verified') <> 'approved' THEN
        RAISE EXCEPTION 'Verification required before posting';
      END IF;

      NEW.moderation_status := COALESCE(NULLIF(NEW.moderation_status, ''), 'submitted');
      NEW.available := false;
    ELSE
      NEW.moderation_status := COALESCE(NULLIF(NEW.moderation_status, ''), 'approved');
      NEW.available := (NEW.quantity_available > 0);
    END IF;
  END IF;

  IF NEW.quantity_available <= 0 THEN
    NEW.available := false;
  ELSIF NEW.moderation_status = 'approved' THEN
    NEW.available := true;
  ELSIF NEW.moderation_status IN ('submitted', 'under_review', 'rejected', 'requires_changes') THEN
    NEW.available := false;
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_apply_product_workflow ON public.products;
CREATE TRIGGER trg_apply_product_workflow
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.apply_product_workflow();

CREATE OR REPLACE FUNCTION public.set_order_seller()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.products%ROWTYPE;
BEGIN
  SELECT *
  INTO v_product
  FROM public.products
  WHERE id = NEW.product_id;

  IF v_product.id IS NULL THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  IF v_product.moderation_status <> 'approved' OR v_product.available IS NOT TRUE THEN
    RAISE EXCEPTION 'This listing is not available for orders';
  END IF;

  NEW.seller_id := v_product.seller_id;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_set_order_seller ON public.orders;
CREATE TRIGGER trg_set_order_seller
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_order_seller();

CREATE OR REPLACE FUNCTION public.enforce_order_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_available numeric;
  v_status text;
BEGIN
  SELECT quantity_available, moderation_status
  INTO v_available, v_status
  FROM public.products
  WHERE id = NEW.product_id
  FOR UPDATE;

  IF v_available IS NULL THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  IF NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be greater than zero';
  END IF;

  IF v_status <> 'approved' THEN
    RAISE EXCEPTION 'This listing is not available for orders';
  END IF;

  IF NEW.quantity > v_available THEN
    RAISE EXCEPTION 'Only % available - please reduce your quantity', v_available;
  END IF;

  UPDATE public.products
  SET quantity_available = quantity_available - NEW.quantity,
      available = CASE WHEN quantity_available - NEW.quantity <= 0 THEN false ELSE available END
  WHERE id = NEW.product_id;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_seller_order_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() = NEW.seller_id AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
      OR NEW.buyer_phone IS DISTINCT FROM OLD.buyer_phone
      OR NEW.buyer_location IS DISTINCT FROM OLD.buyer_location
      OR NEW.product_id IS DISTINCT FROM OLD.product_id
      OR NEW.seller_id IS DISTINCT FROM OLD.seller_id
      OR NEW.quantity IS DISTINCT FROM OLD.quantity
      OR NEW.total_ugx IS DISTINCT FROM OLD.total_ugx
      OR NEW.total_usd IS DISTINCT FROM OLD.total_usd
      OR NEW.currency IS DISTINCT FROM OLD.currency
      OR NEW.notes IS DISTINCT FROM OLD.notes
      OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Sellers can only update order status';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_seller_order_updates ON public.orders;
CREATE TRIGGER trg_guard_seller_order_updates
BEFORE UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.guard_seller_order_updates();

CREATE OR REPLACE FUNCTION public.restore_stock_on_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    UPDATE public.products
    SET quantity_available = quantity_available + OLD.quantity,
        available = CASE WHEN moderation_status = 'approved' AND quantity_available + OLD.quantity > 0 THEN true ELSE false END
    WHERE id = OLD.product_id;
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_enforce_order_stock ON public.orders;
CREATE TRIGGER trg_enforce_order_stock
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.enforce_order_stock();
DROP TRIGGER IF EXISTS trg_restore_stock_on_cancel ON public.orders;
CREATE TRIGGER trg_restore_stock_on_cancel
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.restore_stock_on_cancel();

CREATE OR REPLACE FUNCTION public.notify_verification_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_admins(
      'verification_submitted',
      'Verification request submitted',
      COALESCE(NEW.full_legal_name, 'A farmer') || ' submitted verification details.',
      '/admin',
      jsonb_build_object('verification_id', NEW.id, 'user_id', NEW.user_id)
    );
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'verification_status',
      CASE NEW.status
        WHEN 'approved' THEN 'Verification approved'
        WHEN 'rejected' THEN 'Verification rejected'
        WHEN 'info_required' THEN 'More information requested'
        WHEN 'suspended' THEN 'Verification suspended'
        ELSE 'Verification updated'
      END,
      COALESCE(NEW.admin_notes, 'Your verification status has changed.'),
      '/seller/verify',
      jsonb_build_object('verification_id', NEW.id, 'status', NEW.status)
    );
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_verification_events ON public.verifications;
CREATE TRIGGER trg_notify_verification_events
AFTER INSERT OR UPDATE ON public.verifications
FOR EACH ROW
EXECUTE FUNCTION public.notify_verification_events();

CREATE OR REPLACE FUNCTION public.notify_product_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_admins(
      'listing_submitted',
      'New crop listing submitted',
      COALESCE(NEW.title, 'A listing') || ' is waiting for review.',
      '/admin',
      jsonb_build_object('product_id', NEW.id, 'seller_id', NEW.seller_id)
    );
    RETURN NEW;
  END IF;

  IF NEW.moderation_status IS DISTINCT FROM OLD.moderation_status THEN
    PERFORM public.create_notification(
      NEW.seller_id,
      'listing_review',
      CASE NEW.moderation_status
        WHEN 'approved' THEN 'Listing approved'
        WHEN 'rejected' THEN 'Listing rejected'
        WHEN 'requires_changes' THEN 'More information requested'
        ELSE 'Listing updated'
      END,
      COALESCE(NEW.moderation_notes, NEW.title || ' review status changed.'),
      '/seller',
      jsonb_build_object('product_id', NEW.id, 'status', NEW.moderation_status)
    );
  ELSIF row(NEW.title, NEW.description, NEW.price_ugx, NEW.price_usd, NEW.quantity_available, NEW.location, NEW.category, NEW.variety, NEW.grade, NEW.district, NEW.parish, NEW.village)
        IS DISTINCT FROM row(OLD.title, OLD.description, OLD.price_ugx, OLD.price_usd, OLD.quantity_available, OLD.location, OLD.category, OLD.variety, OLD.grade, OLD.district, OLD.parish, OLD.village) THEN
    PERFORM public.notify_admins(
      'listing_edited',
      'Listing edited',
      COALESCE(NEW.title, 'A listing') || ' was updated and may need review.',
      '/admin',
      jsonb_build_object('product_id', NEW.id, 'seller_id', NEW.seller_id)
    );
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_product_events ON public.products;
CREATE TRIGGER trg_notify_product_events
AFTER INSERT OR UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.notify_product_events();

CREATE OR REPLACE FUNCTION public.notify_order_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.create_notification(
      NEW.seller_id,
      'buyer_inquiry',
      'Buyer inquiry received',
      'A new order was placed for your listing.',
      '/seller',
      jsonb_build_object('order_id', NEW.id, 'product_id', NEW.product_id)
    );
    PERFORM public.notify_admins(
      'new_order',
      'New order placed',
      'A buyer placed an order that needs coordination.',
      '/admin',
      jsonb_build_object('order_id', NEW.id, 'product_id', NEW.product_id, 'seller_id', NEW.seller_id, 'buyer_id', NEW.buyer_id)
    );
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    PERFORM public.create_notification(
      NEW.buyer_id,
      'order_status',
      CASE NEW.status
        WHEN 'confirmed' THEN 'Orders are confirmed'
        WHEN 'delivered' THEN 'Order delivered'
        WHEN 'cancelled' THEN 'Order cancelled'
        ELSE 'Order updated'
      END,
      'Your order status is now ' || NEW.status || '.',
      '/orders',
      jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
    );
    PERFORM public.create_notification(
      NEW.seller_id,
      'order_status',
      'Order updated',
      'An order for your listing is now ' || NEW.status || '.',
      '/seller',
      jsonb_build_object('order_id', NEW.id, 'status', NEW.status)
    );
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_notify_order_events ON public.orders;
CREATE TRIGGER trg_notify_order_events
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_order_events();

DROP TRIGGER IF EXISTS verifications_updated ON public.verifications;
CREATE TRIGGER verifications_updated
BEFORE UPDATE ON public.verifications
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.verifications (
  user_id,
  status,
  full_legal_name,
  contact_number,
  email,
  district,
  parish,
  village,
  crops,
  momo_name,
  momo_number,
  momo_network,
  admin_notes,
  reviewed_at
)
SELECT
  p.id,
  'approved',
  COALESCE(NULLIF(p.full_name, ''), 'Harvest Hub Admin'),
  COALESCE(NULLIF(p.phone, ''), '+256 778 099 000'),
  p.email,
  COALESCE(NULLIF(split_part(COALESCE(p.location, ''), ',', 1), ''), 'Kampala'),
  'Central',
  'Office',
  'Administration',
  COALESCE(NULLIF(p.full_name, ''), 'Harvest Hub Admin'),
  COALESCE(NULLIF(p.phone, ''), '+256 778 099 000'),
  'MTN',
  'Auto-approved admin verification',
  now()
FROM public.profiles p
WHERE p.email = 'ionmasters14@gmail.com'
ON CONFLICT (user_id)
DO UPDATE SET
  status = 'approved',
  admin_notes = 'Auto-approved admin verification',
  reviewed_at = now();

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.orders';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'products'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.products';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END;
$$;

DROP POLICY IF EXISTS "Users upload own verification files" ON storage.objects;
CREATE POLICY "Users upload own verification files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'verifications'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
DROP POLICY IF EXISTS "Users view own verification files" ON storage.objects;
CREATE POLICY "Users view own verification files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'verifications'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  )
);
DROP POLICY IF EXISTS "Users delete own verification files" ON storage.objects;
CREATE POLICY "Users delete own verification files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'verifications'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
  )
);
DROP POLICY IF EXISTS "Admins manage verification files" ON storage.objects;
CREATE POLICY "Admins manage verification files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'verifications'
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'verifications'
  AND public.has_role(auth.uid(), 'admin')
);