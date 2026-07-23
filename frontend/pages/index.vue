<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useCartStore } from '~/stores/cart';

const auth = useAuthStore();
const cart = useCartStore();

// Inject Toast Trigger
const showToast = inject('showToast') as (msg: string, type?: 'success' | 'info') => void;

// Specialist profiles state
const profiles = ref<any[]>([]);
const loading = ref(true);
const errorMsg = ref('');

// Dynamic Filters state
const selectedSpecialization = ref('all');
const searchQuery = ref('');
const filterVerifiedOnly = ref(false);
const filterAvailability = ref('all');
const filterPriceRange = ref('all');
const selectedSkill = ref('');
const sortBy = ref('verified');

const popularSkills = [
  { name: 'Zero Block', emoji: '📐' },
  { name: 'Step-by-Step Animation', emoji: '✨' },
  { name: 'E-commerce', emoji: '🛒' },
  { name: 'Custom JS/CSS', emoji: '💻' },
  { name: 'Figma', emoji: '🎨' },
  { name: 'SEO', emoji: '📈' },
  { name: 'CRM Integration', emoji: '🔗' },
  { name: 'Mobile Adaptation', emoji: '📱' }
];

function toggleSkillFilter(skillName: string) {
  if (selectedSkill.value === skillName) {
    selectedSkill.value = '';
  } else {
    selectedSkill.value = skillName;
  }
}

// SSR Pre-fetch profiles with SWR caching
const { data: initialProfiles } = await useAsyncData('catalog-profiles', () => {
  const config = useRuntimeConfig();
  return $fetch<any[]>(`${config.public.apiUrl}/profiles`);
}, { default: () => [] });

if (initialProfiles.value && initialProfiles.value.length > 0) {
  profiles.value = initialProfiles.value;
  loading.value = false;
}

// Fetch profiles on mount and filter changes
const loadProfiles = async () => {
  loading.value = true;
  errorMsg.value = '';
  try {
    const config = useRuntimeConfig();
    const queryParams: any = {};
    if (selectedSpecialization.value !== 'all') queryParams.specialization = selectedSpecialization.value;
    if (filterVerifiedOnly.value) queryParams.verified = true;
    if (filterAvailability.value !== 'all') queryParams.availability = filterAvailability.value;

    const data = await $fetch<any[]>(`${config.public.apiUrl}/profiles`, {
      params: queryParams,
    });
    profiles.value = data || [];
  } catch (err: any) {
    errorMsg.value = err.data?.error || 'Не удалось загрузить каталог специалистов';
  } finally {
    loading.value = false;
  }
};

watch([selectedSpecialization, filterVerifiedOnly, filterAvailability], () => {
  loadProfiles();
});

onMounted(() => {
  if (profiles.value.length === 0) {
    loadProfiles();
  }
});

// Client-side text, skill & price range filtering + sorting
const filteredProfiles = computed(() => {
  let result = [...profiles.value];

  if (selectedSkill.value) {
    const skillLower = selectedSkill.value.toLowerCase();
    result = result.filter(p => 
      Array.isArray(p?.skills) && 
      p.skills.some((s: string) => typeof s === 'string' && s.toLowerCase() === skillLower)
    );
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase();
    result = result.filter(p => {
      const fn = (p?.firstName || '').toLowerCase();
      const ln = (p?.lastName || '').toLowerCase();
      const t = (p?.title || '').toLowerCase();
      const hasSkill = Array.isArray(p?.skills) && p.skills.some((s: string) => typeof s === 'string' && s.toLowerCase().includes(q));
      return fn.includes(q) || ln.includes(q) || t.includes(q) || hasSkill;
    });
  }

  // Price Range Filter
  if (filterPriceRange.value !== 'all') {
    result = result.filter(p => {
      const rate = p?.hourlyRate || 0;
      if (filterPriceRange.value === 'under_1500') return rate > 0 && rate <= 1500;
      if (filterPriceRange.value === '1500_3000') return rate > 1500 && rate <= 3000;
      if (filterPriceRange.value === 'over_3000') return rate > 3000;
      return true;
    });
  }

  // Apply dynamic sorting
  const currentSort = sortBy.value || 'verified';
  result.sort((a, b) => {
    if (currentSort === 'verified') {
      return (b?.isVerified ? 1 : 0) - (a?.isVerified ? 1 : 0);
    }
    if (currentSort === 'price_asc') {
      return (a?.hourlyRate || 0) - (b?.hourlyRate || 0);
    }
    if (currentSort === 'price_desc') {
      return (b?.hourlyRate || 0) - (a?.hourlyRate || 0);
    }
    if (currentSort === 'experience_desc') {
      return (b?.experienceYears || 0) - (a?.experienceYears || 0);
    }
    return 0;
  });

  return result;
});

