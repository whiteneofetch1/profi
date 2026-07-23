<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '~/stores/auth';

const route = useRoute();
let slug = route.params.slug as string;
try {
  while (slug && slug.includes('%')) {
    const decoded = decodeURIComponent(slug);
    if (decoded === slug) break;
    slug = decoded;
  }
} catch (e) {}

const config = useRuntimeConfig();
const authStore = useAuthStore();
const tokenCookie = useCookie('token');
const userToken = authStore.token || tokenCookie.value;
const fetchHeaders: Record<string, string> = {};
if (userToken) {
  fetchHeaders.authorization = `Bearer ${userToken}`;
}

// Fetch article dynamically from Fastify backend
const { data: article } = await useFetch<any>(`${config.public.apiUrl}/blog/${encodeURIComponent(slug)}`, {
  headers: fetchHeaders,
});

// If the article is not found or is scheduled in the future, Nuxt will return 404
if (!article.value) {
  throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Статья не найдена', fatal: true });
}

// Fetch list of all published blog posts to display related ones
const { data: allArticles } = await useFetch<any[]>(`${config.public.apiUrl}/blog`);
const relatedArticles = computed(() => {
  if (!allArticles.value || !article.value) return [];
  return allArticles.value
    .filter(p => p.slug !== slug)
    .slice(0, 3);
});

function getCategoryTheme(cat: string) {
  if (!cat) return 'cat-purple';
  const c = cat.toLowerCase();
  if (c.includes('экономика') || c.includes('найм') || c.includes('бюджет')) return 'cat-purple';
  if (c.includes('маркетплейс') || c.includes('платформ')) return 'cat-cyan';
  if (c.includes('e-commerce') || c.includes('магазин') || c.includes('корзин')) return 'cat-emerald';
  if (c.includes('технологии') || c.includes('разработк')) return 'cat-indigo';
  if (c.includes('дизайн') || c.includes('zero block')) return 'cat-pink';
  return 'cat-purple';
}

const tableOfContents = computed(() => {
  if (!article.value) return [];
  const regex = /<h2 id="([^"]+)">([^<]+)<\/h2>/g;
  const headings = [];
  let match;
  regex.lastIndex = 0;
  while ((match = regex.exec(article.value.content)) !== null) {
    headings.push({
      id: match[1],
      text: match[2]
    });
  }
  return headings;
});

// Setup metadata and schema.org JSON-LD microdata
const url = useRequestURL();

useSeoMeta({
  title: () => article.value ? `${article.value.title} | Блог fyxi` : 'Статья не найдена | Блог fyxi',
  ogTitle: () => article.value ? `${article.value.title} | Блог fyxi` : 'Статья не найдена',
  description: () => article.value ? article.value.description : 'Статья блога fyxi.ru.',
  ogDescription: () => article.value ? article.value.description : 'Информационная статья.',
  ogType: 'article',
  ogImage: '/og-image.jpg',
  twitterCard: 'summary_large_image',
  twitterTitle: () => article.value ? `${article.value.title} | Блог fyxi` : 'Статья не найдена',
  twitterDescription: () => article.value ? article.value.description : 'Статья блога.',
  twitterImage: '/og-image.jpg',
  keywords: () => article.value ? article.value.keywords.join(', ') : 'fyxi, IT, блог, фриланс'
});

