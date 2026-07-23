import { describe, it, expect, vi } from 'vitest';
import { sendTelegramMessage, sendEmailNotification } from '../src/services/notifications';

describe('Notification Service Unit & Integration Tests (Telegram & Gmail SMTP)', () => {
  it('should format and dispatch Telegram messages without crashing when token is configured', async () => {
    process.env.TELEGRAM_ADMIN_CHAT_ID = '123456789';

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, result: { message_id: 999 } }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await sendTelegramMessage('🎉 Новая покупка контактов на fyxi.ru!');

    expect(mockFetch).toHaveBeenCalled();
    const callUrl = mockFetch.mock.calls[0][0] as string;
    expect(callUrl).toContain('api.telegram.org');
    expect(callUrl).toContain('8844539541:AAHbBXVtJ1Zi2xrDkbwcfeKn8HzgeX9s1e8');

    vi.unstubAllGlobals();
  });

  it('should attempt sending email notifications via Nodemailer SMTP transport', async () => {
    const result = await sendEmailNotification(
      'client@company.ru',
      'Тестовое уведомление fyxi.ru',
      '<h1>Контакты разблокированы</h1>'
    );

    expect(result).toBeDefined();
  });
});
