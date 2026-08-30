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
};

// The actual governing body name for each state/territory — used
// specifically for the "which Member Federation" picker, since
// that's the real term clubs and coaches will recognise. Add more
// entries here as more states come on board.
export const MEMBER_FEDERATIONS: Record<string, string> = {
  VIC: "Football Victoria",
  TAS: "Football Tasmania",
};

// The accreditation ladder, lowest to highest. Used for both "what do you
// hold" and "what's required" fields, and for match scoring (a coach's
// index in this list must meet or exceed the requirement).
export const ACCREDITATION_LEVELS = [
  "None / In Progress",
  "Foundation of Football",
  "Foundation of GK",
  "C Licence",
  "B Licence",
  "A Licence",
  "Pro Diploma",
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
  "Professional / Elite",
  "Semi-Professional",
  "Senior Amateur",
  "Youth Talent Pathway",
] as const;

export const COMPETITION_LEVELS = [
  "NPL Victoria",
  "VPL1 & VPL2",
  "NPL/VPL Development (U20-23)",
  "State League 1 & 2",
  "State League 3-7",
  "Metropolitan League",
  "Regional League",
  "Community / Junior",
] as const;

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

export const GENDER_OPTIONS = ["Male", "Female", "No preference"] as const;

// Coach2Mentor specific
export const MENTOR_SPECIALISMS = [
  "Goalkeeping",
  "Female Football",
  "Session Design",
  "Technical Development",
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
