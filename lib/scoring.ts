import {
  ACCREDITATION_LEVELS,
  CAREER_STAGES,
} from "./constants";
import type {
  Club2CoachCoachListing,
  Club2CoachClubVacancy,
  Club2CoachWeights,
  Coach2MentorCoachListing,
  Coach2MentorMentorListing,
  Coach2MentorWeights,
} from "@/types/database";

// Every sub-score is 0-1. The final score is a weighted average using
// the admin-configured weights (which don't need to sum to anything in
// particular — they're normalised here).
function weightedAverage(scores: { value: number; weight: number }[]): number {
  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  if (totalWeight === 0) return 0;
  const weightedSum = scores.reduce((sum, s) => sum + s.value * s.weight, 0);
  return weightedSum / totalWeight;
}

function accreditationScore(coachLicence: string | null, requiredLicence: string): number {
  const coachIdx = ACCREDITATION_LEVELS.indexOf((coachLicence as any) ?? "None / In Progress");
  const requiredIdx = ACCREDITATION_LEVELS.indexOf(requiredLicence as any);
  if (coachIdx < 0 || requiredIdx < 0) return 0.5;
  if (coachIdx >= requiredIdx) return 1;
  // Below requirement: partial credit that shrinks the further short they are
  const gap = requiredIdx - coachIdx;
  return Math.max(0, 1 - gap / ACCREDITATION_LEVELS.length);
}

function overlapScore(preferred: string[], target: string | null | undefined): number {
  if (!target) return 0.5;
  if (!preferred || preferred.length === 0) return 0.5; // no stated preference = neutral, not a penalty
  return preferred.includes(target) ? 1 : 0;
}

function rangeOverlapScore(
  aMin: number | null,
  aMax: number | null,
  bMin: number | null,
  bMax: number | null,
  eitherNegotiable: boolean
): number {
  if (eitherNegotiable) return 1;
  if (aMin == null && aMax == null) return 0.5;
  if (bMin == null && bMax == null) return 0.5;
  const lo = Math.max(aMin ?? -Infinity, bMin ?? -Infinity);
  const hi = Math.min(aMax ?? Infinity, bMax ?? Infinity);
  if (lo <= hi) return 1; // ranges overlap
  // No overlap: score shrinks with distance, relative to the target range size
  const gap = lo - hi;
  const targetSpan = (bMax ?? bMin ?? 0) - (bMin ?? bMax ?? 0) || 1;
  return Math.max(0, 1 - gap / (targetSpan * 2));
}

function genderPreferenceScore(a: string | null | undefined, b: string | null | undefined): number {
  // Structural limitation, by design: contact-adjacent fields (actual
  // gender) live in the private `people` table and aren't broadly
  // readable, so this scores PREFERENCE COMPATIBILITY, not a verified
  // gender match. If either side has no strong preference, treat as
  // compatible; if both have a specific preference, we can't verify it
  // here, so give partial credit rather than a false "no match" or
  // false "perfect match".
  const aNeutral = !a || a === "No preference";
  const bNeutral = !b || b === "No preference";
  if (aNeutral || bNeutral) return 1;
  return 0.5;
}

export interface Club2CoachScoreBreakdown {
  total: number;
  accreditation: number;
  ability: number;
  competition_level: number;
  age_group: number;
  geography: number;
  salary: number;
  gender: number;
}

export function scoreClub2CoachMatch(
  coach: Club2CoachCoachListing,
  coachLicence: string | null,
  vacancy: Club2CoachClubVacancy,
  weights: Club2CoachWeights
): Club2CoachScoreBreakdown {
  const accreditation = accreditationScore(coachLicence, vacancy.required_accreditation);
  const ability = overlapScore(coach.ability_levels, vacancy.required_ability_level);
  const competition_level = overlapScore(coach.preferred_competition_levels, vacancy.competition_level);
  const age_group = overlapScore(coach.preferred_age_groups, vacancy.age_group);
  const geography = coach.open_to_relocating
    ? 1
    : overlapScore(coach.preferred_regions, vacancy.region);
  const salary = rangeOverlapScore(
    coach.salary_min,
    coach.salary_max,
    vacancy.salary_min,
    vacancy.salary_max,
    coach.salary_negotiable || vacancy.salary_negotiable
  );
  const gender = weightedAverage([
    { value: genderPreferenceScore(coach.preferred_team_gender, vacancy.team_gender), weight: 1 },
    { value: genderPreferenceScore(vacancy.preferred_coach_gender, null), weight: 1 },
  ]);

  const total = weightedAverage([
    { value: accreditation, weight: weights.accreditation },
    { value: ability, weight: weights.ability },
    { value: competition_level, weight: weights.competition_level },
    { value: age_group, weight: weights.age_group },
    { value: geography, weight: weights.geography },
    { value: salary, weight: weights.salary },
    { value: gender, weight: weights.gender },
  ]);

  return { total, accreditation, ability, competition_level, age_group, geography, salary, gender };
}

export interface Coach2MentorScoreBreakdown {
  total: number;
  specialism_overlap: number;
  career_stage: number;
  geography: number;
  availability: number;
  budget_fit: number;
  gender: number;
}

export function scoreCoach2MentorMatch(
  coach: Coach2MentorCoachListing,
  coachRegion: string | null,
  mentor: Coach2MentorMentorListing,
  weights: Coach2MentorWeights
): Coach2MentorScoreBreakdown {
  // Specialism overlap: intersection size relative to what the coach asked for
  const wanted = coach.support_areas ?? [];
  const offered = mentor.specialisms ?? [];
  const intersection = wanted.filter((s) => offered.includes(s));
  const specialism_overlap =
    wanted.length === 0 ? 0.5 : intersection.length / wanted.length;

  const coachStageIdx = CAREER_STAGES.indexOf((coach.current_career_stage as any) ?? "");
  const mentorStageIdx = CAREER_STAGES.indexOf((mentor.career_stage as any) ?? "");
  let career_stage = 0.5;
  if (coachStageIdx >= 0 && mentorStageIdx >= 0) {
    // A mentor at or above the coach's stage is ideal; too far below is weak
    career_stage = mentorStageIdx >= coachStageIdx ? 1 : 0.4;
  }

  const isRemoteFriendly =
    coach.availability === "Virtual" ||
    coach.availability === "Either" ||
    mentor.availability === "Virtual" ||
    mentor.availability === "Either";
  const geography = isRemoteFriendly
    ? 1
    : coachRegion && mentor.regions_served?.includes(coachRegion)
    ? 1
    : 0.3;

  const availability =
    coach.availability === "Either" || mentor.availability === "Either"
      ? 1
      : coach.availability === mentor.availability
      ? 1
      : 0.4;

  const budget_fit =
    mentor.rate_type === "free"
      ? 1
      : rangeOverlapScore(
          coach.budget_min,
          coach.budget_max,
          mentor.rate_amount,
          mentor.rate_amount,
          mentor.rate_negotiable
        );

  const gender = genderPreferenceScore(coach.preferred_mentor_gender, mentor.preferred_coach_gender);

  const total = weightedAverage([
    { value: specialism_overlap, weight: weights.specialism_overlap },
    { value: career_stage, weight: weights.career_stage },
    { value: geography, weight: weights.geography },
    { value: availability, weight: weights.availability },
    { value: budget_fit, weight: weights.budget_fit },
    { value: gender, weight: weights.gender },
  ]);

  return { total, specialism_overlap, career_stage, geography, availability, budget_fit, gender };
}
