"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard, FileText, Calculator, Package, Settings,
  Wrench, ArrowRight, ArrowLeft, X, Flame, HelpCircle,
  MousePointerClick, BarChart3, Kanban, ClipboardList, Zap,
} from "lucide-react";

// ── Tutorial steps ────────────────────────────────────────────

interface TutorialStep {
  title: string;
  description: string;
  details: string[];
  icon: React.ElementType;
  accent: string;       // tailwind bg color for the icon bubble
  tip?: string;         // pro-tip shown at the bottom
}

const STEPS: TutorialStep[] = [
  {
    title: "Welcome to Lucks Air & Heat",
    description:
      "This is your proposal automation dashboard. It replaces the old Excel estimating process with a streamlined digital workflow — from technician site visit to customer-ready PDF proposal.",
    details: [
      "Technician visits the job site and fills out the Tech Portal form",
      "The system generates a three-tier Good / Better / Best proposal",
      "You review, approve, and send the proposal to the customer",
      "Track every lead from first contact through to close",
      "Export any proposal to a branded PDF to send to the customer",
    ],
    icon: Flame,
    accent: "bg-green-600",
    tip: "This tutorial only shows once. You can reopen it anytime from the Settings page. Use arrow keys to navigate.",
  },
  {
    title: "Navigating the Dashboard",
    description:
      "The green sidebar on the left is your main navigation. Each page is one click away. The Dashboard is your command center — see everything at a glance.",
    details: [
      "Sidebar links: Dashboard, Proposals, Estimate Generator, Equipment, and Settings",
      "Pipeline value shows the total dollar amount of active proposals",
      "Win rate tracks how many proposals convert to signed jobs",
      "Recent proposals shows the latest leads with their current stage",
      "Follow-ups & urgent items are flagged so nothing falls through the cracks",
      "Tech Portal link at the bottom of the sidebar opens in a new tab for field techs",
    ],
    icon: LayoutDashboard,
    accent: "bg-green-600",
    tip: "Click any proposal card on the dashboard to jump straight to its full detail page.",
  },
  {
    title: "Proposals Pipeline",
    description:
      "Your sales pipeline in two views — Kanban board for visual tracking, or Queue list for quick scanning. Drag cards between stages to update their status.",
    details: [
      "Kanban view: drag cards between columns (New Lead → Appointment Set → Estimate Ready → Proposal Sent → Follow Up → Won / Lost)",
      "Queue view: sortable list with all proposals and quick actions",
      "Click any card to see the full proposal detail with pricing breakdown",
      "Approve & Send moves an estimate to 'Proposal Sent' automatically",
      "Reject sends it back with your notes for the tech to revise",
    ],
    icon: Kanban,
    accent: "bg-blue-600",
    tip: "Use the search bar to quickly find proposals by customer name or address.",
  },
  {
    title: "Estimate Generator",
    description:
      "Create new proposals from scratch. Fill in the job details and the system calculates Good / Better / Best pricing automatically using the pricing engine.",
    details: [
      "Enter customer info, system type, tonnage, and job conditions",
      "Smart Notes Parser: paste raw technician notes and it auto-fills the form fields",
      "Three-tier pricing is calculated instantly — Goodman (Good), Lennox (Better), Trane (Best)",
      "Pricing accounts for equipment, labor, permits, and any add-ons",
      "Submit to add the proposal to your pipeline, or export directly to a branded PDF",
      "Optional add-ons (UV light, surge protector, etc.) can be toggled per proposal",
    ],
    icon: Calculator,
    accent: "bg-amber-600",
    tip: "The Notes Parser can extract system type, tonnage, refrigerant, and more from free-form tech notes — saves time vs. manual entry.",
  },
  {
    title: "Equipment & Pricebook",
    description:
      "Manage your equipment catalog and pricing. All 5 brands (Amana, Goodman, Lennox, Trane, Carrier) with real dealer costs.",
    details: [
      "Browse 685+ equipment items across all brands and categories",
      "Update dealer costs as pricing changes from distributors",
      "Bulk adjust pricing by percentage or flat amount across brands",
      "Import/export pricebook data via CSV for easy updates",
      "All pricing changes are logged in the changelog for audit trail",
    ],
    icon: Package,
    accent: "bg-purple-600",
    tip: "Use bulk adjust to apply a distributor price increase across an entire brand at once.",
  },
  {
    title: "Tech Portal",
    description:
      "This is where your field technicians submit job details from the site. It's a separate page they can access from their phone or tablet.",
    details: [
      "Techs fill out customer info, system details, and job conditions on-site",
      "The form is mobile-friendly — designed for use in the field",
      "Submitted jobs appear in your Proposals pipeline as 'Estimate Ready'",
      "Opens in a new tab so it doesn't interfere with your admin dashboard",
      "Share the /field URL directly with your technicians",
    ],
    icon: Wrench,
    accent: "bg-teal-600",
    tip: "Bookmark the /field page on your technicians' phones for quick access.",
  },
  {
    title: "Proposal Detail Page",
    description:
      "Click any proposal to see its full detail page — customer info, job notes, and the complete pricing breakdown for all three tiers.",
    details: [
      "See equipment cost, labor cost, and adders broken down per tier",
      "Good / Better / Best cards show the full price with line-item detail",
      "Change the proposal stage directly from the detail page using the stage dropdown",
      "R-22 refrigerant warnings are flagged in red — these systems must be fully replaced (R-22 is discontinued)",
      "All proposals include the Texas SEER2 compliance note (15 SEER2 minimum)",
      "Permit requirements and costs are automatically included for replacement jobs",
      "Price range summary bar shows the spread across all three tiers",
    ],
    icon: MousePointerClick,
    accent: "bg-sky-600",
    tip: "The 'Best' tier is highlighted as recommended — it has the highest margin and best customer value. R-22 flags help you upsell full replacements.",
  },
  {
    title: "You're All Set!",
    description:
      "That covers the essentials. Your workflow is: Tech submits from the field → You review on the dashboard → Approve & send → Track through to close.",
    details: [
      "Start by checking the Dashboard for any proposals needing attention",
      "Review 'Estimate Ready' proposals in the Pipeline and approve or reject",
      "Use the Estimate Generator to create proposals on the fly",
      "Keep the Equipment pricebook updated as distributor pricing changes",
      "Export proposals to PDF anytime from the Estimate Generator results",
      "Settings (Phase 5) will add company branding, tier strategy config, and more",
    ],
    icon: Zap,
    accent: "bg-green-600",
    tip: "You can restart this tutorial anytime from the Settings page. Good luck closing those deals!",
  },
];

