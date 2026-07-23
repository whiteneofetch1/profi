<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useCartStore } from '~/stores/cart';
import { useAuthStore } from '~/stores/auth';

const route = useRoute();
const cart = useCartStore();
const auth = useAuthStore();
const showToast = inject('showToast') as (msg: string, type?: 'success' | 'info') => void;

const config = useRuntimeConfig();

// Perform advanced server-side data fetching for 100% perfect SSR indexing!
const { data: profile, pending: loading, error: fetchError } = await useAsyncData(`profile-${route.params.id}`, () => {
  return $fetch<any>(`${config.public.apiUrl}/profiles/${route.params.id}`);
});

const error = computed(() => {
  if (!fetchError.value) return '';
  return (fetchError.value as any).data?.error || 'Специалист не найден или база данных временно недоступна.';
});

const selectedCaseForLightbox = ref<any | null>(null);
const mockWorks = [
  {
    title: 'Porsche Russia Concept',
    description: 'Интерактивный промо-лендинг нового электрокара с адаптивным Zero Block и пошаговой 3D-анимацией.',
    tags: ['Zero Block', 'Step-by-Step Animation', 'Custom CSS'],
    platform: 'Tilda CC',
    year: '2026',
    image: '/portfolio/porsche_concept.png'
  },
  {
    title: 'Norse Jewelry E-commerce',
    description: 'Интернет-магазин скандинавских ювелирных изделий с личным кабинетом, корзиной и интеграцией ЮKassa.',
    tags: ['E-commerce', 'Payment Integration', 'Tilda CRM'],
    platform: 'Tilda Business',
    year: '2025',
    image: '/portfolio/norse_jewelry.png'
  },
  {
    title: 'Solitude — Architecture Bureau',
    description: 'Минималистичный корпоративный сайт архитектурного бюро с тонкой сеткой и плавными переходами.',
    tags: ['Minimalism', 'Typography', 'Grid Design'],
    platform: 'Tilda CC',
    year: '2025'
  }
];

const url = useRequestURL();

useSeoMeta({
  title: () => profile.value ? `${profile.value.firstName} ${profile.value.lastName} — ${profile.value.title} | fyxi` : 'Загрузка профиля... | fyxi',
  ogTitle: () => profile.value ? `${profile.value.firstName} ${profile.value.lastName} — ${profile.value.title}` : 'Профиль специалиста | fyxi',
  description: () => profile.value ? `Подробный профиль специалиста ${profile.value.firstName} ${profile.value.lastName}. Опыт работы: ${profile.value.experienceYears} лет. Стек: ${profile.value.skills?.join(', ')}. Узнайте расценки и откройте контакты.` : 'Подробный профиль специалиста на fyxi.ru.',
  ogDescription: () => profile.value ? `Специалист по направлению ${profile.value.title}. Опыт работы: ${profile.value.experienceYears} лет. Ключевые навыки: ${profile.value.skills?.join(', ')}.` : 'Карточка IT-специалиста на маркетплейсе fyxi.ru.',
  ogType: 'profile',
  ogImage: '/og-image.jpg',
  twitterCard: 'summary_large_image',
  twitterTitle: () => profile.value ? `${profile.value.firstName} ${profile.value.lastName} — ${profile.value.title}` : 'Профиль специалиста | fyxi',
  twitterDescription: () => profile.value ? `Изучите портфолио специалиста ${profile.value.firstName} ${profile.value.lastName} и выкупите прямые контакты.` : 'Портфолио и контакты разработчиков и дизайнеров.',
  twitterImage: '/og-image.jpg',
  keywords: () => profile.value ? `fyxi, ${profile.value.firstName} ${profile.value.lastName}, ${profile.value.title}, ${profile.value.skills?.join(', ')}, портфолио тильда, контакты фрилансера` : 'дизайнеры тильда, разработчики tilda'
});

