from pydantic import BaseModel
from typing import Optional


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
    total_price: str
    is_placeholder: bool = True


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
