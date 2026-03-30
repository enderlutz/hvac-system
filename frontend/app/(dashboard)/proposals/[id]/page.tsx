"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, MapPin, User, Calendar, Wrench,
  AlertTriangle, FileText, CheckCircle2, Flame,
  Thermometer, Clock, ShieldCheck, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { MOCK_PIPELINE } from "@/lib/mock-data";
import { formatDate } from "@/lib/utils";
import type { ProposalRecord, TierOption, ProposalStage } from "@/lib/types";

// ── Stage config ──────────────────────────────────────────────

const STAGE_CONFIG: Record<ProposalStage, { label: string; color: string; bg: string }> = {
  new_lead:        { label: "New Lead",        color: "#6b7280", bg: "bg-gray-100 text-gray-700" },
  appointment_set: { label: "Appointment Set", color: "#3b82f6", bg: "bg-blue-100 text-blue-700" },
  estimate_ready:  { label: "Estimate Ready",  color: "#d97706", bg: "bg-amber-100 text-amber-700" },
  proposal_sent:   { label: "Proposal Sent",   color: "#0ea5e9", bg: "bg-sky-100 text-sky-700" },
  follow_up:       { label: "Follow Up",       color: "#f97316", bg: "bg-orange-100 text-orange-700" },
  won:             { label: "Won",             color: "#16a34a", bg: "bg-green-100 text-green-700" },
  lost:            { label: "Lost",            color: "#ef4444", bg: "bg-red-100 text-red-700" },
};

const STAGE_ORDER: ProposalStage[] = [
  "new_lead", "appointment_set", "estimate_ready",
  "proposal_sent", "follow_up", "won", "lost",
];

// ── Tier card ─────────────────────────────────────────────────

const TIER_HEADER: Record<string, string> = {
  Good:   "bg-emerald-600",
  Better: "bg-blue-600",
  Best:   "bg-green-700",
};

