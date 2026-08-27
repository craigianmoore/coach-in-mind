// Shared reference data used across both Club2Coach and Coach2Mentor.
// Scoped to Victoria for now — when other states are added, this becomes
// state-keyed (e.g. REGIONS_BY_STATE.VIC, REGIONS_BY_STATE.NSW) rather
// than a flat list. Keeping it centralised here means that change happens
// in one place, not scattered across every form.

export const STATE = "VIC" as const;

export const REGIONS = [
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
] as const;

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

export const ABILITY_LEVELS = [
  "Grassroots",
  "Youth Talent Pathway",
  "Semi-Professional",
  "Junior Development",
  "Senior Amateur",
  "Professional / Elite",
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
  club2coach_coach: 15,
  club2coach_club: 45,
  coach2mentor_coach: 15,
  coach2mentor_mentor: 25,
} as const;