// Card 3D tilt calculations
const tiltStyle = ref<{ [key: string]: string }>({});

function handleTilt(e: MouseEvent, profileId: string) {
  const card = e.currentTarget as HTMLElement;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const width = rect.width;
  const height = rect.height;
  
  const rotateX = ((y / height) - 0.5) * -10;
  const rotateY = ((x / width) - 0.5) * 10;
  
  tiltStyle.value[profileId] = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
}

function handleResetTilt(profileId: string) {
  tiltStyle.value[profileId] = 'rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
}

// Format availability status
function getAvailabilityLabel(status: string) {
  switch (status) {
    case 'FREE': return 'Свободен';
    case 'OPEN_FOR_OFFERS': return 'Ищет предложения';
    case 'BUSY': return 'Занят';
    default: return status;
  }
}

function getAvatarSymbol(spec: string) {
  switch (spec) {
    case 'DESIGNER': return '🎨';
    case 'DEVELOPER': return '⚡️';
    case 'FULLSTACK': return '🛸';
    default: return '💻';
  }
}

// SEO Optimizations
const url = useRequestURL();

useSeoMeta({
  title: 'Каталог разработчиков и дизайнеров Tilda | fyxi',
  ogTitle: 'Каталог проверенных IT-специалистов Tilda | fyxi',
  description: 'База проверенных IT-специалистов fyxi.ru с открытыми портфолио. Покупайте прямые контакты программистов и UX/UI дизайнеров без комиссий.',
  ogDescription: 'Каталог топовых дизайнеров и разработчиков на fyxi.ru. Изучайте портфолио и опыт, открывайте контакты без переплат посредникам.',
  ogType: 'website',
  ogImage: '/og-image.jpg',
  twitterCard: 'summary_large_image',
  twitterTitle: 'Каталог разработчиков и дизайнеров Tilda | fyxi',
  twitterDescription: 'Изучайте портфолио и опыт, покупайте прямые контакты специалистов напрямую на fyxi.ru.',
  twitterImage: '/og-image.jpg',
  keywords: 'fyxi, IT подбор, фриланс, веб-дизайнеры Tilda, разработчики Zero Block, база специалистов, контакты фрилансеров, заказать сайт на тильде, zero block'
});

const websiteSchema = computed(() => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  'name': 'fyxi',
  'url': url.origin,
  'potentialAction': {
    '@type': 'SearchAction',
    'target': `${url.origin}/?search={search_term_string}`,
    'query-input': 'required name=search_term_string'
  }
}));

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  'name': 'fyxi',
  'url': 'https://fyxi.ru',
  'logo': 'https://fyxi.ru/favicon.svg',
  'description': 'Каталог проверенных IT-специалистов. Покупайте контакты разработчиков и дизайнеров напрямую на fyxi.ru.'
};

