import { defineEventHandler, setHeader } from 'h3';
import { CITIES_LIST } from '~/utils/cities';

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const backendUrl = process.env.API_URL || config.public.apiUrl || 'http://localhost:3001';
  
  let profiles: any[] = [];
  try {
    // Call backend API to retrieve approved profiles
    profiles = await $fetch<any[]>(`${backendUrl}/profiles`);
  } catch (error) {
    console.error('Sitemap fetch profiles error:', error);
  }

  let articles: any[] = [];
  try {
    // Call backend API to retrieve published articles
    articles = await $fetch<any[]>(`${backendUrl}/blog`);
  } catch (error) {
    console.error('Sitemap fetch blog posts error:', error);
  }

  // Dynamically resolve protocol and host to support local testing, staging, and production domains automatically
  const reqHeaders = event.node.req.headers;
  const protocol = (reqHeaders['x-forwarded-proto'] as string) || 'https';
  const host = (reqHeaders['x-forwarded-host'] as string) || reqHeaders.host || 'fyxi.ru';
  const baseUrl = `${protocol}://${host}`;
  const today = new Date().toISOString().split('T')[0];

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return today;
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch {
      return today;
    }
  };

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <!-- Static Core Pages -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/blog</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/privacy</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${baseUrl}/terms</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>

  <!-- Dynamic Knowledge Base Blog Articles -->
  ${articles.map(post => {
    const lastMod = formatDate(post.publishDate || post.updatedAt || post.createdAt);
    return `<url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
  }).join('\n')}

  <!-- 100 CIS Geo-SEO City Landing Pages -->
  ${CITIES_LIST.map(c => `<url>
    <loc>${baseUrl}/city/${c.slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.85</priority>
  </url>`).join('\n')}

  <!-- Dynamic Freelancers & Designers Profiles -->
  ${profiles.map(p => {
    const lastMod = formatDate(p.updatedAt || p.createdAt);
    const avatarImage = p.avatarUrl ? `
    <image:image>
      <image:loc>${p.avatarUrl.startsWith('http') ? p.avatarUrl : `${baseUrl}${p.avatarUrl}`}</image:loc>
      <image:title>${p.firstName} ${p.lastName} — ${p.title}</image:title>
    </image:image>` : '';

    return `<url>
    <loc>${baseUrl}/profiles/${p.id}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>${avatarImage}
  </url>`;
  }).join('\n')}
</urlset>`;

  // Set response headers for optimal indexing
  setHeader(event, 'Content-Type', 'application/xml');
  setHeader(event, 'Cache-Control', 'public, max-age=3600, s-maxage=14400');
  
  return sitemapXml;
});
