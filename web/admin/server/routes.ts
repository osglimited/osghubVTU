import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeApp, getApps, applicationDefault, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { Pool } from "pg";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!getApps().length) {
    try {
      const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (sa) {
        const json = JSON.parse(sa);
        initializeApp({ credential: cert(json), projectId: json.project_id || projectId } as any);
      } else {
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
        const rawKey = process.env.FIREBASE_PRIVATE_KEY;
        if (clientEmail && rawKey) {
          const privateKey = String(rawKey).replace(/\\n/g, "\n");
          initializeApp({ credential: cert({ project_id: projectId, client_email: clientEmail, private_key: privateKey }), projectId } as any);
        } else {
          initializeApp({ credential: applicationDefault(), projectId } as any);
        }
      }
    } catch {
      // ignore
    }
  }

  function getAllowedEmails(): string[] {
    const env = process.env.ADMIN_EMAILS || process.env.VITE_ADMIN_EMAILS || "osglimited7@gmail.com";
    return env.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  }

  async function checkDbConnected(): Promise<boolean> {
    const url = process.env.DATABASE_URL;
    if (!url) return false;
    let pool: Pool | undefined;
    try {
      pool = new Pool({ connectionString: url, max: 1 });
      const res = await pool.query("SELECT 1");
      return Boolean(res && res.rowCount >= 0);
    } catch {
      return false;
    } finally {
      try { await pool?.end(); } catch {}
    }
  }

  async function ensureTables(): Promise<void> {
    const url = process.env.DATABASE_URL;
    if (!url) return;
    const pool = new Pool({ connectionString: url, max: 1 });
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_settings (
          key TEXT PRIMARY KEY,
          value JSONB NOT NULL
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_accounts (
          email TEXT PRIMARY KEY,
          uid TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_transactions (
          id TEXT PRIMARY KEY,
          user_email TEXT,
          amount NUMERIC,
          status TEXT,
          type TEXT,
          provider_status TEXT,
          provider_error_code TEXT,
          provider_error_message TEXT,
          provider_raw JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS user_wallets (
          user_email TEXT PRIMARY KEY,
          main_balance NUMERIC DEFAULT 0,
          cashback_balance NUMERIC DEFAULT 0,
          referral_balance NUMERIC DEFAULT 0,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS service_plans (
          id TEXT PRIMARY KEY,
          network TEXT NOT NULL,
          name TEXT NOT NULL,
          price_user NUMERIC NOT NULL,
          price_api NUMERIC NOT NULL,
          active BOOLEAN DEFAULT TRUE,
          metadata JSONB,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS wallet_logs (
          id TEXT PRIMARY KEY,
          user_email TEXT NOT NULL,
          type TEXT NOT NULL, -- credit | debit | deposit
          amount NUMERIC NOT NULL,
          description TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS wallet_deposits (
          id TEXT PRIMARY KEY,
          user_email TEXT NOT NULL,
          amount NUMERIC NOT NULL,
          method TEXT,
          status TEXT, -- pending | success | failed
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
    } finally {
      await pool.end();
    }
  }

  async function verifyTokenAndGetEmail(token?: string): Promise<string | undefined> {
    if (!token) return undefined;
    try {
      const decoded = await getAuth().verifyIdToken(token);
      const email = String(decoded.email || "").toLowerCase();
      return email || undefined;
    } catch {
      return undefined;
    }
  }

  async function adminAuth(req: Request, res: Response, next: NextFunction) {
    const headerEmail = String(req.headers["x-admin-email"] || "").toLowerCase();
    const allowed = getAllowedEmails();
    if (headerEmail && allowed.includes(headerEmail)) return next();
    const authHeader = req.headers.authorization || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const emailFromToken = await verifyTokenAndGetEmail(bearer);
    const candidateEmail = emailFromToken || headerEmail;
    if (candidateEmail && allowed.includes(candidateEmail)) return next();
    const url = process.env.DATABASE_URL;
    if (!url || !candidateEmail) return res.status(403).json({ message: "Forbidden" });
    await ensureTables();
    const pool = new Pool({ connectionString: url, max: 1 });
    try {
      const r = await pool.query(`SELECT email FROM admin_accounts WHERE email = $1 LIMIT 1`, [candidateEmail]);
      if (r.rows.length) return next();
      return res.status(403).json({ message: "Forbidden" });
    } finally {
      await pool.end();
    }
  }

  const settingsStore: any = {
    providerBaseUrl: "",
    apiKey: "",
    secretKey: "",
    cashbackEnabled: false,
    dailyReferralBudget: 0,
  };

  app.get("/api/admin/settings", adminAuth, async (_req: Request, res: Response) => {
    const url = process.env.DATABASE_URL;
    if (!url) {
      try {
        const db = getFirestore();
        const doc = await db.collection("admin_settings").doc("settings").get();
        if (doc.exists) return res.json(doc.data() || settingsStore);
      } catch {}
      return res.json(settingsStore);
    }
    await ensureTables();
    const pool = new Pool({ connectionString: url, max: 1 });
    try {
      const r = await pool.query(`SELECT value FROM admin_settings WHERE key = 'settings' LIMIT 1`);
      if (r.rows.length) {
        return res.json(r.rows[0].value);
      }
      return res.json(settingsStore);
    } finally {
      await pool.end();
    }
  });

  app.post("/api/admin/settings", adminAuth, async (req: Request, res: Response) => {
    const body = req.body || {};
    Object.assign(settingsStore, body);
    const url = process.env.DATABASE_URL;
    if (!url) {
      try {
        const db = getFirestore();
        await db.collection("admin_settings").doc("settings").set(settingsStore, { merge: true });
      } catch {}
      return res.json({ message: "Settings updated" });
    }
    await ensureTables();
    const pool = new Pool({ connectionString: url, max: 1 });
    try {
      await pool.query(
        `INSERT INTO admin_settings (key, value) VALUES ('settings', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [JSON.stringify(settingsStore)]
      );
      res.json({ message: "Settings updated" });
    } finally {
      await pool.end();
    }
  });

  app.get("/api/admin/transactions", adminAuth, async (_req: Request, res: Response) => {
    const url = process.env.DATABASE_URL;
    if (!url) {
      try {
        const db = getFirestore();
        const names = ["admin_transactions", "transactions"];
        let txs: any[] = [];
        for (const n of names) {
          const snap = await db.collection(n).orderBy("createdAt", "desc").limit(200).get();
          if (!snap.empty) {
            txs = snap.docs.map((d) => {
              const x: any = d.data() || {};
              return {
                id: d.id,
                user: x.user || x.user_email || x.userEmail || "",
                amount: Number(x.amount || 0),
                status: x.status || "success",
                type: x.type || "transaction",
                providerStatus: x.providerStatus || x.provider_status || "",
                providerErrorCode: x.providerErrorCode || x.provider_error_code || "",
                providerErrorMessage: x.providerErrorMessage || x.provider_error_message || "",
                providerRaw: x.providerRaw || x.provider_raw || null,
                createdAt: x.createdAt || x.timestamp || Date.now(),
              };
            });
            break;
          }
        }
        return res.json(txs);
      } catch {
        return res.json([]);
      }
    }
    await ensureTables();
    const pool = new Pool({ connectionString: url, max: 1 });
    try {
      const r = await pool.query(`SELECT id, user_email as "user", amount, status, type, provider_status as "providerStatus", provider_error_code as "providerErrorCode", provider_error_message as "providerErrorMessage", provider_raw as "providerRaw", created_at as "createdAt" FROM admin_transactions ORDER BY created_at DESC LIMIT 200`);
      res.json(r.rows);
    } finally {
      await pool.end();
    }
  });

  app.get("/api/admin/users", adminAuth, async (req: Request, res: Response) => {
    const limit = Math.max(1, Math.min(1000, Number((req.query.limit as string) || "100")));
    let list: any = { users: [] as any[] };
    try {
      list = await getAuth().listUsers(limit);
    } catch {
      list = { users: [] };
    }
    const url = process.env.DATABASE_URL;
    let balances: Record<string, any> = {};
    if (url) {
      await ensureTables();
      const pool = new Pool({ connectionString: url, max: 1 });
      try {
        const r = await pool.query(`SELECT user_email, main_balance, cashback_balance, referral_balance FROM user_wallets`);
        for (const row of r.rows) {
          balances[String(row.user_email).toLowerCase()] = row;
        }
        if (!list.users.length) {
          const ur = await pool.query(`SELECT DISTINCT user_email FROM admin_transactions WHERE user_email IS NOT NULL`);
          list.users = ur.rows.map((r) => ({ uid: r.user_email, email: r.user_email, displayName: "", phoneNumber: "", metadata: { creationTime: new Date().toISOString() }, disabled: false }));
        }
      } finally {
        await pool.end();
      }
    }
    const users = list.users.map(u => {
      const email = (u.email || "").toLowerCase();
      const bal = balances[email];
      return {
      id: u.uid,
      displayName: u.displayName || "",
      email: u.email || "",
      phone: u.phoneNumber || "",
      joinedAt: u.metadata.creationTime,
      walletBalance: bal ? Number(bal.main_balance || 0) : 0,
      cashbackBalance: bal ? Number(bal.cashback_balance || 0) : 0,
      referralBalance: bal ? Number(bal.referral_balance || 0) : 0,
      status: u.disabled ? "inactive" : "active",
    }});
    res.json(users);
  });

  app.post("/api/admin/users/promote", adminAuth, (req: Request, res: Response) => {
    const uid = String((req.body?.uid as string) || "");
    const email = String((req.body?.email as string) || "");
    const setClaims = async (targetUid: string) => {
      await getAuth().setCustomUserClaims(targetUid, { admin: true });
      const user = await getAuth().getUser(targetUid);
      res.json({ success: true, uid: targetUid, email: String(user.email || "") });
    };
    const run = async () => {
      if (uid) {
        await setClaims(uid);
        return;
      }
      if (email) {
        const userRecord = await getAuth().getUserByEmail(email);
        await setClaims(userRecord.uid);
        return;
      }
      res.status(400).json({ success: false, message: "uid or email required" });
    };
    run().catch((e) => {
      res.status(400).json({ success: false, message: String(e?.message || "error") });
    });
  });

  app.post("/api/admin/wallet/credit", adminAuth, (req: Request, res: Response) => {
    const userId = String((req.body?.userId as string) || "");
    const amount = Number((req.body?.amount as number) || 0);
    const walletType = String((req.body?.walletType as string) || "main");
    const newBalance = amount;
    const url = process.env.DATABASE_URL;
    const doInsert = async () => {
      if (!url) {
        try {
          const db = getFirestore();
          const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
          await db.collection("admin_transactions").doc(id).set({
            id,
            user_email: userId,
            amount,
            status: "success",
            type: "credit",
            createdAt: Date.now(),
          });
          const uw = db.collection("user_wallets").doc(userId.toLowerCase());
          const snap = await uw.get();
          const start = snap.exists ? Number((snap.data() as any).main_balance || 0) : 0;
          await uw.set({ main_balance: start + amount, updated_at: Date.now() }, { merge: true });
          const logId = `wl_${Date.now()}_${Math.random().toString(36).slice(2)}`;
          await db.collection("wallet_logs").doc(logId).set({
            id: logId,
            user_email: userId,
            type: "credit",
            amount,
            description: String(req.body?.description || "Admin credit"),
            createdAt: Date.now(),
          });
        } catch {}
        return;
      }
      await ensureTables();
      const pool = new Pool({ connectionString: url, max: 1 });
      try {
        const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        await pool.query(
          `INSERT INTO admin_transactions (id, user_email, amount, status, type) VALUES ($1, $2, $3, $4, $5)`,
          [id, userId, amount, "success", "credit"]
        );
        await pool.query(
          `INSERT INTO user_wallets (user_email, main_balance) VALUES ($1, $2)
           ON CONFLICT (user_email) DO UPDATE SET main_balance = user_wallets.main_balance + EXCLUDED.main_balance, updated_at = NOW()`,
          [userId, amount]
        );
        const logId = `wl_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        await pool.query(
          `INSERT INTO wallet_logs (id, user_email, type, amount, description) VALUES ($1, $2, $3, $4, $5)`,
          [logId, userId, "credit", amount, String(req.body?.description || "Admin credit")]
        );
      } finally {
        await pool.end();
      }
    };
    doInsert().catch(() => {});
    res.json({ success: true, userId, newBalance, walletType });
  });

  app.post("/api/admin/wallet/debit", adminAuth, (req: Request, res: Response) => {
    const userId = String((req.body?.userId as string) || "");
    const amount = Number((req.body?.amount as number) || 0);
    const walletType = String((req.body?.walletType as string) || "main");
    const url = process.env.DATABASE_URL;
    const doInsert = async () => {
      if (!url) {
        try {
          const db = getFirestore();
          const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
          await db.collection("admin_transactions").doc(id).set({
            id,
            user_email: userId,
            amount,
            status: "success",
            type: "debit",
            createdAt: Date.now(),
          });
          const uw = db.collection("user_wallets").doc(userId.toLowerCase());
          const snap = await uw.get();
          const start = snap.exists ? Number((snap.data() as any).main_balance || 0) : 0;
          await uw.set({ main_balance: start - amount, updated_at: Date.now() }, { merge: true });
          const logId = `wl_${Date.now()}_${Math.random().toString(36).slice(2)}`;
          await db.collection("wallet_logs").doc(logId).set({
            id: logId,
            user_email: userId,
            type: "debit",
            amount,
            description: String(req.body?.description || "Admin debit"),
            createdAt: Date.now(),
          });
        } catch {}
        return;
      }
      await ensureTables();
      const pool = new Pool({ connectionString: url, max: 1 });
      try {
        const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        await pool.query(
          `INSERT INTO admin_transactions (id, user_email, amount, status, type) VALUES ($1, $2, $3, $4, $5)`,
          [id, userId, amount, "success", "debit"]
        );
        await pool.query(
          `INSERT INTO user_wallets (user_email, main_balance) VALUES ($1, $2)
           ON CONFLICT (user_email) DO UPDATE SET main_balance = user_wallets.main_balance - EXCLUDED.main_balance, updated_at = NOW()`,
          [userId, amount]
        );
        const logId = `wl_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        await pool.query(
          `INSERT INTO wallet_logs (id, user_email, type, amount, description) VALUES ($1, $2, $3, $4, $5)`,
          [logId, userId, "debit", amount, String(req.body?.description || "Admin debit")]
        );
      } finally {
        await pool.end();
      }
    };
    doInsert().catch(() => {});
    res.json({ success: true, userId, newBalance: 0, walletType });
  });

  app.post("/api/admin/users/suspend", adminAuth, async (req: Request, res: Response) => {
    const uid = String((req.body?.uid as string) || "");
    const email = String((req.body?.email as string) || "");
    const suspend = Boolean(req.body?.suspend);
    const auth = getAuth();
    try {
      let targetUid = uid;
      if (!targetUid && email) {
        const u = await auth.getUserByEmail(email);
        targetUid = u.uid;
      }
      if (!targetUid) return res.status(400).json({ success: false, message: "uid or email required" });
      await auth.updateUser(targetUid, { disabled: suspend });
      const user = await auth.getUser(targetUid);
      res.json({ success: true, uid: targetUid, email: String(user.email || ""), disabled: Boolean(user.disabled) });
    } catch (e: any) {
      res.status(400).json({ success: false, message: String(e?.message || "error") });
    }
  });

  app.post("/api/admin/users/delete", adminAuth, async (req: Request, res: Response) => {
    const uid = String((req.body?.uid as string) || "");
    const email = String((req.body?.email as string) || "");
    const auth = getAuth();
    try {
      let targetUid = uid;
      if (!targetUid && email) {
        const u = await auth.getUserByEmail(email);
        targetUid = u.uid;
      }
      if (!targetUid) return res.status(400).json({ success: false, message: "uid or email required" });
      await auth.deleteUser(targetUid);
      res.json({ success: true, uid: targetUid, email });
    } catch (e: any) {
      res.status(400).json({ success: false, message: String(e?.message || "error") });
    }
  });

  app.post("/api/admin/users/password", adminAuth, async (req: Request, res: Response) => {
    const uid = String((req.body?.uid as string) || "");
    const email = String((req.body?.email as string) || "");
    const password = String((req.body?.password as string) || "");
    const auth = getAuth();
    try {
      let targetUid = uid;
      if (!targetUid && email) {
        const u = await auth.getUserByEmail(email);
        targetUid = u.uid;
      }
      if (!targetUid || !password) return res.status(400).json({ success: false, message: "uid/email and password required" });
      await auth.updateUser(targetUid, { password });
      const user = await auth.getUser(targetUid);
      res.json({ success: true, uid: targetUid, email: String(user.email || "") });
    } catch (e: any) {
      res.status(400).json({ success: false, message: String(e?.message || "error") });
    }
  });

  app.get("/api/admin/users/transactions", adminAuth, async (req: Request, res: Response) => {
    const uid = String((req.query?.uid as string) || "");
    const email = String((req.query?.email as string) || "");
    const targetEmail = email.toLowerCase();
    const url = process.env.DATABASE_URL;
    if (!url) return res.json([]);
    await ensureTables();
    const pool = new Pool({ connectionString: url, max: 1 });
    try {
      const r = await pool.query(
        `SELECT id, user_email as "user", amount, status, type, provider_status as "providerStatus", provider_error_code as "providerErrorCode", provider_error_message as "providerErrorMessage", provider_raw as "providerRaw", created_at as "createdAt" 
         FROM admin_transactions 
         WHERE user_email = $1 
         ORDER BY created_at DESC LIMIT 200`,
        [targetEmail]
      );
      res.json(r.rows);
    } finally {
      await pool.end();
    }
  });

  app.get("/api/admin/plans", adminAuth, async (_req: Request, res: Response) => {
    const url = process.env.DATABASE_URL;
    if (!url) {
      try {
        const db = getFirestore();
        const snap = await db.collection("service_plans").orderBy("createdAt", "desc").get();
        const rows = snap.docs.map(d => {
          const x: any = d.data() || {};
          return {
            id: d.id,
            network: x.network || "",
            name: x.name || "",
            priceUser: Number(x.priceUser || x.price_user || 0),
            priceApi: Number(x.priceApi || x.price_api || 0),
            active: Boolean(x.active !== false),
            metadata: x.metadata || null,
            createdAt: x.createdAt || Date.now(),
          };
        });
        return res.json(rows);
      } catch {
        return res.json([]);
      }
    }
    await ensureTables();
    const pool = new Pool({ connectionString: url, max: 1 });
    try {
      const r = await pool.query(
        `SELECT id, network, name, price_user as "priceUser", price_api as "priceApi", active, metadata, created_at as "createdAt"
         FROM service_plans
         ORDER BY created_at DESC`
      );
      res.json(r.rows);
    } finally {
      await pool.end();
    }
  });

  app.post("/api/admin/plans", adminAuth, async (req: Request, res: Response) => {
    const body = req.body || {};
    const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const network = String(body.network || "");
    const name = String(body.name || "");
    const priceUser = Number(body.priceUser || 0);
    const priceApi = Number(body.priceApi || 0);
    const active = body.active === undefined ? true : Boolean(body.active);
    const metadata = body.metadata ? JSON.stringify(body.metadata) : null;
    if (!network || !name || !priceUser || !priceApi) {
      return res.status(400).json({ message: "network, name, priceUser, priceApi required" });
    }
    const url = process.env.DATABASE_URL;
    if (!url) {
      try {
        const db = getFirestore();
        await db.collection("service_plans").doc(id).set({
          network,
          name,
          priceUser,
          priceApi,
          active,
          metadata: body.metadata || null,
          createdAt: Date.now(),
        });
      } catch {}
      return res.json({ id, network, name, priceUser, priceApi, active, metadata: body.metadata || null });
    }
    await ensureTables();
    const pool = new Pool({ connectionString: url, max: 1 });
    try {
      await pool.query(
        `INSERT INTO service_plans (id, network, name, price_user, price_api, active, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, network, name, priceUser, priceApi, active, metadata]
      );
      const r = await pool.query(
        `SELECT id, network, name, price_user as "priceUser", price_api as "priceApi", active, metadata, created_at as "createdAt"
         FROM service_plans
         WHERE id = $1
         LIMIT 1`,
        [id]
      );
      res.json(r.rows[0] || { id, network, name, priceUser, priceApi, active, metadata: body.metadata || null });
    } finally {
      await pool.end();
    }
  });

  app.put("/api/admin/plans/:id", adminAuth, async (req: Request, res: Response) => {
    const id = String(req.params.id || "");
    const body = req.body || {};
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;
    if (body.network !== undefined) { fields.push(`network = $${idx++}`); values.push(String(body.network || "")); }
    if (body.name !== undefined) { fields.push(`name = $${idx++}`); values.push(String(body.name || "")); }
    if (body.priceUser !== undefined) { fields.push(`price_user = $${idx++}`); values.push(Number(body.priceUser || 0)); }
    if (body.priceApi !== undefined) { fields.push(`price_api = $${idx++}`); values.push(Number(body.priceApi || 0)); }
    if (body.active !== undefined) { fields.push(`active = $${idx++}`); values.push(Boolean(body.active)); }
    if (body.metadata !== undefined) { fields.push(`metadata = $${idx++}`); values.push(body.metadata ? JSON.stringify(body.metadata) : null); }
    if (!id || !fields.length) return res.status(400).json({ message: "id and at least one field required" });
    const url = process.env.DATABASE_URL;
    if (!url) {
      try {
        const db = getFirestore();
        const patch: any = {};
        if (body.network !== undefined) patch.network = String(body.network || "");
        if (body.name !== undefined) patch.name = String(body.name || "");
        if (body.priceUser !== undefined) patch.priceUser = Number(body.priceUser || 0);
        if (body.priceApi !== undefined) patch.priceApi = Number(body.priceApi || 0);
        if (body.active !== undefined) patch.active = Boolean(body.active);
        if (body.metadata !== undefined) patch.metadata = body.metadata ? body.metadata : null;
        await db.collection("service_plans").doc(id).set(patch, { merge: true });
      } catch {}
      return res.json({ id, ...body });
    }
    await ensureTables();
    const pool = new Pool({ connectionString: url, max: 1 });
    try {
      await pool.query(
        `UPDATE service_plans SET ${fields.join(", ")} WHERE id = $${idx}`,
        [...values, id]
      );
      const r = await pool.query(
        `SELECT id, network, name, price_user as "priceUser", price_api as "priceApi", active, metadata, created_at as "createdAt"
         FROM service_plans
         WHERE id = $1
         LIMIT 1`,
        [id]
      );
      res.json(r.rows[0] || { id, ...body });
    } finally {
      await pool.end();
    }
  });

  app.delete("/api/admin/plans/:id", adminAuth, async (req: Request, res: Response) => {
    const id = String(req.params.id || "");
    if (!id) return res.status(400).json({ message: "id required" });
    const url = process.env.DATABASE_URL;
    if (!url) {
      try {
        const db = getFirestore();
        await db.collection("service_plans").doc(id).delete();
      } catch {}
      return res.json({ success: true, id });
    }
    await ensureTables();
    const pool = new Pool({ connectionString: url, max: 1 });
    try {
      await pool.query(`DELETE FROM service_plans WHERE id = $1`, [id]);
      res.json({ success: true, id });
    } finally {
      await pool.end();
    }
  });

  app.get("/api/ping", (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.get("/api/admin/stats", adminAuth, async (_req: Request, res: Response) => {
    const url = process.env.DATABASE_URL;
    const result = {
      totalUsers: 0,
      walletBalance: 0,
      totalTransactions: 0,
      todaySales: 0,
      dailyTotals: [] as Array<{ day: string; total: number }>,
      recentTransactions: [] as any[],
    };
    const auth = getAuth();
    let usersCount = 0;
    try {
      const users = await auth.listUsers(1000);
      usersCount = users.users.length;
    } catch {
      usersCount = 0;
    }
    if (!url) {
      try {
        const db = getFirestore();
        const txNames = ["admin_transactions", "transactions"];
        const walletNames = ["user_wallets", "wallets"];
        let txs: any[] = [];
        for (const n of txNames) {
          const snap = await db.collection(n).orderBy("createdAt", "desc").limit(500).get();
          if (!snap.empty) {
            txs = snap.docs.map((d) => {
              const x: any = d.data() || {};
              return {
                id: d.id,
                user: x.user || x.user_email || x.userEmail || "",
                amount: Number(x.amount || 0),
                status: x.status || "success",
                type: x.type || "transaction",
                createdAt: x.createdAt || x.timestamp || Date.now(),
              };
            });
            break;
          }
        }
        result.totalTransactions = txs.length;
        if (!usersCount) {
          const distinct = new Set<string>();
          for (const t of txs) {
            const e = String(t.user || "").toLowerCase();
            if (e) distinct.add(e);
          }
          usersCount = distinct.size;
        }
        result.totalUsers = usersCount;
        const now = new Date();
        result.todaySales = txs.filter(t => {
          const d = new Date(t.createdAt);
          return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).reduce((sum, t) => sum + Number(t.amount || 0), 0);
        let walletSum = 0;
        for (const n of walletNames) {
          const snap = await db.collection(n).limit(1000).get();
          if (!snap.empty) {
            walletSum = snap.docs.reduce((sum, d) => {
              const x: any = d.data() || {};
              const mb = Number(x.main_balance || x.balance || 0);
              return sum + mb;
            }, 0);
            break;
          }
        }
        result.walletBalance = walletSum;
        const days: Array<{ day: string; total: number }> = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toLocaleDateString(undefined, { weekday: "short" });
          const total = txs.filter(t => {
            const td = new Date(t.createdAt);
            return td.getDate() === d.getDate() && td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
          }).reduce((sum, t) => sum + Number(t.amount || 0), 0);
          days.push({ day: key, total });
        }
        result.dailyTotals = days;
        result.recentTransactions = txs.slice(0, 5);
        return res.json(result);
      } catch {
        return res.json(result);
      }
    }
    await ensureTables();
    const pool = new Pool({ connectionString: url, max: 1 });
    try {
      const balRes = await pool.query(`SELECT COALESCE(SUM(main_balance), 0) AS total FROM user_wallets`);
      result.walletBalance = Number(balRes.rows[0]?.total || 0);
      const txRes = await pool.query(
        `SELECT id, user_email as "user", amount, status, type, provider_status as "providerStatus", provider_error_code as "providerErrorCode", provider_error_message as "providerErrorMessage", provider_raw as "providerRaw", created_at as "createdAt" FROM admin_transactions ORDER BY created_at DESC LIMIT 500`
      );
      const txs = txRes.rows || [];
      result.totalTransactions = txs.length;
      if (!usersCount) {
        const uFromTx = await pool.query(`SELECT COUNT(DISTINCT user_email) AS cnt FROM admin_transactions WHERE user_email IS NOT NULL`);
        const uFromWallets = await pool.query(`SELECT COUNT(*) AS cnt FROM user_wallets`);
        usersCount = Number(uFromTx.rows[0]?.cnt || 0) || Number(uFromWallets.rows[0]?.cnt || 0);
      }
      result.totalUsers = usersCount;
      const now = new Date();
      result.todaySales = txs.filter(t => {
        const d = new Date(t.createdAt);
        return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).reduce((sum, t) => sum + Number(t.amount || 0), 0);
      if (!result.walletBalance && txs.length) {
        const net = txs.reduce((sum, t) => {
          const amt = Number(t.amount || 0);
          if (String(t.type || "").toLowerCase() === "credit") return sum + amt;
          if (String(t.type || "").toLowerCase() === "debit") return sum - amt;
          return sum;
        }, 0);
        result.walletBalance = net;
      }
      const days: Array<{ day: string; total: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString(undefined, { weekday: "short" });
        const total = txs.filter(t => {
          const td = new Date(t.createdAt);
          return td.getDate() === d.getDate() && td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
        }).reduce((sum, t) => sum + Number(t.amount || 0), 0);
        days.push({ day: key, total });
      }
      result.dailyTotals = days;
      result.recentTransactions = txs.slice(0, 5);
      res.json(result);
    } finally {
      await pool.end();
    }
  });

  app.get("/api/admin/wallet/logs", adminAuth, async (_req: Request, res: Response) => {
    const url = process.env.DATABASE_URL;
    if (!url) {
      try {
        const db = getFirestore();
        const snap = await db.collection("wallet_logs").orderBy("createdAt", "desc").limit(200).get();
        const rows = snap.docs.map(d => {
          const x: any = d.data() || {};
          return { id: d.id, user: x.user || x.user_email || "", type: x.type || "", amount: Number(x.amount || 0), description: x.description || "", createdAt: x.createdAt || Date.now() };
        });
        return res.json(rows);
      } catch {
        return res.json([]);
      }
    }
    await ensureTables();
    const pool = new Pool({ connectionString: url, max: 1 });
    try {
      const r = await pool.query(
        `SELECT id, user_email as "user", type, amount, description, created_at as "createdAt" FROM wallet_logs ORDER BY created_at DESC LIMIT 200`
      );
      res.json(r.rows);
    } finally {
      await pool.end();
    }
  });

  app.get("/api/admin/wallet/deposits", adminAuth, async (_req: Request, res: Response) => {
    const url = process.env.DATABASE_URL;
    if (!url) {
      try {
        const db = getFirestore();
        const snap = await db.collection("wallet_deposits").orderBy("createdAt", "desc").limit(200).get();
        const rows = snap.docs.map(d => {
          const x: any = d.data() || {};
          return { id: d.id, user: x.user || x.user_email || "", amount: Number(x.amount || 0), method: x.method || "", status: x.status || "", createdAt: x.createdAt || Date.now() };
        });
        return res.json(rows);
      } catch {
        return res.json([]);
      }
    }
    await ensureTables();
    const pool = new Pool({ connectionString: url, max: 1 });
    try {
      const r = await pool.query(
        `SELECT id, user_email as "user", amount, method, status, created_at as "createdAt" FROM wallet_deposits ORDER BY created_at DESC LIMIT 200`
      );
      res.json(r.rows);
    } finally {
      await pool.end();
    }
  });

  app.get("/api/admin/transactions/:id", adminAuth, async (req: Request, res: Response) => {
    const id = String(req.params.id || "");
    const url = process.env.DATABASE_URL;
    if (!id) return res.status(400).json({ message: "id required" });
    if (!url) return res.json({});
    await ensureTables();
    const pool = new Pool({ connectionString: url, max: 1 });
    try {
      const r = await pool.query(
        `SELECT id, user_email as "user", amount, status, type, provider_status as "providerStatus", provider_error_code as "providerErrorCode", provider_error_message as "providerErrorMessage", provider_raw as "providerRaw", created_at as "createdAt" FROM admin_transactions WHERE id = $1 LIMIT 1`,
        [id]
      );
      res.json(r.rows[0] || {});
    } finally {
      await pool.end();
    }
  });

  app.post("/api/admin/users/create", adminAuth, async (req: Request, res: Response) => {
    const email = String((req.body?.email as string) || "");
    const password = String((req.body?.password as string) || "");
    const displayName = String((req.body?.displayName as string) || "");
    const phoneNumber = String((req.body?.phoneNumber as string) || "");
    if (!email || !password) return res.status(400).json({ success: false, message: "email and password required" });
    try {
      const user = await getAuth().createUser({ email, password, displayName: displayName || undefined, phoneNumber: phoneNumber || undefined });
      res.json({ success: true, uid: user.uid, email: user.email, displayName: user.displayName });
    } catch (e: any) {
      res.status(400).json({ success: false, message: String(e?.message || "error") });
    }
  });
  app.get("/api/admin/admins", adminAuth, async (_req: Request, res: Response) => {
    const url = process.env.DATABASE_URL;
    if (!url) {
      try {
        const db = getFirestore();
        const snap = await db.collection("admin_accounts").orderBy("createdAt", "desc").get();
        const rows = snap.docs.map(d => {
          const x: any = d.data() || {};
          return { email: x.email || d.id, uid: x.uid || "", createdAt: x.createdAt || Date.now() };
        });
        return res.json(rows);
      } catch {
        return res.json([]);
      }
    }
    await ensureTables();
    const pool = new Pool({ connectionString: url, max: 1 });
    try {
      const r = await pool.query(`SELECT email, uid, created_at as "createdAt" FROM admin_accounts ORDER BY created_at DESC`);
      res.json(r.rows);
    } finally {
      await pool.end();
    }
  });
  app.post("/api/admin/admins", adminAuth, async (req: Request, res: Response) => {
    const email = String((req.body?.email as string) || "");
    const password = String((req.body?.password as string) || "");
    const displayName = String((req.body?.displayName as string) || "");
    if (!email || !password) return res.status(400).json({ success: false, message: "email and password required" });
    const url = process.env.DATABASE_URL;
    await ensureTables();
    try {
      const user = await getAuth().createUser({ email, password, displayName: displayName || undefined });
      await getAuth().setCustomUserClaims(user.uid, { admin: true });
      if (url) {
        const pool = new Pool({ connectionString: url, max: 1 });
        try {
          await pool.query(`INSERT INTO admin_accounts (email, uid) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET uid = EXCLUDED.uid`, [email.toLowerCase(), user.uid]);
        } finally {
          await pool.end();
        }
      } else {
        try {
          const db = getFirestore();
          await db.collection("admin_accounts").doc(email.toLowerCase()).set({ email: email.toLowerCase(), uid: user.uid, createdAt: Date.now() }, { merge: true });
        } catch {}
      }
      res.json({ success: true, uid: user.uid, email: user.email });
    } catch (e: any) {
      res.status(400).json({ success: false, message: String(e?.message || "error") });
    }
  });

  app.get("/api/health", async (_req: Request, res: Response) => {
    const envs = {
      ADMIN_EMAILS: Boolean(process.env.ADMIN_EMAILS || process.env.VITE_ADMIN_EMAILS),
      FIREBASE_PROJECT_ID: Boolean(process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID),
      DATABASE_URL: Boolean(process.env.DATABASE_URL),
      PORT: Boolean(process.env.PORT),
    };
    const firebaseAdminInitialized = getApps().length > 0;
    const dbConnected = await checkDbConnected();
    res.json({
      server: "up",
      time: new Date().toISOString(),
      envs,
      firebaseAdminInitialized,
      dbConnected,
    });
  });

  app.get("/api/admin/health", adminAuth, async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const email = await verifyTokenAndGetEmail(bearer);
    const dbConnected = await checkDbConnected();
    res.json({
      authorized: true,
      email,
      firebaseAdminInitialized: getApps().length > 0,
      dbConnected,
    });
  });

  return httpServer;
}
