export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  auth: {
    Tables: {
      users: {
        Row: {
          instance_id: string | null
          id: string
          aud: string | null
          role: string | null
          email: string | null
          encrypted_password: string | null
          email_confirmed_at: string | null
          invited_at: string | null
          confirmation_token: string | null
          confirmation_sent_at: string | null
          recovery_token: string | null
          recovery_sent_at: string | null
          email_change_token_new: string | null
          email_change: string | null
          email_change_sent_at: string | null
          last_sign_in_at: string | null
          raw_app_meta_data: Json | null
          raw_user_meta_data: Json | null
          is_super_admin: boolean | null
          created_at: string | null
          updated_at: string | null
          phone: string | null
          phone_confirmed_at: string | null
          phone_change: string | null
          phone_change_token: string | null
          phone_change_sent_at: string | null
          confirmed_at: string | null
          email_change_token_current: string | null
          email_change_confirm_status: number | null
          banned_until: string | null
          reauthentication_token: string | null
          reauthentication_sent_at: string | null
          is_sso_user: boolean | null
          deleted_at: string | null
          is_anonymous: boolean | null
        }
        Insert: {
          instance_id?: string | null
          id: string
          aud?: string | null
          role?: string | null
          email?: string | null
          encrypted_password?: string | null
          email_confirmed_at?: string | null
          invited_at?: string | null
          confirmation_token?: string | null
          confirmation_sent_at?: string | null
          recovery_token?: string | null
          recovery_sent_at?: string | null
          email_change_token_new?: string | null
          email_change?: string | null
          email_change_sent_at?: string | null
          last_sign_in_at?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          is_super_admin?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          phone?: string | null
          phone_confirmed_at?: string | null
          phone_change?: string | null
          phone_change_token?: string | null
          phone_change_sent_at?: string | null
          confirmed_at?: string | null
          email_change_token_current?: string | null
          email_change_confirm_status?: number | null
          banned_until?: string | null
          reauthentication_token?: string | null
          reauthentication_sent_at?: string | null
          is_sso_user?: boolean | null
          deleted_at?: string | null
          is_anonymous?: boolean | null
        }
        Update: {
          instance_id?: string | null
          id?: string
          aud?: string | null
          role?: string | null
          email?: string | null
          encrypted_password?: string | null
          email_confirmed_at?: string | null
          invited_at?: string | null
          confirmation_token?: string | null
          confirmation_sent_at?: string | null
          recovery_token?: string | null
          recovery_sent_at?: string | null
          email_change_token_new?: string | null
          email_change?: string | null
          email_change_sent_at?: string | null
          last_sign_in_at?: string | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          is_super_admin?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          phone?: string | null
          phone_confirmed_at?: string | null
          phone_change?: string | null
          phone_change_token?: string | null
          phone_change_sent_at?: string | null
          confirmed_at?: string | null
          email_change_token_current?: string | null
          email_change_confirm_status?: number | null
          banned_until?: string | null
          reauthentication_token?: string | null
          reauthentication_sent_at?: string | null
          is_sso_user?: boolean | null
          deleted_at?: string | null
          is_anonymous?: boolean | null
        }
      }
    }
  }
  public: {
    Tables: {
      leads: {
        Row: {
          id: string
          organization_id: string
          customer_id: string | null
          first_name: string
          last_name: string
          email: string
          company: string | null
          website: string | null
          phone: string | null
          description: string | null
          product_interest: string | null
          email_opt_out: boolean
          status: string
          lead_source: string | null
          owner_id: string | null
          is_converted: boolean
          converted_at: string | null
          converted_by: string | null
          created_at: string
          created_by: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          organization_id: string
          customer_id?: string | null
          first_name: string
          last_name: string
          email: string
          company?: string | null
          website?: string | null
          phone?: string | null
          description?: string | null
          product_interest?: string | null
          email_opt_out?: boolean
          status: string
          lead_source?: string | null
          owner_id?: string | null
          is_converted?: boolean
          converted_at?: string | null
          converted_by?: string | null
          created_at?: string
          created_by: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          organization_id?: string
          customer_id?: string | null
          first_name?: string
          last_name?: string
          email?: string
          company?: string | null
          website?: string | null
          phone?: string | null
          description?: string | null
          product_interest?: string | null
          email_opt_out?: boolean
          status?: string
          lead_source?: string | null
          owner_id?: string | null
          is_converted?: boolean
          converted_at?: string | null
          converted_by?: string | null
          created_at?: string
          created_by?: string
          updated_at?: string
          updated_by?: string | null
        }
      }
      organizations: {
        Row: {
          id: string
          name: string
          website_url: string | null
          billing_address_line1: string | null
          billing_address_line2: string | null
          billing_city: string | null
          billing_state: string | null
          billing_zip_code: string | null
          billing_country: string | null
          shipping_address_line1: string | null
          shipping_address_line2: string | null
          shipping_city: string | null
          shipping_state: string | null
          shipping_zip_code: string | null
          shipping_country: string | null
          status: 'active' | 'inactive'
          type: string | null
          created_at: string
          created_by: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          name: string
          website_url?: string | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_state?: string | null
          billing_zip_code?: string | null
          billing_country?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_state?: string | null
          shipping_zip_code?: string | null
          shipping_country?: string | null
          status?: 'active' | 'inactive'
          type?: string | null
          created_at?: string
          created_by: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          website_url?: string | null
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_state?: string | null
          billing_zip_code?: string | null
          billing_country?: string | null
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_state?: string | null
          shipping_zip_code?: string | null
          shipping_country?: string | null
          status?: 'active' | 'inactive'
          type?: string | null
          created_at?: string
          created_by?: string
          updated_at?: string
          updated_by?: string | null
        }
      }
      user_organizations: {
        Row: {
          id: string
          user_id: string
          organization_id: string
          role: 'owner' | 'admin' | 'member'
          created_at: string
          created_by: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          user_id: string
          organization_id: string
          role?: 'owner' | 'admin' | 'member'
          created_at?: string
          created_by: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          organization_id?: string
          role?: 'owner' | 'admin' | 'member'
          created_at?: string
          created_by?: string
          updated_at?: string
          updated_by?: string | null
        }
      }
      authors: {
        Row: {
          id: string
          name: string
          email: string
          bio: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          bio?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          bio?: string | null
          avatar_url?: string | null
          created_at?: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          description?: string | null
          created_at?: string
        }
      }
      customers: {
        Row: {
          customer_id: string
          first_name: string
          last_name: string
          email: string
          phone: string | null
          address_line1: string
          address_line2: string | null
          city: string
          state: string
          zip_code: string
          country: string
          created_at: string
          updated_at: string
        }
        Insert: {
          customer_id?: string
          first_name: string
          last_name: string
          email: string
          phone?: string | null
          address_line1: string
          address_line2?: string | null
          city: string
          state: string
          zip_code: string
          country: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          customer_id?: string
          first_name?: string
          last_name?: string
          email?: string
          phone?: string | null
          address_line1?: string
          address_line2?: string | null
          city?: string
          state?: string
          zip_code?: string
          country?: string
          created_at?: string
          updated_at?: string
        }
      }
      portfolio_items: {
        Row: {
          id: string
          title: string
          description: string | null
          category: string
          image_url: string
          published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          category: string
          image_url: string
          published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          category?: string
          image_url?: string
          published?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      post_categories: {
        Row: {
          post_id: string
          category_id: string
        }
        Insert: {
          post_id: string
          category_id: string
        }
        Update: {
          post_id?: string
          category_id?: string
        }
      }
      post_tags: {
        Row: {
          post_id: string
          tag_id: string
        }
        Insert: {
          post_id: string
          tag_id: string
        }
        Update: {
          post_id?: string
          tag_id?: string
        }
      }
      posts: {
        Row: {
          id: string
          title: string
          slug: string
          content: string
          excerpt: string | null
          featured_image: string | null
          author_id: string
          published: boolean
          published_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          content: string
          excerpt?: string | null
          featured_image?: string | null
          author_id: string
          published?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          content?: string
          excerpt?: string | null
          featured_image?: string | null
          author_id?: string
          published?: boolean
          published_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          name: string
          role: string
          type: string
          is_super_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          role?: string
          type?: string
          is_super_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          role?: string
          type?: string
          is_super_admin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      quote_dtl: {
        Row: {
          quote_dtl_id: string
          quote_id: string
          item_name: string
          item_desc: string | null
          quantity: number
          unit_price: number
          line_total: number
          created_at: string
          updated_at: string
        }
        Insert: {
          quote_dtl_id?: string
          quote_id: string
          item_name: string
          item_desc?: string | null
          quantity?: number
          unit_price: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          quote_dtl_id?: string
          quote_id?: string
          item_name?: string
          item_desc?: string | null
          quantity?: number
          unit_price?: number
          created_at?: string
          updated_at?: string
        }
      }
      quote_hdr: {
        Row: {
          quote_id: string
          quote_number: string
          customer_id: string
          quote_date: string
          status: string
          total_amount: number
          currency: string
          notes: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          quote_id?: string
          quote_number?: string
          customer_id: string
          quote_date?: string
          status?: string
          total_amount?: number
          currency?: string
          notes?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          quote_id?: string
          quote_number?: string
          customer_id?: string
          quote_date?: string
          status?: string
          total_amount?: number
          currency?: string
          notes?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
        }
      }
    }
  }
}