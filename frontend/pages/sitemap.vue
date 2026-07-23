<script setup lang="ts">
import { useAsyncData, useHead, useSeoMeta, useRuntimeConfig, useRequestURL } from '#imports';
import { CITIES_LIST } from '~/utils/cities';

const config = useRuntimeConfig();
const url = useRequestURL();

// Fetch blog posts and profiles for the HTML sitemap
const { data: sitemapData, pending, error } = await useAsyncData('html-sitemap', async () => {
  const [blogRes, profilesRes] = await Promise.all([
    $fetch<any[]>(`${config.public.apiUrl}/blog`).catch(() => []),
    $fetch<any[]>(`${config.public.apiUrl}/profiles`).catch(() => [])
  ]);
  
  return {
    articles: blogRes,
    profiles: profilesRes
  };
});

useSeoMeta({
  title: 'Карта сайта | fyxi',
  description: 'Карта сайта маркетплейса fyxi.ru. Навигация по основным разделам, статьям блога, городам и профилям веб-дизайнеров.',
  ogTitle: 'Карта сайта | fyxi',
  ogDescription: 'Карта сайта маркетплейса fyxi.ru. Навигация по основным разделам, статьям блога, городам и профилям веб-дизайнеров.',
  robots: 'index, follow'
});

useHead({
  link: [
    { rel: 'canonical', href: `${url.origin}/sitemap` }
  ]
});
</script>

<template>
  <main class="sitemap-page">
    <div class="sitemap-container">
      <h1 class="page-title">Карта сайта</h1>
      <p class="page-desc">Полная структура маркетплейса fyxi.ru для удобной навигации.</p>
      
      <div v-if="pending" class="loading-state">Загрузка структуры...</div>
      
      <div v-else class="sitemap-grid">
        
        <!-- Основные страницы -->
        <section class="sitemap-section">
          <h2>📌 Основные разделы</h2>
          <ul class="sitemap-list">
            <li><NuxtLink to="/">Главная</NuxtLink></li>
            <li><NuxtLink to="/blog">Блог и База знаний</NuxtLink></li>
            <li><NuxtLink to="/privacy">Политика конфиденциальности</NuxtLink></li>
            <li><NuxtLink to="/terms">Пользовательское соглашение</NuxtLink></li>
          </ul>
        </section>

        <!-- Статьи блога -->
        <section class="sitemap-section">
          <h2>📚 Статьи блога</h2>
          <ul class="sitemap-list">
            <li v-for="post in sitemapData?.articles" :key="post.slug">
              <NuxtLink :to="`/blog/${post.slug}`">{{ post.title }}</NuxtLink>
            </li>
          </ul>
        </section>

        <!-- Специалисты -->
        <section class="sitemap-section">
          <h2>🧑‍💻 Специалисты (Профили)</h2>
          <ul class="sitemap-list">
            <li v-for="profile in sitemapData?.profiles" :key="profile.id">
              <NuxtLink :to="`/profiles/${profile.slug || profile.id}`">
                {{ profile.firstName }} {{ profile.lastName }} — {{ profile.title }}
              </NuxtLink>
            </li>
          </ul>
        </section>

        <!-- Города -->
        <section class="sitemap-section full-width">
          <h2>🏙️ Специалисты по городам</h2>
          <ul class="sitemap-list cities-grid">
            <li v-for="city in CITIES_LIST" :key="city.slug">
              <NuxtLink :to="`/city/${city.slug}`">Веб-дизайнеры в {{ city.nameInCase }}</NuxtLink>
            </li>
          </ul>
        </section>

      </div>
    </div>
  </main>
</template>

<style scoped>
.sitemap-page {
  padding: 6rem 2rem;
  min-height: 100vh;
  background: var(--bg-main);
  color: var(--text-primary);
}

.sitemap-container {
  max-width: 1200px;
  margin: 0 auto;
}

.page-title {
  font-size: 3rem;
  margin-bottom: 1rem;
  background: var(--gradient-cyber);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.page-desc {
  font-size: 1.1rem;
  color: var(--text-secondary);
  margin-bottom: 3rem;
}

.sitemap-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 3rem;
}

.sitemap-section {
  background: var(--bg-card);
  border: 1px solid var(--border-glow);
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
}

.sitemap-section.full-width {
  grid-column: 1 / -1;
}

.sitemap-section h2 {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: var(--text-primary);
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 0.5rem;
}

.sitemap-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.cities-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
}

.sitemap-list li a {
  color: var(--text-secondary);
  text-decoration: none;
  transition: all 0.2s ease;
  position: relative;
  padding-left: 1rem;
}

.sitemap-list li a::before {
  content: "→";
  position: absolute;
  left: 0;
  color: var(--accent-cyan);
  opacity: 0;
  transform: translateX(-5px);
  transition: all 0.2s ease;
}

.sitemap-list li a:hover {
  color: var(--accent-cyan);
}

.sitemap-list li a:hover::before {
  opacity: 1;
  transform: translateX(0);
}

.loading-state {
  text-align: center;
  font-size: 1.2rem;
  color: var(--text-muted);
  padding: 4rem;
}

@media (max-width: 768px) {
  .sitemap-page {
    padding: 4rem 1rem;
  }
  .page-title {
    font-size: 2.2rem;
  }
  .sitemap-grid {
    grid-template-columns: 1fr;
  }
}
</style>
