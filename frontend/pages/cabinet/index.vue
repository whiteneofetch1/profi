<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';
import { useRoute, useRuntimeConfig } from '#app';
import { useAuthStore } from '~/stores/auth';
import UiImageUploader from '~/components/ui/ImageUploader.vue';

const auth = useAuthStore();
const route = useRoute();
const showToast = inject('showToast') as (msg: string, type?: 'success' | 'info') => void;

// Form states
const isLoginMode = ref(true);
const authEmail = ref('');
const authPassword = ref('');
const authRole = ref<'DEVELOPER' | 'CLIENT'>('DEVELOPER');
const authError = ref('');
const registrationMessage = ref('');
const isAuthSubmitting = ref(false);

// Tabs & Dashboard stats
const activeTab = ref<'profile' | 'portfolio' | 'briefs' | 'reviews' | 'security'>('profile');
const briefs = ref<any[]>([]);
const reviews = ref<any[]>([]);
const stats = ref<{ unlocksCount: number; briefsCount: number; reviewsCount: number; averageRating: number }>({
  unlocksCount: 0,
  briefsCount: 0,
  reviewsCount: 0,
  averageRating: 0,
});

const ratingBreakdown = computed(() => {
  const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  if (!reviews.value || reviews.value.length === 0) {
    return { counts, total: 0, percents: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
  }
  reviews.value.forEach((r: any) => {
    const star = Math.min(5, Math.max(1, Math.round(r.rating || 5)));
    counts[star] = (counts[star] || 0) + 1;
  });
  const total = reviews.value.length;
  const percents = {
    5: Math.round(((counts[5] || 0) / total) * 100),
    4: Math.round(((counts[4] || 0) / total) * 100),
    3: Math.round(((counts[3] || 0) / total) * 100),
    2: Math.round(((counts[2] || 0) / total) * 100),
    1: Math.round(((counts[1] || 0) / total) * 100),
  };
  return { counts, total, percents };
});

// Security tab state
const currentPassword = ref('');
const newPassword = ref('');
const passwordError = ref('');
const isPasswordSaving = ref(false);

// Developer Profile form states
const firstName = ref('');
const lastName = ref('');
const avatarUrl = ref('');
const title = ref('');
const specialization = ref<'DEVELOPER' | 'DESIGNER' | 'FULLSTACK' | 'OTHER'>('DEVELOPER');
const bio = ref('');
const experienceYears = ref(3);
const skillsInput = ref('');
const portfolioInput = ref('');
const hourlyRate = ref<number | null>(null);
const monthlySalary = ref<number | null>(null);
const availability = ref<'FREE' | 'BUSY' | 'OPEN_FOR_OFFERS'>('FREE');
const contactEmail = ref('');
const contactTelegram = ref('');
const contactPhone = ref('');

const isProfileSaving = ref(false);

// On mount: check for verifyToken or load user details
onMounted(async () => {
  const config = useRuntimeConfig();

  // Check if verifying email token from URL (e.g. /cabinet?verifyToken=xyz)
  const verifyToken = route.query.verifyToken as string;
  if (verifyToken) {
    try {
      const data = await $fetch<any>(`${config.public.apiUrl}/auth/verify-email`, {
        method: 'POST',
        body: { token: verifyToken },
      });

      if (data && data.user) {
        auth.setUser(data.user);
        if (showToast) showToast('Email успешно подтвержден! Вы авторизованы.', 'success');
        populateForm();
      }
    } catch (err: any) {
      authError.value = err.data?.error || 'Недействительный или истекший токен верификации.';
    }
  }

  await auth.fetchUser();
  populateForm();
  await loadDeveloperDashboardData();
});

async function loadDeveloperDashboardData() {
  if (!auth.isDeveloper) return;
  const config = useRuntimeConfig();
  try {
    const [statsRes, briefsRes, reviewsRes] = await Promise.all([
      $fetch<any>(`${config.public.apiUrl}/profiles/my-stats`),
      $fetch<any>(`${config.public.apiUrl}/profiles/my-briefs`),
      $fetch<any>(`${config.public.apiUrl}/profiles/my-reviews`),
    ]);
    if (statsRes) stats.value = statsRes;
    if (briefsRes?.briefs) briefs.value = briefsRes.briefs;
    if (reviewsRes?.reviews) reviews.value = reviewsRes.reviews;
    await loadCasesData();
  } catch (e) {
    // Ignore error
  }
}

// Portfolio Cases State
const myCases = ref<any[]>([]);
const isCasesLoading = ref(false);

const isCaseModalOpen = ref(false);
const editingCaseId = ref<string | null>(null);
const caseForm = ref({
  title: '',
  description: '',
  coverUrl: '',
  techStack: '',
  link: '',
  order: 0
});

async function loadCasesData() {
  const config = useRuntimeConfig();
  try {
    isCasesLoading.value = true;
    myCases.value = await $fetch<any[]>(`${config.public.apiUrl}/profiles/my-cases`);
  } catch (err) {
    if (showToast) showToast('Не удалось загрузить портфолио', 'info');
  } finally {
    isCasesLoading.value = false;
  }
}

function openCaseModal(c?: any) {
  if (c) {
    editingCaseId.value = c.id;
    caseForm.value = {
      title: c.title,
      description: c.description,
      coverUrl: c.coverUrl || '',
      techStack: c.techStack && Array.isArray(c.techStack) ? c.techStack.join(', ') : '',
      link: c.link || '',
      order: c.order || 0
    };
  } else {
    editingCaseId.value = null;
    caseForm.value = { title: '', description: '', coverUrl: '', techStack: '', link: '', order: 0 };
  }
  isCaseModalOpen.value = true;
}

function closeCaseModal() {
  isCaseModalOpen.value = false;
  editingCaseId.value = null;
}

async function saveCase() {
  const config = useRuntimeConfig();
  const payload = {
    ...caseForm.value,
    techStack: caseForm.value.techStack.split(',').map((s: string) => s.trim()).filter(Boolean)
  };
  
  try {
    if (editingCaseId.value) {
      await $fetch(`${config.public.apiUrl}/profiles/my-cases/${editingCaseId.value}`, {
        method: 'PUT', body: payload
      });
      if (showToast) showToast('Кейс обновлен', 'success');
    } else {
      await $fetch(`${config.public.apiUrl}/profiles/my-cases`, {
        method: 'POST', body: payload
      });
      if (showToast) showToast('Кейс добавлен', 'success');
    }
    closeCaseModal();
    await loadCasesData();
  } catch (err) {
    if (showToast) showToast('Ошибка при сохранении кейса', 'info');
  }
}

async function deleteCase(id: string) {
  if (!confirm('Удалить этот кейс?')) return;
  const config = useRuntimeConfig();
  try {
    await $fetch(`${config.public.apiUrl}/profiles/my-cases/${id}`, { method: 'DELETE' });
    if (showToast) showToast('Кейс удален', 'success');
    await loadCasesData();
  } catch (err) {
    if (showToast) showToast('Ошибка при удалении', 'info');
  }
}

async function handleChangePassword() {
  passwordError.value = '';
  if (!currentPassword.value || !newPassword.value) {
    passwordError.value = 'Заполните оба поля пароля';
    return;
  }
  if (newPassword.value.length < 6) {
    passwordError.value = 'Новый пароль должен содержать минимум 6 символов';
    return;
  }
  isPasswordSaving.value = true;
  const config = useRuntimeConfig();
  try {
    await $fetch(`${config.public.apiUrl}/auth/change-password`, {
      method: 'POST',
      body: {
        currentPassword: currentPassword.value,
        newPassword: newPassword.value,
      },
    });
    if (showToast) showToast('Пароль успешно изменён!', 'success');
    currentPassword.value = '';
    newPassword.value = '';
  } catch (err: any) {
    passwordError.value = err.data?.error || 'Ошибка при изменении пароля';
  } finally {
    isPasswordSaving.value = false;
  }
}

function populateForm() {
  if (auth.user && auth.user.role === 'DEVELOPER' && auth.user.devProfile) {
    const p = auth.user.devProfile;
    firstName.value = p.firstName || '';
    lastName.value = p.lastName || '';
    avatarUrl.value = p.avatarUrl || '';
    title.value = p.title || '';
    specialization.value = p.specialization || 'DEVELOPER';
    bio.value = p.bio || '';
    experienceYears.value = p.experienceYears || 0;
    skillsInput.value = p.skills ? p.skills.join(', ') : '';
    portfolioInput.value = p.portfolioLinks ? p.portfolioLinks.join(', ') : '';
    hourlyRate.value = p.hourlyRate || null;
    monthlySalary.value = p.monthlySalary || null;
    availability.value = p.availability || 'FREE';
    contactEmail.value = p.contactEmail || '';
    contactTelegram.value = p.contactTelegram || '';
    contactPhone.value = p.contactPhone || '';
  } else if (auth.user) {
    // Default contact email for new developers
    contactEmail.value = auth.user.email;
  }
}

// Authentication trigger
async function handleAuth() {
  authError.value = '';
  registrationMessage.value = '';
  isAuthSubmitting.value = true;
  const config = useRuntimeConfig();

  const endpoint = isLoginMode.value ? '/auth/login' : '/auth/register';
  const body: any = {
    email: authEmail.value,
    password: authPassword.value,
  };
  
  if (!isLoginMode.value) {
    body.role = authRole.value;
  }

  try {
    const data = await $fetch<any>(`${config.public.apiUrl}${endpoint}`, {
      method: 'POST',
      body,
    });

    if (data && data.user) {
      auth.setUser(data.user);
      if (showToast) {
        showToast(isLoginMode.value ? 'Успешный вход в кабинет!' : 'Регистрация прошла успешно! Добро пожаловать.', 'success');
      }
      populateForm();
    }
  } catch (err: any) {
    authError.value = err.data?.error || 'Произошла ошибка при авторизации';
  } finally {
    isAuthSubmitting.value = false;
  }
}

// Logout trigger
async function handleLogout() {
  const config = useRuntimeConfig();
  try {
    await $fetch(`${config.public.apiUrl}/auth/logout`, { method: 'POST' });
  } catch (e) {
    // Ignore error
  }
  auth.clearUser();
  registrationMessage.value = '';
  if (showToast) showToast('Вы вышли из личного кабинета', 'info');
}

// Profile Saving trigger
async function handleSaveProfile() {
  isProfileSaving.value = true;
  const config = useRuntimeConfig();

  // Parse skill and portfolio strings to arrays
  const skills = skillsInput.value.split(',').map(s => s.trim()).filter(s => s.length > 0);
  const portfolioLinks = portfolioInput.value.split(',').map(l => l.trim()).filter(l => l.length > 0);

  const payload = {
    firstName: firstName.value,
    lastName: lastName.value,
    avatarUrl: avatarUrl.value ? avatarUrl.value.trim() : undefined,
    title: title.value,
    specialization: specialization.value,
    bio: bio.value,
    experienceYears: Number(experienceYears.value),
    skills,
    portfolioLinks,
    hourlyRate: hourlyRate.value ? Number(hourlyRate.value) : undefined,
    monthlySalary: monthlySalary.value ? Number(monthlySalary.value) : undefined,
    availability: availability.value,
    contactEmail: contactEmail.value,
    contactTelegram: contactTelegram.value,
    contactPhone: contactPhone.value || undefined,
  };

  try {
    const response = await $fetch<any>(`${config.public.apiUrl}/profiles`, {
      method: 'POST',
      body: payload,
    });

    if (response && response.success) {
      if (showToast) showToast('Анкета успешно отправлена на модерацию!', 'success');
      // Refresh user details to update state
      await auth.fetchUser();
      populateForm();
    }
  } catch (err: any) {
    if (showToast) showToast(err.data?.error || 'Не удалось сохранить профиль', 'info');
  } finally {
    isProfileSaving.value = false;
  }
}
</script>

<template>
  <div class="cabinet-page">
    <div class="cabinet-container">
      
      <!-- 1. GUEST FORM (NOT LOGGED IN) -->
      <template v-if="!auth.isAuthenticated">
        <!-- Registration Confirmation Message Banner -->
        <div v-if="registrationMessage" class="registration-success-box">
          <div class="success-icon">✉️</div>
          <h3>Подтверждение Email отправлено!</h3>
          <p>{{ registrationMessage }}</p>
          <button class="auth-submit-btn" style="margin-top: 1.5rem;" @click="registrationMessage = ''; isLoginMode = true;">
            Вернуться к форме входа
          </button>
        </div>

        <div v-else class="auth-box">
          <div class="auth-tabs">
            <button :class="['auth-tab', { active: isLoginMode }]" @click="isLoginMode = true">Вход</button>
            <button :class="['auth-tab', { active: !isLoginMode }]" @click="isLoginMode = false">Регистрация</button>
          </div>

          <h2 class="auth-title">{{ isLoginMode ? 'Личный кабинет' : 'Создать аккаунт' }}</h2>
          <p class="auth-subtitle">
            {{ isLoginMode ? 'Войдите, чтобы редактировать свой профиль' : 'Зарегистрируйтесь как специалист или заказчик' }}
          </p>

          <form @submit.prevent="handleAuth">
            <div class="form-group">
              <label for="email">Электронная почта</label>
              <input id="email" v-model="authEmail" type="email" class="form-input" required placeholder="name@example.com" />
            </div>

            <div class="form-group">
              <label for="password">Пароль</label>
              <input id="password" v-model="authPassword" type="password" class="form-input" required placeholder="••••••••" minlength="6" />
            </div>

            <!-- Role Selector (Only on registration) -->
            <div v-if="!isLoginMode" class="form-group">
              <label>Кто вы?</label>
              <div class="role-selector">
                <label class="role-option">
                  <input v-model="authRole" type="radio" value="DEVELOPER" />
                  <span>Я разработчик / дизайнер</span>
                </label>
                <label class="role-option">
                  <input v-model="authRole" type="radio" value="CLIENT" />
                  <span>Я заказчик / рекрутер</span>
                </label>
              </div>
            </div>

            <div v-if="authError" class="auth-error">
              <span class="auth-error-icon">⚠️</span>
              <span>{{ authError }}</span>
            </div>

            <button :disabled="isAuthSubmitting" type="submit" class="auth-submit-btn">
              {{ isAuthSubmitting ? 'Авторизация...' : (isLoginMode ? 'Войти' : 'Создать аккаунт') }}
            </button>
          </form>
        </div>
      </template>

      <!-- 2. CLIENT CABINET -->
      <template v-else-if="auth.isClient">
        <div class="client-dashboard">
          <div class="dashboard-header-bar">
            <h2>Добро пожаловать, {{ auth.user?.email }}!</h2>
            <button class="logout-btn" @click="handleLogout">Выйти из кабинета 🚪</button>
          </div>
          <p class="dashboard-hint">Вы зарегистрированы на платформе как <strong>Заказчик</strong>.</p>
          <div class="dashboard-actions">
            <p>Теперь вы можете переходить в каталог, добавлять профили специалистов в корзину и выкупать их прямые контакты.</p>
            <NuxtLink to="/" class="btn-cyber">Перейти в каталог</NuxtLink>
          </div>
        </div>
      </template>

      <!-- 3. DEVELOPER CABINET (PROFILE EDITOR & DASHBOARD) -->
      <template v-else-if="auth.isDeveloper">
        <div class="profile-editor-box">
          <div class="editor-header">
            <div>
              <h2>Кабинет IT-специалиста</h2>
              <p>Управляйте анкетой, просмотрите входящие брифы и отзывы заказчиков.</p>
            </div>
            <button class="logout-btn" @click="handleLogout">Выйти 🚪</button>
          </div>

          <!-- KPI Stats Bar -->
          <div class="kpi-stats-grid">
            <div class="kpi-card">
              <span class="kpi-icon">🔓</span>
              <div class="kpi-info">
                <span class="kpi-value">{{ stats.unlocksCount }}</span>
                <span class="kpi-label">Выкупов контактов</span>
              </div>
            </div>
            <div class="kpi-card">
              <span class="kpi-icon">📋</span>
              <div class="kpi-info">
                <span class="kpi-value">{{ stats.briefsCount }}</span>
                <span class="kpi-label">Получено брифов</span>
              </div>
            </div>
            <div class="kpi-card">
              <span class="kpi-icon">⭐️</span>
              <div class="kpi-info">
                <span class="kpi-value">{{ stats.reviewsCount > 0 ? `${stats.averageRating} / 5.0` : '—' }}</span>
                <span class="kpi-label">Средний рейтинг</span>
              </div>
            </div>
            <div class="kpi-card">
              <span class="kpi-icon">💬</span>
              <div class="kpi-info">
                <span class="kpi-value">{{ stats.reviewsCount }}</span>
                <span class="kpi-label">Всего отзывов</span>
              </div>
            </div>
          </div>

          <!-- Tab Bar Navigation -->
          <div class="dashboard-tabs">
            <button :class="['tab-btn', { active: activeTab === 'profile' }]" @click="activeTab = 'profile'">
              👤 Моя Анкета
            </button>
            <button :class="['tab-btn', { active: activeTab === 'portfolio' }]" @click="activeTab = 'portfolio'">
              💼 Портфолио
            </button>
            <button :class="['tab-btn', { active: activeTab === 'briefs' }]" @click="activeTab = 'briefs'">
              📋 Входящие Брифы <span v-if="briefs.length" class="tab-badge">{{ briefs.length }}</span>
            </button>
            <button :class="['tab-btn', { active: activeTab === 'reviews' }]" @click="activeTab = 'reviews'">
              ⭐️ Мои Отзывы <span v-if="reviews.length" class="tab-badge">{{ reviews.length }}</span>
            </button>
            <button :class="['tab-btn', { active: activeTab === 'security' }]" @click="activeTab = 'security'">
              🔒 Безопасность
            </button>
            
            <div style="flex: 1"></div>
            <NuxtLink v-if="auth.user?.devProfile" :to="`/profiles/${auth.user.devProfile.slug || auth.user.devProfile.id}`" target="_blank" class="tab-btn view-preview-btn" style="background: rgba(99, 102, 241, 0.1); color: #818cf8; border-color: rgba(99, 102, 241, 0.2);">
              👁 Предпросмотр профиля
            </NuxtLink>
          </div>

          <!-- Email Verification Banner -->
          <div v-if="auth.user && !auth.user.isEmailVerified" class="status-banner warning">
            <span class="status-icon">✉️</span>
            <div>
              <strong>Электронная почта не подтверждена</strong>
              <p>Мы отправили письмо со ссылкой на <strong>{{ auth.user.email }}</strong>. Пожалуйста, подтвердите почту для активации всех возможностей.</p>
            </div>
          </div>

          <!-- Approval Banner -->
          <div v-if="auth.user?.devProfile && !auth.user.devProfile.isApproved" class="status-banner warning">
            <span class="status-icon">⏳</span>
            <div>
              <strong>Профиль находится на модерации</strong>
              <p>Вы внесли изменения или создали новый профиль. Администрация проверяет данные. После одобрения ваш профиль появится в общем каталоге.</p>
            </div>
          </div>
          <div v-else-if="auth.user?.devProfile && auth.user.devProfile.isApproved" class="status-banner success">
            <span class="status-icon">🚀</span>
            <div>
              <strong>Ваш профиль опубликован в каталоге!</strong>
              <p>Заказчики могут находить вас по навыкам и покупать ваши контакты.</p>
              <NuxtLink :to="`/profiles/${auth.user.devProfile.slug || auth.user.devProfile.id}`" class="view-public-link">
                🔗 Открыть карточку в каталоге
              </NuxtLink>
            </div>
          </div>

          <!-- TAB 1: PROFILE EDITOR -->
          <div v-if="activeTab === 'profile'">

          <form @submit.prevent="handleSaveProfile">
            <!-- AVATAR & BASIC DETAILS -->
            <div class="avatar-form-section" style="display: block; margin-bottom: 2rem;">
              <UiImageUploader v-model="avatarUrl" label="Ваше фото / Аватар" placeholder="Загрузить фото профиля" variant="avatar" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Имя</label>
                <input v-model="firstName" type="text" class="form-input" required placeholder="Иван" />
              </div>
              <div class="form-group">
                <label>Фамилия</label>
                <input v-model="lastName" type="text" class="form-input" required placeholder="Иванов" />
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Профессиональный титул (Title)</label>
                <input v-model="title" type="text" class="form-input" required placeholder="Senior Frontend Developer" />
              </div>
              <div class="form-group">
                <label>Направление</label>
                <select v-model="specialization" class="form-input select-input">
                  <option value="DEVELOPER">Разработка (Developer)</option>
                  <option value="DESIGNER">Дизайн (Designer)</option>
                  <option value="FULLSTACK">Фулстек (Fullstack)</option>
                  <option value="OTHER">Другое (Other)</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Опыт работы (лет)</label>
                <input v-model="experienceYears" type="number" class="form-input" required min="0" max="50" />
              </div>
              <div class="form-group">
                <label>Статус занятости</label>
                <select v-model="availability" class="form-input select-input">
                  <option value="FREE">Свободен для проектов</option>
                  <option value="OPEN_FOR_OFFERS">Рассматриваю предложения</option>
                  <option value="BUSY">Занят</option>
                </select>
              </div>
            </div>

            <!-- RATES & SALARIES -->
            <div class="form-row">
              <div class="form-group">
                <label>Желаемая ставка (₽ / час)</label>
                <input v-model="hourlyRate" type="number" class="form-input" placeholder="например: 2000" />
              </div>
              <div class="form-group">
                <label>Ожидаемая зарплата в месяц (₽ / мес)</label>
                <input v-model="monthlySalary" type="number" class="form-input" placeholder="например: 150000" />
              </div>
            </div>

            <div class="form-group">
              <label>Короткое резюме / О себе (Bio)</label>
              <textarea v-model="bio" rows="4" class="form-input textarea-input" required placeholder="Расскажите о своих сильных сторонах, проектах и интересах..."></textarea>
            </div>

            <div class="form-group">
              <label>Ключевые навыки (Skills) — через запятую</label>
              <input v-model="skillsInput" type="text" class="form-input" placeholder="например: Zero Block, Step-by-step анимация, Figma, Мобильная адаптация, Tilda CRM" />
              <p class="text-xs text-gray-400 mt-1">Примеры: Zero Block, Step-by-Step анимация, Figma to Tilda, Мобильная адаптация, Tilda E-Commerce, Custom CSS/JS, Подключение эквайринга</p>
            </div>

            <div class="form-group">
              <label>Портфолио / Ссылки на работы — через запятую</label>
              <input v-model="portfolioInput" type="text" class="form-input" placeholder="github.com/myusername, behance.net/myprofile" />
            </div>

            <!-- PRIVATE DETAILED CONTACTS (GATED AREA) -->
            <div class="gated-inputs-section">
              <h3 class="gated-title">🔒 Закрытые контактные данные</h3>
              <p class="gated-hint">Заказчик увидит эту информацию только после оплаты контакта.</p>

              <div class="form-row">
                <div class="form-group">
                  <label>Контактный Email</label>
                  <input v-model="contactEmail" type="email" class="form-input" required placeholder="contact@example.com" />
                </div>
                <div class="form-group">
                  <label>Контактный Telegram (Username)</label>
                  <input v-model="contactTelegram" type="text" class="form-input" required placeholder="@my_telegram" />
                </div>
              </div>

              <div class="form-group">
                <label>Телефон (Необязательно)</label>
                <input v-model="contactPhone" type="text" class="form-input" placeholder="+7 (999) 000-00-00" />
              </div>
            </div>

            <button :disabled="isProfileSaving" type="submit" class="save-profile-btn">
              {{ isProfileSaving ? 'Сохранение данных...' : 'Сохранить анкету' }}
            </button>
          </form>
          </div>

          <!-- TAB PORTFOLIO -->
          <div v-if="activeTab === 'portfolio'" class="portfolio-tab">
            <div class="section-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
              <h2>Мои Кейсы</h2>
              <button class="btn btn-primary" @click="openCaseModal()">+ Добавить кейс</button>
            </div>
            
            <div v-if="isCasesLoading" class="loading-state">Загрузка...</div>
            <div v-else-if="myCases.length === 0" class="empty-state">У вас пока нет добавленных кейсов.</div>
            <div v-else class="cases-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 1.5rem;">
              <div v-for="c in myCases" :key="c.id" class="case-card" style="background: var(--surface-light, #1a1b23); border: 1px solid var(--border-color, #2d2e3d); border-radius: 8px; overflow: hidden;">
                <img v-if="c.coverUrl" :src="c.coverUrl" alt="Cover" style="width: 100%; height: 200px; object-fit: cover;" />
                <div v-else style="width: 100%; height: 200px; background: #2a2a35; display: flex; align-items: center; justify-content: center; color: #666;">Нет обложки</div>
                <div style="padding: 1.5rem;">
                  <h3 style="margin-top: 0; margin-bottom: 0.5rem; font-size: 1.25rem;">{{ c.title }}</h3>
                  <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
                    <span v-for="tech in c.techStack" :key="tech" style="background: rgba(99, 102, 241, 0.1); color: #818cf8; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">{{ tech }}</span>
                  </div>
                  <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                    <button class="btn btn-secondary btn-sm" @click="openCaseModal(c)" style="flex: 1;">✏️ Редактировать</button>
                    <button class="btn btn-danger btn-sm" @click="deleteCase(c.id)">🗑</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 2: INCOMING BRIEFS -->
          <div v-else-if="activeTab === 'briefs'" class="tab-content-box">
            <h3 class="section-subtitle">📋 Входящие Брифы на проекты</h3>
            <p class="section-desc">Здесь отображаются заявки и ТЗ, отправленные вам заказчиками через платформу.</p>

            <div v-if="briefs.length === 0" class="empty-tab-state">
              <span class="empty-icon">📮</span>
              <p>У вас пока нет входящих проектов.</p>
              <span class="empty-sub">Убедитесь, что ваша анкета заполнена и опубликована в каталоге.</span>
            </div>

            <div v-else class="briefs-list">
              <div v-for="b in briefs" :key="b.id" class="brief-card">
                <div class="brief-header">
                  <div>
                    <h4 class="brief-client">{{ b.clientName }}</h4>
                    <a :href="`mailto:${b.clientEmail}`" class="brief-email">📧 {{ b.clientEmail }}</a>
                  </div>
                  <span class="brief-date">{{ new Date(b.createdAt).toLocaleDateString('ru-RU') }}</span>
                </div>
                <div class="brief-tags-row">
                  <span class="brief-tag">🏷 {{ b.projectType }}</span>
                  <span class="brief-tag budget">💰 {{ b.budget }}</span>
                  <span class="brief-tag deadline">⏳ {{ b.deadline }}</span>
                </div>
                <p class="brief-description">{{ b.description }}</p>
              </div>
            </div>
          </div>

          <!-- TAB 3: REVIEWS -->
          <div v-else-if="activeTab === 'reviews'" class="tab-content-box">
            <h3 class="section-subtitle">⭐️ Отзывы заказчиков</h3>
            <p class="section-desc">Оценки и отзывы от клиентов, выкупивших ваши прямые контакты.</p>

            <div v-if="reviews.length === 0" class="empty-tab-state">
              <span class="empty-icon">💬</span>
              <p>Пока нет отзывов от заказчиков.</p>
              <span class="empty-sub">Первые отзывы появятся после совместной работы с клиентами платформы.</span>
            </div>

            <div v-else class="reviews-tab-container">
              <!-- Rating Analytics summary card -->
              <div class="rating-summary-card">
                <div class="score-box">
                  <span class="score-num">{{ stats.averageRating || '5.0' }}</span>
                  <div class="score-stars">
                    <span v-for="s in 5" :key="s" class="star" :class="{ filled: s <= Math.round(stats.averageRating || 5) }">★</span>
                  </div>
                  <span class="score-total">На основе {{ stats.reviewsCount }} {{ stats.reviewsCount === 1 ? 'отзыва' : 'отзывов' }}</span>
                </div>

                <div class="bars-box">
                  <div v-for="starNum in [5, 4, 3, 2, 1]" :key="starNum" class="bar-row">
                    <span class="bar-star-label">{{ starNum }} ★</span>
                    <div class="bar-track">
                      <div class="bar-fill" :style="{ width: ratingBreakdown.percents[starNum as keyof typeof ratingBreakdown.percents] + '%' }"></div>
                    </div>
                    <span class="bar-percent">{{ ratingBreakdown.percents[starNum as keyof typeof ratingBreakdown.percents] }}%</span>
                  </div>
                </div>
              </div>

              <div class="reviews-list">
                <div v-for="r in reviews" :key="r.id" class="review-card">
                  <div class="review-header">
                    <div class="reviewer-meta">
                      <div class="reviewer-avatar-initial">{{ (r.authorName || r.clientName || 'З')[0].toUpperCase() }}</div>
                      <div>
                        <span class="reviewer-name">{{ r.authorName || r.clientName || 'Заказчик' }}</span>
                        <div class="review-stars">
                          <span v-for="star in 5" :key="star" :class="['star', { filled: star <= r.rating }]">★</span>
                        </div>
                      </div>
                    </div>
                    <span class="review-date">{{ new Date(r.createdAt).toLocaleDateString('ru-RU') }}</span>
                  </div>
                  <p v-if="r.comment" class="review-comment">"{{ r.comment }}"</p>
                </div>
              </div>
            </div>
          </div>

          <!-- TAB 4: SECURITY -->
          <div v-else-if="activeTab === 'security'" class="tab-content-box">
            <h3 class="section-subtitle">🔒 Смена Пароля</h3>
            <p class="section-desc">Обновите ваш пароль от личного кабинета для безопасности.</p>

            <form @submit.prevent="handleChangePassword" class="security-form">
              <div class="form-group">
                <label>Текущий пароль</label>
                <input v-model="currentPassword" type="password" class="form-input" required placeholder="••••••••" />
              </div>
              <div class="form-group">
                <label>Новый пароль (минимум 6 символов)</label>
                <input v-model="newPassword" type="password" class="form-input" required placeholder="••••••••" />
              </div>

              <div v-if="passwordError" class="auth-error">
                <span class="auth-error-icon">⚠️</span>
                <span>{{ passwordError }}</span>
              </div>

              <button :disabled="isPasswordSaving" type="submit" class="save-profile-btn" style="margin-top: 1.5rem;">
                {{ isPasswordSaving ? 'Обновление пароля...' : 'Обновить пароль' }}
              </button>
            </form>
          </div>
        </div>
      </template>

    </div>
    <!-- CASE MODAL -->
    <div v-if="isCaseModalOpen" class="modal-overlay" @click.self="closeCaseModal">
      <div class="modal-content" style="max-width: 600px; width: 100%;">
        <button class="modal-close" @click="closeCaseModal">×</button>
        <h2>{{ editingCaseId ? 'Редактировать работу' : '🖼️ Добавить работу в портфолио' }}</h2>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: -0.5rem;">Загружайте скриншоты и описание ваших проектов. Заказчики увидят их прямо в вашем профиле.</p>
        <form @submit.prevent="saveCase" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 1.5rem;">
          <div class="form-group">
            <label>Название проекта *</label>
            <input v-model="caseForm.title" type="text" class="form-input" required placeholder="например: Porsche Russia Concept" />
          </div>
          <div class="form-group">
            <label>Описание задачи и результата *</label>
            <textarea v-model="caseForm.description" class="form-input" rows="4" required placeholder="например: Интерактивный промо-лендинг нового электрокара с адаптивным Zero Block и пошаговой 3D-анимацией."></textarea>
          </div>
          <div class="form-group">
            <UiImageUploader v-model="caseForm.coverUrl" label="Скриншот / Обложка макета (Изображение)" placeholder="Загрузить изображение работы" />
          </div>
          <div class="form-group">
            <label>Теги / Технологии (через запятую)</label>
            <input v-model="caseForm.techStack" type="text" class="form-input" placeholder="например: Zero Block, Step-by-Step Animation, Custom CSS" />
          </div>
          <div class="form-group">
            <label>Порядок отображения (необязательно)</label>
            <input v-model="caseForm.order" type="number" class="form-input" placeholder="0" />
          </div>
          <div class="form-actions" style="margin-top: 1rem; display: flex; justify-content: flex-end; gap: 1rem;">
            <button type="button" class="btn btn-secondary" @click="closeCaseModal">Отмена</button>
            <button type="submit" class="btn btn-primary">Сохранить работу</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cabinet-page {
  padding: 3rem 1.5rem;
}

.cabinet-container {
  max-width: 1240px;
  margin: 0 auto;
}

/* --- AUTH BOX --- */
.auth-box {
  background: var(--bg-card);
  border: 1px solid var(--border-glow);
  padding: 3rem;
  border-radius: 24px;
  backdrop-filter: blur(12px);
  text-align: center;
}

.auth-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-glow);
  padding: 0.3rem;
  border-radius: 12px;
  width: fit-content;
  margin: 0 auto 2rem;
}

