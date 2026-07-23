export default defineNuxtPlugin(() => {
  // Do not load Metrika during development
  if (import.meta.env.DEV) return;

  const router = useRouter();
  let isLoaded = false;
  
  const loadMetrika = () => {
    if (isLoaded) return;
    isLoaded = true;

    // Load Yandex Metrica Script asynchronously
    (function(m: any,e: any,t: string,r: string,i: string,k?: any,a?: any){
      m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
      m[i].l=1*(new Date() as any);
      for (var j = 0; j < document.scripts.length; j++) {
        if (document.scripts[j].src === r) { return; }
      }
      k=e.createElement(t);
      a=e.getElementsByTagName(t)[0];
      k.async=1;
      k.src=r;
      a.parentNode.insertBefore(k,a);
    })(window, document, 'script', '/metrika.js', 'ym');
    
    (window as any).ym(110952885, 'init', {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      webvisor: true,
      ecommerce: "dataLayer"
    });
  };

  // Lazy load strategy to achieve 100/100 PageSpeed and avoid "Forced Synchronous Layout"
  // 1. Load after 3500ms timeout
  const timeoutId = setTimeout(loadMetrika, 3500);

  // 2. Load immediately on first user interaction (scroll, click, mousemove, touch)
  const loadOnInteraction = () => {
    loadMetrika();
    clearTimeout(timeoutId);
    ['scroll', 'mousemove', 'touchstart', 'click', 'keydown'].forEach(evt => {
      document.removeEventListener(evt, loadOnInteraction);
    });
  };

  ['scroll', 'mousemove', 'touchstart', 'click', 'keydown'].forEach(evt => {
    document.addEventListener(evt, loadOnInteraction, { once: true, passive: true });
  });

  // Track SPA route changes dynamically in Yandex.Metrika
  router.afterEach((to) => {
    if (typeof window !== 'undefined') {
      if ((window as any).ym) {
        (window as any).ym(110952885, 'hit', to.fullPath);
      } else {
        // If navigation occurs before Metrika loads, delay hit slightly
        setTimeout(() => {
          if ((window as any).ym) (window as any).ym(110952885, 'hit', to.fullPath);
        }, 3600);
      }
    }
  });
});