const collectionSchema = computed(() => {
  if (!profiles.value || profiles.value.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    'name': 'Каталог специалистов | fyxi',
    'description': 'Список лучших дизайнеров и разработчиков.',
    'mainEntity': {
      '@type': 'ItemList',
      'numberOfItems': filteredProfiles.value.length,
      'itemListElement': filteredProfiles.value.slice(0, 12).map((p, index) => ({
        '@type': 'ListItem',
        'position': index + 1,
        'url': `${url.origin}/profiles/${getProfileSlug(p)}`,
        'name': `${p.firstName} ${p.lastName} — ${p.title}`
      }))
    }
  };
});

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  'mainEntity': [
    {
      '@type': 'Question',
      'name': 'Как выкупить контакты веб-дизайнера или разработчика на fyxi?',
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': 'Выберите подходящего специалиста в каталоге fyxi.ru, добавьте его карточку в корзину и оплатите мгновенно. Контакты (Telegram, Email, телефон) станут полностью открыты.'
      }
    },
    {
      '@type': 'Question',
      'name': 'Берет ли маркетплейс fyxi комиссию за сделки?',
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': 'Нет! Платформа fyxi функционирует по модели Pay-Per-Contact: вы платите фиксированные 500 ₽ за прямой контакт исполнителя и работаете с ним напрямую без посредников.'
      }
    },
    {
      '@type': 'Question',
      'name': 'Как специалисты проходят модерацию на fyxi?',
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': 'Каждая анкета и портфолио работы в Zero Block проверяются арт-директорами платформы fyxi перед публикацией в общем каталоге.'
      }
    }
  ]
};

const canonicalUrl = computed(() => 'https://fyxi.ru/');

useHead({
  link: [
    { rel: 'canonical', href: canonicalUrl }
  ],
  script: computed(() => {
    const scripts = [
      { type: 'application/ld+json', children: JSON.stringify(organizationSchema) },
      { type: 'application/ld+json', children: JSON.stringify(websiteSchema.value) },
      { type: 'application/ld+json', children: JSON.stringify(faqSchema) }
    ];
    if (collectionSchema.value) {
      scripts.push({ type: 'application/ld+json', children: JSON.stringify(collectionSchema.value) });
    }
    return scripts;
  })
});

function navigateToProfile(event: MouseEvent, profile: any) {
  const target = event.target as HTMLElement;
  if (
    target.tagName === 'A' || 
    target.tagName === 'BUTTON' || 
    target.closest('.gated-contact-section') ||
    target.closest('.read-more-link') ||
    target.closest('.skill-chip')
  ) {
    return;
  }
  navigateTo('/profiles/' + getProfileSlug(profile));
}
</script>