useHead({
  link: [
    { rel: 'canonical', href: computed(() => profile.value ? `${url.origin}/profiles/${profile.value.slug || profile.value.id}` : url.href) }
  ],
  script: computed(() => {
    if (!profile.value) return [];
    
    const personSchema: any = {
      '@context': 'https://schema.org',
      '@type': 'Person',
      'name': `${profile.value.firstName} ${profile.value.lastName}`,
      'jobTitle': profile.value.title,
      'description': profile.value.bio,
      'knowsAbout': profile.value.skills,
      'worksFor': {
        '@type': 'Organization',
        'name': 'fyxi',
        'url': 'https://fyxi.ru'
      }
    };

    if (profile.value.hourlyRate || profile.value.monthlySalary) {
      personSchema.offers = {
        '@type': 'Offer',
        'price': profile.value.hourlyRate || profile.value.monthlySalary,
        'priceCurrency': 'RUB',
        'description': profile.value.hourlyRate ? 'Часовая ставка за разработку/дизайн' : 'Желаемый месячный оклад'
      };
    }

    if (profile.value.reviewCount && profile.value.reviewCount > 0) {
      personSchema.aggregateRating = {
        '@type': 'AggregateRating',
        'ratingValue': profile.value.averageRating,
        'reviewCount': profile.value.reviewCount,
        'bestRating': 5,
        'worstRating': 1
      };
    }

    const profilePageSchema = {
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      'name': `${profile.value.firstName} ${profile.value.lastName} — ${profile.value.title} | fyxi`,
      'description': `Профессиональный профиль и контакты специалиста ${profile.value.firstName} ${profile.value.lastName} на маркетплейсе fyxi.ru.`,
      'mainEntity': personSchema,
      'primaryImageOfPage': {
        '@type': 'ImageObject',
        'url': 'https://fyxi.ru/favicon.svg'
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
          'name': `${profile.value.firstName} ${profile.value.lastName}`,
          'item': url.href
        }
      ]
    };

    return [
      { type: 'application/ld+json', children: JSON.stringify(profilePageSchema) },
      { type: 'application/ld+json', children: JSON.stringify(breadcrumbsSchema) }
    ];
  })
});

// Profile fetching is performed server-side via useAsyncData above

// REVIEWS & BRIEF MODAL STATES
const reviews = ref<any[]>([]);
const averageRating = ref(profile.value?.averageRating || 5.0);
const reviewCount = ref(profile.value?.reviewCount || 0);
const isReviewModalOpen = ref(false);
const newReview = ref({ authorName: '', rating: 5, comment: '' });
const isSubmittingReview = ref(false);

const isBriefModalOpen = ref(false);
const briefForm = ref({
  clientName: '',
  clientEmail: '',
  projectType: 'Лендинг на Tilda Zero Block',
  budget: '100 000 — 200 000 ₽',
  deadline: '2–3 недели',
  figmaLink: '',
  description: '',
});
const isSendingBrief = ref(false);

const fetchReviews = async () => {
  try {
    const res = await $fetch<any>(`${config.public.apiUrl}/profiles/${route.params.id}/reviews`);
    reviews.value = res.reviews || [];
    averageRating.value = res.averageRating || 5.0;
    reviewCount.value = res.reviewCount || 0;
  } catch (err) {
    console.error('Failed to load reviews:', err);
  }
};

const hoverRating = ref(0);

function getRatingLabel(val: number) {
  switch (val) {
    case 5: return '5 / 5 — Превосходно ⭐⭐⭐⭐⭐';
    case 4: return '4 / 5 — Хорошо ⭐⭐⭐⭐';
    case 3: return '3 / 5 — Нормально ⭐⭐⭐';
    case 2: return '2 / 5 — Были нюансы ⭐⭐';
    case 1: return '1 / 5 — Плохо ⭐';
    default: return 'Выберите оценку (нажмите на звёзды)';
  }
}

