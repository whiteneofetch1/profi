<script setup lang="ts">
import { useRoute, useHead, useSeoMeta, useRuntimeConfig, useRequestURL, createError } from '#imports';
import { SKILLS_LIST } from '~/utils/skills';
import { getCityBySlug } from '~/utils/cities';

const route = useRoute();
const config = useRuntimeConfig();
const url = useRequestURL();

const skillSlug = route.params.skill as string;
const citySlug = route.params.city as string;

const skillData = SKILLS_LIST.find(s => s.slug === skillSlug);
const cityData = getCityBySlug(citySlug);

if (!skillData || !cityData) {
  throw createError({ statusCode: 404, statusMessage: 'Page Not Found' });
}

// Fetch profiles matching this skill
const { data: profiles, pending } = await useAsyncData(`seo-skill-${skillSlug}`, async () => {
  return await $fetch<any[]>(`${config.public.apiUrl}/profiles`, {
    params: { skill: skillData.shortName }
  });
});

const title = `Заказать ${skillData.nameInCase} в ${cityData.nameInCase} — Рейтинг специалистов`;
const description = `Ищете специалиста? База проверенных исполнителей, чтобы заказать ${skillData.nameInCase} в ${cityData.nameInCase}. Прямые контакты без посредников и комиссий на fyxi.ru.`;

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  twitterCard: 'summary_large_image',
  robots: 'index, follow'
});

useHead({
  link: [
    { rel: 'canonical', href: url.origin + route.path }
  ]
});

function getProfileSlug(profile: any) {
  return profile.slug || profile.id;
}
</script>

<template>
  <main class="seo-landing-page">
    <div class="seo-container">
      
      <!-- HERO BREADCRUMBS -->
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <ol>
          <li><NuxtLink to="/">Главная</NuxtLink></li>
          <li><span class="separator">/</span></li>
          <li><NuxtLink to="/sitemap">Навыки</NuxtLink></li>
          <li><span class="separator">/</span></li>
          <li><NuxtLink :to="`/hire/${skillData.slug}`">{{ skillData.name }}</NuxtLink></li>
          <li><span class="separator">/</span></li>
          <li aria-current="page">в {{ cityData.nameInCase }}</li>
        </ol>
      </nav>

      <!-- HERO SECTION -->
      <header class="seo-hero">
        <div class="hero-content">
          <div class="badge-promo">
            <span class="logo-dot"></span>
            Проверенные исполнители
          </div>
          <h1 class="page-title">Заказать <span class="gradient-text">{{ skillData.nameInCase }}</span><br>в {{ cityData.nameInCase }}</h1>
          <p class="page-desc">{{ skillData.description }} Мы собрали лучших фрилансеров и студии (удаленно и локально), готовых взяться за ваш проект без комиссий посредников.</p>
        </div>
      </header>

      <!-- EXPERTS GRID -->
      <section class="experts-section">
        <div class="section-header">
          <h2>Рейтинг специалистов ({{ profiles?.length || 0 }})</h2>
        </div>

        <div v-if="pending" class="loading-state">
          Загрузка профилей...
        </div>
        
        <div v-else-if="!profiles || profiles.length === 0" class="empty-state">
          <p>К сожалению, сейчас в каталоге нет свободных специалистов по этому навыку.</p>
          <NuxtLink to="/" class="back-home-btn">Смотреть всех специалистов</NuxtLink>
        </div>

        <div v-else class="simple-cards-grid">
          <NuxtLink 
            v-for="profile in profiles" 
            :key="profile.id" 
            :to="`/profiles/${getProfileSlug(profile)}`" 
            class="simple-profile-card"
          >
            <div class="card-top">
              <div class="card-avatar">
                <img v-if="profile.avatarUrl" :src="profile.avatarUrl" :alt="profile.firstName" loading="lazy" />
                <span v-else class="emoji-avatar">💻</span>
              </div>
              <div class="card-info">
                <h3>{{ profile.firstName }} {{ profile.lastName }}</h3>
                <p class="profile-title">{{ profile.title }}</p>
              </div>
            </div>
            
            <div class="card-skills">
              <span v-for="skill in profile.skills.slice(0, 4)" :key="skill" class="mini-skill">
                {{ skill }}
              </span>
              <span v-if="profile.skills.length > 4" class="mini-skill">+{{ profile.skills.length - 4 }}</span>
            </div>
            
            <div class="card-footer">
              <div class="rate-info">
                <span v-if="profile.hourlyRate" class="rate-val">{{ profile.hourlyRate }} ₽/ч</span>
                <span v-else class="rate-val">Договорная</span>
              </div>
              <span class="view-btn">Смотреть профиль →</span>
            </div>
          </NuxtLink>
        </div>
      </section>

      <!-- SEO TEXT BLOCK -->
      <section class="seo-text-block">
        <h2>Почему стоит искать исполнителя на fyxi.ru?</h2>
        <div class="seo-content-grid">
          <div class="seo-card">
            <h3>Прямые контакты</h3>
            <p>В отличие от классических бирж, мы не берем комиссию со сделок. Вы платите фиксированную сумму за доступ к Telegram/Email исполнителя и работаете с ним напрямую на своих условиях.</p>
          </div>
          <div class="seo-card">
            <h3>Ручная модерация</h3>
            <p>Каждая анкета и портфолио проверяются нашими арт-директорами. Мы не допускаем в каталог новичков без реального коммерческого опыта и сильных кейсов.</p>
          </div>
          <div class="seo-card">
            <h3>Удаленка стирает границы</h3>
            <p>Ищете специалиста в {{ cityData.nameInCase }}? Наша база включает профессионалов со всего СНГ, готовых работать удаленно. Это позволяет найти лучшее соотношение цены и качества.</p>
          </div>
        </div>
      </section>

    </div>
  </main>
