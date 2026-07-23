export interface SkillSEO {
  slug: string;
  name: string; // Именительный падеж ("Сайты на Тильде")
  nameInCase: string; // Винительный падеж для SEO ("Сайты на Тильде") - "Заказать {nameInCase}"
  shortName: string; // Короткое название для тегов ("Tilda")
  description: string;
}

export const SKILLS_LIST: SkillSEO[] = [
  {
    slug: 'tilda',
    name: 'Сайты на Тильде',
    nameInCase: 'сайт на Тильде',
    shortName: 'Tilda',
    description: 'Разработка лендингов, корпоративных сайтов и интернет-магазинов на платформе Tilda Publishing.'
  },
  {
    slug: 'figma',
    name: 'Дизайн в Figma',
    nameInCase: 'дизайн в Figma',
    shortName: 'Figma',
    description: 'Проектирование современных интерфейсов, макетов и прототипов в графическом редакторе Figma.'
  },
  {
    slug: 'zero-block',
    name: 'Верстка Zero Block',
    nameInCase: 'верстку в Zero Block',
    shortName: 'Zero Block',
    description: 'Создание уникального дизайна и нестандартной анимации с использованием Zero Block в Tilda.'
  },
  {
    slug: 'landing',
    name: 'Лендинги (Landing Page)',
    nameInCase: 'разработку лендинга',
    shortName: 'Landing',
    description: 'Проектирование и создание высококонверсионных посадочных страниц (Landing Page) под ключ.'
  },
  {
    slug: 'webflow',
    name: 'Разработка на Webflow',
    nameInCase: 'сайт на Webflow',
    shortName: 'Webflow',
    description: 'Создание профессиональных сайтов с уникальным дизайном и сложными анимациями на Webflow.'
  },
  {
    slug: 'ux-ui',
    name: 'UX/UI дизайн',
    nameInCase: 'UX/UI дизайн',
    shortName: 'UX/UI',
    description: 'Аналитика и проектирование удобных пользовательских интерфейсов для сайтов и приложений.'
  },
  {
    slug: 'ecommerce',
    name: 'Интернет-магазины',
    nameInCase: 'создание интернет-магазина',
    shortName: 'E-commerce',
    description: 'Разработка современных интернет-магазинов с каталогом, корзиной и онлайн-оплатой.'
  },
  {
    slug: 'logo',
    name: 'Дизайн логотипов',
    nameInCase: 'дизайн логотипа',
    shortName: 'Logo Design',
    description: 'Разработка уникальных, запоминающихся логотипов и фирменного стиля (айдентики) для бизнеса.'
  },
  {
    slug: 'banner',
    name: 'Дизайн баннеров',
    nameInCase: 'дизайн креативов и баннеров',
    shortName: 'Banners',
    description: 'Создание креативных баннеров для таргета, контекстной рекламы и социальных сетей.'
  },
  {
    slug: 'presentation',
    name: 'Дизайн презентаций',
    nameInCase: 'дизайн презентации',
    shortName: 'Presentations',
    description: 'Оформление продающих и стильных презентаций в PowerPoint, Keynote или Figma.'
  },
  {
    slug: 'redesign',
    name: 'Редизайн сайтов',
    nameInCase: 'редизайн сайта',
    shortName: 'Redesign',
    description: 'Обновление устаревшего дизайна сайта для улучшения конверсии и поведенческих факторов.'
  },
  {
    slug: 'seo',
    name: 'SEO-оптимизация',
    nameInCase: 'SEO-оптимизацию',
    shortName: 'SEO',
    description: 'Внутренняя и внешняя оптимизация сайтов для продвижения на первые позиции в Яндекс и Google.'
  },
  {
    slug: 'copywriting',
    name: 'Копирайтинг',
    nameInCase: 'SEO-копирайтинг',
    shortName: 'Copywriting',
    description: 'Написание продающих, информационных и SEO-оптимизированных текстов для сайтов и блогов.'
  },
  {
    slug: 'mobile-app',
    name: 'Дизайн мобильных приложений',
    nameInCase: 'дизайн мобильного приложения',
    shortName: 'App Design',
    description: 'Проектирование интерфейсов для мобильных приложений на iOS и Android.'
  },
  {
    slug: '3d-design',
    name: '3D-графика',
    nameInCase: '3D-моделирование',
    shortName: '3D Design',
    description: 'Создание абстрактной 3D-графики, анимаций и моделей для современных сайтов.'
  }
];