function getInitials(name?: string) {
  if (!name) return '👤';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

onMounted(() => {
  fetchReviews();
});

const submitReview = async () => {
  if (!newReview.value.authorName.trim() || !newReview.value.comment.trim()) {
    showToast('Пожалуйста, укажите ваше имя и отзыв', 'info');
    return;
  }
  isSubmittingReview.value = true;
  try {
    await $fetch(`${config.public.apiUrl}/profiles/${route.params.id}/reviews`, {
      method: 'POST',
      body: newReview.value,
    });
    showToast('Спасибо за отзыв! Он успешно опубликован.', 'success');
    isReviewModalOpen.value = false;
    newReview.value = { authorName: '', rating: 5, comment: '' };
    await fetchReviews();
  } catch (err: any) {
    showToast(err.data?.error || 'Ошибка при публикации отзыва', 'info');
  } finally {
    isSubmittingReview.value = false;
  }
};

const sendBrief = async () => {
  if (!briefForm.value.clientName.trim() || !briefForm.value.clientEmail.trim() || !briefForm.value.description.trim()) {
    showToast('Пожалуйста, заполните основные поля брифа (Имя, Email, Описание)', 'info');
    return;
  }
  isSendingBrief.value = true;
  try {
    await $fetch(`${config.public.apiUrl}/profiles/brief/send`, {
      method: 'POST',
      body: {
        devProfileIds: [route.params.id],
        ...briefForm.value,
      },
    });
    showToast('Бриф успешно отправлен специалисту! Ожидайте ответа на почту.', 'success');
    isBriefModalOpen.value = false;
  } catch (err: any) {
    showToast(err.data?.error || 'Ошибка отправки брифа', 'info');
  } finally {
    isSendingBrief.value = false;
  }
};

function handleAddToCart() {
  if (!profile.value) return;
  cart.addItem({
    id: profile.value.id,
    firstName: profile.value.firstName,
    lastName: profile.value.lastName,
    title: profile.value.title,
    avatarSymbol: profile.value.firstName[0] + profile.value.lastName[0]
  });
  showToast(`Специалист ${profile.value.firstName} добавлен в вашу корзину!`, 'success');
}
</script>

<template>
  <div class="profile-detail-page">
    <div class="detail-container">
      
      <!-- Breadcrumbs -->
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <NuxtLink to="/">Главная</NuxtLink>
        <span class="separator">/</span>
        <span class="current" v-if="profile">{{ profile.firstName }} {{ profile.lastName }}</span>
        <span class="current" v-else>Загрузка...</span>
      </nav>

      <!-- Loading / Error states -->
      <div v-if="loading" class="state-view">Загрузка карточки специалиста...</div>
      <div v-else-if="error" class="state-view error-msg">⚠️ {{ error }}</div>
      
      <div v-else class="profile-layout">
        
        <!-- LEFT COLUMN: Main Info & Actions -->
        <div class="sidebar-col">
          <div class="designer-card-hero">
            <!-- Availability indicator -->
            <div class="availability-bar">
              <span :class="['dot-indicator', profile.availability.toLowerCase()]"></span>
              <span class="dot-text">
                {{ profile.availability === 'FREE' ? 'Свободен для заказов' : (profile.availability === 'OPEN_FOR_OFFERS' ? 'Рассматривает предложения' : 'Занят') }}
              </span>
            </div>

            <!-- Header name & avatar -->
            <div class="avatar-holder">
              <NuxtImg v-if="profile.avatarUrl" :src="profile.avatarUrl" :alt="profile.firstName" class="profile-avatar-img" format="webp" />
              <span v-else class="initials">{{ profile.firstName[0] }}{{ profile.lastName[0] }}</span>
              <span v-if="profile.isVerified" class="verified-seal" title="Верифицированный профиль">✓ Проверен</span>
            </div>

            <h1 class="spec-name">{{ profile.firstName }} {{ profile.lastName }}</h1>
            <p class="spec-title-tag">{{ profile.title }}</p>
            <p class="spec-experience">Опыт работы: <strong>{{ profile.experienceYears }} лет</strong></p>

            <!-- Price tags -->
            <div class="rates-display-box">
              <div v-if="profile.hourlyRate" class="rate-item">
                <span class="rate-label">Часовая ставка</span>
                <span class="rate-value">{{ profile.hourlyRate }} ₽ <span class="unit">/ час</span></span>
              </div>
              <div v-if="profile.monthlySalary" class="rate-item">
                <span class="rate-label">Желаемый оклад</span>
                <span class="rate-value">{{ profile.monthlySalary }} ₽ <span class="unit">/ мес</span></span>
              </div>
            </div>

            <!-- GATED CONTACT AREA -->
            <div class="contacts-gated-box">
              <h3 class="gated-header-title">🔒 Прямые контакты специалиста</h3>
              
              <template v-if="profile.isUnlocked">
                <div class="unlocked-contacts-list">
                  <a :href="`mailto:${profile.contactEmail}`" class="contact-btn email">
                    ✉️ Email: {{ profile.contactEmail }}
                  </a>
                  <a :href="`https://t.me/${profile.contactTelegram.replace('@', '')}`" target="_blank" class="contact-btn telegram">
                    ✈️ Telegram: {{ profile.contactTelegram }}
                  </a>
                  <a v-if="profile.contactPhone" :href="`tel:${profile.contactPhone}`" class="contact-btn phone">
                    📞 Тел: {{ profile.contactPhone }}
                  </a>
                </div>
              </template>
              
              <template v-else>
                <div class="locked-blur-view">
                  <div class="blurred-contacts">
                    <div class="blur-line">xxxxxxx@xxxxx.ru</div>
                    <div class="blur-line">@tg_username_xxx</div>
                  </div>
                  <p class="blur-hint">Контакты этого дизайнера скрыты и зашифрованы.</p>
                  <button 
                    v-if="!cart.isInCart(profile.id)" 
                    class="unlock-action-btn"
                    @click="handleAddToCart"
                  >
                    🛒 Добавить в корзину (500 ₽)
                  </button>
                  <button 
                    v-else 
                    class="unlock-action-btn added"
                    @click="cart.isCartOpen = true"
                  >
                    📝 Оформить покупку в корзине
                  </button>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: Detailed Bio & Projects Portfolio -->
        <div class="main-content-col">
          
          <!-- Bio / Resume Section -->
          <section class="bio-section">
            <h2>О себе и профессиональном пути</h2>
            <p class="bio-paragraph">{{ profile.bio }}</p>
          </section>

          <!-- Core Skills Tags -->
          <section class="skills-section">
            <h2>Ключевые компетенции</h2>
            <div class="skills-tags-grid">
              <span v-for="skill in profile.skills" :key="skill" class="skill-tag-item">
                ⚡ {{ skill }}
              </span>
            </div>
          </section>

          <!-- PORTFOLIO SHOWCASE GRID (МОИ РАБОТЫ В ZERO BLOCK) -->
          <section class="portfolio-section" v-if="profile.cases && profile.cases.length > 0">
            <h2>🖼️ Избранные проекты и кейсы</h2>
            <p class="section-subtitle">Работы выполненные специалистом на платформе Tilda в Zero Block:</p>

            <div class="showcase-grid">
              <div 
                v-for="work in profile.cases" 
                :key="work.id" 
                class="showcase-card"
                style="cursor: pointer;"
                @click="selectedCaseForLightbox = work"
              >
                <div class="card-glow-overlay"></div>
                
                <div class="showcase-image-box" style="height: 240px; overflow: hidden; position: relative;">
                  <NuxtImg 
                    v-if="work.coverUrl"
                    :src="work.coverUrl" 
                    :alt="`${work.title} — веб-дизайн выполненный специалистом ${profile.firstName} ${profile.lastName} на платформе Tilda`" 
                    class="showcase-image"
                    loading="lazy"
                    format="webp"
                    style="width: 100%; height: 100%; object-fit: cover;"
                  />
                  <div v-else style="background: linear-gradient(135deg, #1e1b4b 0%, #311b92 100%); display: flex; align-items: center; justify-content: center; color: #a5b4fc; height: 100%; font-weight: 600; font-size: 1.1rem; padding: 1rem; text-align: center;">
                    🎨 {{ work.title }}
                  </div>
                </div>

                <div class="showcase-card-body" style="padding: 1.5rem;">
                  <h3 class="showcase-title" style="margin-top: 0; margin-bottom: 0.5rem; font-size: 1.25rem;">{{ work.title }}</h3>
                  <p class="showcase-desc" style="color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.5; font-size: 0.95rem;">{{ work.description }}</p>
                  <div class="showcase-tags" style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                    <span v-for="t in work.techStack" :key="t" class="case-tag" style="background: rgba(168, 85, 247, 0.12); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.25); padding: 3px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 500;">#{{ t }}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ACTION: SEND PROJECT BRIEF -->
          <div class="brief-action-banner">
            <div class="brief-info">
              <h3>📋 Хотите отправить ТЗ этому специалисту?</h3>
              <p>Заполните 2-минутный бриф проекта. Сообщение будет мгновенно доставлено исполнителю.</p>
            </div>
            <button class="btn-brief-open" @click="isBriefModalOpen = true">
              ✨ Заполнить бриф проекта
            </button>
          </div>

          <!-- VERIFIED REVIEWS SECTION -->
          <section class="reviews-section">
            <div class="reviews-header">
              <div>
                <h2>⭐️ Отзывы и оценки клиентов</h2>
                <p class="section-subtitle">
                  <template v-if="reviewCount > 0">
                    Средний рейтинг: <strong class="rating-highlight">⭐ {{ averageRating }} / 5.0</strong> 
                    ({{ reviewCount }} {{ reviewCount === 1 ? 'отзыв' : (reviewCount > 1 && reviewCount < 5 ? 'отзыва' : 'отзывов') }})
                  </template>
                  <template v-else>
                    <span class="text-gray-400">Пока нет отзывов (0)</span>
                  </template>
                </p>
              </div>
              <button class="btn-add-review" @click="isReviewModalOpen = true">
                💬 Написать отзыв
              </button>
            </div>

            <!-- Reviews List -->
            <div v-if="reviews.length === 0" class="no-reviews-box">
              <p>Пока нет опубликованных отзывов. Будьте первым, кто оценит работу специалиста!</p>
            </div>
            <div v-else class="reviews-grid">
              <div v-for="rev in reviews" :key="rev.id" class="review-card">
                <div class="review-meta">
                  <div class="reviewer-avatar-initial">{{ getInitials(rev.authorName) }}</div>
                  <div class="reviewer-info">
                    <span class="author-name">{{ rev.authorName }}</span>
                    <span class="verified-badge">✓ Проверенный заказчик</span>
                  </div>
                  <div class="review-stars-badge">
                    <span class="star-gold" v-for="s in (rev.rating || 5)" :key="s">★</span>
                    <span class="rating-num">{{ rev.rating }}.0</span>
                  </div>
                </div>
                <p class="review-text">"{{ rev.comment }}"</p>
              </div>
            </div>
          </section>

        </div>

      </div>
    </div>

    <!-- BRIEF MODAL -->
    <div v-if="isBriefModalOpen" class="modal-overlay" @click.self="isBriefModalOpen = false">
      <div class="modal-card brief-modal" @click.stopPropagation>
        <header class="modal-header">
          <h3>📋 Конструктор Брифа проекта для {{ profile.firstName }}</h3>
          <button class="close-modal-btn" @click="isBriefModalOpen = false">×</button>
        </header>

        <div class="modal-body">
          <div class="form-row">
            <div class="form-group">
              <label>Ваше имя *</label>
              <input v-model="briefForm.clientName" type="text" placeholder="Иван Петров" class="form-input" />
            </div>
            <div class="form-group">
              <label>Ваш Email *</label>
              <input v-model="briefForm.clientEmail" type="email" placeholder="ivan@company.ru" class="form-input" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Тип проекта</label>
              <input v-model="briefForm.projectType" type="text" placeholder="Лендинг / Магазин" class="form-input" />
            </div>
            <div class="form-group">
              <label>Бюджет</label>
              <input v-model="briefForm.budget" type="text" placeholder="100 000 ₽" class="form-input" />
            </div>
          </div>

          <div class="form-group full-width">
            <label>Ссылка на Figma / Референсы (необязательно)</label>
            <input v-model="briefForm.figmaLink" type="text" placeholder="https://figma.com/file/..." class="form-input" />
          </div>

          <div class="form-group full-width">
            <label>Описание задачи и пожеланий *</label>
            <textarea v-model="briefForm.description" rows="5" placeholder="Опишите ваши задачи и желаемый результат..." class="form-input textarea-field"></textarea>
          </div>
        </div>

        <footer class="modal-footer">
          <button class="cancel-modal-btn" @click="isBriefModalOpen = false">Отмена</button>
          <button :disabled="isSendingBrief" class="submit-modal-btn" @click="sendBrief">
            {{ isSendingBrief ? 'Отправка...' : '🚀 Отправить бриф' }}
          </button>
        </footer>
      </div>
    </div>

    <!-- REVIEW MODAL -->
    <div v-if="isReviewModalOpen" class="modal-overlay" @click.self="isReviewModalOpen = false">
      <div class="modal-card review-modal" @click.stopPropagation>
        <header class="modal-header">
          <h3>💬 Оставить отзыв о специалисте</h3>
          <button class="close-modal-btn" @click="isReviewModalOpen = false">×</button>
        </header>

        <div class="modal-body">
          <div class="form-group full-width">
            <label>Ваше имя / Компания *</label>
            <input v-model="newReview.authorName" type="text" placeholder="Алексей (ООО Вектор)" class="form-input" />
          </div>

          <div class="form-group full-width">
            <label>Ваша оценка *</label>
            <div class="star-rating-picker">
              <div class="stars-row">
                <button 
                  v-for="star in 5" 
                  :key="star" 
                  type="button" 
                  class="star-picker-btn"
                  :class="{ 'active': star <= (hoverRating || newReview.rating) }"
                  @mouseenter="hoverRating = star"
                  @mouseleave="hoverRating = 0"
                  @click="newReview.rating = star"
                >
                  ★
                </button>
              </div>
              <span class="rating-label-text">{{ getRatingLabel(hoverRating || newReview.rating) }}</span>
            </div>
          </div>

          <div class="form-group full-width">
            <label>Ваш отзыв *</label>
            <textarea v-model="newReview.comment" rows="4" placeholder="Опишите впечатление от работы, соблюдение сроков и результат..." class="form-input textarea-field"></textarea>
          </div>
        </div>

        <footer class="modal-footer">
          <button class="cancel-modal-btn" @click="isReviewModalOpen = false">Отмена</button>
          <button :disabled="isSubmittingReview" class="submit-modal-btn" @click="submitReview">
            {{ isSubmittingReview ? 'Публикация...' : 'Опубликовать отзыв' }}
          </button>
        </footer>
      </div>
    </div>

    <!-- STICKY MOBILE CTA BAR -->
    <div v-if="profile && !profile.isUnlocked" class="sticky-mobile-cta-bar">
      <div class="sticky-cta-content">
        <div class="sticky-price-info">
          <span class="sticky-price-title">Контакты {{ profile.firstName }}</span>
          <span class="sticky-price-amount">500 ₽</span>
        </div>
        <button 
          v-if="!cart.isInCart(profile.id)" 
          class="sticky-cart-btn"
          @click="handleAddToCart"
        >
          🛒 В корзину
        </button>
        <button 
          v-else 
          class="sticky-cart-btn added"
          @click="cart.toggleDrawer(true)"
        >
          ✅ В корзине
        </button>
      </div>
    </div>

    <!-- PORTFOLIO LIGHTBOX MODAL -->
    <div v-if="selectedCaseForLightbox" class="modal-overlay" @click.self="selectedCaseForLightbox = null">
      <div class="modal-card lightbox-modal-card" @click.stopPropagation>
        <header class="modal-header">
          <h3>🎨 {{ selectedCaseForLightbox.title }}</h3>
          <button class="close-modal-btn" @click="selectedCaseForLightbox = null">×</button>
        </header>

        <div class="modal-body lightbox-body">
          <div v-if="selectedCaseForLightbox.coverUrl" class="lightbox-image-box">
            <NuxtImg :src="selectedCaseForLightbox.coverUrl" :alt="selectedCaseForLightbox.title" class="lightbox-img" format="webp" />
          </div>
          <p class="lightbox-desc">{{ selectedCaseForLightbox.description }}</p>
          <div class="lightbox-tags" style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 1rem;">
            <span v-for="t in selectedCaseForLightbox.techStack" :key="t" class="case-tag" style="background: rgba(168, 85, 247, 0.12); color: #c084fc; border: 1px solid rgba(168, 85, 247, 0.25); padding: 4px 12px; border-radius: 8px; font-size: 0.85rem; font-weight: 500;">#{{ t }}</span>
          </div>
        </div>

        <footer class="modal-footer">
          <button class="cancel-modal-btn" @click="selectedCaseForLightbox = null">Закрыть</button>
          <a 
            v-if="selectedCaseForLightbox.projectUrl" 
            :href="selectedCaseForLightbox.projectUrl" 
            target="_blank" 
            class="submit-modal-btn" 
            style="text-decoration: none; display: inline-flex; align-items: center; gap: 0.4rem;"
          >
            🔗 Открыть проект
          </a>
        </footer>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-detail-page {
  padding: 5rem 2rem;
  min-height: 100vh;
}

.detail-container {
  max-width: 1200px;
  margin: 0 auto;
}

/* --- BREADCRUMBS --- */
.breadcrumbs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  font-size: 0.95rem;
  margin-bottom: 2rem;
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

.profile-layout {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 3rem;
  text-align: left;
}

@media (max-width: 900px) {
  .profile-layout {
    grid-template-columns: 1fr;
    gap: 2.5rem;
  }
}

/* --- LEFT SIDEBAR CARD --- */
.sidebar-col {
  display: flex;
  flex-direction: column;
}

.designer-card-hero {
  background: var(--bg-card);
  border: 1px solid var(--border-glow);
  padding: 2.5rem 2rem;
  border-radius: 24px;
  backdrop-filter: blur(12px);
  position: sticky;
  top: 100px;
}

.availability-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  margin-bottom: 1.5rem;
}