useHead({
  link: [
    { rel: 'canonical', href: computed(() => `${url.origin}/blog/${slug}`) }
  ],
  script: computed(() => {
    if (!article.value) return [];
    
    const blogPostingSchema = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      'headline': article.value.title,
      'description': article.value.description || `Читайте статью: ${article.value.title}. Автор: ${article.value.author}. Категория: ${article.value.category}.`,
      'datePublished': article.value.publishDate ? article.value.publishDate.split('T')[0] : '2026-07-22',
      'articleBody': article.value.content.replace(/<[^>]+>/g, '').trim(),
      'wordCount': article.value.content.split(/\s+/).filter(Boolean).length,
      'timeRequired': `PT${article.value.readTime.replace(/[^0-9]/g, '')}M`,
      'author': {
        '@type': 'Person',
        'name': article.value.author,
        'jobTitle': article.value.authorRole
      },
      'publisher': {
        '@type': 'Organization',
        'name': 'fyxi',
        'logo': {
          '@type': 'ImageObject',
          'url': 'https://fyxi.ru/favicon.svg'
        }
      },
      'mainEntityOfPage': {
        '@type': 'WebPage',
        '@id': url.href
      }
    };

    const breadcrumbsSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        {
          '@type': 'ListItem',
          'position': 1,
          'name': 'Главная',
          'item': url.origin
        },
        {
          '@type': 'ListItem',
          'position': 2,
          'name': 'Блог',
          'item': `${url.origin}/blog`
        },
        {
          '@type': 'ListItem',
          'position': 3,
          'name': article.value.title,
          'item': url.href
        }
      ]
    };

    return [
      { type: 'application/ld+json', children: JSON.stringify(blogPostingSchema) },
      { type: 'application/ld+json', children: JSON.stringify(breadcrumbsSchema) }
    ];
  })
});

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const dateObj = new Date(dateStr);
  const months = [
    'Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня',
    'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'
  ];
  const day = dateObj.getDate();
  const month = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  return `${day} ${month}, ${year}`;
}
</script>

<template>
  <div class="article-page">
    <div class="article-container">
      
      <!-- Breadcrumbs -->
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <NuxtLink to="/">Главная</NuxtLink>
        <span class="separator">/</span>
        <NuxtLink to="/blog">Блог</NuxtLink>
        <span class="separator">/</span>
        <span class="current" v-if="article">{{ article.title }}</span>
      </nav>

      <article v-if="article" class="article-body">
        
        <!-- Header -->
        <header class="article-header">
          <span :class="['category-badge', getCategoryTheme(article.category)]">{{ article.category }}</span>
          <h1 class="article-title">{{ article.title }}</h1>
          
          <div class="author-row">
            <div class="author-avatar">
              {{ article.author[0] }}
            </div>
            <div class="author-meta">
              <span class="author-name">{{ article.author }}</span>
              <span class="author-role">{{ article.authorRole }}</span>
            </div>
            <span class="dot-divider">•</span>
            <span class="pub-date">{{ formatDate(article.publishDate) }}</span>
            <span class="dot-divider">•</span>
            <span class="read-time">⏱️ {{ article.readTime }} чтения</span>
          </div>
        </header>

        <!-- Table of Contents -->
        <nav v-if="tableOfContents.length > 0" class="toc-box">
          <span class="toc-title">Содержание статьи:</span>
          <ul class="toc-list">
            <li v-for="heading in tableOfContents" :key="heading.id">
              <a :href="`#${heading.id}`" class="toc-link">{{ heading.text }}</a>
            </li>
          </ul>
        </nav>

        <!-- Dynamic SEO Article Content -->
        <section class="rich-text-content" v-html="article.content"></section>

        <!-- Article Keywords/Tags -->
        <div v-if="article.keywords && article.keywords.length > 0" class="article-tags">
          <span v-for="tag in article.keywords" :key="tag" class="tag-item">#{{ tag }}</span>
        </div>

        <!-- Footer / CTA -->
        <footer class="article-footer">
          <div class="cta-box">
            <h3>🛸 Ищете проверенных специалистов и разработчиков на Tilda Zero Block?</h3>
            <p>В нашем каталоге собрано более 30 квалифицированных разработчиков и UX/UI дизайнеров с открытыми портфолио, проверенных модераторами. Покупайте прямые контакты исполнителей без наценок и переплат агентствам.</p>
            <NuxtLink to="/" class="cta-btn">Перейти в каталог специалистов</NuxtLink>
          </div>
        </footer>

      </article>

      <!-- Related Articles Section -->
      <section v-if="relatedArticles.length > 0" class="related-articles">
        <h3 class="related-title">Читайте также в Базе Знаний:</h3>
        <div class="related-grid">
          <NuxtLink 
            v-for="related in relatedArticles" 
            :key="related.slug" 
            :to="'/blog/' + related.slug" 
            class="related-card"
          >
            <span :class="['related-category', getCategoryTheme(related.category)]">{{ related.category }}</span>
            <h4 class="related-card-title">{{ related.title }}</h4>
            <span class="related-read-time">⏱️ {{ related.readTime }} чтения</span>
          </NuxtLink>
        </div>
      </section>

      <div v-else class="not-found-state">
        <h2>⚠️ Статья не найдена</h2>
        <p>К сожалению, такой публикации не существует в нашей базе знаний.</p>
        <NuxtLink to="/blog" class="back-btn-error">В раздел статей</NuxtLink>
      </div>

    </div>
  </div>