<template>
  <div class="catalog-page">
    
    <!-- HERO SECTION -->
    <section class="hero-section">
      <div class="badge-promo">
        <span class="logo-dot"></span>
        Эксклюзивный подбор специалистов
      </div>
      <h1>Покупайте контакты лучших специалистов<br>как <span class="hero-gradient-text">готовые IT-продукты</span></h1>
      <p>Каталог топовых дизайнеров и разработчиков. Изучайте их открытые портфолио, опыт и стек. Разблокируйте прямые контакты в один клик.</p>
    </section>

    <!-- SEARCH & FILTER TOOLBAR -->
    <section class="filter-toolbar">
      <h2 class="sr-only">Фильтрация и подбор специалистов</h2>
      <div class="toolbar-search-box">
        <input 
          v-model="searchQuery" 
          type="text" 
          class="search-input" 
          aria-label="Поиск по имени, стеку или навыкам"
          placeholder="Поиск по имени, стеку или навыкам (например: Zero Block, Figma, Tilda CC)..."
        />
      </div>

      <!-- QUICK SKILLS PILLS -->
      <div class="skills-pills-container">
        <span class="pills-title">Популярные навыки на Tilda:</span>
        <div class="skills-pills">
          <button 
            v-for="skill in popularSkills" 
            :key="skill.name"
            :class="['skill-pill', { active: selectedSkill === skill.name }]"
            @click="toggleSkillFilter(skill.name)"
          >
            <span class="pill-emoji">{{ skill.emoji }}</span>
            <span class="pill-name">{{ skill.name }}</span>
          </button>
        </div>
      </div>

      <div class="toolbar-filters">
        <!-- Specialization Tabs -->
        <div class="filter-tabs">
          <button :class="['filter-tab', { active: selectedSpecialization === 'all' }]" @click="selectedSpecialization = 'all'">Все специалисты</button>
          <button :class="['filter-tab', { active: selectedSpecialization === 'DEVELOPER' }]" @click="selectedSpecialization = 'DEVELOPER'">Разработчики</button>
          <button :class="['filter-tab', { active: selectedSpecialization === 'DESIGNER' }]" @click="selectedSpecialization = 'DESIGNER'">Дизайнеры</button>
        </div>

        <!-- Extra Filter Selects -->
        <div class="filter-selects">
          <select v-model="sortBy" class="filter-select" aria-label="Сортировка специалистов">
            <option value="verified">По рейтингу (Verified)</option>
            <option value="price_asc">По цене: сначала недорогие</option>
            <option value="price_desc">По цене: сначала дорогие</option>
            <option value="experience_desc">По опыту работы (лет)</option>
          </select>

          <select v-model="filterPriceRange" class="filter-select" aria-label="Фильтр по часовой ставке и стоимости">
            <option value="all">Любой бюджет</option>
            <option value="under_1500">До 1 500 ₽ / час</option>
            <option value="1500_3000">1 500 — 3 000 ₽ / час</option>
            <option value="over_3000">От 3 000 ₽ / час (Премиум)</option>
          </select>

          <select v-model="filterAvailability" class="filter-select" aria-label="Фильтр по статусу занятости специалистов">
            <option value="all">Статус занятости</option>
            <option value="FREE">Свободен для проектов</option>
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

    <!-- CARDS DIRECTORY GRID -->
    <section class="catalog-container">
      <h2 class="sr-only">Каталог проверенных специалистов</h2>
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Синхронизация профилей специалистов...</p>
      </div>

      <div v-else-if="errorMsg" class="error-state">
        <p>⚠️ {{ errorMsg }}</p>
        <button class="retry-btn" @click="loadProfiles">Повторить попытку</button>
      </div>

      <div v-else-if="filteredProfiles.length === 0" class="empty-state">
        <p>🔍 По вашему запросу специалисты не найдены.</p>
      </div>

      <div v-else class="cards-grid">
        <article v-for="profile in filteredProfiles" :key="profile.id" class="card-wrapper">
          <div 
            :class="['talent-card', profile.specialization.toLowerCase(), { unlocked: profile.isUnlocked }]"
            :style="{ transform: tiltStyle[profile.id] }"
            @mousemove="handleTilt($event, profile.id)"
            @mouseleave="handleResetTilt(profile.id)"
            @click="navigateToProfile($event, profile)"
          >
            <!-- Card Header -->
            <div class="talent-card-header">
              <div class="avatar-frame">
                <img v-if="profile.avatarUrl" :src="profile.avatarUrl" :alt="profile.firstName" class="card-avatar-img" />
                <template v-else>{{ getAvatarSymbol(profile.specialization) }}</template>
                <div class="avatar-glow"></div>
              </div>
              <div class="talent-meta">
                <div class="name-badge-row">
                  <NuxtLink :to="'/profiles/' + getProfileSlug(profile)" class="talent-name-link">
                    <h2>{{ profile.firstName }} {{ profile.lastName }}</h2>
                  </NuxtLink>
                  <span v-if="profile.isVerified" class="verified-check-badge" title="Профиль проверен администратором">✓ Verified</span>
                </div>
                <span class="spec-badge">{{ profile.title }}</span>
              </div>
            </div>

            <!-- Experience & Last active -->
            <div class="talent-experience">
              <span>💼 Опыт: {{ profile.experienceYears }} лет</span>
              <span class="divider">•</span>
              <span :class="['avail-dot-indicator', profile.availability.toLowerCase()]"></span>
              <span>{{ getAvailabilityLabel(profile.availability) }}</span>
            </div>

            <!-- Pricing Details -->
            <div v-if="profile.hourlyRate || profile.monthlySalary" class="talent-pricing-row">
              <span v-if="profile.hourlyRate">⏱️ {{ profile.hourlyRate }} ₽ / час</span>
              <span v-if="profile.monthlySalary">💰 от {{ profile.monthlySalary.toLocaleString() }} ₽/мес</span>
            </div>

            <!-- Biography -->
            <div class="talent-bio">
              <p class="bio-text">{{ profile.bio }}</p>
              <NuxtLink :to="'/profiles/' + getProfileSlug(profile)" class="read-more-link">Подробнее об исполнителе →</NuxtLink>
            </div>

            <!-- Skill Tags -->
            <div class="skills-container">
              <span v-for="skill in profile.skills" :key="skill" class="skill-chip">
                {{ skill }}
              </span>
            </div>

            <!-- Gated Contacts Block -->
            <div class="gated-contact-section">
              <div class="contact-list">
                <div class="contact-item">
                  <span class="emoji-ico">✉️ Email:</span>
                  <a v-if="profile.isUnlocked && profile.contactEmail" :href="`mailto:${profile.contactEmail}`">{{ profile.contactEmail }}</a>
                  <span v-else class="masked-contact-text" aria-label="Контакт скрыт до оплаты">alex.v***@fyxi.ru</span>
                </div>
                <div class="contact-item">
                  <span class="emoji-ico">✈️ Telegram:</span>
                  <a v-if="profile.isUnlocked && profile.contactTelegram" :href="`https://t.me/${profile.contactTelegram?.replace('@', '')}`" target="_blank" rel="noopener">{{ profile.contactTelegram }}</a>
                  <span v-else class="masked-contact-text" aria-label="Контакт скрыт до оплаты">@alex_***</span>
                </div>
                <div v-if="profile.contactPhone" class="contact-item">
                  <span class="emoji-ico">📞 Телефон:</span>
                  <span v-if="profile.isUnlocked">{{ profile.contactPhone }}</span>
                  <span v-else class="masked-contact-text" aria-label="Контакт скрыт до оплаты">+7 (903) ***-**-**</span>
                </div>
              </div>

              <!-- Blur Gated Overlay -->
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
                  <svg style="width: 14px; height: 14px; fill: currentColor;" viewBox="0 0 24 24">
                    <path d="M12 17a2 2 0 0 0 2-2 2 2 0 0 0-2-2 2 2 0 0 0-2 2 2 2 0 0 0 2 2m6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2m-6-5c1.66 0 3 1.34 3 3v2H9V6c0-1.66 1.34-3 3-3z"/>
                  </svg>
                  Открыть контакт • 500 ₽
                </button>
              </div>
            </div>

          </div>
        </article>
      </div>
    </section>

    <!-- FAQ SECTION (VISUAL MATCH TO FAQPAGE SCHEMA) -->
    <section class="faq-section">
      <div class="faq-container">
        <h2 class="faq-title">Часто задаваемые вопросы (<span class="hero-gradient-text">FAQ</span>)</h2>
        <div class="faq-grid">
          <div class="faq-card">
            <h3>❓ Как выкупить контакты веб-дизайнера или разработчика на fyxi?</h3>
            <p>Выберите подходящего специалиста в каталоге fyxi.ru, добавьте его карточку в корзину и оплатите мгновенно. Контакты (Telegram, Email, телефон) станут полностью открыты.</p>
          </div>
          <div class="faq-card">
            <h3>💰 Берет ли маркетплейс fyxi комиссию за сделки?</h3>
            <p>Нет! Платформа fyxi функционирует по модели Pay-Per-Contact: вы платите фиксированные 500 ₽ за прямой контакт исполнителя и работаете с ним напрямую без посредников.</p>
          </div>
          <div class="faq-card">
            <h3>🛡️ Как специалисты проходят модерацию на fyxi?</h3>
            <p>Каждая анкета и портфолио работы в Zero Block проверяются арт-директорами платформы fyxi перед публикацией в общем каталоге.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- SEO KEYWORD LINKS BLOCK FOR YANDEX & GOOGLE WORDSTAT -->
    <section class="seo-keywords-section">
      <div class="seo-keywords-container">
        <h2 class="seo-keywords-title">Популярные направления подбора специалистов на fyxi</h2>
        <div class="seo-tags-grid">
          <NuxtLink to="/blog/kak-vybrat-luchshego-dizajnera-na-tilda" class="seo-tag-link">📐 Дизайнеры Zero Block</NuxtLink>
          <NuxtLink to="/blog/poshagovaya-animaciya-v-tilda-zero-block-gid" class="seo-tag-link">✨ Разработчики анимации Tilda</NuxtLink>
          <NuxtLink to="/blog/skolko-stoit-zakazat-sajt-na-tilda-v-2026-godu" class="seo-tag-link">💰 Заказать сайт на Тильде цена</NuxtLink>
          <NuxtLink to="/blog/kak-podklyuchit-yukassa-k-tilda-poshagovaya-instrukciya" class="seo-tag-link">🛒 E-commerce &amp; ЮKassa Tilda</NuxtLink>
          <NuxtLink to="/blog/seo-optimizaciya-sajta-na-tilda-chek-list" class="seo-tag-link">📈 SEO оптимизация сайтов на Tilda</NuxtLink>
        </div>
      </div>
    </section>

  </div>
