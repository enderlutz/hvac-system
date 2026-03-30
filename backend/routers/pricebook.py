import csv
import io
import json
from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Query, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from models.job_input import SystemType

router = APIRouter()

_PRICEBOOK_PATH = Path(__file__).parent.parent / "data" / "pricebook.json"
_CHANGELOG_PATH = Path(__file__).parent.parent / "data" / "changelog.json"

with open(_PRICEBOOK_PATH) as _f:
    _PRICEBOOK = json.load(_f)


def _save_pricebook():
    """Write the current pricebook to disk."""
    _PRICEBOOK["_last_updated"] = datetime.now().strftime("%Y-%m-%d")
    with open(_PRICEBOOK_PATH, "w") as f:
        json.dump(_PRICEBOOK, f, indent=2)


def _load_changelog() -> list:
    if _CHANGELOG_PATH.exists():
        return json.loads(_CHANGELOG_PATH.read_text())
    return []


def _save_changelog(log: list):
    # Keep last 500 entries
    with open(_CHANGELOG_PATH, "w") as f:
        json.dump(log[-500:], f, indent=2)


def _log_change(action: str, details: dict):
    log = _load_changelog()
    log.append({
        "timestamp": datetime.now().isoformat(),
        "action": action,
        **details,
    })
    _save_changelog(log)


def _models_in_packages() -> set:
    """Return all model numbers used in system packages."""
    models = set()
    for pkg in _PRICEBOOK.get("system_packages", {}).values():
        for key, val in pkg.items():
            if isinstance(val, dict) and "furnace_model" in val:
                models.add(val["furnace_model"])
                models.add(val["coil_model"])
                models.add(val["condenser_model"])
    return models


class ItemUpdate(BaseModel):
    brand: str
    category: str
    model: str
    new_cost: float


class ItemCreate(BaseModel):
    brand: str
    category: str
    model: str
    dealer_cost: float


class BulkAdjust(BaseModel):
    brand: Optional[str] = None       # None = all brands
    category: Optional[str] = None    # None = all categories
    mode: str                         # "percent" or "flat"
    value: float                      # e.g. 5.0 for +5%, or 50.0 for +$50


class ItemDelete(BaseModel):
    brand: str
    category: str
    model: str

_TONNAGES_ALL     = [1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0]
_TONNAGES_NO_1_5  = [2.0, 2.5, 3.0, 3.5, 4.0, 5.0]
_TONNAGES_LARGE   = [3.0, 3.5, 4.0, 5.0]
_TONNAGES_MINI    = [1.5, 2.0, 2.5, 3.0]

_TIER_BRANDS = {
    tier: cfg["brand_name"]
    for tier, cfg in _PRICEBOOK["tier_brands"]["brand"].items()
    if not tier.startswith("_")
}

_EQUIPMENT = {
    "split":        {"tonnage_options": _TONNAGES_ALL,    "brands": _TIER_BRANDS},
    "heat_pump":    {"tonnage_options": _TONNAGES_ALL,    "brands": _TIER_BRANDS},
    "package_unit": {"tonnage_options": _TONNAGES_NO_1_5, "brands": _TIER_BRANDS},
    "mini_split":   {"tonnage_options": _TONNAGES_MINI,   "brands": _TIER_BRANDS},
    "commercial":   {"tonnage_options": _TONNAGES_LARGE,  "brands": _TIER_BRANDS},
}


@router.get("/equipment")
def get_equipment(system_type: SystemType = None):
    if system_type:
        data = _EQUIPMENT.get(system_type.value)
        if not data:
            return {"error": "System type not found"}
        return {system_type.value: data}
    return _EQUIPMENT


@router.get("/catalog")
def get_catalog(brand: Optional[str] = Query(None)):
    """Return the full equipment catalog, optionally filtered by brand."""
    catalog = _PRICEBOOK.get("equipment_catalog", {})
    if brand:
        brand_upper = brand.upper()
        if brand_upper in catalog:
            return {brand_upper: catalog[brand_upper]}
        return {"error": f"Brand '{brand}' not found"}
    return catalog


@router.get("/packages")
def get_packages():
    """Return all system packages with tier pricing."""
    packages = _PRICEBOOK.get("system_packages", {})
    result = {}
    for key, pkg in packages.items():
        meta = {k: v for k, v in pkg.items() if k.startswith("_")}
        tonnages = {}
        for k, v in pkg.items():
            if not k.startswith("_") and isinstance(v, dict):
                tonnages[k] = v
        result[key] = {**meta, "tonnages": tonnages}
    return result


@router.get("/materials")
def get_materials(category: Optional[str] = Query(None)):
    """Return the materials catalog, optionally filtered by category."""
    catalog = _PRICEBOOK.get("materials_catalog", {})
    if category:
        if category in catalog:
            return {category: catalog[category]}
        return {"error": f"Category '{category}' not found", "available": list(catalog.keys())}
    return catalog


# ── Single item CRUD ──────────────────────────────────────────

