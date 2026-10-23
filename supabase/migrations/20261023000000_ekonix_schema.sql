-- Ekonix EV CPO & Star Charge Distribütörlük: iş takip şeması
-- Kaynak: EKONIX_EV_Business_Tracker_r11.xlsx
--
-- NOT: Bu dosya Supabase (ayrı bir PostgreSQL) içindir. Bu repodaki Neon
-- veritabanında `sites` ve `config` tabloları farklı bir şemayla zaten var;
-- orada çalıştırmayın.

-- ---------------------------------------------------------------------------
-- Enum tipleri
-- ---------------------------------------------------------------------------
CREATE TYPE pipeline_stage AS ENUM (
    '01 Potansiyel',
    '02 Saha İnceleme / Görüşme',
    '03 Sunum Yapıldı',
    '04 Teklif / Sözleşme Taslağı',
    '05 Sözleşme Süreci',
    '06 Sözleşme İmzalandı',
    '07 Kurulum / EPDK',
    '08 Canlı / İşletmede',
    '09 Pasif / İptal'
);

CREATE TYPE execution_gate AS ENUM (
    'G1 Site Authority',
    'G2 Feasibility',
    'G3 EK-2 Positive',
    'G4 Construction Complete',
    'G5 Workplace Licence',
    'G6 EPDK Approval',
    'G7 StarTye E2E Test',
    'G8 Commercial Go-Live'
);

-- Değerleri şemada yorum olarak verilmiş: Open, In Progress, Closed, Pending
CREATE TYPE action_status AS ENUM ('Open', 'In Progress', 'Closed', 'Pending');

-- ---------------------------------------------------------------------------
-- last_updated alanını güncelleyen tetikleyici
-- ---------------------------------------------------------------------------
CREATE FUNCTION set_last_updated() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 1. CPO PARTNERS (EPDK lisanslı CPO operatörleri ve MoU takibi)
-- ---------------------------------------------------------------------------
CREATE TABLE cpo_partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpo_id VARCHAR(50) UNIQUE NOT NULL,
    cpo_name VARCHAR(255) NOT NULL,
    city VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'P2',
    ekonix_owner VARCHAR(100),
    cpo_stage VARCHAR(100),
    next_action TEXT,
    next_action_date DATE,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    -- MoU & Program
    nda_date DATE,
    mou_signed_date DATE,
    mou_expiry_date DATE,
    existing_stations INT DEFAULT 0,
    existing_dc_points INT DEFAULT 0,
    interoperability VARCHAR(50),
    revenue_share_cpo_pct NUMERIC(5,2),
    due_diligence VARCHAR(50),
    starcharge_approval_date DATE,
    target_dc_points INT DEFAULT 0,
    -- EPDK lisans detayları
    registered_brands TEXT,
    legal_name VARCHAR(255),
    district VARCHAR(100),
    licence_no VARCHAR(100),
    licence_status VARCHAR(50),
    licence_start_date DATE,
    licence_end_date DATE,
    tax_no VARCHAR(50),
    kep_email VARCHAR(150),
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 2. SITES (saha adayları pipeline)
-- ---------------------------------------------------------------------------
CREATE TABLE sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_name VARCHAR(255) UNIQUE NOT NULL, -- çekirdek tekil tanımlayıcı
    blocker_concern_risk TEXT,
    next_action TEXT,
    total_score NUMERIC(5,2),
    survey_history TEXT,
    next_survey_date DATE,
    presentation_status VARCHAR(100),
    proposal_contract_status VARCHAR(100),
    blueprint_status VARCHAR(100),
    epc_status VARCHAR(100),
    logistics_status VARCHAR(100),
    warehouse_status VARCHAR(100),
    construction_status VARCHAR(100),
    ekonix_owner VARCHAR(100),
    stage pipeline_stage NOT NULL DEFAULT '01 Potansiyel',
    status VARCHAR(50) DEFAULT 'Active',
    next_action_date DATE,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    son_durum_tr TEXT,
    alerts_auto TEXT,
    local_partner_auto VARCHAR(255),
    engel_tr TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 3. SITE DETAILS (saha teknik ve keşif detayları), sites ile 1:1
