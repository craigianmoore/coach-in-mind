// Shared input checks for contact details.

// Needs something@domain.tld: no spaces, one @, and a dot-separated domain with a 2+ letter ending.
export const isValidEmail = (s: string) => /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[A-Za-z]{2,}$/.test(s.trim());

// Mobile numbers are exactly 10 digits, digits only (e.g. 0412345678).
export const isValidMobile = (s: string) => /^\d{10}$/.test(s.trim());

export const EMAIL_ERROR = "Please enter a valid email address, like name@example.com.";
export const MOBILE_ERROR = "Please enter your mobile as exactly 10 digits, like 0412345678 (digits only, no spaces or letters).";

// Names: English-style (Latin) letters only, accents allowed (e.g. José, Zoë), plus spaces, hyphens, apostrophes and
// full stops. No digits, symbols, or non-Latin scripts. The database enforces the same rule.
const L = "A-Za-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u024F";
const NAME_RE = new RegExp("^[" + L + "][" + L + " '\\u2019.\\-]*$");
const NAME_BAD_RE = new RegExp("[^" + L + " '\\u2019.\\-]", "g");
export const isValidName = (s: string) => NAME_RE.test(s.trim()) && s.trim().length >= 2;
export const cleanName = (s: string) => s.replace(NAME_BAD_RE, "");
export const NAME_ERROR = "Please enter your name using English-style letters (accents are fine, like José). Spaces, hyphens and apostrophes are fine too. No numbers, symbols or non-Latin letters.";

// Whole-number fields (pay, budgets, meetings): digits only, so no letters, minus signs, decimals or "e" notation.
export const digitsOnly = (s: string, maxLen = 7) => s.replace(/\D/g, "").slice(0, maxLen);

// Tidies an existing or pasted mobile into the 10-digit form: strips spaces and symbols, and turns +61 412 345 678 into 0412345678.
export const tidyMobile = (s: string) => {
  let d = s.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("61")) d = "0" + d.slice(2);
  return d.slice(0, 10);
};

// Limits the forms enforce (the database enforces the same ones).
export const MAX_PAY = 100000; // anything above is shown as "$100,000+"
export const MAX_MEETINGS_PER_YEAR = 52; // about one a week
// Digits only, held at a ceiling. Returns the cleaned text.
export const clampDigits = (s: string, max: number) => {
  const d = digitsOnly(s);
  return d !== "" && Number(d) > max ? String(max) : d;
};
