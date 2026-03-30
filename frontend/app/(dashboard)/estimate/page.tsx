"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Calculator, ClipboardPaste, ChevronDown, ChevronUp,
  AlertTriangle, Info, CheckCircle2, Download, RotateCcw, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { api, downloadPdf } from "@/lib/api";
import type { JobInput, ProposalResponse, ParsedNotesResponse, TierOption, ProposalAddOn } from "@/lib/types";

const today = new Date().toISOString().split("T")[0];

const EMPTY_FORM: JobInput = {
  customer_name: "",
  customer_address: "",
  technician_name: "",
  visit_date: today,
  system_type: "",
  service_type: "",
  system_size_tons: 0,
  existing_equipment_make: "",
  existing_equipment_model: "",
  existing_equipment_age: undefined,
  existing_refrigerant: "",
  access_difficulty: "standard",
  urgency: "routine",
  lineset_replacement: false,
  permit_required: false,
  electrical_work_needed: false,
  electrical_notes: "",
  ductwork_needed: false,
  ductwork_notes: "",
  additional_notes: "",
};

type InputMode = "form" | "notes";

// ── Field label wrapper ───────────────────────────────────────

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

// ── Tier card ─────────────────────────────────────────────────

const TIER_STYLES = {
  Good:   { header: "bg-emerald-600",    badge: "bg-emerald-100 text-emerald-700" },
  Better: { header: "bg-blue-600",       badge: "bg-blue-100 text-blue-700" },
  Best:   { header: "bg-primary",        badge: "bg-primary/10 text-primary" },
};

