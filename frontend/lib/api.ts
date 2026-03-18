import type { JobInput, ProposalResponse, ParsedNotesResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

export const api = {
  // Proposals
  generateProposal: (job: JobInput) =>
    request<ProposalResponse>("/proposals", {
      method: "POST",
      body: JSON.stringify(job),
    }),

  parseNotes: (raw_notes: string) =>
    request<ParsedNotesResponse>("/proposals/parse-notes", {
      method: "POST",
      body: JSON.stringify({ raw_notes }),
    }),

  exportPdf: async (proposal: ProposalResponse): Promise<Blob> => {
    const res = await fetch(`${API_URL}/proposals/export-pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(proposal),
    });
    if (!res.ok) throw new Error("PDF export failed");
    return res.blob();
  },

  // Pricebook
  getEquipment: (system_type?: string) =>
    request<Record<string, unknown>>(
      `/pricebook/equipment${system_type ? `?system_type=${system_type}` : ""}`
    ),
};

export async function downloadPdf(proposal: ProposalResponse) {
  const blob = await api.exportPdf(proposal);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `HVAC_Proposal_${proposal.customer_name.replace(/\s+/g, "_")}_${proposal.visit_date}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