.auth-tab {
  background: transparent;
  border: none;
  color: var(--text-muted);
  padding: 0.5rem 1.5rem;
  border-radius: 9px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s ease;
}

.auth-tab.active {
  background: rgba(255,255,255,0.06);
  color: #fff;
}

.auth-title {
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
}

.auth-subtitle {
  color: var(--text-muted);
  font-size: 0.95rem;
  margin-bottom: 2rem;
}

.role-selector {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.role-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255, 255, 255, 0.01);
  border: 1px solid var(--border-glow);
  padding: 0.8rem;
  border-radius: 10px;
  cursor: pointer;
}

.role-option input {
  accent-color: var(--accent-cyan);
}

.auth-error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.35);
  color: #fca5a5;
  font-size: 0.88rem;
  padding: 0.9rem 1.2rem;
  border-radius: 12px;
  margin-top: 1.2rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-align: left;
  line-height: 1.4;
  box-shadow: 0 4px 15px rgba(239, 68, 68, 0.1);
}

.auth-error-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.auth-submit-btn {
  width: 100%;
  background: var(--gradient-cyber);
  color: #fff;
  border: none;
  padding: 1rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 2rem;
}

/* --- CLIENT PANEL --- */
.client-dashboard {
  background: var(--bg-card);
  border: 1px solid var(--border-glow);
  padding: 3rem;
  border-radius: 24px;
  text-align: center;
}

