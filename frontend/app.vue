<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAuthStore } from '~/stores/auth';
import { useCartStore } from '~/stores/cart';

const auth = useAuthStore();
const cart = useCartStore();

// Mobile menu toggle
const isMobileMenuOpen = ref(false);

// Guest checkout fields
const guestEmail = ref('');
const checkoutError = ref('');
const isSubmitting = ref(false);

// Toast system state
const toasts = ref<{ id: number; message: string; type: 'success' | 'info' }[]>([]);
let toastIdCounter = 0;

function showToast(message: string, type: 'success' | 'info' = 'info') {
  const id = toastIdCounter++;
  toasts.value.push({ id, message, type });
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id);
  }, 4000);
}

function removeToast(id: number) {
  toasts.value = toasts.value.filter(t => t.id !== id);
}

function handleGlobalKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (cart.isDrawerOpen) cart.toggleDrawer(false);
    if (isMobileMenuOpen.value) isMobileMenuOpen.value = false;
  }
}

// Expose toast so children pages can trigger it
provide('showToast', showToast);

// Check current session on mount
onMounted(async () => {
  window.addEventListener('keydown', handleGlobalKeydown);
  await auth.fetchUser();
  
  // Parse redirect query flags from payment simulator
  const route = useRoute();
  if (route.query.payment === 'success') {
    showToast('Оплата прошла успешно! Контакты разблокированы.', 'success');
  } else if (route.query.payment === 'cancel') {
    showToast('Платеж отменен пользователем', 'info');
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
});

// Checkout execution
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function handleCheckout() {
  if (cart.count === 0) return;
  
  if (!auth.isAuthenticated) {
    if (!guestEmail.value || !guestEmail.value.trim()) {
      checkoutError.value = 'Пожалуйста, укажите ваш Email для отправки разблокированных контактов!';
      return;
    }
    if (!emailRegex.test(guestEmail.value.trim())) {
      checkoutError.value = 'Укажите корректный адрес электронной почты (например: client@company.ru)';
      return;
    }
  }

  isSubmitting.value = true;
  checkoutError.value = '';
  try {
    await cart.checkout(guestEmail.value.trim());
  } catch (err: any) {
    checkoutError.value = err.message || 'Произошла ошибка при переходе к оплате';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="layout-container">
    <!-- BACKGROUND DECORATIONS -->
    <div class="bg-glow-purple"></div>
    <div class="bg-glow-cyan"></div>

    <!-- HEADER / NAVIGATION -->
    <header class="main-header">
      <div class="nav-container">
        <NuxtLink to="/" class="logo" @click="isMobileMenuOpen = false">fyxi<span class="logo-dot"></span></NuxtLink>
        
        <!-- Mobile Burger Toggle Button -->
        <button class="mobile-burger-btn" @click="isMobileMenuOpen = !isMobileMenuOpen" aria-label="Toggle Navigation Menu">
          <span v-if="!isMobileMenuOpen">☰</span>
          <span v-else>✕</span>
        </button>

        <nav class="desktop-nav" :class="{ 'mobile-menu-open': isMobileMenuOpen }">
          <NuxtLink to="/" active-class="active" @click="isMobileMenuOpen = false">Каталог</NuxtLink>
          <NuxtLink to="/blog" active-class="active" @click="isMobileMenuOpen = false">Статьи</NuxtLink>
          
          <!-- Admin Panel Button -->
          <NuxtLink v-if="auth.isAdmin" to="/admin" class="nav-btn admin-link" active-class="active" @click="isMobileMenuOpen = false">Админка</NuxtLink>
          
          <!-- Specialist Cabinet Button -->
          <NuxtLink v-if="auth.isDeveloper" to="/cabinet" class="nav-btn cabinet-link" active-class="active" @click="isMobileMenuOpen = false">Мой профиль</NuxtLink>
          
          <!-- Auth session buttons -->
          <template v-if="auth.isAuthenticated">
            <span class="session-email">{{ auth.user?.email }}</span>
            <button class="logout-btn" @click="auth.logout(); isMobileMenuOpen = false;">Выйти</button>
          </template>
          <template v-else>
            <NuxtLink to="/cabinet" class="login-nav-btn" @click="isMobileMenuOpen = false">Разработчикам</NuxtLink>
          </template>

          <!-- Shopping Cart trigger -->
          <button class="cart-btn" @click="cart.toggleDrawer(true); isMobileMenuOpen = false;">
            <svg style="width: 18px; height: 18px; fill: currentColor;" viewBox="0 0 24 24">
              <path d="M17 18c-1.11 0-2 .89-2 2a2 2 0 0 0 2 2 2 2 0 0 0 2-2c0-1.11-.89-2-2-2M7 18c-1.11 0-2 .9 2 2a2 2 0 0 0 2 2 2 2 0 0 0 2-2 2 2 0 0 0-2-2m2.84-4h6.06c.75 0 1.41-.41 1.75-1.03l3.58-6.47c.37-.63-.09-1.5-.82-1.5H5.21l-.94-2H1v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96a2 2 0 0 0 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25z"/>
            </svg>
            Корзина
            <span class="cart-badge">{{ cart.count }}</span>
          </button>
        </nav>
      </div>
    </header>

    <!-- MAIN BODY ROUTER -->
    <main class="page-content">
      <NuxtPage />
    </main>

    <!-- FOOTER -->
    <footer class="main-footer">
      <div class="footer-container">
        <p>© 2026 fyxi.ru — Платформа прямых контактов разработчиков и дизайнеров. Все права защищены.</p>
        <div class="footer-links">
          <NuxtLink to="/privacy">Политика конфиденциальности (152-ФЗ)</NuxtLink>
          <span class="footer-dot">•</span>
          <NuxtLink to="/terms">Пользовательское соглашение</NuxtLink>
          <span class="footer-dot">•</span>
          <a href="/feed.xml" target="_blank">RSS-лента</a>
          <span class="footer-dot">•</span>
          <a href="https://t.me/fyxiWeb_bot" target="_blank">Telegram Bot</a>
        </div>
      </div>
    </footer>

    <!-- SIDE DRAWER (TALENT CART) -->
    <div :class="['drawer-overlay', { open: cart.drawerOpen }]" @click="cart.toggleDrawer(false)">
      <div class="cart-drawer" @click.stopPropagation>
        <div class="drawer-header">
          <span class="drawer-title">Корзина контактов</span>
          <button class="close-drawer-btn" @click="cart.toggleDrawer(false)">×</button>
        </div>

        <div class="cart-items-list">
          <div v-if="cart.count === 0" class="empty-cart-view">
            <div class="empty-cart-icon">🛒</div>
            <p>Ваша корзина пуста.<br>Добавьте специалистов, чтобы выкупить их контакты.</p>
          </div>
          <template v-else>
            <div v-for="item in cart.items" :key="item.id" class="cart-item-row">
              <div class="cart-item-avatar">{{ item.avatarSymbol }}</div>
              <div class="cart-item-details">
                <div class="cart-item-name">{{ item.firstName }} {{ item.lastName }}</div>
                <div class="cart-item-role">{{ item.title }}</div>
              </div>
              <button class="remove-cart-item" @click="cart.removeItem(item.id)">Удалить</button>
            </div>
          </template>
        </div>

        <div v-if="cart.count > 0" class="cart-summary">
          <div class="summary-row">
            <span>Контактов к открытию:</span>
            <span>{{ cart.count }}</span>
          </div>
          <div class="summary-row">
            <span>Цена за единицу:</span>
            <span>500 ₽</span>
          </div>
          
          <!-- Bundle savings info -->
          <div v-if="cart.count >= cart.bundleCount" class="bundle-discount-row">
            <span>Скидка оптового пакета:</span>
            <span class="discount-pill">-{{ (cart.count * cart.flatPrice) - cart.totalPrice }} ₽</span>
          </div>

          <div class="summary-row total">
            <span>Итого к оплате:</span>
            <span class="total-rub">{{ cart.totalPrice }} ₽</span>
          </div>

          <!-- Guest Checkout Email Box -->
          <div v-if="!auth.isAuthenticated" class="guest-checkout-box">
            <div class="form-group">
              <label for="guest-email">Ваш Email для отправки контактов <span style="color: #ef4444;">*</span></label>
              <input 
                id="guest-email" 
                v-model="guestEmail" 
                type="email" 
                :class="['form-input', { 'input-has-error': checkoutError }]" 
                placeholder="client@company.ru"
                @input="checkoutError = ''"
              />
            </div>
          </div>

          <div v-if="checkoutError" class="checkout-error-banner">
            <span class="error-icon">⚠️</span>
            <span>{{ checkoutError }}</span>
          </div>

          <button 
            :disabled="isSubmitting" 
            class="checkout-submit-btn" 
            @click="handleCheckout"
          >
            {{ isSubmitting ? 'Подключение к ЮKassa...' : 'Оформить покупку через ЮKassa' }}
          </button>
        </div>
      </div>
    </div>

    <!-- TOASTS CONTAINER -->
    <div class="toast-container">
      <div 
        v-for="toast in toasts" 
        :key="toast.id" 
        :class="['toast', { 'toast-success': toast.type === 'success' }]"
      >
        <span style="font-size: 1.1rem;">{{ toast.type === 'success' ? '✅' : '🔔' }}</span>
        <span style="flex: 1;">{{ toast.message }}</span>
        <button class="close-toast-btn" @click="removeToast(toast.id)" aria-label="Close Toast">×</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* --- APP SPECIFIC STYLES --- */
.main-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(3, 3, 3, 0.7);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border-glow);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.25rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  font-weight: 700;
  background: var(--gradient-cyber);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-decoration: none;
}

.logo-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--accent-cyan);
  display: inline-block;
  box-shadow: 0 0 10px var(--accent-cyan);
}

