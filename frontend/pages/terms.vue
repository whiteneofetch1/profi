<script setup lang="ts">
const url = useRequestURL();

useSeoMeta({
  title: 'Пользовательское соглашение и оферта | fyxi.ru',
  description: 'Публичная оферта и условия использования услуг платформы fyxi.ru.',
  ogTitle: 'Пользовательское соглашение и оферта | fyxi.ru',
  ogDescription: 'Условия покупки прямых контактов специалистов на платформе fyxi.ru.',
  ogImage: '/og-image.jpg',
});

useHead({
  link: [{ rel: 'canonical', href: computed(() => `${url.origin}/terms`) }],
});
</script>

<template>
  <div class="legal-page">
    <div class="legal-container">
      <div class="legal-header">
        <h1>Публичная оферта и Пользовательское соглашение</h1>
        <p class="effective-date">Редакция от 1 июня 2026 г. | Домен: fyxi.ru</p>
      </div>

      <div class="legal-body">
        <section class="legal-section">
          <h2>1. Предмет оферты</h2>
          <p>Настоящее Пользовательское соглашение (далее — «Оферта») регулирует отношения между маркетплейсом <strong>fyxi.ru</strong> (далее — «Сервис») и любым физическим или юридическим лицом (далее — «Пользователь»), оформляющим заказ на предоставление доступа к контактным данным веб-дизайнеров и разработчиков.</p>
        </section>

        <section class="legal-section">
          <h2>2. Модель Pay-Per-Contact</h2>
          <p>Сервис предоставляет доступ к прямым контактам (Telegram, Email, телефон) специалистов на условиях разовой оплаты фиксированной стоимости за единицу контакта (500 ₽) либо пакетного тарифного плана (5 контактов за 2000 ₽).</p>
          <p>Сервис <strong>не является работодателем, заказчиком или кадровым агентством</strong>, а также не взимает никаких дополнительных комиссий с последующих сделок между Заказчиком и Исполнителем.</p>
        </section>

        <section class="legal-section">
          <h2>3. Порядок оплаты и предоставления доступа</h2>
          <ul>
            <li>Оплата услуг производится в безналичном порядке через интегрированный платежный шлюз ЮKassa;</li>
            <li>Разблокировка контактов выбранных специалистов происходит мгновенно после подтверждения успешной транзакции от платежного шлюза;</li>
            <li>Купленные контакты навсегда сохраняются в Личном кабинете Пользователя.</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>4. Права и ответственность сторон</h2>
          <p>Пользователь обязуется не использовать полученные контактные данные для отправки спама, незапрошенных массовых рассылок или иных действий, нарушающих законодательство РФ.</p>
          <p>Сервис не несет ответственности за качество и сроки работ, выполняемых специалистом в рамках последующих договоренностей между Пользователем и специалистом.</p>
        </section>

        <section class="legal-section">
          <h2>5. Контактная информация</h2>
          <p>Администрация сервиса fyxi.ru: <a href="mailto:admin@fyxi.ru">admin@fyxi.ru</a>.</p>
        </section>
      </div>

      <div class="legal-footer-nav">
        <NuxtLink to="/" class="back-link">← Вернуться в каталог fyxi.ru</NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.legal-page {
  padding: 4rem 2rem;
  max-width: 900px;
  margin: 0 auto;
  text-align: left;
}

.legal-container {
  background: var(--bg-card);
  border: 1px solid var(--border-glow);
  border-radius: 24px;
  padding: 3rem 2.5rem;
  backdrop-filter: blur(16px);
}

.legal-header h1 {
  font-size: 2.3rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  background: var(--gradient-cyber);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.effective-date {
  font-size: 0.88rem;
  color: var(--text-muted);
  margin-bottom: 2.5rem;
}

.legal-section {
  margin-bottom: 2rem;
}

.legal-section h2 {
  font-size: 1.3rem;
  color: var(--text-primary);
  margin-bottom: 0.75rem;
}

.legal-section p, .legal-section li {
  font-size: 0.95rem;
  color: #cbd5e1;
  line-height: 1.6;
  margin-bottom: 0.5rem;
}

.legal-section ul {
  padding-left: 1.5rem;
}

.legal-section a {
  color: var(--accent-cyan);
  text-decoration: none;
}

.legal-section a:hover {
  text-decoration: underline;
}

.legal-footer-nav {
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-glow);
}

.back-link {
  color: var(--accent-cyan);
  text-decoration: none;
  font-weight: 500;
}

.back-link:hover {
  color: #fff;
}
</style>