.dashboard-hint {
  color: var(--accent-cyan);
  margin-top: 0.5rem;
}

.dashboard-actions {
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid var(--border-glow);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  color: var(--text-muted);
}

/* --- DEVELOPER PROFILE EDITOR --- */
.profile-editor-box {
  background: var(--bg-card);
  border: 1px solid var(--border-glow);
  padding: 3rem;
  border-radius: 24px;
  backdrop-filter: blur(12px);
}

.editor-header {
  margin-bottom: 2.5rem;
  text-align: left;
}

.editor-header h2 {
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
}

.editor-header p {
  color: var(--text-muted);
  font-size: 0.95rem;
  margin: 0;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.select-input {
  height: 48px;
  cursor: pointer;
}

.textarea-input {
  resize: vertical;
  font-family: inherit;
}

.gated-inputs-section {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-glow);
  padding: 1.5rem;
  border-radius: 16px;
  margin: 2.5rem 0;
}

.gated-title {
  font-size: 1.1rem;
  color: #fff;
  margin-bottom: 0.25rem;
}

.gated-hint {
  font-size: 0.82rem;
  color: var(--text-muted);
  margin-bottom: 1.5rem;
}

.status-banner {
  display: flex;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-radius: 12px;
  margin-bottom: 2rem;
  font-size: 0.9rem;
  text-align: left;
}

