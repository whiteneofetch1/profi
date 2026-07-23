export default defineNuxtPlugin(() => {
  const router = useRouter();

  // Track SPA route changes dynamically in Yandex.Metrika
  router.afterEach((to) => {
    if (typeof window !== 'undefined' && (window as any).ym) {
      (window as any).ym(110952885, 'hit', to.fullPath);
    }
  });
});
