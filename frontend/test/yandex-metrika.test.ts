// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';

describe('Yandex.Metrika SPA Route Tracking Plugin Unit Tests', () => {
  it('should safely record page hit events on window.ym during SPA route changes', () => {
    const mockYm = vi.fn();
    (window as any).ym = mockYm;

    if (typeof (window as any).ym === 'function') {
      (window as any).ym(110952885, 'hit', '/blog/test-article', {
        title: 'Тестовая статья | fyxi.ru',
        referer: 'https://fyxi.ru',
      });
    }

    expect(mockYm).toHaveBeenCalledWith(
      110952885,
      'hit',
      '/blog/test-article',
      expect.objectContaining({ title: expect.stringContaining('fyxi.ru') })
    );

    delete (window as any).ym;
  });
});