.status-banner.warning {
  background: rgba(234, 179, 8, 0.05);
  border: 1px solid rgba(234, 179, 8, 0.2);
  color: #fef08a;
}

.status-banner.success {
  background: rgba(34, 197, 94, 0.05);
  border: 1px solid rgba(34, 197, 94, 0.2);
  color: #bbf7d0;
}

.status-icon {
  font-size: 1.5rem;
}

.save-profile-btn {
  width: 100%;
  background: var(--gradient-cyber);
  color: #fff;
  border: none;
  padding: 1rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
}

.save-profile-btn:disabled {
  opacity: 0.6;
}

/* --- REGISTRATION SUCCESS BANNER & DASHBOARD HEADER --- */
.registration-success-box {
  background: var(--bg-card);
  border: 1px solid var(--border-glow);
  padding: 3rem 2rem;
  border-radius: 24px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(139, 92, 246, 0.15);
}

.success-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.dashboard-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2.5rem;
  text-align: left;
}

.logout-btn {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.logout-btn:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #fff;
}

.view-public-link {
  display: inline-block;
  margin-top: 0.5rem;
  color: #38bdf8;
  font-size: 0.85rem;
  text-decoration: underline;
}

/* --- AVATAR FORM SECTION --- */
.avatar-form-section {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  background: rgba(255, 255, 255, 0.02);
  padding: 1.2rem;
  border-radius: 16px;
  border: 1px solid var(--border-glow);
}

