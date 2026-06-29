export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          name: string
          icon: string | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          icon?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          icon?: string | null
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      sub_categories: {
        Row: {
          id: string
          category_id: string
          name: string
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          name: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          name?: string
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sub_categories_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
        ]
      }
      products: {
        Row: {
          id: string
          category_id: string | null
          sub_category_id: string | null
          title: string
          artist: string | null
          description: string | null
          price: number
          discount_price: number | null
          image_url: string | null
          specs: Json | null
          is_laser_printing_enabled: boolean
          is_featured: boolean
          available: boolean
          options_enabled: boolean
          options_label: string | null
          product_options: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id?: string | null
          sub_category_id?: string | null
          title: string
          artist?: string | null
          description?: string | null
          price: number
          discount_price?: number | null
          image_url?: string | null
          specs?: Json | null
          is_laser_printing_enabled?: boolean
          is_featured?: boolean
          available?: boolean
          options_enabled?: boolean
          options_label?: string | null
          product_options?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string | null
          sub_category_id?: string | null
          title?: string
          artist?: string | null
          description?: string | null
          price?: number
          discount_price?: number | null
          image_url?: string | null
          specs?: Json | null
          is_laser_printing_enabled?: boolean
          is_featured?: boolean
          available?: boolean
          options_enabled?: boolean
          options_label?: string | null
          product_options?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'products_category_id_fkey'
            columns: ['category_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'products_sub_category_id_fkey'
            columns: ['sub_category_id']
            isOneToOne: false
            referencedRelation: 'sub_categories'
            referencedColumns: ['id']
          },
        ]
      }
      product_reviews: {
        Row: {
          id: string
          product_id: string
          user_id: string
          rating: number
          comment: string
          author_display_name: string | null
          author_avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          user_id: string
          rating: number
          comment: string
          author_display_name?: string | null
          author_avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          user_id?: string
          rating?: number
          comment?: string
          author_display_name?: string | null
          author_avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'product_reviews_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      product_review_images: {
        Row: {
          id: string
          review_id: string
          image_url: string
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          review_id: string
          image_url: string
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          review_id?: string
          image_url?: string
          sort_order?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'product_review_images_review_id_fkey'
            columns: ['review_id']
            isOneToOne: false
            referencedRelation: 'product_reviews'
            referencedColumns: ['id']
          },
        ]
      }
      product_review_likes: {
        Row: {
          review_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          review_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          review_id?: string
          user_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'product_review_likes_review_id_fkey'
            columns: ['review_id']
            isOneToOne: false
            referencedRelation: 'product_reviews'
            referencedColumns: ['id']
          },
        ]
      }
      broadcast_notifications: {
        Row: {
          id: string
          title: string
          body: string
          category: string
          image_url: string | null
          sent_at: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          title: string
          body: string
          category?: string
          image_url?: string | null
          sent_at?: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          title?: string
          body?: string
          category?: string
          image_url?: string | null
          sent_at?: string
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      expo_push_tokens: {
        Row: {
          id: string
          user_id: string
          token: string
          platform: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          token: string
          platform?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          token?: string
          platform?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_threads: {
        Row: {
          id: string
          user_id: string
          is_follow_up: boolean
          last_message_at: string | null
          last_message_preview: string | null
          user_last_read_at: string | null
          admin_last_read_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          is_follow_up?: boolean
          last_message_at?: string | null
          last_message_preview?: string | null
          user_last_read_at?: string | null
          admin_last_read_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          is_follow_up?: boolean
          last_message_at?: string | null
          last_message_preview?: string | null
          user_last_read_at?: string | null
          admin_last_read_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chat_threads_user_id_fkey'
            columns: ['user_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      chat_messages: {
        Row: {
          id: string
          thread_id: string
          sender_user_id: string | null
          sender_role: string
          text: string | null
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          thread_id: string
          sender_user_id?: string | null
          sender_role: string
          text?: string | null
          image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          thread_id?: string
          sender_user_id?: string | null
          sender_role?: string
          text?: string | null
          image_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chat_messages_thread_id_fkey'
            columns: ['thread_id']
            isOneToOne: false
            referencedRelation: 'chat_threads'
            referencedColumns: ['id']
          },
        ]
      }
      gift_options: {
        Row: {
          id: string
          name: string
          price: number
          image_url: string | null
          is_available: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          price?: number
          image_url?: string | null
          is_available?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          price?: number
          image_url?: string | null
          is_available?: boolean
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          phone_number: string | null
          delivery_address: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name?: string | null
          phone_number?: string | null
          delivery_address?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string | null
          phone_number?: string | null
          delivery_address?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          id: string
          user_id: string | null
          order_number: string
          status: string
          payment_method: string | null
          subtotal: number
          delivery_fee: number
          gift_wrap_total: number
          total_amount: number
          delivery_info: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          order_number: string
          status?: string
          payment_method?: string | null
          subtotal: number
          delivery_fee?: number
          gift_wrap_total?: number
          total_amount: number
          delivery_info?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          order_number?: string
          status?: string
          payment_method?: string | null
          subtotal?: number
          delivery_fee?: number
          gift_wrap_total?: number
          total_amount?: number
          delivery_info?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'orders_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string | null
          quantity: number
          unit_price: number
          gift_option_id: string | null
          laser_print_image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id?: string | null
          quantity?: number
          unit_price: number
          gift_option_id?: string | null
          laser_print_image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string | null
          quantity?: number
          unit_price?: number
          gift_option_id?: string | null
          laser_print_image_url?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'order_items_order_id_fkey'
            columns: ['order_id']
            isOneToOne: false
            referencedRelation: 'orders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_items_product_id_fkey'
            columns: ['product_id']
            isOneToOne: false
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'order_items_gift_option_id_fkey'
            columns: ['gift_option_id']
            isOneToOne: false
            referencedRelation: 'gift_options'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_signup_identity_available: {
        Args: {
          p_email: string
          p_phone_number: string
        }
        Returns: Json
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
