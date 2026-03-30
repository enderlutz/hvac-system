"""
Proposal persistence layer — all SQLite reads and writes for the pipeline.
"""

import json
import re
from datetime import datetime, timezone
from typing import Optional

from database import get_db
from models.proposal import ProposalResponse, TierOption
from models.pipeline import ProposalRecord

VALID_STAGES = {
    "new_lead", "appointment_set", "estimate_ready",
    "proposal_sent", "follow_up", "won", "lost",
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_price(price_str: str) -> float:
    """Convert a formatted price string like '$9,279' to a float. Returns 0.0 on failure."""
    try:
        return float(re.sub(r"[^0-9.]", "", price_str))
    except (ValueError, TypeError):
        return 0.0


def _row_to_record(row) -> ProposalRecord:
    d = dict(row)
    return ProposalRecord(
        id=d["id"],
        customer_name=d["customer_name"],
        customer_address=d["customer_address"],
        technician_name=d["technician_name"],
        visit_date=d["visit_date"],
        system_type=d["system_type"],
        service_type=d["service_type"],
        system_size_tons=d["system_size_tons"],
        stage=d["stage"],
        urgency=d["urgency"],
        r22_flag=bool(d["r22_flag"]),
        permit_required=bool(d["permit_required"]),
        seer2_compliance_note=bool(d["seer2_compliance_note"]),
        good_tier=TierOption(**json.loads(d["good_tier"])),
        better_tier=TierOption(**json.loads(d["better_tier"])),
        best_tier=TierOption(**json.loads(d["best_tier"])),
        good_price=d["good_price"],
        better_price=d["better_price"],
        best_price=d["best_price"],
        pipeline_value=d["pipeline_value"],
        notes=d.get("notes"),
        owner_notes=d.get("owner_notes"),
        created_at=d["created_at"],
        updated_at=d["updated_at"],
    )


def save_proposal(
    proposal: ProposalResponse,
    urgency: str,
    additional_notes: Optional[str] = None,
) -> ProposalRecord:
    now = _now()
    # Use Better tier price as the pipeline value (mid-range estimate)
    pipeline_value = _parse_price(proposal.better.total_price)

    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO proposals (
                id, customer_name, customer_address, technician_name,
                visit_date, system_type, service_type, system_size_tons,
                stage, urgency, r22_flag, permit_required, seer2_compliance_note,
                good_tier, better_tier, best_tier,
                good_price, better_price, best_price,
                pipeline_value, notes, created_at, updated_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
            """,
            (
                proposal.proposal_id,
                proposal.customer_name,
                proposal.customer_address,
                proposal.technician_name,
                proposal.visit_date,
                proposal.system_type,
                proposal.service_type,
                proposal.system_size_tons,
                "estimate_ready",
                urgency,
                int(proposal.r22_warning),
                int(proposal.permit_required),
                int(proposal.seer2_compliance_note),
                proposal.good.model_dump_json(),
                proposal.better.model_dump_json(),
                proposal.best.model_dump_json(),
                proposal.good.total_price,
                proposal.better.total_price,
                proposal.best.total_price,
                pipeline_value,
                additional_notes,
                now,
                now,
            ),
        )
        conn.commit()
    return get_proposal(proposal.proposal_id)  # type: ignore[return-value]


def list_proposals(
    stage: Optional[str] = None,
    search: Optional[str] = None,
) -> list[ProposalRecord]:
    query = "SELECT * FROM proposals WHERE 1=1"
    params: list = []

    if stage:
        query += " AND stage = ?"
        params.append(stage)

    if search:
        term = f"%{search.lower()}%"
        query += " AND (LOWER(customer_name) LIKE ? OR LOWER(customer_address) LIKE ? OR LOWER(technician_name) LIKE ?)"
        params.extend([term, term, term])

    query += " ORDER BY created_at DESC"

    with get_db() as conn:
        rows = conn.execute(query, params).fetchall()
    return [_row_to_record(r) for r in rows]


def get_proposal(id: str) -> Optional[ProposalRecord]:
    with get_db() as conn:
        row = conn.execute("SELECT * FROM proposals WHERE id = ?", (id,)).fetchone()
    return _row_to_record(row) if row else None


def update_stage(id: str, stage: str) -> Optional[ProposalRecord]:
    with get_db() as conn:
        conn.execute(
            "UPDATE proposals SET stage = ?, updated_at = ? WHERE id = ?",
            (stage, _now(), id),
        )
        conn.commit()
    return get_proposal(id)


def update_owner_action(
    id: str, stage: str, owner_notes: str
) -> Optional[ProposalRecord]:
    with get_db() as conn:
        conn.execute(
            "UPDATE proposals SET stage = ?, owner_notes = ?, updated_at = ? WHERE id = ?",
            (stage, owner_notes, _now(), id),
        )
        conn.commit()
    return get_proposal(id)


def update_notes(id: str, notes: str) -> Optional[ProposalRecord]:
    with get_db() as conn:
        conn.execute(
            "UPDATE proposals SET notes = ?, updated_at = ? WHERE id = ?",
            (notes, _now(), id),
        )
        conn.commit()
    return get_proposal(id)