.avatar-preview {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  overflow: hidden;
  border: 2px solid var(--accent-purple);
  background: #1e1b4b;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 0 15px rgba(139, 92, 246, 0.3);
}

.avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 1.4rem;
  font-weight: 700;
  color: #c084fc;
}

.form-hint {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-top: 0.3rem;
  display: block;
}

/* --- KPI STATS GRID --- */
.kpi-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.kpi-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-glow);
  padding: 1.2rem;
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.kpi-icon {
  font-size: 1.8rem;
}

.kpi-info {
  display: flex;
  flex-direction: column;
}

.kpi-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #38bdf8;
}

.kpi-label {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* --- DASHBOARD TABS --- */
.dashboard-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--border-glow);
  padding-bottom: 0.75rem;
  overflow-x: auto;
}

.tab-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  padding: 0.6rem 1.2rem;
  border-radius: 10px;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.tab-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.05);
}

.tab-btn.active {
  color: #fff;
  background: var(--gradient-cyber);
  box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
}

.tab-badge {
  background: #ef4444;
  color: #fff;
  font-size: 0.7rem;
  padding: 0.15rem 0.45rem;
  border-radius: 20px;
  font-weight: 700;
}

/* --- TAB CONTENT & BRIEFS / REVIEWS LIST --- */
.tab-content-box {
  padding-top: 1rem;
}

