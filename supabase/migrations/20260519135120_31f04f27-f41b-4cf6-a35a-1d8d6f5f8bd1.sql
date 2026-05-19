DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='orders_buyer_id_fkey') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='orders_seller_id_fkey') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_seller_id_fkey FOREIGN KEY (seller_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='orders_product_id_fkey') THEN
    ALTER TABLE public.orders ADD CONSTRAINT orders_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_order_stock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_available numeric;
BEGIN
  SELECT quantity_available INTO v_available FROM public.products WHERE id = NEW.product_id FOR UPDATE;
  IF v_available IS NULL THEN RAISE EXCEPTION 'Product not found'; END IF;
  IF NEW.quantity <= 0 THEN RAISE EXCEPTION 'Quantity must be greater than zero'; END IF;
  IF NEW.quantity > v_available THEN
    RAISE EXCEPTION 'Only % available - please reduce your quantity', v_available;
  END IF;
  UPDATE public.products
    SET quantity_available = quantity_available - NEW.quantity,
        available = CASE WHEN quantity_available - NEW.quantity <= 0 THEN false ELSE available END
    WHERE id = NEW.product_id;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.enforce_order_stock() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_enforce_order_stock ON public.orders;
CREATE TRIGGER trg_enforce_order_stock BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_order_stock();

CREATE OR REPLACE FUNCTION public.restore_stock_on_cancel()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    UPDATE public.products
      SET quantity_available = quantity_available + OLD.quantity,
          available = true
      WHERE id = OLD.product_id;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.restore_stock_on_cancel() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_restore_stock_on_cancel ON public.orders;
CREATE TRIGGER trg_restore_stock_on_cancel AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.restore_stock_on_cancel();