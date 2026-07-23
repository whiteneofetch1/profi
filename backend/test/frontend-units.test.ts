import { describe, it, expect } from 'vitest';
import { slugify, generateProfileSlug } from '../src/utils/translit';
import { CITIES_LIST, getCityBySlug } from '../../frontend/utils/cities';

describe('Frontend & Shared Utility Unit Tests', () => {
  describe('Cyrillic Transliteration & Slugify Utility', () => {
    it('should generate URL-friendly lowercase slugs from Cyrillic names', () => {
      expect(slugify('Артем Смирнов')).toBe('artem-smirnov');
      expect(slugify('Екатеринбург')).toBe('ekaterinburg');
      expect(slugify('Senior UI/UX Designer')).toBe('senior-uiux-designer');
      expect(slugify('Москва  и   СПб!')).toBe('moskva-i-spb');
    });

    it('should generate profile slug with short ID', () => {
      const slug = generateProfileSlug('Артем', 'Смирнов', '550e8400-e29b-41d4-a716-446655440001');
      expect(slug).toBe('artem-smirnov-550e8400');
    });
  });

  describe('Geo-SEO Cities Utility', () => {
    it('should retrieve correct city object by slug', () => {
      const moscow = getCityBySlug('moscow');
      expect(moscow).toBeDefined();
      expect(moscow?.name).toBe('Москва');
      expect(moscow?.nameInCase).toBe('Москве');

      const spb = getCityBySlug('spb');
      expect(spb).toBeDefined();
      expect(spb?.name).toBe('Санкт-Петербург');
    });

    it('should return undefined for unknown city slugs', () => {
      expect(getCityBySlug('unknown-city-123')).toBeUndefined();
    });

    it('should contain valid city metadata list with name, nameInCase, and country', () => {
      expect(CITIES_LIST.length).toBeGreaterThan(10);
      CITIES_LIST.forEach(c => {
        expect(c.slug).toBeDefined();
        expect(c.name).toBeDefined();
        expect(c.nameInCase).toBeDefined();
        expect(c.country).toBeTruthy();
      });
    });
  });

  describe('Agency Bulk Discount Calculation Rules', () => {
    // Agency discount: 1-2 items = 2990 ₽ each; 3+ items = 1990 ₽ each
    function calculateCartTotal(itemCount: number): number {
      const pricePerItem = itemCount >= 3 ? 1990 : 2990;
      return itemCount * pricePerItem;
    }

    it('should charge 2990 RUB per profile for 1 item', () => {
      expect(calculateCartTotal(1)).toBe(2990);
    });

    it('should charge 2990 RUB per profile for 2 items', () => {
      expect(calculateCartTotal(2)).toBe(5980);
    });

    it('should trigger agency bulk discount (1990 RUB per profile) for 3 items', () => {
      expect(calculateCartTotal(3)).toBe(5970);
    });

    it('should apply bulk discount for 5 items (9950 RUB total)', () => {
      expect(calculateCartTotal(5)).toBe(9950);
    });
  });
});
