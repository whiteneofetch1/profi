export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();

  async function reportErrorToBackend(message: string, stack?: string, level: string = 'ERROR') {
    try {
      await $fetch(`${config.public.apiUrl}/admin/errors/log`, {
        method: 'POST',
        body: {
          message,
          stack: stack || null,
          source: 'FRONTEND',
          path: window.location.pathname,
          level,
        },
      });
    } catch (err) {
      // Fail silently to avoid infinite error reporting loops
    }
  }

  // 1. Vue Global Error Handler
  nuxtApp.vueApp.config.errorHandler = (error: any, instance, info) => {
    // Ignore standard 404 Not Found errors to prevent log clutter
    if (error?.statusCode === 404 || error?.status === 404 || error?.message?.includes('404') || error?.message === 'Статья не найдена') {
      return;
    }
    const errorMsg = error?.message || String(error);
    const stack = error?.stack || `Vue Error Info: ${info}`;
    reportErrorToBackend(`Vue Exception: ${errorMsg}`, stack, 'ERROR');
  };

  // 2. Global Unhandled JS Window Errors
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      if (event.error) {
        if (event.error.statusCode === 404 || event.error.status === 404) return;
        reportErrorToBackend(event.error.message || 'Window Error', event.error.stack, 'ERROR');
      }
    });

    // 3. Global Unhandled Promise Rejections
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      if (reason?.statusCode === 404 || reason?.status === 404) return;
      const message = reason?.message || String(reason || 'Unhandled Promise Rejection');
      const stack = reason?.stack || null;
      reportErrorToBackend(`Promise Rejection: ${message}`, stack, 'WARN');
    });
  }
});
