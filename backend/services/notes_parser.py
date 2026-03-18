"""
Raw Notes Parser — Phase 3

Uses pattern matching and keyword rules (no AI/LLM) to extract structured
field values from free-form technician notes.

Each extractor returns a ParsedNotesField with:
  value      — extracted string value (None if not found)
  confidence — "high" | "medium" | "low"
  source_text — the snippet that triggered the match
"""

import re
from models.proposal import ParsedNotesField, ParsedNotesResponse

# Known HVAC equipment brands for make detection
KNOWN_BRANDS = [
    "trane", "carrier", "lennox", "goodman", "rheem", "ruud", "york",
    "amana", "bryant", "heil", "icp", "comfortmaker", "tempstar",
    "american standard", "daikin", "mitsubishi", "fujitsu", "lg",
    "bosch", "armstrong", "coleman", "ducane",
]

# Valid tonnage values the form accepts
VALID_TONS = {1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 5.0}


def parse_notes(raw_notes: str) -> ParsedNotesResponse:
    text = raw_notes.lower()
    result = ParsedNotesResponse()

    result.system_size_tons   = _extract_tonnage(text, raw_notes)
    result.system_type        = _extract_system_type(text, raw_notes)
    result.service_type       = _extract_service_type(text, raw_notes)
    result.existing_refrigerant = _extract_refrigerant(text, raw_notes)
    result.access_difficulty  = _extract_access(text, raw_notes)
    result.permit_required    = _extract_permit(text, raw_notes)
    result.urgency            = _extract_urgency(text, raw_notes)
    result.lineset_replacement = _extract_lineset(text, raw_notes)
    result.electrical_work    = _extract_electrical(text, raw_notes)
    result.ductwork_needed    = _extract_ductwork(text, raw_notes)
    result.equipment_make     = _extract_equipment_make(text, raw_notes)
    result.equipment_age      = _extract_equipment_age(text, raw_notes)
    result.customer_name      = _extract_customer_name(text, raw_notes)
    result.technician_name    = _extract_technician_name(text, raw_notes)

    if result.existing_refrigerant and result.existing_refrigerant.value == "R-22":
        result.r22_flag = True

    # If service_type is replacement and permit wasn't explicitly denied, flag it
    if (result.service_type and result.service_type.value == "replacement"
            and result.permit_required and result.permit_required.value != "false"):
        result.permit_required = ParsedNotesField(
            value="true", confidence="high", source_text="auto: replacement"
        )

    return result


# ────────────────────────────────────────────────────────────
# Tonnage
# ────────────────────────────────────────────────────────────

