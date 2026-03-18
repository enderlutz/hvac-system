"""
PDF Builder — Phase 4

Generates a branded, customer-facing proposal PDF using fpdf2.
No system dependencies required.
"""

from fpdf import FPDF, XPos, YPos
from models.proposal import ProposalResponse, TierOption

# ── Brand colors (R, G, B) ──────────────────────────────────
PRIMARY      = (26,  95, 142)   # #1a5f8e  deep blue
ACCENT       = (232, 160,  32)  # #e8a020  gold
GOOD_COLOR   = (74, 124,  89)   # #4a7c59  green
BETTER_COLOR = (37,  99, 168)   # #2563a8  blue
BEST_COLOR   = (192,  57,  43)  # #c0392b  red
LIGHT_GRAY   = (245, 246, 249)
MID_GRAY     = (180, 185, 195)
TEXT_LIGHT   = (90, 100, 120)
WHITE        = (255, 255, 255)
BLACK        = (26,  30,  46)

TIER_COLORS = {
    "Good":   GOOD_COLOR,
    "Better": BETTER_COLOR,
    "Best":   BEST_COLOR,
}


class ProposalPDF(FPDF):
    def __init__(self, proposal: ProposalResponse):
        super().__init__(orientation="L", unit="mm", format="A4")
        self.proposal = proposal
        self.set_auto_page_break(auto=True, margin=15)
        self.set_margins(15, 15, 15)

    def header(self):
        # Logo placeholder bar
        self.set_fill_color(*PRIMARY)
        self.rect(0, 0, self.w, 18, "F")
        self.set_y(3)
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(*WHITE)
        self.cell(0, 8, "[ Company Logo ] - HVAC Proposal", align="L",
                  new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_text_color(*BLACK)
        self.ln(4)

    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*TEXT_LIGHT)
        self.cell(0, 6, f"Proposal ID: {self.proposal.proposal_id}   |   Page {self.page_no()}", align="C")
        self.set_text_color(*BLACK)

    # ── Helpers ───────────────────────────────────────────────

    def h_rule(self, color=MID_GRAY):
        self.set_draw_color(*color)
        self.set_line_width(0.3)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(2)

    def section_label(self, text: str):
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(*TEXT_LIGHT)
        self.cell(0, 5, text.upper(), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_text_color(*BLACK)

    def kv(self, label: str, value: str, w_label=45):
        self.set_font("Helvetica", "B", 9)
        self.cell(w_label, 5, label + ":", new_x=XPos.RIGHT, new_y=YPos.TOP)
        self.set_font("Helvetica", "", 9)
        self.cell(0, 5, value or "-", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    # ── Proposal header block ─────────────────────────────────

    def proposal_header(self):
        p = self.proposal
        self.set_fill_color(*LIGHT_GRAY)
        self.rect(self.l_margin, self.get_y(), self.w - self.l_margin - self.r_margin, 30, "F")
        self.ln(2)

        col_w = (self.w - self.l_margin - self.r_margin) / 2
        y_start = self.get_y()

        # Left column
        self.set_x(self.l_margin + 3)
        self.kv("Customer", p.customer_name)
        self.set_x(self.l_margin + 3)
        self.kv("Address",  p.customer_address)
        self.set_x(self.l_margin + 3)
        self.kv("System",   f"{p.system_size_tons}-ton {_fmt(p.system_type)} - {_fmt(p.service_type)}")

        # Right column
        self.set_xy(self.l_margin + col_w, y_start)
        self.kv("Technician", p.technician_name)
        self.set_xy(self.l_margin + col_w, self.get_y())
        self.kv("Date",       p.visit_date)

        self.set_y(y_start + 32)

    # ── Warning banners ───────────────────────────────────────

    def warning_banners(self):
        p = self.proposal
        if p.r22_warning:
            self._banner(
                "R-22 REFRIGERANT ALERT",
                "The existing system uses R-22 (Freon), which is no longer manufactured. "
                "Full system replacement is strongly recommended.",
                ACCENT,
            )
        if p.seer2_compliance_note:
            self._banner(
                "TEXAS SEER2 COMPLIANCE",
                "All systems meet or exceed the Texas minimum of 15 SEER2 for new installations.",
                PRIMARY,
            )
        if p.permit_required:
            self._banner(
                "PERMIT INCLUDED",
                "A permit application is included in this proposal, as required for full replacements "
                "in the Houston metro area.",
                GOOD_COLOR,
            )

    def _banner(self, title: str, body: str, color):
        self.set_fill_color(*color)
        self.set_text_color(*WHITE)
        x = self.l_margin
        w = self.w - self.l_margin - self.r_margin
        y = self.get_y()
        self.rect(x, y, w, 12, "F")
        self.set_xy(x + 3, y + 1.5)
        self.set_font("Helvetica", "B", 8)
        self.cell(30, 4.5, title + ": ", new_x=XPos.RIGHT, new_y=YPos.TOP)
        self.set_font("Helvetica", "", 8)
        self.cell(w - 33, 4.5, body, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_text_color(*BLACK)
        self.ln(2)

    # ── Three-tier comparison ─────────────────────────────────

    def tier_comparison(self):
        p = self.proposal
        tiers = [p.good, p.better, p.best]
        labels = ["Good", "Better", "Best"]

        avail_w = self.w - self.l_margin - self.r_margin
        col_w   = avail_w / 3
        x_start = self.l_margin
        y_start = self.get_y()

        for i, (tier, label) in enumerate(zip(tiers, labels)):
            x = x_start + i * col_w
            color = TIER_COLORS[label]
            self._draw_tier(x, y_start, col_w - 3, tier, label, color)

    def _draw_tier(self, x, y, w, tier: TierOption, label: str, color):
        self.set_xy(x, y)
        card_h = 130

        # Card background
        self.set_fill_color(*LIGHT_GRAY)
        if label == "Best":
            self.set_fill_color(253, 235, 234)
        self.rect(x, y, w, card_h, "F")

        # Color header bar
        self.set_fill_color(*color)
        self.rect(x, y, w, 10, "F")
        self.set_xy(x, y + 1.5)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(*WHITE)
        self.cell(w, 6, label.upper(), align="C", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_text_color(*BLACK)

        if label == "Best":
            self.set_xy(x, self.get_y())
            self.set_fill_color(*color)
            self.set_text_color(*WHITE)
            self.set_font("Helvetica", "B", 7)
            self.cell(w, 5, "RECOMMENDED", align="C", fill=True,
                      new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            self.set_text_color(*BLACK)

        pad = 3
        self.set_xy(x + pad, self.get_y() + 2)

        # Brand
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(*color)
        self.cell(w - pad * 2, 6, tier.brand, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_text_color(*BLACK)
        self.set_x(x + pad)

        # Description
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*TEXT_LIGHT)
        self.multi_cell(w - pad * 2, 4, tier.system_description, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_text_color(*BLACK)
        self.set_x(x + pad)

        # SEER
        self.set_font("Helvetica", "B", 9)
        self.cell(w - pad * 2, 5, tier.seer_rating, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_x(x + pad)

        # Benefits
        self.ln(1)
        self.set_font("Helvetica", "", 8)
        for benefit in tier.key_benefits:
            self.set_x(x + pad)
            self.set_text_color(*GOOD_COLOR)
            self.cell(4, 4.5, "+", new_x=XPos.RIGHT, new_y=YPos.TOP)
            self.set_text_color(*BLACK)
            self.multi_cell(w - pad * 2 - 4, 4.5, benefit, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_x(x + pad)

        # Warranty
        self.ln(1)
        self.set_font("Helvetica", "", 7.5)
        self.set_text_color(*TEXT_LIGHT)
        self.set_x(x + pad)
        self.cell(w - pad * 2, 4, f"Warranty: {tier.warranty}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_x(x + pad)
        self.cell(w - pad * 2, 4, f"Install: {tier.install_time}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_text_color(*BLACK)

        # Pricing section
        price_y = y + card_h - 38
        self.set_draw_color(*MID_GRAY)
        self.set_line_width(0.2)
        self.line(x + pad, price_y, x + w - pad, price_y)

        self.set_xy(x + pad, price_y + 2)
        self.set_font("Helvetica", "", 8)
        self._price_row(x, w, pad, "Equipment", tier.equipment_cost)
        self._price_row(x, w, pad, "Labor",     tier.labor_cost)
        if tier.adders_cost and tier.adders_cost != "$0":
            self._price_row(x, w, pad, "Adders", tier.adders_cost)

        # Total
        total_y = y + card_h - 13
        self.set_fill_color(*color)
        self.rect(x, total_y, w, 13, "F")
        self.set_xy(x + pad, total_y + 2)
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(*WHITE)
        self.cell((w - pad * 2) * 0.5, 8, "TOTAL", new_x=XPos.RIGHT, new_y=YPos.TOP)
        self.set_font("Helvetica", "B", 12)
        self.cell((w - pad * 2) * 0.5, 8, tier.total_price, align="R",
                  new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_text_color(*BLACK)

        if tier.is_placeholder:
            self.set_xy(x + pad, y + card_h - 3)
            self.set_font("Helvetica", "I", 6.5)
            self.set_text_color(*TEXT_LIGHT)
            self.cell(w - pad * 2, 4, "Pricing pending Excel integration", align="C",
                      new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            self.set_text_color(*BLACK)

    def _price_row(self, x, col_w, pad, label, value):
        self.set_x(x + pad)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*TEXT_LIGHT)
        self.cell((col_w - pad * 2) * 0.55, 4.5, label, new_x=XPos.RIGHT, new_y=YPos.TOP)
        self.set_text_color(*BLACK)
        self.cell((col_w - pad * 2) * 0.45, 4.5, value, align="R",
                  new_x=XPos.LMARGIN, new_y=YPos.NEXT)


def _fmt(val: str) -> str:
    return val.replace("_", " ").title()


def generate_proposal_pdf(proposal: ProposalResponse) -> bytes:
    pdf = ProposalPDF(proposal)
    pdf.add_page()

    pdf.proposal_header()
    pdf.ln(2)
    pdf.warning_banners()
    pdf.ln(2)
    pdf.section_label("System Options - Good / Better / Best")
    pdf.ln(1)
    pdf.tier_comparison()

    return bytes(pdf.output())