.dot-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.dot-indicator.free { background: #22c55e; box-shadow: 0 0 10px #22c55e; }
.dot-indicator.open_for_offers { background: #eab308; box-shadow: 0 0 10px #eab308; }
.dot-indicator.busy { background: #ef4444; box-shadow: 0 0 10px #ef4444; }

.dot-text {
  color: var(--text-muted);
}

.avatar-holder {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: var(--gradient-cyber);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  position: relative;
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.2);
}

.profile-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.initials {
  font-size: 2.2rem;
  font-weight: 700;
  color: #fff;
}

.verified-seal {
  position: absolute;
  bottom: -4px;
  right: -10px;
  background: #0d0c18;
  border: 1.5px solid var(--accent-cyan);
  color: var(--accent-cyan);
  font-size: 0.72rem;
  padding: 0.25rem 0.65rem;
  border-radius: 99px;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6), 0 0 12px rgba(6, 182, 212, 0.4);
  z-index: 10;
  white-space: nowrap;
}

.spec-name {
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
  text-align: center;
}

.spec-title-tag {
  color: var(--accent-cyan);
  font-weight: 500;
  text-align: center;
  margin-bottom: 1rem;
}

.spec-experience {
  font-size: 0.9rem;
  color: var(--text-muted);
  text-align: center;
  margin-bottom: 2rem;
}

.rates-display-box {
  background: rgba(0,0,0,0.15);
  border: 1px solid var(--border-glow);
  border-radius: 16px;
  padding: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.rate-item {
  display: flex;
  flex-direction: column;
}

.rate-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.rate-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
}

.rate-value .unit {
  font-size: 0.82rem;
  color: var(--text-muted);
  font-weight: 400;
}

/* --- GATED CONTACT BOX --- */
.contacts-gated-box {
  border-top: 1px solid var(--border-glow);
  padding-top: 1.5rem;
}

.gated-header-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #fff;
  margin-bottom: 1rem;
}

