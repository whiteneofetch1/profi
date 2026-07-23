<script setup lang="ts">
import { ref, onMounted, computed, inject } from 'vue';
import { useAuthStore } from '~/stores/auth';

const auth = useAuthStore();
const showToast = inject('showToast') as (msg: string, type?: 'success' | 'info') => void;

const profiles = ref<any[]>([]);
const loading = ref(true);

// Pricing configs
const flatPrice = ref(500);
const bundleCount = ref(5);
const bundlePrice = ref(2000);
const isConfigSaving = ref(false);

// Tabs Switcher
const activeTab = ref<'profiles' | 'blog' | 'errors'>('profiles');

// Admin Login state
const adminEmail = ref('admin@fyxi.ru');
const adminPassword = ref('');
const adminLoginError = ref('');
const isAdminLoggingIn = ref(false);

// Error logs diagnostic state
const errorLogs = ref<any[]>([]);
const isErrorsLoading = ref(false);
const errorSearchQuery = ref('');
const errorLevelFilter = ref('all');
const errorResolvedFilter = ref('unresolved');
const selectedErrorForStack = ref<any | null>(null);

async function handleAdminLogin() {
  adminLoginError.value = '';
  isAdminLoggingIn.value = true;
  const config = useRuntimeConfig();
  try {
    const data = await $fetch<any>(`${config.public.apiUrl}/auth/login`, {
      method: 'POST',
      body: {
        email: adminEmail.value,
        password: adminPassword.value,
      },
    });
    if (data?.user) {
      auth.setUser(data.user);
      if (showToast) showToast('Успешный вход в Суперадминку!', 'success');
      await loadAdminData();
    }
  } catch (err: any) {
    adminLoginError.value = err.data?.error || 'Неверный логин или пароль администратора';
  } finally {
    isAdminLoggingIn.value = false;
  }
}

async function loadErrorLogs() {
  const config = useRuntimeConfig();
  isErrorsLoading.value = true;
  try {
    errorLogs.value = await $fetch<any[]>(`${config.public.apiUrl}/admin/errors`);
  } catch (err) {
    showToast('Не удалось загрузить журнал системных ошибок', 'info');
  } finally {
    isErrorsLoading.value = false;
  }
}

async function toggleResolveError(logId: string, currentStatus: boolean) {
  const config = useRuntimeConfig();
  try {
    const nextStatus = !currentStatus;
    await $fetch(`${config.public.apiUrl}/admin/errors/${logId}/resolve`, {
      method: 'PATCH',
      body: { resolved: nextStatus },
    });
    showToast(nextStatus ? 'Ошибка отмечена как исправленная!' : 'Статус ошибки сброшен', 'success');
    await loadErrorLogs();
  } catch (err) {
    showToast('Не удалось обновить статус ошибки', 'info');
  }
}

async function clearResolvedErrors() {
  if (!confirm('Вы уверены, что хотите отчистить все исправленные ошибки из журнала?')) return;
  const config = useRuntimeConfig();
  try {
    await $fetch(`${config.public.apiUrl}/admin/errors/clear`, {
      method: 'DELETE',
    });
    showToast('Все исправленные ошибки успешно очищены!', 'success');
    await loadErrorLogs();
  } catch (err) {
    showToast('Не удалось очистить журнал ошибок', 'info');
  }
}

const filteredErrorLogs = computed(() => {
  let list = errorLogs.value;

  if (errorLevelFilter.value !== 'all') {
    list = list.filter(l => l.level === errorLevelFilter.value);
  }

  if (errorResolvedFilter.value === 'unresolved') {
    list = list.filter(l => !l.resolved);
  } else if (errorResolvedFilter.value === 'resolved') {
    list = list.filter(l => l.resolved);
  }

  if (errorSearchQuery.value) {
    const q = errorSearchQuery.value.toLowerCase();
    list = list.filter(l => 
      l.message.toLowerCase().includes(q) ||
      (l.source && l.source.toLowerCase().includes(q)) ||
      (l.path && l.path.toLowerCase().includes(q)) ||
      (l.stack && l.stack.toLowerCase().includes(q))
    );
  }

  return list;
});

// Blog management (CMS)
const blogPosts = ref<any[]>([]);
const isBlogLoading = ref(false);
const blogSearchQuery = ref('');
const blogCategoryFilter = ref('');

// Modal state
const isModalOpen = ref(false);
const isEditing = ref(false);
const editingPostId = ref<string | null>(null);
const isSavingPost = ref(false);

const formPost = ref({
  title: '',
  slug: '',
  category: 'Технологии',
  readTime: '8 мин',
  author: 'Алексей Миронов',
  authorRole: 'CEO profiTilda',
  description: '',
  content: '',
  keywordsRaw: '',
  publishDate: '',
});

async function loadAdminData() {
  if (!auth.isAdmin) return;
  const config = useRuntimeConfig();
  loading.value = true;
  try {
    // 1. Fetch moderation list
    profiles.value = await $fetch<any[]>(`${config.public.apiUrl}/admin/profiles`);
    
    // 2. Fetch platform pricing configurations
    const pricing = await $fetch<any>(`${config.public.apiUrl}/admin/config`);
    if (pricing) {
      flatPrice.value = pricing.flatRatePrice;
      bundleCount.value = pricing.bundleCount;
      bundlePrice.value = pricing.bundlePrice;
    }

    // 3. Fetch blog posts
    await loadBlogData();

    // 4. Fetch error logs
    await loadErrorLogs();
  } catch (err) {
    showToast('Не удалось загрузить данные панели администратора', 'info');
  } finally {
    loading.value = false;
  }
}

