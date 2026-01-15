import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeApp, getApps, applicationDefault, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

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
    } catch {}
  }

  function getAllowedEmails(): string[] {
    const env = process.env.ADMIN_EMAILS || process.env.VITE_ADMIN_EMAILS || "osglimited7@gmail.com";
    return env.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
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
    return res.status(403).json({ message: "Forbidden" });
  }

  const settingsStore: any = {
    providerBaseUrl: "",
    apiKey: "",
    secretKey: "",
    cashbackEnabled: false,
    dailyReferralBudget: 0,
  };

  app.get("/api/admin/settings", adminAuth, async (_req: Request, res: Response) => {
    try {
      const db = getFirestore();
      const doc = await db.collection("admin_settings").doc("settings").get();
      if (doc.exists) return res.json(doc.data() || settingsStore);
    } catch {}
    return res.json(settingsStore);
  });

  app.post("/api/admin/settings", adminAuth, async (req: Request, res: Response) => {
    const body = req.body || {};
    Object.assign(settingsStore, body);
    try {
      const db = getFirestore();
      await db.collection("admin_settings").doc("settings").set(settingsStore, { merge: true });
    } catch {}
    return res.json({ message: "Settings updated" });
  });

  app.get("/api/admin/transactions", adminAuth, async (_req: Request, res: Response) => {
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
  });

  app.get("/api/admin/users", adminAuth, async (req: Request, res: Response) => {
    const limit = Math.max(1, Math.min(1000, Number((req.query.limit as string) || "100")));
    const db = getFirestore();
    let baseUsers: Array<{
      id: string;
      uid: string;
      displayName: string;
      email: string;
      phone: string;
      joinedAt: any;
      status: string;
    }> = [];
    try {
      const list = await getAuth().listUsers(limit);
      baseUsers = list.users.map((u) => ({
        id: u.uid,
        uid: u.uid,
        displayName: u.displayName || "",
        email: u.email || "",
        phone: u.phoneNumber || "",
        joinedAt: u.metadata?.creationTime || "",
        status: u.disabled ? "inactive" : "active",
      }));
    } catch {
      try {
        const snap = await db.collection("users").orderBy("createdAt", "desc").limit(limit).get();
        baseUsers = snap.docs.map((d) => {
          const x: any = d.data() || {};
          return {
            id: d.id,
            uid: d.id,
            displayName: x.displayName || x.name || "",
            email: x.email || "",
            phone: x.phone || x.phoneNumber || "",
            joinedAt: x.createdAt || "",
            status: x.disabled ? "inactive" : "active",
          };
        });
      } catch {
        baseUsers = [];
      }
    }
    const balances: Record<string, { main_balance: number; cashback_balance: number; referral_balance: number }> = {};
    try {
      const names = ["wallets", "user_wallets"];
      for (const n of names) {
        const snap = await db.collection(n).limit(1000).get();
        for (const d of snap.docs) {
          const x: any = d.data() || {};
          const email = String(d.id || x.user_email || x.userEmail || "").toLowerCase();
          const mb = Number(x.mainBalance || x.main_balance || x.balance || 0);
          const cb = Number(x.cashbackBalance || x.cashback_balance || 0);
          const rb = Number(x.referralBalance || x.referral_balance || 0);
          balances[email] = { main_balance: mb, cashback_balance: cb, referral_balance: rb };
        }
      }
    } catch {}
    const users = baseUsers.map((u) => {
      const emailKey = String(u.email || "").toLowerCase();
      const bal = balances[emailKey];
      return {
        id: u.id,
        displayName: u.displayName,
        email: u.email,
        phone: u.phone,
        joinedAt: u.joinedAt,
        walletBalance: bal ? Number(bal.main_balance || 0) : 0,
        cashbackBalance: bal ? Number(bal.cashback_balance || 0) : 0,
        referralBalance: bal ? Number(bal.referral_balance || 0) : 0,
        status: u.status,
      };
    });
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
    const doInsert = async () => {
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
    };
    doInsert().catch(() => {});
    res.json({ success: true, userId, newBalance, walletType });
  });

  app.post("/api/admin/wallet/debit", adminAuth, (req: Request, res: Response) => {
    const userId = String((req.body?.userId as string) || "");
    const amount = Number((req.body?.amount as number) || 0);
    const walletType = String((req.body?.walletType as string) || "main");
    const doInsert = async () => {
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
    const email = String((req.query?.email as string) || "").toLowerCase();
    if (!email) return res.json([]);
    try {
      const db = getFirestore();
      const names = ["admin_transactions", "transactions", "wallet_transactions"];
      for (const n of names) {
        const snap = await db.collection(n).where("user_email", "==", email).orderBy("createdAt", "desc").limit(200).get();
        if (!snap.empty) {
          const rows = snap.docs.map((d) => {
            const x: any = d.data() || {};
            return {
              id: d.id,
              user: x.user || x.user_email || x.userEmail || x.userId || "",
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
          return res.json(rows);
        }
      }
      return res.json([]);
    } catch {
      return res.json([]);
    }
  });

  app.get("/api/admin/plans", adminAuth, async (_req: Request, res: Response) => {
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
  });

  app.post("/api/admin/plans", adminAuth, async (req: Request, res: Response) => {
    const body = req.body || {};
    const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const network = String(body.network || "");
    const name = String(body.name || "");
    const priceUser = Number(body.priceUser || 0);
    const priceApi = Number(body.priceApi || 0);
    const active = body.active === undefined ? true : Boolean(body.active);
    if (!network || !name || !priceUser || !priceApi) {
      return res.status(400).json({ message: "network, name, priceUser, priceApi required" });
    }
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
  });

  app.put("/api/admin/plans/:id", adminAuth, async (req: Request, res: Response) => {
    const id = String(req.params.id || "");
    const body = req.body || {};
    if (!id) return res.status(400).json({ message: "id and at least one field required" });
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
  });

  app.delete("/api/admin/plans/:id", adminAuth, async (req: Request, res: Response) => {
    const id = String(req.params.id || "");
    if (!id) return res.status(400).json({ message: "id required" });
    try {
      const db = getFirestore();
      await db.collection("service_plans").doc(id).delete();
    } catch {}
    return res.json({ success: true, id });
  });

  app.get("/api/ping", (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.get("/api/admin/stats", adminAuth, async (_req: Request, res: Response) => {
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
    try {
      const db = getFirestore();
      const txNames = ["transactions", "admin_transactions", "wallet_transactions"];
      const walletNames = ["wallets", "user_wallets"];
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
            const mb = Number(x.mainBalance || x.main_balance || x.balance || 0);
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
  });

  app.get("/api/admin/wallet/logs", adminAuth, async (_req: Request, res: Response) => {
    try {
      const db = getFirestore();
      const names = ["wallet_logs", "wallet_transactions"];
      for (const n of names) {
        const snap = await db.collection(n).orderBy("createdAt", "desc").limit(200).get();
        if (!snap.empty) {
          const rows = snap.docs.map((d) => {
            const x: any = d.data() || {};
            return {
              id: d.id,
              user: x.user || x.user_email || x.userId || "",
              type: x.type || "",
              amount: Number(x.amount || 0),
              description: x.description || "",
              createdAt: x.createdAt || Date.now(),
            };
          });
          return res.json(rows);
        }
      }
      return res.json([]);
    } catch {
      return res.json([]);
    }
  });

  app.get("/api/admin/wallet/deposits", adminAuth, async (_req: Request, res: Response) => {
    try {
      const db = getFirestore();
      const snap = await db.collection("wallet_deposits").orderBy("createdAt", "desc").limit(200).get();
      const rows = snap.docs.map((d) => {
        const x: any = d.data() || {};
        return {
          id: d.id,
          user: x.user || x.user_email || x.userId || "",
          amount: Number(x.amount || 0),
          method: x.method || "",
          status: x.status || "",
          createdAt: x.createdAt || Date.now(),
        };
      });
      return res.json(rows);
    } catch {
      return res.json([]);
    }
  });

  app.get("/api/admin/transactions/:id", adminAuth, async (req: Request, res: Response) => {
    const id = String(req.params.id || "");
    if (!id) return res.status(400).json({ message: "id required" });
    try {
      const db = getFirestore();
      const doc = await db.collection("admin_transactions").doc(id).get();
      if (doc.exists) {
        const x: any = doc.data() || {};
        return res.json({
          id,
          user: x.user || x.user_email || x.userEmail || "",
          amount: Number(x.amount || 0),
          status: x.status || "",
          type: x.type || "",
          providerStatus: x.providerStatus || x.provider_status || "",
          providerErrorCode: x.providerErrorCode || x.provider_error_code || "",
          providerErrorMessage: x.providerErrorMessage || x.provider_error_message || "",
          providerRaw: x.providerRaw || x.provider_raw || null,
          createdAt: x.createdAt || x.timestamp || Date.now(),
        });
      }
    } catch {}
    return res.json({});
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
  });

  app.post("/api/admin/admins", adminAuth, async (req: Request, res: Response) => {
    const email = String((req.body?.email as string) || "");
    const password = String((req.body?.password as string) || "");
    const displayName = String((req.body?.displayName as string) || "");
    if (!email || !password) return res.status(400).json({ success: false, message: "email and password required" });
    try {
      const user = await getAuth().createUser({ email, password, displayName: displayName || undefined });
      await getAuth().setCustomUserClaims(user.uid, { admin: true });
      try {
        const db = getFirestore();
        await db.collection("admin_accounts").doc(email.toLowerCase()).set({ email: email.toLowerCase(), uid: user.uid, createdAt: Date.now() }, { merge: true });
      } catch {}
      res.json({ success: true, uid: user.uid, email: user.email });
    } catch (e: any) {
      res.status(400).json({ success: false, message: String(e?.message || "error") });
    }
  });

  app.get("/api/health", async (_req: Request, res: Response) => {
    const envs = {
      ADMIN_EMAILS: Boolean(process.env.ADMIN_EMAILS || process.env.VITE_ADMIN_EMAILS),
      FIREBASE_PROJECT_ID: Boolean(process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID),
      PORT: Boolean(process.env.PORT),
    };
    const firebaseAdminInitialized = getApps().length > 0;
    res.json({
      server: "up",
      time: new Date().toISOString(),
      envs,
      firebaseAdminInitialized,
    });
  });

  app.get("/api/admin/health", adminAuth, async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const email = await verifyTokenAndGetEmail(bearer);
    res.json({
      authorized: true,
      email,
      firebaseAdminInitialized: getApps().length > 0,
    });
  });

  return httpServer;
}
