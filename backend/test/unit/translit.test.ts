import { describe, it, expect } from 'vitest';
import { slugify, generateProfileSlug } from '../../src/utils/translit';

describe('Translit and Slug utilities', () => {
  describe('slugify', () => {
    it('should correctly transliterate cyrillic to latin', () => {
      expect(slugify('Привет Мир')).toBe('privet-mir');
      expect(slugify('Съешь ещё этих мягких французских булок, да выпей чаю')).toBe('sesh-esche-etih-myagkih-frantsuzskih-bulok-da-vypey-chayu');
    });

    it('should handle english letters and numbers', () => {
      expect(slugify('Hello World 123')).toBe('hello-world-123');
    });

    it('should remove special characters', () => {
      expect(slugify('Test! @#$%^&*()_+={}[]|\\:;"\'<>,.?/~` Test')).toBe('test-test');
    });

    it('should replace multiple spaces with single hyphen', () => {
      expect(slugify('Multiple     spaces')).toBe('multiple-spaces');
    });

    it('should trim hyphens from the edges', () => {
      expect(slugify('---test---')).toBe('test');
    });
  });

  describe('generateProfileSlug', () => {
    it('should combine firstName and lastName into a slug', () => {
      expect(generateProfileSlug('Иван', 'Иванов')).toBe('ivan-ivanov');
    });

    it('should handle empty lastName', () => {
      expect(generateProfileSlug('Иван')).toBe('ivan');
    });

    it('should append shortId if provided', () => {
      expect(generateProfileSlug('Иван', 'Иванов', 'abcdef12')).toBe('ivan-ivanov-abcdef12');
    });

    it('should handle undefined values gracefully', () => {
      expect(generateProfileSlug(undefined as any, undefined as any)).toBe('');
      expect(generateProfileSlug(undefined as any, 'Иванов')).toBe('ivanov');
    });
  });
});