async function loadBlogData() {
  const config = useRuntimeConfig();
  isBlogLoading.value = true;
  try {
    blogPosts.value = await $fetch<any[]>(`${config.public.apiUrl}/admin/blog`);
  } catch (err) {
    showToast('Не удалось загрузить статьи блога', 'info');
  } finally {
    isBlogLoading.value = false;
  }
}

onMounted(() => {
  loadAdminData();
});

// Approve / Reject specialist
async function toggleApprove(profileId: string, currentStatus: boolean) {
  const config = useRuntimeConfig();
  try {
    const nextStatus = !currentStatus;
    await $fetch(`${config.public.apiUrl}/admin/profiles/${profileId}/approve`, {
      method: 'POST',
      body: { isApproved: nextStatus },
    });
    
    showToast(nextStatus ? 'Специалист одобрен!' : 'Публикация специалиста отменена', 'success');
    loadAdminData();
  } catch (err) {
    showToast('Ошибка при изменении статуса одобрения', 'info');
  }
}

// Toggle verify check badge
async function toggleVerify(profileId: string, currentStatus: boolean) {
  const config = useRuntimeConfig();
  try {
    const nextStatus = !currentStatus;
    await $fetch(`${config.public.apiUrl}/admin/profiles/${profileId}/verify`, {
      method: 'POST',
      body: { isVerified: nextStatus },
    });
    
    showToast(nextStatus ? 'Специалисту присвоен бейдж Verified!' : 'Бейдж верификации удален', 'success');
    loadAdminData();
  } catch (err) {
    showToast('Ошибка при изменении статуса верификации', 'info');
  }
}

// Delete profile permanently
async function deleteProfile(profileId: string, name: string) {
  if (!confirm(`Вы уверены, что хотите БЕЗВОЗВРАТНО УДАЛИТЬ анкета специалиста "${name}"?`)) {
    return;
  }
  const config = useRuntimeConfig();
  try {
    await $fetch(`${config.public.apiUrl}/admin/profiles/${profileId}`, {
      method: 'DELETE',
    });
    showToast(`Профиль "${name}" успешно удалён из базы данных!`, 'success');
    loadAdminData();
  } catch (err) {
    showToast('Ошибка при удалении анкеты специалиста', 'info');
  }
}

// Save platform price settings
async function savePricingConfig() {
  isConfigSaving.value = true;
  const config = useRuntimeConfig();
  try {
    await $fetch(`${config.public.apiUrl}/admin/config`, {
      method: 'POST',
      body: {
        flatRatePrice: Number(flatPrice.value),
        bundleCount: Number(bundleCount.value),
        bundlePrice: Number(bundlePrice.value),
      },
    });
    showToast('Настройки цен успешно сохранены!', 'success');
  } catch (err) {
    showToast('Ошибка при сохранении настроек тарифов', 'info');
  } finally {
    isConfigSaving.value = false;
  }
}

// --- BLOG MANAGEMENT ACTIONS ---

const filteredBlogPosts = computed(() => {
  return blogPosts.value.filter(post => {
    const matchesSearch = 
      (post.title || '').toLowerCase().includes(blogSearchQuery.value.toLowerCase()) || 
      (post.description || '').toLowerCase().includes(blogSearchQuery.value.toLowerCase()) ||
      (post.slug || '').toLowerCase().includes(blogSearchQuery.value.toLowerCase());
    const matchesCategory = !blogCategoryFilter.value || post.category === blogCategoryFilter.value;
    return matchesSearch && matchesCategory;
  });
});

function getPostStatus(post: any) {
  const publishDate = new Date(post.publishDate);
  const now = new Date();
  if (publishDate > now) {
    return { label: 'Запланирована', class: 'scheduled' };
  }
  return { label: 'Опубликована', class: 'published' };
}

