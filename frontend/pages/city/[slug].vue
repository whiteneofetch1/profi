<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { CITIES_LIST, getCityBySlug } from '~/utils/cities';
import { useCartStore } from '~/stores/cart';

const route = useRoute();
const slug = route.params.slug as string;
const city = getCityBySlug(slug);

if (!city) {
  throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Город не найден в базе Geo-SEO', fatal: true });
}

const cart = useCartStore();
const searchQuery = ref('');
const filterVerifiedOnly = ref(false);
const filterAvailability = ref('all');
const filterPriceRange = ref('all');
const selectedSpecialization = ref('all');
const sortBy = ref('verified');

const profiles = ref<any[]>([]);
const loading = ref(true);

const config = useRuntimeConfig();

// SSR Async Data Fetching
const { data: initialProfiles } = await useAsyncData(`city-profiles-${city.slug}`, () => {
  return $fetch<any[]>(`${config.public.apiUrl}/profiles`);
}, { default: () => [] });

if (initialProfiles.value && initialProfiles.value.length > 0) {
  profiles.value = initialProfiles.value;
  loading.value = false;
}

const url = useRequestURL();

// Hyper-Targeted Geo SEO Meta Tags for Yandex & Google #1 Positions
useSeoMeta({
  title: `Заказать сайт на Tilda в ${city.nameInCase} — Веб-дизайнеры и разработчики в ${city.nameInCase} | fyxi`,
  ogTitle: `Веб-дизайнеры и разработчики Tilda в ${city.nameInCase} | fyxi`,
  description: `Ищете проверенного разработчика Zero Block или UX/UI веб-дизайнера в ${city.nameInCase}? База специалистов fyxi.ru: открытые портфолио, отзывы, выкуп прямых контактов от 500 ₽ без комиссии.`,
  ogDescription: `Каталог топовых фрилансеров и IT-специалистов Tilda для заказов в ${city.nameInCase}. Прямые контакты без посредников и переплат.`,
  ogType: 'website',
  ogImage: '/og-image.jpg',
  twitterCard: 'summary_large_image',
  twitterTitle: `Специалисты Tilda в ${city.nameInCase} | fyxi.ru`,
  twitterDescription: `Закажите разработку сайта на Tilda в ${city.nameInCase}. Прямые контакты топовых дизайнеров.`,
  keywords: `заказать сайт на тильде ${city.name.toLowerCase()}, веб дизайнер тильда ${city.name.toLowerCase()}, разработка zero block ${city.name.toLowerCase()}, фрилансеры ${city.name.toLowerCase()}, контакты разработчиков tilda`
});

useHead({
  link: [
    { rel: 'canonical', href: computed(() => `${url.origin}/city/${city.slug}`) }
  ],
  script: computed(() => [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Service',
        'name': `Разработка и дизайн сайтов на Tilda в ${city.nameInCase}`,
        'provider': {
          '@type': 'Organization',
          'name': 'fyxi',
          'url': 'https://fyxi.ru'
        },
        'areaServed': {
          '@type': 'AdministrativeArea',
          'name': city.name,
          'containedInPlace': {
            '@type': 'Country',
            'name': city.country
          }
        },
        'description': `Услуги профессиональной разработки и дизайна сайтов на платформе Tilda Zero Block в ${city.nameInCase}.`
      })
    },
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': [
          {
            '@type': 'ListItem',
            'position': 1,
            'name': 'Главная',
            'item': 'https://fyxi.ru'
          },
          {
            '@type': 'ListItem',
            'position': 2,
            'name': `Специалисты в ${city.nameInCase}`,
            'item': `https://fyxi.ru/city/${city.slug}`
          }
        ]
      })
    }
  ])
});

// Client-side text, skill & price range filtering + sorting
const filteredProfiles = computed(() => {
  let result = [...profiles.value];

  if (selectedSpecialization.value !== 'all') {
    result = result.filter(p => p.specialization === selectedSpecialization.value);
  }

  if (filterVerifiedOnly.value) {
    result = result.filter(p => p.isVerified);
  }

  if (filterAvailability.value !== 'all') {
    result = result.filter(p => p.availability === filterAvailability.value);
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(p => 
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q) ||
      p.skills.some((s: string) => s.toLowerCase().includes(q))
    );
  }

  // Price Range Filter
  if (filterPriceRange.value !== 'all') {
    result = result.filter(p => {
      const rate = p.hourlyRate || 0;
      if (filterPriceRange.value === 'under_1500') return rate > 0 && rate <= 1500;
      if (filterPriceRange.value === '1500_3000') return rate > 1500 && rate <= 3000;
      if (filterPriceRange.value === 'over_3000') return rate > 3000;
      return true;
    });
  }

  // Apply dynamic sorting
  result.sort((a, b) => {
    if (sortBy.value === 'verified') return (b.isVerified ? 1 : 0) - (a.isVerified ? 1 : 0);
    if (sortBy.value === 'price_asc') return (a.hourlyRate || 0) - (b.hourlyRate || 0);
    if (sortBy.value === 'price_desc') return (b.hourlyRate || 0) - (a.hourlyRate || 0);
    if (sortBy.value === 'experience_desc') return (b.experienceYears || 0) - (a.experienceYears || 0);
    return 0;
  });

  return result;
});

