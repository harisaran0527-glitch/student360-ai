/**
 * Security & Data Privacy Helper Module
 */

/**
 * Mask sensitive Aadhaar number by default (e.g., "XXXX-XXXX-1234")
 */
export function maskAadhaar(aadharNo?: string | null): string {
  if (!aadharNo) return "N/A";
  const cleaned = aadharNo.replace(/\D/g, "");
  if (cleaned.length < 4) return "XXXX-XXXX-XXXX";
  const last4 = cleaned.slice(-4);
  return `XXXX-XXXX-${last4}`;
}

/**
 * Mask sensitive personal phone number
 */
export function maskPhone(phone?: string | null): string {
  if (!phone) return "N/A";
  const cleaned = phone.trim();
  if (cleaned.length < 4) return "****";
  return `******${cleaned.slice(-4)}`;
}

/**
 * Sanitizes cell text to prevent CSV Formula Injection attacks.
 * Neutralizes leading '=', '+', '-', '@' characters.
 */
export function sanitizeCSVCell(cellValue: any): string {
  if (cellValue === null || cellValue === undefined) return "";
  const str = String(cellValue).trim();
  if (str.length > 0 && ["=", "+", "-", "@"].includes(str.charAt(0))) {
    return `'${str}`;
  }
  return str;
}
