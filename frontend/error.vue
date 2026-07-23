<script setup lang="ts">
import type { NuxtError } from '#app';

const props = defineProps({
  error: Object as () => NuxtError
});

useSeoMeta({
  title: '404 — Страница не найдена | fyxi',
  robots: 'noindex, nofollow'
});

const handleClearError = () => clearError({ redirect: '/' });
</script>

<template>
  <div class="error-container">
    <div class="glow-bg"></div>
    <div class="error-card">
      <div class="error-code">404</div>
      <h1 class="error-title">Страница не найдена</h1>
      <p class="error-desc">
        Запрашиваемая страница не существует или была перемещена.<br>
        Воспользуйтесь поиском по каталогу или вернитесь на главную страницу <strong class="brand-text">fyxi.ru</strong>.
      </p>
      
      <div class="action-buttons">
        <button class="btn-primary" @click="handleClearError">
          ← Вернуться на главную
        </button>
        <NuxtLink to="/blog" class="btn-secondary">
          База знаний и Блог
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.error-container {
  min-height: 80vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  position: relative;
  overflow: hidden;
  text-align: center;
}

.glow-bg {
  position: absolute;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(6, 182, 212, 0.05) 50%, transparent 70%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1;
}

.error-card {
  position: relative;
  z-index: 10;
  max-width: 600px;
  background: rgba(18, 18, 26, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 28px;
  padding: 3.5rem 2.5rem;
  backdrop-filter: blur(16px);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
}

.error-code {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 6rem;
  font-weight: 800;
  line-height: 1;
  background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 1rem;
}

.error-title {
  font-size: 2rem;
  color: #f8fafc;
  margin-bottom: 1rem;
}

.error-desc {
  color: #94a3b8;
  font-size: 1.05rem;
  line-height: 1.6;
  margin-bottom: 2.5rem;
}

.brand-text {
  color: #22d3ee;
}

.action-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-primary {
  background: linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%);
  color: #fff;
  border: none;
  padding: 0.9rem 1.8rem;
  border-radius: 14px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(139, 92, 246, 0.3);
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(139, 92, 246, 0.5);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.04);
  color: #f8fafc;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.9rem 1.8rem;
  border-radius: 14px;
  font-weight: 500;
  font-size: 0.95rem;
  text-decoration: none;
  transition: all 0.3s ease;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.2);
}
</style>
