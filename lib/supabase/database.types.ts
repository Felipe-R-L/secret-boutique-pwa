export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type OrderStatus =
  | "PENDING"
  | "PAID"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED";

export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          id: string;
          email: string;
          role: "ADMIN" | "STAFF";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: "ADMIN" | "STAFF";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          role?: "ADMIN" | "STAFF";
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          name: string;
          price: number;
          description: string | null;
          curatorship: string | null;
          images: Json | null;
          image: string | null;
          image_url: string | null;
          category: string;
          specs: Json | null;
          rating: number | null;
          reviews: number | null;
          in_stock: boolean | null;
          stock_quantity: number;
          is_featured: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          price: number;
          description?: string | null;
          curatorship?: string | null;
          images?: Json | null;
          image?: string | null;
          image_url?: string | null;
          category?: string;
          specs?: Json | null;
          rating?: number | null;
          reviews?: number | null;
          in_stock?: boolean | null;
          is_featured?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          price?: number;
          description?: string | null;
          curatorship?: string | null;
          images?: Json | null;
          image?: string | null;
          image_url?: string | null;
          category?: string;
          specs?: Json | null;
          rating?: number | null;
          reviews?: number | null;
          in_stock?: boolean | null;
          is_featured?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          product_id: string;
          ip_hash: string;
          rating: number;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          ip_hash: string;
          rating: number;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          ip_hash?: string;
          rating?: number;
          comment?: string | null;
          created_at?: string;
        };
      };
      store_settings: {
        Row: {
          id: number;
          hero_title: string;
          hero_subtitle: string;
          categories: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          hero_title: string;
          hero_subtitle: string;
          categories?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          hero_title?: string;
          hero_subtitle?: string;
          categories?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          customer_name: string;
          customer_email: string;
          delivery_method: "MOTEL_PICKUP" | "ROOM_DELIVERY";
          room_number: string | null;
          payment_method: "PIX";
          status: OrderStatus;
          total_amount: number;
          mercadopago_order_id: string | null;
          pickup_code: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_name: string;
          customer_email: string;
          delivery_method: "MOTEL_PICKUP" | "ROOM_DELIVERY";
          room_number?: string | null;
          payment_method?: "PIX";
          status?: OrderStatus;
          total_amount: number;
          mercadopago_order_id?: string | null;
          pickup_code?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          customer_name?: string;
          customer_email?: string;
          delivery_method?: "MOTEL_PICKUP" | "ROOM_DELIVERY";
          room_number?: string | null;
          payment_method?: "PIX";
          status?: OrderStatus;
          total_amount?: number;
          mercadopago_order_id?: string | null;
          pickup_code?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: number;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          order_id: string;
          product_id: string;
          quantity: number;
          unit_price: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          order_id?: string;
          product_id?: string;
          quantity?: number;
          unit_price?: number;
          created_at?: string;
        };
      };
      inventory_movements: {
        Row: {
          id: string;
          product_id: string;
          type: "ENTRY" | "EXIT" | "SALE" | "ADJUSTMENT";
          quantity: number;
          invoice_total: number | null;
          unit_cost: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          type: "ENTRY" | "EXIT" | "SALE" | "ADJUSTMENT";
          quantity: number;
          invoice_total?: number | null;
          unit_cost?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          type?: "ENTRY" | "EXIT" | "SALE" | "ADJUSTMENT";
          quantity?: number;
          invoice_total?: number | null;
          unit_cost?: number | null;
          notes?: string | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
