// ── Proposal pipeline ─────────────────────────────────────────

export type ProposalStage =
  | "new_lead"
  | "appointment_set"
  | "estimate_ready"
  | "proposal_sent"
  | "follow_up"
  | "won"
  | "lost";

export interface Proposal {
  id: string;
  customer_name: string;
  customer_address: string;
  technician_name: string;
  visit_date: string;
  system_type: string;
  service_type: string;
  system_size_tons: number;
  stage: ProposalStage;
  good_price: string;
  better_price: string;
  best_price: string;
  pipeline_value: number;    // best_price as number for analytics
  notes?: string;
  created_at: string;
  updated_at: string;
  urgency: "routine" | "soon" | "urgent";
  r22_flag: boolean;
}

// ── Estimate generator ────────────────────────────────────────

export interface JobInput {
  customer_name: string;
  customer_address: string;
  technician_name: string;
  visit_date: string;
  system_type: string;
  service_type: string;
  system_size_tons: number;
  existing_equipment_make?: string;
  existing_equipment_model?: string;
  existing_equipment_age?: number;
  existing_refrigerant?: string;
  lineset_replacement?: boolean;
  permit_required?: boolean;
  electrical_work_needed?: boolean;
  electrical_notes?: string;
  ductwork_needed?: boolean;
  ductwork_notes?: string;
  access_difficulty?: string;
  orientation?: string;
  urgency?: string;
  permit_cost_override?: number;
  additional_notes?: string;
}

export interface MarginAnalysis {
  total_cost: number;
  suggested_retail: number;
  tax: number;
  suggested_final: number;
  cash_discount_price: number;
  gross_margin_dollars: number;
  gross_margin_pct: number;
  overhead_20pct: number;
  net_profit: number;
  net_profit_pct: number;
}

export interface ProposalAddOn {
  name: string;
  description: string;
  price: number;
  selected: boolean;
}

export interface TierOption {
  tier_name: string;
  brand: string;
  model?: string;
  seer_rating: string;
  system_description: string;
  key_benefits: string[];
  warranty: string;
  install_time: string;
  equipment_cost: string;
  labor_cost: string;
  adders_cost: string;
  total_price: string;
  cash_discount_price: string;
  is_placeholder: boolean;
  margin?: MarginAnalysis;
}

export interface ProposalResponse {
  proposal_id: string;
  customer_name: string;
  customer_address: string;
  technician_name: string;
  visit_date: string;
  system_type: string;
  service_type: string;
  system_size_tons: number;
  r22_warning: boolean;
  permit_required: boolean;
  seer2_compliance_note: boolean;
  good: TierOption;
  better: TierOption;
  best: TierOption;
  add_ons: ProposalAddOn[];
}

export interface ParsedNotesField {
  value: string | null;
  confidence: "high" | "medium" | "low";
  source_text?: string;
}

export interface ParsedNotesResponse {
  customer_name?: ParsedNotesField;
  technician_name?: ParsedNotesField;
  system_type?: ParsedNotesField;
  service_type?: ParsedNotesField;
  system_size_tons?: ParsedNotesField;
  existing_refrigerant?: ParsedNotesField;
  equipment_make?: ParsedNotesField;
  equipment_age?: ParsedNotesField;
  access_difficulty?: ParsedNotesField;
  permit_required?: ParsedNotesField;
  urgency?: ParsedNotesField;
  lineset_replacement?: ParsedNotesField;
  electrical_work?: ParsedNotesField;
  ductwork_needed?: ParsedNotesField;
  r22_flag: boolean;
}

// ── Pipeline record (matches backend ProposalRecord) ─────────

export interface ProposalRecord {
  id: string;
  customer_name: string;
  customer_address: string;
  technician_name: string;
  visit_date: string;
  system_type: string;
  service_type: string;
  system_size_tons: number;
  stage: ProposalStage;
  urgency: "routine" | "soon" | "urgent";
  r22_flag: boolean;
  permit_required: boolean;
  seer2_compliance_note: boolean;
  good_tier: TierOption;
  better_tier: TierOption;
  best_tier: TierOption;
  good_price: string;
  better_price: string;
  best_price: string;
  pipeline_value: number;
  notes?: string;
  owner_notes?: string;
  created_at: string;
  updated_at: string;
}

// ── Dashboard analytics ───────────────────────────────────────

export interface DashboardStats {
  total_proposals_month: number;
  pipeline_value: number;
  won_this_month: number;
  win_rate: number;
  avg_deal_size: number;
  urgent_count: number;
  follow_up_count: number;
  proposals_by_stage: Record<ProposalStage, number>;
}

// ── Kanban ────────────────────────────────────────────────────

export interface KanbanColumn {
  id: ProposalStage;
  label: string;
  color: string;
  headerBg: string;
  cardBg: string;
  dot: string;
}
