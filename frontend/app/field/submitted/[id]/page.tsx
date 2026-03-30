"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { ProposalRecord } from "@/lib/types";

export default function SubmittedPage() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<ProposalRecord | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.pipeline.get(id).then(setRecord).catch(() => setError(true));
  }, [id]);

  if (error) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="text-red-400 text-4xl">!</div>
        <p className="text-gray-400">Could not load submission details.</p>
        <Link href="/field" className="text-green-400 text-sm underline">
          Submit another job
        </Link>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success header */}
      <div className="text-center space-y-3 py-4">
        <div className="w-16 h-16 mx-auto rounded-full bg-green-900/40 border-2 border-green-600 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-xl font-bold">Job Submitted!</h1>
        <p className="text-sm text-gray-400">
          Your job has been sent to the dashboard and a Good/Better/Best estimate has been generated.
        </p>
      </div>

      {/* Summary card */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700 bg-gray-750">
          <div className="text-xs text-gray-400 font-medium">Job ID</div>
          <div className="text-sm font-mono text-green-400 mt-0.5">{record.id}</div>
        </div>

        <div className="px-4 py-4 space-y-3">
          <Row label="Customer" value={record.customer_name} />
          <Row label="Address" value={record.customer_address} />
          <Row label="Technician" value={record.technician_name} />
          <Row label="Visit Date" value={record.visit_date} />
          <Row
            label="System"
            value={`${record.system_size_tons}T ${record.system_type.replace("_", " ")} — ${record.service_type.replace("_", " ")}`}
          />
          <Row label="Urgency" value={record.urgency} capitalize />
          {record.r22_flag && (
            <div className="flex items-center gap-2 pt-1">
              <span className="bg-orange-900/40 text-orange-300 border border-orange-700 text-xs px-2 py-0.5 rounded-full font-medium">
                R-22 System — Refrigerant Phaseout Notice
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Pricing preview */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-400">Estimate Tiers</h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Good", price: record.good_price, tier: record.good_tier },
            { label: "Better", price: record.better_price, tier: record.better_tier },
            { label: "Best", price: record.best_price, tier: record.best_tier },
          ].map(({ label, price, tier }) => (
            <div
              key={label}
              className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-center"
            >
              <div className="text-xs text-gray-400 mb-1">{label}</div>
              <div className="text-xs font-medium text-white leading-tight">{tier.brand}</div>
              <div className="text-xs text-green-400 mt-1 font-semibold">{price}</div>
            </div>
          ))}
        </div>
        {record.good_tier.is_placeholder && (
          <p className="text-xs text-gray-500 text-center">
            Pricing pending Excel integration — owner will finalize before sending to customer
          </p>
        )}
      </div>

      {/* Status */}
      <div className="bg-green-900/20 border border-green-800 rounded-lg px-4 py-3 text-sm text-green-300">
        <span className="font-medium">Status: </span>Estimate Ready — pending owner review
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <Link href="/field">
          <button className="w-full bg-green-700 hover:bg-green-800 text-white font-semibold rounded-lg py-3 text-sm transition-colors">
            Submit Another Job
          </button>
        </Link>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  capitalize,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className={`text-sm text-right ${capitalize ? "capitalize" : ""}`}>{value}</span>
    </div>
  );
}
