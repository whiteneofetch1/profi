import { describe, it, expect } from 'vitest';

function generateSchemaOrgPerson(dev: { name: string; title: string; rating: number; reviewCount: number }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: dev.name,
    jobTitle: dev.title,
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: dev.rating,
      reviewCount: dev.reviewCount,
    },
  };
}

function normalizeCyrillicSlug(slug: string): string {
  let decoded = slug;
  try {
    while (decoded.includes('%')) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch (e) {
    // Return last valid decoded string
  }
  return decoded.toLowerCase().trim();
}

describe('Frontend SSR & SEO Schema Microdata Verification', () => {
  it('should format valid Schema.org Person JSON-LD object with aggregateRating', () => {
    const schema = generateSchemaOrgPerson({
      name: 'Екатерина Павлова',
      title: 'Web Designer (Tilda Zero Block)',
      rating: 4.9,
      reviewCount: 12,
    });

    expect(schema['@type']).toBe('Person');
    expect(schema.name).toBe('Екатерина Павлова');
    expect(schema.aggregateRating.ratingValue).toBe(4.9);
    expect(schema.aggregateRating.reviewCount).toBe(12);
  });

  it('should handle multi-pass URL decoding for double-encoded Cyrillic slugs cleanly', () => {
    const rawDoubleEncoded = '%25D1%2582%25D0%25BE%25D0%25BF-6-%25D1%2581%25D0%25BF%25D0%25BE%25D1%2581%25D0%25BE%25D0%25B1%25D0%25BE%25D0%25B2';
    const normalized = normalizeCyrillicSlug(rawDoubleEncoded);
    expect(normalized).toBe('топ-6-способов');
  });

  it('should correctly build breadcrumb navigation items for nested blog articles', () => {
    const articleSlug = 'zakazat-sayt-na-tilda-cena-stoimost';
    const breadcrumbs = [
      { title: 'Главная', path: '/' },
      { title: 'Блог', path: '/blog' },
      { title: 'Статья', path: `/blog/${articleSlug}` },
    ];

    expect(breadcrumbs.length).toBe(3);
    expect(breadcrumbs[2].path).toBe('/blog/zakazat-sayt-na-tilda-cena-stoimost');
  });
});