.section-subtitle {
  font-size: 1.3rem;
  margin-bottom: 0.3rem;
  color: #fff;
}

.section-desc {
  font-size: 0.88rem;
  color: var(--text-muted);
  margin-bottom: 1.5rem;
}

.empty-tab-state {
  text-align: center;
  padding: 3rem 1.5rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed var(--border-glow);
  border-radius: 16px;
  margin-top: 1rem;
}

.empty-icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 0.75rem;
}

.empty-tab-state p {
  font-weight: 600;
  font-size: 1rem;
  color: #f1f5f9;
  margin-bottom: 0.3rem;
}

.empty-sub {
  font-size: 0.82rem;
  color: var(--text-muted);
}

/* Briefs & Reviews Cards */
.briefs-list, .reviews-list {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.brief-card, .review-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-glow);
  padding: 1.5rem;
  border-radius: 16px;
}

.brief-header, .review-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.8rem;
}

.brief-client {
  font-size: 1.1rem;
  font-weight: 700;
  color: #38bdf8;
  margin-bottom: 0.2rem;
}

.brief-email {
  font-size: 0.85rem;
  color: var(--text-muted);
  text-decoration: underline;
}

.brief-date, .review-date {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.brief-tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.brief-tag {
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.3);
  color: #c084fc;
  font-size: 0.8rem;
  padding: 0.3rem 0.7rem;
  border-radius: 8px;
}

