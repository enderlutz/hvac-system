from pydantic import BaseModel
from typing import Optional
from models.proposal import TierOption


class ProposalRecord(BaseModel):
    id: str
    customer_name: str
    customer_address: str
    technician_name: str
    visit_date: str
    system_type: str
    service_type: str
    system_size_tons: float
    stage: str
    urgency: str
    r22_flag: bool
    permit_required: bool
    seer2_compliance_note: bool
    good_tier: TierOption
    better_tier: TierOption
    best_tier: TierOption
    good_price: str
    better_price: str
    best_price: str
    pipeline_value: float
    notes: Optional[str] = None
    owner_notes: Optional[str] = None
    created_at: str
    updated_at: str


class StageUpdate(BaseModel):
    stage: str


class ApproveRequest(BaseModel):
    notes: Optional[str] = None
    actual_price: Optional[str] = None       # admin-adjusted price
    selected_tier: Optional[str] = None      # "good", "better", or "best"
    selected_add_ons: Optional[list[str]] = None  # list of add-on names


class RejectRequest(BaseModel):
    notes: str


class NotesUpdate(BaseModel):
    notes: str
