# Client Clarification Questions

The goal of this document is to gather every piece of information needed to **completely replace the Excel workbook** with the software. These questions are grouped by topic. Some are blockers (we cannot build the feature without the answer), others are just important for accuracy.

---

## A. Tiered Proposals — The Biggest Question

The current Excel produces **one price** per job. The software we are building produces **three options** (Good / Better / Best) for the customer to choose from.

**A1.** Do you currently ever offer customers multiple price options, or is it always one proposal with one price?

**A2.** If we add three tiers, how do you want to differentiate them? Two options:
- **Option A — By brand:** Good = Goodman, Better = Carrier or Amana, Best = Trane or Lennox
- **Option B — By efficiency:** All the same brand (e.g., all Trane), but Good = 15 SEER2, Better = 17 SEER2, Best = 20+ SEER2 variable speed
- **Option C — Something else?** (e.g., Good = basic replacement, Better = with ductwork, Best = with ductwork + smart thermostat + UV light)

**A3.** For the brands you carry: can you give us a ranked list from "most budget-friendly" to "most premium"? We know you carry Amana, Carrier, Goodman, Lennox, and Trane — are those all correct, and in what order?

---

## B. Equipment Pricing

**B1.** ~~Your Excel's EQUIPMENT PRICING sheet has dealer costs for Amana, Carrier, and Goodman. But Lennox and Trane are referenced by model number (in the ESTIMATE # LOG) without dealer costs in that sheet.~~ **RESOLVED** — Lennox (120 items) and Trane (70 items) dealer costs ARE in the EQUIPMENT PRICING sheet. All 5 brands now populated in pricebook.json (2026-03-24).

**B2.** How often do your dealer costs change? (Weekly, monthly, per quote from the distributor?) This affects whether we hardcode prices in the system or give you an easy way to update them.

