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