</template>

<style scoped>
.seo-landing-page {
  padding: 4rem 2rem 8rem;
  min-height: 100vh;
  background: var(--bg-main);
  color: var(--text-primary);
}

.seo-container {
  max-width: 1200px;
  margin: 0 auto;
}

/* Breadcrumbs */
.breadcrumbs ol {
  list-style: none;
  padding: 0;
  margin: 0 0 3rem 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-muted);
}

.breadcrumbs a {
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.2s ease;
}

.breadcrumbs a:hover {
  color: var(--accent-cyan);
}

.separator {
  color: rgba(255,255,255,0.2);
}

/* Hero */
.seo-hero {
  text-align: center;
  margin-bottom: 5rem;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.badge-promo {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.85rem;
  color: #c4b5fd;
  margin-bottom: 1.5rem;
}

.logo-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent-cyan);
  box-shadow: 0 0 10px var(--accent-cyan);
}

.page-title {
  font-size: 3.5rem;
  line-height: 1.1;
  margin-bottom: 1.5rem;
  font-weight: 800;
}

.gradient-text {
  background: var(--gradient-cyber);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.page-desc {
  font-size: 1.15rem;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* Grid */
.section-header {
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--border-glow);
  padding-bottom: 1rem;
}

.section-header h2 {
  font-size: 1.8rem;
}

.simple-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  margin-bottom: 5rem;
}

.simple-profile-card {
  background: var(--bg-card);
  border: 1px solid var(--border-glow);
  border-radius: 20px;
  padding: 1.5rem;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.simple-profile-card:hover {
  transform: translateY(-5px);
  border-color: var(--accent-cyan);
  box-shadow: 0 10px 30px rgba(6, 182, 212, 0.15);
}

.card-top {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.card-avatar {
  width: 60px;
  height: 60px;
  border-radius: 14px;
  background: rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-size: 1.8rem;
}

.card-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-info h3 {
  font-size: 1.1rem;
  margin-bottom: 0.2rem;
}

.profile-title {
  font-size: 0.9rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.card-skills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.mini-skill {
  background: rgba(255,255,255,0.05);
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.card-footer {
  margin-top: auto;
  border-top: 1px dashed rgba(255,255,255,0.1);
  padding-top: 1.2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.rate-val {
  font-weight: 600;
  color: var(--accent-cyan);
}

.view-btn {
  font-size: 0.9rem;
  color: var(--text-secondary);
  transition: color 0.2s;
}

.simple-profile-card:hover .view-btn {
  color: #fff;
}

/* SEO Blocks */
.seo-text-block {
  margin-top: 6rem;
  padding-top: 4rem;
  border-top: 1px solid var(--border-glow);
}

.seo-text-block h2 {
  text-align: center;
  font-size: 2.2rem;
  margin-bottom: 3rem;
}

.seo-content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.seo-card {
  background: rgba(255,255,255,0.02);
  padding: 2rem;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.05);
}

.seo-card h3 {
  font-size: 1.3rem;
  margin-bottom: 1rem;
  color: var(--accent-cyan);
}

.seo-card p {
  color: var(--text-secondary);
  line-height: 1.6;
}

/* Empty States */
.empty-state {
  text-align: center;
  padding: 4rem 1rem;
  background: rgba(255,255,255,0.02);
  border-radius: 16px;
  color: var(--text-secondary);
}

.back-home-btn {
  display: inline-block;
  margin-top: 1.5rem;
  background: var(--gradient-cyber);
  color: #fff;
  text-decoration: none;
  padding: 0.8rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
}

@media (max-width: 768px) {
  .seo-landing-page {
    padding: 2rem 1rem 4rem;
  }
  .page-title {
    font-size: 2.2rem;
  }
}
</style>
