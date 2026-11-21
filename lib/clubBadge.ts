// "Recruits through Coach In Mind": a process badge, not a quality rating. The rules live in SQL (compute_club_badge);
// this file only labels the result.
export type BadgeStatus = { description: boolean; pay: boolean; responsive: boolean; contact: boolean };

export const BADGE_NAME = "Recruits through Coach In Mind";
export const BADGE_DESCRIPTION =
  "This club advertises roles with a full description and stated pay, answers coaches it is introduced to, and names a contact.";

export const BADGE_CRITERIA: { key: keyof BadgeStatus; label: string; fix: string }[] = [
  { key: "description", label: "Complete role description", fix: "Fill in role, level, age group, region, ability level and an overview of a few sentences (at least 100 characters)." },
  { key: "pay", label: "Pay stated", fix: "Enter a minimum, a maximum, or tick negotiable." },
  { key: "responsive", label: "No introduction left unanswered", fix: "Tell us how each introduction over 14 days old went (filled or not filled)." },
  { key: "contact", label: "Named, reachable contact", fix: "Add your full name and mobile number to your profile." },
];

export const badgeEarned = (s: BadgeStatus | null | undefined) => !!s && s.description && s.pay && s.responsive && s.contact;
