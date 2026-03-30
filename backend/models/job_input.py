from pydantic import BaseModel
from typing import Optional
from enum import Enum


class SystemType(str, Enum):
    split = "split"
    heat_pump = "heat_pump"
    package_unit = "package_unit"
    mini_split = "mini_split"
    commercial = "commercial"


class ServiceType(str, Enum):
    replacement = "replacement"
    repair = "repair"
    new_install = "new_install"
    add_on = "add_on"


class Refrigerant(str, Enum):
    r22 = "R-22"
    r410a = "R-410A"
    r32 = "R-32"
    unknown = "Unknown"


class AccessDifficulty(str, Enum):
    standard = "standard"
    attic = "attic"
    tight = "tight"
    rooftop = "rooftop"


class Urgency(str, Enum):
    routine = "routine"
    soon = "soon"
    urgent = "urgent"


class JobInput(BaseModel):
    # Required fields
    customer_name: str
    customer_address: str
    technician_name: str
    visit_date: str
    system_type: SystemType
    service_type: ServiceType
    system_size_tons: float

    # Optional fields
    existing_equipment_make: Optional[str] = None
    existing_equipment_model: Optional[str] = None
    existing_equipment_age: Optional[int] = None
    existing_refrigerant: Optional[Refrigerant] = None
    recommended_seer_tier: Optional[str] = None
    lineset_replacement: bool = False
    permit_required: bool = False
    electrical_work_needed: bool = False
    electrical_notes: Optional[str] = None
    ductwork_needed: bool = False
    ductwork_notes: Optional[str] = None
    access_difficulty: AccessDifficulty = AccessDifficulty.standard
    orientation: Optional[str] = None    # "horizontal", "upflow", "downflow"
    urgency: Urgency = Urgency.routine
    permit_cost_override: Optional[float] = None  # admin can set exact permit cost
    additional_notes: Optional[str] = None


class RawNotesInput(BaseModel):
    raw_notes: str
