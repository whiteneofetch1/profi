import { test, expect } from '@playwright/test';

test.describe('Authentication flow', () => {
  test('should navigate to login and show auth modal', async ({ page }) => {
    await page.goto('/');
    
    // Find the login button in header
    const loginButton = page.getByRole('button', { name: 'Войти' });
    await expect(loginButton).toBeVisible();
    
    // Click it
    await loginButton.click();
    
    // Auth modal should appear
    const authModal = page.getByText('Вход в систему');
    await expect(authModal).toBeVisible();
    
    // Fill credentials
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    
    // Submit
    const submitBtn = page.getByRole('button', { name: 'Войти', exact: true });
    // We don't actually submit to avoid breaking real DB or we can mock the API
    // await submitBtn.click();
  });
});
