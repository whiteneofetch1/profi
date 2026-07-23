import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCartStore } from '../stores/cart';

describe('Pinia Cart Store & Volume Discount Calculation E2E Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should initialize with empty cart state and drawer closed', () => {
    const cart = useCartStore();
    expect(cart.items).toEqual([]);
    expect(cart.count).toBe(0);
    expect(cart.totalPrice).toBe(0);
    expect(cart.drawerOpen).toBe(false);
  });

  it('should add unique items to cart and open drawer', () => {
    const cart = useCartStore();
    const result = cart.addItem({
      id: 'dev-1',
      firstName: 'Алексей',
      lastName: 'Смирнов',
      title: 'Senior Tilda Developer',
      avatarSymbol: '⚡️'
    });

    expect(result).toBe('added');
    expect(cart.count).toBe(1);
    expect(cart.totalPrice).toBe(500); // 1 item * 500 RUB
    expect(cart.drawerOpen).toBe(true);
  });

  it('should prevent adding duplicate profiles to cart', () => {
    const cart = useCartStore();
    const item = {
      id: 'dev-1',
      firstName: 'Алексей',
      lastName: 'Смирнов',
      title: 'Senior Tilda Developer',
      avatarSymbol: '⚡️'
    };

    cart.addItem(item);
    const secondAdd = cart.addItem(item);

    expect(secondAdd).toBe('already_in_cart');
    expect(cart.count).toBe(1);
    expect(cart.isInCart('dev-1')).toBe(true);
  });

  it('should apply volume discount bundle for 5 items (2000 RUB instead of 2500 RUB)', () => {
    const cart = useCartStore();
    for (let i = 1; i <= 5; i++) {
      cart.addItem({
        id: `dev-${i}`,
        firstName: `Dev${i}`,
        lastName: 'Test',
        title: 'Tilda Specialist',
        avatarSymbol: '💻'
      });
    }

    expect(cart.count).toBe(5);
    // Bundle rate: 5 items = 2000 RUB (Save 500 RUB!)
    expect(cart.totalPrice).toBe(2000);
  });

  it('should compute complex bundle + remainder pricing (e.g. 7 items = 1 bundle + 2 flat)', () => {
    const cart = useCartStore();
    for (let i = 1; i <= 7; i++) {
      cart.addItem({
        id: `dev-${i}`,
        firstName: `Dev${i}`,
        lastName: 'Test',
        title: 'Tilda Specialist',
        avatarSymbol: '💻'
      });
    }

    expect(cart.count).toBe(7);
    // 1 bundle (2000) + 2 extra (2 * 500 = 1000) = 3000 RUB
    expect(cart.totalPrice).toBe(3000);
  });

  it('should remove items and clear cart correctly', () => {
    const cart = useCartStore();
    cart.addItem({ id: 'dev-1', firstName: 'A', lastName: 'B', title: 'T', avatarSymbol: '💻' });
    cart.addItem({ id: 'dev-2', firstName: 'C', lastName: 'D', title: 'T', avatarSymbol: '💻' });

    expect(cart.count).toBe(2);
    cart.removeItem('dev-1');
    expect(cart.count).toBe(1);
    expect(cart.isInCart('dev-1')).toBe(false);

    cart.clearCart();
    expect(cart.count).toBe(0);
    expect(cart.totalPrice).toBe(0);
  });
});