**B3.** When you pick a specific model number for a job (e.g., a 3-ton gas furnace), what drives that selection? Is it:
- Always the same model for a given tonnage?
- Based on what's in stock at the distributor?
- Based on the customer's budget or preference?
- Based on a pre-built "package" (like the ESTIMATE # LOG codes)?

**B4.** The ESTIMATE # LOG has pre-built system configurations (e.g., `L15.25.0SHG` = 5-ton Lennox 15.2 SEER2 horizontal gas). Are these the standard configurations you use for most jobs? Should the software use these as templates?

---

## C. The Pricing Formula

We found the exact formula your Excel uses. We want to confirm we understand it correctly before building it into the software.

**C1.** The formula works like this — does this match how you think about it?
```
Equipment cost (dealer price × 1.10)
+ Labor ($900 flat for a complete system)
+ Materials (fittings, flex duct, copper, drain pan, etc.)
= Subtotal

Subtotal ÷ 0.55 = Retail Price  (this gives you a 45% gross margin)
+ Tax (8.25% on equipment + taxable materials)
= Final Price
```

**C2.** The $900 labor rate — is that always $900 for a standard full system replacement, or does it vary by job? For example, do attic jobs pay more? What about new construction vs. retrofit?

**C3.** On the ESTIMATE SHEET there is a line called **"Incentive" = 4% of the final sale price**. What is this? Is it a referral fee, a sales commission, a builder incentive, or something else? Does it always apply or only on certain jobs?

**C4.** There is also a line called **"Engineering" with $545.71** in a nearby cell. What is this charge and when does it apply?

**C5.** The formula adds **5% to materials** (the taxable materials subtotal is `materials × 1.05`). Is this a waste/overage factor (buying 5% more than needed), a handling fee, or something else?

**C6.** The **Warranty line item is hardcoded at $150** and the **Miscellaneous line adds $150** on top of material sums. What do these cover? Are they always exactly $150 each, or do they change?

**C7.** Permits: your Permit Log shows amounts ranging from $111 to over $250. Is there a formula for permit cost (e.g., based on tonnage or job valuation), or is it looked up manually each time by contacting the city?

---

## D. Materials / Bill of Materials

The biggest challenge in replacing the Excel is the materials section. Currently, someone manually enters quantities for every material (every foot of flex duct, every fitting, every piece of copper) for each job. The software would need to either:
- Ask for quantities per job (lots of data entry), or
- Use smart defaults per tonnage and system type (faster, but less precise)

**D1.** For a typical 3-ton complete replacement in an attic, what materials vary job to job vs. what's roughly the same every time?

**D2.** Do you track material costs per job for profit analysis, or mainly for the pull sheet (so the warehouse knows what to pick)?

**D3.** If the software calculated a materials estimate automatically (e.g., "3-ton attic job ≈ $450 in materials") instead of line-by-line, would that be acceptable for generating the proposal? Or do you need exact material costs?

**D4.** The PULLSHEET currently doubles as a warehouse pick list. Should the software still generate a pull sheet for the warehouse, or is that handled separately?

---

## E. Proposal Format and Delivery

**E1.** How do you currently send proposals to customers — printed and handed over, emailed as PDF, or both?

**E2.** The current proposal has a fixed scope-of-work text (e.g., "Install new drain pan, plenum, flue pipe, Honeywell Pro thermostat, R-8 flex ductwork, metal grilles, Honeywell F-100 media filter"). Is this text standard for every job, or does it change based on what's actually being done?

**E3.** On the proposal, there are two prices shown:
- **Total** (full price)
- **Cash/Check Discount Total** (5% off)

Is the cash/check discount always offered, or only on certain jobs?

**E4.** The proposal currently has one price (one option). If we move to Good/Better/Best, do you want the customer to see all three options on the same document, or receive three separate proposals?

**E5.** Who currently writes/reviews the proposal before it goes to the customer — is it always Crickett, always Clint, or does it vary?

---

## F. The Work Order / Contract

**F1.** The CONTRACT sheet generates a work order with a lien waiver for the **installer/subcontractor**, not the customer. Is the work order always sent to the installer, or only for new construction jobs?

**F2.** After the customer signs the proposal, what happens next in your process? Does someone manually create the work order, or is that automatic?

**F3.** Should the software be able to generate and print/email the work order, or is that fine to keep doing manually?

---

## G. Installer / Subcontractor Management

**G1.** You have 19 installers in the system, but only 5 of them (Angel, Antonio, Jeremy, JR, Vic Soun) have large active PR sheets (1,000+ rows). Are the others still active, or are some former installers?

**G2.** The PR Sheets track jobs billed from each installer to Lucks Air & Heat. Should the software replace this, or is this accounting/payroll tracked separately (e.g., in QuickBooks)?

**G3.** When a job is assigned to an installer, who makes that assignment — the office, or does the installer pick up the job?

**G4.** The sub rate for a complete system retrofit is $900. Is this truly flat, or does the installer get more for:
- Bigger tonnage systems?
- Attic/tight access jobs?
- Jobs with ductwork?
- New construction vs. retrofit?

---

## H. Job Tracking and Workflow

**H1.** What is the full lifecycle of a job from your perspective? For example:
1. Customer calls
2. Technician visits
3. Proposal created
4. Customer approves
5. Job scheduled
6. Installer completes work
7. Invoice sent / payment collected
8. Permit pulled and passed

Is this roughly correct? Are there steps we're missing?

**H2.** Right now the JOB # LOG is essentially your master database — every job goes in there. Should the software maintain a similar job log (a list of all jobs with status, price, installer, date)? Or is the software just for creating proposals and you'll continue tracking in Excel?

**H3.** Do you ever have jobs where the customer doesn't accept the proposal? Do you track those?

**H4.** Do jobs ever get revised after the initial proposal — e.g., customer wants to add ductwork after seeing the proposal? How is that handled currently?

---

## I. Multi-System Jobs

**I1.** The ESTIMATE SHEET has a "System 1" column header, suggesting it supports multiple systems. How common are jobs with 2+ systems? (e.g., a house with one upstairs unit and one downstairs unit replaced at the same time)

**I2.** When you have a two-system job, does the customer get one combined proposal, or separate proposals per system?

---

## J. Logo, Branding, and Final Details

**J1.** Can you provide the Lucks Air & Heat logo as a PNG or SVG file? It currently shows as `[ Company Logo ]` on all proposals.

**J2.** The current proposal has Clint Teelucksingh as the Authorized Agent. Should all proposals show Clint, or does it depend on who created the proposal?

**J3.** The proposal shows a hardcoded State & Zip prefix of "TX 77" — is all your work in 77xxx zip codes, or do you occasionally work outside that range?

**J4.** Are there any standard add-ons or upgrades you commonly upsell that aren't currently in the proposal template? (e.g., UV lights, surge protectors, smart thermostats, extended warranties)

**J5.** Is the 30-day price validity period (stated in the proposal terms) correct, or would you like a different number?
