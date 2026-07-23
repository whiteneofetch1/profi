import { describe, it, expect } from 'vitest';
import { formatCurrency, formatTelegram, isValidEmail } from '../utils/formatters';

describe('Formatters Utility Suite', () => {
  it('should format numbers with thousands separators and ruble sign', () => {
    expect(formatCurrency(100000)).toBe('100 000 ₽');
    expect(formatCurrency('250000')).toBe('250 000 ₽');
    expect(formatCurrency('')).toBe('');
    expect(formatCurrency(null)).toBe('');
  });

  it('should format Telegram username with single leading @ sign', () => {
    expect(formatTelegram('alex_dev')).toBe('@alex_dev');
    expect(formatTelegram('@alex_dev')).toBe('@alex_dev');
    expect(formatTelegram('  @alex_dev  ')).toBe('@alex_dev');
    expect(formatTelegram('')).toBe('');
  });

  it('should validate email addresses correctly', () => {
    expect(isValidEmail('client@company.ru')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});
