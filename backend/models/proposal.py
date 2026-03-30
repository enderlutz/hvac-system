from pydantic import BaseModel
from typing import Optional


class MarginAnalysis(BaseModel):
    total_cost: float              # sub_total (what the company pays)
    suggested_retail: float        # sub_total / 0.55
    tax: float
    suggested_final: float         # suggested_retail + tax
    cash_discount_price: float     # 5% off suggested_final
    gross_margin_dollars: float
    gross_margin_pct: float        # target ~45%
    overhead_20pct: float          # 20% of suggested_retail
    net_profit: float
    net_profit_pct: float


class ProposalAddOn(BaseModel):
    name: str
    description: str
    price: float
    selected: bool = False


class TierOption(BaseModel):
    tier_name: str           # "Good", "Better", "Best"
    brand: str
    model: Optional[str] = None
    seer_rating: str
    system_description: str
    key_benefits: list[str]
    warranty: str
    install_time: str
    equipment_cost: str
    labor_cost: str
    adders_cost: str
    total_price: str         # suggested price (formatted)
    cash_discount_price: str = ""  # 5% off total
    is_placeholder: bool = True
    margin: Optional[MarginAnalysis] = None


class ProposalResponse(BaseModel):
    proposal_id: str
    customer_name: str
    customer_address: str
    technician_name: str
    visit_date: str
    system_type: str
    service_type: str
    system_size_tons: float
    r22_warning: bool
    permit_required: bool
    seer2_compliance_note: bool
    good: TierOption
    better: TierOption
    best: TierOption
    add_ons: list[ProposalAddOn] = []


class ParsedNotesField(BaseModel):
    value: Optional[str]
    confidence: str    # "high", "medium", "low"
    source_text: Optional[str] = None


class ParsedNotesResponse(BaseModel):
    customer_name: Optional[ParsedNotesField] = None
    technician_name: Optional[ParsedNotesField] = None
    system_type: Optional[ParsedNotesField] = None
    service_type: Optional[ParsedNotesField] = None
    system_size_tons: Optional[ParsedNotesField] = None
    existing_refrigerant: Optional[ParsedNotesField] = None
    equipment_make: Optional[ParsedNotesField] = None
    equipment_age: Optional[ParsedNotesField] = None
    access_difficulty: Optional[ParsedNotesField] = None
    permit_required: Optional[ParsedNotesField] = None
    urgency: Optional[ParsedNotesField] = None
    lineset_replacement: Optional[ParsedNotesField] = None
    electrical_work: Optional[ParsedNotesField] = None
    ductwork_needed: Optional[ParsedNotesField] = None
    r22_flag: bool = False
