"""
Pricing engine tests.
Phase 1: verifies placeholder responses are returned correctly.
Phase 2: will validate real pricing against Excel test cases.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from models.job_input import JobInput, SystemType, ServiceType, AccessDifficulty, Urgency
from services.pricing_engine import calculate_proposal


def make_job(**kwargs) -> JobInput:
    defaults = dict(
        customer_name="Test Customer",
        customer_address="123 Main St, Houston TX 77001",
        technician_name="Tech One",
        visit_date="2026-03-17",
        system_type=SystemType.split,
        service_type=ServiceType.replacement,
        system_size_tons=3.0,
    )
    defaults.update(kwargs)
    return JobInput(**defaults)


def test_placeholder_prices_returned():
    job = make_job()
    result = calculate_proposal(job)
    for tier in ["good", "better", "best"]:
        assert result[tier].total_price == "[PRICE TBD]"
        assert result[tier].is_placeholder is True


def test_all_tiers_present():
    job = make_job()
    result = calculate_proposal(job)
    assert "good" in result
    assert "better" in result
    assert "best" in result


def test_tonnage_in_description():
    job = make_job(system_size_tons=3.5)
    result = calculate_proposal(job)
    assert "3.5" in result["good"].system_description


def test_adders_lineset():
    job = make_job(lineset_replacement=True)
    result = calculate_proposal(job)
    assert "Lineset" in result["good"].adders_cost


def test_adders_permit():
    job = make_job(permit_required=True)
    result = calculate_proposal(job)
    assert "Permit" in result["good"].adders_cost


if __name__ == "__main__":
    test_placeholder_prices_returned()
    test_all_tiers_present()
    test_tonnage_in_description()
    test_adders_lineset()
    test_adders_permit()
    print("All tests passed.")
