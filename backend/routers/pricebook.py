from fastapi import APIRouter
from models.job_input import SystemType

router = APIRouter()

# Placeholder equipment data — will be replaced by Excel import in Phase 2
PLACEHOLDER_EQUIPMENT = {
    "split": {
        "tonnage_options": [1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0],
        "brands": {
            "good": ["Budget Brand TBD"],
            "better": ["Mid-Tier Brand TBD"],
            "best": ["Trane"],
        },
    },
    "heat_pump": {
        "tonnage_options": [1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0],
        "brands": {
            "good": ["Budget Brand TBD"],
            "better": ["Mid-Tier Brand TBD"],
            "best": ["Trane"],
        },
    },
    "package_unit": {
        "tonnage_options": [2.0, 2.5, 3.0, 3.5, 4.0, 5.0],
        "brands": {
            "good": ["Budget Brand TBD"],
            "better": ["Mid-Tier Brand TBD"],
            "best": ["Trane"],
        },
    },
    "mini_split": {
        "tonnage_options": [1.5, 2.0, 2.5, 3.0],
        "brands": {
            "good": ["Budget Brand TBD"],
            "better": ["Mid-Tier Brand TBD"],
            "best": ["Trane"],
        },
    },
    "commercial": {
        "tonnage_options": [3.0, 3.5, 4.0, 5.0],
        "brands": {
            "good": ["Budget Brand TBD"],
            "better": ["Mid-Tier Brand TBD"],
            "best": ["Trane"],
        },
    },
}


@router.get("/equipment")
def get_equipment(system_type: SystemType = None):
    if system_type:
        data = PLACEHOLDER_EQUIPMENT.get(system_type.value)
        if not data:
            return {"error": "System type not found"}
        return {system_type.value: data}
    return PLACEHOLDER_EQUIPMENT
