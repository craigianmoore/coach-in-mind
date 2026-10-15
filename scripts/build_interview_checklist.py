#!/usr/bin/env python3
"""Rebuilds private/resources/coach-interview-checklist.pdf (one A4 page).

Run from the repo root:  python3 scripts/build_interview_checklist.py
(needs `pip install reportlab`).
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image, Flowable,
)


class Box(Flowable):
    """A square tick box, aligned with the first line of its item."""
    def __init__(self, size=5*mm):
        super().__init__()
        self.size = size
        self.width = size
        self.height = size

    def draw(self):
        self.canv.setStrokeColor(NAVY)
        self.canv.setLineWidth(1)
        self.canv.rect(0, 0, self.size, self.size, stroke=1, fill=0)

NAVY = colors.HexColor("#191B41")
GOLD = colors.HexColor("#B8935A")
INK = colors.HexColor("#2A2E3A")
MUTED = colors.HexColor("#6B7280")
RULE = colors.HexColor("#E5E7EB")

def style(name, **kw):
    base = dict(fontName="Helvetica", fontSize=10, leading=14, textColor=INK)
    base.update(kw)
    return ParagraphStyle(name, **base)

title = style("Title", fontName="Helvetica-Bold", fontSize=26, leading=32, textColor=NAVY)
subtitle = style("Sub", fontSize=12, leading=16, textColor=MUTED)
body = style("Body", spaceAfter=4)
h2 = style("H2", fontName="Helvetica-Bold", fontSize=14, leading=18, textColor=NAVY, spaceBefore=6, spaceAfter=8)
item_head = style("ItemHead", fontName="Helvetica-Bold", fontSize=11, leading=14, textColor=NAVY)
item_body = style("ItemBody", fontSize=9.5, leading=13.5, spaceBefore=2)
note = style("Note", fontName="Helvetica-Oblique", fontSize=9, leading=12.5, textColor=MUTED)
small = style("Small", fontSize=8.5, leading=12, textColor=MUTED)
label = style("Label", fontSize=10, leading=14)

ITEMS = [
    ("1. Sighted their current Licence/Diploma",
     "Ask to physically see (or receive a copy of) their coaching accreditation. From C Licence upward, these are referred to as a Licence/Diploma (C Licence, B Licence, A Licence, or Pro Diploma) — confirm it matches or exceeds what the role requires."),
    ("2. Confirmed the Licence/Diploma is current",
     "Accreditation can lapse or expire. Check the issue date and any renewal requirements rather than assuming a Licence/Diploma sighted once is still valid."),
    ("3. Sighted a valid, current WWCC (or your state's equivalent)",
     "Every state and territory requires some form of Working With Children check before someone can coach minors — the exact name and process varies by jurisdiction, so confirm the specific requirement for your state and sight current proof of it."),
    ("4. Confirmed Play Football registration",
     "Check whether the coach is already registered as a coach on Play Football, or is willing to register before starting. This is separate from their club-level paperwork."),
    ("5. Asked about any history of disciplinary suspensions",
     "Ask directly whether they have ever been suspended or disciplined as a coach, by any club, league, or federation. Follow up on anything disclosed before proceeding."),
]

doc = SimpleDocTemplate(
    "private/resources/coach-interview-checklist.pdf", pagesize=A4,
    leftMargin=20*mm, rightMargin=20*mm, topMargin=18*mm, bottomMargin=16*mm,
    title="Interviewing a Coach — a checklist for clubs", author="Coach In Mind",
)
W = A4[0] - 40*mm
story = []

# Header: title block left, logo right. Generous leading so descenders (g, y) never clip.
logo = Image("public/coach-in-mind-logo.png", width=24*mm, height=24*mm * 575 / 370, kind="proportional")
logo.drawHeight, logo.drawWidth = 24*mm * 575 / 370 * 0.75, 24*mm * 0.75
head = Table(
    [[[Paragraph("Interviewing a Coach", title), Spacer(1, 3), Paragraph("A checklist for clubs", subtitle)], logo]],
    colWidths=[W - 30*mm, 30*mm],
)
head.hAlign = "LEFT"
head.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"), ("ALIGN", (1, 0), (1, 0), "RIGHT"),
    ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
    ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
]))
story += [head, Spacer(1, 8), HRFlowable(width="100%", thickness=1.5, color=GOLD, spaceAfter=12)]

story.append(Paragraph(
    "Before confirming any coaching appointment, work through this checklist during or shortly after the interview. "
    "It covers the essentials — sighting the right paperwork and asking the right questions — so nothing gets missed "
    "in the excitement of finding a good fit.", body))
story += [Spacer(1, 6), Paragraph("Before you appoint", h2)]

for head_text, desc in ITEMS:
    row = Table(
        [[Box(), [Paragraph(head_text, item_head), Paragraph(desc, item_body)]]],
        colWidths=[9*mm, W - 9*mm],
    )
    row.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0), ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (0, 0), 1),
    ]))
    row.hAlign = "LEFT"
    story += [row, Spacer(1, 11)]

story += [
    HRFlowable(width="100%", thickness=0.5, color=RULE, spaceBefore=4, spaceAfter=8),
    Paragraph("State/territory WWCC requirements and naming vary — if you're unsure which check applies, "
              "confirm with your state's Working With Children screening authority before proceeding.", note),
    Spacer(1, 18),
]

sign = Table(
    [[Paragraph("Candidate name:", label), "", Paragraph("Club:", label), ""],
     [Paragraph("Interviewed by:", label), "", Paragraph("Date:", label), ""]],
    colWidths=[32*mm, 52*mm, 18*mm, W - 102*mm], rowHeights=[10*mm, 10*mm],
)
sign.hAlign = "LEFT"
sign.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "BOTTOM"),
    ("LINEBELOW", (1, 0), (1, -1), 0.6, MUTED), ("LINEBELOW", (3, 0), (3, -1), 0.6, MUTED),
    ("LEFTPADDING", (0, 0), (-1, -1), 0),
]))
story += [sign, Spacer(1, 18),
          HRFlowable(width="100%", thickness=0.5, color=RULE, spaceAfter=6),
          Paragraph("This checklist is a practical starting point, not legal advice — clubs remain responsible for meeting "
                    "their own state/territory's child safety and coach screening obligations in full.", small)]
doc.build(story)
print("built private/resources/coach-interview-checklist.pdf")