.mobile-burger-btn {
  display: none;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-glow);
  color: #fff;
  font-size: 1.3rem;
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  cursor: pointer;
  line-height: 1;
}

@media (max-width: 768px) {
  .nav-container {
    padding: 1rem 1.25rem;
    position: relative;
  }

  .mobile-burger-btn {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .desktop-nav {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: #090d16;
    border-bottom: 1px solid var(--border-glow);
    flex-direction: column;
    padding: 1.5rem;
    gap: 1.2rem;
    align-items: flex-start;
    box-shadow: 0 15px 30px rgba(0, 0, 0, 0.7);
    z-index: 100;
  }

  .desktop-nav.mobile-menu-open {
    display: flex;
  }

  .session-email {
    border-right: none;
    padding-right: 0;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--border-glow);
    width: 100%;
  }

  .cart-btn {
    width: 100%;
    justify-content: center;
  }
}

.cart-btn {
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-glow);
  padding: 0.6rem 1.2rem;
  border-radius: 12px;
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.cart-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.cart-badge {
  background: var(--accent-violet);
  color: #fff;
  font-size: 0.75rem;
  padding: 0.1rem 0.4rem;
  border-radius: 20px;
  font-weight: 600;
  box-shadow: 0 0 8px var(--accent-violet);
}