function autoGenerateSlug() {
  if (isEditing.value) return; // Don't auto-generate if editing
  const title = formPost.value.title;
  const rus = "абвгдеёжзийклмнопрстуфхцчшщъыьэюя";
  const eng = ["a","b","v","g","d","e","yo","zh","z","i","y","k","l","m","n","o","p","r","s","t","u","f","h","ts","ch","sh","shch","","y","","e","yu","ya"];
  
  let slug = title.toLowerCase();
  let result = "";
  for (let i = 0; i < slug.length; i++) {
    const char = slug[i];
    const index = rus.indexOf(char);
    if (index !== -1) {
      result += eng[index];
    } else if (/[a-z0-9\-]/.test(char)) {
      result += char;
    } else if (char === ' ' || char === '_') {
      result += '-';
    }
  }
  
  formPost.value.slug = result.replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function openCreateModal() {
  isEditing.value = false;
  editingPostId.value = null;
  
  const dateObj = new Date();
  const tzOffset = dateObj.getTimezoneOffset() * 60000;
  const localISOTime = (new Date(dateObj.getTime() - tzOffset)).toISOString().slice(0, 16);

  formPost.value = {
    title: '',
    slug: '',
    category: 'Технологии',
    readTime: '8 мин',
    author: 'Алексей Миронов',
    authorRole: 'CEO profiTilda',
    description: '',
    content: '',
    keywordsRaw: '',
    publishDate: localISOTime,
  };
  isModalOpen.value = true;
}

function openEditModal(post: any) {
  isEditing.value = true;
  editingPostId.value = post.id;
  
  const dateObj = new Date(post.publishDate);
  const tzOffset = dateObj.getTimezoneOffset() * 60000;
  const localISOTime = (new Date(dateObj.getTime() - tzOffset)).toISOString().slice(0, 16);

  formPost.value = {
    title: post.title,
    slug: post.slug,
    category: post.category,
    readTime: post.readTime,
    author: post.author,
    authorRole: post.authorRole,
    description: post.description,
    content: post.content,
    keywordsRaw: post.keywords ? post.keywords.join(', ') : '',
    publishDate: localISOTime,
  };
  isModalOpen.value = true;
}

async function saveBlogPost() {
  if (!formPost.value.title || !formPost.value.slug || !formPost.value.content) {
    showToast('Пожалуйста, заполните заголовок, адрес (slug) и содержимое статьи', 'info');
    return;
  }
  
  isSavingPost.value = true;
  const config = useRuntimeConfig();
  
  const payload = {
    title: formPost.value.title,
    slug: formPost.value.slug.trim().toLowerCase(),
    category: formPost.value.category,
    readTime: formPost.value.readTime,
    author: formPost.value.author,
    authorRole: formPost.value.authorRole,
    description: formPost.value.description,
    content: formPost.value.content,
    keywords: formPost.value.keywordsRaw.split(',').map(s => s.trim()).filter(Boolean),
    publishDate: new Date(formPost.value.publishDate).toISOString(),
  };
  
  try {
    if (isEditing.value && editingPostId.value) {
      await $fetch(`${config.public.apiUrl}/admin/blog/${editingPostId.value}`, {
        method: 'PUT',
        body: payload,
      });
      showToast('Статья успешно обновлена!', 'success');
    } else {
      await $fetch(`${config.public.apiUrl}/admin/blog`, {
        method: 'POST',
        body: payload,
      });
      showToast('Новая статья создана!', 'success');
    }
    isModalOpen.value = false;
    await loadBlogData();
  } catch (err: any) {
    const errorMsg = err.data?.error || 'Ошибка при сохранении статьи';
    showToast(errorMsg, 'info');
  } finally {
    isSavingPost.value = false;
  }
}

async function deleteBlogPost(postId: string) {
  if (!confirm('Вы уверены, что хотите удалить эту статью? Это действие необратимо.')) {
    return;
  }
  const config = useRuntimeConfig();
  try {
    await $fetch(`${config.public.apiUrl}/admin/blog/${postId}`, {
      method: 'DELETE',
    });
    showToast('Статья удалена!', 'success');
    await loadBlogData();
  } catch (err) {
    showToast('Ошибка при удалении статьи', 'info');
  }
}

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
  <div class="admin-page">
    <div class="admin-container">
      
      <!-- Superadmin Login Form (when not logged in as Admin) -->
      <div v-if="!auth.isAdmin" class="access-denied-view">
        <div class="lock-shield">🛡️</div>
        <h2>Вход в Панель Суперадминистратора</h2>
        <p>Для просмотра данных и модерации воспользуйтесь учётной записью администратора.</p>

        <form @submit.prevent="handleAdminLogin" class="admin-login-form">
          <div class="form-group">
            <label>Email администратора</label>
            <input v-model="adminEmail" type="email" class="form-input" required placeholder="admin@fyxi.ru" />
          </div>
          <div class="form-group">
            <label>Пароль</label>
            <input v-model="adminPassword" type="password" class="form-input" required placeholder="••••••••" />
          </div>

          <div v-if="adminLoginError" class="auth-error" style="margin-bottom: 1rem;">
            <span>⚠️ {{ adminLoginError }}</span>
          </div>

          <button :disabled="isAdminLoggingIn" type="submit" class="save-config-btn" style="width: 100%;">
            {{ isAdminLoggingIn ? 'Авторизация...' : 'Войти в панель администратора 🔑' }}
          </button>

          <div class="credentials-hint">
            💡 <span>Логин: <code>admin@fyxi.ru</code> | Пароль: <code>admin123456</code></span>
          </div>
        </form>
      </div>

      <template v-else>
        <!-- Title and Stats -->
        <div class="admin-header">
          <h1>Панель администратора profiTilda</h1>
          <p>Инструменты модерации, управления финансовыми тарифами и публикации материалов в Блог.</p>
        </div>

        <!-- TABS SWITCHER -->
        <div class="admin-tabs">
          <button 
            :class="['tab-btn', { active: activeTab === 'profiles' }]" 
            @click="activeTab = 'profiles'"
          >
            📋 Анкеты специалистов & Тарифы
          </button>
          <button 
            :class="['tab-btn', { active: activeTab === 'blog' }]" 
            @click="activeTab = 'blog'"
          >
            📰 Управление Блогом (CMS)
          </button>
          <button 
            :class="['tab-btn', { active: activeTab === 'errors' }]" 
            @click="activeTab = 'errors'; loadErrorLogs();"
          >
            🚨 Журнал ошибок (Diagnostics)
            <span v-if="errorLogs.filter(l => !l.resolved).length > 0" class="error-badge">
              {{ errorLogs.filter(l => !l.resolved).length }}
            </span>
          </button>
        </div>

        <!-- TAB 1: PROFILES & RATES -->
        <div v-if="activeTab === 'profiles'" class="tab-content">
          <!-- PRICING CONFIGURATION CONFIG BOX -->
          <section class="admin-config-section">
            <h2>⚙️ Настройки тарифов платформы</h2>
            <div class="config-grid">
              <div class="form-group">
                <label>Стоимость открытия 1 контакта (₽)</label>
                <input v-model="flatPrice" type="number" class="form-input" />
              </div>
              <div class="form-group">
                <label>Количество контактов в пакете (bundle)</label>
                <input v-model="bundleCount" type="number" class="form-input" />
              </div>
              <div class="form-group">
                <label>Стоимость пакета со скидкой (₽)</label>
                <input v-model="bundlePrice" type="number" class="form-input" />
              </div>
            </div>
            <button :disabled="isConfigSaving" class="save-config-btn" @click="savePricingConfig">
              {{ isConfigSaving ? 'Сохранение...' : 'Применить настройки цен' }}
            </button>
          </section>

          <!-- MODERATION LIST -->
          <section class="admin-profiles-section">
            <h2>📋 Очередь модерации и верификации ({{ profiles.length }} анкет)</h2>

            <div v-if="loading" class="loading-bar">Загрузка очереди специалистов...</div>
            <div v-else-if="profiles.length === 0" class="empty-list">Очередь модерации пуста. Похоже, все анкеты проверены!</div>
            <div v-else class="moderation-table-container">
              <table class="moderation-table">
                <thead>
                  <tr>
                    <th>Специалист</th>
                    <th>Специализация</th>
                    <th>Контакты для проверки</th>
                    <th>Одобрено в каталог</th>
                    <th>Бейдж Verified</th>
                    <th>Управление</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="profile in profiles" :key="profile.id">
                    <td>
                      <div class="spec-name-cell">
                        <strong>{{ profile.firstName }} {{ profile.lastName }}</strong>
                        <span class="spec-title-label">{{ profile.title }} • Опыт {{ profile.experienceYears }} лет</span>
                        <span class="user-email-tag">{{ profile.user.email }}</span>
                      </div>
                    </td>
                    <td>
                      <span :class="['spec-type-chip', profile.specialization.toLowerCase()]">
                        {{ profile.specialization }}
                      </span>
                    </td>
                    <td>
                      <div class="raw-contacts-info">
                        <div>✈️ Telegram: <code>{{ profile.contactTelegram }}</code></div>
                        <div>✉️ Email: <code>{{ profile.contactEmail }}</code></div>
                      </div>
                    </td>
                    <td>
                      <button 
                        :class="['action-toggle-btn', { approved: profile.isApproved }]" 
                        @click="toggleApprove(profile.id, profile.isApproved)"
                      >
                        {{ profile.isApproved ? 'Опубликовано' : 'Одобрить' }}
                      </button>
                    </td>
                    <td>
                      <button 
                        :class="['action-toggle-btn', { verified: profile.isVerified }]" 
                        @click="toggleVerify(profile.id, profile.isVerified)"
                      >
                        {{ profile.isVerified ? 'Verified' : 'Выдать' }}
                      </button>
                    </td>
                    <td>
                      <button 
                        class="action-delete-btn" 
                        @click="deleteProfile(profile.id, `${profile.firstName} ${profile.lastName}`)"
                        title="Удалить профиль специалиста"
                      >
                        🗑️ Удалить
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <!-- TAB 2: BLOG MANAGEMENT (CMS) -->
        <div v-if="activeTab === 'blog'" class="tab-content">
          <section class="admin-blog-cms-section">
            <div class="cms-header">
              <h2>📰 Управление статьями в Базе Знаний</h2>
              <button class="add-post-btn" @click="openCreateModal">
                ✨ Написать статью
              </button>
            </div>

            <!-- SEARCH AND FILTER BAR -->
            <div class="cms-action-bar">
              <div class="search-box">
                🔍 <input v-model="blogSearchQuery" type="text" placeholder="Поиск статьи по заголовку, slug или ключевым словам..." class="cms-search-input" />
              </div>
              <div class="filter-box">
                <select v-model="blogCategoryFilter" class="cms-select">
                  <option value="">Все категории</option>
                  <option value="Технологии">Технологии</option>
                  <option value="Дизайн">Дизайн</option>
                  <option value="Экономика найма">Экономика найма</option>
                  <option value="Аналитика">Аналитика</option>
                  <option value="Кейсы">Кейсы</option>
                </select>
              </div>
            </div>

            <!-- BLOG LIST -->
            <div v-if="isBlogLoading" class="loading-bar">Загрузка блоговых публикаций...</div>
            <div v-else-if="filteredBlogPosts.length === 0" class="empty-list">
              Ни одной статьи не найдено по вашему запросу.
            </div>
            <div v-else class="moderation-table-container">
              <table class="moderation-table">
                <thead>
                  <tr>
                    <th>Заголовок статьи / Адрес (slug)</th>
                    <th>Категория</th>
                    <th>Автор</th>
                    <th>Дата публикации</th>
                    <th>Статус</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="post in filteredBlogPosts" :key="post.id">
                    <td>
                      <div class="spec-name-cell">
                        <NuxtLink :to="'/blog/' + post.slug" target="_blank" class="post-preview-link">
                          <strong>{{ post.title }}</strong>
                        </NuxtLink>
                        <code class="post-slug-label">/blog/{{ post.slug }}</code>
                      </div>
                    </td>
                    <td>
                      <span class="blog-category-chip">{{ post.category }}</span>
                    </td>
                    <td>
                      <div class="spec-name-cell">
                        <span>👤 {{ post.author }}</span>
                        <span class="spec-title-label">{{ post.authorRole }}</span>
                      </div>
                    </td>
                    <td>
                      <span>{{ formatDate(post.publishDate) }}</span>
                    </td>
                    <td>
                      <span :class="['status-badge', getPostStatus(post).class]">
                        {{ getPostStatus(post).label }}
                      </span>
                    </td>
                    <td>
                      <div class="cms-actions-cell">
                        <button class="cms-btn-edit" @click="openEditModal(post)">✏️</button>
                        <button class="cms-btn-delete" @click="deleteBlogPost(post.id)">🗑️</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <!-- GORGEOUS CREATE / EDIT MODAL OVERLAY -->
        <div v-if="isModalOpen" class="modal-overlay" @click.self="isModalOpen = false">
          <div class="modal-box">
            <header class="modal-header">
              <h3>{{ isEditing ? '📝 Редактировать статью' : '✨ Написать новую статью' }}</h3>
              <button class="close-modal-btn" @click="isModalOpen = false">×</button>
            </header>
            
            <div class="modal-body">
              <form @submit.prevent="saveBlogPost">
                <div class="form-row">
                  <div class="form-group full-width">
                    <label>Заголовок статьи</label>
                    <input 
                      v-model="formPost.title" 
                      type="text" 
                      placeholder="Например: Как нанять Senior Vue разработчика напрямую" 
                      class="form-input"
                      @input="autoGenerateSlug"
                    />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Адрес (slug)</label>
                    <input 
                      v-model="formPost.slug" 
                      type="text" 
                      placeholder="how-to-hire-senior-vue" 
                      class="form-input" 
                    />
                    <span class="helper-text">Только строчные латинские буквы, цифры и дефисы</span>
                  </div>
                  <div class="form-group">
                    <label>Категория</label>
                    <select v-model="formPost.category" class="form-input">
                      <option value="Технологии">Технологии</option>
                      <option value="Дизайн">Дизайн</option>
                      <option value="Экономика найма">Экономика найма</option>
                      <option value="Аналитика">Аналитика</option>
                      <option value="Кейсы">Кейсы</option>
                    </select>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Автор</label>
                    <input v-model="formPost.author" type="text" placeholder="Иван Иванов" class="form-input" />
                  </div>
                  <div class="form-group">
                    <label>Должность автора</label>
                    <input v-model="formPost.authorRole" type="text" placeholder="CTO profiTilda" class="form-input" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group">
                    <label>Время чтения (например, '8 мин')</label>
                    <input v-model="formPost.readTime" type="text" placeholder="8 мин" class="form-input" />
                  </div>
                  <div class="form-group">
                    <label>Дата и время публикации (Schedule)</label>
                    <input v-model="formPost.publishDate" type="datetime-local" class="form-input" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group full-width">
                    <label>Ключевые слова (через запятую)</label>
                    <input v-model="formPost.keywordsRaw" type="text" placeholder="Vue 3, IT найм, рекрутинг" class="form-input" />
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group full-width">
                    <label>Краткое описание (SEO Description / Meta Snippet)</label>
                    <textarea v-model="formPost.description" rows="2" placeholder="Привлекательный анонс статьи в поисковой выдаче..." class="form-input textarea-field"></textarea>
                  </div>
                </div>

                <div class="form-row">
                  <div class="form-group full-width">
                    <label>Содержимое статьи (HTML-код с тегами p, h2, ul, blockquote)</label>
                    <textarea v-model="formPost.content" rows="12" placeholder="<h2>Заголовок подраздела</h2><p>Текст параграфа...</p>" class="form-input textarea-field code-textarea"></textarea>
                  </div>
                </div>
              </form>
            </div>

            <footer class="modal-footer">
              <button class="cancel-modal-btn" @click="isModalOpen = false">Отмена</button>
              <button :disabled="isSavingPost" class="submit-modal-btn" @click="saveBlogPost">
                {{ isSavingPost ? 'Сохранение...' : 'Сохранить статью' }}
              </button>
            </footer>
          </div>
        </div>

        <!-- TAB 3: SYSTEM ERROR DIAGNOSTICS & LOGS -->
        <div v-if="activeTab === 'errors'" class="tab-content">
          <section class="cms-header-bar">
            <div>
              <h2>🚨 Журнал ошибок и сбоев системы (Diagnostics)</h2>
              <p>Автоматическая фиксация серверных исключений (Fastify 500) и клиентских JS ошибок (Vue/Nuxt).</p>
            </div>

            <div class="cms-actions">
              <button class="btn-clear-errors" @click="clearResolvedErrors">
                🧹 Очистить исправленные
              </button>
            </div>
          </section>

          <!-- Error Stats Summary Cards -->
          <div class="error-stats-grid">
            <div class="stat-card">
              <span class="stat-label">Всего зафиксировано:</span>
              <span class="stat-value">{{ errorLogs.length }}</span>
            </div>
            <div class="stat-card warning">
              <span class="stat-label">Неисправленные ошибки:</span>
              <span class="stat-value">{{ errorLogs.filter(l => !l.resolved).length }}</span>
            </div>
            <div class="stat-card success">
              <span class="stat-label">Исправлено разработчиком:</span>
              <span class="stat-value">{{ errorLogs.filter(l => l.resolved).length }}</span>
            </div>
          </div>

          <!-- Error Toolbar Filters -->
          <div class="cms-toolbar">
            <div class="search-input-wrapper">
              <span class="search-icon">🔍</span>
              <input 
                v-model="errorSearchQuery" 
                type="text" 
                placeholder="Поиск по сообщениям, URL путям или стеку..." 
                class="cms-search-input" 
              />
            </div>

            <div class="cms-filter-selects">
              <select v-model="errorResolvedFilter" class="cms-filter-select">
                <option value="unresolved">Только неисправленные</option>
                <option value="all">Все записи</option>
                <option value="resolved">Только исправленные</option>
              </select>

              <select v-model="errorLevelFilter" class="cms-filter-select">
                <option value="all">Все уровни критичности</option>
                <option value="CRITICAL">🔥 CRITICAL</option>
                <option value="ERROR">❌ ERROR</option>
                <option value="WARN">⚠️ WARN</option>
              </select>
            </div>
          </div>

          <!-- Error Logs Table -->
          <div v-if="isErrorsLoading" class="loading-bar">Загрузка журнала системных ошибок...</div>
          <div v-else-if="filteredErrorLogs.length === 0" class="empty-list">
            Ошибок по выбранным фильтрам не обнаружено 🎉
          </div>
          <div v-else class="moderation-table-wrapper">
            <table class="moderation-table">
              <thead>
                <tr>
                  <th>Уровень</th>
                  <th>Источник</th>
                  <th>Сообщение ошибки</th>
                  <th>Путь (URL / Route)</th>
                  <th>Время</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="log in filteredErrorLogs" :key="log.id" :class="{ 'row-resolved': log.resolved }">
                  <td>
                    <span :class="['level-pill', log.level.toLowerCase()]">{{ log.level }}</span>
                  </td>
                  <td>
                    <span class="source-tag">{{ log.source }}</span>
                  </td>
                  <td class="error-msg-cell">
                    <div class="error-msg-text">{{ log.message }}</div>
                    <button v-if="log.stack" class="stack-btn" @click="selectedErrorForStack = log">
                      📄 Посмотреть Stack Trace
                    </button>
                  </td>
                  <td class="path-cell">
                    <code>{{ log.method ? log.method + ' ' : '' }}{{ log.path || '—' }}</code>
                  </td>
                  <td class="date-cell">{{ formatDate(log.createdAt) }}</td>
                  <td>
                    <span :class="['status-badge', log.resolved ? 'approved' : 'pending']">
                      {{ log.resolved ? '✅ Исправлено' : '🚨 Активна' }}
                    </span>
                  </td>
                  <td class="actions-cell">
                    <button 
                      :class="['btn-status', log.resolved ? 'reject' : 'approve']" 
                      @click="toggleResolveError(log.id, log.resolved)"
                    >
                      {{ log.resolved ? 'Вернуть в активные' : 'Отметить исправленным' }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- STACK TRACE MODAL -->
        <div v-if="selectedErrorForStack" class="modal-overlay" @click="selectedErrorForStack = null">
          <div class="modal-card stack-modal" @click.stopPropagation>
            <header class="modal-header">
              <h3>📄 Детализация ошибки и Stack Trace</h3>
              <button class="close-modal-btn" @click="selectedErrorForStack = null">×</button>
            </header>
            
            <div class="modal-body">
              <div class="error-meta-box">
                <p><strong>Сообщение:</strong> {{ selectedErrorForStack.message }}</p>
                <p><strong>Источник:</strong> {{ selectedErrorForStack.source }} | <strong>IP:</strong> {{ selectedErrorForStack.ipAddress || '—' }}</p>
                <p v-if="selectedErrorForStack.userAgent"><strong>User Agent:</strong> {{ selectedErrorForStack.userAgent }}</p>
              </div>

              <div class="stack-trace-code">
                <pre>{{ selectedErrorForStack.stack }}</pre>
              </div>
            </div>

            <footer class="modal-footer">
              <button class="cancel-modal-btn" @click="selectedErrorForStack = null">Закрыть</button>
            </footer>
          </div>
        </div>
      </template>

    </div>
  </div>
</template>

<style scoped>
.admin-page {
  padding: 5rem 2rem;
  background: radial-gradient(circle at 10% 10%, rgba(20, 20, 35, 0.8), #09090e);
  min-height: 100vh;
}

.admin-container {
  max-width: 1200px;
  margin: 0 auto;
}

.admin-header {
  text-align: left;
  margin-bottom: 2.5rem;
}

.admin-header h1 {
  font-size: 2.4rem;
  margin-bottom: 0.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, #fff 0%, var(--accent-cyan, #06b6d4) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.admin-header p {
  color: var(--text-muted, #94a3b8);
  font-size: 1.1rem;
}

/* --- TABS --- */
.admin-tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 1rem;
}

.tab-btn {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-muted, #94a3b8);
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-btn:hover {
  background: rgba(255, 255, 255, 0.03);
  color: #fff;
}

.tab-btn.active {
  background: rgba(6, 182, 212, 0.1);
  border-color: rgba(6, 182, 212, 0.3);
  color: var(--accent-cyan, #06b6d4);
  box-shadow: 0 0 15px rgba(6, 182, 212, 0.1);
}

/* --- DENIED VIEW --- */
.access-denied-view {
  background: var(--bg-card, #111);
  border: 1px solid var(--border-glow, rgba(255,255,255,0.05));
  padding: 5rem 3rem;
  border-radius: 24px;
  text-align: center;
}

.lock-shield {
  font-size: 4rem;
  margin-bottom: 1.5rem;
}

.access-denied-view h2 {
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
}

.access-denied-view p {
  color: var(--text-muted, #94a3b8);
  margin-bottom: 2.5rem;
}

/* --- CONFIG BOX --- */
.admin-config-section {
  background: var(--bg-card, #111);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 2.5rem;
  border-radius: 20px;
  text-align: left;
  margin-bottom: 3rem;
}

.admin-config-section h2 {
  font-size: 1.4rem;
  margin-bottom: 1.5rem;
  font-weight: 700;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.85rem;
  color: var(--text-muted, #94a3b8);
  font-weight: 500;
}

.form-input {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  font-size: 0.95rem;
  transition: all 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--accent-cyan, #06b6d4);
  box-shadow: 0 0 10px rgba(6, 182, 212, 0.15);
}

.save-config-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  padding: 0.8rem 1.6rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.save-config-btn:hover:not(:disabled) {
  background: #fff;
  color: #000;
}

/* --- CMS HEADER & ACTIONS --- */
.admin-blog-cms-section {
  background: var(--bg-card, #111);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 2.5rem;
  border-radius: 20px;
  text-align: left;
}

.cms-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.cms-header h2 {
  font-size: 1.4rem;
  margin: 0;
  font-weight: 700;
}

.add-post-btn {
  background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
  border: none;
  color: #fff;
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.add-post-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(6, 182, 212, 0.4);
}

.cms-action-bar {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 280px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 0.65rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.cms-search-input {
  background: transparent;
  border: none;
  color: #fff;
  width: 100%;
  outline: none;
  font-size: 0.95rem;
}

.filter-box {
  min-width: 180px;
}

.cms-select {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: #fff;
  padding: 0.7rem 1rem;
  border-radius: 12px;
  width: 100%;
  font-size: 0.95rem;
  cursor: pointer;
  outline: none;
}

/* --- TABLE LAYOUT --- */
.admin-profiles-section {
  background: var(--bg-card, #111);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 2.5rem;
  border-radius: 20px;
  text-align: left;
}

.admin-profiles-section h2 {
  font-size: 1.4rem;
  margin-bottom: 1.5rem;
  font-weight: 700;
}

.moderation-table-container {
  overflow-x: auto;
}

.moderation-table {
  width: 100%;
  border-collapse: collapse;
}

.moderation-table th, .moderation-table td {
  padding: 1.2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  vertical-align: middle;
}

.moderation-table th {
  color: var(--text-muted, #94a3b8);
  font-size: 0.85rem;
  text-transform: uppercase;
  font-weight: 600;
  letter-spacing: 0.05em;
  background: rgba(0, 0, 0, 0.15);
}

.spec-name-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.spec-title-label {
  font-size: 0.8rem;
  color: var(--text-muted, #94a3b8);
}

.user-email-tag {
  font-size: 0.75rem;
  color: var(--accent-cyan, #06b6d4);
}

.post-preview-link {
  color: #fff;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s ease;
}

.post-preview-link:hover {
  color: var(--accent-cyan, #06b6d4);
}

.post-slug-label {
  font-size: 0.75rem;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.03);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  width: fit-content;
}

.spec-type-chip {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.1);
  display: inline-block;
}

.spec-type-chip.designer { background: rgba(139, 92, 246, 0.12); color: #d8b4fe; border-color: rgba(139, 92, 246, 0.2); }
.spec-type-chip.developer { background: rgba(6, 182, 212, 0.12); color: #22d3ee; border-color: rgba(6, 182, 212, 0.2); }
.spec-type-chip.fullstack { background: rgba(236, 72, 153, 0.12); color: #fbcfe8; border-color: rgba(236, 72, 153, 0.2); }

.blog-category-chip {
  background: rgba(6, 182, 212, 0.08);
  border: 1px solid rgba(6, 182, 212, 0.18);
  color: #22d3ee;
  font-size: 0.8rem;
  padding: 0.25rem 0.65rem;
  border-radius: 8px;
  font-weight: 600;
}

.raw-contacts-info {
  font-size: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.raw-contacts-info code {
  color: #f1f5f9;
}

.action-toggle-btn {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--text-muted, #94a3b8);
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-toggle-btn.approved {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.25);
  color: #22c55e;
}

.action-toggle-btn.verified {
  background: rgba(6, 182, 212, 0.1);
  border-color: rgba(6, 182, 212, 0.25);
  color: #06b6d4;
  box-shadow: 0 0 10px rgba(6, 182, 212, 0.2);
}

.action-toggle-btn:hover {
  border-color: rgba(255, 255, 255, 0.2);
  color: #fff;
}

/* --- STATUS BADGES --- */
.status-badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.3rem 0.6rem;
  border-radius: 8px;
}

.status-badge.published {
  background: rgba(34, 197, 94, 0.12);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.25);
}

.status-badge.scheduled {
  background: rgba(234, 179, 8, 0.12);
  color: #facc15;
  border: 1px solid rgba(234, 179, 8, 0.25);
}

/* --- CMS ACTIONS --- */
.cms-actions-cell {
  display: flex;
  gap: 0.5rem;
}

.cms-btn-edit, .cms-btn-delete {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.45rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.cms-btn-edit:hover {
  background: rgba(6, 182, 212, 0.1);
  border-color: #06b6d4;
}

.cms-btn-delete:hover {
  background: rgba(239, 68, 68, 0.1);
  border-color: #ef4444;
}

/* --- MODAL OVERLAY --- */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(3, 3, 5, 0.85);
  backdrop-filter: blur(12px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
  padding: 2rem;
}

.modal-box {
  background: #0f1015;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
  animation: modalScale 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalScale {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.modal-header {
  padding: 1.5rem 2rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.3rem;
  font-weight: 700;
  color: #fff;
}

.close-modal-btn {
  background: transparent;
  border: none;
  color: #94a3b8;
  font-size: 1.8rem;
  cursor: pointer;
  line-height: 1;
}

.close-modal-btn:hover {
  color: #fff;
}

.modal-body {
  padding: 2rem;
  overflow-y: auto;
  flex: 1;
  text-align: left;
}

.form-row {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
}

.form-row .form-group {
  flex: 1;
  min-width: 240px;
}

.form-row .form-group.full-width {
  flex: 100%;
  min-width: 100%;
}

.textarea-field {
  resize: vertical;
  line-height: 1.5;
}

.code-textarea {
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.9rem;
  background: #08080c !important;
}

.helper-text {
  font-size: 0.75rem;
  color: var(--text-muted, #64748b);
  margin-top: 0.2rem;
}

.modal-footer {
  padding: 1.25rem 2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.cancel-modal-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  padding: 0.65rem 1.3rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-modal-btn:hover {
  background: rgba(255, 255, 255, 0.05);
}

.submit-modal-btn {
  background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%);
  border: none;
  color: #fff;
  padding: 0.65rem 1.3rem;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.submit-modal-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 5px 15px rgba(6, 182, 212, 0.3);
}

.submit-modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-bar, .empty-list {
  text-align: center;
  padding: 3.5rem;
  color: var(--text-muted, #94a3b8);
  font-size: 0.95rem;
}

/* --- ERROR LOGS DIAGNOSTICS STYLES --- */
.error-badge {
  background: #ef4444;
  color: #fff;
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  border-radius: 12px;
  margin-left: 0.4rem;
  font-weight: 700;
}

.btn-clear-errors {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  padding: 0.6rem 1.2rem;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.88rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-clear-errors:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #fff;
}

.error-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.2rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-glow);
  border-radius: 16px;
  padding: 1.2rem 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  text-align: left;
}

.stat-card.warning {
  border-color: rgba(239, 68, 68, 0.3);
}

.stat-card.warning .stat-value {
  color: #ef4444;
}

.stat-card.success {
  border-color: rgba(34, 197, 94, 0.3);
}

.stat-card.success .stat-value {
  color: #22c55e;
}

.stat-label {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--accent-cyan);
}

.level-pill {
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
}

.level-pill.critical { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
.level-pill.error { background: rgba(249, 115, 22, 0.2); color: #f97316; }
.level-pill.warn { background: rgba(234, 179, 8, 0.2); color: #eab308; }

.source-tag {
  background: rgba(255, 255, 255, 0.05);
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-size: 0.8rem;
  color: #cbd5e1;
}

.error-msg-cell {
  max-width: 320px;
}

.error-msg-text {
  font-weight: 500;
  color: #f1f5f9;
  font-size: 0.88rem;
  line-height: 1.4;
}

.stack-btn {
  background: transparent;
  border: none;
  color: var(--accent-cyan);
  font-size: 0.78rem;
  cursor: pointer;
  padding: 0;
  margin-top: 0.3rem;
  text-decoration: underline;
}

.path-cell code {
  font-family: monospace;
  font-size: 0.8rem;
  color: #a7f3d0;
  background: rgba(16, 185, 129, 0.1);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}

.row-resolved {
  opacity: 0.55;
}

.stack-modal {
  max-width: 900px;
}

.error-meta-box {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-glow);
  border-radius: 12px;
  padding: 1rem 1.2rem;
  margin-bottom: 1.5rem;
  text-align: left;
  font-size: 0.9rem;
}

.stack-trace-code pre {
  background: #050508;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.2rem;
  border-radius: 12px;
  color: #fca5a5;
  font-family: monospace;
  font-size: 0.82rem;
  white-space: pre-wrap;
  word-break: break-all;
  max-height: 400px;
  overflow-y: auto;
}

.action-delete-btn {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #fca5a5;
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-delete-btn:hover {
  background: rgba(239, 68, 68, 0.3);
  color: #fff;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);
}

.admin-login-form {
  max-width: 420px;
  margin: 2rem auto 0;
  text-align: left;
}

.credentials-hint {
  margin-top: 1.5rem;
  padding: 0.8rem 1rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-glow);
  border-radius: 10px;
  font-size: 0.82rem;
  color: var(--text-muted);
  text-align: center;
}

.credentials-hint code {
  color: #38bdf8;
  font-weight: 700;
}
</style>
