import { defineStore } from 'pinia';
import { useAuthStore } from './auth';

export interface CartItem {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  avatarSymbol: string;
}

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [] as CartItem[],
    drawerOpen: false,
    flatPrice: 500,
    bundleCount: 5,
    bundlePrice: 2000,
  }),

  getters: {
    count: (state) => state.items.length,
    totalPrice: (state) => {
      const count = state.items.length;
      if (count === 0) return 0;

      // Apply package pricing logic
      if (count >= state.bundleCount) {
        const bundles = Math.floor(count / state.bundleCount);
        const remainder = count % state.bundleCount;
        return (bundles * state.bundlePrice) + (remainder * state.flatPrice);
      }
      return count * state.flatPrice;
    }
  },

  actions: {
    toggleDrawer(open?: boolean) {
      this.drawerOpen = open !== undefined ? open : !this.drawerOpen;
    },

    addItem(item: CartItem) {
      if (this.items.find(i => i.id === item.id)) {
        this.toggleDrawer(true);
        return 'already_in_cart';
      }
      this.items.push(item);
      this.toggleDrawer(true);
      return 'added';
    },

    removeItem(id: string) {
      this.items = this.items.filter(i => i.id !== id);
    },

    clearCart() {
      this.items = [];
    },

    isInCart(id: string) {
      return !!this.items.find(i => i.id === id);
    },

    async checkout(email?: string) {
      const config = useRuntimeConfig();
      const auth = useAuthStore();

      const payload: any = {
        devProfileIds: this.items.map(i => i.id),
      };

      if (!auth.isAuthenticated && email) {
        payload.email = email;
      }

      try {
        const response = await $fetch<any>(`${config.public.apiUrl}/checkout/create`, {
          method: 'POST',
          body: payload,
        });

        if (response && response.success) {
          // If guest token returned (for guest checkouts), store it in cookie & refetch user
          if (response.guestToken) {
            const tokenCookie = useCookie('token');
            tokenCookie.value = response.guestToken;
            await auth.fetchUser();
          }

          // Clear local cart
          this.clearCart();
          this.toggleDrawer(false);

          // Redirect to external mock payment gateway
          // URL is relative to backend. We expand it dynamically to backend URL
          const gatewayUrl = `${config.public.apiUrl}${response.paymentUrl}`;
          window.location.href = gatewayUrl;
          return { success: true };
        }
      } catch (err: any) {
        throw new Error(err.data?.error || 'Failed to initialize payment transaction');
      }
    }
  }
});
