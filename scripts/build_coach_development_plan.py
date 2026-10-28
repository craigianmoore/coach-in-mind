#!/usr/bin/env python3
"""Builds private/resources/coach-development-plan.pdf (members-only resource).

Run from the repo root:  python3 scripts/build_coach_development_plan.py   (needs `pip install reportlab`)
Based on the GRIP model: Goals, Reflect/Review, Input, Plan.
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak, KeepTogether
from reportlab.lib import colors

NAVY = colors.HexColor("#191B41")
GOLD = colors.HexColor("#B8935A")
INK = colors.HexColor("#2A2E3A")
MUTED = colors.HexColor("#5B6270")
PALE = colors.HexColor("#FBF6EC")
LINE = colors.HexColor("#C9CDD6")

ss = getSampleStyleSheet()
P = lambda name, **kw: ParagraphStyle(name, parent=ss["Normal"], **kw)
title = P("t", fontName="Helvetica-Bold", fontSize=22, leading=26, textColor=NAVY)
sub = P("s", fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=GOLD, spaceAfter=6)
body = P("b", fontName="Helvetica", fontSize=9.5, leading=13.5, textColor=INK, spaceAfter=4)
small = P("sm", fontName="Helvetica", fontSize=8.5, leading=11.5, textColor=MUTED)
lab = P("l", fontName="Helvetica-Bold", fontSize=8.5, leading=11, textColor=NAVY)
cell = P("c", fontName="Helvetica", fontSize=9, leading=12, textColor=INK)
hdr_white = P("hw", fontName="Helvetica-Bold", fontSize=9, leading=11, textColor=colors.white)
ctr = P("ctr", fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=NAVY, alignment=TA_CENTER)
tile_t = P("tt", fontName="Helvetica-Bold", fontSize=12, leading=14, textColor=colors.white, alignment=TA_CENTER)
tile_b = P("tb", fontName="Helvetica", fontSize=8.5, leading=11, textColor=colors.white, alignment=TA_CENTER)

W = A4[0] - 30 * mm  # usable width


def band(letter, name, question):
    """Section header bar for one GRIP step."""
    t = Table([[Paragraph(f"<font size=16>{letter}</font>", hdr_white), Paragraph(f"<b>{name}</b> &nbsp;&nbsp; <font size=8.5>{question}</font>", hdr_white)]],
              colWidths=[12 * mm, W - 12 * mm])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), NAVY), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                           ("LEFTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
    return t


def box(label, height=22 * mm):
    t = Table([[Paragraph(label, lab)], [""]], colWidths=[W], rowHeights=[None, height])
    t.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.6, LINE), ("BACKGROUND", (0, 0), (-1, 0), PALE),
                           ("LEFTPADDING", (0, 0), (-1, -1), 6), ("TOPPADDING", (0, 0), (-1, 0), 3), ("BOTTOMPADDING", (0, 0), (-1, 0), 3)]))
    return t


def two_boxes(l1, l2, height=20 * mm):
    half = W / 2 - 2 * mm
    t = Table([[Paragraph(l1, lab), "", Paragraph(l2, lab)], ["", "", ""]], colWidths=[half, 4 * mm, half], rowHeights=[None, height])
    t.setStyle(TableStyle([("BOX", (0, 0), (0, -1), 0.6, LINE), ("BOX", (2, 0), (2, -1), 0.6, LINE),
                           ("BACKGROUND", (0, 0), (0, 0), PALE), ("BACKGROUND", (2, 0), (2, 0), PALE),
                           ("LEFTPADDING", (0, 0), (-1, -1), 6), ("TOPPADDING", (0, 0), (-1, 0), 3), ("BOTTOMPADDING", (0, 0), (-1, 0), 3)]))
    return t


def grid(headers, widths, rows, row_h=9 * mm, first_col_text=None):
    data = [[Paragraph(h, hdr_white) for h in headers]]
    for i in range(rows):
        data.append([Paragraph(first_col_text[i], cell) if first_col_text else ""] + [""] * (len(headers) - 1))
    t = Table(data, colWidths=widths, rowHeights=[None] + [row_h] * rows)
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), NAVY), ("GRID", (0, 0), (-1, -1), 0.5, LINE), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                           ("LEFTPADDING", (0, 0), (-1, -1), 5), ("TOPPADDING", (0, 0), (-1, 0), 4), ("BOTTOMPADDING", (0, 0), (-1, 0), 4)]))
    return t


def tiles():
    items = [("G", "Goals", "What am I working towards?"), ("R", "Reflect / Review", "Where am I now, and what is working?"),
             ("I", "Input", "What can help me get there?"), ("P", "Plan", "What will I do, and by when?")]
    w = W / 4
    cells = [[Paragraph(f"<font size=20>{a}</font><br/>{b}", tile_t), Paragraph(c, tile_b)] for a, b, c in items]
    t = Table([[c[0] for c in cells], [c[1] for c in cells]], colWidths=[w] * 4, rowHeights=[16 * mm, 14 * mm])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), NAVY), ("LINEAFTER", (0, 0), (-2, -1), 3, colors.white), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                           ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
    return t


def about_me():
    rows = [["Name", "", "Date", ""], ["Club / team", "", "Age group & level", ""], ["Current licence / diploma", "", "Years coaching", ""],
            ["My mentor or club contact", "", "Next catch-up", ""]]
    data = [[Paragraph(r[0], lab), "", Paragraph(r[2], lab), ""] for r in rows]
    t = Table(data, colWidths=[40 * mm, W / 2 - 40 * mm, 34 * mm, W / 2 - 34 * mm], rowHeights=[9 * mm] * 4)
    t.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, LINE), ("BACKGROUND", (0, 0), (0, -1), PALE), ("BACKGROUND", (2, 0), (2, -1), PALE),
                           ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 5)]))
    return t


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(15 * mm, 9 * mm, "Coach In Mind  |  coachinmind.com.au  |  A personal planning guide, not an assessment or a qualification.")
    canvas.drawRightString(A4[0] - 15 * mm, 9 * mm, f"Page {doc.page}")
    canvas.restoreState()


story = []
# ---------- Page 1 ----------
LOGO_H = 18 * mm
head = Table([[[Paragraph("Coach Development Plan", title), Paragraph("Built on the GRIP model: Goals, Reflect/Review, Input, Plan", sub)],
               Image("public/coach-in-mind-logo.png", width=LOGO_H * 370 / 575, height=LOGO_H)]], colWidths=[W - 20 * mm, 20 * mm])
head.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))
story += [head, Spacer(1, 4),
          Paragraph("A short, practical plan for where you want to go as a coach and how you will get there. It takes about 30 minutes. "
                    "Work through it in order, and ideally talk it through with a mentor or someone from your club. A conversation makes it far more likely to happen.", body),
          Spacer(1, 4), tiles(), Spacer(1, 10), Paragraph("About me", P("h", fontName="Helvetica-Bold", fontSize=12, textColor=NAVY, spaceAfter=4)), about_me(), Spacer(1, 10),
          Paragraph("How to use this plan", P("h2", fontName="Helvetica-Bold", fontSize=12, textColor=NAVY, spaceAfter=4)),
          Paragraph("<b>1. Goals.</b> Start with where you want to get to, so everything else has a purpose.", body),
          Paragraph("<b>2. Reflect / Review.</b> Be honest about where you are now. What is working, and what are you less sure about?", body),
          Paragraph("<b>3. Input.</b> Decide what will help: people, learning, observation, feedback, time.", body),
          Paragraph("<b>4. Plan.</b> Turn it into a few clear actions with names and dates. Then come back and review.", body),
          Spacer(1, 6),
          Table([[Paragraph("<b>Keep it small.</b> One or two goals you will actually do beat six you will not. Aim for a first step you can take this week. "
                            "Come back to the Review page at 3, 6 and 12 months.", body)]], colWidths=[W],
                style=[("BACKGROUND", (0, 0), (-1, -1), PALE), ("BOX", (0, 0), (-1, -1), 0.6, GOLD), ("LEFTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 6)]),
          PageBreak()]

# ---------- Page 2: Goals + Reflect ----------
story += [band("G", "Goals", "What am I working towards?"), Spacer(1, 4),
          box("My goal for the next 12 months (for example: the next licence, a new age group, a higher level, better game-day confidence)", 20 * mm), Spacer(1, 4),
          two_boxes("My goal for the next 3 months (a first step)", "How I will know I have got there", 18 * mm), Spacer(1, 4),
          box("What will be different for my players if I get there?", 16 * mm), Spacer(1, 10),
          band("R", "Reflect / Review", "Where am I now, and what is working?"), Spacer(1, 4),
          Paragraph("Tick how you would honestly rate yourself on each area today.", small), Spacer(1, 2)]
areas = ["Planning and preparing sessions", "Coaching in the session (observing, questioning, giving feedback)", "Managing match day",
         "Communicating with players and building relationships", "Working with parents, volunteers and the club", "Leadership and staying positive under pressure",
         "Developing players in an age-appropriate way"]
rt = grid(["Area", "Strong", "Developing", "Needs attention"], [W - 66 * mm, 22 * mm, 22 * mm, 22 * mm], len(areas), row_h=8 * mm, first_col_text=areas)
rt.setStyle(TableStyle([("ALIGN", (1, 0), (-1, -1), "CENTER")]))
story += [rt, Spacer(1, 4),
          two_boxes("Two things that are going well (and the evidence)", "Two things I want to get better at", 20 * mm), Spacer(1, 4),
          box("A recent session or match I would do differently, and what I would change", 16 * mm), PageBreak()]

# ---------- Page 3: Input + Plan ----------
story += [band("I", "Input", "What can help me get there?"), Spacer(1, 4),
          Paragraph("Tick what could help, then note who or what.", small)]
opts = ["Watch another coach at work", "Work with a mentor (see Coach 2 Mentor)", "A course or licence", "Record a session and review it",
        "Ask a trusted colleague for feedback", "Read, watch or listen (books, video, podcasts)", "A club coach education session", "Try a new approach in training"]
half = (len(opts) + 1) // 2
data = [[Paragraph("[  ] " + opts[i], cell), Paragraph("[  ] " + opts[i + half], cell) if i + half < len(opts) else ""] for i in range(half)]
ot = Table(data, colWidths=[W / 2, W / 2], rowHeights=[8 * mm] * half)
ot.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.6, LINE), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 6)]))
story += [ot, Spacer(1, 4), two_boxes("People who can help me", "What I need from my club (time, support, contribution to costs)", 18 * mm), Spacer(1, 10),
          band("P", "Plan", "What will I do, and by when?"), Spacer(1, 4),
          grid(["Action", "Linked to my goal", "Who helps", "By when", "Done"], [W - 114 * mm, 36 * mm, 30 * mm, 28 * mm, 20 * mm], 7, row_h=10 * mm), Spacer(1, 4),
          box("The first step I will take this week", 12 * mm), PageBreak()]

# ---------- Page 4: Review ----------
story += [Paragraph("Review", P("rv", fontName="Helvetica-Bold", fontSize=16, leading=20, textColor=NAVY, spaceAfter=2)),
          Paragraph("Come back to the plan at 3, 6 and 12 months. Repeat the GRIP steps in a quick form: Are my goals still right? Where am I now? What input helped? What is the plan now?", body),
          Spacer(1, 4)]
for label in ["3 months", "6 months", "12 months"]:
    t = Table([[Paragraph(f"<b>{label}</b> &nbsp; Date: ____________", hdr_white)],
               [Paragraph("What I did / what changed", lab)], [""], [Paragraph("What is next (updated goals and plan)", lab)], [""]],
              colWidths=[W], rowHeights=[None, None, 16 * mm, None, 14 * mm])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), NAVY), ("BACKGROUND", (0, 1), (-1, 1), PALE), ("BACKGROUND", (0, 3), (-1, 3), PALE), ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                           ("LEFTPADDING", (0, 0), (-1, -1), 6), ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]))
    story += [KeepTogether([t]), Spacer(1, 5)]
story += [box("Evidence of my progress (sessions delivered, feedback received, courses completed)", 18 * mm), Spacer(1, 6),
          Table([[Paragraph("Coach signature / date", lab), Paragraph("Mentor or club contact signature / date", lab)], ["", ""]], colWidths=[W / 2, W / 2], rowHeights=[None, 12 * mm],
                style=[("LINEABOVE", (0, 1), (-1, 1), 0.5, LINE), ("BOX", (0, 0), (-1, -1), 0.6, LINE), ("LEFTPADDING", (0, 0), (-1, -1), 6)]),
          PageBreak()]

# ---------- Page 5: Club companion ----------
story += [Paragraph("For clubs: supporting your coach's development", P("ct", fontName="Helvetica-Bold", fontSize=18, leading=22, textColor=NAVY)),
          Paragraph("A short GRIP conversation to have with each of your coaches", sub),
          Paragraph("Developing your coaches is one of the best things a club can do for its players, and it helps you keep good coaches. This page gives you four questions to guide a 20-30 minute catch-up. "
                    "Keep it supportive, not a performance review. Let the coach lead, and share the completed plan.", body), Spacer(1, 6)]
qs = [("G", "Goals", ["What do you want to get out of this season?", "Where would you like to be as a coach in 12 months?"]),
      ("R", "Reflect / Review", ["What is going well in your coaching right now?", "What would you change about a recent session or match?"]),
      ("I", "Input", ["What would help most: a mentor, a course, someone to observe you, more time, feedback?", "What can the club offer?"]),
      ("P", "Plan", ["What is the first step, who owns it, and by when?", "When will we check in again?"])]
for l, n, items in qs:
    t = Table([[Paragraph(f"<font size=16>{l}</font>", hdr_white), [Paragraph(f"<b>{n}</b>", lab)] + [Paragraph("- " + x, cell) for x in items]]], colWidths=[12 * mm, W - 12 * mm])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (0, 0), NAVY), ("BOX", (0, 0), (-1, -1), 0.6, LINE), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("ALIGN", (0, 0), (0, 0), "CENTER"),
                           ("LEFTPADDING", (0, 0), (-1, -1), 8), ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]))
    story += [t, Spacer(1, 4)]
story += [Spacer(1, 4), Paragraph("What our club will do", P("h3", fontName="Helvetica-Bold", fontSize=12, textColor=NAVY, spaceAfter=4))]
commit = ["Give the coach protected time for the catch-up and for their development",
          "Name one club contact who checks in with them", "Contribute to course or licence fees (all or part)",
          "Connect them with a mentor (for example through Coach 2 Mentor)", "Let them observe, or be observed by, another coach",
          "Agree a date for the next catch-up"]
ct = Table([[Paragraph("[  ] " + c, cell)] for c in commit], colWidths=[W], rowHeights=[8 * mm] * len(commit))
ct.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 0.6, LINE), ("LINEBELOW", (0, 0), (-1, -2), 0.3, LINE), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("LEFTPADDING", (0, 0), (-1, -1), 8)]))
story += [ct, Spacer(1, 6), box("Notes and what we agreed", 22 * mm)]

doc = SimpleDocTemplate("private/resources/coach-development-plan.pdf", pagesize=A4, leftMargin=15 * mm, rightMargin=15 * mm, topMargin=14 * mm, bottomMargin=16 * mm,
                        title="Coach Development Plan (GRIP)", author="Coach In Mind")
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print("built")
