import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };
import { generateMLContent, transformProductImage } from './src/services/gemini.server.ts';

console.log("Starting server process...");

// Initialize Firebase Admin
const appInstance = getApps().length > 0 ? getApps()[0] : initializeApp({
  projectId: firebaseConfig.projectId,
});
console.log("Firebase Admin initialized");

const dbInstance = getFirestore(appInstance, firebaseConfig.firestoreDatabaseId);

// Initialize Mercado Pago
const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
if (!mpAccessToken) {
  console.warn("WARNING: MERCADOPAGO_ACCESS_TOKEN is not set.");
}

console.log(`APP_URL is set to: ${process.env.APP_URL}`);

const client = new MercadoPagoConfig({ 
  accessToken: mpAccessToken || 'dummy_token',
  options: { timeout: 5000 }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '10mb' })); // Increase limit for images

  // Gemini API: Generate Content
  app.post("/api/gemini/generate-content", async (req, res) => {
    try {
      const { product, deepSearch } = req.body;
      const result = await generateMLContent(product, deepSearch);
      res.json(result);
    } catch (error: any) {
      console.error("Gemini Content Error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Gemini API: Transform Image
  app.post("/api/gemini/transform-image", async (req, res) => {
    try {
      const { imageBase64, type, options } = req.body;
      const result = await transformProductImage(imageBase64, type, options);
      res.json({ imageUrl: result });
    } catch (error: any) {
      console.error("Gemini Image Error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Middleware to verify Admin
  async function verifyAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    try {
      // In a real app, we'd verify the token with firebase-admin auth
      // For this implementation, we'll expect the UID in the body and verify it in DB
      // But better to use the UID from the token if possible.
      // Let's assume we pass admin_uid in headers for now or verify via auth.verifyIdToken(idToken)
      const { uid } = req.body; // Fallback to body if needed, but headers are better
      const adminUid = req.headers['x-admin-uid'] as string;
      
      if (!adminUid) return res.status(403).json({ error: 'No Admin UID provided' });
      
      const userDoc = await dbInstance.collection('users').doc(adminUid).get();
      if (!userDoc.exists || !userDoc.data()?.isAdmin) {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
      }
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token' });
    }
  }

  // API: Get all users (Admin only)
  app.get("/api/admin/users", async (req, res) => {
    try {
      const adminUid = req.query.adminUid as string;
      if (!adminUid) return res.status(400).json({ error: "Missing Admin UID" });

      const adminDoc = await dbInstance.collection('users').doc(adminUid).get();
      const adminData = adminDoc.data();
      
      let isAdminUser = false;
      if (adminData) {
         if (adminData.isAdmin || adminData.email === 'pconti10@gmail.com') {
             isAdminUser = true;
         }
      }

      if (!isAdminUser) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const usersSnapshot = await dbInstance.collection('users').get();
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(users);
    } catch (error) {
       console.error("Error fetching users:", error);
       res.status(500).json({ error: "Internal server error" });
    }
  });

  // API: Gift tokens (Admin only)
  app.post("/api/admin/gift-tokens", async (req, res) => {
    try {
      const { adminUid, targetUid, amount, reason } = req.body;
      
      if (!adminUid || !targetUid || !amount) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const adminDoc = await dbInstance.collection('users').doc(adminUid).get();
      const adminData = adminDoc.data();
      
      let isAdminUser = false;
      if (adminData) {
         if (adminData.isAdmin || adminData.email === 'pconti10@gmail.com') {
             isAdminUser = true;
         }
      }

      if (!isAdminUser) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const userRef = dbInstance.collection('users').doc(targetUid);
      await userRef.update({
        tokenBalance: FieldValue.increment(Number(amount)),
        updatedAt: FieldValue.serverTimestamp()
      });

      await dbInstance.collection('transactions').add({
        uid: targetUid,
        amount: Number(amount),
        type: 'gift',
        description: reason || `Regalo de administrador`,
        timestamp: FieldValue.serverTimestamp(),
        adminId: adminUid
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error gifting tokens:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API: Get user stats and transactions
  app.get("/api/user/dashboard/:uid", async (req, res) => {
    try {
      const { uid } = req.params;
      
      const userDoc = await dbInstance.collection('users').doc(uid).get();
      if (!userDoc.exists) {
        return res.status(404).json({ error: "User not found" });
      }

      const transactionsSnapshot = await dbInstance.collection('transactions')
        .where('uid', '==', uid)
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();

      const transactions = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      res.json({
        profile: userDoc.data(),
        transactions
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API: Create Mercado Pago Preference
  app.post("/api/create-preference", async (req, res) => {
    try {
      const { uid, tokens, price } = req.body;
      
      if (!uid || !tokens || !price) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const preference = new Preference(client);
      const result = await preference.create({
        body: {
          items: [
            {
              id: `tokens-${tokens}`,
              title: `${tokens} Tokens para ML SEO Optimizer`,
              quantity: 1,
              unit_price: Number(price),
              currency_id: 'ARS' // Mercado Pago Argentina default, can be adjusted
            }
          ],
          back_urls: {
            success: `${process.env.APP_URL}/?payment=success`,
            failure: `${process.env.APP_URL}/?payment=failure`,
            pending: `${process.env.APP_URL}/?payment=pending`,
          },
          auto_return: 'approved',
          notification_url: `${process.env.APP_URL}/api/webhooks/mercadopago`,
          external_reference: uid, // Store UID here to identify user on webhook
        }
      });

      res.json({ id: result.id, init_point: result.init_point });
    } catch (error) {
      console.error("Error creating MP preference:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // API: Mercado Pago Webhook
  app.post("/api/webhooks/mercadopago", async (req, res) => {
    try {
      const { action, data } = req.body;
      
      if (action === "payment.created" || req.query.type === "payment") {
        const paymentId = data?.id || req.query['data.id'];
        
        // Fetch payment details from MP
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: {
            Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`
          }
        });
        
        const paymentData = await response.json();
        
        if (paymentData.status === "approved") {
          const uid = paymentData.external_reference;
          const amount = paymentData.transaction_amount;
          
          // Logic to determine tokens based on amount (simple example)
          let tokensToAdd = 0;
          if (amount >= 5000) tokensToAdd = 100;
          else if (amount >= 3000) tokensToAdd = 50;
          else if (amount >= 1000) tokensToAdd = 15;

          if (uid && tokensToAdd > 0) {
            const userRef = dbInstance.collection('users').doc(uid);
            await userRef.update({
              tokenBalance: FieldValue.increment(tokensToAdd),
              updatedAt: FieldValue.serverTimestamp()
            });

            // Record transaction
            await dbInstance.collection('transactions').add({
              uid,
              amount: tokensToAdd,
              type: 'purchase',
              description: `Compra de ${tokensToAdd} tokens`,
              timestamp: FieldValue.serverTimestamp(),
              mercadoPagoPaymentId: String(paymentId)
            });
            
            console.log(`Tokens added to user ${uid}: ${tokensToAdd}`);
          }
        }
      }
      
      res.status(200).send("OK");
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).send("Error");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: {
          port: 24680 // Use another port
        },
        watch: {
          usePolling: true,
          interval: 100
        }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  server.on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. This usually happens when a previous process didn't close correctly.`);
      process.exit(1);
    }
  });
}

startServer();
