/**
 * Supabase veritabanı tipleri.
 * Kaynak: supabase/migrations/20261023000000_ekonix_schema.sql
 * Şema değişirse yeniden üretin:  supabase gen types typescript --linked > types/database.types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      cpo_partners: {
        Row: {
          id: string
          cpo_id: string
          cpo_name: string
          city: string | null
          priority: string | null
          ekonix_owner: string | null
          cpo_stage: string | null
          next_action: string | null
          next_action_date: string | null
          last_updated: string | null
          nda_date: string | null
          mou_signed_date: string | null
          mou_expiry_date: string | null
          existing_stations: number | null
          existing_dc_points: number | null
          interoperability: string | null
          revenue_share_cpo_pct: number | null
          due_diligence: string | null
          starcharge_approval_date: string | null
          target_dc_points: number | null
          registered_brands: string | null
          legal_name: string | null
          district: string | null
          licence_no: string | null
          licence_status: string | null
          licence_start_date: string | null
          licence_end_date: string | null
          tax_no: string | null
          kep_email: string | null
          phone: string | null
          address: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          cpo_id: string
          cpo_name: string
          city?: string | null
          priority?: string | null
          ekonix_owner?: string | null
          cpo_stage?: string | null
          next_action?: string | null
          next_action_date?: string | null
          last_updated?: string | null
          nda_date?: string | null
          mou_signed_date?: string | null
          mou_expiry_date?: string | null
          existing_stations?: number | null
          existing_dc_points?: number | null
          interoperability?: string | null
          revenue_share_cpo_pct?: number | null
          due_diligence?: string | null
          starcharge_approval_date?: string | null
          target_dc_points?: number | null
          registered_brands?: string | null
          legal_name?: string | null
          district?: string | null
          licence_no?: string | null
          licence_status?: string | null
          licence_start_date?: string | null
          licence_end_date?: string | null
          tax_no?: string | null
          kep_email?: string | null
          phone?: string | null
          address?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          cpo_id?: string
          cpo_name?: string
          city?: string | null
          priority?: string | null
          ekonix_owner?: string | null
          cpo_stage?: string | null
          next_action?: string | null
          next_action_date?: string | null
          last_updated?: string | null
          nda_date?: string | null
          mou_signed_date?: string | null
          mou_expiry_date?: string | null
          existing_stations?: number | null
          existing_dc_points?: number | null
          interoperability?: string | null
          revenue_share_cpo_pct?: number | null
          due_diligence?: string | null
          starcharge_approval_date?: string | null
          target_dc_points?: number | null
          registered_brands?: string | null
          legal_name?: string | null
          district?: string | null
          licence_no?: string | null
          licence_status?: string | null
          licence_start_date?: string | null
          licence_end_date?: string | null
          tax_no?: string | null
          kep_email?: string | null
          phone?: string | null
          address?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      sites: {
        Row: {
          id: string
          project_name: string
          blocker_concern_risk: string | null
          next_action: string | null
          total_score: number | null
          survey_history: string | null
          next_survey_date: string | null
          presentation_status: string | null
          proposal_contract_status: string | null
          blueprint_status: string | null
          epc_status: string | null
          logistics_status: string | null
          warehouse_status: string | null
          construction_status: string | null
          ekonix_owner: string | null
          stage: Database["public"]["Enums"]["pipeline_stage"]
          status: string | null
          next_action_date: string | null
          last_updated: string | null
          son_durum_tr: string | null
          alerts_auto: string | null
          local_partner_auto: string | null
          engel_tr: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          project_name: string
          blocker_concern_risk?: string | null
          next_action?: string | null
          total_score?: number | null
          survey_history?: string | null
          next_survey_date?: string | null
          presentation_status?: string | null
          proposal_contract_status?: string | null
          blueprint_status?: string | null
          epc_status?: string | null
          logistics_status?: string | null
          warehouse_status?: string | null
          construction_status?: string | null
          ekonix_owner?: string | null
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          status?: string | null
          next_action_date?: string | null
          last_updated?: string | null
          son_durum_tr?: string | null
          alerts_auto?: string | null
          local_partner_auto?: string | null
          engel_tr?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          project_name?: string
          blocker_concern_risk?: string | null
          next_action?: string | null
          total_score?: number | null
          survey_history?: string | null
          next_survey_date?: string | null
          presentation_status?: string | null
          proposal_contract_status?: string | null
          blueprint_status?: string | null
          epc_status?: string | null
          logistics_status?: string | null
          warehouse_status?: string | null
          construction_status?: string | null
          ekonix_owner?: string | null
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          status?: string | null
          next_action_date?: string | null
          last_updated?: string | null
          son_durum_tr?: string | null
          alerts_auto?: string | null
          local_partner_auto?: string | null
          engel_tr?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      site_details: {
        Row: {
          id: string
          site_id: string | null
          project_name: string
          city: string | null
          property_type: string | null
          site_owner_landlord: string | null
          local_partner: string | null
          customer_needs: string | null
          site_size_boundary: string | null
          parking_spaces: number | null
          transformer_power_kva: number | null
          distance_cable_route_m: number | null
          meeting_tariff: string | null
          competitor_survey: string | null
          key_survey_notes: string | null
          site_survey_files_url: string | null
          total_man_hours: number | null
          evse_capacity_kw: number | null
          pv_bess_capacity: string | null
          starcharge_approval_date: string | null
          contract_signed_date: string | null
          missing_info_for_stage: string | null
          cpo_partner: string | null
          dc_charge_points_designed: number | null
          ac_charge_points_designed: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          site_id?: string | null
          project_name: string
          city?: string | null
          property_type?: string | null
          site_owner_landlord?: string | null
          local_partner?: string | null
          customer_needs?: string | null
          site_size_boundary?: string | null
          parking_spaces?: number | null
          transformer_power_kva?: number | null
          distance_cable_route_m?: number | null
          meeting_tariff?: string | null
          competitor_survey?: string | null
          key_survey_notes?: string | null
          site_survey_files_url?: string | null
          total_man_hours?: number | null
          evse_capacity_kw?: number | null
          pv_bess_capacity?: string | null
          starcharge_approval_date?: string | null
          contract_signed_date?: string | null
          missing_info_for_stage?: string | null
          cpo_partner?: string | null
          dc_charge_points_designed?: number | null
          ac_charge_points_designed?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          site_id?: string | null
          project_name?: string
          city?: string | null
          property_type?: string | null
          site_owner_landlord?: string | null
          local_partner?: string | null
          customer_needs?: string | null
          site_size_boundary?: string | null
          parking_spaces?: number | null
          transformer_power_kva?: number | null
          distance_cable_route_m?: number | null
          meeting_tariff?: string | null
          competitor_survey?: string | null
          key_survey_notes?: string | null
          site_survey_files_url?: string | null
          total_man_hours?: number | null
          evse_capacity_kw?: number | null
          pv_bess_capacity?: string | null
          starcharge_approval_date?: string | null
          contract_signed_date?: string | null
          missing_info_for_stage?: string | null
          cpo_partner?: string | null
          dc_charge_points_designed?: number | null
          ac_charge_points_designed?: number | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_details_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: true
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          id: string
          contract_id: string
          site_id: string | null
          project_name: string
          contract_status: string
          probability_pct: number | null
          ball_in_court: string | null
          next_step: string | null
          next_step_date: string | null
          draft_sent_date: string | null
          last_revision_sent_date: string | null
          revision_rounds: number | null
          counterparty_last_response_date: string | null
          signed_date: string | null
          contract_term_years: number | null
          revenue_share_landlord_partner_pct: number | null
          revenue_share_vs_standard: string | null
          term_vs_standard: string | null
          electricity_subscription_vs_standard: string | null
          grid_connection_cost_vs_standard: string | null
          site_services_vs_standard: string | null
          exclusivity_vs_standard: string | null
          termination_exit_vs_standard: string | null
          deviations_auto: string | null
          open_issues: string | null
          deviation_notes: string | null
          dc_points_designed: number | null
          weighted_dc_points: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          contract_id: string
          site_id?: string | null
          project_name: string
          contract_status: string
          probability_pct?: number | null
          ball_in_court?: string | null
          next_step?: string | null
          next_step_date?: string | null
          draft_sent_date?: string | null
          last_revision_sent_date?: string | null
          revision_rounds?: number | null
          counterparty_last_response_date?: string | null
          signed_date?: string | null
          contract_term_years?: number | null
          revenue_share_landlord_partner_pct?: number | null
          revenue_share_vs_standard?: string | null
          term_vs_standard?: string | null
          electricity_subscription_vs_standard?: string | null
          grid_connection_cost_vs_standard?: string | null
          site_services_vs_standard?: string | null
          exclusivity_vs_standard?: string | null
          termination_exit_vs_standard?: string | null
          deviations_auto?: string | null
          open_issues?: string | null
          deviation_notes?: string | null
          dc_points_designed?: number | null
          weighted_dc_points?: never
          created_at?: string | null
        }
        Update: {
          id?: string
          contract_id?: string
          site_id?: string | null
          project_name?: string
          contract_status?: string
          probability_pct?: number | null
          ball_in_court?: string | null
          next_step?: string | null
          next_step_date?: string | null
          draft_sent_date?: string | null
          last_revision_sent_date?: string | null
          revision_rounds?: number | null
          counterparty_last_response_date?: string | null
          signed_date?: string | null
          contract_term_years?: number | null
          revenue_share_landlord_partner_pct?: number | null
          revenue_share_vs_standard?: string | null
          term_vs_standard?: string | null
          electricity_subscription_vs_standard?: string | null
          grid_connection_cost_vs_standard?: string | null
          site_services_vs_standard?: string | null
          exclusivity_vs_standard?: string | null
          termination_exit_vs_standard?: string | null
          deviations_auto?: string | null
          open_issues?: string | null
          deviation_notes?: string | null
          dc_points_designed?: number | null
          weighted_dc_points?: never
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_executions: {
        Row: {
          id: string
          exec_id: string
          site_id: string | null
          project_name: string
          licensed_cpo: string | null
          project_manager: string | null
          next_gate: Database["public"]["Enums"]["execution_gate"] | null
          waiting_on: string | null
          next_gate_target_date: string | null
          go_live_checklist_pct: number | null
          g1_site_authority_approved_date: string | null
          g2_feasibility_approved_date: string | null
          ek1_submitted_to_grid_date: string | null
          ek2_positive_opinion_issued_g3_date: string | null
          ek2_deadline_for_epdk_date: string | null
          electrical_design_approved_date: string | null
          construction_complete_g4_date: string | null
          electrical_acceptance_energization_date: string | null
          workplace_licence_obtained_g5_date: string | null
          epdk_application_submitted_date: string | null
          epdk_approval_g6_date: string | null
          startye_e2e_acceptance_test_g7_date: string | null
          commercial_go_live_date: string | null
          grid_operator: string | null
          epdk_srj_station_no: string | null
          physical_sockets: number | null
          startye_connectors: number | null
          epdk_sockets_skt: number | null
          socket_match_auto: boolean | null
          chk_grid_metering_done: boolean | null
          chk_workplace_licence_obtained: boolean | null
          chk_epdk_approved: boolean | null
          chk_records_match_1to1: boolean | null
          chk_energy_reconciliation_tested: boolean | null
          chk_tariff_payment_tested: boolean | null
          chk_sarj_tr_app_verified: boolean | null
          chk_support_sla_active: boolean | null
          chk_cpo_go_live_signed: boolean | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          exec_id: string
          site_id?: string | null
          project_name: string
          licensed_cpo?: string | null
          project_manager?: string | null
          next_gate?: Database["public"]["Enums"]["execution_gate"] | null
          waiting_on?: string | null
          next_gate_target_date?: string | null
          go_live_checklist_pct?: number | null
          g1_site_authority_approved_date?: string | null
          g2_feasibility_approved_date?: string | null
          ek1_submitted_to_grid_date?: string | null
          ek2_positive_opinion_issued_g3_date?: string | null
          ek2_deadline_for_epdk_date?: string | null
          electrical_design_approved_date?: string | null
          construction_complete_g4_date?: string | null
          electrical_acceptance_energization_date?: string | null
          workplace_licence_obtained_g5_date?: string | null
          epdk_application_submitted_date?: string | null
          epdk_approval_g6_date?: string | null
          startye_e2e_acceptance_test_g7_date?: string | null
          commercial_go_live_date?: string | null
          grid_operator?: string | null
          epdk_srj_station_no?: string | null
          physical_sockets?: number | null
          startye_connectors?: number | null
          epdk_sockets_skt?: number | null
          socket_match_auto?: never
          chk_grid_metering_done?: boolean | null
          chk_workplace_licence_obtained?: boolean | null
          chk_epdk_approved?: boolean | null
          chk_records_match_1to1?: boolean | null
          chk_energy_reconciliation_tested?: boolean | null
          chk_tariff_payment_tested?: boolean | null
          chk_sarj_tr_app_verified?: boolean | null
          chk_support_sla_active?: boolean | null
          chk_cpo_go_live_signed?: boolean | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          exec_id?: string
          site_id?: string | null
          project_name?: string
          licensed_cpo?: string | null
          project_manager?: string | null
          next_gate?: Database["public"]["Enums"]["execution_gate"] | null
          waiting_on?: string | null
          next_gate_target_date?: string | null
          go_live_checklist_pct?: number | null
          g1_site_authority_approved_date?: string | null
          g2_feasibility_approved_date?: string | null
          ek1_submitted_to_grid_date?: string | null
          ek2_positive_opinion_issued_g3_date?: string | null
          ek2_deadline_for_epdk_date?: string | null
          electrical_design_approved_date?: string | null
          construction_complete_g4_date?: string | null
          electrical_acceptance_energization_date?: string | null
          workplace_licence_obtained_g5_date?: string | null
          epdk_application_submitted_date?: string | null
          epdk_approval_g6_date?: string | null
          startye_e2e_acceptance_test_g7_date?: string | null
          commercial_go_live_date?: string | null
          grid_operator?: string | null
          epdk_srj_station_no?: string | null
          physical_sockets?: number | null
          startye_connectors?: number | null
          epdk_sockets_skt?: number | null
          socket_match_auto?: never
          chk_grid_metering_done?: boolean | null
          chk_workplace_licence_obtained?: boolean | null
          chk_epdk_approved?: boolean | null
          chk_records_match_1to1?: boolean | null
          chk_energy_reconciliation_tested?: boolean | null
          chk_tariff_payment_tested?: boolean | null
          chk_sarj_tr_app_verified?: boolean | null
          chk_support_sla_active?: boolean | null
          chk_cpo_go_live_signed?: boolean | null
          notes?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_executions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_logs: {
        Row: {
          id: string
          log_id: string
          site_id: string | null
          project_name: string | null
          activity_date: string
          activity_type: string
          ekonix_attendees: string | null
          counterparty: string | null
          man_hours: number | null
          summary_findings: string | null
          next_step: string | null
          next_step_date: string | null
          week_info: string | null
          in_weekly_report: boolean | null
          report_no: string | null
          cpo_name: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          log_id: string
          site_id?: string | null
          project_name?: string | null
          activity_date: string
          activity_type: string
          ekonix_attendees?: string | null
          counterparty?: string | null
          man_hours?: number | null
          summary_findings?: string | null
          next_step?: string | null
          next_step_date?: string | null
          week_info?: string | null
          in_weekly_report?: boolean | null
          report_no?: string | null
          cpo_name?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          log_id?: string
          site_id?: string | null
          project_name?: string | null
          activity_date?: string
          activity_type?: string
          ekonix_attendees?: string | null
          counterparty?: string | null
          man_hours?: number | null
          summary_findings?: string | null
          next_step?: string | null
          next_step_date?: string | null
          week_info?: string | null
          in_weekly_report?: boolean | null
          report_no?: string | null
          cpo_name?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      site_actions: {
        Row: {
          id: string
          action_id: string
          site_id: string | null
          project_name: string | null
          action_description: string
          owner: string
          priority: string | null
          created_date: string | null
          due_date: string | null
          status: Database["public"]["Enums"]["action_status"] | null
          closed_date: string | null
          notes: string | null
          cpo_name: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          action_id: string
          site_id?: string | null
          project_name?: string | null
          action_description: string
          owner: string
          priority?: string | null
          created_date?: string | null
          due_date?: string | null
          status?: Database["public"]["Enums"]["action_status"] | null
          closed_date?: string | null
          notes?: string | null
          cpo_name?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          action_id?: string
          site_id?: string | null
          project_name?: string | null
          action_description?: string
          owner?: string
          priority?: string | null
          created_date?: string | null
          due_date?: string | null
          status?: Database["public"]["Enums"]["action_status"] | null
          closed_date?: string | null
          notes?: string | null
          cpo_name?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_actions_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      change_logs: {
        Row: {
          id: string
          change_id: string
          site_id: string | null
          project_name: string
          date_of_change: string
          epdk_srj_no: string | null
          change_type: string
          description_before_after: string
          reported_to_epdk: boolean | null
          business_days_to_report: number | null
          grid_operator_notified: boolean | null
          startye_epdk_rereconciled: boolean | null
          entered_by: string
          created_at: string | null
        }
        Insert: {
          id?: string
          change_id: string
          site_id?: string | null
          project_name: string
          date_of_change: string
          epdk_srj_no?: string | null
          change_type: string
          description_before_after: string
          reported_to_epdk?: boolean | null
          business_days_to_report?: number | null
          grid_operator_notified?: boolean | null
          startye_epdk_rereconciled?: boolean | null
          entered_by: string
          created_at?: string | null
        }
        Update: {
          id?: string
          change_id?: string
          site_id?: string | null
          project_name?: string
          date_of_change?: string
          epdk_srj_no?: string | null
          change_type?: string
          description_before_after?: string
          reported_to_epdk?: boolean | null
          business_days_to_report?: number | null
          grid_operator_notified?: boolean | null
          startye_epdk_rereconciled?: boolean | null
          entered_by?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "change_logs_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      pipeline_stage:
        | "01 Potansiyel"
        | "02 Saha İnceleme / Görüşme"
        | "03 Sunum Yapıldı"
        | "04 Teklif / Sözleşme Taslağı"
        | "05 Sözleşme Süreci"
        | "06 Sözleşme İmzalandı"
        | "07 Kurulum / EPDK"
        | "08 Canlı / İşletmede"
        | "09 Pasif / İptal"
      execution_gate:
        | "G1 Site Authority"
        | "G2 Feasibility"
        | "G3 EK-2 Positive"
        | "G4 Construction Complete"
        | "G5 Workplace Licence"
        | "G6 EPDK Approval"
        | "G7 StarTye E2E Test"
        | "G8 Commercial Go-Live"
      action_status:
        | "Open"
        | "In Progress"
        | "Closed"
        | "Pending"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]

// ---------------------------------------------------------------------------
// Satır tipleri (kısa adlar)
// ---------------------------------------------------------------------------
export type CpoPartner = Tables<"cpo_partners">
export type Site = Tables<"sites">
export type SiteDetails = Tables<"site_details">
export type Contract = Tables<"contracts">
export type SiteExecution = Tables<"site_executions">
export type ActivityLog = Tables<"activity_logs">
export type SiteAction = Tables<"site_actions">
export type ChangeLog = Tables<"change_logs">

export type PipelineStage = Enums<"pipeline_stage">
export type ExecutionGate = Enums<"execution_gate">
export type ActionStatus = Enums<"action_status">

// ---------------------------------------------------------------------------
// İlişki yardımcı tipleri
//
//   sites 1 ─── 1 site_details      (site_details.site_id UNIQUE, CASCADE)
//   sites 1 ─── N contracts         (RESTRICT: sözleşmesi olan saha silinemez)
//   sites 1 ─── N site_executions   (CASCADE)
//   sites 1 ─── N activity_logs     (SET NULL)
//   sites 1 ─── N site_actions      (CASCADE)
//   sites 1 ─── N change_logs       (RESTRICT)
//
// PostgREST, 1:1 yabancı anahtarı (UNIQUE) tek nesne olarak döndürür; 1:N
// ilişkiyi dizi olarak döndürür. Aşağıdaki tipler bu yapıya karşılık gelir.
// ---------------------------------------------------------------------------

/** sites + site_details (1:1) */
export type SiteWithDetails = Site & { site_details: SiteDetails | null }

