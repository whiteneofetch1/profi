<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';
import { useRoute, useRuntimeConfig } from '#app';
import { useAuthStore } from '~/stores/auth';

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

// Developer Profile form states
const firstName = ref('');
const lastName = ref('');
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
});

function populateForm() {
  if (auth.user && auth.user.role === 'DEVELOPER' && auth.user.devProfile) {
    const p = auth.user.devProfile;
    firstName.value = p.firstName || '';
    lastName.value = p.lastName || '';
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

            <p v-if="authError" class="auth-error">⚠️ {{ authError }}</p>

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

      <!-- 3. DEVELOPER CABINET (PROFILE EDITOR) -->
      <template v-else-if="auth.isDeveloper">
        <div class="profile-editor-box">
          <div class="editor-header">
            <div>
              <h2>Анкета IT-специалиста</h2>
              <p>Заполните форму, чтобы ваши навыки появились в поиске заказчиков.</p>
            </div>
            <button class="logout-btn" @click="handleLogout">Выйти 🚪</button>
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

          <form @submit.prevent="handleSaveProfile">
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
              <input v-model="skillsInput" type="text" class="form-input" placeholder="Vue, TypeScript, Pinia, Node.js" />
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
      </template>

    </div>
  </div>
</template>

<style scoped>
.cabinet-page {
  padding: 5rem 2rem;
}

.cabinet-container {
  max-width: 800px;
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
  color: #ef4444;
  font-size: 0.9rem;
  margin-top: 1rem;
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
</style>