.unlocked-contacts-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.contact-btn {
  display: block;
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--border-glow);
  color: #fff;
  padding: 0.8rem;
  border-radius: 12px;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s ease;
  word-break: break-all;
}

.contact-btn:hover {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.15);
}

.contact-btn.telegram {
  background: rgba(6, 182, 212, 0.05);
  border-color: rgba(6, 182, 212, 0.2);
  color: var(--accent-cyan);
}

.contact-btn.telegram:hover {
  background: rgba(6, 182, 212, 0.12);
}

.locked-blur-view {
  text-align: center;
}

.blurred-contacts {
  filter: blur(8px);
  user-select: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
  opacity: 0.3;
}

.blur-line {
  background: rgba(255,255,255,0.1);
  padding: 0.5rem;
  border-radius: 8px;
  font-size: 0.82rem;
}

.blur-hint {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 1.5rem;
}

.unlock-action-btn {
  width: 100%;
  background: var(--gradient-cyber);
  color: #fff;
  border: none;
  padding: 0.9rem;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
  transition: all 0.2s ease;
}

.unlock-action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
}

.unlock-action-btn.added {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.12);
  color: #fff;
  box-shadow: none;
}

.unlock-action-btn.added:hover {
  background: rgba(255,255,255,0.06);
}

/* --- RIGHT MAIN COLUMN --- */
.main-content-col {
  display: flex;
  flex-direction: column;
  gap: 3.5rem;
}

