"use client";

import {
  DollarSign,
  Calculator,
  Layers,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  Shield,
  Thermometer,
  Wrench,
  Package,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/* ─── Pricing constants (mirror pricebook.json) ──────────────────────────── */

const CONSTANTS = {
  equipmentMarkup: 1.10,
  materialsBuffer: 1.05,
  markupDivisor: 0.55,
  taxRate: 0.0825,
  cashDiscount: 0.05,
  warranty: 150,
  miscFlat: 150,
  permitRate: 0.02,
  permitBaseFee: 79.45,
};

const LABOR_RATES: { service: string; key: string; rate: number }[] = [
  { service: "Complete Retrofit", key: "complete_retrofit", rate: 900 },
  { service: "Furnace Only (Warranty)", key: "furnace_only_warranty", rate: 250 },
  { service: "Furnace Only (COD)", key: "furnace_only_cod", rate: 350 },
  { service: "Coil Only (Warranty)", key: "coil_only_warranty", rate: 200 },
  { service: "Coil Only (COD)", key: "coil_only_cod", rate: 250 },
  { service: "Compressor (Warranty)", key: "compressor_warranty", rate: 200 },
  { service: "Compressor (COD)", key: "compressor_cod", rate: 250 },
  { service: "Condenser Only (Warranty)", key: "condenser_only_warranty", rate: 100 },
  { service: "Condenser Only (COD)", key: "condenser_only_cod", rate: 200 },
  { service: "TXV Warranty (Sweat)", key: "txv_warranty_sweat", rate: 150 },
];

const MATERIAL_BOM: { tons: string; standard: number; attic: number; tight: number; rooftop: number }[] = [
  { tons: "1.5", standard: 280, attic: 340, tight: 360, rooftop: 380 },
  { tons: "2.0", standard: 320, attic: 390, tight: 410, rooftop: 430 },
  { tons: "2.5", standard: 360, attic: 440, tight: 460, rooftop: 480 },
  { tons: "3.0", standard: 400, attic: 480, tight: 500, rooftop: 520 },
  { tons: "3.5", standard: 440, attic: 530, tight: 555, rooftop: 575 },
  { tons: "4.0", standard: 480, attic: 580, tight: 610, rooftop: 640 },
  { tons: "5.0", standard: 540, attic: 650, tight: 680, rooftop: 710 },
];

type TierEquipment = {
  tons: string;
  dealerCost: number;
  furnace: string;
  condenser: string;
};

const TIER_DATA: {
  tier: string;
  brand: string;
  seer: string;
  afue: string;
  color: string;
  borderColor: string;
  badgeClass: string;
  equipment: TierEquipment[];
}[] = [
  {
    tier: "Good",
    brand: "Goodman",
    seer: "15 SEER2",
    afue: "80% AFUE",
    color: "bg-emerald-50",
    borderColor: "border-emerald-200",
    badgeClass: "bg-emerald-100 text-emerald-800",
    equipment: [
      { tons: "1.5", dealerCost: 1616, furnace: "GMEC800403AN", condenser: "GLXS5BA1810A" },
      { tons: "2.0", dealerCost: 1694, furnace: "GMEC800603BN", condenser: "GLXS5BA2410A" },
      { tons: "2.5", dealerCost: 1865, furnace: "GMEC800804BN", condenser: "GLXS5BA3010A" },
      { tons: "3.0", dealerCost: 2295, furnace: "GMEC800804CN", condenser: "GLXS5BA3610A" },
      { tons: "3.5", dealerCost: 2338, furnace: "GMEC801005CN", condenser: "GLXS5BA4210A" },
      { tons: "4.0", dealerCost: 2475, furnace: "GMEC801005CN", condenser: "GLXS5BA4810A" },
      { tons: "5.0", dealerCost: 2739, furnace: "GMEC801205DN", condenser: "GLXS5BA6010A" },
    ],
  },
  {
    tier: "Better",
    brand: "Amana",
    seer: "16 SEER2",
    afue: "96% AFUE",
    color: "bg-blue-50",
    borderColor: "border-blue-200",
    badgeClass: "bg-blue-100 text-blue-800",
    equipment: [
      { tons: "1.5", dealerCost: 2551.56, furnace: "ACES960403BN", condenser: "ASX160181" },
      { tons: "2.0", dealerCost: 2649.84, furnace: "ACES960603BN", condenser: "ASX160241" },
      { tons: "2.5", dealerCost: 2961.68, furnace: "ACES960804CN", condenser: "ASX160311" },
      { tons: "3.0", dealerCost: 2969.07, furnace: "ACES960804CN", condenser: "ASX160361" },
      { tons: "3.5", dealerCost: 3468.09, furnace: "ACES961005CN", condenser: "ASX160421" },
      { tons: "4.0", dealerCost: 3635.55, furnace: "ACES961005CN", condenser: "ASX160481" },
      { tons: "5.0", dealerCost: 4100.15, furnace: "ACES961205DN", condenser: "ASX160601" },
    ],
  },
  {
    tier: "Best",
    brand: "Trane",
    seer: "20+ SEER",
    afue: "96% AFUE",
    color: "bg-amber-50",
    borderColor: "border-amber-200",
    badgeClass: "bg-amber-100 text-amber-800",
    equipment: [
      { tons: "2.0", dealerCost: 8009, furnace: "S9V2B060U4VSB", condenser: "5TTV0X24A1000" },
      { tons: "3.0", dealerCost: 8209, furnace: "S9V2C080U5VSB", condenser: "5TTV0X36A1000" },
      { tons: "4.0", dealerCost: 11605, furnace: "S9V2C100U5VSB", condenser: "5TTV0X48A1000" },
      { tons: "5.0", dealerCost: 12258, furnace: "S9V2C100U5VSB", condenser: "5TTV0X60A1000" },
    ],
  },
];

const SURCHARGES: { type: string; good: number; better: number; best: number }[] = [
  { type: "Heat Pump", good: 400, better: 500, best: 700 },
  { type: "Package Unit", good: 250, better: 350, best: 500 },
];

const FORMULA_STEPS: { step: number; label: string; formula: string; excelRef: string; description: string }[] = [
  { step: 1, label: "Equipment Cost", formula: "dealer_cost x 1.10", excelRef: "B39", description: "Dealer price from EQUIPMENT PRICING sheet with 10% markup for handling and overhead." },
  { step: 2, label: "Taxable Materials", formula: "materials x 1.05", excelRef: "B38", description: "Default BOM by tonnage and access difficulty, with 5% waste/handling buffer." },
  { step: 3, label: "Labor", formula: "Varies by service type", excelRef: "B7", description: "Subcontractor rate from RETRO PRICE SHEET. $900 for a complete system retrofit." },
  { step: 4, label: "Permit", formula: "(equipment_cost x 2%) + $79.45", excelRef: "B9", description: "City of Houston permit formula: 2% of equipment valuation plus base filing fee." },
  { step: 5, label: "Fixed Costs", formula: "Warranty $150 + Misc $150", excelRef: "B34-B35", description: "Flat warranty registration fee and miscellaneous job supplies." },
  { step: 6, label: "Labor + Materials", formula: "labor + permit + warranty + taxable_materials + misc + adders", excelRef: "B40", description: "Sum of all non-equipment line items." },
  { step: 7, label: "Sub Total", formula: "equipment_cost + labor_and_materials", excelRef: "B41", description: "Total cost to deliver the job (before margin)." },
  { step: 8, label: "Retail Price", formula: "sub_total / 0.55", excelRef: "B42", description: "Dividing by 0.55 achieves a 45% gross margin target. This is the standard HVAC industry approach." },
  { step: 9, label: "Sales Tax", formula: "(taxable_materials + equipment_cost) x 8.25%", excelRef: "B43", description: "Texas state + local sales tax on taxable goods. Labor is not taxed." },
  { step: 10, label: "Suggested Price", formula: "retail_price + tax", excelRef: "B42+B43", description: "Final suggested price presented to the customer. Admin can override." },
];

/* ─── Helper ─────────────────────────────────────────────────────────────── */

function fmt(n: number): string {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmt2(n: number): string {
  return "$" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function SectionHeading({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3 mb-6">
      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100 text-green-700 shrink-0 mt-0.5">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function CalloutBox({ type, children }: { type: "warning" | "info" | "success"; children: React.ReactNode }) {
  const styles = {
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
    success: "bg-green-50 border-green-200 text-green-800",
  };
  const icons = {
    warning: AlertTriangle,
    info: HelpCircle,
    success: CheckCircle,
  };
  const IconComponent = icons[type];

  return (
    <div className={`flex gap-3 rounded-lg border p-4 text-sm ${styles[type]}`}>
      <IconComponent className="h-5 w-5 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */

export default function PricingPage() {
  return (
    <div className="space-y-10 max-w-6xl">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pricing Engine</h1>
        <p className="text-gray-500 mt-1">
          How proposals are priced, from dealer cost to customer quote. All formulas replicate the Excel ESTIMATE SHEET.
        </p>
      </div>

      {/* ── Section 1: Formula Chain ─────────────────────────────────────── */}
      <section>
        <SectionHeading
          icon={Calculator}
          title="How Pricing Works"
          subtitle="The 10-step formula chain from the Excel workbook, implemented in pricing_engine.py"
        />

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 w-12">#</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 w-44">Step</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 w-72">Formula</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 w-20">Excel</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {FORMULA_STEPS.map((s, i) => (
                    <tr key={s.step} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{s.step}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{s.label}</td>
                      <td className="px-4 py-3 font-mono text-xs text-green-700 bg-green-50/50 rounded">
                        {s.formula}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">{s.excelRef}</td>
                      <td className="px-4 py-3 text-gray-600">{s.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Margin Target</div>
              <div className="text-2xl font-bold text-gray-900">45%</div>
              <div className="text-xs text-gray-500 mt-1">Gross margin via / 0.55 divisor</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Sales Tax</div>
              <div className="text-2xl font-bold text-gray-900">8.25%</div>
              <div className="text-xs text-gray-500 mt-1">Texas state + local (equipment + materials)</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Cash Discount</div>
              <div className="text-2xl font-bold text-gray-900">5%</div>
              <div className="text-xs text-gray-500 mt-1">Off suggested price for cash/check payment</div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Section 2: Tier Strategy ─────────────────────────────────────── */}
      <section>
        <SectionHeading
          icon={Layers}
          title="Tier Strategy"
          subtitle="Good / Better / Best proposals use different brands at the same tonnage"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {TIER_DATA.map((t) => (
            <Card key={t.tier} className={`${t.borderColor} border-2`}>
              <CardHeader className={`${t.color} rounded-t-lg pb-3`}>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{t.tier}</CardTitle>
                  <Badge className={t.badgeClass}>{t.brand}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Efficiency</span>
                  <span className="font-medium">{t.seer} / {t.afue}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tonnages</span>
                  <span className="font-medium">{t.equipment.map((e) => e.tons + "T").join(", ")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Dealer cost range</span>
                  <span className="font-medium">
                    {fmt2(t.equipment[0].dealerCost)} &ndash; {fmt2(t.equipment[t.equipment.length - 1].dealerCost)}
                  </span>
                </div>
                {t.tier === "Best" && (
                  <div className="text-xs text-amber-600 bg-amber-50 rounded px-2 py-1.5 mt-2">
                    Only 2.0 / 3.0 / 4.0 / 5.0T available (no 1.5 / 2.5 / 3.5T variable condensers in this line)
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <CalloutBox type="info">
          <p className="font-semibold mb-1">Alternative: Efficiency-Based Tiers</p>
          <p>
            An efficiency-based strategy is also implemented (all Amana, tiered by SEER2: Good = 14, Better = 16, Best = 20+).
            Switch by changing <code className="bg-blue-100 px-1 rounded text-xs">TIER_STRATEGY = &quot;efficiency&quot;</code> in{" "}
            <code className="bg-blue-100 px-1 rounded text-xs">pricing_engine.py</code>. Awaiting client confirmation on which strategy to use.
          </p>
        </CalloutBox>
      </section>

      {/* ── Section 3: Equipment Pricing Tables ──────────────────────────── */}
      <section>
        <SectionHeading
          icon={Package}
          title="Equipment Costs by Tonnage"
          subtitle="Dealer cost for each tier's system package (furnace + coil + condenser)"
        />

        {TIER_DATA.map((t) => (
          <div key={t.tier} className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Badge className={t.badgeClass}>{t.tier}</Badge>
              {t.brand} &mdash; {t.seer}
            </h3>
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="px-4 py-2.5 text-left font-semibold text-gray-700">Tons</th>
                        <th className="px-4 py-2.5 text-left font-semibold text-gray-700">Furnace</th>
                        <th className="px-4 py-2.5 text-left font-semibold text-gray-700">Condenser</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Dealer Cost</th>
                        <th className="px-4 py-2.5 text-right font-semibold text-gray-700">
                          With Markup
                          <span className="text-xs text-gray-400 font-normal ml-1">(x1.10)</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {t.equipment.map((eq, i) => (
                        <tr key={eq.tons} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                          <td className="px-4 py-2.5 font-medium text-gray-900">{eq.tons}T</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{eq.furnace}</td>
                          <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{eq.condenser}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-gray-700">{fmt2(eq.dealerCost)}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-green-700">
                            {fmt2(eq.dealerCost * CONSTANTS.equipmentMarkup)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </section>

      {/* ── Section 3b: Labor Rates ──────────────────────────────────────── */}
      <section>
        <SectionHeading
          icon={Wrench}
          title="Labor Rates"
          subtitle="Subcontractor rates from the RETRO PRICE SHEET"
        />

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-700">Service Type</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {LABOR_RATES.map((l, i) => (
                    <tr key={l.key} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                      <td className="px-4 py-2.5 text-gray-800">{l.service}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-900">{fmt(l.rate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Section 3c: Default BOM ──────────────────────────────────────── */}
      <section>
        <SectionHeading
          icon={FileText}
          title="Materials (Default BOM)"
          subtitle="Pre-calculated material cost by tonnage and access difficulty"
        />

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="px-4 py-2.5 text-left font-semibold text-gray-700">Tonnage</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Standard</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Attic</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Tight Space</th>
                    <th className="px-4 py-2.5 text-right font-semibold text-gray-700">Rooftop</th>
                  </tr>
                </thead>
                <tbody>
                  {MATERIAL_BOM.map((row, i) => (
                    <tr key={row.tons} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                      <td className="px-4 py-2.5 font-medium text-gray-900">{row.tons}T</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{fmt(row.standard)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{fmt(row.attic)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{fmt(row.tight)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{fmt(row.rooftop)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-gray-500 mt-2">
          These replace manual line-item entry from the Excel PRICING WORKSHEET. A 5% buffer (x1.05) is applied for waste/handling.
        </p>
      </section>

      {/* ── Section 3d: Surcharges ───────────────────────────────────────── */}
      <section>
        <SectionHeading
          icon={DollarSign}
          title="System Surcharges & Adders"
          subtitle="Additional costs based on system type and job requirements"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">System Type Surcharges</CardTitle>
            </CardHeader>
            <CardContent className="p-0 px-4 pb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left font-medium text-gray-500">Type</th>
                    <th className="py-2 text-right font-medium text-gray-500">Good</th>
                    <th className="py-2 text-right font-medium text-gray-500">Better</th>
                    <th className="py-2 text-right font-medium text-gray-500">Best</th>
                  </tr>
                </thead>
                <tbody>
                  {SURCHARGES.map((s) => (
                    <tr key={s.type} className="border-b last:border-0">
                      <td className="py-2 text-gray-800">{s.type}</td>
                      <td className="py-2 text-right text-gray-700">+{fmt(s.good)}</td>
                      <td className="py-2 text-right text-gray-700">+{fmt(s.better)}</td>
                      <td className="py-2 text-right text-gray-700">+{fmt(s.best)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-2 text-gray-400">Split System</td>
                    <td className="py-2 text-right text-gray-400">$0</td>
                    <td className="py-2 text-right text-gray-400">$0</td>
                    <td className="py-2 text-right text-gray-400">$0</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">Job Adders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Permit</span>
                <span className="font-medium text-gray-900">Calculated (2% + $79.45 base)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Lineset Replacement</span>
                <Badge variant="outline" className="text-amber-600 border-amber-300">TBD</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Electrical Work</span>
                <Badge variant="outline" className="text-amber-600 border-amber-300">TBD</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Ductwork</span>
                <Badge variant="outline" className="text-amber-600 border-amber-300">TBD</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Warranty Fee</span>
                <span className="font-medium text-gray-900">$150 (flat)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Miscellaneous</span>
                <span className="font-medium text-gray-900">$150 (flat)</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Section 4: Worked Example ────────────────────────────────────── */}
      <section>
        <SectionHeading
          icon={ArrowRight}
          title="Worked Example"
          subtitle='3.0-Ton split system, standard access, "Good" tier (Goodman)'
        />

        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2 text-sm">
              {(() => {
                const dealerCost = 2295;
                const equipmentCost = dealerCost * 1.10;
                const materialsBase = 400;
                const taxableMaterials = materialsBase * 1.05;
                const labor = 900;
                const permit = (equipmentCost * 0.02) + 79.45;
                const warranty = 150;
                const misc = 150;
                const laborAndMat = labor + permit + warranty + taxableMaterials + misc;
                const subTotal = equipmentCost + laborAndMat;
                const retailPrice = subTotal / 0.55;
                const tax = (taxableMaterials + equipmentCost) * 0.0825;
                const suggestedPrice = Math.round(retailPrice + tax);
                const cashPrice = Math.round(suggestedPrice * 0.95);

                return (
                  <>
                    <div className="flex justify-between py-1 border-b border-green-200">
                      <span className="text-gray-600">1. Dealer cost (3.0T Goodman)</span>
                      <span className="font-mono">{fmt2(dealerCost)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-green-200">
                      <span className="text-gray-600">2. Equipment cost (x1.10)</span>
                      <span className="font-mono">{fmt2(equipmentCost)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-green-200">
                      <span className="text-gray-600">3. Materials base (standard, 3.0T)</span>
                      <span className="font-mono">{fmt2(materialsBase)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-green-200">
                      <span className="text-gray-600">4. Taxable materials (x1.05)</span>
                      <span className="font-mono">{fmt2(taxableMaterials)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-green-200">
                      <span className="text-gray-600">5. Labor (complete retrofit)</span>
                      <span className="font-mono">{fmt2(labor)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-green-200">
                      <span className="text-gray-600">6. Permit (2% + base)</span>
                      <span className="font-mono">{fmt2(permit)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-green-200">
                      <span className="text-gray-600">7. Warranty + Misc</span>
                      <span className="font-mono">{fmt2(warranty + misc)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-green-200">
                      <span className="text-gray-600">8. Labor + Materials total</span>
                      <span className="font-mono">{fmt2(laborAndMat)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-green-200">
                      <span className="text-gray-600">9. Sub total</span>
                      <span className="font-mono">{fmt2(subTotal)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-green-200">
                      <span className="text-gray-600">10. Retail price (/ 0.55)</span>
                      <span className="font-mono">{fmt2(retailPrice)}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-green-200">
                      <span className="text-gray-600">11. Sales tax (8.25%)</span>
                      <span className="font-mono">{fmt2(tax)}</span>
                    </div>
                    <div className="flex justify-between py-2 mt-2 bg-green-100 rounded px-2">
                      <span className="font-bold text-gray-900">Suggested Price</span>
                      <span className="font-bold font-mono text-green-800 text-lg">{fmt(suggestedPrice)}</span>
                    </div>
                    <div className="flex justify-between py-2 mt-2 bg-green-100 rounded px-2">
                      <span className="font-bold text-gray-900">Cash/Check Price (5% off)</span>
                      <span className="font-bold font-mono text-green-800 text-lg">{fmt(cashPrice)}</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Sections 5 (Known Gaps) and 6 (Texas Compliance) hidden for now
      <section>...</section>
      */}

      {/* Footer note */}
      <div className="text-xs text-gray-400 border-t pt-4 pb-8">
        All pricing data sourced from <span className="font-medium">1 - RETRO ESTIMATING SHEET.xlsx</span>.
        Last updated: March 24, 2026. Pricing engine implementation:{" "}
        <code className="text-gray-500">backend/services/pricing_engine.py</code>.
        Data file: <code className="text-gray-500">backend/data/pricebook.json</code>.
      </div>
    </div>
  );
}
