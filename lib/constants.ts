// Shared reference data used across both Club2Coach and Coach2Mentor.
// Scoped to Victoria for now — when other states are added, this becomes
// state-keyed (e.g. REGIONS_BY_STATE.VIC, REGIONS_BY_STATE.NSW) rather
// than a flat list. Keeping it centralised here means that change happens
// in one place, not scattered across every form.

export const STATE = "VIC" as const;

// Regions, grouped by state. Adding a new state later is just a new
// entry here — everything else (state options, region pickers) is
// derived from this, not hardcoded separately.
export const REGIONS_BY_STATE: Record<string, readonly string[]> = {
  VIC: [
    "Melbourne (North)",
    "Melbourne (South)",
    "Melbourne (East)",
    "Melbourne (West)",
    "Geelong",
    "Greater Ballarat",
    "Greater Bendigo",
    "Gippsland",
    "Latrobe Valley",
    "Shepparton",
    "South West",
    "Sunraysia",
  ],
  TAS: ["North", "North-West", "South"],
  // Northern NSW Football's actual catchment — the Hunter Region.
  // Football NSW (Sydney and the rest of the state) is a separate
  // Member Federation and isn't covered by this yet.
  NNSW: ["Newcastle", "Lake Macquarie", "Maitland", "Cessnock", "Port Stephens", "Singleton", "Muswellbrook", "Mid Coast"],
  // Grouped from suburb-level club data into Adelaide's standard
  // metro zones — no clean LGA-style field was provided for SA.
  SA: ["Adelaide CBD", "Northern Adelaide", "North Eastern Adelaide", "Eastern Adelaide", "Southern Adelaide", "Western Adelaide"],
  // Canberra's real district names, plus Queanbeyan — geographically
  // NSW, but home to two clubs that play in Capital Football.
  ACT: ["ACT-wide"],
  // All current NT clubs are Darwin metro — no other clubs to
  // meaningfully spread regions across yet.
  NT: ["Darwin", "Casuarina", "Palmerston"],
  // All current WA clubs are Perth metro or Mandurah — grouped into
  // Perth's standard suburb zones, same pattern as Melbourne's.
  WA: ["Northern Suburbs", "Eastern Suburbs", "Southern Suburbs", "Western Suburbs", "Mandurah / Peel"],
  // Real Football Queensland zone names — genuinely spread across the
  // whole state, unlike most of the others so far.
  QLD: ["Metro", "South Coast", "Sunshine Coast", "Northern", "Wide Bay", "Central Coast", "Darling Downs", "Far North & Gulf", "Whitsunday Coast", "South Coast (NSW)"],
  // Almost every current Football NSW club is Sydney metro with no
  // suburb-level detail provided — same call as Capital Football:
  // one region rather than inventing sub-areas the data doesn't support.
  // Real Football NSW association/branch regions — genuinely
  // available now that per-club data confirmed this structure (13
  // metro association areas + 3 regional branches). Most currently
  // loaded clubs (the NPL/League tier) are only known generically as
  // "Sydney metro" and aren't pre-assigned to one of these specific
  // areas — this list is for whoever's advertising a vacancy or
  // profile to pick the one that's actually accurate for them.
  NSW: [
    "Central Coast",
    "Eastern Sydney",
    "Hills District",
    "Illawarra/South Coast",
    "Inner-West/South Sydney",
    "North Sydney",
    "North-West Sydney",
    "Northern Beaches",
    "South-West Sydney",
    "Southern Sydney",
    "St George",
    "Sutherland Shire",
    "Western Sydney",
    "Central-West NSW",
    "Riverina (Albury/Wagga/Griffith)",
    "Southern NSW (Shoalhaven/Highlands/South Coast)",
  ],
};

export const STATE_OPTIONS = Object.keys(REGIONS_BY_STATE);

// Flat combined list — for anywhere that genuinely wants "all regions
// regardless of state" (the shared Profile page's own region field,
// Coach2Mentor's forms, which don't need the state-gating Club2Coach
// vacancies do). Most Club2Coach-specific pickers should use
// REGIONS_BY_STATE[state] instead, to only show relevant regions.
export const REGIONS = Object.values(REGIONS_BY_STATE).flat();