</template>

<style scoped>
.article-page {
  padding: 5rem 1.5rem;
  min-height: 100vh;
  text-align: left;
}

.article-container {
  max-width: 800px;
  margin: 0 auto;
}

/* --- ARTICLE TAGS --- */
.article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 3rem 0;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--border-glow);
}

.tag-item {
  font-size: 0.85rem;
  color: var(--accent-cyan);
  background: rgba(6, 182, 212, 0.06);
  border: 1px solid rgba(6, 182, 212, 0.15);
  padding: 0.3rem 0.75rem;
  border-radius: 20px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.tag-item:hover {
  background: rgba(6, 182, 212, 0.12);
  border-color: var(--accent-cyan);
  box-shadow: 0 0 10px rgba(6, 182, 212, 0.2);
}

/* --- BREADCRUMBS --- */
.breadcrumbs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.95rem;
  margin-bottom: 2.5rem;
  color: var(--text-muted);
}

.breadcrumbs a {
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.2s ease;
}

.breadcrumbs a:hover {
  color: var(--accent-cyan);
}

.breadcrumbs .separator {
  color: var(--border-glow);
  user-select: none;
}

.breadcrumbs .current {
  color: var(--text-primary);
  font-weight: 500;
  max-width: 350px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* --- HEADER --- */
.article-header {
  border-bottom: 1px solid var(--border-glow);
  padding-bottom: 2rem;
  margin-bottom: 2.5rem;
}

.category-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.9rem;
  border-radius: 9999px;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 1.2rem;
  transition: all 0.25s ease;
  width: fit-content;
}

.article-title {
  font-size: 2.5rem;
  line-height: 1.2;
  margin-bottom: 1.5rem;
  color: #fff;
  font-weight: 700;
}

.author-row {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  flex-wrap: wrap;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.author-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--gradient-cyber);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.95rem;
}

.author-meta {
  display: flex;
  flex-direction: column;
}

.author-name {
  color: #fff;
  font-weight: 600;
}

.author-role {
  font-size: 0.75rem;
}

.dot-divider {
  color: rgba(255,255,255,0.15);
}

/* --- RICH CONTENT --- */
.rich-text-content {
  color: rgba(255, 255, 255, 0.85);
  font-size: 1.12rem;
  line-height: 1.7;
  font-weight: 300;
}

.rich-text-content :deep(p) {
  margin-bottom: 1.8rem;
}

.rich-text-content :deep(h2) {
  font-size: 1.6rem;
  color: #fff;
  margin-top: 2.5rem;
  margin-bottom: 1.2rem;
  font-weight: 600;
}

.rich-text-content :deep(ul), .rich-text-content :deep(ol) {
  margin-bottom: 1.8rem;
  padding-left: 1.5rem;
}

.rich-text-content :deep(li) {
  margin-bottom: 0.6rem;
}

.rich-text-content :deep(blockquote) {
  border-left: 3px solid var(--accent-cyan);
  background: rgba(6, 182, 212, 0.02);
  padding: 1.5rem;
  border-radius: 0 16px 16px 0;
  margin: 2.2rem 0;
  font-style: italic;
  font-size: 1.15rem;
  color: #fff;
  line-height: 1.6;
}

.rich-text-content :deep(.code-inline) {
  background: rgba(255,255,255,0.06);
  padding: 0.2rem 0.4rem;
  border-radius: 6px;
  font-size: 0.95rem;
  font-family: monospace;
  color: var(--accent-cyan);
}

/* --- CTA FOOTER --- */
.article-footer {
  margin-top: 4rem;
  border-top: 1px solid var(--border-glow);
  padding-top: 3rem;
}

.cta-box {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(6, 182, 212, 0.05));
  border: 1px solid var(--border-glow);
  padding: 2.5rem;
  border-radius: 24px;
  text-align: center;
}

.cta-box h3 {
  font-size: 1.35rem;
  color: #fff;
  margin-bottom: 1rem;
}

.cta-box p {
  color: var(--text-muted);
  font-size: 0.95rem;
  line-height: 1.55;
  margin-bottom: 1.8rem;
  max-width: 650px;
  margin-left: auto;
  margin-right: auto;
}

