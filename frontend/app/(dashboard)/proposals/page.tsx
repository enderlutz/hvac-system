"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import {
  Search, Plus, LayoutGrid, List, Flame,
  MapPin, User, CheckCircle2, XCircle, GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ProposalRecord, ProposalStage, KanbanColumn } from "@/lib/types";

// ── Kanban column config ──────────────────────────────────────

const COLUMNS: KanbanColumn[] = [
  { id: "new_lead",        label: "New Lead",        color: "#6b7280", headerBg: "bg-gray-100",   cardBg: "bg-gray-50",    dot: "bg-gray-400" },
  { id: "appointment_set", label: "Appointment Set", color: "#3b82f6", headerBg: "bg-blue-100",   cardBg: "bg-blue-50",    dot: "bg-blue-500" },
  { id: "estimate_ready",  label: "Estimate Ready",  color: "#d97706", headerBg: "bg-amber-100",  cardBg: "bg-amber-50",   dot: "bg-amber-500" },
  { id: "proposal_sent",   label: "Proposal Sent",   color: "#0ea5e9", headerBg: "bg-sky-100",    cardBg: "bg-sky-50",     dot: "bg-sky-500" },
  { id: "follow_up",       label: "Follow Up",       color: "#f97316", headerBg: "bg-orange-100", cardBg: "bg-orange-50",  dot: "bg-orange-500" },
  { id: "won",             label: "Won",             color: "#10b981", headerBg: "bg-emerald-100",cardBg: "bg-emerald-50", dot: "bg-emerald-500" },
  { id: "lost",            label: "Lost",            color: "#ef4444", headerBg: "bg-red-100",    cardBg: "bg-red-50",     dot: "bg-red-400" },
];

// ── Reject dialog ─────────────────────────────────────────────