</template>

<style scoped>
/* --- PAGE LAYOUT --- */
.catalog-page {
  padding-bottom: 5rem;
}

/* --- HERO --- */
.hero-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 6rem 2rem 3rem;
  text-align: center;
  position: relative;
  z-index: 10;
}

.badge-promo {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
  color: #c084fc;
  padding: 0.5rem 1rem;
  border-radius: 99px;
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 2rem;
  box-shadow: inset 0 0 10px rgba(139, 92, 246, 0.05);
}

.logo-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--accent-violet);
  display: inline-block;
  box-shadow: 0 0 10px var(--accent-violet);
}

h1 {
  font-size: 3.5rem;
  line-height: 1.1;
  margin-bottom: 1.5rem;
  font-weight: 700;
}

.hero-gradient-text {
  background: var(--gradient-cyber);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

p {
  font-size: 1.2rem;
  color: var(--text-muted);
  max-width: 600px;
  margin: 0 auto;
  font-weight: 300;
}

/* --- FILTER TOOLBAR --- */
.filter-toolbar {
  max-width: 1200px;
  margin: 0 auto 3rem;
  padding: 0 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  position: relative;
  z-index: 10;
}

.search-input {
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-glow);
  padding: 1.1rem 1.5rem;
  border-radius: 16px;
  color: #fff;
  font-family: inherit;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--accent-cyan);
  background: rgba(255, 255, 255, 0.06);
  box-shadow: 0 0 16px rgba(6, 182, 212, 0.15);
}

