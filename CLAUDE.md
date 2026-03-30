# HVAC Proposal Automation — Claude Code Project Guide

**Client:** Lucks Air & Heat, LLC — Cypress, TX
**Contact:** Crickett Teelucksingh (office) | Clint Teelucksingh (authorized agent)
**License:** TACLA29424E | Service area: Houston metro

---

## What This Project Is

A full-stack web application that completely replaces the client's Excel-based estimating and proposal process. The goal is: technician visits job site → enters job details into a form → system generates a three-tier proposal (Good / Better / Best) → admin reviews and edits → proposal sent to customer as PDF.

**No AI or LLM is used at runtime.** All pricing and parsing logic is deterministic Python.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.10 + FastAPI + Pydantic v2 |
| Frontend | Vanilla HTML / CSS / JS (no build step) |
| PDF Export | fpdf2 (pure Python, no system deps) |
| Pricing data | `backend/data/pricebook.json` |
| Service area | Houston metro — Texas 15 SEER2 minimum, 8.25% sales tax |

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

API docs: `http://localhost:8000/docs`

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
│   │   ├── pricing_engine.py          # THE CORE — Excel formula chain in Python
│   │   ├── notes_parser.py            # Raw notes -> structured fields (Phase 3, COMPLETE)
│   │   ├── proposal_builder.py        # Assembles ProposalResponse from job + pricing
│   │   └── pdf_builder.py             # Generates branded PDF via fpdf2 (Phase 4, COMPLETE)
│   ├── models/
│   │   ├── job_input.py               # Pydantic model for all job fields
│   │   └── proposal.py                # ProposalResponse, TierOption, ParsedNotesResponse
│   ├── data/
│   │   └── pricebook.json             # Equipment catalog + materials BOM defaults
│   └── tests/
│       ├── test_pricing.py            # Pricing engine tests
│       └── test_notes_parser.py       # 41 tests — full parser coverage
├── frontend/
│   ├── index.html                     # Job intake form
│   ├── proposal.html                  # Three-tier proposal output + edit + PDF export
│   ├── style.css
│   └── app.js
├── docs/
│   ├── excel-process-summary.md      # Full analysis of the client's Excel workbook
│   └── confused.md                   # Open questions to ask the client
└── excel/
    └── 1 - RETRO ESTIMATING SHEET.xlsx   # Client's source-of-truth workbook
```

---

## API Endpoints

| Method | Endpoint | Status | Description |
|---|---|---|---|
| POST | `/proposals` | Done | Accepts job input, returns full three-tier proposal |
| POST | `/proposals/parse-notes` | Done | Parses raw technician notes into structured fields |
| POST | `/proposals/export-pdf` | Done | Returns branded PDF download |
| GET | `/pricebook/equipment` | Placeholder | Returns equipment options by system type |

---

## Phase Status

### Phase 1 — Scaffold + Form UI — COMPLETE
Full end-to-end flow with placeholder pricing. Job form, proposal output, PDF export all working.

### Phase 2 — Real Pricing Engine — IN PROGRESS (equipment complete, materials estimated)
All 5 brands (Amana, Goodman, Lennox, Trane, Carrier) now have real dealer costs in pricebook.json.
12 system packages built (3 tiers × 4 brands), 685 equipment items, 262 material items cataloged.
See full details in the section below.

### Phase 3 — Notes Parser — COMPLETE
41 tests passing. Extracts 14 fields from free-form technician notes.

### Phase 4 — PDF Export — COMPLETE
Branded landscape A4 PDF with three-column Good/Better/Best layout.

### Phase 5 — Polish + Deploy — NOT STARTED

---

## Phase 2: Pricing Engine Implementation

This is the core of Phase 2. The goal is to implement the exact formula chain from the client's Excel workbook so the software produces prices that match what the client would have calculated manually.

### The Excel formula chain (source of truth)

This is the exact logic from the client's ESTIMATE SHEET, translated to plain English:

```
1. EQUIPMENT COST  = dealer_cost × 1.10
                     (dealer price from EQUIPMENT PRICING sheet, +10% markup)

2. MATERIALS       = sum of all line-item materials for the job
                     (fittings, flex duct, copper, drain pan, etc.)
                     In the software: use default BOM by tonnage + system type
                     (see pricebook.json: "default_bom" section)

3. LABOR           = $900 flat for a complete system retrofit
                     (from RETRO PRICE SHEET — this is the subcontractor rate)

4. PERMITS         = looked up from PERMIT LOG (varies $111–$250+)
                     In the software: use $200 default until client clarifies formula

5. WARRANTY        = $150 (hardcoded in Excel)

6. TAXABLE AMOUNT  = materials × 1.05
                     (the 1.05 factor is a waste/handling buffer — need to confirm with client)

7. SUB TOTAL       = (equipment_cost) + (labor + permits + warranty + taxable_amount)

8. RETAIL PRICE    = sub_total / 0.55
                     (dividing by 0.55 achieves a 45% gross margin target)

9. TAX             = (taxable_materials + equipment_cost) × 0.0825
                     (Texas 8.25% sales tax on equipment + taxable materials)

