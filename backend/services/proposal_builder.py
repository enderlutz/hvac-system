"""
Proposal Builder — assembles the final ProposalResponse from job input and pricing engine output.
"""

import uuid
from models.job_input import JobInput, Refrigerant, ServiceType
from models.proposal import ProposalResponse
from services.pricing_engine import calculate_proposal


def build_proposal(job: JobInput) -> ProposalResponse:
    tiers = calculate_proposal(job)

    r22_warning = job.existing_refrigerant == Refrigerant.r22

    # Auto-check permit for full replacements (Houston default)
    permit_required = job.permit_required or job.service_type == ServiceType.replacement

    # SEER2 compliance note shown on all proposals (Texas 15 SEER2 minimum)
    seer2_note = True

    return ProposalResponse(
        proposal_id=str(uuid.uuid4()),
        customer_name=job.customer_name,
        customer_address=job.customer_address,
        technician_name=job.technician_name,
        visit_date=job.visit_date,
        system_type=job.system_type.value,
        service_type=job.service_type.value,
        system_size_tons=job.system_size_tons,
        r22_warning=r22_warning,
        permit_required=permit_required,
        seer2_compliance_note=seer2_note,
        good=tiers["good"],
        better=tiers["better"],
        best=tiers["best"],
    )