export const STATE_LABELS: Record<string, string> = {
  VIC: "Victoria",
  TAS: "Tasmania",
  NNSW: "Northern NSW",
  SA: "South Australia",
  ACT: "ACT",
  NT: "Northern Territory",
  WA: "Western Australia",
  QLD: "Queensland",
  NSW: "New South Wales",
};

// The actual governing body name for each state/territory — used
// specifically for the "which Member Federation" picker, since
// that's the real term clubs and coaches will recognise. Add more
// entries here as more states come on board.
export const MEMBER_FEDERATIONS: Record<string, string> = {
  ACT: "Capital Football",
  NSW: "Football NSW",
  NT: "Football NT",
  QLD: "Football Queensland",
  SA: "Football South Australia",
  TAS: "Football Tasmania",
  VIC: "Football Victoria",
  WA: "Football West",
  NNSW: "Northern NSW Football",
};

// The accreditation ladder, lowest to highest. Used for both "what do you
// hold" and "what's required" fields, and for match scoring (a coach's
// index in this list must meet or exceed the requirement).
export const ACCREDITATION_LEVELS = [
  "None / In Progress",
  "Foundation of Football",
  "Foundation of GK",
  "C Licence/Diploma",
  "B Licence/Diploma",
  "A Licence/Diploma",
  "Pro Licence/Diploma",
] as const;

export const COACHING_ROLES = [
  "Head Coach",
  "Assistant Coach",
  "TD (Junior)",
  "TD (Senior)",
] as const;

// Alphabetical — unlike ACCREDITATION_LEVELS/AGE_GROUPS, these don't
// form a single clean low-to-high ladder, so alphabetical is the
// clearest ordering rather than an arbitrary one.
export const ABILITY_LEVELS = [
  "Grassroots",
  "Junior Development",
  "Youth Talent Pathway",
  "Senior Amateur",
  "Semi-Professional",
  "Professional / Elite",
] as const;

// Competition levels, grouped by state — same pattern as
// REGIONS_BY_STATE. Add a new state's ladder here as it comes on
// board.
export const COMPETITION_LEVELS_BY_STATE: Record<string, readonly string[]> = {
  // Women's/girls competitions confirmed directly — real names, not
  // normalised to match other states' "(Women's)" convention, since
  // Victoria's own naming is asymmetric (men's side largely unmarked,
  // women's/girls side carries its own distinct name).
  VIC: [
    "NPL Victoria",
    "NPLW",
    "VPL1 & VPL2",
    "VPL Women",
    "NPL/VPL Development (U20-23)",
    "YPLG Female",
    "State League 1 & 2",
    "State League Women",
    "State League 3-7",
    "Metropolitan League",
    "Regional League",
    "Community / Junior",
  ],
  // Cleaned up from the actual 2026-season competitions clubs listed —
  // gender is handled by the separate Team Gender field already on
  // the form, so gendered qualifiers (M+W / Women / Men) have been
  // dropped here to avoid duplicating that.
  TAS: [
    "NPL",
    "NPL U21s",
    "WSL",
    "Northern Championship",
    "Southern Championship",
    "Northern Youth Premier League",
    "Northern Youth Premier League U16s",
    "Southern Youth Premier League",
    "Northern Social League 1",
    "Northern Social League 2",
    "Southern Social League 1",
    "Southern Social League 2",
    "Southern Social League 3",
    "Social League Over 35s",
  ],
  // Cleaned from the 2026-season data — sponsor prefixes (e.g. "Cardiff
  // Motor Group", "HIT106.9") and roster-status notes dropped since
  // they're not part of the actual level name.
  NNSW: [
    "NPL Men's NNSW",
    "NPL Women's NNSW",
    "Northern League One",
    "Zone League One",
    "Zone League Two",
    "Zone League Three",
  ],
  // Cleaned of sponsor prefixes ("RAA", "HPG Homes", "Apex Steel") and
  // promotion/relegation/result annotations from the 2026-season data.
  SA: ["NPL SA (Men's)", "NPL SA (Women's)", "State League 1"],
  ACT: ["NPL Men's", "NPL Women's"],
  NT: ["Men's Premier League (Darwin)", "Women's Premier League (Darwin)"],
  // Cleaned of result/promotion annotations from the 2026-season data
  // ("2025 Premiers", "promoted via play-off", etc).
  WA: ["NPL WA (Men's)", "NPL WA (Women's)", "State League 1"],
  // Cleaned of the region names baked into some raw values (e.g.
  // "FQPL3 Central Coast" — redundant given the separate Region field)
  // and result/promotion annotations from the 2026-season data.
  QLD: [
    "NPL Queensland (Men's)",
    "NPL Queensland (Women's)",
    "FQPL1 (Men's)",
    "FQPL2 (Men's, statewide)",
    "FQPL3",
    "FQPL4",
    "FQPL (Regional)",
    "Metro Divisional 3",
    "Metro Divisional 4",
    "Metro Divisional 5",
    "Metro Divisional 6",
  ],
  // Corrected against Football NSW's confirmed 2026 structure:
  // League One runs separate Men's/Women's tiers, but League Two is
  // Men's only — the women's pyramid has just 3 levels (NPL, League
  // One, then SAFL/amateur), not 4.
  NSW: [
    "NPL NSW (Men's)",
    "NPL NSW (Women's)",
    "Football NSW League One (Men's)",
    "Football NSW League One (Women's)",
    "Football NSW League Two (Men's)",
    "Sydney Amateur Football League (Premier/Championship)",
  ],
};

