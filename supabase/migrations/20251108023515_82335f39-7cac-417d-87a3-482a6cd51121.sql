-- Add favorites_count column to apartments table
ALTER TABLE public.apartments 
ADD COLUMN favorites_count integer NOT NULL DEFAULT 0;

-- Create function to update favorites count
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for favorites insert
CREATE TRIGGER update_favorites_count_on_insert
AFTER INSERT ON public.favorites
FOR EACH ROW
EXECUTE FUNCTION public.update_apartment_favorites_count();

-- Create trigger for favorites delete
CREATE TRIGGER update_favorites_count_on_delete
AFTER DELETE ON public.favorites
FOR EACH ROW
EXECUTE FUNCTION public.update_apartment_favorites_count();

-- Initialize favorites_count for existing apartments
UPDATE public.apartments
SET favorites_count = (
  SELECT COUNT(*)
  FROM public.favorites
  WHERE favorites.apartment_id = apartments.id
);