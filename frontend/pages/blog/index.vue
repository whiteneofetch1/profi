<script setup lang="ts">
import { computed } from 'vue';

const url = useRequestURL();
const config = useRuntimeConfig();

// Fetch published articles dynamically from Fastify backend API
const { data: articles } = await useFetch<any[]>(`${config.public.apiUrl}/blog`);

useSeoMeta({
  title: 'Блог fyxi — Экспертные статьи по найму разработчиков и дизайнеров',
  ogTitle: 'Блог fyxi — Статьи по подбору IT-кадров и дизайну',
  description: 'Полезные материалы на fyxi.ru по IT-рекрутингу, аутстаффингу, выбору подрядчиков и оптимизации бюджетов на разработку и дизайн.',
  ogDescription: 'Советы по эффективному найму дизайнеров и программистов напрямую на fyxi.ru, разборы портфолио, аналитика бюджетов.',
  ogType: 'website',
  ogImage: '/og-image.jpg',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Блог fyxi — Статьи по подбору IT-кадров',
  twitterDescription: 'Полезные материалы по IT-рекрутингу, аутстаффингу, выбору подрядчиков и оптимизации бюджетов.',
  twitterImage: '/og-image.jpg',
  keywords: 'fyxi, IT рекрутинг, блог по дизайну, как нанять программиста, аутстаффинг, подбор дизайнеров, база знаний IT, статьи о фрилансе'
});

const blogSchema = computed(() => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    'name': 'Блог fyxi',
    'description': 'Полезные материалы по IT-рекрутингу, аутстаффингу, выбору подрядчиков и оптимизации бюджетов на разработку и дизайн.',
    'url': url.href,
    'blogPost': (Array.isArray(articles.value) ? articles.value : []).slice(0, 10).map(post => ({
      '@type': 'BlogPosting',
      'headline': post.title,
      'description': post.description,
      'url': `${url.origin}/blog/${post.slug}`,
      'datePublished': post.publishDate ? post.publishDate.split('T')[0] : ''
    }))
  };
});

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
      'item': url.href
    }
  ]
};

useHead(() => ({
  link: [
    { rel: 'canonical', href: `${url.origin}/blog` }
  ],
  script: [
    { type: 'application/ld+json', children: JSON.stringify(blogSchema.value) },
    { type: 'application/ld+json', children: JSON.stringify(breadcrumbsSchema) }
  ]
}));

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
</script>

<template>
  <div class="blog-page">
    
    <!-- Breadcrumbs -->
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <NuxtLink to="/">Главная</NuxtLink>
      <span class="separator">/</span>
      <span class="current">Блог</span>
    </nav>

    <!-- Hero / Title -->
    <section class="blog-hero">
      <div class="category-badge">Экспертные статьи</div>
      <h1>База знаний <span class="text-gradient">fyxi</span></h1>
      <p>Статьи, советы и исследования, помогающие нанимать разработчиков и дизайнеров напрямую без посредников и переплат.</p>
    </section>

    <!-- Articles Grid -->
    <section class="blog-grid-container">
      <div class="articles-grid">
        <article v-for="post in (Array.isArray(articles) ? articles : [])" :key="post.slug" class="blog-card">
          <div class="card-meta">
            <span :class="['card-category', getCategoryTheme(post.category)]">{{ post.category }}</span>
            <span class="card-date">{{ formatDate(post.publishDate) }}</span>
          </div>
          
          <h2 class="card-title">
            <NuxtLink :to="'/blog/' + post.slug" class="card-title-link">{{ post.title }}</NuxtLink>
          </h2>
          
          <p class="card-desc">{{ post.description }}</p>
          
          <div class="card-footer">
            <span class="read-time">⏱️ {{ post.readTime }} чтения</span>
            <NuxtLink :to="'/blog/' + post.slug" class="read-more-link">Читать статью →</NuxtLink>
          </div>
        </article>
      </div>
    </section>

  </div>
</template>

<style scoped>
.blog-page {
  padding-bottom: 5rem;
}

/* --- BREADCRUMBS --- */
.breadcrumbs {
  max-width: 1100px;
  margin: 0 auto;
  padding: 2rem 2rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
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
  color: rgba(255, 255, 255, 0.15);
}

.breadcrumbs .current {
  color: #fff;
  font-weight: 500;
}

.blog-hero {
  max-width: 800px;
  margin: 0 auto;
  padding: 3rem 2rem 3rem;
  text-align: center;
}

.category-badge {
  display: inline-block;
  background: rgba(6, 182, 212, 0.1);
  border: 1px solid rgba(6, 182, 212, 0.2);
  color: #22d3ee;
  padding: 0.4rem 0.8rem;
  border-radius: 99px;
  font-size: 0.8rem;
  font-weight: 500;
  margin-bottom: 1.5rem;
}

h1 {
  font-size: 3rem;
  line-height: 1.1;
  margin-bottom: 1rem;
}

.text-gradient {
  background: var(--gradient-cyber);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

p {
  color: var(--text-muted);
  font-size: 1.1rem;
  font-weight: 300;
}

.blog-grid-container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 0 2rem;
}

.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 2.5rem;
}

.blog-card {
  background: var(--bg-card);
  border: 1px solid var(--border-glow);
  border-radius: 20px;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  backdrop-filter: blur(12px);
  text-align: left;
}

.blog-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}

.card-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-bottom: 1rem;
}

.card-category {
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
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

.card-title {
  font-size: 1.35rem;
  line-height: 1.25;
  margin-bottom: 1rem;
}

.card-title-link {
  color: var(--text-primary);
  text-decoration: none;
  transition: color 0.2s ease;
}

.card-title-link:hover {
  color: var(--accent-cyan);
}

.card-desc {
  font-size: 0.92rem;
  color: var(--text-muted);
  margin-bottom: 1.5rem;
  line-height: 1.45;
  flex: 1;
}

.card-footer {
  border-top: 1px solid var(--border-glow);
  padding-top: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.read-more-link:hover {
  color: #fff;
  text-shadow: 0 0 8px var(--accent-cyan);
}

@media (max-width: 768px) {
  h1 {
    font-size: 2rem;
  }
  .blog-hero {
    padding: 2rem 1rem 1.5rem;
  }
  .blog-grid-container {
    padding: 0 1rem;
  }
  .articles-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  .blog-card {
    padding: 1.25rem;
  }
}
</style>