function TierDetailCard({ tier, highlight = false }: { tier: TierOption; highlight?: boolean }) {
  const headerClass = TIER_HEADER[tier.tier_name] ?? "bg-gray-600";

  return (
    <div
      className={`rounded-xl border overflow-hidden flex flex-col ${
        highlight ? "ring-2 ring-green-600 shadow-lg" : "shadow-sm"
      }`}
    >
      {/* Header */}
      <div className={`${headerClass} px-4 py-3 text-white`}>
        <div className="flex items-center justify-between">
          <span className="font-bold text-lg">{tier.tier_name}</span>
          {highlight && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-semibold tracking-wide">
              RECOMMENDED
            </span>
          )}
        </div>
        <div className="text-white/80 text-sm mt-0.5">{tier.brand} — {tier.seer_rating}</div>
      </div>

      <div className="flex-1 p-4 space-y-4 bg-white">
        {/* System description */}
        <div className="text-sm font-medium text-foreground leading-snug">
          {tier.system_description}
        </div>

        {/* Benefits */}
        <ul className="space-y-1.5">
          {tier.key_benefits.map((b, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        {/* Warranty / install */}
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
            <span>{tier.warranty}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>Install time: {tier.install_time}</span>
          </div>
        </div>

        {/* Pricing breakdown */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Price Breakdown
          </div>
          <div className="divide-y">
            <div className="flex justify-between items-center px-3 py-2 text-sm">
              <span className="text-muted-foreground">Equipment</span>
              <span className="font-medium tabular-nums">{tier.equipment_cost}</span>
            </div>
            <div className="flex justify-between items-center px-3 py-2 text-sm">
              <span className="text-muted-foreground">Labor</span>
              <span className="font-medium tabular-nums">{tier.labor_cost}</span>
            </div>
            {tier.adders_cost && tier.adders_cost !== "$0" && (
              <div className="flex justify-between items-start px-3 py-2 text-sm gap-2">
                <span className="text-muted-foreground shrink-0">Adders</span>
                <span className="font-medium text-right text-xs leading-snug">{tier.adders_cost}</span>
              </div>
            )}
            <div className="flex justify-between items-center px-3 py-2.5 bg-muted/30">
              <span className="font-bold text-sm">Total</span>
              <span className="font-bold text-lg text-green-700 tabular-nums">{tier.total_price}</span>
            </div>
          </div>
        </div>

        {tier.is_placeholder && (
          <p className="text-center text-xs text-muted-foreground italic">
            Pricing pending Excel integration
          </p>
        )}
      </div>
    </div>
  );
}

// ── Info row ──────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 p-1.5 rounded-md bg-muted shrink-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium truncate">{value}</div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function ProposalDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [record, setRecord] = useState<ProposalRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [stageOpen, setStageOpen] = useState(false);
  const [stageSaving, setStageSaving] = useState(false);

  useEffect(() => {
    api.pipeline.get(id)
      .then(setRecord)
      .catch(() => {
        const mock = MOCK_PIPELINE.find((p) => p.id === id);
        if (mock) setRecord(mock);
        else toast.error("Could not load proposal");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleStageChange = async (stage: ProposalStage) => {
    if (!record || stage === record.stage) { setStageOpen(false); return; }
    setStageSaving(true);
    setStageOpen(false);
    try {
      const updated = await api.pipeline.updateStage(id, stage);
      setRecord(updated);
      toast.success(`Stage updated to ${STAGE_CONFIG[stage].label}`);
    } catch {
      toast.error("Failed to update stage");
    } finally {
      setStageSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="text-center py-24 space-y-3">
        <p className="text-lg font-semibold">Proposal not found</p>
        <Link href="/proposals"><Button variant="outline">Back to Proposals</Button></Link>
      </div>
    );
  }

  const stage = record.stage as ProposalStage;
  const stageCfg = STAGE_CONFIG[stage] ?? STAGE_CONFIG.new_lead;

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Top bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link href="/proposals">
          <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to Proposals
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          {record.r22_flag && <Badge variant="r22">R-22</Badge>}
          {record.urgency === "urgent" && (
            <Badge variant="urgent" className="gap-1">
              <Flame className="h-3 w-3" /> Urgent
            </Badge>
          )}
          {record.permit_required && <Badge variant="outline">Permit Required</Badge>}
          {record.seer2_compliance_note && <Badge variant="default">TX SEER2 ✓</Badge>}
        </div>
      </div>

      {/* Hero header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{record.customer_name}</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
            <MapPin className="h-4 w-4 shrink-0" />
            {record.customer_address}
          </p>
        </div>

        {/* Stage selector */}
        <div className="relative shrink-0">
          <button
            onClick={() => setStageOpen((o) => !o)}
            disabled={stageSaving}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${stageCfg.bg} transition-opacity ${stageSaving ? "opacity-50" : ""}`}
          >
            {stageSaving ? (
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : null}
            {stageCfg.label}
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {stageOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white rounded-xl border shadow-lg z-20 min-w-40 overflow-hidden">
              {STAGE_ORDER.map((s) => {
                const cfg = STAGE_CONFIG[s];
                return (
                  <button
                    key={s}
                    onClick={() => handleStageChange(s)}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-muted/60 transition-colors flex items-center gap-2 ${s === stage ? "font-semibold" : ""}`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cfg.color }} />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Job details */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Job Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <InfoRow icon={User}        label="Technician"   value={record.technician_name} />
            <InfoRow icon={Calendar}    label="Visit Date"   value={formatDate(record.visit_date)} />
            <InfoRow icon={Thermometer} label="System"       value={`${record.system_size_tons}T ${record.system_type.replace(/_/g, " ")}`} />
            <InfoRow icon={Wrench}      label="Service Type" value={record.service_type.replace(/_/g, " ")} />
            <InfoRow icon={Clock}       label="Urgency"      value={record.urgency.charAt(0).toUpperCase() + record.urgency.slice(1)} />
            <InfoRow icon={Calendar}    label="Created"      value={formatDate(record.created_at)} />
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {record.notes ? (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" /> Tech Notes
                </div>
                <p className="text-sm leading-relaxed">{record.notes}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">No tech notes.</p>
            )}

            {record.owner_notes && (
              <div className="border-t pt-3">
                <div className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> Owner Notes
                </div>
                <p className="text-sm leading-relaxed">{record.owner_notes}</p>
              </div>
            )}

            {/* Flags */}
            {(record.r22_flag || record.permit_required) && (
              <div className="border-t pt-3 space-y-2">
                {record.r22_flag && (
                  <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    R-22 refrigerant detected — full replacement strongly recommended.
                  </div>
                )}
                {record.permit_required && (
                  <div className="flex items-start gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    City permit included in pricing above.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Three-tier proposal */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Good / Better / Best Proposal</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TierDetailCard tier={record.good_tier} />
          <TierDetailCard tier={record.better_tier} />
          <TierDetailCard tier={record.best_tier} highlight />
        </div>
      </div>

      {/* Price summary bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Price Range</span>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Good</div>
                <div className="text-base font-bold text-emerald-700">{record.good_price}</div>
              </div>
              <div className="text-muted-foreground">→</div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Better</div>
                <div className="text-base font-bold text-blue-700">{record.better_price}</div>
              </div>
              <div className="text-muted-foreground">→</div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Best</div>
                <div className="text-xl font-bold text-green-700">{record.best_price}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
