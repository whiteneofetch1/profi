import nodemailer from 'nodemailer';

// Telegram Bot API configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8844539541:AAHbBXVtJ1Zi2xrDkbwcfeKn8HzgeX9s1e8';
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || '';

// Gmail SMTP Transporter configuration
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // true for port 465, false for other ports
  auth: {
    user: process.env.GMAIL_USER || '', // e.g. "fyxi.official@gmail.com"
    pass: process.env.GMAIL_APP_PASSWORD || '', // Google App Password (16 chars)
  },
});

/**
 * Send Telegram message via Telegram Bot API safely (non-blocking)
 */
export async function sendTelegramMessage(text: string, chatId?: string): Promise<boolean> {
  const targetChatId = chatId || process.env.TELEGRAM_ADMIN_CHAT_ID || TELEGRAM_ADMIN_CHAT_ID;
  if (!TELEGRAM_BOT_TOKEN || !targetChatId) {
    console.log('ℹ️ Telegram notification skipped (bot token or chat ID missing). Text:', text);
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: targetChatId,
        text,
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json() as any;
    if (!data.ok) {
      console.error('❌ Telegram Bot API Error:', data.description);
      return false;
    }

    console.log('✅ Telegram notification sent successfully to chat:', targetChatId);
    return true;
  } catch (err: any) {
    console.error('❌ Failed to send Telegram message:', err?.message || err);
    return false;
  }
}

/**
 * Send System Error Alert to Telegram Admin Chat
 */
export async function sendTelegramErrorAlert(errorDetails: {
  source: string;
  message: string;
  statusCode?: number;
  path?: string;
  method?: string;
  userEmail?: string;
  stack?: string;
}): Promise<boolean> {
  const timeStr = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
  const text = `⚠️ <b>ОШИБКА НА ПЛАТФОРМЕ FYXI.RU</b>\n\n` +
    `📍 <b>Источник:</b> ${errorDetails.source}\n` +
    `🔗 <b>Маршрут:</b> ${errorDetails.method || 'GET'} ${errorDetails.path || '/'}\n` +
    `🔢 <b>Код статуса:</b> ${errorDetails.statusCode || 500}\n` +
    `👤 <b>Пользователь:</b> ${errorDetails.userEmail || 'Гость'}\n` +
    `⏱️ <b>Время:</b> ${timeStr}\n\n` +
    `💬 <b>Сообщение:</b> <code>${errorDetails.message}</code>` +
    (errorDetails.stack ? `\n\n📜 <b>Стек ошибки:</b>\n<code>${errorDetails.stack.slice(0, 250)}...</code>` : '');

  return sendTelegramMessage(text);
}

/**
 * Send Transactional Email via Gmail SMTP safely (non-blocking)
 */
export async function sendEmailNotification(to: string, subject: string, htmlContent: string): Promise<boolean> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.log(`ℹ️ Gmail SMTP notification skipped (GMAIL_USER / GMAIL_APP_PASSWORD not set). To: ${to}, Subject: ${subject}`);
    return false;
  }

  try {
    const info = await transporter.sendMail({
      from: `"fyxi.ru Маркетплейс" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
    });

    console.log('✅ Email notification sent successfully:', info.messageId);
    return true;
  } catch (err: any) {
    console.error('❌ Failed to send Email notification:', err?.message || err);
    sendTelegramErrorAlert({
      source: 'GMAIL_SMTP_SERVICE',
      message: `Ошибка отправки письма (${to}): ${err?.message || err}`,
      statusCode: 500,
      stack: err?.stack,
    }).catch(() => {});
    return false;
  }
}