const STORAGE_KEY = "hvac_tutorial_completed";

// ── Component ─────────────────────────────────────────────────

export function TutorialOverlay() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) setVisible(true);
  }, []);

  const close = useCallback(() => {
    setVisible(false);
    localStorage.setItem(STORAGE_KEY, "true");
  }, []);

  const goTo = useCallback((next: number) => {
    setAnimating(true);
    setTimeout(() => {
      setStep(next);
      setAnimating(false);
    }, 150);
  }, []);

  const next = () => { if (step < STEPS.length - 1) goTo(step + 1); else close(); };
  const prev = () => { if (step > 0) goTo(step - 1); };

  // Keyboard navigation
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  if (!visible) return null;

  const s = STEPS[step];
  const Icon = s.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={close}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden transition-opacity duration-150 ${
          animating ? "opacity-0" : "opacity-100"
        }`}
      >
        {/* Close button */}
        <button
          onClick={close}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header band */}
        <div className={`${s.accent} px-8 pt-8 pb-6`}>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-white/20 backdrop-blur-sm">
              <Icon className="h-8 w-8 text-white" />
            </div>
            <div>
              <div className="text-white/70 text-xs font-semibold uppercase tracking-wider">
                Step {step + 1} of {STEPS.length}
              </div>
              <h2 className="text-2xl font-bold text-white mt-0.5">{s.title}</h2>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6 space-y-5">
          <p className="text-gray-700 leading-relaxed">{s.description}</p>

          <ul className="space-y-2.5">
            {s.details.map((d, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${s.accent} shrink-0`} />
                <span className="leading-relaxed">{d}</span>
              </li>
            ))}
          </ul>

          {s.tip && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              <HelpCircle className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
              <span><strong>Tip:</strong> {s.tip}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t bg-gray-50 flex items-center justify-between">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all duration-200 ${
                  i === step
                    ? `w-6 ${s.accent}`
                    : i < step
                    ? "w-2 bg-green-300"
                    : "w-2 bg-gray-300"
                }`}
              />
            ))}
          </div>

          {/* Nav buttons */}
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={prev}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            )}
            {step === 0 && (
              <button
                onClick={close}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                Skip tutorial
              </button>
            )}
            <button
              onClick={next}
              className={`flex items-center gap-1.5 px-5 py-2 text-sm font-semibold text-white rounded-lg transition-colors ${s.accent} hover:opacity-90`}
            >
              {isLast ? "Get Started" : "Next"}
              {!isLast && <ArrowRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Reset helper (for Settings page) ──────────────────────────

export function resetTutorial() {
  localStorage.removeItem(STORAGE_KEY);
}
