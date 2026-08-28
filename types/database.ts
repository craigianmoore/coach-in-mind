export interface Person {
  id: string;
  user_id: string;
  full_name: string;
  mobile: string;
  email: string;
  gender: string | null;
  region: string | null;
  current_licence: string | null;
  admin_session_until: string | null;
  created_at: string;
  updated_at: string;
}

export type ListingStatus = "draft" | "active" | "paused" | "placed" | "filled" | "expired";

export interface Club {
  id: string;
  name: string;
  created_at: string;
}

export interface Club2CoachCoachListing {
  id: string;
  person_id: string;
  role_sought: string;
  preferred_team_gender: string | null;
  ability_levels: string[];
  preferred_competition_levels: string[];
  preferred_age_groups: string[];
  preferred_regions: string[];
  open_to_relocating: boolean;
  salary_min: number | null;
  salary_max: number | null;
  salary_negotiable: boolean;
  overview: string | null;
  notes: string | null;
  status: ListingStatus;
  authorise_share: boolean;
  paid: boolean;
  paid_at: string | null;
  price_aud: number | null;
  deleted_at: string | null; // soft-delete: set instead of removing the row, so payment history stays intact
  created_at: string;
  updated_at: string;
}

export interface Club2CoachClubVacancy {
  id: string;
  person_id: string;
  club_id: string | null; // FK to clubs — null only on pre-migration rows
  club_name: string; // denormalised from clubs.name at time of creation, for display
  role_being_recruited: string;
  competition_level: string;
  age_group: string;
  team_gender: string | null;
  preferred_coach_gender: string | null;
  region: string;
  required_accreditation: string;
  required_ability_level: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_negotiable: boolean;
  overview: string | null;
  priority_hints: string[];
  notes: string | null;
  status: ListingStatus;
  authorise_share: boolean;
  paid: boolean;
  paid_at: string | null;
  price_aud: number | null;
  shared_at: string | null; // set when the first coach is introduced; starts the 1-month contact window
  filled_at: string | null; // set when the club marks this vacancy as filled
  included_introductions: number | null; // package size (2, 3, or 5) set when marked paid — how many coach introductions this payment covers
  is_charity: boolean; // true when gifted for free rather than actually paid
  deleted_at: string | null; // soft-delete: set instead of removing the row, so payment history stays intact
  created_at: string;
  updated_at: string;
}

export interface Club2CoachShare {
  id: string;
  coach_listing_id: string;
  club_vacancy_id: string;
  score: number | null;
  admin_notes: string | null;
  status: "suggested" | "approved"; // suggested = admin-only, no contact info revealed yet; approved = both parties can see each other's details
  shared_at: string;
}

export interface Coach2MentorCoachListing {
  id: string;
  person_id: string;
  preferred_mentor_gender: string | null;
  availability: string | null;
  current_career_stage: string | null;
  support_areas: string[];
  meet_min: number | null;
  meet_max: number | null;
  budget_min: number | null;
  budget_max: number | null;
  goals: string | null;
  notes: string | null;
  status: ListingStatus;
  paid: boolean;
  paid_at: string | null;
  price_aud: number | null;
  deleted_at: string | null; // soft-delete: set instead of removing the row, so payment history stays intact
  created_at: string;
  updated_at: string;
}

export interface Coach2MentorMentorListing {
  id: string;
  person_id: string;
  preferred_coach_gender: string | null;
  availability: string | null;
  regions_served: string[];
  licence: string | null;
  career_stage: string | null;
  specialisms: string[];
  meet_capacity_per_year: number | null;
  rate_type: "paid" | "free";
  rate_amount: number | null;
  rate_unit: string | null;
  rate_negotiable: boolean;
  in_person_rate_differs: boolean;
  in_person_rate_amount: number | null;
  max_mentees: number | null;
  currently_open: boolean;
  bio: string | null;
  notes: string | null;
  status: ListingStatus;
  confirm_accurate: boolean;
  authorise_share: boolean;
  paid: boolean;
  paid_at: string | null;
  price_aud: number | null;
  deleted_at: string | null; // soft-delete: set instead of removing the row, so payment history stays intact
  created_at: string;
  updated_at: string;
}

export interface Coach2MentorRequest {
  id: string;
  coach_listing_id: string;
  mentor_listing_id: string;
  status: "pending" | "accepted" | "declined";
  message: string | null;
  score: number | null; // compatibility score captured when the request was sent
  created_at: string;
  responded_at: string | null;
}

export interface Payment {
  id: string;
  person_id: string;
  product: "club2coach" | "coach2mentor";
  role: "coach" | "club" | "mentor";
  listing_table: string;
  listing_id: string;
  amount_aud: number;
  status: string;
  marked_by_person_id: string | null;
  notes: string | null;
  created_at: string;
}

export interface Club2CoachWeights {
  accreditation: number;
  ability: number;
  competition_level: number;
  age_group: number;
  geography: number;
  salary: number;
  gender: number;
}

export interface Coach2MentorWeights {
  specialism_overlap: number;
  career_stage: number;
  geography: number;
  availability: number;
  budget_fit: number;
  gender: number;
}

export interface SalaryBenchmark {
  min: number;
  max: number;
}

export interface AdminSettings {
  id: string;
  product: "club2coach" | "coach2mentor";
  weights: Club2CoachWeights | Coach2MentorWeights;
  salary_benchmarks: Record<string, SalaryBenchmark>;
  auto_approve_matches: boolean; // club2coach only — when false (default), auto-matched suggestions need explicit admin approval before contact details are shared
  updated_at: string;
}

export interface SupportQuery {
  id: string;
  person_id: string | null;
  name: string;
  email: string;
  message: string;
  status: "open" | "resolved";
  admin_notes: string | null;
  created_at: string;
}
