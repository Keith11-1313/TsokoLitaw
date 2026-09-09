// Generated public schema. Do not edit; regenerate with npm run db:types.
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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      addons: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          price: number
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          price: number
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      coatings: {
        Row: {
          created_at: string
          description: string
          id: string
          image_url: string | null
          is_active: boolean
          is_default: boolean
          name: string
          price_per_piece: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_default?: boolean
          name: string
          price_per_piece?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_default?: boolean
          name?: string
          price_per_piece?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      daily_inventory: {
        Row: {
          created_at: string
          id: string
          is_available: boolean
          pickup_date: string
          product_id: string
          stock_reserved: number
          stock_sold: number
          stock_total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_available?: boolean
          pickup_date: string
          product_id: string
          stock_reserved?: number
          stock_sold?: number
          stock_total: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_available?: boolean
          pickup_date?: string
          product_id?: string
          stock_reserved?: number
          stock_sold?: number
          stock_total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_inventory_pickup_date_fkey"
            columns: ["pickup_date"]
            isOneToOne: false
            referencedRelation: "pickup_dates"
            referencedColumns: ["pickup_date"]
          },
          {
            foreignKeyName: "daily_inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_adjustments: {
        Row: {
          created_at: string
          created_by: string
          daily_inventory_id: string
          id: string
          notes: string | null
          quantity_delta: number
          reason: string
        }
        Insert: {
          created_at?: string
          created_by: string
          daily_inventory_id: string
          id?: string
          notes?: string | null
          quantity_delta: number
          reason: string
        }
        Update: {
          created_at?: string
          created_by?: string
          daily_inventory_id?: string
          id?: string
          notes?: string | null
          quantity_delta?: number
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_adjustments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_adjustments_daily_inventory_id_fkey"
            columns: ["daily_inventory_id"]
            isOneToOne: false
            referencedRelation: "daily_inventory"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_posts: {
        Row: {
          author_id: string
          content: string
          content_type: string
          cover_image_url: string | null
          created_at: string
          display_date: string
          excerpt: string | null
          icon_key: string
          id: string
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["journal_status"]
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          author_id: string
          content: string
          content_type: string
          cover_image_url?: string | null
          created_at?: string
          display_date?: string
          excerpt?: string | null
          icon_key?: string
          id?: string
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["journal_status"]
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          content_type?: string
          cover_image_url?: string | null
          created_at?: string
          display_date?: string
          excerpt?: string | null
          icon_key?: string
          id?: string
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["journal_status"]
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_accounts: {
        Row: {
          completed_order_count: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_order_count?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_order_count?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_rewards: {
        Row: {
          created_at: string
          earned_at: string
          id: string
          redeemed_at: string | null
          redeemed_order_id: string | null
          reward_type: string
          source_order_id: string
          status: Database["public"]["Enums"]["loyalty_reward_status"]
          threshold: number
          user_id: string
        }
        Insert: {
          created_at?: string
          earned_at?: string
          id?: string
          redeemed_at?: string | null
          redeemed_order_id?: string | null
          reward_type: string
          source_order_id: string
          status?: Database["public"]["Enums"]["loyalty_reward_status"]
          threshold: number
          user_id: string
        }
        Update: {
          created_at?: string
          earned_at?: string
          id?: string
          redeemed_at?: string | null
          redeemed_order_id?: string | null
          reward_type?: string
          source_order_id?: string
          status?: Database["public"]["Enums"]["loyalty_reward_status"]
          threshold?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_rewards_redeemed_order_fkey"
            columns: ["redeemed_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_rewards_source_order_id_fkey"
            columns: ["source_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_rewards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_refund_destinations: {
        Row: {
          account_name: string
          account_reference_encrypted: string
          collected_by: string
          created_at: string
          deleted_at: string | null
          destination_type: string
          id: string
          refund_id: string
        }
        Insert: {
          account_name: string
          account_reference_encrypted: string
          collected_by: string
          created_at?: string
          deleted_at?: string | null
          destination_type: string
          id?: string
          refund_id: string
        }
        Update: {
          account_name?: string
          account_reference_encrypted?: string
          collected_by?: string
          created_at?: string
          deleted_at?: string | null
          destination_type?: string
          id?: string
          refund_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "manual_refund_destinations_collected_by_fkey"
            columns: ["collected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_refund_destinations_refund_id_fkey"
            columns: ["refund_id"]
            isOneToOne: true
            referencedRelation: "refunds"
            referencedColumns: ["id"]
          },
        ]
      }
      mutation_rate_limit_buckets: {
        Row: {
          bucket_key_hash: string
          request_count: number
          updated_at: string
          window_started_at: string
        }
        Insert: {
          bucket_key_hash: string
          request_count?: number
          updated_at?: string
          window_started_at: string
        }
        Update: {
          bucket_key_hash?: string
          request_count?: number
          updated_at?: string
          window_started_at?: string
        }
        Relationships: []
      }
      notification_deliveries: {
        Row: {
          attempt_count: number
          created_at: string
          delivered_at: string | null
          event_type: string
          id: string
          idempotency_key: string
          last_attempt_at: string | null
          last_error: string | null
          last_event_type: string | null
          next_attempt_at: string
          order_id: string | null
          provider: string
          provider_event_at: string | null
          provider_message_id: string | null
          recipient_email: string
          refund_id: string | null
          sent_at: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          delivered_at?: string | null
          event_type: string
          id?: string
          idempotency_key: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_event_type?: string | null
          next_attempt_at?: string
          order_id?: string | null
          provider?: string
          provider_event_at?: string | null
          provider_message_id?: string | null
          recipient_email: string
          refund_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          attempt_count?: number
          created_at?: string
          delivered_at?: string | null
          event_type?: string
          id?: string
          idempotency_key?: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_event_type?: string | null
          next_attempt_at?: string
          order_id?: string | null
          provider?: string
          provider_event_at?: string | null
          provider_message_id?: string | null
          recipient_email?: string
          refund_id?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_deliveries_refund_id_fkey"
            columns: ["refund_id"]
            isOneToOne: false
            referencedRelation: "refunds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_deliveries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_webhook_events: {
        Row: {
          created_at: string
          event_created_at: string
          event_type: string
          id: string
          processed_at: string | null
          provider: string
          provider_event_id: string
          provider_message_id: string
        }
        Insert: {
          created_at?: string
          event_created_at: string
          event_type: string
          id?: string
          processed_at?: string | null
          provider?: string
          provider_event_id: string
          provider_message_id: string
        }
        Update: {
          created_at?: string
          event_created_at?: string
          event_type?: string
          id?: string
          processed_at?: string | null
          provider?: string
          provider_event_id?: string
          provider_message_id?: string
        }
        Relationships: []
      }
      order_item_addons: {
        Row: {
          addon_id: string
          addon_name_snapshot: string
          created_at: string
          id: string
          line_total: number
          order_item_id: string
          quantity: number
          unit_price_snapshot: number
        }
        Insert: {
          addon_id: string
          addon_name_snapshot: string
          created_at?: string
          id?: string
          line_total: number
          order_item_id: string
          quantity: number
          unit_price_snapshot: number
        }
        Update: {
          addon_id?: string
          addon_name_snapshot?: string
          created_at?: string
          id?: string
          line_total?: number
          order_item_id?: string
          quantity?: number
          unit_price_snapshot?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_item_addons_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_addons_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_coatings: {
        Row: {
          additional_price_snapshot: number
          coating_id: string
          coating_name_snapshot: string
          created_at: string
          id: string
          is_included_type: boolean
          order_item_id: string
          piece_count: number
        }
        Insert: {
          additional_price_snapshot?: number
          coating_id: string
          coating_name_snapshot: string
          created_at?: string
          id?: string
          is_included_type?: boolean
          order_item_id: string
          piece_count: number
        }
        Update: {
          additional_price_snapshot?: number
          coating_id?: string
          coating_name_snapshot?: string
          created_at?: string
          id?: string
          is_included_type?: boolean
          order_item_id?: string
          piece_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_item_coatings_coating_id_fkey"
            columns: ["coating_id"]
            isOneToOne: false
            referencedRelation: "coatings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_coatings_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          extra_coating_total_snapshot: number
          id: string
          line_subtotal: number
          order_id: string
          piece_count_snapshot: number
          product_id: string
          product_name_snapshot: string
          quantity: number
          unit_price_snapshot: number
          variant_id: string
          variant_name_snapshot: string
        }
        Insert: {
          created_at?: string
          extra_coating_total_snapshot?: number
          id?: string
          line_subtotal: number
          order_id: string
          piece_count_snapshot: number
          product_id: string
          product_name_snapshot: string
          quantity: number
          unit_price_snapshot: number
          variant_id: string
          variant_name_snapshot: string
        }
        Update: {
          created_at?: string
          extra_coating_total_snapshot?: number
          id?: string
          line_subtotal?: number
          order_id?: string
          piece_count_snapshot?: number
          product_id?: string
          product_name_snapshot?: string
          quantity?: number
          unit_price_snapshot?: number
          variant_id?: string
          variant_name_snapshot?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancelled_at: string | null
          checkout_idempotency_key: string | null
          completed_at: string | null
          created_at: string
          customer_email: string
          customer_mobile: string | null
          customer_name: string
          customer_notes: string | null
          discount_total: number
          id: string
          order_number: string
          payment_expires_at: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          pickup_date: string
          pickup_location_id: string
          pickup_location_snapshot: string
          pickup_window_id: string
          pickup_window_snapshot: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          terms_accepted_at: string
          terms_version: string
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          cancelled_at?: string | null
          checkout_idempotency_key?: string | null
          completed_at?: string | null
          created_at?: string
          customer_email: string
          customer_mobile?: string | null
          customer_name: string
          customer_notes?: string | null
          discount_total?: number
          id?: string
          order_number: string
          payment_expires_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pickup_date: string
          pickup_location_id: string
          pickup_location_snapshot: string
          pickup_window_id: string
          pickup_window_snapshot: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal: number
          terms_accepted_at: string
          terms_version: string
          total: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          cancelled_at?: string | null
          checkout_idempotency_key?: string | null
          completed_at?: string | null
          created_at?: string
          customer_email?: string
          customer_mobile?: string | null
          customer_name?: string
          customer_notes?: string | null
          discount_total?: number
          id?: string
          order_number?: string
          payment_expires_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pickup_date?: string
          pickup_location_id?: string
          pickup_location_snapshot?: string
          pickup_window_id?: string
          pickup_window_snapshot?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          terms_accepted_at?: string
          terms_version?: string
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_pickup_location_id_fkey"
            columns: ["pickup_location_id"]
            isOneToOne: false
            referencedRelation: "pickup_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_pickup_window_id_fkey"
            columns: ["pickup_window_id"]
            isOneToOne: false
            referencedRelation: "pickup_windows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_webhook_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          provider: string
          provider_event_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload: Json
          processed_at?: string | null
          provider: string
          provider_event_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          provider?: string
          provider_event_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          order_id: string
          paid_at: string | null
          provider: string
          provider_checkout_id: string | null
          provider_checkout_url: string | null
          provider_payment_id: string | null
          refunded_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          order_id: string
          paid_at?: string | null
          provider?: string
          provider_checkout_id?: string | null
          provider_checkout_url?: string | null
          provider_payment_id?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          order_id?: string
          paid_at?: string | null
          provider?: string
          provider_checkout_id?: string | null
          provider_checkout_url?: string | null
          provider_payment_id?: string | null
          refunded_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pickup_dates: {
        Row: {
          availability_mode: Database["public"]["Enums"]["pickup_availability_mode"]
          created_at: string
          id: string
          is_open: boolean
          notes: string | null
          pickup_date: string
          updated_at: string
        }
        Insert: {
          availability_mode?: Database["public"]["Enums"]["pickup_availability_mode"]
          created_at?: string
          id?: string
          is_open?: boolean
          notes?: string | null
          pickup_date: string
          updated_at?: string
        }
        Update: {
          availability_mode?: Database["public"]["Enums"]["pickup_availability_mode"]
          created_at?: string
          id?: string
          is_open?: boolean
          notes?: string | null
          pickup_date?: string
          updated_at?: string
        }
        Relationships: []
      }
      pickup_locations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      pickup_window_locations: {
        Row: {
          is_open: boolean
          pickup_location_id: string
          pickup_window_id: string
        }
        Insert: {
          is_open?: boolean
          pickup_location_id: string
          pickup_window_id: string
        }
        Update: {
          is_open?: boolean
          pickup_location_id?: string
          pickup_window_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pickup_window_locations_pickup_location_id_fkey"
            columns: ["pickup_location_id"]
            isOneToOne: false
            referencedRelation: "pickup_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_window_locations_pickup_window_id_fkey"
            columns: ["pickup_window_id"]
            isOneToOne: false
            referencedRelation: "pickup_windows"
            referencedColumns: ["id"]
          },
        ]
      }
      pickup_windows: {
        Row: {
          created_at: string
          end_time: string
          id: string
          is_open: boolean
          pickup_date_id: string
          sort_order: number
          start_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          is_open?: boolean
          pickup_date_id: string
          sort_order?: number
          start_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          is_open?: boolean
          pickup_date_id?: string
          sort_order?: number
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pickup_windows_pickup_date_id_fkey"
            columns: ["pickup_date_id"]
            isOneToOne: false
            referencedRelation: "pickup_dates"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          piece_count: number
          product_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          piece_count: number
          product_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          piece_count?: number
          product_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          created_at: string
          description: string
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price_per_piece: number
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price_per_piece: number
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price_per_piece?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          deactivated_at: string | null
          deletion_requested_at: string | null
          deletion_scheduled_for: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          mobile_number: string | null
          role: Database["public"]["Enums"]["profile_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          deactivated_at?: string | null
          deletion_requested_at?: string | null
          deletion_scheduled_for?: string | null
          email: string
          full_name?: string
          id: string
          is_active?: boolean
          mobile_number?: string | null
          role?: Database["public"]["Enums"]["profile_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          deactivated_at?: string | null
          deletion_requested_at?: string | null
          deletion_scheduled_for?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          mobile_number?: string | null
          role?: Database["public"]["Enums"]["profile_role"]
          updated_at?: string
        }
        Relationships: []
      }
      refunds: {
        Row: {
          amount: number
          created_at: string
          currency: string
          failure_code: string | null
          failure_message: string | null
          id: string
          method: Database["public"]["Enums"]["refund_method"]
          order_id: string
          payment_id: string
          processed_at: string | null
          provider: string
          provider_refund_id: string | null
          reason: string
          refunded_at: string | null
          requested_at: string
          status: Database["public"]["Enums"]["refund_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          method?: Database["public"]["Enums"]["refund_method"]
          order_id: string
          payment_id: string
          processed_at?: string | null
          provider?: string
          provider_refund_id?: string | null
          reason: string
          refunded_at?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["refund_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          method?: Database["public"]["Enums"]["refund_method"]
          order_id?: string
          payment_id?: string
          processed_at?: string | null
          provider?: string
          provider_refund_id?: string | null
          reason?: string
          refunded_at?: string | null
          requested_at?: string
          status?: Database["public"]["Enums"]["refund_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refunds_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string
          created_at: string
          display_name_snapshot: string
          id: string
          is_featured: boolean
          is_visible: boolean
          order_id: string
          rating: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          comment: string
          created_at?: string
          display_name_snapshot: string
          id?: string
          is_featured?: boolean
          is_visible?: boolean
          order_id: string
          rating: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          comment?: string
          created_at?: string
          display_name_snapshot?: string
          id?: string
          is_featured?: boolean
          is_visible?: boolean
          order_id?: string
          rating?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      terms_versions: {
        Row: {
          content: string
          created_at: string
          effective_at: string
          id: string
          is_current: boolean
          version: string
        }
        Insert: {
          content: string
          created_at?: string
          effective_at: string
          id?: string
          is_current?: boolean
          version: string
        }
        Update: {
          content?: string
          created_at?: string
          effective_at?: string
          id?: string
          is_current?: boolean
          version?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      attach_paymongo_checkout: {
        Args: {
          checkout_id: string
          checkout_url: string
          target_payment_id: string
        }
        Returns: boolean
      }
      cancel_account_deletion: { Args: never; Returns: undefined }
      cancel_unpaid_order: {
        Args: {
          expired_checkout_id?: string
          target_order_id: string
          target_user_id: string
        }
        Returns: boolean
      }
      consume_mutation_rate_limit: {
        Args: {
          bucket_key_hashes: string[]
          maximum_requests: number
          window_seconds: number
        }
        Returns: {
          allowed: boolean
          remaining_requests: number
          retry_after_seconds: number
        }[]
      }
      create_pending_order: {
        Args: {
          checkout_key: string
          customer_mobile_value: string
          customer_name_value: string
          customer_notes_value: string
          discount_value: number
          loyalty_reward_id: string
          priced_lines: Json
          selected_pickup_location_id: string
          selected_pickup_window_id: string
          subtotal_value: number
          target_user_id: string
          terms_version_value: string
          total_value: number
        }
        Returns: {
          created_order_id: string
          created_order_number: string
          created_total: number
          was_created: boolean
        }[]
      }
      deactivate_due_account: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      expire_paymongo_order: {
        Args: { checkout_id: string; target_payment_id: string }
        Returns: boolean
      }
      expire_pending_orders: { Args: never; Returns: number }
      fail_paymongo_refund_request: {
        Args: {
          failure_code_value: string
          failure_message_value: string
          target_refund_id: string
        }
        Returns: boolean
      }
      get_admin_customer_summaries: {
        Args: {
          result_limit?: number
          search_value?: string
          target_admin_id: string
        }
        Returns: {
          account_role: Database["public"]["Enums"]["profile_role"]
          available_rewards: number
          completed_orders: number
          completed_spend: number
          email: string
          full_name: string
          is_active: boolean
          joined_at: string
          last_order_at: string
          loyalty_completed_orders: number
          loyalty_threshold: number
          mobile_number: string
          redeemed_rewards: number
          user_id: string
        }[]
      }
      get_public_pickup_inventory: {
        Args: never
        Returns: {
          available_pieces: number
          pickup_date: string
        }[]
      }
      get_public_pickup_settings: {
        Args: never
        Returns: {
          daily_cutoff_time: string
          minimum_lead_days: number
          operating_end: string
          operating_start: string
          pickup_grace_minutes: number
        }[]
      }
      is_active_user: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      list_due_paymongo_checkouts: {
        Args: { batch_limit?: number }
        Returns: {
          due_checkout_id: string
          due_order_id: string
          due_payment_id: string
        }[]
      }
      moderate_order_review: {
        Args: {
          featured_value: boolean
          target_admin_id: string
          target_review_id: string
          visible_value: boolean
        }
        Returns: boolean
      }
      prepare_order_cancellation: {
        Args: { target_order_id: string; target_user_id: string }
        Returns: {
          cancellation_amount: number
          cancellation_checkout_id: string
          cancellation_kind: string
          cancellation_payment_id: string
          cancellation_provider_payment_id: string
          existing_refund_id: string
          existing_refund_status: Database["public"]["Enums"]["refund_status"]
        }[]
      }
      prepare_paymongo_checkout: {
        Args: { target_order_id: string; target_user_id: string }
        Returns: {
          existing_checkout_url: string
          prepared_amount: number
          prepared_customer_email: string
          prepared_customer_mobile: string
          prepared_customer_name: string
          prepared_order_id: string
          prepared_order_number: string
          prepared_payment_id: string
        }[]
      }
      process_paymongo_paid_event: {
        Args: {
          checkout_id: string
          event_key: string
          event_summary: Json
          paid_amount: number
          payment_id: string
          target_order_id: string
          target_order_number: string
        }
        Returns: boolean
      }
      process_paymongo_refund_event: {
        Args: {
          event_key: string
          event_summary: Json
          provider_payment_id_value: string
          provider_refund_id_value: string
          provider_status_value: string
          refund_amount_value: number
        }
        Returns: boolean
      }
      process_resend_delivery_event: {
        Args: {
          event_created_at_value: string
          event_type_value: string
          provider_event_id_value: string
          provider_message_id_value: string
        }
        Returns: boolean
      }
      promote_admin_by_email: {
        Args: { target_email: string }
        Returns: string
      }
      prune_mutation_rate_limit_buckets: { Args: never; Returns: number }
      record_inventory_consumption: {
        Args: {
          notes_value: string
          quantity_value: number
          reason_value: string
          target_admin_id: string
          target_inventory_id: string
        }
        Returns: number
      }
      record_paymongo_refund_result: {
        Args: {
          failure_code_value?: string
          failure_message_value?: string
          provider_refund_id_value: string
          provider_status_value: string
          target_refund_id: string
        }
        Returns: boolean
      }
      request_account_deletion: { Args: never; Returns: string }
      request_manual_refund_fallback: {
        Args: {
          account_name_value: string
          destination_type_value: string
          encrypted_reference_value: string
          target_refund_id: string
          target_user_id: string
        }
        Returns: boolean
      }
      request_paid_order_refund: {
        Args: { target_order_id: string; target_user_id: string }
        Returns: {
          provider_payment_id: string
          refund_amount: number
          refund_status_value: Database["public"]["Enums"]["refund_status"]
          requested_payment_id: string
          requested_refund_id: string
        }[]
      }
      set_pickup_date_open: {
        Args: {
          open_value: boolean
          target_admin_id: string
          target_pickup_date_id: string
        }
        Returns: boolean
      }
      submit_order_review: {
        Args: {
          comment_value: string
          rating_value: number
          target_order_id: string
          target_user_id: string
        }
        Returns: string
      }
      transition_order_status: {
        Args: {
          expected_status: Database["public"]["Enums"]["order_status"]
          next_status: Database["public"]["Enums"]["order_status"]
          target_admin_id: string
          target_order_id: string
        }
        Returns: Database["public"]["Enums"]["order_status"]
      }
      update_catalog_product: {
        Args: {
          active_value: boolean
          description_value: string
          price_per_piece_value: number
          target_admin_id: string
          target_product_id: string
        }
        Returns: boolean
      }
      update_catalog_variant: {
        Args: {
          active_value: boolean
          target_admin_id: string
          target_variant_id: string
        }
        Returns: boolean
      }
      update_pickup_settings: {
        Args: {
          daily_cutoff_time_value: string
          grace_minutes_value: number
          minimum_lead_days_value: number
          operating_end_value: string
          operating_start_value: string
          target_admin_id: string
        }
        Returns: boolean
      }
      upsert_catalog_addon: {
        Args: {
          active_value: boolean
          name_value: string
          price_value: number
          target_addon_id: string
          target_admin_id: string
        }
        Returns: string
      }
      upsert_catalog_coating: {
        Args: {
          active_value: boolean
          default_value: boolean
          description_value: string
          image_url_value: string
          name_value: string
          price_per_piece_value: number
          target_admin_id: string
          target_coating_id: string
        }
        Returns: string
      }
      upsert_daily_inventory: {
        Args: {
          available_value: boolean
          notes_value: string
          stock_total_value: number
          target_admin_id: string
          target_pickup_date: string
          target_product_id: string
        }
        Returns: string
      }
      upsert_journal_post: {
        Args: {
          content_type_value: string
          content_value: string
          cover_image_url_value: string
          display_date_value: string
          excerpt_value: string
          icon_key_value: string
          status_value: Database["public"]["Enums"]["journal_status"]
          target_admin_id: string
          target_post_id: string
          title_value: string
          video_url_value: string
        }
        Returns: string
      }
      upsert_pickup_location: {
        Args: {
          active_value: boolean
          description_value: string
          name_value: string
          target_admin_id: string
          target_location_id: string
        }
        Returns: string
      }
      upsert_pickup_schedule: {
        Args: {
          availability_mode_value: Database["public"]["Enums"]["pickup_availability_mode"]
          notes_value: string
          open_value: boolean
          pickup_date_value: string
          target_admin_id: string
          target_pickup_date_id: string
          windows_value: Json
        }
        Returns: string
      }
    }
    Enums: {
      journal_status: "draft" | "published"
      loyalty_reward_status: "earned" | "redeemed" | "expired"
      order_status:
        | "PENDING_PAYMENT"
        | "PAID"
        | "CONFIRMED"
        | "PREPARING"
        | "READY_FOR_PICKUP"
        | "COMPLETED"
        | "CANCELLED"
        | "EXPIRED"
      payment_status: "PENDING" | "PAID" | "FAILED" | "REFUNDED"
      pickup_availability_mode: "MADE_TO_ORDER" | "READY_STOCK" | "HYBRID"
      profile_role: "customer" | "admin"
      refund_method: "ORIGINAL_PAYMENT_METHOD" | "MANUAL_FALLBACK"
      refund_status: "REQUESTED" | "PROCESSING" | "REFUNDED" | "FAILED"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      journal_status: ["draft", "published"],
      loyalty_reward_status: ["earned", "redeemed", "expired"],
      order_status: [
        "PENDING_PAYMENT",
        "PAID",
        "CONFIRMED",
        "PREPARING",
        "READY_FOR_PICKUP",
        "COMPLETED",
        "CANCELLED",
        "EXPIRED",
      ],
      payment_status: ["PENDING", "PAID", "FAILED", "REFUNDED"],
      pickup_availability_mode: ["MADE_TO_ORDER", "READY_STOCK", "HYBRID"],
      profile_role: ["customer", "admin"],
      refund_method: ["ORIGINAL_PAYMENT_METHOD", "MANUAL_FALLBACK"],
      refund_status: ["REQUESTED", "PROCESSING", "REFUNDED", "FAILED"],
    },
  },
} as const