-- ---------------------------------------------------------------------------
CREATE TABLE site_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    site_id UUID UNIQUE REFERENCES sites(id) ON DELETE CASCADE,
    project_name VARCHAR(255) UNIQUE NOT NULL,
    city VARCHAR(100),
    property_type VARCHAR(100),
    site_owner_landlord VARCHAR(255),
    local_partner VARCHAR(255),
    customer_needs TEXT,
    site_size_boundary TEXT,
    parking_spaces INT,
    transformer_power_kva NUMERIC(10,2),
    distance_cable_route_m NUMERIC(10,2),
    meeting_tariff TEXT,
    competitor_survey TEXT,
    key_survey_notes TEXT,
    site_survey_files_url TEXT,
    total_man_hours NUMERIC(8,2) DEFAULT 0,
    evse_capacity_kw NUMERIC(10,2) DEFAULT 0,
    pv_bess_capacity TEXT,
    starcharge_approval_date DATE,
    contract_signed_date DATE,
    missing_info_for_stage TEXT,
    cpo_partner VARCHAR(255),
    dc_charge_points_designed INT DEFAULT 0,
    ac_charge_points_designed INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 4. CONTRACTS (sözleşmeler ve standart sapmaları)
-- ---------------------------------------------------------------------------
CREATE TABLE contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id VARCHAR(50) UNIQUE NOT NULL,
    site_id UUID REFERENCES sites(id) ON DELETE RESTRICT,
    project_name VARCHAR(255) NOT NULL,
    contract_status VARCHAR(100) NOT NULL,
    probability_pct NUMERIC(5,2) DEFAULT 0,
    ball_in_court VARCHAR(100),
    next_step TEXT,
    next_step_date DATE,
    draft_sent_date DATE,
    last_revision_sent_date DATE,
    revision_rounds INT DEFAULT 0,
    counterparty_last_response_date DATE,
    signed_date DATE,
    contract_term_years NUMERIC(4,1),
    revenue_share_landlord_partner_pct NUMERIC(5,2),
    revenue_share_vs_standard TEXT,
    term_vs_standard TEXT,
    electricity_subscription_vs_standard TEXT,
    grid_connection_cost_vs_standard TEXT,
    site_services_vs_standard TEXT,
    exclusivity_vs_standard TEXT,
    termination_exit_vs_standard TEXT,
    deviations_auto TEXT,
    open_issues TEXT,
    deviation_notes TEXT,
    dc_points_designed INT DEFAULT 0,
    weighted_dc_points NUMERIC(10,2) GENERATED ALWAYS AS (dc_points_designed * (probability_pct / 100.0)) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 5. SITE EXECUTIONS (saha kurulum SOP 24.09.2026 ve go-live checklist)
-- ---------------------------------------------------------------------------
CREATE TABLE site_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exec_id VARCHAR(50) UNIQUE NOT NULL,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    project_name VARCHAR(255) NOT NULL,
    licensed_cpo VARCHAR(255),
    project_manager VARCHAR(100),
    next_gate execution_gate,
    waiting_on VARCHAR(100),
    next_gate_target_date DATE,
    go_live_checklist_pct NUMERIC(5,2) DEFAULT 0,
    -- Gate tarihleri (G1 - G7)
    g1_site_authority_approved_date DATE,
    g2_feasibility_approved_date DATE,
    ek1_submitted_to_grid_date DATE,
    ek2_positive_opinion_issued_g3_date DATE,
    ek2_deadline_for_epdk_date DATE,
    electrical_design_approved_date DATE,
    construction_complete_g4_date DATE,
    electrical_acceptance_energization_date DATE,
    workplace_licence_obtained_g5_date DATE,
    epdk_application_submitted_date DATE,
    epdk_approval_g6_date DATE,
    startye_e2e_acceptance_test_g7_date DATE,
    commercial_go_live_date DATE,
    -- Şebeke ve EPDK / StarTye kayıtları (çekirdek kural: 1:1:1)
    grid_operator VARCHAR(100),
    epdk_srj_station_no VARCHAR(100),
    physical_sockets INT DEFAULT 0,
    startye_connectors INT DEFAULT 0,
    epdk_sockets_skt INT DEFAULT 0,
    socket_match_auto BOOLEAN GENERATED ALWAYS AS (physical_sockets = startye_connectors AND startye_connectors = epdk_sockets_skt) STORED,
    -- Go-live kontrol listesi
    chk_grid_metering_done BOOLEAN DEFAULT FALSE,
    chk_workplace_licence_obtained BOOLEAN DEFAULT FALSE,
    chk_epdk_approved BOOLEAN DEFAULT FALSE,
    chk_records_match_1to1 BOOLEAN DEFAULT FALSE,
    chk_energy_reconciliation_tested BOOLEAN DEFAULT FALSE,
    chk_tariff_payment_tested BOOLEAN DEFAULT FALSE,
    chk_sarj_tr_app_verified BOOLEAN DEFAULT FALSE,
    chk_support_sla_active BOOLEAN DEFAULT FALSE,
    chk_cpo_go_live_signed BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 6. ACTIVITY LOGS (saha ve görüşme günlüğü)
