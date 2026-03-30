"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { JobInput, ParsedNotesResponse } from "@/lib/types";

const SYSTEM_TYPES = [
  { value: "split_system", label: "Split System" },
  { value: "package_unit", label: "Package Unit" },
  { value: "heat_pump", label: "Heat Pump" },
  { value: "mini_split", label: "Mini Split" },
  { value: "commercial", label: "Commercial" },
];

const SERVICE_TYPES = [
  { value: "full_replacement", label: "Full Replacement" },
  { value: "repair", label: "Repair" },
  { value: "new_install", label: "New Install" },
  { value: "maintenance", label: "Maintenance" },
];

const TONNAGE_OPTIONS = ["1.5", "2.0", "2.5", "3.0", "3.5", "4.0", "5.0"];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-gray-300 mb-1.5">
      {children}
    </label>
  );
}

function FieldInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
    />
  );
}

function FieldSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
    />
  );
}

function FieldTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent resize-none"
    />
  );
}

export default function FieldPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"form" | "notes">("form");
  const [rawNotes, setRawNotes] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseMessage, setParseMessage] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState<Partial<JobInput>>({
    visit_date: today,
    system_type: "split_system",
    service_type: "full_replacement",
    system_size_tons: 3.0,
    urgency: "routine",
    permit_required: false,
    lineset_replacement: false,
    electrical_work_needed: false,
    ductwork_needed: false,
  });

  const set = (key: keyof JobInput, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleParseNotes = async () => {
    if (!rawNotes.trim()) return;
    setParsing(true);
    setParseMessage(null);
    try {
      const parsed: ParsedNotesResponse = await api.parseNotes(rawNotes);
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
        }
      }

      if (parsed.system_size_tons?.value) {
        updates.system_size_tons = parseFloat(parsed.system_size_tons.value);
      }
      if (parsed.equipment_age?.value) {
        updates.existing_equipment_age = parseInt(parsed.equipment_age.value);
      }
      if (parsed.permit_required?.value === "true") updates.permit_required = true;
      if (parsed.lineset_replacement?.value === "true") updates.lineset_replacement = true;
      if (parsed.electrical_work?.value === "true") updates.electrical_work_needed = true;
      if (parsed.ductwork_needed?.value === "true") updates.ductwork_needed = true;
      if (parsed.existing_refrigerant?.value) updates.existing_refrigerant = parsed.existing_refrigerant.value;

      setForm((prev) => ({ ...prev, ...updates }));
      const filled = Object.keys(updates).length;
      setParseMessage(`Filled ${filled} field${filled !== 1 ? "s" : ""} from your notes.`);
      setMode("form");
    } catch {
      setParseMessage("Could not parse notes. Make sure the server is running.");
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.customer_name || !form.customer_address || !form.technician_name) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      const record = await api.pipeline.submit(form as JobInput);
      router.push(`/field/submitted/${record.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Submit Job Details</h1>
        <p className="text-sm text-gray-400 mt-1">
          Fill in the job info or paste your notes to auto-fill the form.
        </p>
      </div>

      {/* Mode toggle */}
      <div className="flex rounded-lg border border-gray-700 overflow-hidden w-fit">
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            mode === "form"
              ? "bg-green-700 text-white"
              : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
          onClick={() => setMode("form")}
        >
          Fill Form
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            mode === "notes"
              ? "bg-green-700 text-white"
              : "bg-gray-800 text-gray-400 hover:text-white"
          }`}
          onClick={() => setMode("notes")}
        >
          Paste Notes
        </button>
      </div>

      {/* Notes parser */}
      {mode === "notes" && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Paste Your Notes
          </h2>
          <FieldTextarea
            rows={6}
            placeholder={"Paste your job notes here...\n\nExample:\nCustomer: Sarah Williams\n3.5 ton split system, attic install\nExisting Carrier on R-22, 18 years old\nFull replacement, new lineset, permit needed"}
            value={rawNotes}
            onChange={(e) => setRawNotes(e.target.value)}
          />
          <button
            type="button"
            disabled={parsing || !rawNotes.trim()}
            onClick={handleParseNotes}
            className="w-full bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-medium rounded-lg py-2.5 text-sm transition-colors"
          >
            {parsing ? "Reading Notes..." : "Auto-Fill Form from Notes"}
          </button>
        </section>
      )}

      {parseMessage && (
        <div className="bg-green-900/40 border border-green-700 rounded-lg px-4 py-3 text-sm text-green-300">
          {parseMessage}
        </div>
      )}

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Customer info */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Customer Info
        </h2>

        <div>
          <FieldLabel>Customer Name *</FieldLabel>
          <FieldInput
            required
            placeholder="John Smith"
            value={form.customer_name || ""}
            onChange={(e) => set("customer_name", e.target.value)}
          />
        </div>

        <div>
          <FieldLabel>Service Address *</FieldLabel>
          <FieldInput
            required
            placeholder="1234 Main St, Houston, TX 77001"
            value={form.customer_address || ""}
            onChange={(e) => set("customer_address", e.target.value)}
          />
        </div>
      </section>

      {/* Job info */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Job Details
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Tech Name *</FieldLabel>
            <FieldInput
              required
              placeholder="Your name"
              value={form.technician_name || ""}
              onChange={(e) => set("technician_name", e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Visit Date</FieldLabel>
            <FieldInput
              type="date"
              value={form.visit_date || today}
              onChange={(e) => set("visit_date", e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>System Type</FieldLabel>
            <FieldSelect
              value={form.system_type || "split_system"}
              onChange={(e) => set("system_type", e.target.value)}
            >
              {SYSTEM_TYPES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </FieldSelect>
          </div>
          <div>
            <FieldLabel>Service Type</FieldLabel>
            <FieldSelect
              value={form.service_type || "full_replacement"}
              onChange={(e) => set("service_type", e.target.value)}
            >
              {SERVICE_TYPES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </FieldSelect>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>System Size (tons)</FieldLabel>
            <FieldSelect
              value={String(form.system_size_tons || 3.0)}
              onChange={(e) => set("system_size_tons", parseFloat(e.target.value))}
            >
              {TONNAGE_OPTIONS.map((t) => (
                <option key={t} value={t}>{t}T</option>
              ))}
            </FieldSelect>
          </div>
          <div>
            <FieldLabel>Urgency</FieldLabel>
            <FieldSelect
              value={form.urgency || "routine"}
              onChange={(e) => set("urgency", e.target.value)}
            >
              <option value="routine">Routine</option>
              <option value="soon">Soon</option>
              <option value="urgent">Urgent</option>
            </FieldSelect>
          </div>
        </div>
      </section>

      {/* Access & Orientation */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Install Details
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Access Difficulty</FieldLabel>
            <FieldSelect
              value={form.access_difficulty || "standard"}
              onChange={(e) => set("access_difficulty", e.target.value)}
            >
              <option value="standard">Standard</option>
              <option value="attic">Attic</option>
              <option value="tight">Tight / Restricted</option>
              <option value="rooftop">Rooftop</option>
            </FieldSelect>
          </div>
          <div>
            <FieldLabel>Orientation</FieldLabel>
            <FieldSelect
              value={form.orientation || ""}
              onChange={(e) => set("orientation", e.target.value)}
            >
              <option value="">Not specified</option>
              <option value="horizontal">Horizontal</option>
              <option value="upflow">Upflow</option>
              <option value="downflow">Downflow</option>
            </FieldSelect>
          </div>
        </div>
      </section>

      {/* Equipment */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Existing Equipment
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FieldLabel>Brand / Make</FieldLabel>
            <FieldInput
              placeholder="e.g. Carrier, Trane"
              value={form.existing_equipment_make || ""}
              onChange={(e) => set("existing_equipment_make", e.target.value)}
            />
          </div>
          <div>
            <FieldLabel>Age (years)</FieldLabel>
            <FieldInput
              type="number"
              min="0"
              max="50"
              placeholder="15"
              value={form.existing_equipment_age ?? ""}
              onChange={(e) =>
                set("existing_equipment_age", e.target.value ? parseInt(e.target.value) : undefined)
              }
            />
          </div>
        </div>
        <div>
          <FieldLabel>Refrigerant</FieldLabel>
          <FieldSelect
            value={form.existing_refrigerant || ""}
            onChange={(e) => set("existing_refrigerant", e.target.value)}
          >
            <option value="">Unknown</option>
            <option value="R-22">R-22 (Freon)</option>
            <option value="R-410A">R-410A (Puron)</option>
            <option value="R-32">R-32</option>
          </FieldSelect>
        </div>
      </section>

      {/* Adders */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Additional Work
        </h2>
        {[
          { key: "permit_required" as keyof JobInput, label: "Permit Required" },
          { key: "lineset_replacement" as keyof JobInput, label: "Lineset Replacement" },
          { key: "electrical_work_needed" as keyof JobInput, label: "Electrical Work Needed" },
          { key: "ductwork_needed" as keyof JobInput, label: "Ductwork Needed" },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-3 cursor-pointer">
            <div
              className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                form[key]
                  ? "bg-green-700 border-green-700"
                  : "bg-transparent border-gray-600"
              }`}
              onClick={() => set(key, !form[key])}
            >
              {form[key] && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-sm text-gray-300">{label}</span>
          </label>
        ))}
      </section>

      {/* Notes */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Notes
        </h2>
        <FieldTextarea
          rows={4}
          placeholder="Any additional info, access notes, special conditions..."
          value={form.additional_notes || ""}
          onChange={(e) => set("additional_notes", e.target.value)}
        />
      </section>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-700 hover:bg-green-800 disabled:bg-green-950 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-3 text-sm transition-colors"
      >
        {loading ? "Generating Estimate..." : "Submit Job"}
      </button>
    </form>
  );
}
