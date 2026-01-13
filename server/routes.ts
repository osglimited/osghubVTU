import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { Pool } from "pg";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (!getApps().length) {
    try {
      initializeApp({ projectId } as any);
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
        CREATE TABLE IF NOT EXISTS admin_transactions (
          id TEXT PRIMARY KEY,
          user_email TEXT,
          amount NUMERIC,
          status TEXT,
          type TEXT,
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
    const authHeader = req.headers.authorization || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const email = await verifyTokenAndGetEmail(bearer);
    const allowed = getAllowedEmails();
    if (!email || !allowed.includes(email)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
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
      return res.json([]);
    }
    await ensureTables();
    const pool = new Pool({ connectionString: url, max: 1 });
    try {
      const r = await pool.query(`SELECT id, user_email as "user", amount, status, type, created_at as "createdAt" FROM admin_transactions ORDER BY created_at DESC LIMIT 200`);
      res.json(r.rows);
    } finally {
      await pool.end();
    }
  });

  app.get("/api/admin/users", adminAuth, async (req: Request, res: Response) => {
    const limit = Math.max(1, Math.min(1000, Number((req.query.limit as string) || "100")));
    const list = await getAuth().listUsers(limit);
    const users = list.users.map(u => ({
      id: u.uid,
      displayName: u.displayName || "",
      email: u.email || "",
      phone: u.phoneNumber || "",
      joinedAt: u.metadata.creationTime,
      walletBalance: 0,
      status: u.disabled ? "inactive" : "active",
    }));
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
      if (!url) return;
      await ensureTables();
      const pool = new Pool({ connectionString: url, max: 1 });
      try {
        const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        await pool.query(
          `INSERT INTO admin_transactions (id, user_email, amount, status, type) VALUES ($1, $2, $3, $4, $5)`,
          [id, userId, amount, "success", "credit"]
        );
      } finally {
        await pool.end();
      }
    };
    doInsert().catch(() => {});
    res.json({ success: true, userId, newBalance, walletType });
  });

  app.get("/api/ping", (_req: Request, res: Response) => {
    res.json({ ok: true });
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
