"""
Pricing Engine — Phase 2 (Corrected)

Implements the exact formula chain from the client's ESTIMATE SHEET.
Source workbook: 1 - RETRO ESTIMATING SHEET.xlsx
Formula reference: docs/excel-process-summary.md, Section 4

Key corrections (2026-03-24):
  - Labor varies by service type (not flat $900)
  - Permit calculated from (equipment_cost × 2%) + base_fee (not flat $200)
  - Output is SUGGESTED retail price (admin can override)
  - Margin analysis included (gross margin, overhead, net profit)
  - Cash/check discount (5% off)
  - Proposal add-ons (extended warranty, media filtration, etc.)

Formula chain (matches Excel ESTIMATE SHEET rows 38-48):
  equipment_cost    = dealer_cost × 1.10                     (B39)
  taxable_materials = materials × 1.05                       (B38)
  labor_and_mat     = labor + permit + warranty + taxable_mat (B40)
  sub_total         = equipment_cost + labor_and_mat          (B41)
  retail_price      = sub_total / 0.55   (45% gross margin)  (B42)
  tax               = (taxable_mat + equipment_cost) × 8.25%  (B43)
  suggested_price   = retail_price + tax                      (B42+B43)
"""

import json
from pathlib import Path

from models.job_input import JobInput, ServiceType, SystemType
from models.proposal import TierOption, MarginAnalysis, ProposalAddOn

# ── Load pricebook ─────────────────────────────────────────────────────────────
_PRICEBOOK_PATH = Path(__file__).parent.parent / "data" / "pricebook.json"
with open(_PRICEBOOK_PATH) as _f:
    PRICEBOOK = json.load(_f)

# ── Config ─────────────────────────────────────────────────────────────────────
TIER_STRATEGY = "brand"   # "brand" | "efficiency" — confirm with client

_C      = PRICEBOOK["pricing_constants"]
_FIXED  = PRICEBOOK["fixed_costs"]
_LABOR  = PRICEBOOK["labor"]
_SURCHARGE = PRICEBOOK["system_type_surcharge"]

# ── Default add-ons (from PROPOSAL sheet page 2) ──────────────────────────────
DEFAULT_ADD_ONS = [
    ProposalAddOn(
        name="10-Year Labor Warranty",
        description="Extended labor coverage through Carrier Enterprises, Inc",
        price=750.0,
    ),
    ProposalAddOn(
        name="Media Filtration System",
        description="Honeywell F-100 whole-home media filtration system",
        price=250.0,
    ),
    ProposalAddOn(
        name="Second Trip Installation",
        description="Multi-day installation — removal first, then install next day",
        price=300.0,
    ),
]

# ── Tier copy ──────────────────────────────────────────────────────────────────
_BENEFITS = {
    "good": [
        "Meets Texas 15 SEER2 minimum requirement",
        "Single-stage compressor — reliable, proven cooling",
        "5-year parts / 1-year labor warranty",
        "Lowest upfront investment",
    ],
    "better": [
        "16 SEER2 — lower monthly energy bills vs. base tier",
        "96% AFUE furnace — efficient heating performance",
        "10-year parts / 2-year labor warranty",
        "Better humidity control than single-stage",
    ],
    "best": [
        "20+ SEER2 — maximum efficiency, lowest monthly operating cost",
        "Variable-speed system — precise temperature and humidity control",
        "12-year registered parts warranty",
        "Near-silent indoor operation",
        "Best choice for Houston's long cooling season",
    ],
}

_WARRANTY = {
    "good":   "5 years parts / 1 year labor",
    "better": "10 years parts / 2 years labor",
    "best":   "12 years parts / 2 years labor (upon registration)",
}


# ── Helpers ────────────────────────────────────────────────────────────────────

def _fmt(amount: float) -> str:
    return f"${round(amount):,}"


def _system_label(job: JobInput) -> str:
    labels = {
        SystemType.split:        "Split System",
        SystemType.heat_pump:    "Heat Pump System",
        SystemType.package_unit: "Package Unit",
        SystemType.mini_split:   "Ductless Mini-Split",
        SystemType.commercial:   "Commercial Unit",
    }
    label = labels.get(job.system_type, job.system_type.value.replace("_", " ").title())
    return f"{job.system_size_tons}-Ton {label}"


def _get_package(package_key: str, tons: float) -> dict:
    """Return the system package for a given package key and tonnage.
    Falls back to the closest available tonnage if exact match missing."""
    packages = PRICEBOOK["system_packages"][package_key]
    ton_key = str(tons)
    if ton_key not in packages:
        valid = [float(k) for k in packages if not k.startswith("_")]
        ton_key = str(min(valid, key=lambda t: abs(t - tons)))
    return packages[ton_key]


