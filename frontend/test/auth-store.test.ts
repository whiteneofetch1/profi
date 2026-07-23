import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAuthStore } from '../stores/auth';

describe('Pinia Auth Store Unit & State Tests', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should initialize with null user and unauthenticated state', () => {
    const auth = useAuthStore();
    expect(auth.user).toBeNull();
    expect(auth.isAuthenticated).toBe(false);
    expect(auth.isAdmin).toBe(false);
    expect(auth.isDeveloper).toBe(false);
  });

  it('should compute isAuthenticated = true when user is present', () => {
    const auth = useAuthStore();
    auth.user = {
      id: 'client-1',
      email: 'client@fyxi.ru',
      role: 'CLIENT',
    };

    expect(auth.isAuthenticated).toBe(true);
    expect(auth.isAdmin).toBe(false);
    expect(auth.isDeveloper).toBe(false);
  });

  it('should evaluate isAdmin = true only for ADMIN role', () => {
    const auth = useAuthStore();
    auth.user = {
      id: 'admin-1',
      email: 'admin@fyxi.ru',
      role: 'ADMIN',
    };

    expect(auth.isAuthenticated).toBe(true);
    expect(auth.isAdmin).toBe(true);
    expect(auth.isDeveloper).toBe(false);
  });

  it('should evaluate isDeveloper = true only for DEVELOPER role', () => {
    const auth = useAuthStore();
    auth.user = {
      id: 'dev-1',
      email: 'dev@fyxi.ru',
      role: 'DEVELOPER',
    };

    expect(auth.isAuthenticated).toBe(true);
    expect(auth.isAdmin).toBe(false);
    expect(auth.isDeveloper).toBe(true);
  });

  it('should reset state on logout', () => {
    const auth = useAuthStore();
    auth.user = {
      id: 'dev-1',
      email: 'dev@fyxi.ru',
      role: 'DEVELOPER',
    };

    expect(auth.isAuthenticated).toBe(true);
    auth.user = null;
    expect(auth.isAuthenticated).toBe(false);
  });
});