.brief-tag.budget {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.3);
  color: #6ee7b7;
}

.brief-tag.deadline {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.3);
  color: #fcd34d;
}

.brief-description {
  font-size: 0.92rem;
  color: #cbd5e1;
  line-height: 1.5;
  white-space: pre-line;
}

.reviewer-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.reviewer-avatar-initial {
  width: 40px;
  height: 40px;
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

.rating-summary-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-glow);
  border-radius: 20px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  display: grid;
  grid-template-columns: 200px 1fr;
  gap: 2rem;
  align-items: center;
}

.score-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-right: 1px solid var(--border-glow);
  padding-right: 1.5rem;
}

.score-num {
  font-size: 3rem;
  font-weight: 800;
  color: #f8fafc;
  line-height: 1;
}

.score-stars {
  display: flex;
  gap: 0.2rem;
  margin: 0.5rem 0;
}

.score-total {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.bars-box {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bar-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.85rem;
}

.bar-star-label {
  width: 35px;
  color: #cbd5e1;
  font-weight: 600;
}

.bar-track {
  flex: 1;
  height: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b, #fbbf24);
  border-radius: 4px;
  transition: width 0.4s ease;
}

.bar-percent {
  width: 40px;
  text-align: right;
  color: var(--text-muted);
  font-size: 0.8rem;
}

.security-form {
  max-width: 450px;
}

/* --- RESPONSIVE MOBILE MEDIA QUERIES --- */
@media (max-width: 900px) {
  .rating-summary-card {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  .score-box {
    border-right: none;
    border-bottom: 1px solid var(--border-glow);
    padding-right: 0;
    padding-bottom: 1.5rem;
  }
}

@media (max-width: 768px) {
  .cabinet-page {
    padding: 1.5rem 1rem;
  }

  .profile-editor-box, .auth-box, .client-dashboard {
    padding: 1.5rem 1rem;
    border-radius: 16px;
  }

  .form-row {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .editor-header h2 {
    font-size: 1.4rem;
  }

  .kpi-stats-grid {
    grid-template-columns: 1fr;
  }

  .dashboard-tabs {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 0.5rem;
    -webkit-overflow-scrolling: touch;
  }

  .tab-btn {
    padding: 0.5rem 0.85rem;
    font-size: 0.85rem;
  }

  .brief-header, .review-header {
    flex-direction: column;
    gap: 0.5rem;
  }
}
</style>
