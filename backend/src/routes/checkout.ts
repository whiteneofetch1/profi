import { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';
import { sendTelegramMessage, sendEmailNotification } from '../services/notifications';

export default async function checkoutRoutes(fastify: FastifyInstance) {

  // 1. CREATE CHECKOUT TRANSACTION (AUTHENTICATED OR GUEST)
  fastify.post(
    '/create',
    {
      schema: {
        body: Type.Object({
          devProfileIds: Type.Array(Type.String({ format: 'uuid' })),
          email: Type.Optional(Type.String({ format: 'email' })), // Required for guests
        }),
      },
    },
    async (request, reply) => {
      const { devProfileIds, email } = request.body as any;

      if (devProfileIds.length === 0) {
        return reply.status(400).send({ error: 'Cart is empty: Please select at least one specialist' });
      }

      let clientId: string | null = null;
      let isGuest = false;

      // Check if user is authenticated
      try {
        const payload = await request.jwtVerify() as any;
        if (payload && payload.id) {
          clientId = payload.id;
        }
      } catch (err) {
        // Not logged in: must use guest email
        if (!email) {
          return reply.status(400).send({ error: 'Guest purchases require an email address' });
        }
        isGuest = true;
      }

      // If Guest: check or auto-create User account with CLIENT role
      if (isGuest && email) {
        let guestUser = await fastify.prisma.user.findUnique({
          where: { email },
        });

        if (!guestUser) {
          guestUser = await fastify.prisma.user.create({
            data: {
              email,
              role: 'CLIENT',
            },
          });
          // Initialize empty profile
          await fastify.prisma.clientProfile.create({
            data: { userId: guestUser.id },
          });
        }
        clientId = guestUser.id;
      }

      if (!clientId) {
        return reply.status(500).send({ error: 'Failed to resolve client identification' });
      }

      // Ensure they don't buy profiles they already unlocked
      const alreadyUnlocked = await fastify.prisma.unlockedProfile.findMany({
        where: {
          purchase: {
            clientId,
            status: 'COMPLETED',
          },
          devProfileId: { in: devProfileIds },
        },
        select: { devProfileId: true },
      });

      const alreadyUnlockedIds = alreadyUnlocked.map(p => p.devProfileId);
      const profilesToUnlock = (devProfileIds as string[]).filter(id => !alreadyUnlockedIds.includes(id));

      if (profilesToUnlock.length === 0) {
        return reply.status(400).send({ error: 'All selected profiles are already unlocked for this client!' });
      }

      // Fetch Pricing Configurations
      let config = await fastify.prisma.platformConfig.findFirst();
      if (!config) {
        config = await fastify.prisma.platformConfig.create({
          data: {
            flatRatePrice: 500,
            bundleCount: 5,
            bundlePrice: 2000,
          },
        });
      }

      // Calculate checkout pricing & Apply bundle package logic
      let totalAmount = 0;
      const count = profilesToUnlock.length;

      if (count >= config.bundleCount) {
        // Bundle pricing applied e.g., if bundle is 5 contacts for 2000, and they buy 6
        // We charge bundlePrice + remaining * flatRatePrice
        const bundles = Math.floor(count / config.bundleCount);
        const remainder = count % config.bundleCount;
        totalAmount = (bundles * config.bundlePrice) + (remainder * config.flatRatePrice);
      } else {
        totalAmount = count * config.flatRatePrice;
      }

      // Create external Mock transaction fields
      const mockPaymentId = 'pay_' + Math.random().toString(36).substring(2, 15);
      
      // Create Pending Purchase and child mapping rows
      const purchase = await fastify.prisma.purchase.create({
        data: {
          clientId,
          amountPaid: totalAmount,
          status: 'PENDING',
          paymentId: mockPaymentId,
          isGuestPurchase: isGuest,
          unlockedProfiles: {
            create: profilesToUnlock.map((devProfileId: string) => ({
              devProfileId,
            })),
          },
        },
      });

      // Generate sign-in token if they are a guest so we can log them in on successful checkout redirect
      let guestToken: string | null = null;
      if (isGuest) {
        guestToken = await reply.jwtSign({
          id: clientId,
          email: email!,
          role: 'CLIENT',
        });
      }

      reply.send({
        success: true,
        purchaseId: purchase.id,
        paymentId: mockPaymentId,
        amount: totalAmount,
        guestToken,
        // In real app, this redirects to YooKassa. Here we return a mock URL for Nuxt iframe or redirection
        paymentUrl: `/api/checkout/mock-gateway?paymentId=${mockPaymentId}`,
      });
    }
  );

  // 2. MOCK YOOKASSA PAYMENT PAGE (Redirect Target)
  fastify.get('/mock-gateway', async (request: any, reply) => {
    const { paymentId } = request.query;

    const purchase = await fastify.prisma.purchase.findUnique({
      where: { paymentId },
    });

    if (!purchase) {
      return reply.status(404).send('Payment transaction not found');
    }

    // Serve a simple, stunning HTML page representing the YooKassa payment window
    reply.type('text/html').send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ЮKassa — Симулятор оплаты</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          body {
            background: #f4f5f8;
            font-family: 'Inter', sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .pay-box {
            background: #fff;
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.06);
            width: 100%;
            max-width: 400px;
            padding: 2.5rem;
            text-align: center;
          }
          .logo {
            font-size: 1.5rem;
            font-weight: 700;
            color: #8b5cf6;
            margin-bottom: 0.5rem;
          }
          .provider {
            color: #64748b;
            font-size: 0.85rem;
            margin-bottom: 2rem;
          }
          .amount {
            font-size: 2rem;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 2rem;
          }
          .btn {
            width: 100%;
            background: #00bf85;
            color: #fff;
            border: none;
            padding: 1rem;
            border-radius: 12px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            margin-bottom: 1rem;
            transition: background 0.2s;
          }
          .btn:hover {
            background: #00a36c;
          }
          .btn-cancel {
            background: #f1f5f9;
            color: #64748b;
          }
          .btn-cancel:hover {
            background: #e2e8f0;
          }
        </style>
      </head>
      <body>
        <div class="pay-box">
          <div class="logo">ЮKassa</div>
          <div class="provider">Безопасный платежный шлюз fyxi.ru</div>
          <div class="amount">${purchase.amountPaid} ₽</div>
          
          <button class="btn" onclick="submitPayment(true)">Оплатить картой / СБП</button>
          <button class="btn btn-cancel" onclick="submitPayment(false)">Отклонить операцию</button>
        </div>

        <script>
          function submitPayment(success) {
            fetch('/api/checkout/webhook', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                paymentId: '${paymentId}',
                status: success ? 'succeeded' : 'failed'
              })
            }).then(() => {
              // Redirect back to main page success handler
              window.location.href = '/?payment=' + (success ? 'success' : 'cancel') + '&paymentId=${paymentId}';
            });
          }
        </script>
      </body>
      </html>
    `);
  });

  // 3. YOOKASSA PAYMENT WEBHOOK CALLBACK
  fastify.post(
    '/webhook',
    {
      schema: {
        body: Type.Object({
          paymentId: Type.String(),
          status: Type.Union([Type.Literal('succeeded'), Type.Literal('failed')]),
        }),
      },
    },
    async (request, reply) => {
      const { paymentId, status } = request.body as any;

      const purchase = await fastify.prisma.purchase.findUnique({
        where: { paymentId },
      });

      if (!purchase) {
        return reply.status(404).send({ error: 'Purchase record not found' });
      }

      if (purchase.status !== 'PENDING') {
        return reply.send({ success: true, message: 'Transaction already processed' });
      }

      // Update Purchase status
      const updatedPurchase = await fastify.prisma.purchase.update({
        where: { id: purchase.id },
        data: {
          status: status === 'succeeded' ? 'COMPLETED' : 'FAILED',
        },
        include: {
          client: true,
          unlockedProfiles: {
            include: {
              devProfile: true,
            },
          },
        },
      });

      // Send Instant Notifications if payment succeeded
      if (status === 'succeeded') {
        try {
          const unlockedCount = updatedPurchase.unlockedProfiles.length;
          const amount = updatedPurchase.amountPaid;
          const clientEmail = updatedPurchase.client?.email || 'Гость';

          // 1. Send Telegram Admin Notification
          const tgMessage = `🎉 <b>Новая покупка на fyxi.ru!</b>\n\n` +
            `💳 <b>Сумма:</b> ${amount} ₽\n` +
            `👤 <b>Покупатель:</b> ${clientEmail}\n` +
            `🔓 <b>Открыто контактов:</b> ${unlockedCount} шт.\n\n` +
            `<i>Транзакция ID: ${paymentId}</i>`;

          sendTelegramMessage(tgMessage).catch(() => {});

          // 2. Send Email to Client via Gmail SMTP
          if (updatedPurchase.client?.email) {
            const profileNames = updatedPurchase.unlockedProfiles
              .map((p: any) => `• ${p.devProfile.firstName} ${p.devProfile.lastName} (${p.devProfile.title})`)
              .join('<br/>');

            const emailHtml = `
              <div style="font-family: Arial, sans-serif; background: #0b0a14; color: #ffffff; padding: 2rem; border-radius: 12px;">
                <h2 style="color: #8b5cf6;">Благодарим за покупку на fyxi.ru!</h2>
                <p>Ваша оплата в размере <strong>${amount} ₽</strong> успешно принята.</p>
                <h3>🔓 Открытые контакты специалистов:</h3>
                <p style="background: rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; font-size: 1rem;">
                  ${profileNames}
                </p>
                <p>Вы всегда можете просмотреть купленные контакты в вашем <a href="https://fyxi.ru/cabinet" style="color: #06b6d4;">Личном кабинете fyxi.ru</a>.</p>
                <hr style="border: 1px solid rgba(255,255,255,0.1); margin: 2rem 0;"/>
                <p style="font-size: 0.8rem; color: #94a3b8;">С уважением,<br/>Команда маркетплейса fyxi.ru</p>
              </div>
            `;

            sendEmailNotification(
              updatedPurchase.client.email,
              'Ваши контакты специалистов разблокированы | fyxi.ru',
              emailHtml
            ).catch(() => {});
          }
        } catch (notifErr) {
          console.error('Error triggering payment notifications:', notifErr);
        }
      }

      reply.send({ success: true });
    }
  );
}
