-- Sign in with Apple: accept full_name metadata, tolerate hidden / relay emails.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_phone text := nullif(
    btrim(COALESCE(NEW.raw_user_meta_data ->> 'phone_number', '')),
    ''
  );
  v_display_name text := nullif(
    btrim(
      COALESCE(
        NEW.raw_user_meta_data ->> 'display_name',
        NEW.raw_user_meta_data ->> 'full_name',
        ''
      )
    ),
    ''
  );
BEGIN
  IF v_phone IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE phone_number = v_phone
  ) THEN
    RAISE EXCEPTION 'phone_number_already_registered'
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.profiles (id, full_name, phone_number)
  VALUES (NEW.id, v_display_name, v_phone)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
