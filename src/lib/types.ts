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
      profiles: {
        Row: {
          id: string
          username: string | null
          steam_id: string | null
          avatar_url: string | null
          faction_choice: string | null
          is_public: boolean
          created_at: string
          updated_at: string
          // Player Stats (optional until migration is run)
          level?: number
          xp?: number
          total_kills?: number
          total_deaths?: number
          total_wins?: number
          total_losses?: number
          total_playtime?: number
          highest_score?: number
          ship_class?: string | null
        }
        Insert: {
          id: string
          username?: string | null
          steam_id?: string | null
          avatar_url?: string | null
          faction_choice?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
          // Player Stats
          level?: number
          xp?: number
          total_kills?: number
          total_deaths?: number
          total_wins?: number
          total_losses?: number
          total_playtime?: number
          highest_score?: number
          ship_class?: string | null
        }
        Update: {
          id?: string
          username?: string | null
          steam_id?: string | null
          avatar_url?: string | null
          faction_choice?: string | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
          // Player Stats
          level?: number
          xp?: number
          total_kills?: number
          total_deaths?: number
          total_wins?: number
          total_losses?: number
          total_playtime?: number
          highest_score?: number
          ship_class?: string | null
        }
      }
      player_scores: {
        Row: {
          id: string
          user_id: string
          score: number
          mode: string
          platform: string
          level: number
          time_seconds: number | null
          submitted_at: string
          is_verified: boolean
          metadata: Json | null
        }
        Insert: {
          id?: string
          user_id: string
          score: number
          mode: string
          platform: string
          level?: number
          time_seconds?: number | null
          submitted_at?: string
          is_verified?: boolean
          metadata?: Json | null
        }
        Update: {
          id?: string
          user_id?: string
          score?: number
          mode?: string
          platform?: string
          level?: number
          time_seconds?: number | null
          submitted_at?: string
          is_verified?: boolean
          metadata?: Json | null
        }
      }
      ship_designs: {
        Row: {
          id: string
          user_id: string
          ship_name: string
          ship_data: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ship_name: string
          ship_data: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          ship_name?: string
          ship_data?: Json
          created_at?: string
          updated_at?: string
        }
      }
      backlog_items: {
        Row: {
          id: string
          user_id: string | null
          type: 'feature' | 'bug'
          title: string
          description: string
          status: 'open' | 'in_progress' | 'completed' | 'wont_fix' | 'duplicate'
          priority: 'low' | 'medium' | 'high' | 'critical'
          tags: string[]
          vote_count: number
          source: 'web' | 'game'
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          type: 'feature' | 'bug'
          title: string
          description: string
          status?: 'open' | 'in_progress' | 'completed' | 'wont_fix' | 'duplicate'
          priority?: 'low' | 'medium' | 'high' | 'critical'
          tags?: string[]
          vote_count?: number
          source?: 'web' | 'game'
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          type?: 'feature' | 'bug'
          title?: string
          description?: string
          status?: 'open' | 'in_progress' | 'completed' | 'wont_fix' | 'duplicate'
          priority?: 'low' | 'medium' | 'high' | 'critical'
          tags?: string[]
          vote_count?: number
          source?: 'web' | 'game'
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      backlog_votes: {
        Row: {
          id: string
          backlog_item_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          backlog_item_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          backlog_item_id?: string
          user_id?: string
          created_at?: string
        }
      }
      career_applications: {
        Row: {
          id: string
          name: string
          email: string
          position: 'Game Developer' | '3D Artist' | 'UI/UX Designer' | 'Sound Designer' | 'Community Manager' | 'QA Tester' | 'Other'
          portfolio: string | null
          message: string
          resume_url: string | null
          status: 'pending' | 'reviewing' | 'interviewed' | 'accepted' | 'rejected'
          notes: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          position: 'Game Developer' | '3D Artist' | 'UI/UX Designer' | 'Sound Designer' | 'Community Manager' | 'QA Tester' | 'Other'
          portfolio?: string | null
          message: string
          resume_url?: string | null
          status?: 'pending' | 'reviewing' | 'interviewed' | 'accepted' | 'rejected'
          notes?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          position?: 'Game Developer' | '3D Artist' | 'UI/UX Designer' | 'Sound Designer' | 'Community Manager' | 'QA Tester' | 'Other'
          portfolio?: string | null
          message?: string
          resume_url?: string | null
          status?: 'pending' | 'reviewing' | 'interviewed' | 'accepted' | 'rejected'
          notes?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
      investor_inquiries: {
        Row: {
          id: string
          name: string
          email: string
          phone: string
          company: string | null
          investment_range: 'Less than $50K' | '$50K - $100K' | '$100K - $500K' | '$500K - $1M' | '$1M - $5M' | '$5M+' | 'Prefer not to say'
          message: string
          status: 'pending' | 'contacted' | 'meeting_scheduled' | 'interested' | 'not_interested'
          notes: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone: string
          company?: string | null
          investment_range: 'Less than $50K' | '$50K - $100K' | '$100K - $500K' | '$500K - $1M' | '$1M - $5M' | '$5M+' | 'Prefer not to say'
          message: string
          status?: 'pending' | 'contacted' | 'meeting_scheduled' | 'interested' | 'not_interested'
          notes?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string
          company?: string | null
          investment_range?: 'Less than $50K' | '$50K - $100K' | '$100K - $500K' | '$500K - $1M' | '$1M - $5M' | '$5M+' | 'Prefer not to say'
          message?: string
          status?: 'pending' | 'contacted' | 'meeting_scheduled' | 'interested' | 'not_interested'
          notes?: string | null
          metadata?: Json
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Profile = Database['public']['Tables']['profiles']['Row']
export type PlayerScore = Database['public']['Tables']['player_scores']['Row']
export type ShipDesign = Database['public']['Tables']['ship_designs']['Row']
export type BacklogItem = Database['public']['Tables']['backlog_items']['Row']
export type BacklogVote = Database['public']['Tables']['backlog_votes']['Row']
export type CareerApplication = Database['public']['Tables']['career_applications']['Row']
export type InvestorInquiry = Database['public']['Tables']['investor_inquiries']['Row']

export interface LeaderboardEntry extends PlayerScore {
  profile: Profile
  rank?: number
}

export interface BacklogItemWithProfile extends BacklogItem {
  profiles: Profile | null
}
