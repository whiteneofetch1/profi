import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding (30+ Tilda Web Designers)...');

  // 1. Clean existing records
  await prisma.unlockedProfile.deleteMany({});
  await prisma.purchase.deleteMany({});
  await prisma.platformConfig.deleteMany({});
  await prisma.devProfile.deleteMany({});
  await prisma.clientProfile.deleteMany({});
  await prisma.user.deleteMany({});

  const passwordHash = await bcrypt.hash('securepassword2026', 10);

  // 2. Create Platform Configuration
  const config = await prisma.platformConfig.create({
    data: {
      flatRatePrice: 500,
      bundleCount: 5,
      bundlePrice: 2000,
    },
  });
  console.log('✅ Created PlatformConfig:', config);

  // 3. Create Admin account
  await prisma.user.create({
    data: {
      email: 'admin@fyxi.ru',
      passwordHash: await bcrypt.hash('admin_pass_2026', 10),
      role: 'ADMIN',
    },
  });
  console.log('✅ Created Admin user');

  // 4. Detailed premium Tilda Designers data array (30 profiles)
  const designersData = [
    {
      firstName: 'Александра',
      lastName: 'Власова',
      title: 'Senior Tilda & Zero Block Expert',
      bio: 'Проектирую сложные промо-страницы, интернет-магазины и CRM-системы на Tilda. 6 лет опыта в веб-дизайне. Специализируюсь на продвинутой пошаговой анимации (Step-by-Step) и интеграции внешнего JS-кода.',
      experienceYears: 6,
      skills: ['Tilda', 'Zero Block', 'Step-by-Step Animation', 'Custom JS/CSS', 'UX/UI', 'Figma'],
      portfolioLinks: ['behance.net/aleksandra_tilda', 'aleksandra-web.tilda.ws'],
      hourlyRate: 2500,
      monthlySalary: 180000,
      availability: 'FREE' as const,
      isVerified: true,
      email: 'alex.vlasova@fyxi.ru',
      telegram: '@alex_vlas_design',
      phone: '+7 (903) 123-45-67',
    },
    {
      firstName: 'Дмитрий',
      lastName: 'Петров',
      title: 'UX/UI Designer & Tilda Developer',
      bio: 'Создаю аккуратные лендинги и корпоративные сайты с упором на конверсию и чистую типографику. Настраиваю корзины, личные кабинеты, платежные шлюзы (ЮKassa, Robokassa) и интеграции с CRM.',
      experienceYears: 4,
      skills: ['Tilda', 'Zero Block', 'Figma', 'E-commerce', 'Payment Gateways', 'CRM Integration'],
      portfolioLinks: ['behance.net/dmitry_tilda', 'dmitry-digital.tilda.ws'],
      hourlyRate: 1800,
      monthlySalary: 130000,
      availability: 'OPEN_FOR_OFFERS' as const,
      isVerified: true,
      email: 'dmitry.petrov@fyxi.ru',
      telegram: '@dmitry_tilda_dev',
      phone: '+7 (916) 765-43-21',
    },
    {
      firstName: 'Елена',
      lastName: 'Соколова',
      title: 'Tilda Designer & Landing Page Expert',
      bio: 'Специалист по продающим посадочным страницам для бизнеса. Разрабатываю уникальный дизайн в Zero Block, адаптирую под мобильные устройства, настраиваю базовую SEO-оптимизацию и аналитику.',
      experienceYears: 3,
      skills: ['Tilda', 'Zero Block', 'Mobile Adaptation', 'Google Analytics', 'Yandex Metrika', 'SEO'],
      portfolioLinks: ['behance.net/elena_sokolova', 'elena-landing.tilda.ws'],
      hourlyRate: 1500,
      monthlySalary: 110000,
      availability: 'FREE' as const,
      isVerified: false,
      email: 'elena.soko@fyxi.ru',
      telegram: '@elena_sokolova_design',
      phone: '+7 (925) 345-67-89',
    },
    {
      firstName: 'Максим',
      lastName: 'Волков',
      title: 'Fullstack Tilda Creator (CSS/JS)',
      bio: 'Интегрирую сложные скрипты в Tilda, расширяя стандартный функционал Zero Block. Пишу кастомные слайдеры, калькуляторы стоимости, фильтры товаров и модифицирую стандартные блоки Tilda.',
      experienceYears: 5,
      skills: ['Tilda', 'Zero Block', 'Custom JS/CSS', 'HTML Injection', 'Calculators', 'API Integrations'],
      portfolioLinks: ['github.com/max_code', 'max-scripts.tilda.ws'],
      hourlyRate: 2200,
      monthlySalary: 160000,
      availability: 'BUSY' as const,
      isVerified: true,
      email: 'max.volkov@fyxi.ru',
      telegram: '@max_tilda_code',
      phone: '+7 (909) 111-22-33',
    },
    {
      firstName: 'Анна',
      lastName: 'Кузнецова',
      title: 'E-Commerce Tilda Specialist',
      bio: 'Специализируюсь на создании крупных интернет-магазинов на платформе Tilda. Настраиваю каталоги товаров, фильтры, личные кабинеты покупателей, промокоды и интеграции со службами доставки (СДЭК, Почта).',
      experienceYears: 4,
      skills: ['Tilda', 'Zero Block', 'E-commerce', 'Delivery Integrations', 'Client Cabinets', 'SEO'],
      portfolioLinks: ['behance.net/anna_shop_design', 'anna-stores.tilda.ws'],
      hourlyRate: 1900,
      monthlySalary: 140000,
      availability: 'FREE' as const,
      isVerified: true,
      email: 'anna.kuzn@fyxi.ru',
      telegram: '@anna_tilda_stores',
      phone: '+7 (912) 345-67-80',
    },
    {
      firstName: 'Михаил',
      lastName: 'Смирнов',
      title: 'Tilda Animator & Motion Designer',
      bio: 'Делаю сайты, которые оживают! Премиальная интерактивная step-by-step анимация, триггерная анимация на Zero Block. Повышаю вовлеченность посетителей сайта за счет крутого интерактивного визуала.',
      experienceYears: 5,
      skills: ['Tilda', 'Zero Block', 'Motion Design', 'Step-by-Step Animation', 'Trigger Effects', 'SVG'],
      portfolioLinks: ['behance.net/mihail_motion', 'motion-studio.tilda.ws'],
      hourlyRate: 2400,
      monthlySalary: 170000,
      availability: 'OPEN_FOR_OFFERS' as const,
      isVerified: true,
      email: 'mihail.smir@fyxi.ru',
      telegram: '@mihail_motion_tilda',
      phone: '+7 (915) 888-99-00',
    },
    // Adding more realistic profiles to reach 30 unique Tilda specialists
    {
      firstName: 'Мария',
      lastName: 'Новикова',
      title: 'Tilda Web Designer (Clean & Minimalist)',
      bio: 'Сторонник аккуратного минимализма. Разрабатываю стильные сайты для архитекторов, юристов, фотографов и премиум-брендов. Каждая деталь интерфейса выверена до пикселя.',
      experienceYears: 3,
      skills: ['Tilda', 'Zero Block', 'Minimalism', 'Typography', 'Figma', 'Grid Systems'],
      portfolioLinks: ['behance.net/maria_minimal', 'minimal-art.tilda.ws'],
      hourlyRate: 1600,
      monthlySalary: 120000,
      availability: 'FREE' as const,
      isVerified: false,
      email: 'maria.novikova@fyxi.ru',
      telegram: '@maria_minimal_design',
      phone: '+7 (911) 222-33-44',
    },
    {
      firstName: 'Кирилл',
      lastName: 'Морозов',
      title: 'Tilda & Marketing Specialist',
      bio: 'Я не просто рисую дизайн — я создаю инструмент для привлечения лидов. Провожу конкурентный анализ, составляю смысловую структуру (прототип) и только потом упаковываю в стильный Zero Block.',
      experienceYears: 4,
      skills: ['Tilda', 'Zero Block', 'Copywriting', 'Marketing Research', 'A/B Testing', 'Yandex Direct'],
      portfolioLinks: ['behance.net/kirill_marketing', 'marketing-pro.tilda.ws'],
      hourlyRate: 2000,
      monthlySalary: 150000,
      availability: 'FREE' as const,
      isVerified: true,
      email: 'kirill.morozov@fyxi.ru',
      telegram: '@kirill_marketing_tilda',
      phone: '+7 (920) 444-55-66',
    },
    {
      firstName: 'Ольга',
      lastName: 'Федорова',
      title: 'Lead UI/UX & Tilda Designer',
      bio: 'Разрабатываю интуитивно понятные пользовательские пути. Мои сайты на Tilda выглядят как дорогие кастомные веб-приложения за счет продуманного UI-кита и кастомной сетки.',
      experienceYears: 7,
      skills: ['Tilda', 'Zero Block', 'UX Research', 'UI Kit', 'Figma', 'Prototyping'],
      portfolioLinks: ['behance.net/olga_ux_lead', 'olga-ux.tilda.ws'],
      hourlyRate: 3000,
      monthlySalary: 210000,
      availability: 'OPEN_FOR_OFFERS' as const,
      isVerified: true,
      email: 'olga.fed@fyxi.ru',
      telegram: '@olga_ux_tilda',
      phone: '+7 (926) 555-77-88',
    },
    {
      firstName: 'Артем',
      lastName: 'Павлов',
      title: 'Tilda Developer & CRM Specialist',
      bio: 'Настраиваю сложные сквозные интеграции Tilda сamoCRM, Bitrix24, МойСклад. Автоматизирую отправку уведомлений в Telegram/Email, подключаю сервисы рассылок (Mindbox, Unisender).',
      experienceYears: 5,
      skills: ['Tilda', 'CRM (amo/Bitrix)', 'Webhook Integrations', 'Automation', 'Payment Gateways', 'Forms'],
      portfolioLinks: ['behance.net/artem_crm', 'artem-integrations.tilda.ws'],
      hourlyRate: 2100,
      monthlySalary: 155000,
      availability: 'BUSY' as const,
      isVerified: false,
      email: 'artem.pavlov@fyxi.ru',
      telegram: '@artem_crm_pro',
      phone: '+7 (999) 777-66-55',
    },
    // We populate remaining 20 items programmatically with varied details to guarantee high variety
    ...Array.from({ length: 20 }).map((_, index) => {
      const idx = index + 11;
      const names = [
        { f: 'София', l: 'Иванова', t: 'Junior Tilda Designer', skill: 'Tilda, Zero Block, Figma, Adobe Photoshop', bio: 'Начинающий веб-дизайнер с горящими глазами. Делаю аккуратные, лаконичные сайты-визитки и лендинги на Tilda. Быстро вношу правки, всегда на связи.' },
        { f: 'Роман', l: 'Козлов', t: 'Tilda Landing Producer', skill: 'Tilda, Zero Block, Copywriting, SEO, Analytics', bio: 'Создаю конверсионные лендинги "под ключ": от идеи и маркетингового анализа до готовой верстки на Tilda с адаптацией под все мобильные устройства.' },
        { f: 'Екатерина', l: 'Павлова', t: 'Web Designer (Tilda Zero Block)', skill: 'Tilda, Zero Block, Vector Graphics, Figma, Animation', bio: 'Создаю яркие и запоминающиеся сайты с авторскими иллюстрациями и плавной пошаговой анимацией. Помогаю брендам выделиться на фоне конкурентов.' },
        { f: 'Илья', l: 'Макаров', t: 'Fullstack Tilda Engineer', skill: 'Tilda, Zero Block, JavaScript, CSS customization, API', bio: 'Дорабатываю сайты на Tilda с помощью кода (HTML, CSS, JS). Создаю нестандартные фильтры, личные кабинеты и кастомный дизайн стандартных блоков.' },
        { f: 'Виктория', l: 'Зайцева', t: 'UX/UI Designer & Tilda Specialist', skill: 'Tilda, Zero Block, UX/UI, Wireframing, Figma', bio: 'Веб-дизайнер с художественным образованием. Разрабатываю удобные и красивые сайты на Tilda. Делаю упор на удобство интерфейса для конечного пользователя.' },
      ];
      
      const selectName = names[index % names.length];
      const experience = 1 + (index % 5);
      const isVerified = (index % 3) === 0;
      const availability = (index % 3 === 0) ? 'FREE' : (index % 3 === 1 ? 'OPEN_FOR_OFFERS' : 'BUSY');
      const hourly = 1000 + (index * 100);
      const monthly = 80000 + (index * 5000);

      return {
        firstName: `${selectName.f} ${idx}`, // Add index to make names unique
        lastName: selectName.l,
        title: `${selectName.t} (v${idx})`,
        bio: `${selectName.bio} Успешно реализовал более ${5 + index} проектов.`,
        experienceYears: experience,
        skills: selectName.skill.split(', '),
        portfolioLinks: [`behance.net/designer_tilda_${idx}`, `portfolio-${idx}.tilda.ws`],
        hourlyRate: hourly,
        monthlySalary: monthly,
        availability: availability as 'FREE' | 'BUSY' | 'OPEN_FOR_OFFERS',
        isVerified,
        email: `designer_${idx}@fyxi.ru`,
        telegram: `@designer_tg_${idx}`,
        phone: `+7 (930) 555-00-${idx.toString().padStart(2, '0')}`,
      };
    })
  ];

  // 5. Save all to DB
  for (const item of designersData) {
    const user = await prisma.user.create({
      data: {
        email: item.email,
        passwordHash,
        role: 'DEVELOPER',
      },
    });

    await prisma.devProfile.create({
      data: {
        userId: user.id,
        firstName: item.firstName,
        lastName: item.lastName,
        title: item.title,
        specialization: 'DESIGNER', // Setting them all as Tilda Designers (DESIGNER specialization)
        bio: item.bio,
        experienceYears: item.experienceYears,
        skills: item.skills,
        portfolioLinks: item.portfolioLinks,
        hourlyRate: item.hourlyRate,
        monthlySalary: item.monthlySalary,
        availability: item.availability,
        isVerified: item.isVerified,
        isApproved: true, // Auto-approve them for catalog fullness
        contactEmail: item.email,
        contactTelegram: item.telegram,
        contactPhone: item.phone,
      },
    });
  }

  console.log(`🌱 Seeding process completed. Successfully imported ${designersData.length} premium Tilda Designers!`);

  // 6. SEED BLOGPOST COLLECTION (100 REALISTIC, HIGH-QUALITY SEO ARTICLES WITH SCHEDULED DATES)
  console.log('🌱 Starting blog post seeding (100 highly realistic SEO articles)...');
  await prisma.blogPost.deleteMany({});

  const categories = ['Экономика найма', 'Дизайн', 'Технологии', 'Маркетинг', 'Оптимизация'];
  const authors = [
    { name: 'Алексей Миронов', role: 'CEO fyxi.ru' },
    { name: 'Екатерина Романова', role: 'Lead UI/UX Art Director' },
    { name: 'Илья Макаров', role: 'Lead Tilda Developer' },
    { name: 'Александра Власова', role: 'Senior Animation Specialist' },
    { name: 'Максим Волков', role: 'Fullstack Tilda Creator' }
  ];

  const coreTopics = [
    {
      subject: 'оптимизации бюджетов на IT-рекрутинг',
      verbs: ['сократить расходы', 'сэкономить до 300%', 'избежать скрытых наценок', 'оптимизировать ФОТ'],
      points: [
        'Посредники забирают до 25% годового ФОТ специалиста.',
        'Модель Pay-Per-Contact убирает кадровые агентства из цепочки.',
        'Прямое общение с дизайнерами ускоряет согласование правок в 5 раз.',
        'Риски ухода специалиста снижаются за счет прямого контроля и личной мотивации.'
      ]
    },
    {
      subject: 'создания интерактивной пошаговой анимации в Zero Block',
      verbs: ['раскрыть секреты', 'настроить Step-by-Step', 'повысить вовлеченность', 'улучшить UX/UI'],
      points: [
        'Анимация должна быть умеренной и плавной (easing).',
        'Обязательное отключение тяжелых триггеров на мобильных устройствах.',
        'Использование скролл-анимации для удержания внимания на ключевых блоках.',
        'Интеграция SVG-форм для создания неповторимого визуального стиля бренда.'
      ]
    },
    {
      subject: 'ускорения загрузки сайтов на Tilda до зеленых зон PageSpeed',
      verbs: ['оптимизировать скорость', 'войти в зеленую зону Google', 'сжать тяжелую графику', 'вычистить CSS'],
      points: [
        'Конвертация всех изображений в современный формат WebP/AVIF.',
        'Отложенная загрузка (Lazy Loading) для блоков, находящихся ниже первого экрана.',
        'Удаление неиспользуемых кастомных шрифтов и лишних внешних скриптов.',
        'Правильная настройка CDN и серверного кэширования для ускорения первого ответа.'
      ]
    },
    {
      subject: 'подбора квалифицированного Senior Vue 3 / Nuxt 3 разработчика',
      verbs: ['проверить навыки', 'задавать правильные вопросы', 'найти сильного инженера', 'провести аудит резюме'],
      points: [
        'Проверка понимания реактивности, Virtual DOM и Composition API.',
        'Вопросы про стейт-менеджмент (Pinia) и гидратацию при SSR.',
        'Разбор опыта оптимизации Core Web Vitals и настройки серверного кэширования.',
        'Оценка умения интегрировать внешние API и работать с REST/GraphQL эндпоинтами.'
      ]
    },
    {
      subject: 'создания высококонверсионных интернет-магазинов',
      verbs: ['запустить продажи', 'настроить личные кабинеты', 'интегрировать платежи', 'подключить CRM'],
      points: [
        'Интеграция популярных шлюзов: ЮKassa, Robokassa, СБП.',
        'Создание удобного и интуитивно понятного интерфейса корзины и чекаута.',
        'Настройка сквозной аналитики и отслеживания брошенных корзин.',
        'Автоматический экспорт заказов в популярные CRM (AmoCRM, Bitrix24).'
      ]
    }
  ];

  const blogPosts = [];

  for (let i = 1; i <= 100; i++) {
    const topicIdx = i % coreTopics.length;
    const authorIdx = i % authors.length;
    const catIdx = i % categories.length;

    const topic = coreTopics[topicIdx];
    const author = authors[authorIdx];
    const category = categories[catIdx];

    const verb = topic.verbs[i % topic.verbs.length];
    
    // Construct rich, unique, professional title
    const titleVal = i % 2 === 0
      ? `Как ${verb} при помощи ${topic.subject}: подробное руководство (часть ${Math.floor(i / 10) + 1})`
      : `Топ-${5 + (i % 6)} способов ${verb} в процессе ${topic.subject}`;

    // Clean dynamic slug
    const baseSlug = titleVal
      .toLowerCase()
      .replace(/[^a-zа-я0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 50);
    const slugVal = `${baseSlug}-${i}`;

    const descriptionVal = `Профессиональный разбор темы: как ${verb} в сфере ${topic.subject}. Читайте советы эксперта ${author.name} (${author.role}) специально для платформы fyxi.ru.`;

    // Construct highly unique content with heading anchors, lists, blockquotes and styled divs
    const contentVal = `
      <p>В современных условиях рынка, правильный подход в сфере <strong>${topic.subject}</strong> является решающим фактором конкурентоспособности любого диджитал-проекта. В данной статье мы разберем ключевые методики, которые позволяют качественно решить эту задачу.</p>
      
      <h2 id="key-insights-${i}">Ключевые инсайты и проблемы</h2>
      <p>Большинство компаний совершают типичные ошибки из-за отсутствия системного подхода. Ниже представлены проверенные тезисы, на которые стоит обратить внимание в первую очередь:</p>
      
      <ul>
        <li><strong>${topic.points[0]}</strong> Это подтверждает многолетняя статистика крупных коммерческих релизов.</li>
        <li><strong>${topic.points[1]}</strong> Такой шаг существенно развязывает руки внутренней команде разработки.</li>
        <li><strong>${topic.points[2]}</strong> Скорость и гибкость коммуникации напрямую влияют на конечный Time-to-Market.</li>
        <li><strong>${topic.points[3]}</strong> Сильные специалисты ценят прозрачность отношений и прямое партнерство.</li>
      </ul>

      <blockquote>
        Мнение эксперта: "Когда мы проектировали эти процессы на платформе fyxi.ru, нашей главной целью было убрать лишнее трение и дать бизнесу прямой, чистый и скоростной инструмент взаимодействия с топ-исполнителями." — <em>${author.name}, ${author.role}</em>
      </blockquote>

      <h2 id="step-by-step-strategy-${i}">Пошаговая стратегия внедрения</h2>
      <p>Чтобы запустить процесс оптимизации прямо сейчас, мы рекомендуем выполнить следующие три шага:</p>
      <ol>
        <li>Проведите независимый аудит ваших текущих показателей и выявите наиболее уязвимые зоны в процессах.</li>
        <li>Используйте децентрализованные инструменты прямого поиска и подбора специалистов, минуя дорогостоящих классических рекрутеров.</li>
        <li>Настройте сквозные метрики контроля качества на каждом этапе выполнения работ, чтобы вовремя корректировать стратегию.</li>
      </ol>

      <p>Внедрение этих простых, но крайне эффективных шагов гарантирует ощутимый прирост эффективности и экономию бюджетов до 30-40% уже на первом месяце работы.</p>
    `;

    const readTimeVal = `${5 + (i % 8)} мин`;
    const keywordsVal = [
      category.toLowerCase(),
      'fyxi',
      'tilda',
      topic.verbs[0].toLowerCase(),
      `разработка-${i}`
    ];

    // Spacing out publishDates:
    // 1 to 30: published in the past (June/July 2026)
    // 31 to 100: published in the future (1 post every 2 days)
    let publishDateVal: Date;
    if (i <= 30) {
      publishDateVal = new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000);
    } else {
      publishDateVal = new Date(Date.now() + (i - 30) * 2 * 24 * 60 * 60 * 1000);
    }

    blogPosts.push({
      slug: slugVal,
      title: titleVal,
      description: descriptionVal,
      category,
      readTime: readTimeVal,
      author: author.name,
      authorRole: author.role,
      keywords: keywordsVal,
      content: contentVal,
      publishDate: publishDateVal
    });
  }

  // Bulk save blog posts
  for (const post of blogPosts) {
    await prisma.blogPost.create({
      data: post
    });
  }

  console.log(`🌱 Seeding completed! Successfully generated and imported ${blogPosts.length} dynamic SEO articles into the database!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
