# HVAC Proposal Automation — Claude Code Project Guide

## What This Project Is

A full-stack web application that automates the HVAC proposal process for a Houston-area HVAC company (primary dealer: Trane). Technicians or office staff enter job details via a structured form — or paste raw technician notes as a fallback — and the app outputs a styled, customer-ready three-tier proposal (Good / Better / Best).

**No AI or LLM is used at runtime.** All pricing and parsing logic is deterministic Python code.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.10 + FastAPI + Pydantic v2 |
| Frontend | Vanilla HTML / CSS / JS (no build step) |
| PDF Export | fpdf2 |
| Database | None yet — pricing loaded from JSON / Excel |
| Service area | Houston metro — Texas SEER2 standards apply |

---

## How to Run

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend — open directly in browser, no build needed
open frontend/index.html
```

API docs available at: `http://localhost:8000/docs`

---

## Project Structure

```
HVAC-System/
├── backend/
│   ├── main.py                        # FastAPI app, CORS, router registration
│   ├── requirements.txt
│   ├── routers/
│   │   ├── proposals.py               # POST /proposals, /parse-notes, /export-pdf
│   │   └── pricebook.py               # GET /pricebook/equipment
│   ├── services/
│   │   ├── pricing_engine.py          # Tier pricing logic (placeholders until Phase 2)
│   │   ├── notes_parser.py            # Raw notes -> structured fields (Phase 3 done)
│   │   ├── proposal_builder.py        # Assembles ProposalResponse from job + pricing
│   │   └── pdf_builder.py             # Generates branded PDF via fpdf2 (Phase 4 done)
│   ├── models/
│   │   ├── job_input.py               # Pydantic model for all 20 form fields
│   │   └── proposal.py                # ProposalResponse, TierOption, ParsedNotesResponse
│   ├── data/
│   │   └── pricebook.json             # Equipment/pricing data (placeholder — Phase 2)
│   └── tests/
│       ├── test_pricing.py            # 5 tests — pricing engine placeholder behavior
│       └── test_notes_parser.py       # 41 tests — full parser coverage
├── frontend/
│   ├── index.html                     # Job intake form (all fields + raw notes toggle)
│   ├── proposal.html                  # Three-tier proposal output + edit mode + PDF export
│   ├── style.css                      # Full responsive stylesheet
│   └── app.js                         # Form logic, API calls, proposal rendering, PDF download
└── excel/
    └── [client dashboard].xlsx        # DROP CLIENT FILE HERE for Phase 2
```

---

## API Endpoints

| Method | Endpoint | Status | Description |
|---|---|---|---|
| POST | `/proposals` | Done | Accepts job input, returns full three-tier proposal |
| POST | `/proposals/parse-notes` | Done | Parses raw technician notes into structured fields |
| POST | `/proposals/export-pdf` | Done | Returns branded PDF file download |
| GET | `/pricebook/equipment` | Done (placeholder) | Returns equipment options by system type |

---

## Phase Status

### Phase 1 — Scaffold + Form UI — COMPLETE
- FastAPI project structure with all routers, services, and models
- Job intake form with all 20 fields from the brief
- Raw notes fallback toggle
- Placeholder pricing engine returning `[PRICE TBD]`
- Three-tier proposal output page (Good / Better / Best)
- Houston smart defaults: permit auto-checked on replacement, R-22 warning banner, SEER2 note

### Phase 2 — Excel Integration — BLOCKED (waiting on client)
See full instructions below.

### Phase 3 — Notes Parser — COMPLETE
Parser extracts 14 fields from free-form technician notes using pattern matching (no AI):

| Field | Example patterns handled |
|---|---|
| Tonnage | `3.5 ton`, `3.5t`, `4T`, `3 1/2 ton` — snaps to valid values |
| System type | mini-split, heat pump, package unit, split, commercial |
| Service type | full replacement / swap out / repair / new install |
| Refrigerant | R-22/freon, R-410A/puron, R-32 |
| Access | attic, rooftop, crawl space / tight |
| Urgency | urgent (asap/no cooling/emergency), soon, routine |
| Equipment make | 22 known brands + `"existing: Carrier"` prefix detection |
| Equipment age | `"15 years old"`, `"installed 2010"` (auto-converts year to age) |
| Customer name | `"Customer: John Smith"` label detection |
| Tech name | `"Tech: Mike Rodriguez"` label detection |
| Permit | `"permit needed"` / `"no permit"` + auto-true on replacement |
| Lineset | `"new lineset needed"` / `"lineset replacement"` |
| Electrical | `"new disconnect"` / `"electrical work needed"` |
| Ductwork | `"leaky ducts"` / `"ductwork replacement"` |