.toolbar-filters {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.filter-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.03);
  padding: 0.3rem;
  border-radius: 12px;
  border: 1px solid var(--border-glow);
}

.filter-tab {
  background: transparent;
  border: none;
  color: var(--text-muted);
  padding: 0.6rem 1.2rem;
  border-radius: 9px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-tab.active {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}

.filter-selects {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.filter-select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-color: rgba(18, 18, 26, 0.85);
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2306b6d4' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 1rem center;
  background-size: 1rem;
  border: 1px solid var(--border-glow);
  color: var(--text-primary);
  padding: 0.7rem 2.8rem 0.7rem 1.2rem;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  backdrop-filter: blur(12px);
}

.filter-select:hover, .filter-select:focus {
  border-color: rgba(6, 182, 212, 0.5);
  background-color: rgba(18, 18, 26, 0.95);
  box-shadow: 0 0 16px rgba(6, 182, 212, 0.2);
  outline: none;
}

.filter-select option {
  background-color: #0d0c18 !important;
  color: #f8fafc !important;
  padding: 10px 14px;
}

.verified-checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-muted);
  cursor: pointer;
}

.verified-checkbox-label input {
  accent-color: var(--accent-cyan);
  width: 16px;
  height: 16px;
}

/* --- GRID & CARDS --- */
.catalog-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 2.5rem;
}

.card-wrapper {
  perspective: 1000px;
}

.talent-card {
  background: var(--bg-card);
  border: 1px solid var(--border-glow);
  border-radius: 24px;
  padding: 2rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  transform-style: preserve-3d;
  transition: border-color 0.4s ease, box-shadow 0.4s ease, transform 0.1s ease-out;
  backdrop-filter: blur(12px);
  text-align: left;
  cursor: pointer;
}

