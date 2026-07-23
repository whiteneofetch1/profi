/**
 * Utility for converting Russian Cyrillic text to clean, SEO-friendly Latin slugs (ЧПУ)
 */

const CYRILLIC_MAP: Record<string, string> = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
  'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
  'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
  'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '',
  'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
  'А': 'a', 'Б': 'b', 'В': 'v', 'Г': 'g', 'Д': 'd', 'Е': 'e', 'Ё': 'e',
  'Ж': 'zh', 'З': 'z', 'И': 'i', 'Й': 'y', 'К': 'k', 'Л': 'l', 'М': 'm',
  'Н': 'n', 'О': 'o', 'П': 'p', 'Р': 'r', 'С': 's', 'Т': 't', 'У': 'u',
  'Ф': 'f', 'Х': 'h', 'Ц': 'ts', 'Ч': 'ch', 'Ш': 'sh', 'Щ': 'sch', 'Ъ': '',
  'Ы': 'y', 'Ь': '', 'Э': 'e', 'Ю': 'yu', 'Я': 'ya'
};

export function slugify(text: string): string {
  if (!text) return '';

  let converted = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    converted += CYRILLIC_MAP[char] !== undefined ? CYRILLIC_MAP[char] : char;
  }

  return converted
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // remove special characters
    .trim()
    .replace(/[\s_]+/g, '-')       // replace spaces/underscores with hyphens
    .replace(/-+/g, '-')           // collapse consecutive hyphens
    .replace(/^-+|-+$/g, '');      // trim hyphens from edges
}

export function generateProfileSlug(firstName?: string, lastName?: string, id?: string): string {
  const parts = [firstName, lastName].filter(Boolean).join(' ');
  const namePart = slugify(parts);
  const shortId = id ? id.slice(0, 8) : '';
  if (namePart && shortId) {
    return `${namePart}-${shortId}`;
  }
  return namePart || shortId || id || '';
}