h2 {
  font-size: 1.45rem;
  margin-bottom: 1.2rem;
  color: #fff;
}

.bio-paragraph {
  color: var(--text-muted);
  font-size: 1.05rem;
  line-height: 1.6;
  font-weight: 300;
}

.skills-tags-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.skill-tag-item {
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--border-glow);
  color: var(--text-muted);
  padding: 0.5rem 1rem;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 500;
}

/* --- SHOWCASE PORTFOLIO --- */
.section-subtitle {
  color: var(--text-muted);
  font-size: 0.92rem;
  margin-bottom: 1.5rem;
}

.showcase-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 2rem;
}

.showcase-card {
  background: rgba(255,255,255,0.01);
  border: 1px solid var(--border-glow);
  border-radius: 18px;
  padding: 0;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

.showcase-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255,255,255,0.12);
  box-shadow: 0 8px 30px rgba(0,0,0,0.4);
}

.showcase-image-box {
  width: 100%;
  height: 180px;
  overflow: hidden;
  border-bottom: 1px solid var(--border-glow);
  position: relative;
}

.showcase-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.showcase-card:hover .showcase-image {
  transform: scale(1.05);
}

.showcase-card-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.card-glow-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at 100% 0%, rgba(139, 92, 246, 0.05), transparent 60%);
  pointer-events: none;
}

