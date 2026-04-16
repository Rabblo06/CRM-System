import { createBrowserClient } from '@supabase/ssr';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key';

// Ensure URL is a valid HTTPS URL for the Supabase REST API
// (not a postgres:// connection string)
function sanitizeSupabaseUrl(url: string): string {
  if (!url) return 'https://placeholder.supabase.co';
  // If it's a postgres/postgresql URL, extract the host and convert to HTTPS
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    try {
      const match = url.match(/@([^:/]+)/);
      if (match) return `https://${match[1]}`;
    } catch {
      // fall through
    }
    return 'https://placeholder.supabase.co';
  }
  // If it's already a valid HTTPS URL, use it
  if (url.startsWith('https://') || url.startsWith('http://')) {
    return url;
  }
  return 'https://placeholder.supabase.co';
}

const supabaseUrl = sanitizeSupabaseUrl(rawUrl);

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      contacts: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string | null;
          phone: string | null;
          mobile: string | null;
          job_title: string | null;
          department: string | null;
          company_id: string | null;
          lead_status: string;
          lifecycle_stage: string;
          source: string | null;
          linkedin_url: string | null;
          twitter_url: string | null;
          address: string | null;
          city: string | null;
          country: string | null;
          notes: string | null;
          avatar_url: string | null;
          is_active: boolean;
          last_contacted_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['contacts']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['contacts']['Insert']>;
      };
      companies: {
        Row: {
          id: string;
          name: string;
          domain: string | null;
          industry: string | null;
          size: string | null;
          website: string | null;
          phone: string | null;
          address: string | null;
          city: string | null;
          country: string | null;
          description: string | null;
          logo_url: string | null;
          annual_revenue: number | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['companies']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['companies']['Insert']>;
      };
      deals: {
        Row: {
          id: string;
          title: string;
          amount: number;
          currency: string;
          stage: string;
          priority: string;
          probability: number;
          close_date: string | null;
          company_id: string | null;
          owner_id: string | null;
          description: string | null;
          is_won: boolean | null;
          closed_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['deals']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['deals']['Insert']>;
      };
    };
  };
};
