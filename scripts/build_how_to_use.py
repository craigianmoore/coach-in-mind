#!/usr/bin/env python3
"""Rebuilds public/how-to-use.pdf.

Run from the repo root:  python3 scripts/build_how_to_use.py
(needs `pip install reportlab`). Edit the content below, re-run, and commit
the regenerated PDF. Package figures must match lib/constants.ts.
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.enums import TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem,
    Table, TableStyle, HRFlowable,
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
LOGO_H = 30 * mm
LOGO_W = LOGO_H * 370 / 575  # keep the logo's own proportions
header = Table(
    [[Image("public/coach-in-mind-logo.png", width=LOGO_W, height=LOGO_H),
      [Paragraph("Coach In Mind", title_style),
       Paragraph("How To Use — Club 2 Coach &amp; Coach 2 Mentor", subtitle_style)]]],
    colWidths=[LOGO_W + 6 * mm, 165 * mm - LOGO_W - 6 * mm],
)
header.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
]))
story.append(header)
story.append(Spacer(1, 6))

story.append(Paragraph(
    "Coach In Mind runs two separate matching services: Club 2 Coach, which connects clubs with "
    "coaches, and Coach 2 Mentor, which connects coaches with mentors. One login covers both — you "
    "choose which service to use, and each is paid for separately.",
    body_style,
))

story.append(Paragraph("Club 2 Coach", h2_style))
story.append(Paragraph(
    "Club 2 Coach helps clubs advertise coaching vacancies and helps coaches find a role. Coach In "
    "Mind reviews and curates every match — there is no public browsing on either side.",
    body_style,
))

story.append(Paragraph("If you're a club", h3_style))
story.append(bullets([
    "Advertise a vacancy with your requirements — competition level, age group, region, and "
    "accreditation needed.",
    "Choose a package of 1–5 coach introductions. Your club's first introduction is free — just "
    "tap \"Claim free introduction\" on your vacancy; anything after that is charged as normal.",
    "You'll get an email as soon as your vacancy is saved. It isn't live yet — it only joins matching "
    "once payment is confirmed (or a free or gifted introduction is applied).",
    "Once it's active, Coach In Mind reviews your vacancy and suggests the top-scoring "
    "coaches available.",
    "Each suggested match is reviewed before it goes live — contact details are only shared once a "
    "match is approved. When that happens you'll get an email, and the coach's name, email and mobile "
    "appear under \"Coaches introduced to you\" on that vacancy in your dashboard.",
    "Every introduction is a paid match, made the moment it's shared — it isn't a guarantee of a "
    "hire, and it isn't refunded or carried over if it doesn't work out.",
    "After each introduction, tell us whether it led to a hire from your own dashboard. We won't put "
    "forward another coach for that vacancy until you do — this makes sure you're never paying for "
    "coaches you don't need anymore.",
    "A one-month contact window starts when your first coach is shared with you. If the role's still "
    "open after that, simply advertise again.",
    "Enter your club's postcode (where the club plays) so we can see where demand is.",
    "Didn't find your match, or want to tweak the ad? Use Repost on your vacancy to re-advertise "
    "with a few changes instead of starting from scratch. The original moves into your history so "
    "two live posts never compete for the same coaches, and the one-month contact window keeps "
    "counting for that role (it carries over while the original was still active).",
    "You can mark a vacancy as filled, delete it, or view its activity (introductions made, dates) "
    "at any time from your own dashboard.",
]))

story.append(Spacer(1, 4))
story.append(callout(
    "Why a match costs what it does",
    [
        "A coaching vacancy rarely fails for lack of applicants — it fails because sorting the right "
        "one out of a group chat full of maybes costs more time than most committees have. Every "
        "introduction from Coach In Mind has already been checked against your accreditation, "
        "competition level, age group, region and salary requirements, so you're not meeting "
        "candidates — you're meeting a shortlist of one.",
        "That's what the fee buys: fewer conversations, and a far better chance that the one you "
        "have is with the right coach. The match is the product, not the listing.",
    ],
))
story.append(Spacer(1, 4))

story.append(Paragraph("If you're a coach", h3_style))
story.append(bullets([
    "Set up a profile describing the kind of role you're looking for.",
    "Choose a package of 1–3 club introductions. Your first introduction is free — tap \"Claim "
    "free introduction\" on your profile; anything after that is charged as normal. (It's one free "
    "introduction per coach, across Club 2 Coach and Coach 2 Mentor.)",
    "You'll get an email as soon as your listing is saved. It isn't active yet — it only joins "
    "matching once payment is confirmed (or a free or gifted introduction is applied).",
    "Once it's active, Coach In Mind matches you against active vacancies and introduces "
    "you to your best-fitting clubs.",
    "When you're matched you'll get an email, and the club contact's name, email and mobile appear "
    "under \"Your introductions\" on your coach page — you can get in touch with them directly.",
    "If none of your introductions lead to a role, you can top up for more from your own profile "
    "page at any time.",
]))

story.append(callout(
    "Founding member offer",
    [
        "The first 60 coaches to complete a Club 2 Coach listing get their first introduction free — "
        "it's applied automatically when you save your listing, with no payment step. It's one free "
        "introduction per coach, and it ends once all 60 places are taken.",
    ],
))
story.append(Spacer(1, 4))

story.append(Paragraph("Referral rewards (coaches)", h3_style))
story.append(bullets([
    "Every coach has a personal referral code and link on their coach page.",
    "When a coach you refer makes their first payment, you earn 1 free introduction. When a club "
    "you refer does, you earn 2.",
    "Rewards are added automatically to your paid listing, up to a maximum of 6 referral credits. "
    "You need a paid (or founding) listing to receive them — if you don't have one when the person "
    "you referred pays, no credit is given. A club can only earn one referral reward, ever. Free "
    "and gifted introductions don't count as a payment.",
    "New sign-ups enter your code when they create their profile, or just use your link.",
]))

story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#E3E3E3"), spaceBefore=10, spaceAfter=10))

story.append(Paragraph("Coach 2 Mentor", h2_style))
story.append(Paragraph(
    "Coach 2 Mentor connects coaches seeking guidance with experienced mentors. Like Club 2 Coach, "
    "matching is curated by Coach In Mind rather than open browsing.",
    body_style,
))

story.append(Paragraph("If you're a coach seeking a mentor", h3_style))
story.append(bullets([
    "Set up a profile describing what you're looking for from mentoring, and set your own personal "
    "priorities (e.g. how much specialism overlap or availability matters to you).",
    "Choose a package of 1–3 mentor introductions.",
    "Coach In Mind reviews and suggests mentors matched to your profile and priorities.",
    "Once a suggested mentor is approved, they'll be asked to accept or decline — contact details "
    "are only shared once they accept.",
]))

story.append(Paragraph("If you're a mentor", h3_style))
story.append(bullets([
    "Set up a profile describing your background, specialisms, and availability.",
    "Choose your mentee capacity (how many coaches you can mentor at once, up to 10) — pricing "
    "scales with capacity.",
    "When a coach is matched and approved, you'll see the request on your own dashboard and can "
    "accept or decline it.",
    "Once you accept, contact details are shared and you arrange things directly with the coach "
    "from there.",
]))

story.append(Paragraph("Credits, expiry and refunds", h2_style))
story.append(bullets([
    "<b>Introduction credits don't expire.</b> Credits you buy, are gifted or earn through referrals "
    "stay on your listing until they're used.",
    "<b>Club contact window.</b> A club's vacancy stays open for one calendar month from when its "
    "first coach is shared, then expires unless it's filled.",
    "<b>Refunds.</b> If no introduction has been made within 4 months of your payment (6 months for "
    "Coach 2 Mentor), you can ask for a full refund through the Support page. Once at least one "
    "introduction has been made, the package is non-refundable — including any unused introductions "
    "in it.",
]))

story.append(Paragraph("Your details, emails and the page controls", h2_style))
story.append(bullets([
    "<b>Your contact details.</b> Your name, email and mobile come from My Profile and are shown "
    "(read-only, behind a frosted panel) at the top of your listing forms. To change them, update "
    "My Profile — that keeps what a club or coach sees once you're matched accurate.",
    "<b>Postcode.</b> My Profile asks for your 4-digit postcode (clubs also give their own club "
    "postcode on each vacancy). It's only used to see where people are.",
    "<b>Emails you'll receive from hello@coachinmind.com.au.</b> A confirmation when you save a "
    "listing or vacancy (it says what's still needed to activate it), and a \"you've been matched\" "
    "email when an introduction is approved — on Coach 2 Mentor, mentors are emailed when a coach "
    "would like their help, and both are emailed once the mentor accepts. Contact details are never put in the email itself — "
    "sign in to see them.",
    "<b>Word limits.</b> Short overviews are capped at 60 words, mentor bios at 150, goals at 100, "
    "and private notes to Coach In Mind at 100 — each box shows a live word count.",
    "<b>Accreditation evidence (mentors).</b> When you choose your certificate (PDF, JPEG or PNG) "
    "a preview appears so you can check it's the right file before you save.",
    "<b>View and text size.</b> Every Club 2 Coach and Coach 2 Mentor page has a Phone / Tablet / "
    "Laptop switch and S / M / L / XL text sizes at the top right. They're remembered on your "
    "device.",
]))

story.append(Paragraph("What to expect from matching", h2_style))
story.append(Paragraph(
    "Coach In Mind uses a scoring system (accreditation, competition level, geography, availability, "
    "and more) to rank potential matches — but every introduction is reviewed before it's shared.",
    body_style,
))
story.append(Paragraph(
    "An introduction is a starting point, not a guarantee. What happens after you're introduced — "
    "interviews, trial sessions, agreeing terms — is between you and the other party.",
    body_style,
))
story.append(Paragraph(
    "If your matches aren't landing, you can update your own criteria at any time and Coach In Mind "
    "will reassess against your new details.",
    body_style,
))

story.append(Paragraph("Reading a match percentage", h2_style))
story.append(Paragraph(
    "A match score isn't a school grade — very few matches hit the high 90s, since it takes every "
    "factor lining up at once to get there. As a rough guide: 70%+ is a strong, obvious fit; 50–70% "
    "is solid and workable; 30–50% means there are real gaps worth a closer look; and under 30% "
    "usually means several things don't line up. A lower score doesn't always mean a weak candidate "
    "— sometimes it's one specific mismatch pulling down an otherwise great fit.",
    body_style,
))

story.append(Paragraph("Important information", h2_style))
story.append(Paragraph(
    "Coach In Mind facilitates introductions between coaches, clubs, and mentors. It does not "
    "guarantee that any introduction will result in a coaching role, a mentoring relationship, or "
    "any particular outcome. Coach In Mind does not vet, verify, or take responsibility for the "
    "accuracy of information provided by users, and takes no responsibility for the conduct, "
    "decisions, or outcomes of any coach, club, or mentor using the service. It is the "
    "responsibility of each party to verify the other's credentials, references, and suitability "
    "before entering into any coaching or mentoring arrangement.",
    small_muted_style,
))
story.append(Paragraph(
    "Working with Children: where a coaching role involves working with children or young people, "
    "it is the responsibility of the club and the coach to ensure all relevant Working With "
    "Children Check (WWCC) and safeguarding requirements are met. Coach In Mind does not verify "
    "WWCC status as part of its matching process.",
    small_muted_style,
))

story.append(Paragraph("Need help?", h2_style))
story.append(Paragraph(
    "If you have any questions not covered here, use the Report an Issue link in the app, or click "
    "\"Coach In Mind\" in the top-left of any page to get back to the homepage.",
    body_style,
))

doc = SimpleDocTemplate(
    "public/how-to-use.pdf",
    pagesize=A4,
    leftMargin=22 * mm, rightMargin=22 * mm, topMargin=18 * mm, bottomMargin=18 * mm,
    title="Coach In Mind — How To Use",
)
doc.build(story)
print("done")