.cta-btn {
  display: inline-block;
  background: var(--gradient-cyber);
  color: #fff;
  border: none;
  padding: 0.8rem 1.8rem;
  border-radius: 12px;
  font-weight: 600;
  text-decoration: none;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
}

.cta-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
}

.not-found-state {
  text-align: center;
  padding: 5rem 0;
}

.not-found-state h2 {
  margin-bottom: 1rem;
}

.not-found-state p {
  color: var(--text-muted);
  margin-bottom: 2rem;
}

.back-btn-error {
  display: inline-block;
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border-glow);
  color: #fff;
  padding: 0.6rem 1.5rem;
  border-radius: 8px;
  text-decoration: none;
}

/* --- TABLE OF CONTENTS (TOC) --- */
.toc-box {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-left: 3px solid var(--accent-cyan);
  padding: 1.5rem;
  border-radius: 12px;
  margin: 2.2rem 0;
}

.toc-title {
  display: block;
  font-size: 1.05rem;
  font-weight: 600;
  color: #fff;
  margin-bottom: 0.8rem;
}

.toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.toc-link {
  font-size: 0.95rem;
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.2s ease, padding-left 0.2s ease;
  display: inline-block;
}

.toc-link:hover {
  color: var(--accent-cyan);
  padding-left: 6px;
}

/* --- RELATED ARTICLES --- */
.related-articles {
  margin-top: 5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 3.5rem;
}

.related-title {
  font-size: 1.4rem;
  color: #fff;
  margin-bottom: 1.8rem;
  font-weight: 600;
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
}

.related-card {
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 1.8rem;
  border-radius: 20px;
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
  backdrop-filter: blur(12px);
}

.related-card:hover {
  transform: translateY(-4px);
  background: rgba(255, 255, 255, 0.035);
  border-color: rgba(168, 85, 247, 0.35);
  box-shadow: 0 12px 30px -5px rgba(168, 85, 247, 0.2);
}

.related-category {
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 0.9rem;
  transition: all 0.25s ease;
  width: fit-content;
}

/* Category Badge Color Themes */
.cat-purple {
  background: rgba(168, 85, 247, 0.12) !important;
  color: #d8b4fe !important;
  border: 1px solid rgba(168, 85, 247, 0.3) !important;
  box-shadow: 0 0 12px rgba(168, 85, 247, 0.15) !important;
}

.cat-cyan {
  background: rgba(56, 189, 248, 0.12) !important;
  color: #7dd3fc !important;
  border: 1px solid rgba(56, 189, 248, 0.3) !important;
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.15) !important;
}

.cat-emerald {
  background: rgba(52, 211, 153, 0.12) !important;
  color: #6ee7b7 !important;
  border: 1px solid rgba(52, 211, 153, 0.3) !important;
  box-shadow: 0 0 12px rgba(52, 211, 153, 0.15) !important;
}

.cat-indigo {
  background: rgba(129, 140, 248, 0.12) !important;
  color: #a5b4fc !important;
  border: 1px solid rgba(129, 140, 248, 0.3) !important;
  box-shadow: 0 0 12px rgba(129, 140, 248, 0.15) !important;
}

.cat-pink {
  background: rgba(244, 114, 182, 0.12) !important;
  color: #f472b6 !important;
  border: 1px solid rgba(244, 114, 182, 0.3) !important;
  box-shadow: 0 0 12px rgba(244, 114, 182, 0.15) !important;
}

.related-card-title {
  font-size: 1.12rem;
  color: #fff;
  line-height: 1.4;
  margin-bottom: 1.5rem;
  font-weight: 500;
  flex-grow: 1;
}

.related-read-time {
  font-size: 0.85rem;
  color: var(--text-muted);
}

@media (max-width: 900px) {
  .article-layout {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
  .article-sidebar {
    position: static;
  }
  .article-title {
    font-size: 2rem;
  }
}

@media (max-width: 600px) {
  .article-container {
    padding: 1.5rem 1rem;
  }
  .article-title {
    font-size: 1.6rem;
  }
  .article-content img {
    max-width: 100%;
    height: auto;
  }
  .article-content pre {
    overflow-x: auto;
    max-width: 100%;
  }
}
</style>