function TierCard({ tier, highlight = false }: { tier: TierOption; highlight?: boolean }) {
  const style = TIER_STYLES[tier.tier_name as keyof typeof TIER_STYLES] ?? TIER_STYLES.Good;

  return (
    <div
      className={`rounded-xl border overflow-hidden flex flex-col ${
        highlight ? "ring-2 ring-primary shadow-lg" : "shadow-sm"
      }`}
    >
      {/* Header */}
      <div className={`${style.header} px-4 py-3 text-white`}>
        <div className="flex items-center justify-between">
          <span className="font-bold text-lg">{tier.tier_name}</span>
          {highlight && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-semibold">
              RECOMMENDED
            </span>
          )}
        </div>
        <div className="text-white/80 text-sm mt-0.5">{tier.brand}</div>
      </div>

      <div className="flex-1 p-4 space-y-4 bg-white">
        {/* Description + SEER */}
        <div>
          <div className="text-sm font-medium">{tier.system_description}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{tier.seer_rating}</div>
        </div>

        {/* Benefits */}
        <ul className="space-y-1.5">
          {tier.key_benefits.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        {/* Warranty / install */}
        <div className="text-xs text-muted-foreground space-y-0.5">
          <div><span className="font-medium text-foreground">Warranty: </span>{tier.warranty}</div>
          <div><span className="font-medium text-foreground">Install: </span>{tier.install_time}</div>
        </div>

        {/* Pricing */}
        <div className="border-t pt-3 space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Equipment</span><span>{tier.equipment_cost}</span>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Labor</span><span>{tier.labor_cost}</span>
          </div>
          {tier.adders_cost && tier.adders_cost !== "$0" && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Adders</span><span>{tier.adders_cost}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base pt-1 border-t">
            <span>Suggested Price</span>
            <span className={tier.is_placeholder ? "text-muted-foreground italic" : "text-primary"}>
              {tier.total_price}
            </span>
          </div>
          {tier.cash_discount_price && (
            <div className="flex justify-between text-xs text-emerald-700">
              <span>Cash/Check (5% off)</span><span>{tier.cash_discount_price}</span>
            </div>
          )}
        </div>

        {/* Margin analysis (admin view) */}
        {tier.margin && (
          <div className="border-t pt-3 space-y-1">
            <div className="text-xs font-medium text-muted-foreground mb-1">Margin Analysis</div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Cost</span>
              <span>${tier.margin.total_cost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Tax</span>
              <span>${tier.margin.tax.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Gross Margin</span>
              <span className={tier.margin.gross_margin_pct >= 40 ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                {tier.margin.gross_margin_pct}%
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Net Profit</span>
              <span className={tier.margin.net_profit_pct >= 15 ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                ${tier.margin.net_profit.toLocaleString()} ({tier.margin.net_profit_pct}%)
              </span>
            </div>
          </div>
        )}

        {tier.is_placeholder && (
          <div className="text-center text-xs text-muted-foreground italic bg-muted/50 rounded px-2 py-1">
            Pricing pending Excel integration
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function EstimatePage() {
  const [mode, setMode] = useState<InputMode>("form");
  const [form, setForm] = useState<JobInput>(EMPTY_FORM);
  const [rawNotes, setRawNotes] = useState("");
  const [proposal, setProposal] = useState<ProposalResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showAdders, setShowAdders] = useState(false);
  const [lowConfFields, setLowConfFields] = useState<string[]>([]);

  const set = (key: keyof JobInput, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Auto-check permit on replacement
  const handleServiceTypeChange = (v: string) => {
    set("service_type", v);
    if (v === "replacement") set("permit_required", true);
  };

  // Parse raw notes
  const handleParseNotes = async () => {
    if (!rawNotes.trim()) return;
    setParsing(true);
    try {
      const parsed: ParsedNotesResponse = await api.parseNotes(rawNotes);
      const low: string[] = [];
      const updates: Partial<JobInput> = {};

      const fieldMap: [keyof ParsedNotesResponse, keyof JobInput][] = [
        ["customer_name", "customer_name"],
        ["technician_name", "technician_name"],
        ["system_type", "system_type"],
        ["service_type", "service_type"],
        ["access_difficulty", "access_difficulty"],
        ["urgency", "urgency"],
        ["equipment_make", "existing_equipment_make"],
      ];

      for (const [parseKey, formKey] of fieldMap) {
        const field = parsed[parseKey] as { value: string | null; confidence: string } | undefined;
        if (field?.value) {
          (updates as Record<string, unknown>)[formKey] = field.value;
          if (field.confidence === "low") low.push(formKey);
        }
      }

      if (parsed.system_size_tons?.value) {
        updates.system_size_tons = parseFloat(parsed.system_size_tons.value);
        if (parsed.system_size_tons.confidence === "low") low.push("system_size_tons");
      }
      if (parsed.equipment_age?.value) {
        updates.existing_equipment_age = parseInt(parsed.equipment_age.value);
      }
      if (parsed.permit_required?.value === "true") updates.permit_required = true;
      if (parsed.lineset_replacement?.value === "true") updates.lineset_replacement = true;
      if (parsed.electrical_work?.value === "true") updates.electrical_work_needed = true;
      if (parsed.ductwork_needed?.value === "true") updates.ductwork_needed = true;
      if (parsed.existing_refrigerant?.value) updates.existing_refrigerant = parsed.existing_refrigerant.value;

      setLowConfFields(low);
      setForm((prev) => ({ ...prev, ...updates }));
      setMode("form");

      const filled = Object.keys(updates).length;
      toast.success(
        `Pre-filled ${filled} field${filled !== 1 ? "s" : ""} from notes.${
          low.length ? ` Verify highlighted fields.` : ""
        }`
      );
    } catch (e) {
      toast.error("Failed to parse notes. Check that the backend is running.");
    } finally {
      setParsing(false);
    }
  };

  // Generate proposal
  const handleGenerate = async () => {
    if (!form.customer_name || !form.system_type || !form.service_type || !form.system_size_tons) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    setProposal(null);
    try {
      const result = await api.generateProposal(form);
      setProposal(result);
      setTimeout(() => document.getElementById("proposal-result")?.scrollIntoView({ behavior: "smooth" }), 100);
      toast.success("Proposal generated!");
    } catch (e) {
      toast.error("Backend not reachable. Start the FastAPI server on port 8000.");
    } finally {
      setLoading(false);
    }
  };

  // Reset
  const handleReset = () => {
    setForm(EMPTY_FORM);
    setProposal(null);
    setRawNotes("");
    setLowConfFields([]);
    setMode("form");
  };

  // PDF export
  const handleExportPdf = async () => {
    if (!proposal) return;
    setPdfLoading(true);
    try {
      await downloadPdf(proposal);
      toast.success("PDF downloaded!");
    } catch {
      toast.error("PDF export failed.");
    } finally {
      setPdfLoading(false);
    }
  };

  const isLowConf = (key: string) => lowConfFields.includes(key);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Estimate Generator</h1>
          <p className="text-muted-foreground mt-1">
            Generate a Good / Better / Best proposal for a customer
          </p>
        </div>
        {proposal && (
          <Button variant="outline" onClick={handleReset} className="gap-2 shrink-0">
            <RotateCcw className="h-4 w-4" />
            New Estimate
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">

        {/* ── Form panel ─────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-4">

          {/* Mode toggle */}
          <div className="flex items-center rounded-lg border bg-background p-1 gap-1 w-fit">
            <Button
              variant={mode === "form" ? "default" : "ghost"}
              size="sm"
              className="gap-1.5 h-7"
              onClick={() => setMode("form")}
            >
              <Calculator className="h-3.5 w-3.5" />
              Structured Form
            </Button>
            <Button
              variant={mode === "notes" ? "default" : "ghost"}
              size="sm"
              className="gap-1.5 h-7"
              onClick={() => setMode("notes")}
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              Paste Notes
            </Button>
          </div>

          {/* Raw notes panel */}
          {mode === "notes" && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Technician Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  rows={7}
                  placeholder={`Paste free-form tech notes here...\n\nExample:\nCustomer: Sarah Williams\n3.5 ton split system, attic install\nExisting Carrier on R-22, 18 years old\nNo cooling — ASAP\nFull replacement, new lineset, permit required`}
                  value={rawNotes}
                  onChange={(e) => setRawNotes(e.target.value)}
                />
                <Button
                  onClick={handleParseNotes}
                  disabled={parsing || !rawNotes.trim()}
                  className="w-full gap-2"
                  variant="secondary"
                >
                  {parsing ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Parsing...</>
                  ) : (
                    <>Parse Notes &rarr; Fill Form</>
                  )}
                </Button>
                {lowConfFields.length > 0 && (
                  <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>Low-confidence fields highlighted — please verify before generating.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Main form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Customer */}
              <div className="grid grid-cols-1 gap-3">
                <Field label="Customer Name" required>
                  <Input
                    placeholder="e.g. John & Lisa Smith"
                    value={form.customer_name}
                    onChange={(e) => set("customer_name", e.target.value)}
                    className={isLowConf("customer_name") ? "border-amber-400 focus-visible:ring-amber-400" : ""}
                  />
                </Field>
                <Field label="Customer Address" required>
                  <Input
                    placeholder="123 Main St, Houston TX 77001"
                    value={form.customer_address}
                    onChange={(e) => set("customer_address", e.target.value)}
                  />
                </Field>
              </div>

              {/* Tech + date */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Technician" required>
                  <Input
                    placeholder="Tech name"
                    value={form.technician_name}
                    onChange={(e) => set("technician_name", e.target.value)}
                    className={isLowConf("technician_name") ? "border-amber-400" : ""}
                  />
                </Field>
                <Field label="Visit Date" required>
                  <Input
                    type="date"
                    value={form.visit_date}
                    onChange={(e) => set("visit_date", e.target.value)}
                  />
                </Field>
              </div>

              {/* System */}
              <div className="grid grid-cols-1 gap-3">
                <Field label="System Type" required>
                  <Select value={form.system_type} onValueChange={(v) => set("system_type", v)}>
                    <SelectTrigger className={isLowConf("system_type") ? "border-amber-400" : ""}>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="split">Split System</SelectItem>
                      <SelectItem value="heat_pump">Heat Pump</SelectItem>
                      <SelectItem value="package_unit">Package Unit</SelectItem>
                      <SelectItem value="mini_split">Ductless Mini-Split</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Service Type" required>
                    <Select value={form.service_type} onValueChange={handleServiceTypeChange}>
                      <SelectTrigger className={isLowConf("service_type") ? "border-amber-400" : ""}>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="replacement">Replacement</SelectItem>
                        <SelectItem value="repair">Repair</SelectItem>
                        <SelectItem value="new_install">New Install</SelectItem>
                        <SelectItem value="add_on">Add-On</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="System Size" required>
                    <Select
                      value={form.system_size_tons ? String(form.system_size_tons) : ""}
                      onValueChange={(v) => set("system_size_tons", parseFloat(v))}
                    >
                      <SelectTrigger className={isLowConf("system_size_tons") ? "border-amber-400" : ""}>
                        <SelectValue placeholder="Tons..." />
                      </SelectTrigger>
                      <SelectContent>
                        {[1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0].map((t) => (
                          <SelectItem key={t} value={String(t)}>{t} Ton</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
              </div>

              {/* Existing equipment */}
              <div className="grid grid-cols-3 gap-3">
                <Field label="Existing Make">
                  <Input
                    placeholder="e.g. Carrier"
                    value={form.existing_equipment_make}
                    onChange={(e) => set("existing_equipment_make", e.target.value)}
                    className={isLowConf("existing_equipment_make") ? "border-amber-400" : ""}
                  />
                </Field>
                <Field label="Model">
                  <Input
                    placeholder="Model #"
                    value={form.existing_equipment_model}
                    onChange={(e) => set("existing_equipment_model", e.target.value)}
                  />
                </Field>
                <Field label="Age (yrs)">
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    placeholder="e.g. 15"
                    value={form.existing_equipment_age ?? ""}
                    onChange={(e) => set("existing_equipment_age", e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </Field>
              </div>

              {/* Refrigerant */}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Refrigerant">
                  <Select
                    value={form.existing_refrigerant ?? ""}
                    onValueChange={(v) => set("existing_refrigerant", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Unknown" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="R-22">R-22 (Freon)</SelectItem>
                      <SelectItem value="R-410A">R-410A (Puron)</SelectItem>
                      <SelectItem value="R-32">R-32</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Access">
                  <Select
                    value={form.access_difficulty ?? "standard"}
                    onValueChange={(v) => set("access_difficulty", v)}
                  >
                    <SelectTrigger className={isLowConf("access_difficulty") ? "border-amber-400" : ""}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="attic">Attic</SelectItem>
                      <SelectItem value="tight">Tight / Restricted</SelectItem>
                      <SelectItem value="rooftop">Rooftop</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              {/* Urgency */}
              <Field label="Urgency">
                <Select
                  value={form.urgency ?? "routine"}
                  onValueChange={(v) => set("urgency", v)}
                >
                  <SelectTrigger className={isLowConf("urgency") ? "border-amber-400" : ""}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="routine">Routine</SelectItem>
                    <SelectItem value="soon">Soon</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              {/* Adders toggle */}
              <button
                type="button"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground w-full"
                onClick={() => setShowAdders(!showAdders)}
              >
                {showAdders ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Additional Work &amp; Adders
              </button>

              {showAdders && (
                <div className="space-y-3 border-t pt-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { key: "permit_required",       label: "Permit Required" },
                      { key: "lineset_replacement",   label: "Lineset Replacement" },
                      { key: "electrical_work_needed",label: "Electrical Work" },
                      { key: "ductwork_needed",        label: "Ductwork Needed" },
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={(form[key as keyof JobInput] as boolean) || false}
                          onChange={(e) => set(key as keyof JobInput, e.target.checked)}
                          className="w-4 h-4 rounded"
                        />
                        {label}
                      </label>
                    ))}
                  </div>

                  {form.electrical_work_needed && (
                    <Field label="Electrical Notes">
                      <Input
                        placeholder="Describe electrical work..."
                        value={form.electrical_notes}
                        onChange={(e) => set("electrical_notes", e.target.value)}
                      />
                    </Field>
                  )}
                  {form.ductwork_needed && (
                    <Field label="Ductwork Notes">
                      <Input
                        placeholder="Describe ductwork needed..."
                        value={form.ductwork_notes}
                        onChange={(e) => set("ductwork_notes", e.target.value)}
                      />
                    </Field>
                  )}

                  <Field label="Additional Notes">
                    <Textarea
                      rows={3}
                      placeholder="Any special conditions..."
                      value={form.additional_notes}
                      onChange={(e) => set("additional_notes", e.target.value)}
                    />
                  </Field>
                </div>
              )}

              {/* R-22 warning */}
              {form.existing_refrigerant === "R-22" && (
                <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>R-22 detected. Full system replacement strongly recommended — this refrigerant is no longer manufactured.</span>
                </div>
              )}

              {/* SEER2 note */}
              <div className="flex items-start gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Texas requires 15 SEER2 minimum for new installs. All tiers meet or exceed this standard.</span>
              </div>

              {/* Generate button */}
              <Button
                className="w-full gap-2"
                size="lg"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Generating Proposal...</>
                ) : (
                  <><Calculator className="h-4 w-4" />Generate Proposal</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ── Proposal result ────────────────────────────────── */}
        <div className="xl:col-span-3" id="proposal-result">
          {!proposal && (
            <div className="flex flex-col items-center justify-center h-full min-h-64 rounded-xl border-2 border-dashed border-border bg-muted/30 text-center p-8">
              <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg">No proposal yet</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-xs">
                Fill in the job details and click Generate Proposal to see the Good / Better / Best comparison.
              </p>
            </div>
          )}

          {proposal && (
            <div className="space-y-4 animate-fade-in">
              {/* Proposal header */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="font-semibold">{proposal.customer_name}</div>
                      <div className="text-sm text-muted-foreground">{proposal.customer_address}</div>
                      <div className="text-xs text-muted-foreground">
                        {proposal.system_size_tons}T {proposal.system_type.replace("_", " ")} &bull; {proposal.service_type.replace("_", " ")} &bull; Tech: {proposal.technician_name}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 shrink-0"
                      onClick={handleExportPdf}
                      disabled={pdfLoading}
                    >
                      {pdfLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Export PDF
                    </Button>
                  </div>

                  {/* Banners */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {proposal.r22_warning && (
                      <Badge variant="r22">R-22 Replacement Recommended</Badge>
                    )}
                    {proposal.permit_required && (
                      <Badge variant="outline">Permit Included</Badge>
                    )}
                    {proposal.seer2_compliance_note && (
                      <Badge variant="default">Texas SEER2 Compliant</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Three-tier cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TierCard tier={proposal.good} />
                <TierCard tier={proposal.better} />
                <TierCard tier={proposal.best} highlight />
              </div>

              {/* Add-on options */}
              {proposal.add_ons && proposal.add_ons.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Proposal Options (Add-Ons)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Optional upgrades the customer can choose on top of any tier:
                    </p>
                    {proposal.add_ons.map((addon, i) => (
                      <label key={i} className="flex items-center justify-between gap-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" className="w-4 h-4 rounded" defaultChecked={addon.selected} />
                          <div>
                            <div className="text-sm font-medium">{addon.name}</div>
                            <div className="text-xs text-muted-foreground">{addon.description}</div>
                          </div>
                        </div>
                        <div className="text-sm font-bold shrink-0">${addon.price.toLocaleString()}</div>
                      </label>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
