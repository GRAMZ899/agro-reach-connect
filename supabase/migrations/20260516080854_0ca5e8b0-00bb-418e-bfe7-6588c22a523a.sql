
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role app_role;
BEGIN
  v_role := COALESCE((NEW.raw_user_meta_data->>'account_type')::app_role, 'buyer'::app_role);

  INSERT INTO public.profiles (id, email, full_name, phone, location, account_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'location', ''),
    v_role::text
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT DO NOTHING;

  -- Auto-promote designated admin
  IF NEW.email = 'ionmasters14@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT DO NOTHING;
    UPDATE public.profiles SET account_type = 'admin' WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;
