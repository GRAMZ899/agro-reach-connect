DROP POLICY IF EXISTS "Sellers update own orders" ON public.orders;

DROP POLICY IF EXISTS "Sellers insert own products" ON public.products;
CREATE POLICY "Verified sellers insert submitted products"
ON public.products
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = seller_id
  AND moderation_status = 'submitted'
  AND EXISTS (
    SELECT 1
    FROM public.verifications v
    WHERE v.user_id = auth.uid()
      AND v.status = 'approved'
  )
);

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users receive own notification topics" ON realtime.messages;
CREATE POLICY "Users receive own notification topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  private = true
  AND split_part(topic, '-', 2) = auth.uid()::text
);

DROP POLICY IF EXISTS "Authenticated users create private notification topics" ON realtime.messages;
CREATE POLICY "Authenticated users create private notification topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  private = true
  AND split_part(topic, '-', 2) = auth.uid()::text
);

DROP POLICY IF EXISTS "Authenticated users update own notification topics" ON realtime.messages;
CREATE POLICY "Authenticated users update own notification topics"
ON realtime.messages
FOR UPDATE
TO authenticated
USING (
  private = true
  AND split_part(topic, '-', 2) = auth.uid()::text
)
WITH CHECK (
  private = true
  AND split_part(topic, '-', 2) = auth.uid()::text
);

DROP POLICY IF EXISTS "Authenticated users delete own notification topics" ON realtime.messages;
CREATE POLICY "Authenticated users delete own notification topics"
ON realtime.messages
FOR DELETE
TO authenticated
USING (
  private = true
  AND split_part(topic, '-', 2) = auth.uid()::text
);