#!/usr/bin/env python3
"""Rebuilds private/admin/admin-guide.pdf (the admin guide shown on the admin page, Marketing & tools).

Run from the repo root:  python3 scripts/build_admin_guide.py
(needs `pip install reportlab`). Edit the content below, re-run, and commit
the regenerated PDF. Package figures must match lib/constants.ts.
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem,
    Table, TableStyle, HRFlowable, CondPageBreak,
)
from reportlab.lib import colors

NAVY = colors.HexColor("#191B41")
GOLD = colors.HexColor("#B8935A")
GOLD_LIGHT = colors.HexColor("#D4AF6A")
INK = colors.HexColor("#2A2E3A")
MUTED = colors.HexColor("#5B6270")
CALLOUT_BG = colors.HexColor("#FBF6EC")

styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    "TitleCIM", parent=styles["Title"], textColor=NAVY, fontName="Helvetica-Bold",
    fontSize=20, leading=24, spaceAfter=2, alignment=TA_LEFT,
)
subtitle_style = ParagraphStyle(
    "Subtitle", parent=styles["Normal"], textColor=GOLD, fontName="Helvetica-Bold",
    fontSize=13, leading=16, spaceAfter=10,
)
body_style = ParagraphStyle(
    "Body", parent=styles["Normal"], textColor=INK, fontName="Helvetica",
    fontSize=10, leading=14, spaceAfter=6,
)
h2_style = ParagraphStyle(
    "H2", parent=styles["Normal"], textColor=NAVY, fontName="Helvetica-Bold",
    fontSize=13, leading=16, spaceBefore=12, spaceAfter=4, keepWithNext=1,
)
h3_style = ParagraphStyle(
    "H3", parent=styles["Normal"], textColor=NAVY, fontName="Helvetica-Bold",
    fontSize=10.5, leading=13, spaceBefore=8, spaceAfter=3, keepWithNext=1,
)
bullet_style = ParagraphStyle(
    "Bullet", parent=body_style, spaceAfter=4, leading=13,
)
callout_heading_style = ParagraphStyle(
    "CalloutHeading", parent=styles["Normal"], textColor=NAVY, fontName="Helvetica-Bold",
    fontSize=11, leading=14, spaceAfter=4,
)
callout_body_style = ParagraphStyle(
    "CalloutBody", parent=styles["Normal"], textColor=INK, fontName="Helvetica",
    fontSize=9.5, leading=13.5,
)
small_muted_style = ParagraphStyle(
    "SmallMuted", parent=styles["Normal"], textColor=MUTED, fontName="Helvetica",
    fontSize=9, leading=12.5, spaceAfter=4,
)


def bullets(items):
    return ListFlowable(
        [ListItem(Paragraph(t, bullet_style), spaceAfter=2) for t in items],
        bulletType="bullet", start="•", bulletColor=GOLD, bulletFontSize=9,
        leftIndent=14,
    )


def callout(heading, body_paragraphs):
    inner = [Paragraph(heading, callout_heading_style)]
    for p in body_paragraphs:
        inner.append(Paragraph(p, callout_body_style))
    t = Table([[inner]], colWidths=[165 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CALLOUT_BG),
        ("BOX", (0, 0), (-1, -1), 0.75, GOLD_LIGHT),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return t


story = []

from reportlab.platypus import Image
LOGO_H = 26 * mm
LOGO_W = LOGO_H * 370 / 575
header = Table(
    [[[Paragraph("Coach In Mind", title_style),
       Paragraph("Admin Guide — running Club 2 Coach day to day", subtitle_style)],
      Image("public/coach-in-mind-logo.png", width=LOGO_W, height=LOGO_H)]],
    colWidths=[165 * mm - LOGO_W - 6 * mm, LOGO_W + 6 * mm],
)
header.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("ALIGN", (1, 0), (1, 0), "RIGHT"),
    ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0),
]))
story.append(header)
story.append(Spacer(1, 6))
story.append(Paragraph(
    "For the admin only. It covers a normal day, the Matches screen (the part that matters most), "
    "and what each tab is for. Figures match the app: a club pack is 3 introductions for $100 and the "
    "club's first introduction is free; one coach credit is 30 days in front of clubs and up to 3 introductions; "
    "a club advert runs 90 days.", body_style))

story.append(Paragraph("A normal day", h2_style))
story.append(bullets([
    "<b>Unpaid</b> — anything waiting for payment or a top-up. Mark paid or gift an introduction when it's right to.",
    "<b>Matches</b> — approve or reject new suggestions (below). Opening this tab also runs the auto-match, so new suggestions appear by themselves.",
    "<b>Support</b> and <b>People</b> — reply to queries; the People tab shows how many new sign-ups there are.",
    "<b>Map</b> (Marketing &amp; tools) — if it says \"to check\", a club has posted two different postcodes and needs your decision.",
]))

story.append(Paragraph("The Matches screen", h2_style))
story.append(Paragraph(
    "Each advertised vacancy is a card. Under it are the coaches Coach In Mind suggests, each with a match %. "
    "A pending suggestion is invisible to the coach and the club until you approve it.", body_style))
story.append(Paragraph("Before you approve — check the match", h3_style))
story.append(bullets([
    "Press <b>Why this match</b> under the coach's name. It shows the score for each criterion (accreditation, ability, "
    "competition level, age group, geography, indicative pay, gender), the coach's regions and postcode, the club's region "
    "and postcode, the distance once distance matching is on, and the date the coach's activation ends.",
    "Look at geography and the two postcodes first, then the activation end date. A coach whose activation ends in a few days may not be around.",
    "Age group and pay can flatter a score: a coach may only choose up to two age groups, and \"negotiable\" only counts when a pay figure was entered.",
    "If anything is unclear, contact the coach (email is on their listing) before approving.",
]))
story.append(Paragraph("What the buttons do", h3_style))
story.append(bullets([
    "<b>Approve</b> (or <b>Share this match</b> on a coach who isn't yet suggested) — contact details are shared both ways straight away. "
    "Both people get a \"you've been matched\" email telling them to sign in. If it is the club's first introduction, the club's one-month contact window starts. "
    "No payment is taken at this point: payment is handled by the club's pack and the coach's credit. The match then shows <b>Approved by you</b>.",
    "<b>Reject</b> — removes a suggestion. Nobody is told.",
    "<b>Undo</b> (on a shared match) — takes the introduction back. Both people lose access to each other's details; there is no email. "
    "The coach's credit comes back (if their 30 days haven't run out), and the club's slot is freed. Use it only for clear mistakes, not to swap coaches.",
    "<b>Re-run auto-match now</b> — looks for new suggestions straight away.",
    "<b>Customise loading</b> — changes the scoring weights for that one vacancy only. The club doesn't see it.",
]))
story.append(Paragraph("After an introduction", h3_style))
story.append(bullets([
    "No further coach is offered for a vacancy until the club says whether the last introduction worked out (filled or not filled). The card shows \"Waiting on the club\" until then.",
    "About a week after an introduction the coach is asked \"Did you take the role?\" by email and in the app.",
    "<b>Red flag:</b> \"Coach says hired — club says not filled\" means the two answers disagree. Look into it before approving more.",
    "<b>Amber flag:</b> a club that has said \"not filled\" twice or more. Check before approving another.",
    "An advert and its introductions are for the one role advertised (see the Terms). You may decline further introductions where an introduction looks misused.",
]))

story.append(callout(
    "Auto-approve and the minimum score",
    [
        "Tick <b>Fully automate matching</b> and top matches are shared without your review. Under it, set <b>Only if the match is at least __ %</b> "
        "(70% by default). A match at or above that shares automatically and is labelled <b>Auto</b>; a lower one comes to you as a suggestion, as normal.",
        "With around 30 coaches, scores will often be modest, so a high minimum sends most matches back to you. Approve by hand for a while, "
        "note the scores you're comfortable with, then turn automation on with the minimum set just below them. You can set the number before ticking the box.",
    ],
))
story.append(Spacer(1, 4))

story.append(Paragraph("What each tab is for", h2_style))
story.append(Paragraph("Operations", h3_style))
story.append(bullets([
    "<b>Unpaid</b> — listings, vacancies and top-up requests waiting for payment.",
    "<b>Overview</b> — summary figures.",
    "<b>Matches</b> — described above.",
    "<b>Loading</b> — the scoring weights (how much each criterion counts), and the switch for using real distance between postcodes (off at present).",
    "<b>Listings</b> — the full detail of every coach listing and club vacancy, including indicative pay.",
    "<b>Clubs</b> — the club directory with contact emails and outreach status.",
    "<b>Admins</b> — admin PINs and the card payments switch. Some actions need the master PIN.",
    "<b>Support</b> — queries from users; mark them resolved when done.",
    "<b>People</b> — everyone who has signed up, with a count of new sign-ups.",
    "<b>Payments</b> — payments received and refunds, both products.",
]))
story.append(Paragraph("Marketing &amp; tools", h3_style))
story.append(bullets([
    "<b>Promos</b> — free first introductions and referral rewards.",
    "<b>Invites</b> — the coach invitation mail-out (sent a few at a time, with a daily limit and a one-off reminder to coaches who haven't responded) and club invitations (off at present). "
    "Emails are in the CIM voice and signed by the Coach In Mind team.",
    "<b>Announcements</b> — banners shown to users.",
    "<b>Map</b> — hot spots by postcode (coaches, clubs, mentors in three colours). Above the map, \"Clubs with different postcodes\": "
    "pick the right postcode or type another, then confirm. <b>Once confirmed, a club's postcode is locked</b> and the app can never change it again; "
    "the club's vacancies are updated to it.",
    "<b>Admin guide</b> — this guide.",
]))
story.append(Paragraph("Buttons at the top of the page", h3_style))
story.append(bullets([
    "<b>Share</b> copies a ready-to-paste email introducing Coach In Mind; <b>Text sign-up link</b> sends the sign-up link; "
    "<b>Share flyer</b> shares the printable flyer; <b>Show QR code</b> opens a full-screen QR code (with the logo) that people can scan to reach the sign-up page. Press Close or Esc to return.",
]))

story.append(Paragraph("Rules of thumb", h2_style))
story.append(bullets([
    "Every introduction counts against the club's pack whatever the outcome; a fourth is never owed.",
    "Pay on listings is indicative only and is never an offer or contract (Terms, section 3).",
    "Don't guess a club's region or postcode — leave it blank until you have it from a real source.",
    "If a club's advert gets no introduction in 90 days, its credit is returned automatically; refund requests come through Support.",
]))

doc = SimpleDocTemplate(
    "private/admin/admin-guide.pdf", pagesize=A4,
    leftMargin=22 * mm, rightMargin=22 * mm, topMargin=18 * mm, bottomMargin=18 * mm,
    title="Coach In Mind — Admin Guide",
)
doc.build(story)
print("done")
