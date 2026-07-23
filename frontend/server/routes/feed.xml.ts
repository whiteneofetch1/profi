export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  let posts: any[] = [];
  try {
    posts = await $fetch<any[]>(`${config.public.apiUrl}/blog`);
  } catch (err) {
    posts = [];
  }

  const domain = 'https://fyxi.ru';
  const nowISO = new Date().toUTCString();

  const itemsXML = posts.map(post => {
    const postUrl = `${domain}/blog/${post.slug}`;
    const pubDate = post.publishDate ? new Date(post.publishDate).toUTCString() : nowISO;
    const authorName = post.author || 'Редакция fyxi.ru';

    return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <description><![CDATA[${post.description || ''}]]></description>
      <author><![CDATA[${authorName}]]></author>
      <category><![CDATA[${post.category || 'Блог'}]]></category>
      <pubDate>${pubDate}</pubDate>
    </item>`;
  }).join('');

  const rssFeedXML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>fyxi.ru — Блог о Tilda, веб-дизайне и IT-найме</title>
    <link>${domain}/blog</link>
    <description>Полезные руководства, кейсы и аналитика для заказчиков и специалистов Tilda Zero Block.</description>
    <language>ru-RU</language>
    <lastBuildDate>${nowISO}</lastBuildDate>
    <atom:link href="${domain}/feed.xml" rel="self" type="application/rss+xml" />
    ${itemsXML}
  </channel>
</rss>`;

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8');
  setHeader(event, 'Cache-Control', 'public, max-age=3600, s-maxage=3600');
  return rssFeedXML;
});
