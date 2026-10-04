export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      apartments: {
        Row: {
          address: string
          amenities: string[] | null
          availability_status:
            | Database["public"]["Enums"]["availability_status"]
            | null
          average_rating: number | null
          bathrooms: number
          bedrooms: number
          city: string
          created_at: string
          description: string | null
          favorites_count: number
          id: string
          latitude: number | null
          lister_id: string
          longitude: number | null
          media: Json | null
          name: string
          neighborhood: string | null
          price_per_night: number
          total_reviews: number | null
          updated_at: string
        }
        Insert: {
          address: string
          amenities?: string[] | null
          availability_status?:
            | Database["public"]["Enums"]["availability_status"]
            | null
          average_rating?: number | null
          bathrooms: number
          bedrooms: number
          city: string
          created_at?: string
          description?: string | null
          favorites_count?: number
          id?: string
          latitude?: number | null
          lister_id: string
          longitude?: number | null
          media?: Json | null
          name: string
          neighborhood?: string | null
          price_per_night: number
          total_reviews?: number | null
          updated_at?: string
        }
        Update: {
          address?: string
          amenities?: string[] | null
          availability_status?:
            | Database["public"]["Enums"]["availability_status"]
            | null
          average_rating?: number | null
          bathrooms?: number
          bedrooms?: number
          city?: string
          created_at?: string
          description?: string | null
          favorites_count?: number
          id?: string
          latitude?: number | null
          lister_id?: string
          longitude?: number | null
          media?: Json | null
          name?: string
          neighborhood?: string | null
          price_per_night?: number
          total_reviews?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apartments_lister_id_fkey"
            columns: ["lister_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          apartment_id: string
          check_in_date_time: string
          check_out_date_time: string
          created_at: string
          id: string
          lister_id: string
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          status: Database["public"]["Enums"]["booking_status"] | null
          total_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          apartment_id: string
          check_in_date_time: string
          check_out_date_time: string
          created_at?: string
          id?: string
          lister_id: string
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          apartment_id?: string
          check_in_date_time?: string
          check_out_date_time?: string
          created_at?: string
          id?: string
          lister_id?: string
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          status?: Database["public"]["Enums"]["booking_status"] | null
          total_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_lister_id_fkey"
            columns: ["lister_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          apartment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          apartment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          apartment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          apartment_id: string | null
          content: string
          conversation_id: string
          id: string
          media_urls: string[] | null
          read_status: boolean | null
          receiver_id: string
          sender_id: string
          sent_at: string
        }
        Insert: {
          apartment_id?: string | null
          content: string
          conversation_id: string
          id?: string
          media_urls?: string[] | null
          read_status?: boolean | null
          receiver_id: string
          sender_id: string
          sent_at?: string
        }
        Update: {
          apartment_id?: string | null
          content?: string
          conversation_id?: string
          id?: string
          media_urls?: string[] | null
          read_status?: boolean | null
          receiver_id?: string
          sender_id?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          profile_picture: string | null
          rating: number | null
          updated_at: string
          user_type: Database["public"]["Enums"]["user_type"]
          verification_status: boolean | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          phone?: string | null
          profile_picture?: string | null
          rating?: number | null
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_type"]
          verification_status?: boolean | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          profile_picture?: string | null
          rating?: number | null
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_type"]
          verification_status?: boolean | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          accuracy_rating: number | null
          apartment_id: string
          booking_id: string
          cleanliness_rating: number | null
          comment: string | null
          communication_rating: number | null
          created_at: string
          id: string
          location_rating: number | null
          overall_rating: number
          review_type: Database["public"]["Enums"]["review_type"]
          reviewee_id: string
          reviewer_id: string
          value_rating: number | null
        }
        Insert: {
          accuracy_rating?: number | null
          apartment_id: string
          booking_id: string
          cleanliness_rating?: number | null
          comment?: string | null
          communication_rating?: number | null
          created_at?: string
          id?: string
          location_rating?: number | null
          overall_rating: number
          review_type: Database["public"]["Enums"]["review_type"]
          reviewee_id: string
          reviewer_id: string
          value_rating?: number | null
        }
        Update: {
          accuracy_rating?: number | null
          apartment_id?: string
          booking_id?: string
          cleanliness_rating?: number | null
          comment?: string | null
          communication_rating?: number | null
          created_at?: string
          id?: string
          location_rating?: number | null
          overall_rating?: number
          review_type?: Database["public"]["Enums"]["review_type"]
          reviewee_id?: string
          reviewer_id?: string
          value_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_apartment_id_fkey"
            columns: ["apartment_id"]
            isOneToOne: false
            referencedRelation: "apartments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewee_id_fkey"
            columns: ["reviewee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      availability_status: "available" | "booked" | "unavailable"
      booking_status:
        | "pending"
        | "confirmed"
        | "checked_in"
        | "completed"
        | "cancelled"
      media_type: "image" | "video"
      payment_status: "pending" | "paid" | "refunded"
      review_type: "user_reviews_lister" | "lister_reviews_user"
      user_type: "user" | "lister"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      availability_status: ["available", "booked", "unavailable"],
      booking_status: [
        "pending",
        "confirmed",
        "checked_in",
        "completed",
        "cancelled",
      ],
      media_type: ["image", "video"],
      payment_status: ["pending", "paid", "refunded"],
      review_type: ["user_reviews_lister", "lister_reviews_user"],
      user_type: ["user", "lister"],
    },
  },
} as const
