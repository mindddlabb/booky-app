-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE user_type AS ENUM ('user', 'lister');
CREATE TYPE availability_status AS ENUM ('available', 'booked', 'unavailable');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'checked_in', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'refunded');
CREATE TYPE review_type AS ENUM ('user_reviews_lister', 'lister_reviews_user');
CREATE TYPE media_type AS ENUM ('image', 'video');

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  phone TEXT,
  full_name TEXT NOT NULL,
  profile_picture TEXT,
  user_type user_type NOT NULL DEFAULT 'user',
  rating DECIMAL(3,2) DEFAULT 0.00,
  verification_status BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create apartments table
CREATE TABLE public.apartments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lister_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  neighborhood TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  price_per_night DECIMAL(10, 2) NOT NULL,
  bedrooms INTEGER NOT NULL,
  bathrooms INTEGER NOT NULL,
  amenities TEXT[],
  media JSONB DEFAULT '[]'::jsonb,
  availability_status availability_status DEFAULT 'available',
  average_rating DECIMAL(3,2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  apartment_id UUID NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  lister_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  check_in_date_time TIMESTAMPTZ NOT NULL,
  check_out_date_time TIMESTAMPTZ NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  status booking_status DEFAULT 'pending',
  payment_status payment_status DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  apartment_id UUID NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  review_type review_type NOT NULL,
  cleanliness_rating INTEGER CHECK (cleanliness_rating BETWEEN 1 AND 5),
  accuracy_rating INTEGER CHECK (accuracy_rating BETWEEN 1 AND 5),
  communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
  location_rating INTEGER CHECK (location_rating BETWEEN 1 AND 5),
  value_rating INTEGER CHECK (value_rating BETWEEN 1 AND 5),
  overall_rating DECIMAL(3,2) NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  apartment_id UUID REFERENCES public.apartments(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  media_urls TEXT[],
  read_status BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create favorites table
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  apartment_id UUID NOT NULL REFERENCES public.apartments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, apartment_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Apartments RLS Policies
CREATE POLICY "Anyone can view available apartments"
  ON public.apartments FOR SELECT
  USING (true);

CREATE POLICY "Listers can create apartments"
  ON public.apartments FOR INSERT
  WITH CHECK (auth.uid() = lister_id);

CREATE POLICY "Listers can update own apartments"
  ON public.apartments FOR UPDATE
  USING (auth.uid() = lister_id);

CREATE POLICY "Listers can delete own apartments"
  ON public.apartments FOR DELETE
  USING (auth.uid() = lister_id);

-- Bookings RLS Policies
CREATE POLICY "Users can view own bookings"
  ON public.bookings FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = lister_id);

CREATE POLICY "Users can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users and listers can update bookings"
  ON public.bookings FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = lister_id);

-- Reviews RLS Policies
CREATE POLICY "Anyone can view reviews"
  ON public.reviews FOR SELECT
  USING (true);

CREATE POLICY "Users can create reviews for completed bookings"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() = reviewer_id);

-- Messages RLS Policies
CREATE POLICY "Users can view own messages"
  ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send messages"
  ON public.messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update own messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Favorites RLS Policies
CREATE POLICY "Users can view own favorites"
  ON public.favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create favorites"
  ON public.favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own favorites"
  ON public.favorites FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, user_type, profile_picture)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    NEW.raw_user_meta_data->>'phone',
    COALESCE((NEW.raw_user_meta_data->>'user_type')::user_type, 'user'),
    NEW.raw_user_meta_data->>'profile_picture'
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_apartments_updated_at
  BEFORE UPDATE ON public.apartments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;