function cleanName(name: string) {
  return (name || '').replace(/\s*\d+/g, '').trim();
}

function cleanTitle(title: string) {
  return (title || '').replace(/\s*\(v\d+\)/gi, '').trim();
}

function getAvatarSymbol(specialization: string) {
  switch (specialization) {
    case 'DESIGNER': return '🎨';
    case 'DEVELOPER': return '⚡️';
    case 'FULLSTACK': return '🛸';
    default: return '💻';
  }
}

function getAvailabilityLabel(status: string) {
  switch (status) {
    case 'FREE': return 'Свободен';
    case 'OPEN_FOR_OFFERS': return 'Ищет предложения';
    case 'BUSY': return 'Занят';
    default: return status;
  }
}
</script>

<template>
  <div class="city-seo-page">
    
    <!-- BREADCRUMBS -->
    <nav class="city-breadcrumbs" aria-label="Хлебные крошки">
      <NuxtLink to="/">Главная</NuxtLink>
      <span class="sep">/</span>
      <span class="curr">Специалисты Tilda в {{ city.nameInCase }}</span>
    </nav>

    <!-- HERO SECTION -->
    <section class="city-hero">
      <div class="city-badge">
        📍 Регион: <strong>{{ city.name }} ({{ city.country }})</strong>
      </div>
      <h1>Веб-дизайнеры и разработчики Tilda в <span class="hero-gradient-text">{{ city.nameInCase }}</span></h1>
      <p>Каталог проверенных фрилансеров для выполнения проектов любой сложности в {{ city.nameInCase }}. Изучайте реальный опыт, Zero Block портфолио и выкупайте прямые контакты без посредников.</p>
    </section>

    <!-- SEARCH & FILTERS TOOLBAR -->
    <section class="filter-toolbar">
      <h2 class="sr-only">Фильтрация специалистов в {{ city.nameInCase }}</h2>
      <div class="toolbar-search-box">
        <input 
          v-model="searchQuery" 
          type="text" 
          class="search-input" 
          aria-label="Поиск специалистов в городе"
          :placeholder="`Поиск специалистов в городе ${city.name} (Tilda, Figma, Zero Block)...`"
        />
      </div>

      <div class="toolbar-filters">
        <div class="filter-tabs">
          <button :class="['filter-tab', { active: selectedSpecialization === 'all' }]" @click="selectedSpecialization = 'all'">Все</button>
          <button :class="['filter-tab', { active: selectedSpecialization === 'DEVELOPER' }]" @click="selectedSpecialization = 'DEVELOPER'">Разработчики</button>
          <button :class="['filter-tab', { active: selectedSpecialization === 'DESIGNER' }]" @click="selectedSpecialization = 'DESIGNER'">Дизайнеры</button>
        </div>

        <div class="filter-selects">
          <select v-model="sortBy" class="filter-select" aria-label="Сортировка">
            <option value="verified">По рейтингу (Проверенные)</option>
            <option value="price_asc">Сначала недорогие</option>
            <option value="price_desc">Сначала дорогие</option>
            <option value="experience_desc">По опыту (лет)</option>
          </select>

          <select v-model="filterPriceRange" class="filter-select" aria-label="Фильтр по часовой ставке">
            <option value="all">Любой бюджет</option>
            <option value="under_1500">До 1 500 ₽ / час</option>
            <option value="1500_3000">1 500 — 3 000 ₽ / час</option>
            <option value="over_3000">От 3 000 ₽ / час (Премиум)</option>
          </select>

          <select v-model="filterAvailability" class="filter-select" aria-label="Статус занятости">
            <option value="all">Статус занятости</option>
            <option value="FREE">Свободен</option>
            <option value="OPEN_FOR_OFFERS">Рассматривает предложения</option>
            <option value="BUSY">Занят</option>
          </select>

          <label class="verified-checkbox-label">
            <input v-model="filterVerifiedOnly" type="checkbox" />
            <span>Только проверенные</span>
          </label>
        </div>
      </div>
    </section>

    <!-- CARDS GRID -->
    <section class="catalog-container">
      <h2 class="sr-only">Каталог проверенных специалистов в {{ city.nameInCase }}</h2>

      <div v-if="filteredProfiles.length === 0" class="empty-state">
        <p>🔍 Специалисты в {{ city.nameInCase }} по вашему фильтру не найдены.</p>
      </div>

      <div v-else class="cards-grid">
        <article v-for="profile in filteredProfiles" :key="profile.id" class="card-wrapper">
          <div :class="['talent-card', profile.specialization.toLowerCase(), { unlocked: profile.isUnlocked }]">
            
            <div class="talent-card-header">
              <div class="avatar-frame">
                {{ getAvatarSymbol(profile.specialization) }}
              </div>
              <div class="talent-meta">
                <div class="name-badge-row">
                  <NuxtLink :to="'/profiles/' + getProfileSlug(profile)" class="talent-name-link">
                    <h2>{{ cleanName(profile.firstName) }} {{ cleanName(profile.lastName) }}</h2>
                  </NuxtLink>
                  <span v-if="profile.isVerified" class="verified-check-badge">✓ Проверен</span>
                </div>
                <span class="spec-badge">{{ cleanTitle(profile.title) }}</span>
              </div>
            </div>

            <div class="talent-experience">
              <span>💼 Опыт: {{ profile.experienceYears }} лет</span>
              <span class="divider">•</span>
              <span>📍 Готов к заказам в {{ city.nameInCase }}</span>
            </div>

            <div v-if="profile.hourlyRate || profile.monthlySalary" class="talent-pricing-row">
              <span v-if="profile.hourlyRate">⏱️ {{ profile.hourlyRate }} ₽ / час</span>
              <span v-if="profile.monthlySalary">💰 от {{ profile.monthlySalary.toLocaleString() }} ₽/мес</span>
            </div>

            <div class="talent-bio">
              <p class="bio-text">{{ profile.bio }}</p>
              <NuxtLink :to="'/profiles/' + getProfileSlug(profile)" class="read-more-link">Подробнее об исполнителе →</NuxtLink>
            </div>

            <div class="skills-container">
              <span v-for="skill in profile.skills" :key="skill" class="skill-chip">
                {{ skill }}
              </span>
            </div>

            <div class="gated-contact-section">
              <div class="blur-overlay">
                <button 
                  class="unlock-btn" 
                  @click="cart.addItem({
                    id: profile.id,
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    title: profile.title,
                    avatarSymbol: getAvatarSymbol(profile.specialization)
                  })"
                >
                  Открыть контакты • 500 ₽
                </button>
              </div>
            </div>

          </div>
        </article>
      </div>
    </section>

    <!-- OTHER CITIES GEO LINKS -->
    <section class="other-cities-section">
      <div class="other-cities-container">
        <h3>📍 Другие крупные города СНГ для подбора специалистов:</h3>
        <div class="cities-grid">
          <NuxtLink 
            v-for="c in CITIES_LIST.slice(0, 36)" 
            :key="c.slug" 
            :to="`/city/${c.slug}`"
            :class="['city-link', { current: c.slug === city.slug }]"
          >
            {{ c.name }}
          </NuxtLink>
        </div>
      </div>
    </section>

  </div>
