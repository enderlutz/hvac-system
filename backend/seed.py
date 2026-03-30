"""
Seed the database with realistic demo proposals.
Run: python seed.py
Safe to run multiple times — skips if data already exists.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from database import init_db, get_db
from models.job_input import JobInput, SystemType, ServiceType, Refrigerant, Urgency
from services.proposal_builder import build_proposal
from services.proposal_store import save_proposal, update_stage, update_notes

SEED_JOBS = [
    # 1 — proposal_sent, R-22, soon
    dict(
        customer_name="James & Linda Carter",
        customer_address="8412 Westheimer Rd, Houston TX 77063",
        technician_name="Mike Johnson",
        visit_date="2026-03-14",
        system_type=SystemType.split,
        service_type=ServiceType.replacement,
        system_size_tons=3.5,
        existing_refrigerant=Refrigerant.r22,
        existing_equipment_age=17,
        urgency=Urgency.soon,
        permit_required=True,
        additional_notes="R-22 system, 17 years old. Customer wants to upgrade before summer.",
        stage="proposal_sent",
    ),
    # 2 — follow_up, heat pump
    dict(
        customer_name="Roberto Vasquez",
        customer_address="2200 Main St, Houston TX 77002",
        technician_name="Dave Chen",
        visit_date="2026-03-15",
        system_type=SystemType.heat_pump,
        service_type=ServiceType.replacement,
        system_size_tons=4.0,
        urgency=Urgency.routine,
        additional_notes="Comparing with 2 other companies. Follow up Friday.",
        stage="follow_up",
    ),
    # 3 — won, urgent
    dict(
        customer_name="Sarah Mitchell",
        customer_address="501 Crawford St, Houston TX 77002",
        technician_name="Mike Johnson",
        visit_date="2026-03-16",
        system_type=SystemType.split,
        service_type=ServiceType.replacement,
        system_size_tons=2.5,
        urgency=Urgency.urgent,
        additional_notes="Signed on Better tier. Install scheduled for 3/20.",
        stage="won",
    ),
    # 4 — estimate_ready, package unit, rooftop
    dict(
        customer_name="Thompson Family",
        customer_address="9800 Katy Fwy, Houston TX 77024",
        technician_name="Dave Chen",
        visit_date="2026-03-17",
        system_type=SystemType.package_unit,
        service_type=ServiceType.replacement,
        system_size_tons=5.0,
        urgency=Urgency.routine,
        additional_notes="Large package unit, rooftop. Awaiting review before sending.",
        stage="estimate_ready",
    ),
    # 5 — new_lead, mini-split
    dict(
        customer_name="Diana Nguyen",
        customer_address="3300 Montrose Blvd, Houston TX 77006",
        technician_name="Mike Johnson",
        visit_date="2026-03-17",
        system_type=SystemType.mini_split,
        service_type=ServiceType.new_install,
        system_size_tons=1.5,
        urgency=Urgency.routine,
        additional_notes="Garage conversion. Needs ductless mini-split.",
        stage="new_lead",
    ),
    # 6 — lost, R-22
    dict(
        customer_name="Marcus & Tanya Williams",
        customer_address="6700 Bissonnet St, Houston TX 77074",
        technician_name="Dave Chen",
        visit_date="2026-03-13",
        system_type=SystemType.split,
        service_type=ServiceType.replacement,
        system_size_tons=3.0,
        existing_refrigerant=Refrigerant.r22,
        urgency=Urgency.soon,
        additional_notes="Went with a competitor. Price was the deciding factor.",
        stage="lost",
    ),
    # 7 — appointment_set
    dict(
        customer_name="Kevin Patel",
        customer_address="1500 Post Oak Blvd, Houston TX 77056",
        technician_name="Mike Johnson",
        visit_date="2026-03-17",
        system_type=SystemType.split,
        service_type=ServiceType.replacement,
        system_size_tons=4.0,
        urgency=Urgency.soon,
        additional_notes="Appointment confirmed for 3/19 at 10am.",
        stage="appointment_set",
    ),
    # 8 — proposal_sent, R-22, urgent, heat pump
    dict(
        customer_name="Hernandez Household",
        customer_address="4400 Telephone Rd, Houston TX 77087",
        technician_name="Dave Chen",
        visit_date="2026-03-16",
        system_type=SystemType.heat_pump,
        service_type=ServiceType.replacement,
        system_size_tons=3.5,
        existing_refrigerant=Refrigerant.r22,
        urgency=Urgency.urgent,
        additional_notes="R-22 heat pump failure. No cooling — hot family. Sent proposal 3/16.",
        stage="proposal_sent",
    ),
]


def main():
    init_db()

    # Check if already seeded
    with get_db() as conn:
        count = conn.execute("SELECT COUNT(*) FROM proposals").fetchone()
        existing = list(count.values())[0] if hasattr(count, "values") else count[0]

    if existing > 0:
        print(f"Database already has {existing} proposals — skipping seed.")
        return

    print("Seeding database with demo proposals...")
    for i, job_data in enumerate(SEED_JOBS):
        stage = job_data.pop("stage")
        job = JobInput(**job_data)
        notes = job_data.get("additional_notes")

        proposal = build_proposal(job)
        record = save_proposal(proposal, urgency=job.urgency.value, additional_notes=notes)

        if stage != "estimate_ready":
            update_stage(record.id, stage)

        print(f"  [{i+1}/{len(SEED_JOBS)}] {job.customer_name} → {stage}")

    print(f"\nDone. {len(SEED_JOBS)} proposals seeded.")


if __name__ == "__main__":
    main()
