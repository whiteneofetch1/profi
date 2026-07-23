import { defineStore } from 'pinia';

interface User {
  id: string;
  email: string;
  role: 'CLIENT' | 'DEVELOPER' | 'ADMIN';
  lastActive?: string;
  devProfile?: any;
  clientProfile?: any;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    loading: false,
  }),
  
  getters: {
    isAuthenticated: (state) => !!state.user,
    isClient: (state) => state.user?.role === 'CLIENT',
    isDeveloper: (state) => state.user?.role === 'DEVELOPER',
    isAdmin: (state) => state.user?.role === 'ADMIN',
  },

  actions: {
    async fetchUser() {
      const config = useRuntimeConfig();
      this.loading = true;
      try {
        const data = await $fetch<any>(`${config.public.apiUrl}/auth/me`, {
          headers: {
            // Under Caddy, cookies are forwarded automatically
            'Accept': 'application/json',
          },
        });
        if (data && data.user) {
          this.user = data.user;
        }
      } catch (err) {
        // Not logged in or expired cookie
        this.user = null;
      } finally {
        this.loading = false;
      }
    },

    setUser(user: User | null) {
      this.user = user;
    },

    async logout() {
      const config = useRuntimeConfig();
      try {
        await $fetch(`${config.public.apiUrl}/auth/logout`, { method: 'POST' });
      } catch (err) {
        // Log out clean anyway
      } finally {
        this.user = null;
        navigateTo('/');
      }
    }
  }
});
