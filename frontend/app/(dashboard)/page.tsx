"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DollarSign, FileText, TrendingUp, Flame, AlertTriangle,
  ArrowRight, Clock, CheckCircle2, XCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MOCK_STATS, MOCK_PROPOSALS } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/utils";
import type { DashboardStats, Proposal } from "@/lib/types";

const STAGE_LABELS: Record<string, string> = {
  new_lead: "New Lead",
  appointment_set: "Appointment Set",
  estimate_ready: "Estimate Ready",
  proposal_sent: "Proposal Sent",
  follow_up: "Follow Up",
  won: "Won",
  lost: "Lost",
};

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  iconColor,
}: {
  title: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  iconColor: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="p-2 rounded-lg" style={{ background: `${iconColor}18` }}>
          <Icon className="h-4 w-4" style={{ color: iconColor }} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(MOCK_STATS);
  const [proposals, setProposals] = useState<Proposal[]>(MOCK_PROPOSALS);

  // Load from localStorage cache (real data wired in Phase 2)
  useEffect(() => {
    const cached = localStorage.getItem("hvac_proposals");
    if (cached) setProposals(JSON.parse(cached));
  }, []);

  const urgent = proposals.filter((p) => p.urgency === "urgent" && p.stage !== "won" && p.stage !== "lost");
  const followUps = proposals.filter((p) => p.stage === "follow_up");
  const recent = [...proposals]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Houston Metro HVAC — sales operations overview
        </p>
      </div>

      {/* Urgent banner */}
      {urgent.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-orange-50 border border-orange-200">
          <Flame className="h-5 w-5 text-orange-500 shrink-0" />
          <p className="text-sm font-medium text-orange-800">
            {urgent.length} urgent proposal{urgent.length > 1 ? "s" : ""} need immediate attention
            {urgent.map((p) => ` — ${p.customer_name}`).join(",")}
          </p>
          <Link href="/proposals" className="ml-auto">
            <Button size="sm" variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100">
              View <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Pipeline Value"
          value={formatCurrency(stats.pipeline_value)}
          sub={`${stats.total_proposals_month} proposals this month`}
          icon={DollarSign}
          iconColor="#1a56db"
        />
        <StatCard
          title="Won This Month"
          value={String(stats.won_this_month)}
          sub={`${formatCurrency(stats.won_this_month * stats.avg_deal_size)} closed revenue`}
          icon={CheckCircle2}
          iconColor="#059669"
        />
        <StatCard
          title="Win Rate"
          value={`${stats.win_rate}%`}
          sub={`Avg deal size ${formatCurrency(stats.avg_deal_size)}`}
          icon={TrendingUp}
          iconColor="#7c3aed"
        />
        <StatCard
          title="Follow Ups Due"
          value={String(followUps.length)}
          sub={`${urgent.length} urgent, ${stats.total_proposals_month - stats.won_this_month - (stats.proposals_by_stage.lost || 0)} active`}
          icon={Clock}
          iconColor="#d97706"
        />
      </div>

      {/* Pipeline snapshot + Recent proposals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Pipeline by stage */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pipeline by Stage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats.proposals_by_stage).map(([stage, count]) => {
              const pct = Math.round((count / stats.total_proposals_month) * 100);
              const isWon = stage === "won";
              const isLost = stage === "lost";
              return (
                <div key={stage} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{STAGE_LABELS[stage]}</span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: isWon ? "#059669" : isLost ? "#ef4444" : "#1a56db",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent proposals */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Recent Proposals</CardTitle>
            <Link href="/proposals">
              <Button size="sm" variant="ghost" className="text-xs gap-1">
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recent.map((p) => (
              <div
                key={p.id}
                className="flex items-start justify-between gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{p.customer_name}</span>
                    {p.r22_flag && (
                      <Badge variant="r22" className="text-xs">R-22</Badge>
                    )}
                    {p.urgency === "urgent" && (
                      <Badge variant="urgent" className="text-xs">Urgent</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{p.customer_address}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.system_size_tons}T {p.system_type.replace("_", " ")} &bull; {p.technician_name}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <StageBadge stage={p.stage} />
                  <span className="text-xs text-muted-foreground">{formatCurrency(p.pipeline_value)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Follow-ups section */}
      {followUps.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                Pending Follow-Ups
              </CardTitle>
              <Badge variant="warning">{followUps.length} due</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {followUps.map((p) => (
                <div key={p.id} className="p-3 rounded-lg border bg-amber-50 border-amber-200">
                  <div className="font-medium text-sm">{p.customer_name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{p.customer_address}</div>
                  {p.notes && (
                    <div className="text-xs text-amber-700 mt-1.5 line-clamp-2">{p.notes}</div>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs font-medium">{formatCurrency(p.pipeline_value)}</span>
                    <Link href="/proposals">
                      <Button size="sm" variant="outline" className="h-6 text-xs px-2">
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StageBadge({ stage }: { stage: string }) {
  const map: Record<string, { label: string; variant: "default" | "success" | "destructive" | "warning" | "outline" | "urgent" }> = {
    new_lead:       { label: "New Lead",        variant: "outline" },
    appointment_set:{ label: "Appt Set",        variant: "default" },
    estimate_ready: { label: "Est. Ready",      variant: "warning" },
    proposal_sent:  { label: "Sent",            variant: "default" },
    follow_up:      { label: "Follow Up",       variant: "urgent" },
    won:            { label: "Won",             variant: "success" },
    lost:           { label: "Lost",            variant: "destructive" },
  };
  const { label, variant } = map[stage] ?? { label: stage, variant: "outline" };
  return <Badge variant={variant}>{label}</Badge>;
}
