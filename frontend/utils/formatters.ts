/**
 * Format numeric value or string with space thousands separators (e.g. 100000 -> "100 000 ₽")
 */
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const numStr = String(value).replace(/\D/g, '');
  if (!numStr) return '';
  const formatted = parseInt(numStr, 10).toLocaleString('ru-RU').replace(/\u00a0/g, ' ');
  return `${formatted} ₽`;
}

/**
 * Format Telegram handle to ensure leading '@' without double '@' or spaces
 */
export function formatTelegram(handle: string): string {
  if (!handle) return '';
  const clean = handle.trim().replace(/\s+/g, '');
  if (!clean) return '';
  if (clean.startsWith('@')) {
    return '@' + clean.slice(1).replace(/@/g, '');
  }
  return '@' + clean.replace(/@/g, '');
}

/**
 * Simple regex email validity check
 */
export function isValidEmail(email: string): boolean {
  if (!email || !email.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
