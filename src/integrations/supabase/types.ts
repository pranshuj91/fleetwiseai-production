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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      business_profiles: {
        Row: {
          address_line_1: string | null
          address_line_2: string | null
          city: string | null
          company_id: string
          country: string | null
          created_at: string
          display_name: string
          email: string | null
          id: string
          legal_name: string | null
          logo_url: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          company_id: string
          country?: string | null
          created_at?: string
          display_name: string
          email?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address_line_1?: string | null
          address_line_2?: string | null
          city?: string | null
          company_id?: string
          country?: string | null
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          legal_name?: string | null
          logo_url?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      business_signatures: {
        Row: {
          company_id: string
          created_at: string
          id: string
          signature_image_url: string | null
          signature_type: Database["public"]["Enums"]["signature_type"]
          signed_at: string | null
          signer_name: string
          work_order_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          signature_image_url?: string | null
          signature_type: Database["public"]["Enums"]["signature_type"]
          signed_at?: string | null
          signer_name: string
          work_order_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          signature_image_url?: string | null
          signature_type?: Database["public"]["Enums"]["signature_type"]
          signed_at?: string | null
          signer_name?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_signatures_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_signatures_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          city: string | null
          company_id: string | null
          created_at: string
          email: string | null
          external_id: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          state: string | null
          street_address: string | null
          updated_at: string
          zip_code: string | null
        }
        Insert: {
          city?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          external_id?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          street_address?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Update: {
          city?: string | null
          company_id?: string | null
          created_at?: string
          email?: string | null
          external_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          state?: string | null
          street_address?: string | null
          updated_at?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_chat_messages: {
        Row: {
          company_id: string | null
          content: string
          created_at: string
          feedback_comment: string | null
          feedback_rating: string | null
          id: string
          role: string
          session_id: string
          sources: Json | null
        }
        Insert: {
          company_id?: string | null
          content: string
          created_at?: string
          feedback_comment?: string | null
          feedback_rating?: string | null
          id?: string
          role: string
          session_id: string
          sources?: Json | null
        }
        Update: {
          company_id?: string | null
          content?: string
          created_at?: string
          feedback_comment?: string | null
          feedback_rating?: string | null
          id?: string
          role?: string
          session_id?: string
          sources?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_chat_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "diagnostic_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      diagnostic_chat_sessions: {
        Row: {
          company_id: string | null
          complaint: string | null
          completed_steps: number[] | null
          created_at: string
          fault_codes: string[] | null
          id: string
          procedure_steps: string[] | null
          status: string | null
          summary: string | null
          truck_id: string | null
          updated_at: string
          work_order_id: string | null
        }
        Insert: {
          company_id?: string | null
          complaint?: string | null
          completed_steps?: number[] | null
          created_at?: string
          fault_codes?: string[] | null
          id?: string
          procedure_steps?: string[] | null
          status?: string | null
          summary?: string | null
          truck_id?: string | null
          updated_at?: string
          work_order_id?: string | null
        }
        Update: {
          company_id?: string | null
          complaint?: string | null
          completed_steps?: number[] | null
          created_at?: string
          fault_codes?: string[] | null
          id?: string
          procedure_steps?: string[] | null
          status?: string | null
          summary?: string | null
          truck_id?: string | null
          updated_at?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnostic_chat_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_chat_sessions_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diagnostic_chat_sessions_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      document_chunks: {
        Row: {
          chunk_index: number
          company_id: string | null
          content: string
          created_at: string
          document_id: string
          embedding: string | null
          id: string
          tags: string[] | null
          token_count: number | null
        }
        Insert: {
          chunk_index: number
          company_id?: string | null
          content: string
          created_at?: string
          document_id: string
          embedding?: string | null
          id?: string
          tags?: string[] | null
          token_count?: number | null
        }
        Update: {
          chunk_index?: number
          company_id?: string | null
          content?: string
          created_at?: string
          document_id?: string
          embedding?: string | null
          id?: string
          tags?: string[] | null
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "knowledge_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_tokens: {
        Row: {
          company_id: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          password_set_at: string | null
          role: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          password_set_at?: string | null
          role: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          password_set_at?: string | null
          role?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_tokens_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_articles: {
        Row: {
          author_id: string
          author_name: string
          category: string
          company_id: string | null
          created_at: string
          difficulty: string | null
          fault_codes: string[] | null
          helpful_count: number | null
          id: string
          parts_needed: string[] | null
          solution: string
          status: string | null
          symptoms: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          author_name: string
          category?: string
          company_id?: string | null
          created_at?: string
          difficulty?: string | null
          fault_codes?: string[] | null
          helpful_count?: number | null
          id?: string
          parts_needed?: string[] | null
          solution: string
          status?: string | null
          symptoms: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_name?: string
          category?: string
          company_id?: string | null
          created_at?: string
          difficulty?: string | null
          fault_codes?: string[] | null
          helpful_count?: number | null
          id?: string
          parts_needed?: string[] | null
          solution?: string
          status?: string | null
          symptoms?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_articles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_documents: {
        Row: {
          chunk_count: number | null
          company_id: string | null
          content: string | null
          created_at: string
          description: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          error_message: string | null
          file_name: string
          file_path: string | null
          file_size: number | null
          id: string
          processing_status: Database["public"]["Enums"]["processing_status"]
          tags: string[] | null
          title: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          chunk_count?: number | null
          company_id?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          error_message?: string | null
          file_name: string
          file_path?: string | null
          file_size?: number | null
          id?: string
          processing_status?: Database["public"]["Enums"]["processing_status"]
          tags?: string[] | null
          title: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          chunk_count?: number | null
          company_id?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          error_message?: string | null
          file_name?: string
          file_path?: string | null
          file_size?: number | null
          id?: string
          processing_status?: Database["public"]["Enums"]["processing_status"]
          tags?: string[] | null
          title?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_submissions: {
        Row: {
          category: string | null
          company_admin_id: string | null
          company_admin_name: string | null
          company_admin_notes: string | null
          company_admin_reviewed_at: string | null
          company_id: string
          content: string
          created_at: string
          id: string
          rejection_reason: string | null
          source: string | null
          status: string
          submitted_by: string
          submitted_by_name: string
          submitted_by_role: string
          super_admin_id: string | null
          super_admin_notes: string | null
          super_admin_reviewed_at: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          company_admin_id?: string | null
          company_admin_name?: string | null
          company_admin_notes?: string | null
          company_admin_reviewed_at?: string | null
          company_id: string
          content: string
          created_at?: string
          id?: string
          rejection_reason?: string | null
          source?: string | null
          status?: string
          submitted_by: string
          submitted_by_name: string
          submitted_by_role: string
          super_admin_id?: string | null
          super_admin_notes?: string | null
          super_admin_reviewed_at?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          company_admin_id?: string | null
          company_admin_name?: string | null
          company_admin_notes?: string | null
          company_admin_reviewed_at?: string | null
          company_id?: string
          content?: string
          created_at?: string
          id?: string
          rejection_reason?: string | null
          source?: string | null
          status?: string
          submitted_by?: string
          submitted_by_name?: string
          submitted_by_role?: string
          super_admin_id?: string | null
          super_admin_notes?: string | null
          super_admin_reviewed_at?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_submissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_records: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          engine_hours_at_service: number | null
          id: string
          labor_hours: number | null
          notes: string | null
          odometer_at_service: number | null
          parts_used: Json | null
          service_category: string | null
          service_date: string | null
          service_type: string | null
          source: string | null
          truck_id: string | null
          updated_at: string
          work_order_id: string | null
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          engine_hours_at_service?: number | null
          id?: string
          labor_hours?: number | null
          notes?: string | null
          odometer_at_service?: number | null
          parts_used?: Json | null
          service_category?: string | null
          service_date?: string | null
          service_type?: string | null
          source?: string | null
          truck_id?: string | null
          updated_at?: string
          work_order_id?: string | null
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          engine_hours_at_service?: number | null
          id?: string
          labor_hours?: number | null
          notes?: string | null
          odometer_at_service?: number | null
          parts_used?: Json | null
          service_category?: string | null
          service_date?: string | null
          service_type?: string | null
          source?: string | null
          truck_id?: string | null
          updated_at?: string
          work_order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_records_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          company_id: string | null
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          action_url?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          action_url?: string | null
          company_id?: string | null
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          company_name: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_disabled: boolean
          role: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_disabled?: boolean
          role?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          company_id?: string | null
          company_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_disabled?: boolean
          role?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      standalone_diagnostic_sessions: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          messages: Json
          odometer: number | null
          status: string
          unit_number: string | null
          updated_at: string
          vin: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          messages?: Json
          odometer?: number | null
          status?: string
          unit_number?: string | null
          updated_at?: string
          vin: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          messages?: Json
          odometer?: number | null
          status?: string
          unit_number?: string | null
          updated_at?: string
          vin?: string
        }
        Relationships: [
          {
            foreignKeyName: "standalone_diagnostic_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      task_photos: {
        Row: {
          company_id: string
          created_at: string
          file_name: string
          file_path: string
          id: string
          task_id: string | null
          uploaded_by: string
          uploaded_by_name: string | null
          work_order_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          file_name: string
          file_path: string
          id?: string
          task_id?: string | null
          uploaded_by: string
          uploaded_by_name?: string | null
          work_order_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          id?: string
          task_id?: string | null
          uploaded_by?: string
          uploaded_by_name?: string | null
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_photos_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_photos_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "work_order_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_photos_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      truck_chat_messages: {
        Row: {
          company_id: string
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
          sources: Json | null
          truck_id: string
        }
        Insert: {
          company_id: string
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
          sources?: Json | null
          truck_id: string
        }
        Update: {
          company_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
          sources?: Json | null
          truck_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "truck_chat_messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "truck_chat_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_chat_messages_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      truck_chat_sessions: {
        Row: {
          company_id: string
          created_at: string
          created_by: string
          id: string
          status: string
          title: string | null
          truck_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by: string
          id?: string
          status?: string
          title?: string | null
          truck_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string
          id?: string
          status?: string
          title?: string | null
          truck_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "truck_chat_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "truck_chat_sessions_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      truck_notes: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          embedded_at: string | null
          id: string
          is_embedded: boolean | null
          media_url: string | null
          note_text: string | null
          note_type: Database["public"]["Enums"]["note_type"]
          photo_url: string | null
          reminder_at: string | null
          source: Database["public"]["Enums"]["note_source"]
          tags: string[] | null
          token_count: number | null
          truck_id: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          embedded_at?: string | null
          id?: string
          is_embedded?: boolean | null
          media_url?: string | null
          note_text?: string | null
          note_type?: Database["public"]["Enums"]["note_type"]
          photo_url?: string | null
          reminder_at?: string | null
          source?: Database["public"]["Enums"]["note_source"]
          tags?: string[] | null
          token_count?: number | null
          truck_id: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          embedded_at?: string | null
          id?: string
          is_embedded?: boolean | null
          media_url?: string | null
          note_text?: string | null
          note_type?: Database["public"]["Enums"]["note_type"]
          photo_url?: string | null
          reminder_at?: string | null
          source?: Database["public"]["Enums"]["note_source"]
          tags?: string[] | null
          token_count?: number | null
          truck_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "truck_notes_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
      trucks: {
        Row: {
          body_type: string | null
          braking: Json
          company_id: string | null
          cooling: Json
          created_at: string
          customer_id: string | null
          customer_name: string | null
          drivetrain: Json
          electrical: Json
          electronics: Json
          emissions: Json
          engine: Json
          engine_hours: number | null
          fleet_assignment: string | null
          fuel_system: Json
          id: string
          in_service_date: string | null
          last_service_date: string | null
          last_service_odometer: number | null
          license_plate: string | null
          maintenance: Json
          make: string | null
          model: string | null
          notes: string | null
          odometer_miles: number | null
          shop_notes: string | null
          transmission: Json
          truck_number: string | null
          unit_id: string | null
          updated_at: string
          vehicle_class: string | null
          vin: string
          year: number | null
        }
        Insert: {
          body_type?: string | null
          braking?: Json
          company_id?: string | null
          cooling?: Json
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          drivetrain?: Json
          electrical?: Json
          electronics?: Json
          emissions?: Json
          engine?: Json
          engine_hours?: number | null
          fleet_assignment?: string | null
          fuel_system?: Json
          id?: string
          in_service_date?: string | null
          last_service_date?: string | null
          last_service_odometer?: number | null
          license_plate?: string | null
          maintenance?: Json
          make?: string | null
          model?: string | null
          notes?: string | null
          odometer_miles?: number | null
          shop_notes?: string | null
          transmission?: Json
          truck_number?: string | null
          unit_id?: string | null
          updated_at?: string
          vehicle_class?: string | null
          vin: string
          year?: number | null
        }
        Update: {
          body_type?: string | null
          braking?: Json
          company_id?: string | null
          cooling?: Json
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          drivetrain?: Json
          electrical?: Json
          electronics?: Json
          emissions?: Json
          engine?: Json
          engine_hours?: number | null
          fleet_assignment?: string | null
          fuel_system?: Json
          id?: string
          in_service_date?: string | null
          last_service_date?: string | null
          last_service_odometer?: number | null
          license_plate?: string | null
          maintenance?: Json
          make?: string | null
          model?: string | null
          notes?: string | null
          odometer_miles?: number | null
          shop_notes?: string | null
          transmission?: Json
          truck_number?: string | null
          unit_id?: string | null
          updated_at?: string
          vehicle_class?: string | null
          vin?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trucks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trucks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_signatures: {
        Row: {
          company_id: string
          id: string
          role: Database["public"]["Enums"]["signature_role"]
          signature_url: string
          updated_at: string
          uploaded_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          id?: string
          role: Database["public"]["Enums"]["signature_role"]
          signature_url: string
          updated_at?: string
          uploaded_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          id?: string
          role?: Database["public"]["Enums"]["signature_role"]
          signature_url?: string
          updated_at?: string
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_signatures_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_labor: {
        Row: {
          company_id: string | null
          created_at: string
          description: string | null
          hours: number | null
          id: string
          line_item_number: string | null
          rate: number | null
          technician_id: string | null
          technician_name: string | null
          total: number | null
          updated_at: string
          work_order_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          hours?: number | null
          id?: string
          line_item_number?: string | null
          rate?: number | null
          technician_id?: string | null
          technician_name?: string | null
          total?: number | null
          updated_at?: string
          work_order_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          description?: string | null
          hours?: number | null
          id?: string
          line_item_number?: string | null
          rate?: number | null
          technician_id?: string | null
          technician_name?: string | null
          total?: number | null
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_labor_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_labor_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_parts: {
        Row: {
          category: string | null
          company_id: string | null
          created_at: string
          description: string | null
          extended_price: number | null
          id: string
          notes: string | null
          part_number: string | null
          quantity: number | null
          unit_price: number | null
          updated_at: string
          work_order_id: string
        }
        Insert: {
          category?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          extended_price?: number | null
          id?: string
          notes?: string | null
          part_number?: string | null
          quantity?: number | null
          unit_price?: number | null
          updated_at?: string
          work_order_id: string
        }
        Update: {
          category?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          extended_price?: number | null
          id?: string
          notes?: string | null
          part_number?: string | null
          quantity?: number | null
          unit_price?: number | null
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_parts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_parts_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_order_tasks: {
        Row: {
          activity: string | null
          actual_hours: number | null
          assigned_to: string | null
          billable: string | null
          cause: string | null
          company_id: string | null
          complaint: string | null
          correction: string | null
          created_at: string
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          priority: string | null
          reason: string | null
          status: string
          task_type: string | null
          title: string
          updated_at: string
          work_order_id: string
        }
        Insert: {
          activity?: string | null
          actual_hours?: number | null
          assigned_to?: string | null
          billable?: string | null
          cause?: string | null
          company_id?: string | null
          complaint?: string | null
          correction?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: string | null
          reason?: string | null
          status?: string
          task_type?: string | null
          title: string
          updated_at?: string
          work_order_id: string
        }
        Update: {
          activity?: string | null
          actual_hours?: number | null
          assigned_to?: string | null
          billable?: string | null
          cause?: string | null
          company_id?: string | null
          complaint?: string | null
          correction?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          priority?: string | null
          reason?: string | null
          status?: string
          task_type?: string | null
          title?: string
          updated_at?: string
          work_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_order_tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_order_tasks_work_order_id_fkey"
            columns: ["work_order_id"]
            isOneToOne: false
            referencedRelation: "work_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      work_orders: {
        Row: {
          cause: string | null
          company_id: string | null
          complaint: string | null
          correction: string | null
          created_at: string
          customer_id_ref: string | null
          customer_location: string | null
          customer_name: string | null
          extracted_make: string | null
          extracted_model: string | null
          extracted_odometer: number | null
          extracted_unit_number: string | null
          extracted_vin: string | null
          extracted_year: number | null
          fault_codes: string[] | null
          id: string
          source_file_name: string | null
          source_file_path: string | null
          status: string | null
          truck_auto_created: boolean | null
          truck_id: string | null
          updated_at: string
          work_order_date: string | null
          work_order_number: string | null
        }
        Insert: {
          cause?: string | null
          company_id?: string | null
          complaint?: string | null
          correction?: string | null
          created_at?: string
          customer_id_ref?: string | null
          customer_location?: string | null
          customer_name?: string | null
          extracted_make?: string | null
          extracted_model?: string | null
          extracted_odometer?: number | null
          extracted_unit_number?: string | null
          extracted_vin?: string | null
          extracted_year?: number | null
          fault_codes?: string[] | null
          id?: string
          source_file_name?: string | null
          source_file_path?: string | null
          status?: string | null
          truck_auto_created?: boolean | null
          truck_id?: string | null
          updated_at?: string
          work_order_date?: string | null
          work_order_number?: string | null
        }
        Update: {
          cause?: string | null
          company_id?: string | null
          complaint?: string | null
          correction?: string | null
          created_at?: string
          customer_id_ref?: string | null
          customer_location?: string | null
          customer_name?: string | null
          extracted_make?: string | null
          extracted_model?: string | null
          extracted_odometer?: number | null
          extracted_unit_number?: string | null
          extracted_vin?: string | null
          extracted_year?: number | null
          fault_codes?: string[] | null
          id?: string
          source_file_name?: string | null
          source_file_path?: string | null
          status?: string | null
          truck_auto_created?: boolean | null
          truck_id?: string | null
          updated_at?: string
          work_order_date?: string | null
          work_order_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_truck_id_fkey"
            columns: ["truck_id"]
            isOneToOne: false
            referencedRelation: "trucks"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      search_documents: {
        Args: {
          filter_company_id?: string
          match_count?: number
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          document_id: string
          id: string
          similarity: number
        }[]
      }
    }
    Enums: {
      app_role:
        | "master_admin"
        | "company_admin"
        | "office_manager"
        | "shop_supervisor"
        | "technician"
      document_type: "manual" | "oem" | "transcription" | "text" | "other"
      note_source: "manual" | "scan" | "ai"
      note_type: "text" | "voice" | "photo"
      processing_status: "pending" | "processing" | "completed" | "failed"
      signature_role: "technician" | "supervisor" | "admin"
      signature_type: "technician" | "authorized_rep" | "customer"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: [
        "master_admin",
        "company_admin",
        "office_manager",
        "shop_supervisor",
        "technician",
      ],
      document_type: ["manual", "oem", "transcription", "text", "other"],
      note_source: ["manual", "scan", "ai"],
      note_type: ["text", "voice", "photo"],
      processing_status: ["pending", "processing", "completed", "failed"],
      signature_role: ["technician", "supervisor", "admin"],
      signature_type: ["technician", "authorized_rep", "customer"],
    },
  },
} as const
