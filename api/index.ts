import express from 'express';
import cors from 'cors';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { generateMLContent, transformProductImage } from '../src/services/gemini.server';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Initialize Firebase Admin (only once)
const appInstance = getApps().length > 0 ? getApps()[0] : initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0299499594',
});
const dbInstance = getFirestore(appInstance, process.env.FIRESTORE_DATABASE_ID || 'ai-studio-efcf238a-e42c-497a-80df-ea612addac7a');

// Initialize Mercado Pago
const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
const client = new MercadoPagoConfig({
  accessToken: mpAccessToken || 'dummy_token',
  options: { timeout: 5000 }
});

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── Gemini: Generate Content ──
app.post('/api/gemini/generate-content', async (req, res) => {
  try {
    const { product, deepSearch } = req.body;
    const result = await generateMLContent(product, deepSearch);
    res.json(result);
  } catch (error: any) {
    console.error('Gemini Content Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// ── Gemini: Transform Image ──
app.post('/api/gemini/transform-image', async (req, res) => {
  try {
    const { imageBase64, type, options } = req.body;
    const result = await transformProductImage(imageBase64, type, options);
    res.json({ imageUrl: result });
  } catch (error: any) {
    console.error('Gemini Image Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// ── Admin: Get all users ──
app.get('/api/admin/users', async (req, res) => {
  try {
    const adminUid = req.query.adminUid as string;
    if (!adminUid) return res.status(400).json({ error: 'Missing Admin UID' });
    const adminDoc = await dbInstance.collection('users').doc(adminUid).get();
    const adminData = adminDoc.data();
    const isAdminUser = adminData?.isAdmin || adminData?.email === 'pconti10@gmail.com';
    if (!isAdminUser) return res.status(403).json({ error: 'Forbidden' });
    const usersSnapshot = await dbInstance.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Admin: Gift tokens ──
app.post('/api/admin/gift-tokens', async (req, res) => {
  try {
    const { adminUid, targetUid, amount, reason } = req.body;
    if (!adminUid || !targetUid || !amount) return res.status(400).json({ error: 'Missing required fields' });
    const adminDoc = await dbInstance.collection('users').doc(adminUid).get();
    const adminData = adminDoc.data();
    const isAdminUser = adminData?.isAdmin || adminData?.email === 'pconti10@gmail.com';
    if (!isAdminUser) return res.status(403).json({ error: 'Forbidden' });
    await dbInstance.collection('users').doc(targetUid).update({
      tokenBalance: FieldValue.increment(Number(amount)),
      updatedAt: FieldValue.serverTimestamp()
    });
    await dbInstance.collection('transactions').add({
      uid: targetUid, amount: Number(amount), type: 'gift',
      description: reason || 'Regalo de administrador',
      timestamp: FieldValue.serverTimestamp(), adminId: adminUid
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── User: Dashboard ──
app.get('/api/user/dashboard/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const userDoc = await dbInstance.collection('users').doc(uid).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
    const transactionsSnapshot = await dbInstance.collection('transactions')
      .where('uid', '==', uid).orderBy('timestamp', 'desc').limit(50).get();
    const transactions = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ profile: userDoc.data(), transactions });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Mercado Pago: Create Preference ──
app.post('/api/create-preference', async (req, res) => {
  try {
    const { uid, tokens, price } = req.body;
    if (!uid || !tokens || !price) return res.status(400).json({ error: 'Missing required fields' });
    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: [{ id: `tokens-${tokens}`, title: `${tokens} Tokens ML SEO Optimizer`, quantity: 1, unit_price: Number(price), currency_id: 'ARS' }],
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
  } catch (error: any) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Mercado Pago: Webhook ──
app.post('/api/webhooks/mercadopago', async (req, res) => {
  try {
    const { action, data } = req.body;
    if (action === 'payment.created' || req.query.type === 'payment') {
      const paymentId = data?.id || req.query['data.id'];
      const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}` }
      });
      const paymentData = await response.json();
      if (paymentData.status === 'approved') {
        const uid = paymentData.external_reference;
        const amount = paymentData.transaction_amount;
        let tokensToAdd = 0;
        if (amount >= 5000) tokensToAdd = 100;
        else if (amount >= 3000) tokensToAdd = 50;
        else if (amount >= 1000) tokensToAdd = 15;
        if (uid && tokensToAdd > 0) {
          await dbInstance.collection('users').doc(uid).update({
            tokenBalance: FieldValue.increment(tokensToAdd), updatedAt: FieldValue.serverTimestamp()
          });
          await dbInstance.collection('transactions').add({
            uid, amount: tokensToAdd, type: 'purchase',
            description: `Compra de ${tokensToAdd} tokens`,
            timestamp: FieldValue.serverTimestamp(),
            mercadoPagoPaymentId: String(paymentId)
          });
        }
      }
    }
    res.status(200).send('OK');
  } catch (error) {
    res.status(500).send('Error');
  }
});

// Serverless handler for Vercel
export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req as any, res as any);
}