def _extract_tonnage(text: str, raw: str) -> ParsedNotesField:
    """
    Handles: 3.5 ton | 3.5t | 3-ton | 4T | 3 1/2 ton | 2½ ton
    Snaps to the nearest valid tonnage value.
    """
    patterns = [
        r'(\d+)\s+1/2\s*ton',               # 3 1/2 ton  — must come before generic pattern
        r'(\d+)\s*½\s*ton',                 # 3½ ton     — must come before generic pattern
        r'(\d+\.?\d*)\s*-?\s*ton',          # 3.5 ton, 3-ton
        r'(\d+\.?\d*)\s*t\b',               # 3.5t, 4T
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            raw_val = match.group(1)
            # Handle "3 1/2" as "3.5"
            if '1/2' in match.group(0) or '½' in match.group(0):
                raw_val = str(int(raw_val) + 0.5)
            try:
                tons = float(raw_val)
                # Snap to closest valid value
                snapped = min(VALID_TONS, key=lambda v: abs(v - tons))
                confidence = "high" if snapped == tons else "medium"
                return ParsedNotesField(
                    value=str(snapped),
                    confidence=confidence,
                    source_text=match.group(0),
                )
            except ValueError:
                continue
    return ParsedNotesField(value=None, confidence="low")


# ────────────────────────────────────────────────────────────
# System Type
# ────────────────────────────────────────────────────────────

def _extract_system_type(text: str, raw: str) -> ParsedNotesField:
    # Order matters — check most specific first
    mappings = [
        (["mini split", "mini-split", "ductless", "minisplit"], "mini_split"),
        (["heat pump", "heatpump", " hp ", "hp system"], "heat_pump"),
        (["package unit", "pkg unit", "packaged unit", "pkg system", "rooftop unit", "rtu"], "package_unit"),
        (["commercial"], "commercial"),
        (["split system"], "split"),
        (["split"], "split"),
    ]
    for keywords, value in mappings:
        for kw in keywords:
            if kw in text:
                return ParsedNotesField(value=value, confidence="high", source_text=kw)
    return ParsedNotesField(value=None, confidence="low")


# ────────────────────────────────────────────────────────────
# Service Type
# ────────────────────────────────────────────────────────────

def _extract_service_type(text: str, raw: str) -> ParsedNotesField:
    high_replacement = ["full replacement", "complete replacement", "replace system",
                        "full replace", "system replacement", "full r&r"]
    med_replacement  = ["replacement", "replace", "swap out", "change out", "changeout"]
    new_install      = ["new install", "new construction", "new build", "new system",
                        "add-on", "add on", "addition"]
    repair_keywords  = ["repair", "fix", "service call", "no cool", "not cooling",
                        "not heating", "broken", "failed", "failure"]

    for kw in high_replacement:
        if kw in text:
            return ParsedNotesField(value="replacement", confidence="high", source_text=kw)
    for kw in new_install:
        if kw in text:
            return ParsedNotesField(value="new_install", confidence="high", source_text=kw)
    for kw in repair_keywords:
        if kw in text:
            return ParsedNotesField(value="repair", confidence="high", source_text=kw)
    for kw in med_replacement:
        if kw in text:
            return ParsedNotesField(value="replacement", confidence="medium", source_text=kw)
    return ParsedNotesField(value=None, confidence="low")


# ────────────────────────────────────────────────────────────
# Refrigerant
# ────────────────────────────────────────────────────────────

def _extract_refrigerant(text: str, raw: str) -> ParsedNotesField:
    if any(k in text for k in ["r-22", "r22", "freon", "r 22", "r22a"]):
        return ParsedNotesField(value="R-22", confidence="high", source_text="R-22")
    if any(k in text for k in ["r-410a", "r410a", "r410", "puron", "r 410"]):
        return ParsedNotesField(value="R-410A", confidence="high", source_text="R-410A")
    if any(k in text for k in ["r-32", "r32", "r 32"]):
        return ParsedNotesField(value="R-32", confidence="high", source_text="R-32")
    return ParsedNotesField(value=None, confidence="low")


# ────────────────────────────────────────────────────────────
# Access Difficulty
# ────────────────────────────────────────────────────────────

def _extract_access(text: str, raw: str) -> ParsedNotesField:
    if any(k in text for k in ["rooftop", "roof top", "on the roof", "rtu"]):
        return ParsedNotesField(value="rooftop", confidence="high", source_text="rooftop")
    if any(k in text for k in ["attic", "attic install", "attic unit", "attic space"]):
        return ParsedNotesField(value="attic", confidence="high", source_text="attic")
    if any(k in text for k in ["tight", "restricted", "crawl space", "crawlspace",
                                "tight space", "hard to reach", "difficult access"]):
        return ParsedNotesField(value="tight", confidence="medium", source_text="tight/restricted")
    # Only return standard if another strong signal existed — otherwise leave None
    return ParsedNotesField(value=None, confidence="low")


# ────────────────────────────────────────────────────────────
# Permit
# ────────────────────────────────────────────────────────────

def _extract_permit(text: str, raw: str) -> ParsedNotesField:
    no_permit = ["no permit", "no permits", "permit not required", "permit waived",
                 "no permit needed", "without permit"]
    yes_permit = ["permit needed", "permit required", "pull permit", "needs permit",
                  "permit pulled", "city permit", "county permit"]

    for kw in no_permit:
        if kw in text:
            return ParsedNotesField(value="false", confidence="high", source_text=kw)
    for kw in yes_permit:
        if kw in text:
            return ParsedNotesField(value="true", confidence="high", source_text=kw)
    return ParsedNotesField(value=None, confidence="low")


# ────────────────────────────────────────────────────────────
# Urgency
# ────────────────────────────────────────────────────────────

def _extract_urgency(text: str, raw: str) -> ParsedNotesField:
    urgent_kw = ["asap", "urgent", "emergency", "no cooling", "no heat", "no ac",
                 "no air", "sweltering", "it's hot", "its hot", "no cool", "not working",
                 "down", "out completely", "completely out"]
    soon_kw = ["soon", "this week", "few days", "couple days", "within the week",
               "not urgent but soon", "next few days"]

    for kw in urgent_kw:
        if kw in text:
            return ParsedNotesField(value="urgent", confidence="high", source_text=kw)
    for kw in soon_kw:
        if kw in text:
            return ParsedNotesField(value="soon", confidence="medium", source_text=kw)
    return ParsedNotesField(value="routine", confidence="low")


# ────────────────────────────────────────────────────────────
# Lineset
# ────────────────────────────────────────────────────────────

def _extract_lineset(text: str, raw: str) -> ParsedNotesField:
    yes_kw = ["new lineset", "lineset needed", "replace lineset", "lineset replacement",
              "needs lineset", "lineset required", "run new line", "new line set"]
    for kw in yes_kw:
        if kw in text:
            return ParsedNotesField(value="true", confidence="high", source_text=kw)
    return ParsedNotesField(value=None, confidence="low")


# ────────────────────────────────────────────────────────────
# Electrical Work
# ────────────────────────────────────────────────────────────

def _extract_electrical(text: str, raw: str) -> ParsedNotesField:
    yes_kw = ["electrical work", "electrical needed", "new circuit", "breaker",
              "disconnect", "new disconnect", "electrical upgrade", "panel upgrade",
              "wiring needed", "rewire", "electrical required", "elec work"]
    for kw in yes_kw:
        if kw in text:
            return ParsedNotesField(value="true", confidence="high", source_text=kw)
    return ParsedNotesField(value=None, confidence="low")


# ────────────────────────────────────────────────────────────
# Ductwork
# ────────────────────────────────────────────────────────────

def _extract_ductwork(text: str, raw: str) -> ParsedNotesField:
    yes_kw = ["ductwork", "duct work", "new ducts", "duct replacement", "duct repair",
              "duct sealing", "flex duct", "rigid duct", "duct needed", "duct issues",
              "leaky ducts", "duct upgrade"]
    for kw in yes_kw:
        if kw in text:
            return ParsedNotesField(value="true", confidence="high", source_text=kw)
    return ParsedNotesField(value=None, confidence="low")


# ────────────────────────────────────────────────────────────
# Equipment Make
# ────────────────────────────────────────────────────────────

def _extract_equipment_make(text: str, raw: str) -> ParsedNotesField:
    # Check for "existing: brand" or "old unit: brand" patterns first
    prefix_pattern = r'(?:existing|old unit|current unit|has a|have a|old)\s*:?\s*([a-z]+)'
    match = re.search(prefix_pattern, text)
    if match:
        candidate = match.group(1)
        if candidate in KNOWN_BRANDS:
            return ParsedNotesField(
                value=candidate.title(),
                confidence="high",
                source_text=match.group(0),
            )

    # Fall back to scanning for any known brand
    for brand in KNOWN_BRANDS:
        if brand in text:
            # Avoid false positives — only match if it's a standalone word/phrase
            pattern = r'\b' + re.escape(brand) + r'\b'
            if re.search(pattern, text):
                return ParsedNotesField(
                    value=brand.title(),
                    confidence="medium",
                    source_text=brand,
                )
    return ParsedNotesField(value=None, confidence="low")


# ────────────────────────────────────────────────────────────
# Equipment Age
# ────────────────────────────────────────────────────────────

def _extract_equipment_age(text: str, raw: str) -> ParsedNotesField:
    patterns = [
        (r'(\d+)\s*(?:year|yr)s?\s*old', "high"),                     # "12 years old"
        (r'(\d+)\s*(?:year|yr)s?\s*(?:unit|system|equipment)', "high"),# "10 year old unit"
        (r'installed\s*(?:in\s*)?(\d{4})', "high"),                    # "installed in 2010"
        (r'(?:age|aged)\s*:?\s*(\d+)', "high"),                        # "age: 15"
        (r'(\d+)\s*-\s*(?:year|yr)', "medium"),                        # "12-year"
    ]
    current_year = 2026
    for pattern, confidence in patterns:
        match = re.search(pattern, text)
        if match:
            val = match.group(1)
            # If it looks like a year, convert to age
            if len(val) == 4 and int(val) < current_year:
                age = current_year - int(val)
                return ParsedNotesField(
                    value=str(age),
                    confidence=confidence,
                    source_text=match.group(0),
                )
            return ParsedNotesField(
                value=val,
                confidence=confidence,
                source_text=match.group(0),
            )
    return ParsedNotesField(value=None, confidence="low")


# ────────────────────────────────────────────────────────────
# Customer Name
# ────────────────────────────────────────────────────────────

def _extract_customer_name(text: str, raw: str) -> ParsedNotesField:
    """
    Looks for explicit labels like "customer: John Smith" or "homeowner: Jane Doe".
    Uses the original (un-lowercased) raw text to preserve capitalization.
    """
    pattern = r'(?:customer|homeowner|client|home ?owner)\s*:?\s*([A-Z][a-z]+(?:[^\S\n]+[A-Z][a-z]+){0,3})'
    match = re.search(pattern, raw, re.IGNORECASE)
    if match:
        return ParsedNotesField(
            value=match.group(1).strip(),
            confidence="high",
            source_text=match.group(0),
        )
    return ParsedNotesField(value=None, confidence="low")


# ────────────────────────────────────────────────────────────
# Technician Name
# ────────────────────────────────────────────────────────────

def _extract_technician_name(text: str, raw: str) -> ParsedNotesField:
    pattern = r'(?:tech|technician|by|submitted by)\s*:?\s*([A-Z][a-z]+(?:[^\S\n]+[A-Z][a-z]+)?)'
    match = re.search(pattern, raw, re.IGNORECASE)
    if match:
        return ParsedNotesField(
            value=match.group(1).strip(),
            confidence="high",
            source_text=match.group(0),
        )
    return ParsedNotesField(value=None, confidence="low")
