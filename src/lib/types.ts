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
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          steam_id?: string | null
          avatar_url?: string | null
          faction_choice?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          steam_id?: string | null
          avatar_url?: string | null
          faction_choice?: string | null
          created_at?: string
          updated_at?: string
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

export interface LeaderboardEntry extends PlayerScore {
  profile: Profile
  rank?: number
}
