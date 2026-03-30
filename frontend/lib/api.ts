import type { JobInput, ProposalResponse, ParsedNotesResponse, ProposalRecord } from "./types";

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

  // Pipeline
  pipeline: {
    submit: (job: JobInput) =>
      request<ProposalRecord>("/pipeline/proposals", {
        method: "POST",
        body: JSON.stringify(job),
      }),

    list: (stage?: string, search?: string) => {
      const params = new URLSearchParams();
      if (stage) params.set("stage", stage);
      if (search) params.set("search", search);
      const qs = params.toString();
      return request<ProposalRecord[]>(`/pipeline/proposals${qs ? `?${qs}` : ""}`);
    },

    get: (id: string) =>
      request<ProposalRecord>(`/pipeline/proposals/${id}`),

    updateStage: (id: string, stage: string) =>
      request<ProposalRecord>(`/pipeline/proposals/${id}/stage`, {
        method: "PATCH",
        body: JSON.stringify({ stage }),
      }),

    approve: (id: string, notes?: string) =>
      request<ProposalRecord>(`/pipeline/proposals/${id}/approve`, {
        method: "PATCH",
        body: JSON.stringify({ notes }),
      }),

    reject: (id: string, notes: string) =>
      request<ProposalRecord>(`/pipeline/proposals/${id}/reject`, {
        method: "PATCH",
        body: JSON.stringify({ notes }),
      }),

    updateNotes: (id: string, notes: string) =>
      request<ProposalRecord>(`/pipeline/proposals/${id}/notes`, {
        method: "PATCH",
        body: JSON.stringify({ notes }),
      }),
  },

  // Pricebook
  getEquipment: (system_type?: string) =>
    request<Record<string, unknown>>(
      `/pricebook/equipment${system_type ? `?system_type=${system_type}` : ""}`
    ),

  getCatalog: (brand?: string) =>
    request<Record<string, Record<string, Array<{ model: string; dealer_cost: number }>>>>(
      `/pricebook/catalog${brand ? `?brand=${brand}` : ""}`
    ),

  getPackages: () =>
    request<Record<string, unknown>>("/pricebook/packages"),

  getMaterials: (category?: string) =>
    request<Record<string, Array<{ part_num: string; description: string; unit_cost: number }>>>(
      `/pricebook/materials${category ? `?category=${category}` : ""}`
    ),

  updateItem: (brand: string, category: string, model: string, new_cost: number) =>
    request<{ status: string; old_cost: number; new_cost: number }>("/pricebook/item", {
      method: "PATCH",
      body: JSON.stringify({ brand, category, model, new_cost }),
    }),

  addItem: (brand: string, category: string, model: string, dealer_cost: number) =>
    request<{ status: string }>("/pricebook/item", {
      method: "POST",
      body: JSON.stringify({ brand, category, model, dealer_cost }),
    }),

  deleteItem: (brand: string, category: string, model: string) =>
    request<{ status: string }>("/pricebook/item", {
      method: "DELETE",
      body: JSON.stringify({ brand, category, model }),
    }),

  importPreview: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_URL}/pricebook/import/preview`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Import failed");
    return res.json();
  },

  importApply: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_URL}/pricebook/import/apply`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || "Import failed");
    return res.json();
  },

  getChangelog: (limit = 50) =>
    request<Array<{ timestamp: string; action: string; [key: string]: unknown }>>(
      `/pricebook/changelog?limit=${limit}`
    ),

  bulkAdjustPreview: (mode: "percent" | "flat", value: number, brand?: string, category?: string) =>
    request<{ total_affected: number; changes: Array<{ model: string; brand: string; old_cost: number; new_cost: number; change_pct: number }> }>(
      "/pricebook/bulk-adjust/preview", {
        method: "POST",
        body: JSON.stringify({ mode, value, brand: brand || null, category: category || null }),
      }
    ),

  bulkAdjustApply: (mode: "percent" | "flat", value: number, brand?: string, category?: string) =>
    request<{ status: string; items_updated: number; adjustment: string }>(
      "/pricebook/bulk-adjust/apply", {
        method: "POST",
        body: JSON.stringify({ mode, value, brand: brand || null, category: category || null }),
      }
    ),

  exportUrl: (brand?: string, category?: string) => {
    const params = new URLSearchParams();
    if (brand) params.set("brand", brand);
    if (category) params.set("category", category);
    const qs = params.toString();
    return `${API_URL}/pricebook/export${qs ? `?${qs}` : ""}`;
  },
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
