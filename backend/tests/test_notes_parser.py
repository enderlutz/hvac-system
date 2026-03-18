"""
Notes Parser tests — Phase 3

Covers a wide range of real-world technician note formats.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from services.notes_parser import parse_notes


# ── Tonnage ────────────────────────────────────────────────────

def test_tonnage_standard():
    r = parse_notes("3.5 ton split system")
    assert r.system_size_tons.value == "3.5"
    assert r.system_size_tons.confidence == "high"

def test_tonnage_shorthand():
    r = parse_notes("4T heat pump, attic install")
    assert r.system_size_tons.value == "4.0"

def test_tonnage_dash():
    r = parse_notes("customer has a 3-ton carrier")
    assert r.system_size_tons.value == "3.0"

def test_tonnage_fraction():
    r = parse_notes("3 1/2 ton package unit")
    assert r.system_size_tons.value == "3.5"

def test_tonnage_snaps():
    # 3.7 is nearest to 3.5 (not 4.0) — confidence drops to medium
    r = parse_notes("3.7 ton unit")
    assert r.system_size_tons.value == "3.5"
    assert r.system_size_tons.confidence == "medium"

def test_tonnage_not_found():
    r = parse_notes("customer wants a new system, no size mentioned")
    assert r.system_size_tons.value is None


# ── System Type ────────────────────────────────────────────────

def test_system_type_mini_split():
    r = parse_notes("ductless mini split, bedroom addition")
    assert r.system_type.value == "mini_split"

def test_system_type_heat_pump():
    r = parse_notes("3 ton heat pump, full replacement")
    assert r.system_type.value == "heat_pump"

def test_system_type_package():
    r = parse_notes("rooftop package unit on a commercial building")
    assert r.system_type.value == "package_unit"

def test_system_type_split():
    r = parse_notes("split system, 2.5 ton, attic")
    assert r.system_type.value == "split"

def test_system_type_not_found():
    r = parse_notes("customer needs a new unit, size TBD")
    assert r.system_type.value is None


# ── Service Type ───────────────────────────────────────────────

def test_service_type_replacement():
    r = parse_notes("full replacement needed, 15 year old carrier")
    assert r.service_type.value == "replacement"
    assert r.service_type.confidence == "high"

def test_service_type_repair():
    r = parse_notes("no cooling, system not working, needs repair")
    assert r.service_type.value == "repair"

def test_service_type_new_install():
    r = parse_notes("new construction, 3 ton split, new install")
    assert r.service_type.value == "new_install"

def test_service_type_medium_confidence():
    r = parse_notes("customer wants to replace the unit")
    assert r.service_type.value == "replacement"
    assert r.service_type.confidence == "medium"


# ── Refrigerant ────────────────────────────────────────────────

def test_refrigerant_r22():
    r = parse_notes("old system running on freon, needs replacement")
    assert r.existing_refrigerant.value == "R-22"
    assert r.r22_flag is True

def test_refrigerant_r410a():
    r = parse_notes("existing unit uses R-410A puron")
    assert r.existing_refrigerant.value == "R-410A"
    assert r.r22_flag is False

def test_refrigerant_r22_shorthand():
    r = parse_notes("r22 system, 3.5 ton carrier")
    assert r.existing_refrigerant.value == "R-22"

def test_refrigerant_not_found():
    r = parse_notes("3 ton split, attic, full replacement")
    assert r.existing_refrigerant.value is None


# ── Access Difficulty ──────────────────────────────────────────

def test_access_attic():
    r = parse_notes("attic install, tight space, 3.5 ton")
    assert r.access_difficulty.value == "attic"

def test_access_rooftop():
    r = parse_notes("rooftop unit on a commercial building")
    assert r.access_difficulty.value == "rooftop"

def test_access_tight():
    r = parse_notes("crawl space install, restricted access")
    assert r.access_difficulty.value == "tight"

def test_access_not_found():
    r = parse_notes("standard install, no access issues")
    assert r.access_difficulty.value is None


# ── Permit ─────────────────────────────────────────────────────

def test_permit_required():
    r = parse_notes("full replacement, permit needed, 3 ton trane")
    assert r.permit_required.value == "true"

def test_permit_not_required():
    r = parse_notes("repair only, no permit needed")
    assert r.permit_required.value == "false"

def test_permit_auto_on_replacement():
    # Full replacement with no explicit permit mention — auto-set true
    r = parse_notes("full replacement, 3.5 ton, attic")
    assert r.permit_required.value == "true"


# ── Urgency ────────────────────────────────────────────────────

def test_urgency_urgent():
    r = parse_notes("no cooling, asap, customer is very hot")
    assert r.urgency.value == "urgent"

def test_urgency_soon():
    r = parse_notes("system getting old, wants to replace soon this week")
    assert r.urgency.value == "soon"

def test_urgency_routine_default():
    r = parse_notes("3 ton split, planned replacement, no rush")
    assert r.urgency.value == "routine"


# ── Adders ─────────────────────────────────────────────────────

def test_lineset():
    r = parse_notes("new lineset needed, 3.5 ton split replacement")
    assert r.lineset_replacement.value == "true"

def test_electrical():
    r = parse_notes("new disconnect needed, electrical work required")
    assert r.electrical_work.value == "true"

def test_ductwork():
    r = parse_notes("leaky ducts, ductwork replacement needed")
    assert r.ductwork_needed.value == "true"


# ── Equipment Make ─────────────────────────────────────────────

def test_equipment_make_explicit():
    r = parse_notes("existing: Carrier, 3 ton, 12 years old")
    assert r.equipment_make.value == "Carrier"
    assert r.equipment_make.confidence == "high"

def test_equipment_make_standalone():
    r = parse_notes("old lennox unit, r22, attic, needs full replacement")
    assert r.equipment_make.value == "Lennox"

def test_equipment_make_trane():
    r = parse_notes("customer has a trane unit from 2008")
    assert r.equipment_make.value == "Trane"


# ── Equipment Age ──────────────────────────────────────────────

def test_age_years_old():
    r = parse_notes("15 years old, r22, full replacement")
    assert r.equipment_age.value == "15"

def test_age_installed_year():
    r = parse_notes("installed in 2010, carrier, 3.5 ton")
    assert r.equipment_age.value == "16"   # 2026 - 2010

def test_age_label():
    r = parse_notes("age: 12, lennox system, attic")
    assert r.equipment_age.value == "12"


# ── Customer / Tech Name ───────────────────────────────────────

def test_customer_name():
    r = parse_notes("Customer: John Smith, 3.5 ton split, replacement")
    assert r.customer_name.value == "John Smith"

def test_technician_name():
    r = parse_notes("Tech: Mike Johnson, 3 ton heat pump, attic, asap")
    assert r.technician_name.value == "Mike Johnson"


# ── Integration: dense real-world note ────────────────────────

def test_dense_note():
    note = (
        "Customer: Sarah Williams\n"
        "Tech: Dave Rodriguez\n"
        "3.5 ton split system, attic install, existing Carrier running on R-22\n"
        "unit is 18 years old, no cooling — ASAP\n"
        "full replacement needed, new lineset, permit required\n"
        "electrical work needed — old disconnect\n"
    )
    r = parse_notes(note)
    assert r.system_size_tons.value == "3.5"
    assert r.system_type.value == "split"
    assert r.service_type.value == "replacement"
    assert r.existing_refrigerant.value == "R-22"
    assert r.r22_flag is True
    assert r.access_difficulty.value == "attic"
    assert r.urgency.value == "urgent"
    assert r.lineset_replacement.value == "true"
    assert r.permit_required.value == "true"
    assert r.electrical_work.value == "true"
    assert r.equipment_make.value == "Carrier"
    assert r.equipment_age.value == "18"
    assert r.customer_name.value == "Sarah Williams"
    assert r.technician_name.value == "Dave Rodriguez"


if __name__ == "__main__":
    import inspect
    tests = [(n, f) for n, f in inspect.getmembers(__import__(__name__), inspect.isfunction) if n.startswith("test_")]
    passed = failed = 0
    for name, fn in tests:
        try:
            fn()
            print(f"  PASS  {name}")
            passed += 1
        except AssertionError as e:
            print(f"  FAIL  {name}  —  {e}")
            failed += 1
    print(f"\n{passed} passed, {failed} failed out of {passed + failed} tests.")
    if failed:
        raise SystemExit(1)
