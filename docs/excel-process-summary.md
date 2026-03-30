# Excel Process & Estimation Summary

**Company:** Lucks Air & Heat, LLC
**Location:** PO Box 1316, Cypress, TX 77410
**License:** TACLA29424E
**Contact:** Crickett Teelucksingh — crickett@lucksairandheat.com | 832.653.5807
**Owner / Authorized Agent:** Clint Teelucksingh

---

## 1. Excel Workbook Structure

The company runs its entire estimation, proposal, and subcontractor payment process through a single Excel workbook: **`1 - RETRO ESTIMATING SHEET.xlsx`** containing **37 sheets**.

### Sheet inventory

| # | Sheet Name | Purpose | Size |
|---|---|---|---|
| 1-8 | `XXXX`, `XXX0`-`XXX6` | Placeholder / blank tabs (1 cell each) | Minimal |
| 9 | **JOB # LOG** | Master job registry — every job since 2016 | 6,911 rows x 13 cols |
| 10 | **PERMIT LOG** | Permit tracking per job (valuation, tonnage, permit #, inspection status) | 6,078 rows x 12 cols |
| 11 | **ESTIMATE # LOG** | Pre-built estimate templates with model #s by brand/tonnage/config | 537 rows x 10 cols |
| 12 | **EQUIPMENT PRICING** | Dealer cost catalog for all equipment (by brand) | 321 rows x 17 cols |
| 13 | **PULLSHEET** | Material pick list for the warehouse — auto-populates from estimate # | 156 rows x 14 cols |
| 14 | **PRICING WORKSHEET** | Full bill of materials with qty, unit cost, and extended cost | 398 rows x 16 cols |
| 15 | **ESTIMATE SHEET** | Internal cost rollup — totals, markup, tax, margin analysis | 48 rows x 8 cols |
| 16 | **PROPOSAL** | Customer-facing proposal document | 116 rows x 9 cols |
| 17 | **CONTRACT** | Work order with lien waiver and completion certificate | 83 rows x 12 cols |
| 18-36 | **[NAME] PR SHEET** (x19) | Per-installer invoice/payment tracking sheets | ~48-1,271 rows x 5 cols |
| 37 | **RETRO PRICE SHEET** | Subcontractor rate card for installers | ~40 rows |

### Sheet categories

- **Data entry:** JOB # LOG (primary input), PULLSHEET (material quantities)
- **Lookup tables:** EQUIPMENT PRICING, ESTIMATE # LOG, RETRO PRICE SHEET
- **Calculated outputs:** PRICING WORKSHEET, ESTIMATE SHEET, PROPOSAL, CONTRACT
- **Accounting:** PR SHEETS (one per installer)

---

## 2. The Estimation Workflow

The process from job entry to customer proposal follows this path:

```
Step 1: Enter job in JOB # LOG
           |
Step 2: Select estimate # from ESTIMATE # LOG
           |
Step 3: PULLSHEET auto-populates equipment model #s
           |
Step 4: Enter material quantities on PULLSHEET
           |
Step 5: PRICING WORKSHEET calculates material costs via VLOOKUP
           |
Step 6: ESTIMATE SHEET rolls up all costs + applies markup
           |
Step 7: PROPOSAL auto-fills customer-facing document
           |
Step 8: CONTRACT generates work order for installer
```

### Step-by-step detail

**Step 1 — JOB # LOG entry.** A new row is added with:

| Column | Field |
|---|---|
| A | Job # (sequential, e.g., `2016001`) |
| B | Address |
| C | Subdivision |
| D | Work Performed (description) |
| E | Builder / Homeowner name |
| F | City |
| G | Date |
| H | Amount For Installer (labor paid to sub) |
| I | Price For Builder / HO (sale price to customer) |
| J | Installer name |

**Step 2 — Estimate # selection.** The ESTIMATE # LOG contains pre-built templates keyed by a code like `L15.25.0SHG` (Lennox, 15.2 SEER2, 5.0 ton, Single-stage, Horizontal, Gas). Each entry includes:
- Work description text
- Installer payment amount
- Furnace, evaporator coil, condenser, and TXV model numbers

**Step 3 — PULLSHEET auto-population.** When the estimate # is entered, VLOOKUP formulas pull the correct equipment model numbers from the ESTIMATE # LOG into the PULLSHEET.

**Step 4 — Quantity entry.** The estimator manually enters quantities for all materials needed (flex duct lengths, fittings, drain pans, thermostats, etc.) on the PULLSHEET. The PULLSHEET also serves as the warehouse pick list.

**Step 5 — PRICING WORKSHEET calculation.** The PRICING WORKSHEET pulls model numbers from the PULLSHEET and quantities, then uses VLOOKUP against EQUIPMENT PRICING to get unit costs. Each line: `TOTAL COST = QTY * COST EACH`.

**Step 6 — ESTIMATE SHEET rollup.** Pulls subtotals from PRICING WORKSHEET sections, adds labor (from JOB # LOG), permits (from PERMIT LOG), and applies the pricing formula (see Section 4).

**Step 7 — PROPOSAL generation.** Customer info, model numbers, and pricing auto-fill into a formatted proposal document.

**Step 8 — CONTRACT.** Work order with lien waiver generates from job data for the installer to sign.

---

## 3. The VLOOKUP Chain

Data flows between sheets through a chain of VLOOKUP formulas. The **Job #** and **Estimate #** are the two primary keys that drive the entire workbook.

### Flow diagram

```
JOB # LOG                    ESTIMATE # LOG               EQUIPMENT PRICING
(Job #, address,        -->  (Estimate #, model #s,   --> (Model # -> dealer cost)
 customer, installer,        work description,
 price, labor amount)        installer rate)
     |                            |                            |
     v                            v                            v
PERMIT LOG              --> PULLSHEET                  --> PRICING WORKSHEET
(Job # -> permit amt)       (Estimate # -> model #s       (Model # from PULLSHEET
                             + manual quantities)           -> cost from EQUIP PRICING
                                                            -> extended cost)
                                                               |
                                                               v
                                                         ESTIMATE SHEET
                                                         (Subtotals from PRICING WS
                                                          + labor from JOB # LOG
                                                          + permits from PERMIT LOG
                                                          -> markup -> final price)
                                                               |
                                                               v
                                                          PROPOSAL
                                                          (Job # -> customer info
                                                           from JOB # LOG
                                                           + model #s from PULLSHEET
                                                           + price from JOB # LOG)
                                                               |
                                                               v
                                                          CONTRACT
                                                          (Job # -> work order)
```

### Key VLOOKUP formulas

**PULLSHEET** (pulls equipment models from ESTIMATE # LOG):
```
B10 (Gas Furnace)  = VLOOKUP(A2, 'ESTIMATE # LOG'!1:1048576, 7, FALSE)
B25 (Coil)         = VLOOKUP(A2, 'ESTIMATE # LOG'!1:1048576, 8, FALSE)
B121 (Condenser)   = VLOOKUP(A2, 'ESTIMATE # LOG'!1:1048576, 9, FALSE)
```

**PULLSHEET** (pulls job info from JOB # LOG):
```
B4 (Customer)    = VLOOKUP(F4, 'JOB # LOG'!1:1048576, 5, FALSE)
K4 (Address)     = VLOOKUP(F4, 'JOB # LOG'!A:J, 2, FALSE)
J2 (Installer)   = VLOOKUP(F4, 'JOB # LOG'!A:J, 10, FALSE)
```

**PRICING WORKSHEET** (pulls model #s from PULLSHEET, costs from EQUIPMENT PRICING):
```
B12 (Gas Furnace model)   = +PULLSHEET!B10
D12 (Gas Furnace cost)    = VLOOKUP(B12, 'EQUIPMENT PRICING'!A:B, 2, FALSE)
E12 (Extended cost)       = C12 * D12

B17 (Elec Furnace model)  = PULLSHEET!B15
D17 (Elec Furnace cost)   = VLOOKUP(B17, 'EQUIPMENT PRICING'!D:E, 2, FALSE)

B22 (Heat Strip model)    = +PULLSHEET!B20
D22 (Heat Strip cost)     = VLOOKUP(B22, 'EQUIPMENT PRICING'!G:H, 2, FALSE)

B27 (Coil model)          = +PULLSHEET!B25
D27 (Coil cost)           = VLOOKUP(B27, 'EQUIPMENT PRICING'!J:K, 2, FALSE)

B32 (Condenser model)     = +PULLSHEET!B29
D32 (Condenser cost)      = VLOOKUP(B32, 'EQUIPMENT PRICING'!M:N, 2, FALSE)
```

**Note:** EQUIPMENT PRICING uses separate column pairs for each equipment category (A:B for gas furnaces, D:E for electric furnaces, G:H for heat strips, J:K for coils, M:N for condensers). The VLOOKUP targets the correct pair.

**ESTIMATE SHEET** (pulls from multiple sheets):
```
E3 (Customer)     = VLOOKUP(E2, 'JOB # LOG'!A:J, 5, FALSE)
B7 (Labor)        = VLOOKUP(E2, 'JOB # LOG'!A:J, 8, FALSE)
B9 (Permits)      = VLOOKUP(E2, 'PERMIT LOG'!A:H, 7, FALSE)
E37 (Sale Price)  = VLOOKUP(E2, 'JOB # LOG'!A:J, 9, FALSE)
```

**PROPOSAL** (pulls from JOB # LOG and PULLSHEET):
```
D13 (Submitted To)    = VLOOKUP(A1, 'JOB # LOG'!A:J, 5, FALSE)
D15 (Address)         = VLOOKUP(A1, 'JOB # LOG'!A:J, 2, FALSE)
H32 (Total Price)     = VLOOKUP($A$1, 'JOB # LOG'!1:1048576, 9, FALSE)
D24 (Furnace Model)   = PULLSHEET!B10
F24 (Coil Model)      = PULLSHEET!B25
H24 (Condenser Model) = PULLSHEET!B121
```

---

## 4. Pricing Formula Breakdown

The ESTIMATE SHEET calculates the final customer price through the following formula chain. All formulas reference cell addresses in the ESTIMATE SHEET unless noted.

### Cost rollup (rows 7-35)

| Row | Item | Source |
|---|---|---|
| B7 | Labor | `VLOOKUP(Job#, 'JOB # LOG', col 8)` — installer payment amount |
| B8 | Engineering | Hardcoded: `0` (with `545.71` in C8 — purpose unclear) |
| B9 | Permits | `VLOOKUP(Job#, 'PERMIT LOG', col 7)` |
| B10 | Transition | `='PRICING WORKSHEET'!F42` |
| B11 | Plenum | `='PRICING WORKSHEET'!F50` |
| B12 | R/A Can | `='PRICING WORKSHEET'!F55` |
| B13 | Media Filter | `='PRICING WORKSHEET'!F62` |
| B14 | Fresh Air | `='PRICING WORKSHEET'!F72` |
| B15 | Bath Fans | `='PRICING WORKSHEET'!F306` |
| B16 | Flue Pipe | `='PRICING WORKSHEET'!F83` |
| B17 | Roof Jacks | `='PRICING WORKSHEET'!F90` |
| B18 | Copper | `='PRICING WORKSHEET'!F95` |
| B19 | Copper Fittings | `='PRICING WORKSHEET'!F347` |
| B20 | Armaflex | `='PRICING WORKSHEET'!F101 + 'PRICING WORKSHEET'!F97` |
| B21 | Drain Pan | `='PRICING WORKSHEET'!F105` |
| B22 | Flex | `='PRICING WORKSHEET'!F118` |
| B23 | Boxes | `='PRICING WORKSHEET'!F128` |
| B24 | Wyes | `='PRICING WORKSHEET'!F146` |
| B25 | Collars | `='PRICING WORKSHEET'!F160` |
| B26 | Sleeves | `='PRICING WORKSHEET'!F173` |
| B27 | Hardpipe & Ells | `=SUM('PRICING WORKSHEET'!F180:F190)` |
| B28 | PVC & Fittings | `='PRICING WORKSHEET'!F207` |
| B29 | Bypass & Dampers | `='PRICING WORKSHEET'!F218` |
| B30 | Reducers | `='PRICING WORKSHEET'!F312` |
| B31 | Grilles & Filters | `=SUM(F255, F263, F272, F279, F288+F294)` (from PRICING WS) |
| B32 | Thermostats | `='PRICING WORKSHEET'!F338` |
| B33 | Slabs | `='PRICING WORKSHEET'!F361` |
| B34 | Miscellaneous | `=SUM(F243, F318, F376, F357, F382, F395) + 150` (from PRICING WS) |
| B35 | Warranty | Hardcoded: `150` |

### Pricing formula (rows 36-48)

```
B37  TOTAL               = SUM(B7:B35)
                           (all costs: labor + permits + all materials + warranty)

B38  Taxable Amount       = SUM(B10:B34) * 1.05
                           (materials only, excluding labor/permits/warranty, +5%)

B39  Equipment            = 'PRICING WORKSHEET'!$F$36 * 1.1
                           (total equipment cost from pricing worksheet + 10% markup)

B40  Labor & Material     = SUM(B7:B9, B35, B38)
                           (labor + engineering + permits + warranty + taxable amount)

B41  Sub Total            = SUM(B39:B40)
                           (equipment + labor & material)

B42  45% Mark-Up          = B41 / 0.55
                           (dividing by 0.55 yields a 45% gross margin,
                            i.e., cost is 55% of retail)

B43  Tax                  = (B38 + B39) * 8.25%
                           (Texas sales tax on taxable materials + equipment)

B44  Incentive            = E37 * 0.04
                           (4% of the final sale price — likely a sales commission
                            or referral incentive)

B45  SUGGESTED RETAIL     = B42 + B43 + B44 + (E37 * 0.1)
     PRICE                 (marked-up subtotal + tax + incentive + 10% of sale price)

E37  FINAL SALE PRICE     = VLOOKUP(Job#, 'JOB # LOG', col 9)
                           (the actual price charged to the customer, manually
                            entered in JOB # LOG)

B46  Gross Margin         = E37 - B41 - B43 - B44
                           (sale price minus costs minus tax minus incentive)

B47  20% O/H              = B45 * 0.2
                           (20% overhead allocation on suggested retail)

B48  Net Profit           = E37 - B41 - B43 - B44 - B47
                           (gross margin minus overhead)
```

### Key observations about the pricing model

1. **The 45% markup** is the core margin target: `cost / 0.55` means cost should be 55% of price, yielding a 45% gross margin.
2. **Equipment gets a separate 10% markup** before being added to the subtotal.
3. **Taxable amount adds 5%** to materials (B10:B34) — this appears to be a materials handling/waste factor, not sales tax.
4. **Sales tax is 8.25%** (Texas rate) applied to taxable materials + equipment.
5. **The final sale price (E37) is manually set** in JOB # LOG — the suggested retail price (B45) is a reference/target, but the actual price can differ.
6. **Cash/check discount:** The proposal offers a 5% discount for cash/check payment (`H33 = H32 * 0.95`).

---

## 5. Equipment Pricing Catalog

The **EQUIPMENT PRICING** sheet (321 rows) serves as the dealer cost lookup table. Equipment is organized by **brand**, then by **category**.

### Brands carried

| Brand | Row range | Items | Notes |
|---|---|---|---|
| **Amana** (Standard Supply) | Rows 3-99 | 207 | Largest catalog — budget/mid/premium tiers |
| **Carrier** | Rows 101-111 | 23 | Limited lineup |
| **Goodman** | Rows 113-204 | 195 | Budget brand — shares some coil model #s with Amana at different prices |
| **Lennox** | Rows 206-245 | 120 | Full lineup: ML180 (80%), ML196/ML296 (96%), SLP99 (99%) furnaces; ML14/ML17/SL25 condensers |
| **Trane** | Rows 247-321 | 70 | Full lineup: S8B1/S8X1/S8V2/S9V2 furnaces; 4TTR4/5TTR5/5TTR7/4TTX/5TTV condensers |

### Equipment categories (per brand)

Each brand section has 5 paired columns:

| Columns | Category | VLOOKUP target |
|---|---|---|
| A:B | Gas Furnaces | `VLOOKUP(model, A:B, 2)` |
| D:E | Electric Furnaces | `VLOOKUP(model, D:E, 2)` |
| G:H | Heat Strips / TXVs | `VLOOKUP(model, G:H, 2)` |
| J:K | Evaporator Coils | `VLOOKUP(model, J:K, 2)` |
| M:N | Condensers | `VLOOKUP(model, M:N, 2)` |

### Sample pricing (Amana)

| Equipment | Model | Dealer Cost |
|---|---|---|
| Gas Furnace (80% single-stage) | ACES800403AN | $499.10 |
| Gas Furnace (96% single-stage) | ACES960403BN | $1,121.40 |
| Gas Furnace (96% variable) | AMVM970603BN | $1,468.74 |
| Electric Furnace | ARUF25B14 | $450.72 |
| Heat Strip (5kW) | HKSC05XC | $55.44 |
| Heat Strip (20kW) | HKSC20DB | $135.36 |
| TXV | TX2N4A | $58.00 |
| Evaporator Coil | ARUF25B14 | $450.72 |
| Condenser (14 SEER, 1.5 ton) | ASX140181 | $883.14 |
| Condenser (16 SEER, 1.5 ton) | ASX160181 | $979.44 |
| Condenser (20 SEER, 6 ton) | AVZC200601 | $5,534.10 |

### Sample pricing (Carrier)

| Equipment | Model | Dealer Cost |
|---|---|---|
| Gas Furnace (basic) | 58STA045---1--12 | $389.00 |
| Gas Furnace (mid) | 58PHB045---1--12 | $501.00 |
| Evaporator Coil | CNPHP2417ALA | $255.00 |
| Condenser (16 SEER) | CA16NA01800G | $772.00 |

### Sample pricing (Goodman)

| Equipment | Model | Dealer Cost |
|---|---|---|
| Gas Furnace (80% single) | GMES800403AN | $407.00 |
| Gas Furnace (96% single) | GMES960403AN | $889.00 |
| Gas Furnace (96% variable) | GCVC960804CN | $1,721.00 |
| Electric Furnace | ACNF300516 | $413.00 |
| Electric Furnace (air handler) | AWUF180316 | $343.00 |

---

## 6. Materials Pricing (PRICING WORKSHEET)

The PRICING WORKSHEET (398 rows) is the full bill of materials with item-level unit costs. Materials are grouped into sections, each with a subtotal row referenced by the ESTIMATE SHEET.

### Material categories

| Category | PRICING WS Rows | ESTIMATE SHEET Cell | Items include |
|---|---|---|---|
| Gas Furnaces | 11-15 | (via F36 equip total) | Model #, qty, unit cost from EQUIPMENT PRICING |
| Electric Furnaces | 16-20 | (via F36) | Same structure |
| Heat Strips | 21-25 | (via F36) | Same structure |
| Coils | 26-30 | (via F36) | Same structure |
| Condensers | 31-35 | (via F36) | Same structure |
| **F36 = Equipment Subtotal** | 36 | B39 (x1.1) | Sum of all equipment |
| Transitions | 37-41 | B10 (F42) | Sheet metal transitions |
| Horizontal Plenum | 43-49 | B11 (F50) | 11x17x36P ($21.25), 11x20x36P ($21.30), 11x23x48 ($25), 16x20x48 |
| R/A Can | 51-54 | B12 (F55) | Return air cans |
| Media Filter | 56-61 | B13 (F62) | Filtration systems |
| Fresh Air | 63-71 | B14 (F72) | Fresh air intakes |
| Flue Pipe | 73-82 | B16 (F83) | 4" flashing ($4.73), 4" cap ($6.29), 4" collar ($1.28) |
| Roof Jacks | 84-89 | B17 (F90) | 2" ($2.12) through 8" ($16.95) |
| Copper | 90-94 | B18 (F95) | 1-1/8" ($4.68/ft), 7/8" ($3.20/ft), 3/4" ($2.12/ft), 3/8" ($0.89/ft) |
| Armaflex (1/2") | 95-96 | B20 (F101+F97) | Insulation for copper lines |
| Armaflex (1") | 97-100 | B20 | 1-1/8"x1" ($0.79/ft), 7/8"x1" ($0.81/ft), 3/4"x1" ($0.73/ft) |
| Drain Pans | 101-104 | B21 (F105) | 18x44 ($40), 32x36 ($24), 32x70 ($52) |
| Flex Duct (R-8) | 105-117 | B22 (F118) | 4" ($1.38/ft) through 20" — also R-6 option |
| Outlet Boxes | 119-127 | B23 (F128) | 8x4x0, 8x4x4, 10x8x0 through 10x8x9 |
| Wyes | 128-145 | B24 (F146) | Duct wyes |
| Collars | 147-159 | B25 (F160) | Start collars by size |
| Sleeves | 160-172 | B26 (F173) | Wall sleeves |
| Hardpipe & Ells | 173-190 | B27 (SUM F180:F190) | Rigid duct pipe and 90-degree elbows |
| PVC & Fittings | 191-206 | B28 (F207) | 2" PVC pipe ($2.25/ft), 90s, 45s, couplings, 3" concentric kit ($49.88) |
| Dampers & Bypass | 208-217 | B29 (F218) | Auto dampers ($76-90), bypass dampers ($57-68) |
| Misc Supplies | 219-242 | B34 (partial) | Ductboard ($46), mastic ($9.90), foil tape ($14.55), nylon strap ($3.62), etc. |
| Supply Grilles | 243-294 | B31 (combined) | Metal supply grilles, return air grilles, filters |
| Bath Fans | 295-305 | B15 (F306) | Bath exhaust fans |
| Reducers | 306-311 | B30 (F312) | Duct reducers |
| Electrical | 313-317 | B34 (partial) | Wire, disconnects |
| Thermostats | 318-337 | B32 (F338) | Various models (Honeywell, Trane, Nexia) |
| Copper Fittings | 338-346 | B19 (F347) | Couplings, 90-degree bends |
| Slabs | 347-360 | B33 (F361) | Equipment pads (Ultralite 36x36, 40x40) |
| Gas Piping | 361-375 | B34 (partial) | Gas pipe and fittings |
| Heater Stands | 376-381 | B34 (partial) | Equipment stands |
| Misc Electrical | 382-394 | B34 (partial) | Additional electrical supplies |

### How material costs flow

Each section in PRICING WORKSHEET follows the same pattern:
```
Column A: Item description
Column B: Part # (pulled from PULLSHEET via =+PULLSHEET!B__)
Column C: Quantity (pulled from PULLSHEET via =PULLSHEET!C__)
Column D: Cost Each (VLOOKUP against EQUIPMENT PRICING, or hardcoded unit price)
Column E: Total Cost (= C * D)
Column F: Section subtotal row (SUM of column E for that section)
```

The F column subtotals are what the ESTIMATE SHEET references.

---

## 7. Subcontractor Pricing (RETRO PRICE SHEET)

The RETRO PRICE SHEET is the rate card for subcontracted installers. Lucks Air & Heat uses independent contractor installers, not W-2 employees.

### Retrofit rates

| Work Item | Price |
|---|---|
| Complete System - Retrofit (with plenum, drain pan, media filters, etc.) | $900 |
| Furnace - Warranty | $250 |
| Furnace - COD | $350 |
| Evaporator Coil - Warranty | $200 |
| Evaporator Coil - COD | $250 |
| Compressor - Warranty | $200 |
| Compressor - COD | $250 |
| Condenser - Warranty | $100 |
| Condenser - COD | $200 |
| TXV - Warranty (Sweat-In) | $150 |
| TXV - COD (Sweat-In) | $200 |
| TXV - Warranty (Non-Sweat-In) | $100 |
| TXV - COD (Non-Sweat-In) | $125 |
| Ductwork (Per Run) | $50 |
| Plenum | $50 |
| Dehumidifier | $300 |
| Media Filtration System | $100 |

### New Construction / Mini-Split rates

| Work Item | Price |
|---|---|
| Condenser | $100 |
| Indoor Head (each) | $150 |
| Copper & drain lines | $150 |

### Key notes
- **Warranty vs. COD:** Warranty jobs pay less because the parts are covered. COD (Cash On Delivery) jobs pay more because the installer takes on more coordination.
- **Complete system retrofit at $900** is the standard rate for a full system replacement.
- The installer amount is also stored in JOB # LOG column H and flows into the ESTIMATE SHEET as the Labor line (B7).

---

## 8. PR (Pay Rate) Sheets

There are **19 individual PR sheets**, one per installer/subcontractor:

| Installer | Sheet Name | Size |
|---|---|---|
| Angel Monge | ANGEL PR SHEET | 1,271 rows |
| Antonio | ANTONIO PR SHEET | 1,271 rows |
| Gustavo | GUSTAVO PR SHEET | 49 rows |
| Juan | JUAN PR SHEET | 49 rows |
| Luis | LUIS PR SHEET | 49 rows |
| Francisco S | FRANCISCO S PR SHEET | 48 rows |
| Frank | FRANK PR SHEET | 48 rows |
| Jeremy | JEREMY PR SHEET | 1,269 rows |
| Jose C | JOSE C PR SHEET | 48 rows |
| JR | JR PR SHEET | 1,270 rows |
| David | DAVID PR SHEET | 48 rows |
| Francisco | FRANCISCO PR SHEET | 48 rows |
| Juan Larios | JUAN LARIOS PR SHEET | 48 rows |
| Marcos | MARCOS PR SHEET | 48 rows |
| Octavio | OCTAVIO PR SHEET | 48 rows |
| Oscar | OSCAR PR SHEET | 48 rows |
| Pedro | PEDRO PR SHEET | 48 rows |
| Roberto | ROBERTO PR SHEET | 48 rows |
| Vic Soun | VIC SOUN PR SHEET | 1,270 rows |

### PR Sheet structure

Each sheet is formatted as an invoice from the installer to Lucks Air & Heat:

| Column | Content |
|---|---|
| A | Date |
| B | Job # |
| C | Customer |
| D | Address |
| E | Amount |

Header includes installer's name, address, phone, invoice date, and invoice #. The sheet functions as both an invoice tracker and payment ledger.

The larger sheets (Angel, Antonio, Jeremy, JR, Vic Soun with 1,200+ rows) indicate the most active installers.

---

## 9. Proposal Output

The **PROPOSAL** sheet generates a customer-facing document with Lucks Air & Heat branding.

### Header
- Company info: PO Box 1316, Cypress, TX 77410
- Office: 832.653.5807 | Fax: 832.334.5312
- Email: crickett@lucksairandheat.com
- License: TACLA29424E

### Customer information (auto-filled via VLOOKUP from JOB # LOG)
- Submitted To (customer name)
- Company/Builder name
- Address, City
- State & Zip (hardcoded prefix: "TX 77")
- Fax/Email, Telephone
- Date (`=NOW()`)

### Scope of work (partially templated, partially manual)
Standard boilerplate lines:
1. Remove existing equipment & provide proper disposal as necessary
2. Install [tonnage] [brand] [SEER] [refrigerant] [stage] condenser & AHRI matched [AFUE]% gas furnace with [blower type] & [coil type] evaporator coil
3. Model numbers (auto-filled from PULLSHEET): Furnace, Evaporator Coil, Condenser
4. Install new drain pan with float switch, plenum, flue pipe, heater stands, copper lines & drain lines
5. Start & monitor system with new Honeywell Pro TH8321WF1001 wi-fi capable thermostat
6. Install all new R-8 flex ductwork where accessible
7. Install metal supply grills & metal return air grills
8. Install (1) Honeywell F-100 media filtration system

### Pricing section
```
Total:                        [from JOB # LOG col 9]
Cash/Check Discount Total:    [Total * 0.95]
```

### Inclusions
- City of Houston permits
- 20 year part warranty on heat exchanger; 10 year part warranty on evaporator coil, compressor, condenser coil and all other functional parts (upon registration within 60 days)
- Associated labor, supervision and equipment for complete scope of work

### Terms and conditions
1. Price firm for 30 calendar days
2. Payment: 60% due upon completion of Rough; 40% due upon completion of Set
3. One year labor warranty
4. Regulated by Texas Department of Licensing and Regulation

### Signature
- Authorized Agent: Clint Teelucksingh
- Customer signature line with instruction to sign and email back to Crickett

---

## 10. Contract / Work Order

The **CONTRACT** sheet generates a legal work order with lien waiver, issued to the subcontractor installer.

### Structure

**Section 1 — Work Order (with Lien Waiver)**
- References the Independent Contractor Agreement between Lucks Air & Heat, LLC and the contractor
- General description of work (from JOB # LOG)
- Owner/Builder name, Subdivision, Job Address
- Job #, Start Date
- Payment terms: due upon completion, single payment
- Lien waiver language: contractor waives liens against the property
- Indemnification clause

**Section 2 — Work Completion Certificate and Warranty**
- Contractor certifies work is complete
- Releases liens
- Provides warranty against defects in labor and materials

**Signatures:**
- Lucks Air & Heat by: Crickett Teelucksingh (print date auto-filled)
- Contractor signature with job date

### Data sources
- Contractor name: VLOOKUP from JOB # LOG
- Job address, description, owner: VLOOKUP from JOB # LOG
- Payment amount: VLOOKUP from JOB # LOG

---

## 11. Gaps and Questions for Client

### Must resolve before Phase 2

1. **Tier strategy:** The current Excel produces a single proposal (one price point). Our software generates three tiers (Good/Better/Best). How should the tiers be differentiated?
   - **Option A (brand-based):** Good = Goodman, Better = Carrier/Amana, Best = Lennox/Trane
   - **Option B (efficiency-based):** All same brand, tiered by SEER2 rating
   - **Need client decision.**

2. **Lennox and Trane pricing:** These brands appear in ESTIMATE # LOG (model numbers and installer rates) but their dealer costs are NOT in the EQUIPMENT PRICING sheet. Are they sourced from a different spreadsheet or pricing system?

3. **The scope description on the proposal** (row 21-22) appears to be manually written text, not formula-driven. Is there a standard template per system type, or is this free-form?

4. **Engineering cost (B8):** The ESTIMATE SHEET shows Engineering = $0 in B8, but $545.71 in C8. What is this value and when is it used?

5. **The `E37 * 0.1` term in the Suggested Retail Price formula** — is this a 10% margin buffer, commission, or something else?

6. **Incentive at 4% of sale price** — is this a sales commission, referral fee, or builder incentive? Does it apply to all jobs or only certain ones?

7. **The 5% factor on taxable materials** (`B38 = SUM(B10:B34) * 1.05`) — is this a waste/handling factor or something else?

8. **Warranty line item** is hardcoded at $150. Is this always $150 or does it vary?

9. **Miscellaneous** includes a hardcoded $150 added to the material sum. What does this cover?

### Nice to clarify

10. **PERMIT LOG:** Permit costs vary significantly ($111-$250+ based on sample data). Is there a formula for permit costs, or are they entered manually after contacting the city?

11. **ESTIMATE # LOG codes:** The naming convention (e.g., `L15.25.0SHG`) appears to encode brand, SEER, tonnage, stage, orientation, and fuel type. Can we get a key for all the code segments?

12. **PR Sheets:** Should the software include installer payment tracking, or is that handled separately (e.g., QuickBooks)?

13. **Multiple systems:** The ESTIMATE SHEET has "System 1" in B6, suggesting multi-system support. How are multi-system jobs currently handled?

14. **The 8 placeholder tabs** (XXXX, XXX0-XXX6) — are these used for anything, or can they be ignored?

15. **R-6 vs R-8 flex duct:** The PRICING WORKSHEET has both R-6 and R-8 flex duct pricing. When is R-6 used vs R-8?

16. **Customer communication:** Are proposals currently emailed as Excel-to-PDF, or printed and mailed? This affects how we design the PDF output.
