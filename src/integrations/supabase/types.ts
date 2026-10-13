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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      clientes_cadastro: {
        Row: {
          atualizado_em: string | null
          atualizado_por: string | null
          atualizado_por_nome: string | null
          bairro: string | null
          cidade: string | null
          cnpj: string | null
          cod_rca: string | null
          codcli: number
          created_at: string
          email: string | null
          endereco: string | null
          fotos: string[]
          nome_fantasia: string | null
          nome_rca: string | null
          qtd_checkouts: number | null
          ramo_atividade: string | null
          razao_social: string
          situacao: string | null
          status_atualizacao: string
          telefone: string | null
          tipo_fj: string | null
          uf: string | null
          updated_at: string
        }
        Insert: {
          atualizado_em?: string | null
          atualizado_por?: string | null
          atualizado_por_nome?: string | null
          bairro?: string | null
          cidade?: string | null
          cnpj?: string | null
          cod_rca?: string | null
          codcli: number
          created_at?: string
          email?: string | null
          endereco?: string | null
          fotos?: string[]
          nome_fantasia?: string | null
          nome_rca?: string | null
          qtd_checkouts?: number | null
          ramo_atividade?: string | null
          razao_social: string
          situacao?: string | null
          status_atualizacao?: string
          telefone?: string | null
          tipo_fj?: string | null
          uf?: string | null
          updated_at?: string
        }
        Update: {
          atualizado_em?: string | null
          atualizado_por?: string | null
          atualizado_por_nome?: string | null
          bairro?: string | null
          cidade?: string | null
          cnpj?: string | null
          cod_rca?: string | null
          codcli?: number
          created_at?: string
          email?: string | null
          endereco?: string | null
          fotos?: string[]
          nome_fantasia?: string | null
          nome_rca?: string | null
          qtd_checkouts?: number | null
          ramo_atividade?: string | null
          razao_social?: string
          situacao?: string | null
          status_atualizacao?: string
          telefone?: string | null
          tipo_fj?: string | null
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      clientes_cadastro_historico: {
        Row: {
          alterado_em: string
          alterado_por: string | null
          alterado_por_email: string | null
          alterado_por_nome: string | null
          checkouts_anterior: number | null
          checkouts_novo: number | null
          cliente_codcli: number
          cod_rca: string | null
          email_anterior: string | null
          email_novo: string | null
          fantasia_anterior: string | null
          fantasia_novo: string | null
          fotos_anterior: string[] | null
          fotos_novo: string[] | null
          id: string
          nome_rca: string | null
          ramo_anterior: string | null
          ramo_novo: string | null
          razao_social: string | null
          telefone_anterior: string | null
          telefone_novo: string | null
        }
        Insert: {
          alterado_em?: string
          alterado_por?: string | null
          alterado_por_email?: string | null
          alterado_por_nome?: string | null
          checkouts_anterior?: number | null
          checkouts_novo?: number | null
          cliente_codcli: number
          cod_rca?: string | null
          email_anterior?: string | null
          email_novo?: string | null
          fantasia_anterior?: string | null
          fantasia_novo?: string | null
          fotos_anterior?: string[] | null
          fotos_novo?: string[] | null
          id?: string
          nome_rca?: string | null
          ramo_anterior?: string | null
          ramo_novo?: string | null
          razao_social?: string | null
          telefone_anterior?: string | null
          telefone_novo?: string | null
        }
        Update: {
          alterado_em?: string
          alterado_por?: string | null
          alterado_por_email?: string | null
          alterado_por_nome?: string | null
          checkouts_anterior?: number | null
          checkouts_novo?: number | null
          cliente_codcli?: number
          cod_rca?: string | null
          email_anterior?: string | null
          email_novo?: string | null
          fantasia_anterior?: string | null
          fantasia_novo?: string | null
          fotos_anterior?: string[] | null
          fotos_novo?: string[] | null
          id?: string
          nome_rca?: string | null
          ramo_anterior?: string | null
          ramo_novo?: string | null
          razao_social?: string | null
          telefone_anterior?: string | null
          telefone_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_cadastro_historico_cliente_codcli_fkey"
            columns: ["cliente_codcli"]
            isOneToOne: false
            referencedRelation: "clientes_cadastro"
            referencedColumns: ["codcli"]
          },
        ]
      }
      clientes_cadastro_rcas: {
        Row: {
          cod_rca: string
          codcli: number
          created_at: string
          id: string
          nome_rca: string | null
          updated_at: string
        }
        Insert: {
          cod_rca: string
          codcli: number
          created_at?: string
          id?: string
          nome_rca?: string | null
          updated_at?: string
        }
        Update: {
          cod_rca?: string
          codcli?: number
          created_at?: string
          id?: string
          nome_rca?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clientes_cadastro_rcas_codcli_fkey"
            columns: ["codcli"]
            isOneToOne: false
            referencedRelation: "clientes_cadastro"
            referencedColumns: ["codcli"]
          },
        ]
      }
      dashboard_layout: {
        Row: {
          component_order: Json
          created_at: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          component_order?: Json
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          component_order?: Json
          created_at?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      feedback_templates: {
        Row: {
          action_plan: string
          constructive_criticism: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          action_plan: string
          constructive_criticism: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          action_plan?: string
          constructive_criticism?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      feedbacks: {
        Row: {
          action_plan: string
          constructive_criticism: string
          created_at: string
          created_by: string | null
          id: string
          pdf_path: string | null
          supervisor: string
          vendor_code: string
          visit_form_id: string
        }
        Insert: {
          action_plan: string
          constructive_criticism: string
          created_at?: string
          created_by?: string | null
          id?: string
          pdf_path?: string | null
          supervisor: string
          vendor_code: string
          visit_form_id: string
        }
        Update: {
          action_plan?: string
          constructive_criticism?: string
          created_at?: string
          created_by?: string | null
          id?: string
          pdf_path?: string | null
          supervisor?: string
          vendor_code?: string
          visit_form_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedbacks_visit_form_id_fkey"
            columns: ["visit_form_id"]
            isOneToOne: false
            referencedRelation: "visit_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_questions: {
        Row: {
          conditional_logic: Json | null
          created_at: string | null
          description: string | null
          display_order: number
          id: string
          identification_role: string | null
          image_url: string | null
          is_active: boolean | null
          is_chart_metric: boolean | null
          is_required: boolean | null
          label: string
          metric_category: string | null
          metric_name: string | null
          options: Json | null
          placeholder: string | null
          question_type: string
          section_id: string | null
          slider_config: Json | null
          updated_at: string | null
        }
        Insert: {
          conditional_logic?: Json | null
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          identification_role?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_chart_metric?: boolean | null
          is_required?: boolean | null
          label: string
          metric_category?: string | null
          metric_name?: string | null
          options?: Json | null
          placeholder?: string | null
          question_type: string
          section_id?: string | null
          slider_config?: Json | null
          updated_at?: string | null
        }
        Update: {
          conditional_logic?: Json | null
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          identification_role?: string | null
          image_url?: string | null
          is_active?: boolean | null
          is_chart_metric?: boolean | null
          is_required?: boolean | null
          label?: string
          metric_category?: string | null
          metric_name?: string | null
          options?: Json | null
          placeholder?: string | null
          question_type?: string
          section_id?: string | null
          slider_config?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "form_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      form_responses: {
        Row: {
          created_at: string | null
          id: string
          question_id: string | null
          response_value: Json
          submission_id: string | null
          visit_form_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          question_id?: string | null
          response_value: Json
          submission_id?: string | null
          visit_form_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          question_id?: string | null
          response_value?: Json
          submission_id?: string | null
          visit_form_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "form_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_responses_visit_form_id_fkey"
            columns: ["visit_form_id"]
            isOneToOne: false
            referencedRelation: "visit_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_sections: {
        Row: {
          conditional_logic: Json | null
          created_at: string | null
          description: string | null
          display_order: number
          id: string
          is_active: boolean | null
          template_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          conditional_logic?: Json | null
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          template_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          conditional_logic?: Json | null
          created_at?: string | null
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean | null
          template_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_sections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          geolocation_error: string | null
          geolocation_status: string | null
          id: string
          latitude: number | null
          longitude: number | null
          metadata: Json
          pdf_path: string | null
          submitted_at: string
          template_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          geolocation_error?: string | null
          geolocation_status?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          pdf_path?: string | null
          submitted_at?: string
          template_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          geolocation_error?: string | null
          geolocation_status?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          metadata?: Json
          pdf_path?: string | null
          submitted_at?: string
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "form_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      form_templates: {
        Row: {
          ai_analysis_config: Json
          color: string | null
          created_at: string
          dashboard_config: Json
          description: string | null
          display_order: number
          generates_pdf: boolean
          icon: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          requires_geolocation: boolean
          slug: string
          updated_at: string
        }
        Insert: {
          ai_analysis_config?: Json
          color?: string | null
          created_at?: string
          dashboard_config?: Json
          description?: string | null
          display_order?: number
          generates_pdf?: boolean
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          requires_geolocation?: boolean
          slug: string
          updated_at?: string
        }
        Update: {
          ai_analysis_config?: Json
          color?: string | null
          created_at?: string
          dashboard_config?: Json
          description?: string | null
          display_order?: number
          generates_pdf?: boolean
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          requires_geolocation?: boolean
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      import_history: {
        Row: {
          created_at: string
          created_by: string | null
          created_ids: Json
          id: string
          rolled_back_at: string | null
          rolled_back_by: string | null
          status: string
          total_created: number
          total_updated: number
          updated_records: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_ids?: Json
          id?: string
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          status?: string
          total_created?: number
          total_updated?: number
          updated_records?: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_ids?: Json
          id?: string
          rolled_back_at?: string | null
          rolled_back_by?: string | null
          status?: string
          total_created?: number
          total_updated?: number
          updated_records?: Json
        }
        Relationships: []
      }
      pesquisa_satisfacao_logistica: {
        Row: {
          cliente_codigo: string | null
          cliente_nome: string | null
          condicao_produtos: string
          created_at: string
          entrega_no_prazo: string
          id: string
          nota_atendimento: number
          nota_satisfacao: number
          pedido_correto: string
          sugestao_melhoria: string | null
        }
        Insert: {
          cliente_codigo?: string | null
          cliente_nome?: string | null
          condicao_produtos: string
          created_at?: string
          entrega_no_prazo: string
          id?: string
          nota_atendimento: number
          nota_satisfacao: number
          pedido_correto: string
          sugestao_melhoria?: string | null
        }
        Update: {
          cliente_codigo?: string | null
          cliente_nome?: string | null
          condicao_produtos?: string
          created_at?: string
          entrega_no_prazo?: string
          id?: string
          nota_atendimento?: number
          nota_satisfacao?: number
          pedido_correto?: string
          sugestao_melhoria?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          must_reset_password: boolean | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          must_reset_password?: boolean | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          must_reset_password?: boolean | null
        }
        Relationships: []
      }
      system_documentation: {
        Row: {
          content: string
          display_order: number
          id: string
          section_key: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          content?: string
          display_order?: number
          id?: string
          section_key: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          content?: string
          display_order?: number
          id?: string
          section_key?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      team_daily_goals: {
        Row: {
          cod_equipe: string
          cod_rca_lopes: string | null
          created_at: string | null
          id: string
          meta_diaria: number
          nome_equipe: string
          updated_at: string | null
        }
        Insert: {
          cod_equipe: string
          cod_rca_lopes?: string | null
          created_at?: string | null
          id?: string
          meta_diaria?: number
          nome_equipe: string
          updated_at?: string | null
        }
        Update: {
          cod_equipe?: string
          cod_rca_lopes?: string | null
          created_at?: string | null
          id?: string
          meta_diaria?: number
          nome_equipe?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      teams_vendors: {
        Row: {
          cargo: Database["public"]["Enums"]["team_role"] | null
          cod_equipe: string
          cod_rca_lopes: string
          created_at: string | null
          id: string
          nome_equipe: string
          nome_rca: string | null
          supervisor_id: string | null
        }
        Insert: {
          cargo?: Database["public"]["Enums"]["team_role"] | null
          cod_equipe: string
          cod_rca_lopes: string
          created_at?: string | null
          id?: string
          nome_equipe: string
          nome_rca?: string | null
          supervisor_id?: string | null
        }
        Update: {
          cargo?: Database["public"]["Enums"]["team_role"] | null
          cod_equipe?: string
          cod_rca_lopes?: string
          created_at?: string | null
          id?: string
          nome_equipe?: string
          nome_rca?: string | null
          supervisor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_vendors_supervisor_id_fkey"
            columns: ["supervisor_id"]
            isOneToOne: false
            referencedRelation: "teams_vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      tutorial_slides: {
        Row: {
          block: string
          created_at: string
          diagram_nodes: Json | null
          display_order: number
          highlight_description: string | null
          highlight_label: string | null
          highlight_value: string | null
          id: string
          items: Json | null
          screenshot_layout: string | null
          screenshot_position: string | null
          screenshot_url: string | null
          screenshots: Json | null
          subtitle: string | null
          table_data: Json | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          block?: string
          created_at?: string
          diagram_nodes?: Json | null
          display_order?: number
          highlight_description?: string | null
          highlight_label?: string | null
          highlight_value?: string | null
          id?: string
          items?: Json | null
          screenshot_layout?: string | null
          screenshot_position?: string | null
          screenshot_url?: string | null
          screenshots?: Json | null
          subtitle?: string | null
          table_data?: Json | null
          title?: string
          type?: string
          updated_at?: string
        }
        Update: {
          block?: string
          created_at?: string
          diagram_nodes?: Json | null
          display_order?: number
          highlight_description?: string | null
          highlight_label?: string | null
          highlight_value?: string | null
          id?: string
          items?: Json | null
          screenshot_layout?: string | null
          screenshot_position?: string | null
          screenshot_url?: string | null
          screenshots?: Json | null
          subtitle?: string | null
          table_data?: Json | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visit_forms: {
        Row: {
          activation_promotion_details: string | null
          additional_comments: string | null
          address: string | null
          adequate_assortment_available: boolean
          client_code: string
          created_at: string | null
          created_by: string | null
          delivery_level: number | null
          execution_level: number | null
          geolocation_error: string | null
          geolocation_status: string | null
          has_activation_promotion: boolean
          has_merchandising_material: boolean
          has_mix_expansion_opportunities: boolean
          has_promotional_gift: boolean
          has_visibility_improvement_opportunities: boolean
          id: string
          latitude: number | null
          longitude: number | null
          manager: string
          merchandising_material_details: string | null
          mix_expansion_details: string | null
          pdf_path: string | null
          prices_visible_correct: boolean
          promotional_gift_details: string | null
          rca_accompanied: string
          relationship_level: number | null
          ruptures_description: string | null
          submitted_at: string | null
          vendor_applied_positivation: boolean
          vendor_follows_visit_frequency: boolean
          vendor_observations: string | null
          visibility_improvement_details: string | null
          visit_date: string
        }
        Insert: {
          activation_promotion_details?: string | null
          additional_comments?: string | null
          address?: string | null
          adequate_assortment_available: boolean
          client_code: string
          created_at?: string | null
          created_by?: string | null
          delivery_level?: number | null
          execution_level?: number | null
          geolocation_error?: string | null
          geolocation_status?: string | null
          has_activation_promotion: boolean
          has_merchandising_material: boolean
          has_mix_expansion_opportunities: boolean
          has_promotional_gift: boolean
          has_visibility_improvement_opportunities: boolean
          id?: string
          latitude?: number | null
          longitude?: number | null
          manager: string
          merchandising_material_details?: string | null
          mix_expansion_details?: string | null
          pdf_path?: string | null
          prices_visible_correct: boolean
          promotional_gift_details?: string | null
          rca_accompanied: string
          relationship_level?: number | null
          ruptures_description?: string | null
          submitted_at?: string | null
          vendor_applied_positivation: boolean
          vendor_follows_visit_frequency: boolean
          vendor_observations?: string | null
          visibility_improvement_details?: string | null
          visit_date: string
        }
        Update: {
          activation_promotion_details?: string | null
          additional_comments?: string | null
          address?: string | null
          adequate_assortment_available?: boolean
          client_code?: string
          created_at?: string | null
          created_by?: string | null
          delivery_level?: number | null
          execution_level?: number | null
          geolocation_error?: string | null
          geolocation_status?: string | null
          has_activation_promotion?: boolean
          has_merchandising_material?: boolean
          has_mix_expansion_opportunities?: boolean
          has_promotional_gift?: boolean
          has_visibility_improvement_opportunities?: boolean
          id?: string
          latitude?: number | null
          longitude?: number | null
          manager?: string
          merchandising_material_details?: string | null
          mix_expansion_details?: string | null
          pdf_path?: string | null
          prices_visible_correct?: boolean
          promotional_gift_details?: string | null
          rca_accompanied?: string
          relationship_level?: number | null
          ruptures_description?: string | null
          submitted_at?: string | null
          vendor_applied_positivation?: boolean
          vendor_follows_visit_frequency?: boolean
          vendor_observations?: string | null
          visibility_improvement_details?: string | null
          visit_date?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_must_reset_password: {
        Args: { user_email: string }
        Returns: boolean
      }
      get_active_form_templates: {
        Args: never
        Returns: {
          ai_analysis_config: Json
          color: string | null
          created_at: string
          dashboard_config: Json
          description: string | null
          display_order: number
          generates_pdf: boolean
          icon: string | null
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          requires_geolocation: boolean
          slug: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "form_templates"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_all_feedbacks_for_dashboard: {
        Args: never
        Returns: {
          action_plan: string
          constructive_criticism: string
          created_at: string
          created_by: string | null
          id: string
          pdf_path: string | null
          supervisor: string
          vendor_code: string
          visit_form_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "feedbacks"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_all_visits_for_dashboard: {
        Args: never
        Returns: {
          activation_promotion_details: string | null
          additional_comments: string | null
          address: string | null
          adequate_assortment_available: boolean
          client_code: string
          created_at: string | null
          created_by: string | null
          delivery_level: number | null
          execution_level: number | null
          geolocation_error: string | null
          geolocation_status: string | null
          has_activation_promotion: boolean
          has_merchandising_material: boolean
          has_mix_expansion_opportunities: boolean
          has_promotional_gift: boolean
          has_visibility_improvement_opportunities: boolean
          id: string
          latitude: number | null
          longitude: number | null
          manager: string
          merchandising_material_details: string | null
          mix_expansion_details: string | null
          pdf_path: string | null
          prices_visible_correct: boolean
          promotional_gift_details: string | null
          rca_accompanied: string
          relationship_level: number | null
          ruptures_description: string | null
          submitted_at: string | null
          vendor_applied_positivation: boolean
          vendor_follows_visit_frequency: boolean
          vendor_observations: string | null
          visibility_improvement_details: string | null
          visit_date: string
        }[]
        SetofOptions: {
          from: "*"
          to: "visit_forms"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_top_managers_current_month: {
        Args: never
        Returns: {
          count: number
          manager: string
        }[]
      }
      get_unified_visits_for_dashboard: {
        Args: never
        Returns: {
          additional_comments: string
          address: string
          client_code: string
          created_by: string
          delivery_level: number
          execution_level: number
          has_mix_expansion_opportunities: boolean
          has_visibility_improvement_opportunities: boolean
          id: string
          latitude: number
          longitude: number
          manager: string
          mix_expansion_details: string
          pdf_path: string
          rca_accompanied: string
          relationship_level: number
          ruptures_description: string
          source: string
          template_name: string
          vendor_observations: string
          visibility_improvement_details: string
          visit_date: string
        }[]
      }
      get_visits_count_for_goal: {
        Args: {
          p_cod_rca_lopes: string
          p_nome_equipe: string
          p_target_date: string
        }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved: { Args: { _user_id: string }; Returns: boolean }
      user_can_access_rca: {
        Args: { _cod_rca: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "gestor" | "usuario"
      team_role: "coordenador" | "supervisor" | "vendedor" | "gerente"
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
      app_role: ["admin", "gestor", "usuario"],
      team_role: ["coordenador", "supervisor", "vendedor", "gerente"],
    },
  },
} as const