def _get_bom(tons: float, access: str) -> float:
    """Default bill-of-materials cost by tonnage and access difficulty."""
    bom = PRICEBOOK["default_bom"]
    ton_key = str(tons)
    if ton_key not in bom:
        valid = [float(k) for k in bom if not k.startswith("_")]
        ton_key = str(min(valid, key=lambda t: abs(t - tons)))
    access_key = access if access in bom[ton_key] else "standard"
    return float(bom[ton_key][access_key])


def _get_labor(job: JobInput) -> float:
    """Look up labor rate based on service type.
    Real installer pay varies ($800-$6,000) but these are the base rates
    from the RETRO PRICE SHEET."""
    mapping = {
        ServiceType.replacement: "complete_retrofit",     # $900
        ServiceType.new_install: "complete_retrofit",     # $900
        ServiceType.repair:      "furnace_only_cod",      # $350
        ServiceType.add_on:      "media_filtration",      # $100
    }
    key = mapping.get(job.service_type, "complete_retrofit")
    return float(_LABOR[key])


def _calculate_permit(equipment_cost: float, job: JobInput) -> float:
    """Calculate permit cost using the city formula.
    Formula from PERMIT LOG: (valuation × 2%) + base_fee
    The permit office uses equipment value as the valuation basis."""
    # Admin can override with a known exact amount
    if job.permit_cost_override is not None:
        return float(job.permit_cost_override)

    # Only charge permit on replacements or if explicitly required
    if not (job.permit_required or job.service_type == ServiceType.replacement):
        return 0.0

    # City of Houston permit formula (current base fee)
    PERMIT_RATE = 0.02
    BASE_FEE = 79.45
    return round((equipment_cost * PERMIT_RATE) + BASE_FEE, 2)


def _adder_string(job: JobInput) -> str:
    """Human-readable adder line for the proposal."""
    _adders = PRICEBOOK["adders"]
    items: list[str] = []

    if job.permit_required or job.service_type == ServiceType.replacement:
        items.append("Permit (calculated)")
    if job.lineset_replacement:
        amt = _adders.get("lineset_replacement")
        items.append(f"Lineset {_fmt(amt) if amt else '(TBD)'}")
    if job.electrical_work_needed:
        amt = _adders.get("electrical_work")
        items.append(f"Electrical {_fmt(amt) if amt else '(TBD)'}")
    if job.ductwork_needed:
        amt = _adders.get("ductwork")
        items.append(f"Ductwork {_fmt(amt) if amt else '(TBD)'}")

    return ", ".join(items) if items else "$0"


# ── Core formula ───────────────────────────────────────────────────────────────

