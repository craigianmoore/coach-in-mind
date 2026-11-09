// Shared input checks for contact details.

// Needs something@domain.tld: no spaces, one @, and a dot-separated domain with a 2+ letter ending.
export const isValidEmail = (s: string) => /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/.test(s.trim());

// Mobile numbers are digits only, with optional spaces, +, hyphens or brackets for readability. 8-15 digits, no letters.
export const isValidMobile = (s: string) => {
  const t = s.trim();
  if (!/^\+?[\d\s\-()]+$/.test(t)) return false;
  const digits = t.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
};

export const EMAIL_ERROR = "Please enter a valid email address, like name@example.com.";
export const MOBILE_ERROR = "Please enter a valid mobile number using digits only, like 0412 345 678 (no letters).";

// Names: English letters only (A-Z, a-z), plus spaces, hyphens, apostrophes and full stops. No digits, symbols or
// accented / non-English letters. The database enforces the same rule.
export const isValidName = (s: string) => /^[A-Za-z][A-Za-z '\u2019.\-]*$/.test(s.trim()) && s.trim().length >= 2;
export const cleanName = (s: string) => s.replace(/[^A-Za-z '\u2019.\-]/g, "");
export const NAME_ERROR = "Please enter your name using English letters only (spaces, hyphens and apostrophes are fine). No numbers, symbols or accents.";

// Whole-number fields (pay, budgets, meetings): digits only, so no letters, minus signs, decimals or "e" notation.
export const digitsOnly = (s: string, maxLen = 7) => s.replace(/\D/g, "").slice(0, maxLen);