10. FINAL PRICE    = retail_price + tax
```

### Tier strategy config

```python
TIER_STRATEGY = "brand"  # Options: "brand" | "efficiency"
```

- **`"brand"`** — Good = Goodman, Better = Carrier/Amana, Best = Trane/Lennox
- **`"efficiency"`** — All same brand, tiered by SEER2: Good = 15, Better = 17, Best = 20+

**Client has not yet confirmed which strategy.** Default to `"brand"` until confirmed.

### Equipment selection per tier

When `TIER_STRATEGY = "brand"`, each tier uses a different brand's equipment at the same tonnage. The model is selected from `pricebook.json` based on `(brand, tonnage, system_type)`.

When `TIER_STRATEGY = "efficiency"`, all tiers use the same brand but different SEER2 ratings. Model selected by `(brand, tonnage, seer_tier)`.

### Default BOM (bill of materials)

The Excel requires manual line-item quantity entry per job. The software replaces this with pre-calculated material cost totals by tonnage and access difficulty. These are stored in `pricebook.json` under `"default_bom"` and were derived from typical jobs in the client's PRICING WORKSHEET.

Structure:
```json
"default_bom": {
  "1.5": { "standard": 320, "attic": 380, "rooftop": 420 },
  "2.0": { "standard": 360, "attic": 420, "rooftop": 460 },
  ...
}
```

### Adder costs

On top of the base formula, add these when applicable:

| Adder | Amount | Trigger |
|---|---|---|
| Permit | $200 (default) | Always on replacement jobs; or when `permit_required = true` |
| Lineset replacement | TBD from client | When `lineset_replacement = true` |
| Electrical work | TBD from client | When `electrical_work_needed = true` |
| Ductwork | TBD from client | When `ductwork_needed = true` |

### What's in pricebook.json

```json
{
  "pricing_constants": { "equipment_markup": 1.10, "materials_buffer": 1.05, "markup_divisor": 0.55, "tax_rate": 0.0825 },
  "fixed_costs": { "warranty": 150, "permit_default": 200, "misc_flat": 150 },
  "labor": { "complete_retrofit": 900, ... },
  "adders": { "lineset_replacement": null, "electrical_work": null, "ductwork": null },
  "default_bom": { "1.5": { "standard": 280, "attic": 340, ... }, ... },
  "equipment_catalog": {
    "AMANA": { "gas_furnace": [...], "condenser": [...], ... },
    "GOODMAN": { ... }, "LENNOX": { ... }, "TRANE": { ... }, "CARRIER": { ... }
  },
  "materials_catalog": {
    "copper_tubing": [...], "flex_duct_r8": [...], "thermostats": [...], ...
  },
  "tier_brands": {
    "brand": {
      "good": { "brand_name": "Goodman", "package_key": "goodman_standard" },
      "better": { "brand_name": "Amana", "package_key": "amana_high_eff" },
      "best": { "brand_name": "Trane", "package_key": "trane_premium" }
    }
  },
  "system_packages": {
    "amana_standard_eff": { "1.5": { "furnace_model": "...", "total_dealer_cost": 1865.16 }, ... },
    "goodman_standard": { ... }, "lennox_standard": { ... }, "trane_standard": { ... },
    // 12 packages total: 4 brands × 3 efficiency tiers
  }
}
```

### Implementation checklist

- [x] Populate `pricebook.json` with real equipment data from EQUIPMENT PRICING sheet — ALL 5 brands done (2026-03-24)
- [x] Populate `pricebook.json` with default BOM values by tonnage
- [x] Rewrite `pricing_engine.py` to implement the formula chain above
- [x] Remove `is_placeholder = True` from TierOption when real pricing is wired in — all brands now confirmed
- [x] Add real pricing tests to `test_pricing.py`
- [x] Get Trane and Lennox dealer costs — they were in the Excel all along
- [ ] Update `pricebook.py` router to serve real equipment data
- [ ] Get client confirmation on tier strategy
- [ ] Confirm adder costs (lineset, electrical, ductwork)

---

## Open Client Questions

Full list in `docs/confused.md`. The **remaining blockers** for Phase 2:

1. **Tier strategy** — brand-based or efficiency-based? (see question A2)
2. ~~**Trane and Lennox dealer costs**~~ — **RESOLVED** (2026-03-24)
3. **Adder costs** — lineset, electrical, ductwork amounts (see question C2)
4. **What the Incentive (4% of sale) is** — affects whether we include it (see question C3)
5. **Materials handling factor** — confirm the 1.05 multiplier meaning (see question C5)

---

## Key Design Decisions

- **No AI at runtime.** All pricing is deterministic Python from `pricebook.json` + formula constants.
- **Excel formula chain is the source of truth.** Any pricing question should be traced back to what the Excel did.
- **Default BOM instead of line-item entry.** The software uses pre-calculated material totals by tonnage/access. This is a deliberate simplification — the client confirmed (or will confirm) this is acceptable for the proposal stage.
- **`TIER_STRATEGY` config flag.** Both brand and efficiency strategies are implemented behind a single switch. Client decision does not require a code rewrite.
- **`is_placeholder` flag.** Any `TierOption` with `is_placeholder=True` shows a "Pricing pending" notice in the PDF and UI. Remove this flag per tier as real pricing is wired in.
- **fpdf2 for PDF.** Pure Python, no system library dependencies.
- **Tonnage snapping.** Parser snaps extracted tonnage to nearest valid value: 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0.

---

## Equipment Pricing — All Brands Populated (2026-03-24)

All 5 brands (Amana, Carrier, Goodman, Lennox, Trane) have real dealer costs from the EQUIPMENT PRICING sheet. 685 total equipment items. 12 system packages across 4 brands × 3 efficiency tiers. No placeholders remain.

**Notes:**
- Shared coil models (ARUF/ASPT) have different dealer costs under Amana vs Goodman — each package uses the correct brand's price.
- Amana premium and Trane/Lennox premium packages only cover 2.0/3.0/4.0/5.0T (no 1.5/2.5/3.5T condensers available in those premium lines).
- S9V2C100U5VSB (Trane 100k BTU variable furnace) is $3,965 in Excel — verify with distributor.

---

## Running Tests

```bash
cd backend
python tests/test_pricing.py       # pricing engine tests
python tests/test_notes_parser.py  # 41 tests
```

All tests must pass before any commit.