@router.patch("/item")
def update_item(body: ItemUpdate):
    """Update a single item's dealer cost."""
    catalog = _PRICEBOOK.setdefault("equipment_catalog", {})
    brand = body.brand.upper()
    if brand not in catalog:
        raise HTTPException(404, f"Brand '{brand}' not found")
    if body.category not in catalog[brand]:
        raise HTTPException(404, f"Category '{body.category}' not in {brand}")

    for item in catalog[brand][body.category]:
        if item["model"] == body.model:
            old_cost = item["dealer_cost"]
            item["dealer_cost"] = round(body.new_cost, 2)
            _save_pricebook()
            _log_change("update", {
                "brand": brand, "category": body.category,
                "model": body.model, "old_cost": old_cost, "new_cost": body.new_cost,
            })
            return {"status": "updated", "model": body.model, "old_cost": old_cost, "new_cost": body.new_cost}

    raise HTTPException(404, f"Model '{body.model}' not found in {brand}/{body.category}")


@router.post("/item")
def add_item(body: ItemCreate):
    """Add a new equipment item."""
    catalog = _PRICEBOOK.setdefault("equipment_catalog", {})
    brand = body.brand.upper()
    catalog.setdefault(brand, {}).setdefault(body.category, [])

    # Check for duplicate
    for item in catalog[brand][body.category]:
        if item["model"] == body.model:
            raise HTTPException(409, f"Model '{body.model}' already exists in {brand}/{body.category}")

    catalog[brand][body.category].append({
        "model": body.model,
        "dealer_cost": round(body.dealer_cost, 2),
    })
    _save_pricebook()
    _log_change("add", {
        "brand": brand, "category": body.category,
        "model": body.model, "dealer_cost": body.dealer_cost,
    })
    return {"status": "added", "model": body.model}


@router.delete("/item")
def delete_item(body: ItemDelete):
    """Delete an equipment item. Blocks if model is used in a system package."""
    protected = _models_in_packages()
    if body.model in protected:
        raise HTTPException(
            400,
            f"Cannot delete '{body.model}' — it is used in a system package. "
            "Remove it from the package first.",
        )

    catalog = _PRICEBOOK.get("equipment_catalog", {})
    brand = body.brand.upper()
    if brand not in catalog or body.category not in catalog[brand]:
        raise HTTPException(404, f"Brand/category not found")

    before = len(catalog[brand][body.category])
    catalog[brand][body.category] = [
        item for item in catalog[brand][body.category] if item["model"] != body.model
    ]
    if len(catalog[brand][body.category]) == before:
        raise HTTPException(404, f"Model '{body.model}' not found")

    _save_pricebook()
    _log_change("delete", {"brand": brand, "category": body.category, "model": body.model})
    return {"status": "deleted", "model": body.model}


# ── Bulk adjust ───────────────────────────────────────────────

@router.post("/bulk-adjust/preview")
def bulk_adjust_preview(body: BulkAdjust):
    """Preview a bulk price adjustment without saving."""
    if body.mode not in ("percent", "flat"):
        raise HTTPException(400, "mode must be 'percent' or 'flat'")

    catalog = _PRICEBOOK.get("equipment_catalog", {})
    changes = []

    for b, cats in catalog.items():
        if body.brand and b.upper() != body.brand.upper():
            continue
        for cat, items in cats.items():
            if body.category and cat != body.category:
                continue
            for item in items:
                old = item["dealer_cost"]
                if body.mode == "percent":
                    new = round(old * (1 + body.value / 100), 2)
                else:
                    new = round(old + body.value, 2)
                if new < 0:
                    new = 0.0
                if abs(new - old) > 0.001:
                    pct = round(((new - old) / old) * 100, 1) if old > 0 else 0.0
                    changes.append({
                        "brand": b, "category": cat, "model": item["model"],
                        "old_cost": old, "new_cost": new, "change_pct": pct,
                    })

    return {
        "total_affected": len(changes),
        "mode": body.mode,
        "value": body.value,
        "changes": changes,
    }


@router.post("/bulk-adjust/apply")
def bulk_adjust_apply(body: BulkAdjust):
    """Apply a bulk price adjustment."""
    if body.mode not in ("percent", "flat"):
        raise HTTPException(400, "mode must be 'percent' or 'flat'")

    catalog = _PRICEBOOK.get("equipment_catalog", {})
    count = 0

    for b, cats in catalog.items():
        if body.brand and b.upper() != body.brand.upper():
            continue
        for cat, items in cats.items():
            if body.category and cat != body.category:
                continue
            for item in items:
                old = item["dealer_cost"]
                if body.mode == "percent":
                    new = round(old * (1 + body.value / 100), 2)
                else:
                    new = round(old + body.value, 2)
                if new < 0:
                    new = 0.0
                if abs(new - old) > 0.001:
                    item["dealer_cost"] = new
                    _log_change("bulk_adjust", {
                        "brand": b, "category": cat, "model": item["model"],
                        "old_cost": old, "new_cost": new,
                        "adjust_mode": body.mode, "adjust_value": body.value,
                    })
                    count += 1

    _save_pricebook()
    label = f"{body.value:+.1f}%" if body.mode == "percent" else f"${body.value:+.2f}"
    return {"status": "applied", "items_updated": count, "adjustment": label}


