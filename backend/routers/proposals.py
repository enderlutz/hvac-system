from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, Response
from models.job_input import JobInput, RawNotesInput
from models.proposal import ProposalResponse, ParsedNotesResponse
from services.proposal_builder import build_proposal
from services.notes_parser import parse_notes
from services.pdf_builder import generate_proposal_pdf

router = APIRouter()


@router.post("", response_model=ProposalResponse)
def create_proposal(job: JobInput):
    try:
        proposal = build_proposal(job)
        return proposal
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/parse-notes", response_model=ParsedNotesResponse)
def parse_raw_notes(body: RawNotesInput):
    try:
        parsed = parse_notes(body.raw_notes)
        return parsed
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export-pdf")
def export_pdf(proposal: ProposalResponse):
    try:
        pdf_bytes = generate_proposal_pdf(proposal)
        filename = f"HVAC_Proposal_{proposal.customer_name.replace(' ', '_')}_{proposal.visit_date}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