export const COMPETITION_LEVELS = Object.values(COMPETITION_LEVELS_BY_STATE).flat();

export const AGE_GROUPS = [
  "U6-U8",
  "U9-U11",
  "U12-U13",
  "U14-U16",
  "U17-U18",
  "U20-23 / Reserves",
  "Senior",
  "Masters",
] as const;

export const GENDER_OPTIONS = ["Female", "Male", "No preference"] as const;

// Coach2Mentor specific
export const MENTOR_SPECIALISMS = [
  "Goalkeeping",
  "Female Football",
  "Session Design",
  "Technical Development",
  "Technical Director",
  "Club Management",
  "Youth Development",
  "Leadership & Culture",
  "Tactical / Game Model",
  "Player Welfare",
  "Talent Pathway",
] as const;

export const CAREER_STAGES = [
  "Grassroots / Junior / Youth",
  "Semi-Professional / State",
  "Professional / National",
] as const;

export const AVAILABILITY_OPTIONS = ["In-person", "Virtual", "Either"] as const;

export const RATE_UNITS = ["per session", "per hour", "per month"] as const;

// Pricing — activation fee per role listing. Coach In Mind charges per
// role, not per account: the same person pays separately for each hat
// they wear (Club2Coach coach, Club2Coach club, Coach2Mentor coach,
// Coach2Mentor mentor). These are placeholders until real pricing is set.
export const ROLE_PRICES_AUD = {
  club2coach_coach: 20, // starting tier — see CLUB2COACH_COACH_PACKAGES for the full ladder
  club2coach_club: 100, // starting tier — see CLUB2COACH_CLUB_PACKAGES for the full ladder
  coach2mentor_coach: 15,
  coach2mentor_mentor: 25,
} as const;

// Club2Coach runs on paid introduction packages rather than a flat
// fee — the number is how many coach<->club introductions that
// payment buys. Once a listing hits its package size, matching stops
// for it until it's topped up with another package.
export const CLUB2COACH_COACH_PACKAGES: Record<number, number> = {
  1: 20,
  2: 35,
  3: 50,
};

export const CLUB2COACH_CLUB_PACKAGES: Record<number, number> = {
  1: 100,
  2: 200,
  3: 300,
  4: 380,
  5: 440,
};

// Coach2Mentor mentor capacity — how many mentees a mentor can take on
// determines what they pay, since more capacity unlocks more potential
// revenue for them (mentors typically recoup this within a session or
// two of their own per-session rate).
export const COACH2MENTOR_MENTOR_CAPACITY_PACKAGES: Record<number, number> = {
  1: 100,
  3: 250,
  5: 350,
  10: 500,
};