/** sites + sözleşmeler (1:N) */
export type SiteWithContracts = Site & { contracts: Contract[] }

/** sites + kurulum kayıtları (1:N) */
export type SiteWithExecutions = Site & { site_executions: SiteExecution[] }

/** Dört çekirdek tablonun tam birleşimi */
export type SiteFull = Site & {
  site_details: SiteDetails | null
  contracts: Contract[]
  site_executions: SiteExecution[]
}

/** Sahanın tüm bağlı kayıtları (geçmiş dahil) */
export type SiteWithHistory = SiteFull & {
  activity_logs: ActivityLog[]
  site_actions: SiteAction[]
  change_logs: ChangeLog[]
}

/** Alt kayıtlardan sahaya geri bağlantı */
export type ContractWithSite = Contract & { sites: Site | null }
export type SiteExecutionWithSite = SiteExecution & { sites: Site | null }
export type SiteDetailsWithSite = SiteDetails & { sites: Site | null }

// ---------------------------------------------------------------------------
// Supabase select dizeleri (tip güvenli kullanım için sabitler)
// ---------------------------------------------------------------------------
export const SITE_WITH_DETAILS_SELECT = "*, site_details(*)" as const
export const SITE_FULL_SELECT = "*, site_details(*), contracts(*), site_executions(*)" as const
export const SITE_WITH_HISTORY_SELECT =
  "*, site_details(*), contracts(*), site_executions(*), activity_logs(*), site_actions(*), change_logs(*)" as const