-- ---------------------------------------------------------------------------
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id VARCHAR(50) UNIQUE NOT NULL,
    site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
    project_name VARCHAR(255),
    activity_date DATE NOT NULL,
    activity_type VARCHAR(100) NOT NULL, -- Keşif, Toplantı, Sunum, Görüşme
    ekonix_attendees TEXT,
    counterparty TEXT,
    man_hours NUMERIC(6,2) DEFAULT 0,
    summary_findings TEXT,
    next_step TEXT,
    next_step_date DATE,
    week_info VARCHAR(20),
    in_weekly_report BOOLEAN DEFAULT FALSE,
    report_no VARCHAR(50),
    cpo_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 7. SITE ACTIONS (aksiyon ve görev listesi)
-- ---------------------------------------------------------------------------
CREATE TABLE site_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id VARCHAR(50) UNIQUE NOT NULL,
    site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
    project_name VARCHAR(255),
    action_description TEXT NOT NULL,
    owner VARCHAR(100) NOT NULL,
    priority VARCHAR(20) DEFAULT 'Medium',
    created_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    status action_status DEFAULT 'Open',
    closed_date DATE,
    notes TEXT,
    cpo_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 8. CHANGE LOGS (EPDK tescil sonrası değişiklikler)
-- ---------------------------------------------------------------------------
CREATE TABLE change_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    change_id VARCHAR(50) UNIQUE NOT NULL,
    site_id UUID REFERENCES sites(id) ON DELETE RESTRICT,
    project_name VARCHAR(255) NOT NULL,
    date_of_change DATE NOT NULL,
    epdk_srj_no VARCHAR(100),
    change_type VARCHAR(100) NOT NULL, -- Soket Sayısı/Tipi, Güç Değişimi, Lisans Transferi
    description_before_after TEXT NOT NULL,
    reported_to_epdk BOOLEAN DEFAULT FALSE,
    business_days_to_report INT,
    grid_operator_notified BOOLEAN DEFAULT FALSE,
    startye_epdk_rereconciled BOOLEAN DEFAULT FALSE,
    entered_by VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Yabancı anahtar dizinleri (PostgreSQL FK sütunlarını kendiliğinden dizinlemez)
-- ---------------------------------------------------------------------------
CREATE INDEX contracts_site_id_idx        ON contracts (site_id);
CREATE INDEX site_executions_site_id_idx  ON site_executions (site_id);
CREATE INDEX activity_logs_site_id_idx    ON activity_logs (site_id);
CREATE INDEX site_actions_site_id_idx     ON site_actions (site_id);
CREATE INDEX change_logs_site_id_idx      ON change_logs (site_id);

-- ---------------------------------------------------------------------------
-- last_updated tetikleyicileri
-- ---------------------------------------------------------------------------
CREATE TRIGGER sites_set_last_updated
    BEFORE UPDATE ON sites
    FOR EACH ROW EXECUTE FUNCTION set_last_updated();

CREATE TRIGGER cpo_partners_set_last_updated
    BEFORE UPDATE ON cpo_partners
    FOR EACH ROW EXECUTE FUNCTION set_last_updated();

-- ---------------------------------------------------------------------------
-- Satır düzeyi güvenlik (RLS)
-- Supabase'de public şemadaki tablolar RLS kapalıyken anon anahtarıyla
-- herkese açıktır. RLS açık ve politika yok: yalnızca service_role erişir.
-- Giriş yapmış kullanıcılara erişim vermek için aşağıdaki örneği açın.
-- ---------------------------------------------------------------------------
ALTER TABLE cpo_partners     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites            ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_details     ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_executions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_actions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_logs      ENABLE ROW LEVEL SECURITY;

-- Örnek (gerekirse tabloların her biri için tekrarlayın):
-- CREATE POLICY "authenticated full access" ON sites
--     FOR ALL TO authenticated USING (true) WITH CHECK (true);