.showcase-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.2rem;
}

.platform-badge {
  font-size: 0.75rem;
  color: var(--accent-cyan);
  background: rgba(6, 182, 212, 0.08);
  border: 1px solid rgba(6, 182, 212, 0.15);
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  font-weight: 600;
}

.year-label {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.showcase-title {
  font-size: 1.15rem;
  margin-bottom: 0.75rem;
  color: #fff;
}

.showcase-desc {
  font-size: 0.88rem;
  color: var(--text-muted);
  line-height: 1.45;
  margin-bottom: 1.5rem;
  flex: 1;
}

.showcase-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.case-tag {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-weight: 500;
}

.state-view {
  text-align: center;
  padding: 5rem;
  color: var(--text-muted);
}

.state-view.error-msg {
  color: #ef4444;
}

/* --- BRIEF ACTION BANNER --- */
.brief-action-banner {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(6, 182, 212, 0.08));
  border: 1px solid rgba(139, 92, 246, 0.25);
  border-radius: 20px;
  padding: 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 2rem;
  margin-top: 1rem;
}

.brief-info h3 {
  font-size: 1.25rem;
  margin-bottom: 0.5rem;
  color: #fff;
}

.brief-info p {
  color: var(--text-muted);
  font-size: 0.92rem;
}

.btn-brief-open {
  background: var(--gradient-cyber);
  color: #fff;
  border: none;
  padding: 0.85rem 1.6rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
  transition: all 0.2s ease;
}

