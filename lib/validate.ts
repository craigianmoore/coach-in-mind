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

// Names: no digits or symbols (so letters in any language, spaces, hyphens, apostrophes and full stops are fine).
const NAME_BAD = /[\d_@#$%^&*()+=<>[\]{}|\\/~`!?:;,"\u00A0-\u00BF\u2000-\u2BFF\uD800-\uDFFF]/;
const NAME_BAD_G = new RegExp(NAME_BAD.source, "g");
export const isValidName = (s: string) => {
  const t = s.trim();
  return t.length >= 2 && /[^\s'\u2019.\-]/.test(t) && !NAME_BAD.test(t);
};
export const cleanName = (s: string) => s.replace(NAME_BAD_G, "");
export const NAME_ERROR = "Please enter your name using letters only (spaces, hyphens and apostrophes are fine). No numbers or symbols.";

// Whole-number fields (pay, budgets, meetings): digits only, so no letters, minus signs, decimals or "e" notation.
export const digitsOnly = (s: string, maxLen = 7) => s.replace(/\D/g, "").slice(0, maxLen);
