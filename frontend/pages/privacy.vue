<script setup lang="ts">
const url = useRequestURL();

useSeoMeta({
  title: 'Политика конфиденциальности | fyxi.ru',
  description: 'Политика обработки персональных данных платформы fyxi.ru в соответствии с Федеральным законом РФ № 152-ФЗ «О персональных данных».',
  ogTitle: 'Политика конфиденциальности | fyxi.ru',
  ogDescription: 'Правила обработки и защиты персональных данных пользователей на fyxi.ru.',
  ogImage: '/og-image.jpg',
});

useHead({
  link: [{ rel: 'canonical', href: `${url.origin}/privacy` }],
});
</script>

<template>
  <div class="legal-page">
    <div class="legal-container">
      <div class="legal-header">
        <h1>Политика конфиденциальности</h1>
        <p class="effective-date">Дата вступления в силу: 1 июня 2026 г. | Домен: fyxi.ru</p>
      </div>

      <div class="legal-body">
        <section class="legal-section">
          <h2>1. Общие положения</h2>
          <p>Настоящая Политика обработки персональных данных (далее — «Политика») составлена в соответствии с требованиями Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных» и определяет порядок обработки персональных данных и меры по обеспечению безопасности персональных данных, предпринимаемые администрацией платформы <strong>fyxi.ru</strong> (далее — «Оператор»).</p>
          <p>Оператор ставит своей важнейшей целью и условием осуществления своей деятельности соблюдение прав и свобод человека и гражданина при обработке его персональных данных, в том числе защиты прав на неприкосновенность частной жизни, личную и семейную тайну.</p>
        </section>

        <section class="legal-section">
          <h2>2. Основные понятия</h2>
          <ul>
            <li><strong>Персональные данные</strong> — любая информация, относящаяся к прямо или косвенно определенному или определяемому физическому лицу (субъекту персональных данных).</li>
            <li><strong>Обработка персональных данных</strong> — любое действие (операция) или совокупность действий (операций), совершаемых с использованием средств автоматизации или без использования таких средств с персональными данными.</li>
            <li><strong>Маркетплейс fyxi.ru</strong> — совокупность программно-аппаратных средств, веб-ресурса по адресу https://fyxi.ru.</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>3. Какие данные мы обрабатываем</h2>
          <p>Оператор обрабатывает следующие категории данных:</p>
          <ul>
            <li>Адрес электронной почты (Email);</li>
            <li>Имя, фамилия и контактные данные специалиста (Telegram, телефон);</li>
            <li>История оформленных заказов и разблокированных контактов;</li>
            <li>Обезличенные данные о посетителях (в т.ч. файлы «cookie») с помощью сервисов интернет-статистики (Яндекс Метрика).</li>
          </ul>
        </section>

        <section class="legal-section">
          <h2>4. Цели обработки данных</h2>
          <p>Цель обработки персональных данных Пользователя — предоставление доступа Пользователю к сервисам, информации и/или материалам, содержащимся на веб-сайте, обеспечение прямой связи между заказчиками и исполнителями, а также исполнение обязательств по договору купли-продажи контактов.</p>
        </section>

        <section class="legal-section">
          <h2>5. Защита и хранение данных</h2>
          <p>Оператор обеспечивает сохранность персональных данных и принимает все возможные меры, исключающие доступ к персональным данным неуполномоченных лиц. Персональные данные Пользователя никогда, ни при каких условиях не будут переданы третьим лицам, за исключением случаев, связанных с исполнением действующего законодательства РФ.</p>
        </section>

        <section class="legal-section">
          <h2>6. Контакты Оператора</h2>
          <p>По всем вопросам, связанным с обработкой персональных данных, вы можете связаться с администрацией платформы по электронной почте: <a href="mailto:admin@fyxi.ru">admin@fyxi.ru</a>.</p>
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
  font-size: 2.5rem;
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

.back-link:hover {
  color: #fff;
}

@media (max-width: 768px) {
  .legal-page {
    padding: 2rem 1.25rem;
  }
  .legal-card {
    padding: 1.5rem 1.25rem;
  }
  .legal-header h1 {
    font-size: 1.8rem;
  }
}
</style>
