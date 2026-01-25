-- Fix handle_new_user to extract name and phone from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_count int;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;
  
  INSERT INTO public.profiles (id, email, name, phone, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'client'::public.user_role END
  );
  
  RETURN NEW;
END;
$function$;

-- Backfill existing users with missing name and phone from auth.users metadata
UPDATE profiles p
SET 
  name = COALESCE(p.name, au.raw_user_meta_data->>'name'),
  phone = COALESCE(p.phone, au.raw_user_meta_data->>'phone')
FROM auth.users au
WHERE p.id = au.id
  AND (p.name IS NULL OR p.phone IS NULL OR p.name = '' OR p.phone = '')
  AND au.raw_user_meta_data IS NOT NULL;