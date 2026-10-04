export type UserType = 'user' | 'lister';
export type AvailabilityStatus = 'available' | 'booked' | 'unavailable';
export type BookingStatus = 'pending' | 'confirmed' | 'checked_in' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'refunded';
export type ReviewType = 'user_reviews_lister' | 'lister_reviews_user';
export type MediaType = 'image' | 'video';

export interface User {
  id: string;
  email: string;
  phone?: string;
  fullName: string;
  profilePicture?: string;
  userType: UserType;
  rating: number;
  verificationStatus: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  address: string;
  city: string;
  neighborhood?: string;
  lat?: number;
  lng?: number;
}

export interface Media {
  type: MediaType;
  url: string;
  thumbnail?: string;
}

export interface Apartment {
  id: string;
  listerId: string;
  name: string;
  description?: string;
  location: Location;
  pricePerNight: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  media: Media[];
  availabilityStatus: AvailabilityStatus;
  averageRating: number;
  totalReviews: number;
  favoritesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  userId: string;
  apartmentId: string;
  listerId: string;
  checkInDateTime: string;
  checkOutDateTime: string;
  totalPrice: number;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Ratings {
  cleanliness: number;
  accuracy: number;
  communication: number;
  location: number;
  value: number;
}

export interface Review {
  id: string;
  bookingId: string;
  reviewerId: string;
  revieweeId: string;
  apartmentId: string;
  reviewType: ReviewType;
  ratings: Ratings;
  overallRating: number;
  comment?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  apartmentId?: string;
  content: string;
  mediaUrls: string[];
  readStatus: boolean;
  sentAt: string;
}

export interface Favorite {
  id: string;
  userId: string;
  apartmentId: string;
  createdAt: string;
}

export interface ExternalApartment {
  id: string;
  name: string;
  description?: string;
  price?: string;
  pricePerNight?: number;
  location: string;
  neighborhood?: string;
  imageUrl?: string;
  images?: string[];
  sourceUrl: string;
  sourceName: string;
  bedrooms?: number;
  bathrooms?: number;
  amenities: string[];
  rating?: number;
  reviewCount?: number;
  propertyType?: string;
  squareFeet?: number;
  lat?: number;
  lng?: number;
  isExternal: true;
}
