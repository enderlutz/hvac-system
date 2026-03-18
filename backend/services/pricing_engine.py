"""
Pricing Engine - Phase 1 Placeholder

All pricing logic will be derived from the client's Excel dashboard in Phase 2.
Until then, this module returns clearly labeled [PRICE TBD] placeholder values.

TIER_STRATEGY config:
  "brand"      - Option A: Good=budget brand, Better=mid-tier, Best=Trane
  "efficiency" - Option B: All Trane, tiered by SEER2 (15 / 17 / 20+)
"""

from models.job_input import JobInput, ServiceType
from models.proposal import TierOption

TIER_STRATEGY = "brand"  # Switch to "efficiency" once client confirms


def calculate_proposal(job: JobInput) -> dict:
    """
    Returns a dict with keys: good, better, best (each a TierOption).
    Phase 1: all values are placeholder strings.
    """
    if TIER_STRATEGY == "brand":
        return _brand_tiers(job)
    else:
        return _efficiency_tiers(job)


def _brand_tiers(job: JobInput) -> dict:
    base_desc = f"{job.system_size_tons}-ton {job.system_type.value.replace('_', ' ').title()}"

    good = TierOption(
        tier_name="Good",
        brand="Budget Brand TBD",
        seer_rating="15 SEER2",
        system_description=f"{base_desc} - Entry Level",
        key_benefits=[
            "Meets Texas 15 SEER2 minimum",
            "Standard 5-year parts warranty",
            "Reliable performance",
        ],
        warranty="5 years parts / 1 year labor",
        install_time="1 day",
        equipment_cost="[PRICE TBD]",
        labor_cost="[PRICE TBD]",
        adders_cost=_adders_placeholder(job),
        total_price="[PRICE TBD]",
        is_placeholder=True,
    )

    better = TierOption(
        tier_name="Better",
        brand="Mid-Tier Brand TBD",
        seer_rating="17 SEER2",
        system_description=f"{base_desc} - Mid Efficiency",
        key_benefits=[
            "17 SEER2 for improved efficiency",
            "10-year parts warranty",
            "Lower monthly energy bills",
        ],
        warranty="10 years parts / 2 years labor",
        install_time="1 day",
        equipment_cost="[PRICE TBD]",
        labor_cost="[PRICE TBD]",
        adders_cost=_adders_placeholder(job),
        total_price="[PRICE TBD]",
        is_placeholder=True,
    )

    best = TierOption(
        tier_name="Best",
        brand="Trane",
        seer_rating="20+ SEER2",
        system_description=f"{base_desc} - Trane Variable Speed",
        key_benefits=[
            "20+ SEER2 maximum efficiency",
            "Variable speed for superior comfort",
            "Trane 12-year registered warranty",
        ],
        warranty="12 years parts / 2 years labor (registered)",
        install_time="1 day",
        equipment_cost="[PRICE TBD]",
        labor_cost="[PRICE TBD]",
        adders_cost=_adders_placeholder(job),
        total_price="[PRICE TBD]",
        is_placeholder=True,
    )

    return {"good": good, "better": better, "best": best}


def _efficiency_tiers(job: JobInput) -> dict:
    base_desc = f"{job.system_size_tons}-ton Trane {job.system_type.value.replace('_', ' ').title()}"

    good = TierOption(
        tier_name="Good",
        brand="Trane",
        seer_rating="15 SEER2",
        system_description=f"{base_desc} - 15 SEER2",
        key_benefits=[
            "Meets Texas 15 SEER2 minimum",
            "Trane reliability",
            "Standard warranty",
        ],
        warranty="10 years parts (registered)",
        install_time="1 day",
        equipment_cost="[PRICE TBD]",
        labor_cost="[PRICE TBD]",
        adders_cost=_adders_placeholder(job),
        total_price="[PRICE TBD]",
        is_placeholder=True,
    )

    better = TierOption(
        tier_name="Better",
        brand="Trane",
        seer_rating="17 SEER2",
        system_description=f"{base_desc} - 17 SEER2",
        key_benefits=[
            "17 SEER2 enhanced efficiency",
            "Trane reliability",
            "Extended warranty",
        ],
        warranty="10 years parts (registered)",
        install_time="1 day",
        equipment_cost="[PRICE TBD]",
        labor_cost="[PRICE TBD]",
        adders_cost=_adders_placeholder(job),
        total_price="[PRICE TBD]",
        is_placeholder=True,
    )

    best = TierOption(
        tier_name="Best",
        brand="Trane",
        seer_rating="20+ SEER2",
        system_description=f"{base_desc} - Variable Speed 20+ SEER2",
        key_benefits=[
            "Maximum efficiency - 20+ SEER2",
            "Variable speed compressor",
            "Quietest operation available",
        ],
        warranty="12 years parts (registered)",
        install_time="1 day",
        equipment_cost="[PRICE TBD]",
        labor_cost="[PRICE TBD]",
        adders_cost=_adders_placeholder(job),
        total_price="[PRICE TBD]",
        is_placeholder=True,
    )

    return {"good": good, "better": better, "best": best}


def _adders_placeholder(job: JobInput) -> str:
    adders = []
    if job.lineset_replacement:
        adders.append("Lineset: [TBD]")
    if job.permit_required:
        adders.append("Permit: [TBD]")
    if job.electrical_work_needed:
        adders.append("Electrical: [TBD]")
    if job.ductwork_needed:
        adders.append("Ductwork: [TBD]")
    return ", ".join(adders) if adders else "$0"
