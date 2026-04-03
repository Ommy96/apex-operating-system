/**
 * Formats a Kenyan phone number to M-Pesa format (2547XXXXXXXX).
 * Accepts: 07XX, +2547XX, 2547XX formats.
 * @throws Error if format is invalid
 */
export function formatMpesaPhone(phone: string): string {
  // Remove spaces, dashes, and plus sign
  let cleaned = phone.replace(/[\s\-+]/g, '');

  // Remove leading 0, add 254
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.slice(1);
  }

  // Already has country code without +
  if (!cleaned.startsWith('254')) {
    throw new Error('Phone number must be a Kenyan number starting with 07, +254, or 254');
  }

  // Validate: must be 12 digits starting with 2547
  if (!/^2547\d{8}$/.test(cleaned)) {
    throw new Error('Invalid M-Pesa phone number. Expected format: 2547XXXXXXXX (12 digits)');
  }

  return cleaned;
}

/**
 * Validates if a phone number can be formatted for M-Pesa
 */
export function isValidMpesaPhone(phone: string): boolean {
  try {
    formatMpesaPhone(phone);
    return true;
  } catch {
    return false;
  }
}
