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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      dining_tables: {
        Row: {
          id: number
          number: number
          seats: number
        }
        Insert: {
          id?: never
          number: number
          seats: number
        }
        Update: {
          id?: never
          number?: number
          seats?: number
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          id: number
          low_stock_threshold: number
          name: string
          quantity_on_hand: number
          unit: string
        }
        Insert: {
          id?: never
          low_stock_threshold?: number
          name: string
          quantity_on_hand?: number
          unit: string
        }
        Update: {
          id?: never
          low_stock_threshold?: number
          name?: string
          quantity_on_hand?: number
          unit?: string
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          id: number
          name: string
          sort_order: number
        }
        Insert: {
          id?: never
          name: string
          sort_order?: number
        }
        Update: {
          id?: never
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          category_id: number
          created_at: string
          description: string
          id: number
          image_url: string | null
          is_available: boolean
          name: string
          price_etb: number
          sort_order: number
        }
        Insert: {
          category_id: number
          created_at?: string
          description?: string
          id?: never
          image_url?: string | null
          is_available?: boolean
          name: string
          price_etb: number
          sort_order?: number
        }
        Update: {
          category_id?: number
          created_at?: string
          description?: string
          id?: never
          image_url?: string | null
          is_available?: boolean
          name?: string
          price_etb?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: number
          menu_item_id: number
          note: string
          order_id: number
          quantity: number
          unit_price_etb: number
        }
        Insert: {
          id?: never
          menu_item_id: number
          note?: string
          order_id: number
          quantity: number
          unit_price_etb?: number
        }
        Update: {
          id?: never
          menu_item_id?: number
          note?: string
          order_id?: number
          quantity?: number
          unit_price_etb?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          client_ref: string | null
          created_at: string
          id: number
          paid_at: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          preparing_at: string | null
          ready_at: string | null
          served_at: string | null
          status: Database["public"]["Enums"]["order_status"]
          table_id: number
          updated_at: string
          waiter_id: string
        }
        Insert: {
          client_ref?: string | null
          created_at?: string
          id?: never
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          preparing_at?: string | null
          ready_at?: string | null
          served_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          table_id: number
          updated_at?: string
          waiter_id?: string
        }
        Update: {
          client_ref?: string | null
          created_at?: string
          id?: never
          paid_at?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          preparing_at?: string | null
          ready_at?: string | null
          served_at?: string | null
          status?: Database["public"]["Enums"]["order_status"]
          table_id?: number
          updated_at?: string
          waiter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "dining_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_waiter_id_fkey"
            columns: ["waiter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"] | null
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          role?: Database["public"]["Enums"]["app_role"] | null
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"] | null
        }
        Relationships: []
      }
      recipe_items: {
        Row: {
          ingredient_id: number
          menu_item_id: number
          quantity_per_item: number
        }
        Insert: {
          ingredient_id: number
          menu_item_id: number
          quantity_per_item: number
        }
        Update: {
          ingredient_id?: number
          menu_item_id?: number
          quantity_per_item?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipe_items_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          change: number
          client_ref: string | null
          created_at: string
          created_by: string | null
          id: number
          ingredient_id: number
          note: string
          order_id: number | null
          reason: Database["public"]["Enums"]["stock_reason"]
        }
        Insert: {
          change: number
          client_ref?: string | null
          created_at?: string
          created_by?: string | null
          id?: never
          ingredient_id: number
          note?: string
          order_id?: number | null
          reason: Database["public"]["Enums"]["stock_reason"]
        }
        Update: {
          change?: number
          client_ref?: string | null
          created_at?: string
          created_by?: string | null
          id?: never
          ingredient_id?: number
          note?: string
          order_id?: number | null
          reason?: Database["public"]["Enums"]["stock_reason"]
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_stock: {
        Args: {
          p_client_ref?: string
          p_ingredient_id: number
          p_note?: string
          p_quantity: number
        }
        Returns: number
      }
      auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      place_order: {
        Args: { p_client_ref?: string; p_items: Json; p_table_id: number }
        Returns: number
      }
    }
    Enums: {
      app_role: "waiter" | "cook" | "manager" | "owner"
      order_status: "sent" | "preparing" | "ready" | "served" | "paid"
      payment_method: "cash" | "telebirr" | "cbe_birr"
      stock_reason: "order" | "restock" | "adjustment"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["waiter", "cook", "manager", "owner"],
      order_status: ["sent", "preparing", "ready", "served", "paid"],
      payment_method: ["cash", "telebirr", "cbe_birr"],
      stock_reason: ["order", "restock", "adjustment"],
    },
  },
} as const
