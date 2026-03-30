"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  Search, Filter, Download, Upload, Plus, Pencil, Trash2,
  Check, X, AlertTriangle, History, FileUp,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { toast } from "sonner";

const BRANDS = ["AMANA", "GOODMAN", "LENNOX", "TRANE", "CARRIER"];

const CATEGORY_LABELS: Record<string, string> = {
  gas_furnace: "Gas Furnaces",
  electric_furnace: "Electric Furnaces / Air Handlers",
  heat_strip_txv: "Heat Strips & TXVs",
  evap_coil: "Evaporator Coils",
  condenser: "Condensers",
};

const BRAND_COLORS: Record<string, string> = {
  AMANA: "bg-blue-100 text-blue-800",
  GOODMAN: "bg-green-100 text-green-800",
  LENNOX: "bg-purple-100 text-purple-800",
  TRANE: "bg-red-100 text-red-800",
  CARRIER: "bg-orange-100 text-orange-800",
};

type CatalogItem = { model: string; dealer_cost: number };
type Catalog = Record<string, Record<string, CatalogItem[]>>;
type FlatItem = { brand: string; category: string; model: string; dealer_cost: number };

// ── Inline edit cell ─────────────────────────────────────────

function EditablePrice({
  item,
  onSave,
}: {
  item: FlatItem;
  onSave: (item: FlatItem, newCost: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(item.dealer_cost));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const save = async () => {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) {
      toast.error("Enter a valid price");
      return;
    }
    await onSave(item, num);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        className="group flex items-center gap-1.5 text-right font-medium w-full justify-end"
        onClick={() => { setValue(String(item.dealer_cost)); setEditing(true); }}
        title="Click to edit"
      >
        ${item.dealer_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 justify-end">
      <span className="text-muted-foreground text-xs">$</span>
      <input
        ref={inputRef}
        type="number"
        step="0.01"
        min="0"
        className="w-24 text-right border rounded px-2 py-1 text-sm"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") setEditing(false); }}
      />
      <button onClick={save} className="text-green-600 hover:text-green-700"><Check className="h-4 w-4" /></button>
      <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
    </div>
  );
}

// ── Add item modal ───────────────────────────────────────────

function AddItemForm({ onAdd, onClose }: { onAdd: () => void; onClose: () => void }) {
  const [brand, setBrand] = useState("AMANA");
  const [category, setCategory] = useState("gas_furnace");
  const [model, setModel] = useState("");
  const [cost, setCost] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!model.trim() || !cost.trim()) { toast.error("Fill in all fields"); return; }
    const num = parseFloat(cost);
    if (isNaN(num) || num <= 0) { toast.error("Enter a valid cost"); return; }
    setSaving(true);
    try {
      await api.addItem(brand, category, model.trim(), num);
      toast.success(`Added ${model.trim()}`);
      onAdd();
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-primary">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add Equipment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium">Brand</label>
            <select className="w-full border rounded-md px-3 py-2 text-sm mt-1" value={brand} onChange={(e) => setBrand(e.target.value)}>
              {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium">Category</label>
            <select className="w-full border rounded-md px-3 py-2 text-sm mt-1" value={category} onChange={(e) => setCategory(e.target.value)}>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium">Model Number</label>
            <Input placeholder="e.g. GMES960403AN" value={model} onChange={(e) => setModel(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-medium">Dealer Cost ($)</label>
            <Input type="number" step="0.01" min="0" placeholder="e.g. 889.00" value={cost} onChange={(e) => setCost(e.target.value)} className="mt-1" />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Adding..." : "Add Item"}</Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Bulk edit panel ──────────────────────────────────────────

function BulkEditPanel({
  brandFilter,
  categoryFilter,
  onApply,
  onClose,
}: {
  brandFilter: string;
  categoryFilter: string;
  onApply: () => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"percent" | "flat">("percent");
  const [value, setValue] = useState("");
  const [preview, setPreview] = useState<{
    total_affected: number;
    changes: Array<{ model: string; brand: string; old_cost: number; new_cost: number; change_pct: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  const brand = brandFilter !== "ALL" ? brandFilter : undefined;
  const category = categoryFilter !== "ALL" ? categoryFilter : undefined;

  const scopeLabel = [
    brand || "All brands",
    category ? (CATEGORY_LABELS[category] || category) : "all categories",
  ].join(", ");

  const handlePreview = async () => {
    const num = parseFloat(value);
    if (isNaN(num) || num === 0) { toast.error("Enter a non-zero value"); return; }
    setLoading(true);
    try {
      const result = await api.bulkAdjustPreview(mode, num, brand, category);
      setPreview(result);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Preview failed");
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    const num = parseFloat(value);
    setApplying(true);
    try {
      const result = await api.bulkAdjustApply(mode, num, brand, category);
      toast.success(`${result.items_updated} items adjusted by ${result.adjustment}`);
      setPreview(null);
      onApply();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Apply failed");
    } finally {
      setApplying(false);
    }
  };

  return (
    <Card className="border-blue-400">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Pencil className="h-4 w-4" /> Bulk Price Adjustment
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Adjusting: <span className="font-medium text-foreground">{scopeLabel}</span>
          {" "}— use the brand/category filters above to narrow the scope
        </div>

        <div className="flex items-end gap-3">
          {/* Mode toggle */}
          <div>
            <label className="text-xs font-medium">Adjustment Type</label>
            <div className="flex rounded-lg border overflow-hidden mt-1">
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  mode === "percent" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                }`}
                onClick={() => { setMode("percent"); setPreview(null); }}
              >
                Percentage (%)
              </button>
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  mode === "flat" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"
                }`}
                onClick={() => { setMode("flat"); setPreview(null); }}
              >
                Dollar Amount ($)
              </button>
            </div>
          </div>

          {/* Value input */}
          <div className="flex-1 max-w-48">
            <label className="text-xs font-medium">
              {mode === "percent" ? "Change (%)" : "Change ($)"}
            </label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                {mode === "percent" ? "%" : "$"}
              </span>
              <Input
                type="number"
                step={mode === "percent" ? "0.1" : "0.01"}
                placeholder={mode === "percent" ? "e.g. 5 or -3" : "e.g. 50 or -25"}
                value={value}
                onChange={(e) => { setValue(e.target.value); setPreview(null); }}
                className="pl-8"
              />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Use negative to decrease prices
            </div>
          </div>

          <Button variant="secondary" onClick={handlePreview} disabled={loading || !value.trim()}>
            {loading ? "Calculating..." : "Preview"}
          </Button>
        </div>

        {/* Preview results */}
        {preview && (
          <div className="space-y-3">
            <div className="flex items-center gap-4 bg-muted/50 rounded-lg p-3">
              <div className="text-center">
                <div className="text-2xl font-bold">{preview.total_affected}</div>
                <div className="text-xs text-muted-foreground">items affected</div>
              </div>
              {preview.changes.length > 0 && (
                <>
                  <div className="h-8 border-l" />
                  <div className="text-sm">
                    <span className="font-medium">
                      {mode === "percent"
                        ? `${parseFloat(value) > 0 ? "+" : ""}${value}% per item`
                        : `${parseFloat(value) > 0 ? "+$" : "-$"}${Math.abs(parseFloat(value)).toFixed(2)} per item`}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Sample of changes */}
            {preview.changes.length > 0 && (
              <div className="max-h-40 overflow-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2">Model</th>
                      <th className="text-left px-3 py-2">Brand</th>
                      <th className="text-right px-3 py-2">Current</th>
                      <th className="text-right px-3 py-2">New</th>
                      <th className="text-right px-3 py-2">Change</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {preview.changes.slice(0, 20).map((c, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5 font-mono">{c.model}</td>
                        <td className="px-3 py-1.5">{c.brand}</td>
                        <td className="px-3 py-1.5 text-right">${c.old_cost.toFixed(2)}</td>
                        <td className="px-3 py-1.5 text-right font-medium">${c.new_cost.toFixed(2)}</td>
                        <td className={`px-3 py-1.5 text-right font-medium ${c.change_pct > 0 ? "text-red-600" : "text-green-600"}`}>
                          {c.change_pct > 0 ? "+" : ""}{c.change_pct}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.changes.length > 20 && (
                  <div className="text-xs text-center text-muted-foreground py-2">
                    ...and {preview.changes.length - 20} more
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setPreview(null)}>Cancel</Button>
              <Button size="sm" onClick={handleApply} disabled={applying || preview.total_affected === 0}>
                {applying ? "Applying..." : `Apply to ${preview.total_affected} Items`}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Import preview modal ─────────────────────────────────────

function ImportPreview({
  preview,
  file,
  onApply,
  onClose,
}: {
  preview: {
    summary: { updates: number; additions: number; errors: number; avg_change_pct: number; price_increases: number; price_decreases: number };
    changes: { updated: Array<{ model: string; brand: string; old_cost: number; new_cost: number; change_pct: number }>; added: Array<{ model: string; brand: string; dealer_cost: number }>; errors: Array<{ row: number; reason: string }> };
  };
  file: File;
  onApply: () => void;
  onClose: () => void;
}) {
  const [applying, setApplying] = useState(false);
  const s = preview.summary;

  const handleApply = async () => {
    setApplying(true);
    try {
      const result = await api.importApply(file);
      toast.success(`Applied: ${result.updated} updated, ${result.added} added`);
      onApply();
    } catch {
      toast.error("Import failed");
    } finally {
      setApplying(false);
    }
  };

  return (
    <Card className="border-amber-400">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileUp className="h-4 w-4" /> Import Preview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-4 gap-3 text-center">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-xl font-bold text-blue-700">{s.updates}</div>
            <div className="text-xs text-blue-600">Price Updates</div>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-xl font-bold text-green-700">{s.additions}</div>
            <div className="text-xs text-green-600">New Items</div>
          </div>
          <div className="bg-amber-50 rounded-lg p-3">
            <div className="text-xl font-bold text-amber-700">{s.errors}</div>
            <div className="text-xs text-amber-600">Errors</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xl font-bold">{s.avg_change_pct > 0 ? "+" : ""}{s.avg_change_pct}%</div>
            <div className="text-xs text-muted-foreground">Avg Change</div>
          </div>
        </div>

        {s.updates > 0 && (
          <div className="text-xs text-muted-foreground">
            {s.price_increases} price increase{s.price_increases !== 1 ? "s" : ""}, {s.price_decreases} decrease{s.price_decreases !== 1 ? "s" : ""}
          </div>
        )}

        {/* Updated items preview */}
        {preview.changes.updated.length > 0 && (
          <div className="max-h-48 overflow-auto border rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2">Model</th>
                  <th className="text-left px-3 py-2">Brand</th>
                  <th className="text-right px-3 py-2">Old</th>
                  <th className="text-right px-3 py-2">New</th>
                  <th className="text-right px-3 py-2">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {preview.changes.updated.slice(0, 50).map((c, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5 font-mono">{c.model}</td>
                    <td className="px-3 py-1.5">{c.brand}</td>
                    <td className="px-3 py-1.5 text-right">${c.old_cost.toFixed(2)}</td>
                    <td className="px-3 py-1.5 text-right font-medium">${c.new_cost.toFixed(2)}</td>
                    <td className={`px-3 py-1.5 text-right font-medium ${c.change_pct > 0 ? "text-red-600" : "text-green-600"}`}>
                      {c.change_pct > 0 ? "+" : ""}{c.change_pct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Errors */}
        {preview.changes.errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
            <div className="text-xs font-medium text-red-700 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Errors (these rows will be skipped)
            </div>
            {preview.changes.errors.slice(0, 5).map((e, i) => (
              <div key={i} className="text-xs text-red-600">Row {e.row}: {e.reason}</div>
            ))}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleApply} disabled={applying}>
            {applying ? "Applying..." : `Apply ${s.updates + s.additions} Changes`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main page ────────────────────────────────────────────────

export default function EquipmentPage() {
  const [catalog, setCatalog] = useState<Catalog>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [showAdd, setShowAdd] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [changelog, setChangelog] = useState<Array<{ timestamp: string; action: string; model?: string; old_cost?: number; new_cost?: number; brand?: string }>>([]);
  const [importPreview, setImportPreview] = useState<{
    summary: { updates: number; additions: number; errors: number; avg_change_pct: number; price_increases: number; price_decreases: number };
    changes: { updated: Array<{ model: string; brand: string; old_cost: number; new_cost: number; change_pct: number }>; added: Array<{ model: string; brand: string; dealer_cost: number }>; errors: Array<{ row: number; reason: string }> };
  } | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadCatalog = useCallback(() => {
    api.getCatalog()
      .then((data) => setCatalog(data as Catalog))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  const searchLower = search.toLowerCase();

  // Build flat list
  const allItems: FlatItem[] = [];
  for (const [brand, categories] of Object.entries(catalog)) {
    if (brandFilter !== "ALL" && brand !== brandFilter) continue;
    for (const [cat, items] of Object.entries(categories)) {
      if (categoryFilter !== "ALL" && cat !== categoryFilter) continue;
      for (const item of items) {
        if (searchLower && !item.model.toLowerCase().includes(searchLower)) continue;
        allItems.push({ brand, category: cat, model: item.model, dealer_cost: item.dealer_cost });
      }
    }
  }

  const totalItems = Object.values(catalog).reduce(
    (sum, cats) => sum + Object.values(cats).reduce((s, items) => s + items.length, 0), 0
  );
  const brandCounts: Record<string, number> = {};
  for (const [brand, cats] of Object.entries(catalog)) {
    brandCounts[brand] = Object.values(cats).reduce((s, items) => s + items.length, 0);
  }

  // Handlers
  const handlePriceEdit = async (item: FlatItem, newCost: number) => {
    try {
      const result = await api.updateItem(item.brand, item.category, item.model, newCost);
      toast.success(`${item.model}: $${result.old_cost} → $${result.new_cost}`);
      loadCatalog();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  };

  const handleDelete = async (item: FlatItem) => {
    if (!confirm(`Delete ${item.model} (${item.brand})?`)) return;
    try {
      await api.deleteItem(item.brand, item.category, item.model);
      toast.success(`Deleted ${item.model}`);
      loadCatalog();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const handleFileImport = async (file: File) => {
    setImportFile(file);
    try {
      const preview = await api.importPreview(file);
      setImportPreview(preview);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not read CSV");
      setImportFile(null);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) {
      handleFileImport(file);
    } else {
      toast.error("Please drop a CSV file");
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragging(false), []);

  const loadChangelog = async () => {
    try {
      const log = await api.getChangelog(50);
      setChangelog(log);
      setShowChangelog(true);
    } catch {
      toast.error("Could not load changelog");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading equipment catalog...</div>
      </div>
    );
  }

  return (
    <div
      className="space-y-6 animate-fade-in"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {/* Drag overlay */}
      {dragging && (
        <div className="fixed inset-0 z-50 bg-primary/10 border-4 border-dashed border-primary rounded-xl flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-xl p-8 shadow-xl text-center">
            <Upload className="h-12 w-12 text-primary mx-auto mb-3" />
            <div className="text-lg font-bold">Drop CSV to import</div>
            <div className="text-sm text-muted-foreground">We'll show you a preview before applying changes</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipment Catalog</h1>
          <p className="text-muted-foreground mt-1">
            {totalItems} items across {Object.keys(catalog).length} brands — click any price to edit
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" className="gap-2" onClick={loadChangelog}>
            <History className="h-4 w-4" /> History
          </Button>
          <a
            href={api.exportUrl(brandFilter !== "ALL" ? brandFilter : undefined, categoryFilter !== "ALL" ? categoryFilter : undefined)}
            className="inline-flex items-center gap-2 border rounded-md px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            <Download className="h-4 w-4" /> Export CSV
          </a>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFileImport(e.target.files[0]); }} />
          <Button variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowBulk(true)}>
            <Pencil className="h-4 w-4" /> Bulk Edit
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" /> Add Item
          </Button>
        </div>
      </div>

      {/* Import preview */}
      {importPreview && importFile && (
        <ImportPreview
          preview={importPreview}
          file={importFile}
          onApply={() => { setImportPreview(null); setImportFile(null); loadCatalog(); }}
          onClose={() => { setImportPreview(null); setImportFile(null); }}
        />
      )}

      {/* Add item form */}
      {showAdd && <AddItemForm onAdd={loadCatalog} onClose={() => setShowAdd(false)} />}

      {/* Bulk edit panel */}
      {showBulk && (
        <BulkEditPanel
          brandFilter={brandFilter}
          categoryFilter={categoryFilter}
          onApply={() => { setShowBulk(false); loadCatalog(); }}
          onClose={() => setShowBulk(false)}
        />
      )}

      {/* Changelog */}
      {showChangelog && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" /> Recent Changes
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowChangelog(false)}><X className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            {changelog.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">No changes recorded yet</div>
            ) : (
              <div className="max-h-64 overflow-auto space-y-1">
                {changelog.map((entry, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs py-1.5 border-b last:border-0">
                    <span className="text-muted-foreground w-36 shrink-0">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {entry.action}
                    </Badge>
                    <span className="font-mono">{entry.model}</span>
                    {entry.brand && <span className="text-muted-foreground">{entry.brand}</span>}
                    {entry.old_cost != null && entry.new_cost != null && (
                      <span>
                        <span className="text-muted-foreground">${entry.old_cost}</span>
                        {" → "}
                        <span className="font-medium">${entry.new_cost}</span>
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Brand cards */}
      <div className="grid grid-cols-5 gap-3">
        {BRANDS.map((brand) => (
          <Card
            key={brand}
            className={`cursor-pointer transition-all ${
              brandFilter === brand ? "ring-2 ring-primary" : "hover:shadow-md"
            }`}
            onClick={() => setBrandFilter(brandFilter === brand ? "ALL" : brand)}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{brandCounts[brand] || 0}</div>
              <div className="text-sm font-medium mt-1">{brand}</div>
              <div className="text-xs text-muted-foreground">items</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by model number..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select className="text-sm border rounded-md px-3 py-2 bg-background" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="ALL">All Categories</option>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        {(brandFilter !== "ALL" || categoryFilter !== "ALL" || search) && (
          <button className="text-sm text-muted-foreground hover:text-foreground" onClick={() => { setBrandFilter("ALL"); setCategoryFilter("ALL"); setSearch(""); }}>
            Clear filters
          </button>
        )}
        <div className="ml-auto text-sm text-muted-foreground">
          Showing {allItems.length} of {totalItems}
        </div>
      </div>

      {/* Equipment table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[600px]">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Model Number</th>
                  <th className="text-left px-4 py-3 font-medium">Brand</th>
                  <th className="text-left px-4 py-3 font-medium">Category</th>
                  <th className="text-right px-4 py-3 font-medium">Dealer Cost</th>
                  <th className="w-10 px-2 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {allItems.slice(0, 200).map((item, i) => (
                  <tr key={`${item.brand}-${item.model}-${i}`} className="hover:bg-muted/30 group">
                    <td className="px-4 py-2.5 font-mono text-xs">{item.model}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className={BRAND_COLORS[item.brand] || ""}>{item.brand}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{CATEGORY_LABELS[item.category] || item.category}</td>
                    <td className="px-4 py-2.5">
                      <EditablePrice item={item} onSave={handlePriceEdit} />
                    </td>
                    <td className="px-2 py-2.5">
                      <button
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-600 transition-all"
                        onClick={() => handleDelete(item)}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {allItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No equipment found matching your filters.</td>
                  </tr>
                )}
                {allItems.length > 200 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-center text-xs text-muted-foreground">
                      Showing first 200 of {allItems.length} results. Use filters or Export CSV to see all.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Drop zone hint */}
      <div className="text-center text-xs text-muted-foreground py-2">
        Drag and drop a CSV file anywhere on this page to import pricing updates
      </div>
    </div>
  );
}