def _calculate_price(job: JobInput, package: dict) -> tuple[float, dict, MarginAnalysis]:
    """
    Implements the ESTIMATE SHEET formula chain from the client's Excel workbook.
    Returns (suggested_price_rounded, breakdown_dict, margin_analysis).
    """
    dealer_cost = float(package["total_dealer_cost"])

    # System-type surcharge (heat pump reversing valve, package unit cabinet)
    surcharge_map = _SURCHARGE.get(job.system_type.value, {})

    # Look up which tier this package belongs to (for surcharge tier key)
    strategy = PRICEBOOK["tier_brands"][TIER_STRATEGY]
    tier_key = next(
        (t for t, cfg in strategy.items() if cfg["package_key"] == package.get("_pkg_key", "")),
        "good",
    )
    surcharge = float(surcharge_map.get(tier_key, 0))
    dealer_cost += surcharge

    # B39 — equipment cost with markup
    equipment_cost = dealer_cost * _C["equipment_markup"]

    # B38 — materials with waste/handling buffer
    access = job.access_difficulty.value
    materials_base = _get_bom(job.system_size_tons, access)
    taxable_materials = materials_base * _C["materials_buffer"]

    # B7 — labor (varies by service type)
    labor = _get_labor(job)

    # B9 — permit (calculated from equipment cost, not flat)
    permit = _calculate_permit(equipment_cost, job)

    # Adders (flow through as additional taxable materials)
    _adders = PRICEBOOK["adders"]
    lineset    = float(_adders["lineset_replacement"] or 0) if job.lineset_replacement and _adders["lineset_replacement"] else 0.0
    electrical = float(_adders["electrical_work"]     or 0) if job.electrical_work_needed and _adders["electrical_work"]     else 0.0
    ductwork   = float(_adders["ductwork"]            or 0) if job.ductwork_needed         and _adders["ductwork"]            else 0.0
    adder_total = lineset + electrical + ductwork

    # B35 — warranty (fixed)
    warranty = float(_FIXED["warranty"])

    # B34 — miscellaneous flat
    misc = float(_FIXED.get("misc_flat", 150))

    # B40 — labor & material
    labor_and_material = labor + permit + warranty + taxable_materials + adder_total + misc

    # B41 — sub total
    sub_total = equipment_cost + labor_and_material

    # B42 — retail price (45% gross margin target: cost / 0.55)
    retail_price = sub_total / _C["markup_divisor"]

    # B43 — Texas sales tax on equipment + taxable materials
    tax = (taxable_materials + equipment_cost) * _C["tax_rate"]

    # Suggested final price
    suggested_price = round(retail_price + tax)

    # Cash/check discount (5% off)
    cash_discount = round(suggested_price * (1 - _C["cash_check_discount"]))

    # ── Margin analysis (matches Excel ESTIMATE SHEET rows 46-48) ──
    gross_margin_dollars = retail_price - sub_total
    gross_margin_pct = (gross_margin_dollars / retail_price * 100) if retail_price > 0 else 0
    overhead_20pct = retail_price * 0.20
    net_profit = gross_margin_dollars - overhead_20pct
    net_profit_pct = (net_profit / retail_price * 100) if retail_price > 0 else 0

    margin = MarginAnalysis(
        total_cost=round(sub_total, 2),
        suggested_retail=round(retail_price, 2),
        tax=round(tax, 2),
        suggested_final=float(suggested_price),
        cash_discount_price=float(cash_discount),
        gross_margin_dollars=round(gross_margin_dollars, 2),
        gross_margin_pct=round(gross_margin_pct, 1),
        overhead_20pct=round(overhead_20pct, 2),
        net_profit=round(net_profit, 2),
        net_profit_pct=round(net_profit_pct, 1),
    )

    breakdown = {
        "dealer_cost":       dealer_cost,
        "equipment_cost":    equipment_cost,
        "materials_base":    materials_base,
        "taxable_materials": taxable_materials,
        "labor":             labor,
        "permit":            permit,
        "adders":            adder_total,
        "warranty":          warranty,
        "misc":              misc,
        "labor_and_material": labor_and_material,
        "sub_total":         sub_total,
        "retail_price":      retail_price,
        "tax":               tax,
        "suggested_price":   float(suggested_price),
        "cash_discount":     float(cash_discount),
    }
    return float(suggested_price), breakdown, margin


# ── Tier builder ───────────────────────────────────────────────────────────────

def _make_tier(job: JobInput, tier: str, brand_name: str, package_key: str, is_placeholder_override: bool) -> TierOption:
    package = _get_package(package_key, job.system_size_tons)
    # Inject package key so _calculate_price can look up tier surcharge
    package = {**package, "_pkg_key": package_key}

    pkg_meta = PRICEBOOK["system_packages"][package_key]
    seer = pkg_meta["_seer"]
    afue = pkg_meta["_afue"]

    suggested_price, breakdown, margin = _calculate_price(job, package)

    # Mark as placeholder if: caller forces it, package cost is estimated
    is_ph = (
        is_placeholder_override
        or not package.get("confirmed", False)
    )

    return TierOption(
        tier_name=tier.title(),
        brand=brand_name,
        model=package.get("condenser_model"),
        seer_rating=seer,
        system_description=f"{_system_label(job)} — {brand_name} {seer} / {afue}",
        key_benefits=_BENEFITS[tier],
        warranty=_WARRANTY[tier],
        install_time="1–2 days" if job.system_type == SystemType.package_unit else "1 day",
        equipment_cost=_fmt(float(package["total_dealer_cost"]) * _C["equipment_markup"]),
        labor_cost=_fmt(breakdown["labor"]),
        adders_cost=_adder_string(job),
        total_price=_fmt(suggested_price),
        cash_discount_price=_fmt(breakdown["cash_discount"]),
        is_placeholder=is_ph,
        margin=margin,
    )


# ── Public API ─────────────────────────────────────────────────────────────────

def calculate_proposal(job: JobInput) -> dict:
    """Returns dict with keys good, better, best — each a TierOption.
    Also returns add_ons list."""
    strategy = PRICEBOOK["tier_brands"][TIER_STRATEGY]
    tiers = {
        tier: _make_tier(
            job,
            tier,
            cfg["brand_name"],
            cfg["package_key"],
            cfg.get("is_placeholder", False),
        )
        for tier, cfg in strategy.items()
        if not tier.startswith("_")
    }
    return tiers