.btn-brief-open:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
}

/* --- REVIEWS SECTION --- */
.reviews-section {
  margin-top: 2rem;
}

.reviews-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.rating-highlight {
  color: #fbbf24;
  font-size: 1.05rem;
}

.btn-add-review {
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--border-glow);
  color: #fff;
  padding: 0.6rem 1.2rem;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-add-review:hover {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.2);
}

.no-reviews-box {
  background: rgba(255,255,255,0.01);
  border: 1px dashed var(--border-glow);
  padding: 2.5rem;
  border-radius: 16px;
  text-align: center;
  color: var(--text-muted);
}

.reviews-grid {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.review-card {
  background: rgba(255,255,255,0.015);
  border: 1px solid var(--border-glow);
  border-radius: 14px;
  padding: 1.5rem;
}

.reviewer-avatar-initial {
  width: 42px;
  height: 42px;
  min-width: 42px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #a855f7);
  color: #fff;
  font-weight: 700;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 12px rgba(99, 102, 241, 0.3);
}

.reviewer-info {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.review-stars-badge {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.25);
  padding: 0.3rem 0.6rem;
  border-radius: 8px;
}

.star-gold {
  color: #f59e0b;
  font-size: 0.95rem;
}

.rating-num {
  font-size: 0.85rem;
  font-weight: 700;
  color: #fbbf24;
}

/* --- STAR RATING PICKER --- */
.star-rating-picker {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-glow);
  padding: 1rem;
  border-radius: 12px;
}

.stars-row {
  display: flex;
  gap: 0.4rem;
}

.star-picker-btn {
  background: transparent;
  border: none;
  font-size: 2rem;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1;
  padding: 0.2rem;
}

.star-picker-btn.active, .star-picker-btn:hover {
  color: #f59e0b;
  transform: scale(1.15);
  text-shadow: 0 0 12px rgba(245, 158, 11, 0.5);
}

.rating-label-text {
  font-size: 0.85rem;
  color: #818cf8;
  font-weight: 600;
}

.author-name {
  font-weight: 600;
  color: #fff;
}

.verified-badge {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  color: #10b981;
  font-size: 0.72rem;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  font-weight: 600;
}

.review-text {
  color: var(--text-muted);
  font-size: 0.95rem;
  line-height: 1.5;
  font-style: italic;
}

/* --- STICKY MOBILE CTA BAR --- */
.sticky-mobile-cta-bar {
  display: none;
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 90;
  background: rgba(9, 13, 22, 0.92);
  backdrop-filter: blur(16px);
  border-top: 1px solid var(--border-glow);
  padding: 0.85rem 1.25rem;
  box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.7);
}

.sticky-cta-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.sticky-price-info {
  display: flex;
  flex-direction: column;
}

.sticky-price-title {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.sticky-price-amount {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--accent-cyan);
}

.sticky-cart-btn {
  background: linear-gradient(135deg, var(--accent-cyan), #3b82f6);
  color: #fff;
  border: none;
  padding: 0.65rem 1.25rem;
  border-radius: 12px;
  font-weight: 600;
  font-size: 0.92rem;
  cursor: pointer;
  box-shadow: 0 0 15px rgba(6, 182, 212, 0.4);
}

.sticky-cart-btn.added {
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #10b981;
  box-shadow: none;
}

/* --- LIGHTBOX MODAL STYLES --- */
.lightbox-modal-card {
  max-width: 800px;
  width: 90vw;
}

.lightbox-image-box {
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 1.25rem;
  max-height: 480px;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lightbox-img {
  width: 100%;
  max-height: 480px;
  object-fit: contain;
}

.lightbox-desc {
  font-size: 1rem;
  color: #cbd5e1;
  line-height: 1.6;
}

@media (max-width: 900px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .profile-container {
    padding: 1.5rem 1rem 5rem !important;
  }
  .designer-card-hero {
    position: relative;
    top: 0;
    padding: 1.5rem 1.2rem;
    border-radius: 18px;
  }
  .spec-name {
    font-size: 1.4rem;
    word-break: break-word;
  }
  .avatar-holder {
    width: 84px;
    height: 84px;
  }
  .contacts-gated-box {
    padding: 1.2rem 1rem;
  }
  .sticky-mobile-cta-bar {
    display: block;
  }
}

@media (max-width: 600px) {
  .review-meta {
    flex-wrap: wrap;
    gap: 0.6rem;
  }
  .review-stars-badge {
    margin-left: 0;
  }
}
</style>
