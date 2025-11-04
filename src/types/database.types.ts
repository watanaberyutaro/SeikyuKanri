export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          company_code: string
          company_name: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_code: string
          company_name: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_code?: string
          company_name?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          company_name: string | null
          tenant_id: string | null
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          company_name?: string | null
          tenant_id?: string | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          company_name?: string | null
          tenant_id?: string | null
          is_admin?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      client_companies: {
        Row: {
          id: string
          user_id: string
          tenant_id: string | null
          name: string
          postal_code: string | null
          address: string | null
          phone: string | null
          email: string | null
          contact_person: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tenant_id?: string | null
          name: string
          postal_code?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          contact_person?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tenant_id?: string | null
          name?: string
          postal_code?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          contact_person?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      quotes: {
        Row: {
          id: string
          user_id: string
          tenant_id: string | null
          company_id: string
          quote_number: string
          title: string
          issue_date: string
          expiry_date: string | null
          subtotal: number
          tax_amount: number
          total_amount: number
          notes: string | null
          terms: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tenant_id?: string | null
          company_id: string
          quote_number: string
          title: string
          issue_date: string
          expiry_date?: string | null
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          notes?: string | null
          terms?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tenant_id?: string | null
          company_id?: string
          quote_number?: string
          title?: string
          issue_date?: string
          expiry_date?: string | null
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          notes?: string | null
          terms?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      quote_items: {
        Row: {
          id: string
          quote_id: string
          description: string
          quantity: number
          unit_price: number
          amount: number
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          quote_id: string
          description: string
          quantity?: number
          unit_price: number
          amount: number
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          quote_id?: string
          description?: string
          quantity?: number
          unit_price?: number
          amount?: number
          sort_order?: number
          created_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          user_id: string
          tenant_id: string | null
          company_id: string
          quote_id: string | null
          invoice_number: string
          title: string
          issue_date: string
          due_date: string | null
          payment_date: string | null
          status: 'pending' | 'sent' | 'paid'
          subtotal: number
          tax_amount: number
          total_amount: number
          notes: string | null
          terms: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tenant_id?: string | null
          company_id: string
          quote_id?: string | null
          invoice_number: string
          title: string
          issue_date: string
          due_date?: string | null
          payment_date?: string | null
          status?: 'pending' | 'sent' | 'paid'
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          notes?: string | null
          terms?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tenant_id?: string | null
          company_id?: string
          quote_id?: string | null
          invoice_number?: string
          title?: string
          issue_date?: string
          due_date?: string | null
          payment_date?: string | null
          status?: 'pending' | 'sent' | 'paid'
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          notes?: string | null
          terms?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          description: string
          quantity: number
          unit_price: number
          amount: number
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          invoice_id: string
          description: string
          quantity?: number
          unit_price: number
          amount: number
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          invoice_id?: string
          description?: string
          quantity?: number
          unit_price?: number
          amount?: number
          sort_order?: number
          created_at?: string
        }
      }
    }
  }
}
