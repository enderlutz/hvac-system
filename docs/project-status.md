# HVAC Proposal System — Project Status

**Last updated:** March 24, 2026

---

## What This System Does

Right now, creating a single HVAC proposal takes Lucks Air & Heat 30 minutes to 2 hours using an Excel spreadsheet. This software replaces that process:

1. The technician visits the job site and fills out a form on their phone/tablet
2. The system automatically calculates three price options (Good / Better / Best)
3. The office reviews and approves the numbers
4. A professional PDF proposal is generated and ready to send to the customer

---

## What's Working Today

- **Tech form** — the field technician can fill out job details (customer info, system size, system type, access difficulty, etc.)
- **Automatic pricing** — the system calculates prices using the same math as the Excel spreadsheet, for all 5 brands (Goodman, Amana, Lennox, Trane, Carrier)
- **Three-tier proposals** — Good, Better, and Best options with different brands/efficiency levels
- **Admin dashboard** — kanban board to track proposals through the pipeline (new lead → appointment → estimate → proposal sent → won/lost)
- **PDF export** — branded proposal document with all three options laid out side by side
- **Notes parser** — can read a tech's free-form notes and pull out key details (tonnage, system type, refrigerant, etc.)

---

## What We Still Need From the Client

These are questions for Crickett/Clint. We can't finish certain parts without their answers.

### Must Answer

1. **How should Good / Better / Best work?**
   - Option A: Different brands (Good = Goodman, Better = Amana, Best = Trane)
   - Option B: Same brand but different efficiency levels
   - Option C: Something else entirely?

2. **What do you charge for add-ons?**
   - Lineset replacement — how much?
   - Electrical work — how much?
   - Ductwork — how much?
   - These are currently blank in the system because we don't have the numbers.

3. **Is the $900 installer labor rate always $900?**
   - Or does it change for attic jobs, bigger systems, ductwork jobs, etc.?

4. **What is the 4% "Incentive" line in the Excel?**
   - Is it a sales commission? A referral fee? Should it be in the software?

5. **How should materials be handled?**
   - The Excel requires someone to enter every single material item (every foot of copper, every fitting). Should the software do the same, or is an automatic estimate by system size good enough for the proposal stage?

6. **Permit costs** — is $200 always right, or does it change by job? Is there a formula?

### Nice to Have

7. **Company logo** — need a PNG or SVG file to put on the PDF proposals (currently shows a placeholder)
8. **How do you send proposals?** — email, print, hand-deliver? This affects whether we need a "send to customer" button
9. **Multi-system jobs** — how common are houses with 2+ systems being replaced at once?

---

## What's Left to Build

### Can do right now (no client answers needed)

- **Equipment browser** — let the admin see all available equipment models and prices in the dashboard
- **Auto-fill from notes** — when a tech pastes their notes, automatically fill in the form fields instead of making them type everything twice

### Needs client answers first

- **Finalize the tier strategy** — which brands map to Good/Better/Best (waiting on question 1)
- **Add-on pricing** — lineset, electrical, ductwork costs (waiting on question 2)
- **Materials accuracy** — validate that our material cost estimates match real jobs (waiting on question 5)

### Future (Phase 5)

- **Email proposals** — send the PDF directly to the customer from the system
- **Pull sheet** — generate a warehouse pick list for the installer (like the Excel's PULLSHEET tab)
- **Work orders / contracts** — auto-generate the installer work order with lien waiver
- **Deployment** — put the system online so it's accessible from the field (currently runs on a local computer only)

---

## File Locations (for developers)

| What | Where |
|---|---|
| Backend code | `backend/` |
| Frontend code | `frontend/` |
| Equipment + material prices | `backend/data/pricebook.json` |
| Pricing formula | `backend/services/pricing_engine.py` |
| PDF generator | `backend/services/pdf_builder.py` |
| Client questions | `docs/confused.md` |
| Excel analysis | `docs/excel-process-summary.md` |
| Original Excel | `excel/1 - RETRO ESTIMATING SHEET.xlsx` |
