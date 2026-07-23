import { describe, it, expect } from 'vitest';

// Replicate / test the slug cleaning utility used in super admin
function getCleanSlug(slug?: string): string {
  if (!slug) return '';
  return slug.trim().replace(/^\/+|\/+$/g, '');
}

describe('Super Admin Links & Slug Sanitization Utility', () => {
  it('should clean leading slashes from slug', () => {
    expect(getCleanSlug('/kak-vybrat-tilda-razrabotchika')).toBe('kak-vybrat-tilda-razrabotchika');
  });

  it('should clean trailing slashes from slug', () => {
    expect(getCleanSlug('poshagovaya-animaciya-v-tilda/')).toBe('poshagovaya-animaciya-v-tilda');
  });

  it('should clean both leading and trailing slashes', () => {
    expect(getCleanSlug('///seo-optimizaciya-sajta///')).toBe('seo-optimizaciya-sajta');
  });

  it('should return clean slug unmodified', () => {
    expect(getCleanSlug('my-article-slug')).toBe('my-article-slug');
  });

  it('should safely handle empty, space, or undefined inputs', () => {
    expect(getCleanSlug('')).toBe('');
    expect(getCleanSlug(undefined)).toBe('');
    expect(getCleanSlug('   ')).toBe('');
  });

  it('should construct valid article URLs for NuxtLink', () => {
    const rawPost = { slug: '/kak-podklyuchit-yukassa/' };
    const articleUrl = '/blog/' + getCleanSlug(rawPost.slug);
    expect(articleUrl).toBe('/blog/kak-podklyuchit-yukassa');
  });

  it('should construct valid specialist profile URLs for NuxtLink', () => {
    const profileWithSlug = { id: 'uuid-123', slug: 'alexey-mironov' };
    const profileWithoutSlug = { id: 'uuid-456', slug: null };

    const url1 = '/profiles/' + (profileWithSlug.slug || profileWithSlug.id);
    const url2 = '/profiles/' + (profileWithoutSlug.slug || profileWithoutSlug.id);

    expect(url1).toBe('/profiles/alexey-mironov');
    expect(url2).toBe('/profiles/uuid-456');
  });
});
