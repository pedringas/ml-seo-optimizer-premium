import type { VercelRequest, VercelResponse } from '@vercel/node';

// Dynamic imports to avoid build-time resolution issues
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { default: express } = await import('express');
  const { default: cors } = await import('cors');
  const { MercadoPagoConfig, Preference } = await import('mercadopago');
  const { initializeApp, getApps, cert } = await import('firebase-admin/app');
  const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
  const { generateMLContent, transformProductImage } = await import('../src/services/gemini.server.js');

  // Firebase Admin init
  const apps = getApps();
  const adminApp = apps.length > 0 ? apps[0] : initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
  const db = getFirestore(adminApp, process.env.FIRESTORE_DATABASE_ID || '(default)');

  const app = express();
  app.use(cors({ origin: '*' }));
  app.use(express.json({ limit: '10mb' }));

  // ── Generate SEO Content ──
  app.post('/api/gemini/generate-content', async (req: any, res: any) => {
    try {
      const { product, deepSearch } = req.body;
      const result = await generateMLContent(product, deepSearch);
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Transform Image ──
  app.post('/api/gemini/transform-image', async (req: any, res: any) => {
    try {
      const { imageBase64, type, options } = req.body;
      const result = await transformProductImage(imageBase64, type, options);
      res.json({ imageUrl: result });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── Create MP Preference ──
  app.post('/api/create-preference', async (req: any, res: any) => {
    try {
      const { uid, tokens, price } = req.body;
      const client = new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '' });
      const preference = new Preference(client);
      const result = await preference.create({
        body: {
          items: [{ id: `tokens-${tokens}`, title: `${tokens} Tokens`, quantity: 1, unit_price: Number(price), currency_id: 'ARS' }],
          back_urls: {
            success: `${process.env.APP_URL}/?payment=success`,
            failure: `${process.env.APP_URL}/?payment=failure`,
            pending: `${process.env.APP_URL}/?payment=pending`,
          },
          auto_return: 'approved',
          notification_url: `${process.env.APP_URL}/api/webhooks/mercadopago`,
          external_reference: uid,
        }
      });
      res.json({ id: result.id, init_point: result.init_point });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── MP Webhook ──
  app.post('/api/webhooks/mercadopago', async (req: any, res: any) => {
    try {
      const { action, data } = req.body;
      if (action === 'payment.created' || req.query.type === 'payment') {
        const paymentId = data?.id || req.query['data.id'];
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` }
        });
        const payment = await response.json();
        if (payment.status === 'approved') {
          const uid = payment.external_reference;
          let tokensToAdd = 0;
          if (payment.transaction_amount >= 5000) tokensToAdd = 100;
          else if (payment.transaction_amount >= 3000) tokensToAdd = 50;
          else if (payment.transaction_amount >= 1000) tokensToAdd = 15;
          if (uid && tokensToAdd > 0) {
            await db.collection('users').doc(uid).update({ tokenBalance: FieldValue.increment(tokensToAdd) });
            await db.collection('transactions').add({ uid, amount: tokensToAdd, type: 'purchase', timestamp: FieldValue.serverTimestamp() });
          }
        }
      }
      res.status(200).send('OK');
    } catch {
      res.status(500).send('Error');
    }
  });

  return app(req as any, res as any);
}