# ── Export CSV ────────────────────────────────────────────────

@router.get("/export")
def export_csv(brand: Optional[str] = Query(None), category: Optional[str] = Query(None)):
    """Export equipment catalog as CSV download."""
    catalog = _PRICEBOOK.get("equipment_catalog", {})
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["brand", "category", "model", "dealer_cost"])

    for b, cats in sorted(catalog.items()):
        if brand and b.upper() != brand.upper():
            continue
        for cat, items in sorted(cats.items()):
            if category and cat != category:
                continue
            for item in items:
                writer.writerow([b, cat, item["model"], item["dealer_cost"]])

    output.seek(0)
    timestamp = datetime.now().strftime("%Y%m%d")
    filename = f"equipment_catalog_{timestamp}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Import CSV (preview + apply) ─────────────────────────────

@router.post("/import/preview")
async def import_preview(file: UploadFile = File(...)):
    """Parse an uploaded CSV and return a diff preview without saving."""
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    required = {"brand", "category", "model", "dealer_cost"}
    if not required.issubset(set(reader.fieldnames or [])):
        raise HTTPException(400, f"CSV must have columns: {', '.join(sorted(required))}")

    catalog = _PRICEBOOK.get("equipment_catalog", {})
    changes = {"updated": [], "added": [], "errors": []}

    for row_num, row in enumerate(reader, start=2):
        brand = (row.get("brand") or "").strip().upper()
        category = (row.get("category") or "").strip()
        model = (row.get("model") or "").strip()
        cost_str = (row.get("dealer_cost") or "").strip()

        if not all([brand, category, model, cost_str]):
            changes["errors"].append({"row": row_num, "reason": "Missing required field", "data": row})
            continue
        try:
            new_cost = round(float(cost_str), 2)
        except ValueError:
            changes["errors"].append({"row": row_num, "reason": f"Invalid cost: {cost_str}", "data": row})
            continue

        # Check if exists
        found = False
        if brand in catalog and category in catalog[brand]:
            for item in catalog[brand][category]:
                if item["model"] == model:
                    found = True
                    if abs(item["dealer_cost"] - new_cost) > 0.001:
                        pct = ((new_cost - item["dealer_cost"]) / item["dealer_cost"]) * 100
                        changes["updated"].append({
                            "brand": brand, "category": category, "model": model,
                            "old_cost": item["dealer_cost"], "new_cost": new_cost,
                            "change_pct": round(pct, 1),
                        })
                    break

        if not found:
            changes["added"].append({
                "brand": brand, "category": category, "model": model, "dealer_cost": new_cost,
            })

    # Summary stats
    avg_change = 0
    if changes["updated"]:
        avg_change = round(sum(c["change_pct"] for c in changes["updated"]) / len(changes["updated"]), 1)
    increases = sum(1 for c in changes["updated"] if c["change_pct"] > 0)
    decreases = sum(1 for c in changes["updated"] if c["change_pct"] < 0)

    return {
        "summary": {
            "total_rows": row_num - 1 if 'row_num' in dir() else 0,
            "updates": len(changes["updated"]),
            "additions": len(changes["added"]),
            "errors": len(changes["errors"]),
            "avg_change_pct": avg_change,
            "price_increases": increases,
            "price_decreases": decreases,
        },
        "changes": changes,
    }


@router.post("/import/apply")
async def import_apply(file: UploadFile = File(...)):
    """Parse CSV and apply all changes to pricebook."""
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    catalog = _PRICEBOOK.setdefault("equipment_catalog", {})
    applied = {"updated": 0, "added": 0, "errors": 0}

    for row in reader:
        brand = (row.get("brand") or "").strip().upper()
        category = (row.get("category") or "").strip()
        model = (row.get("model") or "").strip()
        cost_str = (row.get("dealer_cost") or "").strip()

        if not all([brand, category, model, cost_str]):
            applied["errors"] += 1
            continue
        try:
            new_cost = round(float(cost_str), 2)
        except ValueError:
            applied["errors"] += 1
            continue

        catalog.setdefault(brand, {}).setdefault(category, [])

        found = False
        for item in catalog[brand][category]:
            if item["model"] == model:
                old_cost = item["dealer_cost"]
                if abs(old_cost - new_cost) > 0.001:
                    item["dealer_cost"] = new_cost
                    _log_change("import_update", {
                        "brand": brand, "category": category,
                        "model": model, "old_cost": old_cost, "new_cost": new_cost,
                    })
                    applied["updated"] += 1
                found = True
                break

        if not found:
            catalog[brand][category].append({"model": model, "dealer_cost": new_cost})
            _log_change("import_add", {
                "brand": brand, "category": category, "model": model, "dealer_cost": new_cost,
            })
            applied["added"] += 1

    _save_pricebook()
    return {"status": "applied", **applied}


# ── Changelog ─────────────────────────────────────────────────

@router.get("/changelog")
def get_changelog(limit: int = Query(50, le=500)):
    """Return recent change log entries."""
    log = _load_changelog()
    return log[-limit:][::-1]  # newest first