.talent-card.designer:hover {
  border-color: rgba(var(--accent-violet-rgb), 0.4);
  box-shadow: 0 15px 40px -10px rgba(var(--accent-violet-rgb), 0.15),
              0 0 1px 1px rgba(var(--accent-violet-rgb), 0.1);
}

.talent-card.developer:hover, .talent-card.fullstack:hover {
  border-color: rgba(var(--accent-cyan-rgb), 0.4);
  box-shadow: 0 15px 40px -10px rgba(var(--accent-cyan-rgb), 0.15),
              0 0 1px 1px rgba(var(--accent-cyan-rgb), 0.1);
}

.talent-card-header {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  margin-bottom: 1.5rem;
  transform: translateZ(20px);
}

.avatar-frame {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow: hidden;
}

.card-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 18px;
}

.avatar-glow {
  position: absolute;
  inset: -2px;
  border-radius: 20px;
  background: var(--gradient-cyber);
  z-index: -1;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.talent-card:hover .avatar-glow {
  opacity: 0.4;
}

.name-badge-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.verified-check-badge {
  background: rgba(6, 182, 212, 0.1);
  color: var(--accent-cyan);
  border: 1px solid rgba(6, 182, 212, 0.2);
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  letter-spacing: 0.02em;
}

.spec-badge {
  display: inline-block;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-muted);
}

.designer .spec-badge {
  color: #d8b4fe;
}

.developer .spec-badge, .fullstack .spec-badge {
  color: #99f6e4;
}

.talent-experience {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transform: translateZ(15px);
}

.avail-dot-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  display: inline-block;
}

.avail-dot-indicator.free { background-color: #22c55e; box-shadow: 0 0 6px #22c55e; }
.avail-dot-indicator.open_for_offers { background-color: #eab308; box-shadow: 0 0 6px #eab308; }
.avail-dot-indicator.busy { background-color: #ef4444; box-shadow: 0 0 6px #ef4444; }

.talent-pricing-row {
  display: flex;
  gap: 1rem;
  font-size: 0.82rem;
  color: #cbd5e1;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-glow);
  padding: 0.35rem 0.75rem;
  border-radius: 8px;
  width: fit-content;
  margin-bottom: 1.2rem;
}

.talent-bio {
  margin-bottom: 1.5rem;
  transform: translateZ(10px);
}

.bio-text {
  font-size: 0.92rem;
  color: #cbd5e1;
  line-height: 1.5;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.skills-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 2rem;
  transform: translateZ(15px);
}

.skill-chip {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-glow);
  padding: 0.3rem 0.7rem;
  border-radius: 8px;
  font-size: 0.78rem;
  color: #94a3b8;
  transition: all 0.2s ease;
}

.talent-card:hover .skill-chip {
  border-color: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

/* --- THE GATED ACCESS AREA (BLUR) --- */
.gated-contact-section {
  margin-top: auto;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border-glow);
  border-radius: 16px;
  padding: 1.2rem;
  position: relative;
  overflow: hidden;
  transform: translateZ(25px);
}

.contact-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  filter: blur(12px);
  user-select: none;
  pointer-events: none;
  transition: filter 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.85rem;
  color: var(--text-muted);
}

.contact-item a {
  color: var(--accent-cyan);
  text-decoration: none;
}

.contact-item a:hover {
  text-decoration: underline;
}

.emoji-ico {
  font-weight: 500;
  color: var(--text-muted);
}

/* Lock Overlay */
.blur-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(11, 10, 20, 0.3);
  backdrop-filter: blur(2px);
  transition: all 0.5s ease;
  z-index: 5;
}

.unlock-btn {
  background: var(--gradient-cyber);
  border: none;
  color: #fff;
  padding: 0.7rem 1.4rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.unlock-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 6px 20px rgba(139, 92, 246, 0.5);
}

/* Unlocked State styles */
.talent-card.unlocked .contact-list {
  filter: blur(0);
  user-select: text;
  pointer-events: auto;
}

.talent-card.unlocked .blur-overlay {
  opacity: 0;
  pointer-events: none;
  transform: scale(1.1);
}

