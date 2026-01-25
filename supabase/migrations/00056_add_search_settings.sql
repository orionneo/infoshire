-- Add search settings to site_settings
INSERT INTO public.site_settings (key, value)
VALUES ('search_enabled', 'true')
ON CONFLICT (key) DO NOTHING;