function RejectDialog({
  onConfirm,
  onCancel,
  customerName,
}: {
  onConfirm: (notes: string) => void;
  onCancel: () => void;
  customerName: string;
}) {
  const [notes, setNotes] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 p-5 space-y-4">
        <h3 className="font-semibold">Reject Proposal</h3>
        <p className="text-sm text-muted-foreground">
          Reject estimate for <strong>{customerName}</strong>? Please add a reason.
        </p>
        <textarea
          autoFocus
          rows={3}
          className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
          placeholder="Reason for rejection..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={!notes.trim()}
            onClick={() => onConfirm(notes.trim())}
          >
            Reject
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Proposal card ─────────────────────────────────────────────

function ProposalCard({
  proposal,
  isDragging = false,
  onApprove,
  onReject,
  onNavigate,
}: {
  proposal: ProposalRecord;
  isDragging?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onNavigate?: () => void;
}) {
  const col = COLUMNS.find((c) => c.id === proposal.stage)!;
  const isEstimateReady = proposal.stage === "estimate_ready";

  return (
    <div
      onClick={onNavigate}
      className={`rounded-lg border bg-white p-3 space-y-2 transition-shadow ${
        isDragging ? "shadow-xl rotate-1" : "shadow-sm hover:shadow-md"
      } ${onNavigate ? "cursor-pointer" : ""}`}
    >
      {/* Badges row */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {proposal.r22_flag && (
          <Badge variant="r22" className="text-xs">R-22</Badge>
        )}
        {proposal.urgency === "urgent" && (
          <Badge variant="urgent" className="text-xs">
            <Flame className="h-2.5 w-2.5 mr-1" /> Urgent
          </Badge>
        )}
        <Badge className="text-xs ml-auto" style={{ background: `${col.color}18`, color: col.color }}>
          {proposal.system_size_tons}T
        </Badge>
      </div>

      {/* Name */}
      <div className="font-semibold text-sm leading-tight">{proposal.customer_name}</div>

      {/* Address */}
      <div className="flex items-start gap-1 text-xs text-muted-foreground">
        <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
        <span className="line-clamp-1">{proposal.customer_address}</span>
      </div>

      {/* System info */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="capitalize">{proposal.system_type.replace("_", " ")}</span>
        <span>•</span>
        <span className="capitalize">{proposal.service_type.replace("_", " ")}</span>
      </div>

      {/* Pipeline value */}
      <div className="flex items-center justify-between pt-1 border-t">
        <span className="text-sm font-bold" style={{ color: col.color }}>
          {proposal.best_price !== "[PRICE TBD]" ? proposal.best_price : "Pricing TBD"}
        </span>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          {proposal.technician_name.split(" ")[0]}
        </div>
      </div>

      {/* Approve/Reject for estimate_ready */}
      {isEstimateReady && onApprove && onReject && (
        <div className="flex gap-1.5 pt-1">
          <button
            onClick={(e) => { e.stopPropagation(); onApprove(); }}
            className="flex-1 flex items-center justify-center gap-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md py-1.5 transition-colors"
          >
            <CheckCircle2 className="h-3 w-3" /> Approve
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onReject(); }}
            className="flex-1 flex items-center justify-center gap-1 text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-md py-1.5 transition-colors"
          >
            <XCircle className="h-3 w-3" /> Reject
          </button>
        </div>
      )}
    </div>
  );
}

// ── Sortable wrapper ──────────────────────────────────────────

function SortableCard({
  proposal,
  onApprove,
  onReject,
  onNavigate,
}: {
  proposal: ProposalRecord;
  onApprove?: () => void;
  onReject?: () => void;
  onNavigate?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: proposal.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <div className="flex items-start gap-1">
        <div
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="mt-2 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <ProposalCard
            proposal={proposal}
            onApprove={onApprove}
            onReject={onReject}
            onNavigate={onNavigate}
          />
        </div>
      </div>
    </div>
  );
}

// ── Droppable column ──────────────────────────────────────────

function KanbanColumnView({
  column,
  proposals,
  onApprove,
  onReject,
  onNavigate,
}: {
  column: KanbanColumn;
  proposals: ProposalRecord[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onNavigate: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div
      className="rounded-xl border flex flex-col shrink-0"
      style={{ width: 260, minHeight: 500, background: isOver ? `${column.color}10` : undefined }}
    >
      {/* Header */}
      <div className={`px-3 py-2.5 border-b rounded-t-xl ${column.headerBg}`}>
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${column.dot}`} />
          <span className="font-semibold text-sm">{column.label}</span>
          <span className="ml-auto bg-white px-2 py-0.5 rounded-full text-xs font-medium shadow-sm">
            {proposals.length}
          </span>
        </div>
      </div>

      {/* Cards */}
      <div
        ref={setNodeRef}
        className="flex-1 p-2 space-y-2 overflow-y-auto"
        style={{ minHeight: 60 }}
      >
        <SortableContext items={proposals.map((p) => p.id)} strategy={verticalListSortingStrategy}>
          {proposals.map((p) => (
            <SortableCard
              key={p.id}
              proposal={p}
              onApprove={column.id === "estimate_ready" ? () => onApprove(p.id) : undefined}
              onReject={column.id === "estimate_ready" ? () => onReject(p.id) : undefined}
              onNavigate={() => onNavigate(p.id)}
            />
          ))}
        </SortableContext>
        {proposals.length === 0 && (
          <div className="flex items-center justify-center h-16 text-xs text-muted-foreground border-2 border-dashed rounded-lg">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

// ── Queue row ─────────────────────────────────────────────────

function QueueRow({
  proposal,
  onApprove,
  onReject,
  onNavigate,
}: {
  proposal: ProposalRecord;
  onApprove?: () => void;
  onReject?: () => void;
  onNavigate?: () => void;
}) {
  const col = COLUMNS.find((c) => c.id === proposal.stage)!;
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onNavigate}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{proposal.customer_name}</span>
              {proposal.r22_flag && <Badge variant="r22" className="text-xs">R-22</Badge>}
              {proposal.urgency === "urgent" && (
                <Badge variant="urgent" className="text-xs">
                  <Flame className="h-2.5 w-2.5 mr-1" />Urgent
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{proposal.customer_address}</span>
            </div>
          </div>

          <div className="hidden sm:flex flex-col gap-0.5 text-xs text-muted-foreground shrink-0">
            <span className="capitalize">{proposal.system_size_tons}T {proposal.system_type.replace("_", " ")}</span>
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />{proposal.technician_name}
            </div>
            <div className="flex items-center gap-1">
              {formatDate(proposal.visit_date)}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <Badge className="text-xs" style={{ background: `${col.color}18`, color: col.color }}>
              {col.label}
            </Badge>
            <span className="text-xs font-semibold" style={{ color: col.color }}>
              {proposal.best_price !== "[PRICE TBD]" ? proposal.best_price : "TBD"}
            </span>
          </div>
        </div>

        {proposal.stage === "estimate_ready" && onApprove && onReject && (
          <div className="flex gap-2 mt-3 pt-3 border-t">
            <button
              onClick={(e) => { e.stopPropagation(); onApprove(); }}
              className="flex-1 flex items-center justify-center gap-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-md py-1.5 transition-colors"
            >
              <CheckCircle2 className="h-3 w-3" /> Approve & Send
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onReject(); }}
              className="flex-1 flex items-center justify-center gap-1 text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-md py-1.5 transition-colors"
            >
              <XCircle className="h-3 w-3" /> Reject
            </button>
          </div>
        )}

        {proposal.notes && (
          <div className="mt-2 pt-2 border-t text-xs text-muted-foreground line-clamp-1">
            {proposal.notes}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────

export default function ProposalsPage() {
  const router = useRouter();
  const [proposals, setProposals] = useState<ProposalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"kanban" | "queue">("kanban");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchProposals = useCallback(async () => {
    try {
      const data = await api.pipeline.list();
      setProposals(data);
    } catch {
      // silently fail on poll errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProposals();
    pollRef.current = setInterval(fetchProposals, 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchProposals]);

  const handleApprove = async (id: string) => {
    try {
      const updated = await api.pipeline.approve(id, "Approved");
      setProposals((prev) => prev.map((p) => (p.id === id ? updated : p)));
      toast.success("Proposal approved and marked as Sent");
    } catch {
      toast.error("Failed to approve proposal");
    }
  };

  const handleReject = async (id: string, notes: string) => {
    setRejectId(null);
    try {
      const updated = await api.pipeline.reject(id, notes);
      setProposals((prev) => prev.map((p) => (p.id === id ? updated : p)));
      toast.success("Proposal rejected");
    } catch {
      toast.error("Failed to reject proposal");
    }
  };

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(String(e.active.id));
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const cardId = String(active.id);
    const targetId = String(over.id);

    // Find new stage
    let newStage: ProposalStage | undefined;
    const targetColumn = COLUMNS.find((c) => c.id === targetId);
    if (targetColumn) {
      newStage = targetColumn.id;
    } else {
      const targetCard = proposals.find((p) => p.id === targetId);
      if (targetCard && targetCard.id !== cardId) newStage = targetCard.stage;
    }

    if (!newStage) return;
    const current = proposals.find((p) => p.id === cardId);
    if (!current || current.stage === newStage) return;

    // Optimistic update
    setProposals((prev) =>
      prev.map((p) => (p.id === cardId ? { ...p, stage: newStage! } : p))
    );
    try {
      const updated = await api.pipeline.updateStage(cardId, newStage);
      setProposals((prev) => prev.map((p) => (p.id === cardId ? updated : p)));
    } catch {
      // Roll back
      setProposals((prev) =>
        prev.map((p) => (p.id === cardId ? { ...p, stage: current.stage } : p))
      );
      toast.error("Failed to update stage");
    }
  };

  const filtered = proposals.filter(
    (p) =>
      p.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      p.customer_address.toLowerCase().includes(search.toLowerCase()) ||
      p.technician_name.toLowerCase().includes(search.toLowerCase())
  );

  const activeProposal = activeId ? proposals.find((p) => p.id === activeId) : null;
  const urgent = proposals.filter((p) => p.urgency === "urgent" && p.stage !== "won" && p.stage !== "lost");
  const rejectTarget = rejectId ? proposals.find((p) => p.id === rejectId) : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Reject dialog */}
      {rejectTarget && (
        <RejectDialog
          customerName={rejectTarget.customer_name}
          onConfirm={(notes) => handleReject(rejectTarget.id, notes)}
          onCancel={() => setRejectId(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proposals</h1>
          <p className="text-muted-foreground mt-1">
            {proposals.length} total &bull; {proposals.filter((p) => p.stage === "won").length} won &bull;{" "}
            {proposals.filter((p) => !["won", "lost"].includes(p.stage)).length} active
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/field" target="_blank">
            <Button variant="outline" className="gap-2">
              Tech Portal
            </Button>
          </Link>
          <Link href="/estimate">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Estimate
            </Button>
          </Link>
        </div>
      </div>

      {/* Urgent banner */}
      {urgent.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-orange-50 border border-orange-200">
          <Flame className="h-4 w-4 text-orange-500 shrink-0" />
          <p className="text-sm text-orange-800">
            <span className="font-semibold">{urgent.length} urgent:</span>{" "}
            {urgent.map((p) => p.customer_name).join(", ")}
          </p>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customer, address, tech..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center rounded-lg border bg-background p-1 gap-1">
          <Button
            variant={view === "kanban" ? "default" : "ghost"}
            size="sm"
            className="gap-1.5 h-7"
            onClick={() => setView("kanban")}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Board
          </Button>
          <Button
            variant={view === "queue" ? "default" : "ghost"}
            size="sm"
            className="gap-1.5 h-7"
            onClick={() => setView("queue")}
          >
            <List className="h-3.5 w-3.5" />
            Queue
          </Button>
        </div>
      </div>

      {/* Empty state */}
      {proposals.length === 0 && (
        <div className="text-center py-16 text-muted-foreground space-y-2">
          <p className="text-lg font-medium">No proposals yet</p>
          <p className="text-sm">Submit a job from the tech portal or create an estimate to get started.</p>
          <div className="flex gap-3 justify-center mt-4">
            <Link href="/field" target="_blank">
              <Button variant="outline">Open Tech Portal</Button>
            </Link>
            <Link href="/estimate">
              <Button>New Estimate</Button>
            </Link>
          </div>
        </div>
      )}

      {/* Views */}
      {proposals.length > 0 && (
        <>
          {view === "kanban" ? (
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              <div className="kanban-scroll">
                <div className="flex gap-3 pb-2" style={{ width: "max-content" }}>
                  {COLUMNS.map((col) => (
                    <KanbanColumnView
                      key={col.id}
                      column={col}
                      proposals={filtered.filter((p) => p.stage === col.id)}
                      onApprove={handleApprove}
                      onReject={(id) => setRejectId(id)}
                      onNavigate={(id) => router.push(`/proposals/${id}`)}
                    />
                  ))}
                </div>
              </div>
              <DragOverlay>
                {activeProposal && (
                  <div className="drag-overlay" style={{ width: 244 }}>
                    <ProposalCard proposal={activeProposal} isDragging />
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          ) : (
            <div className="space-y-3">
              {[...filtered]
                .sort((a, b) => {
                  const urgScore = { urgent: 0, soon: 1, routine: 2 };
                  return (urgScore[a.urgency] ?? 2) - (urgScore[b.urgency] ?? 2);
                })
                .map((p) => (
                  <QueueRow
                    key={p.id}
                    proposal={p}
                    onApprove={p.stage === "estimate_ready" ? () => handleApprove(p.id) : undefined}
                    onReject={p.stage === "estimate_ready" ? () => setRejectId(p.id) : undefined}
                    onNavigate={() => router.push(`/proposals/${p.id}`)}
                  />
                ))}
              {filtered.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No proposals match your search.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
