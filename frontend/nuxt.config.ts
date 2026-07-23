// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@pinia/nuxt',
    '@vueuse/nuxt',
  ],

  css: [
    '~/assets/css/main.css'
  ],

  // HYBRID RENDERING ENGINE + SWR SERVER CACHE (Fulfills exact SEO speed optimization + SPA cabinets)
  routeRules: {
    // Automatic backend proxy rule for /api requests (bypasses Nginx config issues)
    '/api/**': { proxy: 'http://127.0.0.1:5010/api/**' },

    // Stale-While-Revalidate (SWR) for Articles & Blog (Cached for 1 hour on server-side)
    '/blog': { swr: 3600 },
    '/blog/**': { swr: 3600 },
    
    // Stale-While-Revalidate (SWR) for Homepage & Profile pages (Cached for 10 minutes)
    '/': { swr: 600 },
    '/profiles/**': { swr: 600 },
    
    // Server sitemap.xml caching (Saves DB queries under search spider harvesting, cached for 1 hour)
    '/sitemap.xml': { swr: 3600 },
    
    // Client-Side Rendering (SPA) for Dashboard cabinets where SEO is irrelevant
    '/cabinet/**': { ssr: false },
    '/admin/**': { ssr: false },
  },

  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL || process.env.PUBLIC_API_URL || 'http://localhost:5010/api'
    }
  },

  app: {
    head: {
      title: 'fyxi — Премиальный маркетплейс дизайнеров и разработчиков',
      htmlAttrs: {
        lang: 'ru'
      },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'fyxi.ru — маркетплейс проверенных веб-дизайнеров и разработчиков Zero Block. Покупайте прямые контакты специалистов без комиссий.' },
        { name: 'format-detection', content: 'telephone=no' },
        
        // OpenGraph SEO Meta Tags
        { property: 'og:site_name', content: 'fyxi' },
        { property: 'og:type', content: 'website' },
        { property: 'og:locale', content: 'ru_RU' },
        { property: 'og:title', content: 'fyxi — Премиальный маркетплейс дизайнеров и разработчиков Tilda' },
        { property: 'og:description', content: 'Каталог топовых веб-дизайнеров и разработчиков Zero Block. Покупайте прямые контакты специалистов без комиссий и переплат на fyxi.ru.' },
        { property: 'og:image', content: '/og-image.jpg' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { name: 'theme-color', content: '#030303' }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'alternate icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap' },
        { rel: 'alternate', type: 'application/rss+xml', title: 'fyxi.ru RSS Feed', href: '/feed.xml' }
      ],
      script: [
        {
          innerHTML: `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=110952885', 'ym');ym(110952885, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});`,
          type: 'text/javascript'
        }
      ],
      noscript: [
        {
          innerHTML: '<div><img src="https://mc.yandex.ru/watch/110952885" style="position:absolute; left:-9999px;" alt="" /></div>'
        }
      ]
    }
  },

  devtools: { enabled: false }
})
