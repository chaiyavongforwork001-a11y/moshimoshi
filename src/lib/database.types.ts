// Supabase schema types for moshimoshi — same shape as `supabase gen types typescript`.
// Mirrors supabase/migrations/20261025000001_init.sql; regenerate after schema changes.
// Usage: createClient<Database>(url, key) · Tables<'profiles'> · TablesInsert<'intents'>

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  __InternalSupabase: {
    PostgrestVersion: '13.0.5'
  }
  public: {
    Tables: {
      blocks: {
        Row: {
          blocked: string
          blocker: string
          created_at: string
        }
        Insert: {
          blocked: string
          blocker: string
          created_at?: string
        }
        Update: {
          blocked?: string
          blocker?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'blocks_blocked_fkey'
            columns: ['blocked']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'blocks_blocker_fkey'
            columns: ['blocker']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      chat_members: {
        Row: {
          chat_id: string
          consent_media: boolean
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          chat_id: string
          consent_media?: boolean
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          chat_id?: string
          consent_media?: boolean
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chat_members_chat_id_fkey'
            columns: ['chat_id']
            isOneToOne: false
            referencedRelation: 'chats'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chat_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      chat_message_sames: {
        Row: {
          created_at: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chat_message_sames_message_id_fkey'
            columns: ['message_id']
            isOneToOne: false
            referencedRelation: 'chat_messages'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chat_message_sames_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      chat_messages: {
        Row: {
          body: string
          chat_id: string
          created_at: string
          id: string
          kind: string
          user_id: string | null
        }
        Insert: {
          body: string
          chat_id: string
          created_at?: string
          id?: string
          kind?: string
          user_id?: string | null
        }
        Update: {
          body?: string
          chat_id?: string
          created_at?: string
          id?: string
          kind?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'chat_messages_chat_id_fkey'
            columns: ['chat_id']
            isOneToOne: false
            referencedRelation: 'chats'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'chat_messages_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      chats: {
        Row: {
          created_at: string
          icebreaker: string | null
          id: string
          requested_by: string
          status: string
        }
        Insert: {
          created_at?: string
          icebreaker?: string | null
          id?: string
          requested_by: string
          status?: string
        }
        Update: {
          created_at?: string
          icebreaker?: string | null
          id?: string
          requested_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: 'chats_requested_by_fkey'
            columns: ['requested_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      daily_answer_sames: {
        Row: {
          answer_user_id: string
          created_at: string
          question_id: string
          user_id: string
        }
        Insert: {
          answer_user_id: string
          created_at?: string
          question_id: string
          user_id: string
        }
        Update: {
          answer_user_id?: string
          created_at?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'daily_answer_sames_question_id_answer_user_id_fkey'
            columns: ['question_id', 'answer_user_id']
            isOneToOne: false
            referencedRelation: 'daily_answers'
            referencedColumns: ['question_id', 'user_id']
          },
          {
            foreignKeyName: 'daily_answer_sames_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      daily_answers: {
        Row: {
          body: string
          created_at: string
          question_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          question_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'daily_answers_question_id_fkey'
            columns: ['question_id']
            isOneToOne: false
            referencedRelation: 'daily_questions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'daily_answers_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      daily_questions: {
        Row: {
          body: string
          created_at: string
          day: string
          id: string
          room_id: string
        }
        Insert: {
          body: string
          created_at?: string
          day?: string
          id?: string
          room_id: string
        }
        Update: {
          body?: string
          created_at?: string
          day?: string
          id?: string
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'daily_questions_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'room_stats'
            referencedColumns: ['room_id']
          },
          {
            foreignKeyName: 'daily_questions_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'rooms'
            referencedColumns: ['id']
          },
        ]
      }
      intent_joins: {
        Row: {
          created_at: string
          intent_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          intent_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          intent_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'intent_joins_intent_id_fkey'
            columns: ['intent_id']
            isOneToOne: false
            referencedRelation: 'intents'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'intent_joins_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      intents: {
        Row: {
          body: string
          created_at: string
          expires_at: string | null
          give: string | null
          id: string
          mode: string
          province: string | null
          role: string
          room_id: string | null
          slots: number | null
          status: string
          tag_id: string
          template: string
          user_id: string
          want: string | null
          when_kind: string
          when_label: string | null
        }
        Insert: {
          body: string
          created_at?: string
          expires_at?: string | null
          give?: string | null
          id?: string
          mode: string
          province?: string | null
          role: string
          room_id?: string | null
          slots?: number | null
          status?: string
          tag_id: string
          template: string
          user_id: string
          want?: string | null
          when_kind: string
          when_label?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          expires_at?: string | null
          give?: string | null
          id?: string
          mode?: string
          province?: string | null
          role?: string
          room_id?: string | null
          slots?: number | null
          status?: string
          tag_id?: string
          template?: string
          user_id?: string
          want?: string | null
          when_kind?: string
          when_label?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'intents_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'room_stats'
            referencedColumns: ['room_id']
          },
          {
            foreignKeyName: 'intents_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'rooms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'intents_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          accessory: string | null
          bio: string
          birth_year: number | null
          chat_style: string[]
          color: string
          created_at: string
          face: string | null
          id: string
          is_host: boolean
          languages: string[]
          last_seen_at: string
          loves: string[]
          moshi_policy: string
          name: string
          onboarded: boolean
          online: string[]
          prompts: Json
          province: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          accessory?: string | null
          bio?: string
          birth_year?: number | null
          chat_style?: string[]
          color?: string
          created_at?: string
          face?: string | null
          id: string
          is_host?: boolean
          languages?: string[]
          last_seen_at?: string
          loves?: string[]
          moshi_policy?: string
          name?: string
          onboarded?: boolean
          online?: string[]
          prompts?: Json
          province?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          accessory?: string | null
          bio?: string
          birth_year?: number | null
          chat_style?: string[]
          color?: string
          created_at?: string
          face?: string | null
          id?: string
          is_host?: boolean
          languages?: string[]
          last_seen_at?: string
          loves?: string[]
          moshi_policy?: string
          name?: string
          onboarded?: boolean
          online?: string[]
          prompts?: Json
          province?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter: string | null
          target_user: string | null
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter?: string | null
          target_user?: string | null
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter?: string | null
          target_user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'reports_reporter_fkey'
            columns: ['reporter']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'reports_target_user_fkey'
            columns: ['target_user']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      room_members: {
        Row: {
          joined_at: string
          role: string
          room_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          role?: string
          room_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          role?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'room_members_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'room_stats'
            referencedColumns: ['room_id']
          },
          {
            foreignKeyName: 'room_members_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'rooms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'room_members_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      room_message_sames: {
        Row: {
          created_at: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'room_message_sames_message_id_fkey'
            columns: ['message_id']
            isOneToOne: false
            referencedRelation: 'room_messages'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'room_message_sames_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      room_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          room_id: string
          user_id: string | null
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind?: string
          room_id: string
          user_id?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          room_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'room_messages_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'room_stats'
            referencedColumns: ['room_id']
          },
          {
            foreignKeyName: 'room_messages_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'rooms'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'room_messages_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      rooms: {
        Row: {
          color: string
          icon: string
          id: string
          is_lobby: boolean
          name: string
          prime_time: string
          sort: number
          tagline: string
          tags: string[]
          vibe: string
        }
        Insert: {
          color?: string
          icon?: string
          id: string
          is_lobby?: boolean
          name: string
          prime_time?: string
          sort?: number
          tagline?: string
          tags?: string[]
          vibe?: string
        }
        Update: {
          color?: string
          icon?: string
          id?: string
          is_lobby?: boolean
          name?: string
          prime_time?: string
          sort?: number
          tagline?: string
          tags?: string[]
          vibe?: string
        }
        Relationships: []
      }
      session_rsvps: {
        Row: {
          created_at: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'session_rsvps_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'session_rsvps_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string
          duration_min: number
          host_id: string | null
          host_name: string | null
          id: string
          room_id: string
          starts_at: string
          title: string
        }
        Insert: {
          created_at?: string
          duration_min?: number
          host_id?: string | null
          host_name?: string | null
          id?: string
          room_id: string
          starts_at: string
          title: string
        }
        Update: {
          created_at?: string
          duration_min?: number
          host_id?: string | null
          host_name?: string | null
          id?: string
          room_id?: string
          starts_at?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: 'sessions_host_id_fkey'
            columns: ['host_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sessions_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'room_stats'
            referencedColumns: ['room_id']
          },
          {
            foreignKeyName: 'sessions_room_id_fkey'
            columns: ['room_id']
            isOneToOne: false
            referencedRelation: 'rooms'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      room_stats: {
        Row: {
          members: number | null
          online: number | null
          room_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      mark_chat_read: {
        Args: { p_chat: string }
        Returns: undefined
      }
      respond_moshi: {
        Args: { accept: boolean; p_chat: string }
        Returns: undefined
      }
      send_moshi: {
        Args: { opener: string; target: string }
        Returns: string
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

type PublicSchema = Database['public']
type TablesAndViews = PublicSchema['Tables'] & PublicSchema['Views']

export type Tables<T extends keyof TablesAndViews> = TablesAndViews[T] extends { Row: infer R } ? R : never

export type TablesInsert<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof PublicSchema['Tables']> = PublicSchema['Tables'][T]['Update']

export type Enums<T extends keyof PublicSchema['Enums']> = PublicSchema['Enums'][T]

export type CompositeTypes<T extends keyof PublicSchema['CompositeTypes']> = PublicSchema['CompositeTypes'][T]

export type DbFunctionArgs<T extends keyof PublicSchema['Functions']> = PublicSchema['Functions'][T]['Args']

export type DbFunctionReturns<T extends keyof PublicSchema['Functions']> = PublicSchema['Functions'][T]['Returns']

export const Constants = {
  public: {
    Enums: {},
  },
} as const