Confidence flags (`high` / `medium` / `low`) are returned for each field. Low-confidence fields are highlighted yellow in the form for staff to verify before submitting.

**41 tests passing** — `backend/tests/test_notes_parser.py`

### Phase 4 — PDF Export — COMPLETE
- `POST /proposals/export-pdf` returns a landscape A4 PDF
- Branded header with logo placeholder
- Proposal metadata block (customer, address, system, tech, date)
- R-22 / SEER2 / permit banners shown as applicable
- Three-column Good / Better / Best layout with color-coded headers, benefits, warranty, install time, pricing breakdown, and total
- "Pricing pending Excel integration" note on placeholder tiers
- Export button in `proposal.html` calls the API and triggers browser download

### Phase 5 — Polish + Deploy — NOT STARTED
- Mobile/tablet responsiveness audit and fixes
- Final styling pass
- Deployment (hosting TBD with client)

---

## Phase 2 Instructions — Excel Integration

**Trigger:** Client provides their Excel pricing dashboard. Drop the file in `excel/`.

### What to do when the Excel file arrives:

1. **Read every sheet** — map all tabs, identify input variables vs. calculated cells
2. **Extract pricing components:**
   - Equipment cost by brand, model, tonnage, and SEER rating
   - Labor cost by job type, system type, and access difficulty
   - Dealer margin / markup formula
   - Adder costs: lineset replacement, electrical, ductwork, permit fees
   - Final customer price per tier
3. **Replicate each formula as a Python function** in `backend/services/pricing_engine.py`
   - Replace all `[PRICE TBD]` placeholders with real calculations
   - Remove the `is_placeholder = True` flag on `TierOption` objects when real pricing is wired in
4. **Populate `backend/data/pricebook.json`** with equipment catalog data (brands, models, tonnage options, base costs)
5. **Update `backend/routers/pricebook.py`** to load from `pricebook.json` instead of the hardcoded placeholder dict
6. **Write test cases** in `backend/tests/test_pricing.py` validating that Python output matches Excel output for a set of known inputs — do not remove the placeholder tests, just add real ones alongside them

### Key config in `pricing_engine.py`:

```python
TIER_STRATEGY = "brand"  # Switch to "efficiency" once client confirms
```

- `"brand"` — Good = budget brand, Better = mid-tier, Best = Trane
- `"efficiency"` — All Trane, tiered by SEER2: Good = 15, Better = 17, Best = 20+

**Client must confirm which strategy before Phase 2 can be finalized.**

---

## Open Decisions — Confirm with Client Before Phase 2

- [ ] **Tier strategy** — brand-based (Option A) or efficiency-based (Option B)?
- [ ] **Pricing display** — total only, fully itemized, or itemized internally / total shown to customer?
- [ ] **Additional brands** — confirm the 2-3 brands carried beyond Trane (for pricebook)
- [ ] **Provide Excel pricing dashboard**
- [ ] **Company logo** — replace `[ Company Logo ]` placeholder in header and PDF
- [ ] **Branding preferences** — colors, fonts, company name for proposal template

---

## Key Design Decisions

- **No AI at runtime** — all logic is deterministic Python. The parser uses regex and keyword matching only.
- **TIER_STRATEGY config flag** — both tier strategies are implemented behind a single config switch so the client decision doesn't require a code rewrite.
- **Placeholder-first architecture** — the full end-to-end flow works with placeholder prices, allowing the frontend and backend to be fully tested before the Excel file arrives.
- **fpdf2 for PDF** — chosen over WeasyPrint due to macOS system library dependencies. fpdf2 is pure Python with no system requirements.
- **Tonnage snapping** — the parser snaps extracted tonnage to the nearest valid value (1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0) and drops confidence to `medium` if an exact match isn't found.

---

## Running Tests

```bash
cd backend
python tests/test_pricing.py       # 5 tests
python tests/test_notes_parser.py  # 41 tests
```

All 46 tests should pass before any push.