.talent-card.unlocked .gated-contact-section {
  border-color: rgba(34, 197, 94, 0.3);
  background: rgba(34, 197, 94, 0.03);
}

/* Loading, Error and Empty layouts */
.loading-state, .error-state, .empty-state {
  text-align: center;
  padding: 5rem 2rem;
  color: var(--text-muted);
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.05);
  border-top-color: var(--accent-cyan);
  border-radius: 50%;
  animation: spin 1s infinite linear;
  margin: 0 auto 1.5rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.retry-btn {
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border-glow);
  color: #fff;
  padding: 0.6rem 1.2rem;
  border-radius: 8px;
  cursor: pointer;
  margin-top: 1rem;
}

.talent-name-link {
  text-decoration: none;
  color: inherit;
}

.talent-name-link:hover h3 {
  color: var(--accent-cyan);
  text-shadow: 0 0 10px rgba(6, 182, 212, 0.4);
}

.read-more-link {
  display: inline-block;
  font-size: 0.82rem;
  color: var(--accent-cyan);
  text-decoration: none;
  margin-top: 0.5rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.read-more-link:hover {
  color: #fff;
  text-shadow: 0 0 8px var(--accent-cyan);
}

/* --- QUICK SKILLS PILLS --- */
.skills-pills-container {
  margin: 1.5rem 0 2rem;
  text-align: left;
}

.pills-title {
  display: block;
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.5px;
}

.skills-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.skill-pill {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-glow);
  padding: 0.5rem 1rem;
  border-radius: 12px;
  font-size: 0.82rem;
  color: #94a3b8;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  user-select: none;
}

.skill-pill:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.15);
  color: var(--text-primary);
  transform: translateY(-2px);
}

.skill-pill.active {
  background: rgba(139, 92, 246, 0.15);
  border-color: var(--accent-violet);
  color: #fff;
  box-shadow: 0 0 15px rgba(139, 92, 246, 0.3);
  font-weight: 600;
}

.pill-emoji {
  font-size: 0.95rem;
}

/* --- FAQ SECTION --- */
.faq-section {
  max-width: 1200px;
  margin: 5rem auto 0;
  padding: 0 2rem;
}

.faq-container {
  background: var(--bg-card);
  border: 1px solid var(--border-glow);
  border-radius: 28px;
  padding: 3rem 2.5rem;
  backdrop-filter: blur(12px);
  text-align: left;
}

.faq-title {
  font-size: 2.2rem;
  margin-bottom: 2.5rem;
  text-align: center;
}

.faq-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.faq-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-glow);
  padding: 1.8rem;
  border-radius: 18px;
  transition: all 0.3s ease;
}

.faq-card:hover {
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateY(-3px);
}

.faq-card h3 {
  font-size: 1.1rem;
  color: var(--text-primary);
  margin-bottom: 0.8rem;
  line-height: 1.35;
}

.faq-card p {
  font-size: 0.95rem;
  color: var(--text-muted);
  line-height: 1.5;
  margin: 0;
}

/* --- SEO KEYWORDS LINKS --- */
.seo-keywords-section {
  max-width: 1200px;
  margin: 3rem auto 0;
  padding: 0 2rem;
}

.seo-keywords-container {
  background: rgba(18, 18, 26, 0.4);
  border: 1px solid var(--border-glow);
  border-radius: 20px;
  padding: 2rem 2.5rem;
  text-align: center;
}

.seo-keywords-title {
  font-size: 1.1rem;
  color: var(--text-muted);
  margin-bottom: 1.2rem;
  font-weight: 500;
}

.seo-tags-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.8rem;
}

.seo-tag-link {
  display: inline-block;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-glow);
  color: var(--text-primary);
  padding: 0.5rem 1rem;
  border-radius: 99px;
  font-size: 0.88rem;
  text-decoration: none;
  transition: all 0.3s ease;
}

.seo-tag-link:hover {
  border-color: var(--accent-cyan);
  color: var(--accent-cyan);
  transform: translateY(-2px);
}
</style>
