export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:chunkError', () => {
    window.location.reload();
  });

  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      if (
        event.message &&
        (event.message.includes('error loading dynamically imported module') ||
         event.message.includes('Failed to fetch dynamically imported module'))
      ) {
        window.location.reload();
      }
    });
  }
});