.page-content {
  flex: 1;
}

.main-footer {
  border-top: 1px solid var(--border-glow);
  padding: 3.5rem 2rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.9rem;
  position: relative;
  z-index: 10;
  background: rgba(3, 3, 3, 0.4);
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.footer-links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  font-size: 0.85rem;
}

.footer-links a {
  color: var(--text-muted);
  text-decoration: none;
  transition: color 0.2s ease;
}

.footer-links a:hover {
  color: var(--accent-cyan);
}

.footer-dot {
  color: rgba(255, 255, 255, 0.15);
}

/* --- DRAWER (CART) --- */
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  z-index: 100;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.4s ease;
}

.drawer-overlay.open {
  opacity: 1;
  pointer-events: auto;
}

.cart-drawer {
  position: fixed;
  top: 0;
  right: -450px;
  width: 100%;
  max-width: 440px;
  height: 100%;
  background: var(--bg-surface);
  border-left: 1px solid var(--border-glow);
  box-shadow: -10px 0 40px rgba(0, 0, 0, 0.8);
  z-index: 101;
  display: flex;
  flex-direction: column;
  transition: right 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  padding: 2.5rem 2rem;
}

@media (max-width: 600px) {
  .cart-drawer {
    max-width: 100vw;
    right: -100vw;
    padding: 1.5rem 1.25rem;
  }
}