</template>

<style scoped>
.city-seo-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem 5rem;
}

.city-breadcrumbs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 2rem;
}

.city-breadcrumbs a {
  color: var(--text-muted);
  text-decoration: none;
}

.city-breadcrumbs a:hover {
  color: var(--accent-cyan);
}

.city-hero {
  text-align: center;
  margin-bottom: 3rem;
}

.city-badge {
  display: inline-block;
  background: rgba(6, 182, 212, 0.1);
  border: 1px solid rgba(6, 182, 212, 0.3);
  color: var(--accent-cyan);
  padding: 0.4rem 1rem;
  border-radius: 99px;
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.city-hero h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.city-hero p {
  color: var(--text-muted);
  max-width: 750px;
  margin: 0 auto;
  font-size: 1.05rem;
  line-height: 1.6;
}

.other-cities-section {
  margin-top: 5rem;
  background: rgba(18, 18, 26, 0.5);
  border: 1px solid var(--border-glow);
  border-radius: 20px;
  padding: 2rem;
}

.other-cities-section h3 {
  font-size: 1.1rem;
  margin-bottom: 1.2rem;
  color: var(--text-primary);
}

.cities-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.city-link {
  display: inline-block;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-glow);
  color: var(--text-muted);
  padding: 0.35rem 0.85rem;
  border-radius: 8px;
  font-size: 0.82rem;
  text-decoration: none;
  transition: all 0.2s ease;
}

.city-link:hover, .city-link.current {
  border-color: var(--accent-cyan);
  color: var(--accent-cyan);
  background: rgba(6, 182, 212, 0.1);
}

@media (max-width: 768px) {
  .city-page {
    padding: 2rem 1.25rem 4rem;
  }
  .city-hero h1 {
    font-size: 1.8rem;
  }
  .other-cities-section {
    padding: 1.25rem;
    margin-top: 3rem;
  }
  .talent-card {
    padding: 1.25rem 1rem !important;
    border-radius: 18px !important;
  }
  .talent-card-header {
    gap: 0.8rem;
  }
  .avatar-frame {
    width: 52px;
    height: 52px;
  }
  .talent-name-link h2 {
    font-size: 1.15rem;
  }
}
</style>
