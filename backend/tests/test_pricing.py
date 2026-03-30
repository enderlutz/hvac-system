"""
Pricing engine tests.
Phase 2 validates the Excel formula chain against known inputs.
Updated 2026-03-24: variable labor, calculated permits, margin analysis, add-ons.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from models.job_input import JobInput, SystemType, ServiceType, AccessDifficulty
from services.pricing_engine import calculate_proposal, _calculate_price, _get_package, _get_labor, _calculate_permit, PRICEBOOK
from services.proposal_builder import build_proposal


def make_job(**kwargs) -> JobInput:
    defaults = dict(
        customer_name="Test Customer",
        customer_address="123 Main St, Houston TX 77001",
        technician_name="Tech One",
        visit_date="2026-03-21",
        system_type=SystemType.split,
        service_type=ServiceType.replacement,
        system_size_tons=3.0,
    )
    defaults.update(kwargs)
    return JobInput(**defaults)


# ── Structure tests ────────────────────────────────────────────────────────────

def test_all_tiers_present():
    result = calculate_proposal(make_job())
    assert "good" in result
    assert "better" in result
    assert "best" in result


def test_tonnage_in_description():
    result = calculate_proposal(make_job(system_size_tons=3.5))
    assert "3.5" in result["good"].system_description


def test_prices_are_dollar_strings():
    result = calculate_proposal(make_job())
    for tier in ["good", "better", "best"]:
        assert result[tier].total_price.startswith("$"), \
            f"{tier} total_price should start with $, got: {result[tier].total_price}"


def test_prices_are_not_placeholder_text():
    result = calculate_proposal(make_job())
    for tier in ["good", "better", "best"]:
        assert result[tier].total_price != "[PRICE TBD]", \
            f"{tier} should have a real price now"


# ── Formula validation ─────────────────────────────────────────────────────────

def test_formula_3ton_standard_replacement():
    """Validate the formula chain for a 3-ton standard-access replacement."""
    job = make_job(system_size_tons=3.0, access_difficulty=AccessDifficulty.standard)
    pkg = _get_package("amana_standard_eff", 3.0)
    pkg = {**pkg, "_pkg_key": "amana_standard_eff"}

    _, breakdown, margin = _calculate_price(job, pkg)

    # Equipment: $2,312.52 × 1.10 = $2,543.77
    assert abs(breakdown["equipment_cost"] - 2543.77) < 1.0, \
        f"equipment_cost mismatch: {breakdown['equipment_cost']}"

    # Taxable materials: $400 × 1.05 = $420
    assert breakdown["taxable_materials"] == 420.0, \
        f"taxable_materials mismatch: {breakdown['taxable_materials']}"

    # Labor: $900 for replacement
    assert breakdown["labor"] == 900.0

    # Permit: calculated (equipment_cost × 0.02) + 79.45
    expected_permit = round((breakdown["equipment_cost"] * 0.02) + 79.45, 2)
    assert abs(breakdown["permit"] - expected_permit) < 0.01, \
        f"permit mismatch: {breakdown['permit']} vs expected {expected_permit}"

    # Warranty: $150
    assert breakdown["warranty"] == 150.0

    # Sub total = equipment + labor_and_material
    expected_sub = round(breakdown["equipment_cost"] + breakdown["labor_and_material"], 2)
    assert abs(breakdown["sub_total"] - expected_sub) < 0.01

    # Retail (÷ 0.55): sub_total / 0.55
    expected_retail = breakdown["sub_total"] / 0.55
    assert abs(breakdown["retail_price"] - expected_retail) < 0.01

    # Tax: (taxable_mat + equip_cost) × 8.25%
    expected_tax = (breakdown["taxable_materials"] + breakdown["equipment_cost"]) * 0.0825
    assert abs(breakdown["tax"] - expected_tax) < 0.01

    # Suggested price = retail + tax
    assert abs(breakdown["suggested_price"] - (breakdown["retail_price"] + breakdown["tax"])) < 1.0


# ── Labor varies by service type ──────────────────────────────────────────────

def test_labor_varies_by_service_type():
    """Different service types should use different labor rates."""
    job_replace = make_job(service_type=ServiceType.replacement)
    job_repair = make_job(service_type=ServiceType.repair)

    labor_replace = _get_labor(job_replace)
    labor_repair = _get_labor(job_repair)

    assert labor_replace == 900.0, f"Replacement labor should be $900, got {labor_replace}"
    assert labor_repair == 350.0, f"Repair labor should be $350, got {labor_repair}"
    assert labor_replace != labor_repair, "Replace and repair should have different labor rates"


# ── Permit formula ────────────────────────────────────────────────────────────

def test_permit_formula():
    """Permit = (equipment_cost × 2%) + $79.45 base fee."""
    job = make_job(service_type=ServiceType.replacement)
    equipment_cost = 2500.0
    permit = _calculate_permit(equipment_cost, job)
    expected = (2500.0 * 0.02) + 79.45  # = $129.45
    assert abs(permit - expected) < 0.01, f"Permit should be {expected}, got {permit}"


def test_permit_override():
    """Admin can override permit cost."""
    job = make_job(service_type=ServiceType.replacement, permit_cost_override=175.0)
    permit = _calculate_permit(9999.0, job)
    assert permit == 175.0, f"Override should return 175.0, got {permit}"


def test_permit_zero_for_non_replacement():
    """No permit for non-replacement jobs unless explicitly required."""
    job = make_job(service_type=ServiceType.new_install, permit_required=False)
    permit = _calculate_permit(5000.0, job)
    assert permit == 0.0, f"Non-replacement should have no permit, got {permit}"


# ── Cash/check discount ──────────────────────────────────────────────────────

def test_cash_discount():
    """Cash/check discount should be 5% off suggested price."""
    result = calculate_proposal(make_job())
    for tier_name in ["good", "better", "best"]:
        tier = result[tier_name]
        suggested = int(tier.total_price.replace("$", "").replace(",", ""))
        cash = int(tier.cash_discount_price.replace("$", "").replace(",", ""))
        expected_cash = round(suggested * 0.95)
        assert abs(cash - expected_cash) <= 1, \
            f"{tier_name}: cash discount ${cash} should be ~${expected_cash} (5% off ${suggested})"


# ── Margin analysis ───────────────────────────────────────────────────────────

def test_margin_analysis_present():
    """Every tier should include margin analysis."""
    result = calculate_proposal(make_job())
    for tier_name in ["good", "better", "best"]:
        tier = result[tier_name]
        assert tier.margin is not None, f"{tier_name} should have margin analysis"
        assert tier.margin.gross_margin_pct > 40, \
            f"{tier_name} gross margin should be ~45%, got {tier.margin.gross_margin_pct}%"
        assert tier.margin.gross_margin_pct < 50, \
            f"{tier_name} gross margin should be ~45%, got {tier.margin.gross_margin_pct}%"
        assert tier.margin.net_profit > 0, \
            f"{tier_name} should have positive net profit"


# ── Add-ons ───────────────────────────────────────────────────────────────────

def test_add_ons_returned():
    """Proposal should include default add-on options."""
    proposal = build_proposal(make_job())
    assert len(proposal.add_ons) == 3
    names = [a.name for a in proposal.add_ons]
    assert "10-Year Labor Warranty" in names
    assert "Media Filtration System" in names
    assert "Second Trip Installation" in names
    # All should default to not selected
    assert all(not a.selected for a in proposal.add_ons)


# ── Price ordering ────────────────────────────────────────────────────────────

def test_higher_tonnage_costs_more():
    """Larger system = higher dealer cost = higher final price."""
    job_3t = make_job(system_size_tons=3.0)
    job_5t = make_job(system_size_tons=5.0)
    result_3 = calculate_proposal(job_3t)
    result_5 = calculate_proposal(job_5t)

    def parse_price(s: str) -> int:
        return int(s.replace("$", "").replace(",", ""))

    for tier in ["good", "better"]:
        p3 = parse_price(result_3[tier].total_price)
        p5 = parse_price(result_5[tier].total_price)
        assert p5 > p3, f"{tier}: 5-ton should cost more than 3-ton. Got {p5} vs {p3}"


def test_attic_access_costs_more_than_standard():
    """Attic jobs have higher materials BOM than standard access."""
    job_std   = make_job(access_difficulty=AccessDifficulty.standard)
    job_attic = make_job(access_difficulty=AccessDifficulty.attic)

    def parse_price(s: str) -> int:
        return int(s.replace("$", "").replace(",", ""))

    result_std   = calculate_proposal(job_std)
    result_attic = calculate_proposal(job_attic)

    for tier in ["good", "better"]:
        p_std   = parse_price(result_std[tier].total_price)
        p_attic = parse_price(result_attic[tier].total_price)
        assert p_attic > p_std, \
            f"{tier}: attic should cost more than standard. Got {p_attic} vs {p_std}"


def test_better_costs_more_than_good():
    result = calculate_proposal(make_job())
    def parse_price(s: str) -> int:
        return int(s.replace("$", "").replace(",", ""))
    p_good   = parse_price(result["good"].total_price)
    p_better = parse_price(result["better"].total_price)
    assert p_better > p_good, f"Better ({p_better}) should cost more than Good ({p_good})"


def test_best_costs_more_than_better():
    result = calculate_proposal(make_job())
    def parse_price(s: str) -> int:
        return int(s.replace("$", "").replace(",", ""))
    p_better = parse_price(result["better"].total_price)
    p_best   = parse_price(result["best"].total_price)
    assert p_best > p_better, f"Best ({p_best}) should cost more than Better ({p_better})"


# ── Placeholder status ────────────────────────────────────────────────────────

def test_good_and_better_not_placeholder_for_confirmed_tonnages():
    for tons in [2.0, 3.0, 4.0]:
        result = calculate_proposal(make_job(system_size_tons=tons))
        assert result["good"].is_placeholder is False, \
            f"Good tier at {tons}T should not be placeholder"
        assert result["better"].is_placeholder is False, \
            f"Better tier at {tons}T should not be placeholder"


def test_best_tier_not_placeholder_in_brand_strategy():
    result = calculate_proposal(make_job())
    assert result["best"].is_placeholder is False, \
        "Best tier should not be placeholder — Trane dealer costs are now populated"


# ── Adders ─────────────────────────────────────────────────────────────────────

def test_permit_in_adders_for_replacement():
    result = calculate_proposal(make_job(service_type=ServiceType.replacement))
    assert "Permit" in result["good"].adders_cost


def test_lineset_in_adders_when_flagged():
    result = calculate_proposal(make_job(lineset_replacement=True))
    assert "Lineset" in result["good"].adders_cost


def test_no_adders_for_standard_job():
    job = make_job(
        service_type=ServiceType.new_install,
        permit_required=False,
        lineset_replacement=False,
        electrical_work_needed=False,
        ductwork_needed=False,
    )
    result = calculate_proposal(job)
    assert result["good"].adders_cost == "$0"


# ── Brand names ────────────────────────────────────────────────────────────────

def test_brand_names_match_pricebook():
    result = calculate_proposal(make_job())
    strategy = PRICEBOOK["tier_brands"]["brand"]
    assert result["good"].brand   == strategy["good"]["brand_name"]
    assert result["better"].brand == strategy["better"]["brand_name"]
    assert result["best"].brand   == strategy["best"]["brand_name"]


if __name__ == "__main__":
    tests = [
        test_all_tiers_present,
        test_tonnage_in_description,
        test_prices_are_dollar_strings,
        test_prices_are_not_placeholder_text,
        test_formula_3ton_standard_replacement,
        test_labor_varies_by_service_type,
        test_permit_formula,
        test_permit_override,
        test_permit_zero_for_non_replacement,
        test_cash_discount,
        test_margin_analysis_present,
        test_add_ons_returned,
        test_higher_tonnage_costs_more,
        test_attic_access_costs_more_than_standard,
        test_better_costs_more_than_good,
        test_best_costs_more_than_better,
        test_good_and_better_not_placeholder_for_confirmed_tonnages,
        test_best_tier_not_placeholder_in_brand_strategy,
        test_permit_in_adders_for_replacement,
        test_lineset_in_adders_when_flagged,
        test_no_adders_for_standard_job,
        test_brand_names_match_pricebook,
    ]
    for test in tests:
        test()
    print(f"All {len(tests)} tests passed.")