.drawer-overlay.open .cart-drawer {
  right: 0;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.close-drawer-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 1.5rem;
  cursor: pointer;
  transition: color 0.2s ease;
}

.close-drawer-btn:hover {
  color: var(--text-primary);
}

.drawer-title {
  font-size: 1.5rem;
  font-weight: 600;
}

.cart-items-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-bottom: 2rem;
}

.cart-item-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-glow);
  padding: 1rem;
  border-radius: 16px;
  position: relative;
}

.cart-item-avatar {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
}

.cart-item-details {
  flex: 1;
}

.cart-item-name {
  font-size: 0.95rem;
  font-weight: 600;
}

.cart-item-role {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.remove-cart-item {
  background: transparent;
  border: none;
  color: #ef4444;
  font-size: 0.85rem;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.remove-cart-item:hover {
  opacity: 1;
}

.cart-summary {
  border-top: 1px solid var(--border-glow);
  padding-top: 1.5rem;
  margin-bottom: 1.5rem;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  font-size: 0.95rem;
  color: var(--text-muted);
}

.bundle-discount-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
  color: #22c55e;
}

.discount-pill {
  background: rgba(34, 197, 94, 0.12);
  padding: 0.1rem 0.5rem;
  border-radius: 6px;
  font-weight: 600;
}

.summary-row.total {
  font-size: 1.25rem;
  color: var(--text-primary);
  font-weight: 700;
  margin-top: 1rem;
  border-top: 1px dashed var(--border-glow);
  padding-top: 1rem;
}

.total-rub {
  color: var(--accent-cyan);
  text-shadow: 0 0 10px rgba(6, 182, 212, 0.3);
}

.guest-checkout-box {
  background: rgba(255,255,255,0.01);
  border: 1px solid var(--border-glow);
  border-radius: 12px;
  padding: 1rem;
  margin-top: 1.2rem;
  margin-bottom: 1.2rem;
}

.input-has-error {
  border-color: #ef4444 !important;
  box-shadow: 0 0 15px rgba(239, 68, 68, 0.3) !important;
  animation: shake 0.4s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-6px); }
  40%, 80% { transform: translateX(6px); }
}

.checkout-error-banner {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  padding: 0.8rem 1rem;
  border-radius: 12px;
  font-size: 0.85rem;
  margin-bottom: 1.2rem;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  text-align: left;
  line-height: 1.4;
}

.checkout-submit-btn {
  width: 100%;
  background: var(--gradient-cyber);
  border: none;
  color: #fff;
  padding: 1.1rem;
  border-radius: 14px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(139, 92, 246, 0.4);
  transition: all 0.3s ease;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.5rem;
}

.checkout-submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(139, 92, 246, 0.6);
}

.checkout-submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.empty-cart-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
  text-align: center;
  gap: 1rem;
}

.empty-cart-icon {
  font-size: 3rem;
  opacity: 0.4;
}

.close-toast-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 1.2rem;
  cursor: pointer;
  line-height: 1;
  padding: 0 0.2rem;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.close-toast-btn:hover {
  opacity: 1;
  color: #fff;
}

.toast {
  animation: toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes toastSlideIn {
  from {
    opacity: 0;
    transform: translateX(50px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
</style>
