-- Pre-signup identity check (email in auth.users, phone in public.profiles).
-- Callable by anon so the app can block duplicate registrations before auth.signUp.

CREATE OR REPLACE FUNCTION public.check_signup_identity_available(
  p_email text,
  p_phone_number text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(btrim(COALESCE(p_email, '')));
  v_phone text := nullif(btrim(COALESCE(p_phone_number, '')), '');
  v_email_taken boolean := false;
  v_phone_taken boolean := false;
BEGIN
  IF v_email <> '' THEN
    SELECT EXISTS (
      SELECT 1
      FROM auth.users
      WHERE lower(email) = v_email
    )
    INTO v_email_taken;
  END IF;

  IF v_phone IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE phone_number = v_phone
    )
    INTO v_phone_taken;
  END IF;

  RETURN jsonb_build_object(
    'email_taken', v_email_taken,
    'phone_taken', v_phone_taken
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_signup_identity_available(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_signup_identity_available(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_signup_identity_available(text, text) TO authenticated;

-- Belt-and-suspenders: reject profile creation when phone is already taken so a
-- duplicate auth user cannot be left behind if the client check is bypassed.
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
  VALUES (
    NEW.id,
    NULLIF(btrim(COALESCE(NEW.raw_user_meta_data ->> 'display_name', '')), ''),
    v_phone
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
