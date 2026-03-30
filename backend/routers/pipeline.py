from fastapi import APIRouter, HTTPException
from models.job_input import JobInput
from models.pipeline import ProposalRecord, StageUpdate, ApproveRequest, RejectRequest, NotesUpdate
from services.proposal_builder import build_proposal
from services.proposal_store import (
    save_proposal, list_proposals, get_proposal,
    update_stage, update_owner_action, update_notes, VALID_STAGES,
)

router = APIRouter()


@router.post("", response_model=ProposalRecord)
def submit_job(job: JobInput):
    """
    Tech portal entry point. Generates Good/Better/Best estimate and
    persists to the DB in 'estimate_ready' stage.
    """
    try:
        proposal = build_proposal(job)
        record = save_proposal(
            proposal,
            urgency=job.urgency or "routine",
            additional_notes=job.additional_notes,
        )
        return record
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("", response_model=list[ProposalRecord])
def get_proposals(stage: str = None, search: str = None):
    return list_proposals(stage=stage, search=search)


@router.get("/{id}", response_model=ProposalRecord)
def get_one(id: str):
    record = get_proposal(id)
    if not record:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return record


@router.patch("/{id}/stage", response_model=ProposalRecord)
def patch_stage(id: str, body: StageUpdate):
    if body.stage not in VALID_STAGES:
        raise HTTPException(status_code=422, detail=f"Invalid stage: {body.stage}")
    record = update_stage(id, body.stage)
    if not record:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return record


@router.patch("/{id}/approve", response_model=ProposalRecord)
def approve(id: str, body: ApproveRequest):
    record = update_owner_action(id, "proposal_sent", body.notes or "Approved")
    if not record:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return record


@router.patch("/{id}/reject", response_model=ProposalRecord)
def reject(id: str, body: RejectRequest):
    record = update_owner_action(id, "lost", body.notes)
    if not record:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return record


@router.patch("/{id}/notes", response_model=ProposalRecord)
def patch_notes(id: str, body: NotesUpdate):
    record = update_notes(id, body.notes)
    if not record:
        raise HTTPException(status_code=404, detail="Proposal not found")
    return record
