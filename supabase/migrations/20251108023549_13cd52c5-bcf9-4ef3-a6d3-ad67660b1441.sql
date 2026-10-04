-- Fix search_path for update_apartment_favorites_count function
CREATE OR REPLACE FUNCTION public.update_apartment_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.apartments
    SET favorites_count = favorites_count + 1
    WHERE id = NEW.apartment_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.apartments
    SET favorites_count = GREATEST(favorites_count - 1, 0)
    WHERE id = OLD.apartment_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;