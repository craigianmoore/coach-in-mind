// Australian postcodes are exactly four digits.
export const isValidPostcode = (s: string) => /^\d{4}$/.test(s.trim());
export const POSTCODE_FINDER_URL = "https://auspost.com.au/postcode";
