import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { initializeApp, getApps, applicationDefault, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function pickNumber(source: any, keys: string[]): number {
  for (const k of keys) {
    const v = source?.[k];
    if (v === undefined || v === null) continue;
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return 0;
}

function getCreatedMs(value: any): number {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const t = Date.parse(value);
    return Number.isFinite(t) ? t : 0;
  }
  if (value instanceof Date) return value.getTime();
  if (typeof value.toMillis === "function") {
    try {
      return Number(value.toMillis());
    } catch {
      return 0;
    }
  }
  return 0;
}

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
          initializeApp({ credential: cert({ projectId: projectId, clientEmail: clientEmail, privateKey: privateKey }), projectId } as any);
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

  async function verifyTokenAndGetEmail(token?: string): Promise<{ email?: string; isAdmin?: boolean }> {
    if (!token) return { email: undefined, isAdmin: false };
    try {
      const decoded: any = await getAuth().verifyIdToken(token);
      const email = String(decoded.email || "").toLowerCase();
      const isAdmin = Boolean(decoded.admin === true || (decoded.customClaims && decoded.customClaims.admin === true));
      return { email: email || undefined, isAdmin };
    } catch {
      return { email: undefined, isAdmin: false };
    }
  }

  async function adminAuth(req: Request, res: Response, next: NextFunction) {
    const headerEmail = String(req.headers["x-admin-email"] || "").toLowerCase();
    const allowed = getAllowedEmails();
    if (headerEmail && allowed.includes(headerEmail)) return next();
    const authHeader = req.headers.authorization || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const tokenInfo = await verifyTokenAndGetEmail(bearer);
    if (tokenInfo?.isAdmin) return next();
    const candidateEmail = tokenInfo?.email || headerEmail;
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
    const profiles: Record<string, { phone: string; displayName: string }> = {};
    try {
      const snap = await db.collection("users").limit(1000).get();
      for (const d of snap.docs) {
        const x: any = d.data() || {};
        const uidKey = String(x.uid || d.id || "").toLowerCase();
        const emailKey = String(x.email || "").toLowerCase();
        const phone = String(x.phone || x.phoneNumber || "");
        const displayName = String(x.displayName || x.name || "");
        if (uidKey) {
          profiles[uidKey] = { phone, displayName };
        }
        if (emailKey && !profiles[emailKey]) {
          profiles[emailKey] = { phone, displayName };
        }
      }
    } catch {}
    const balances: Record<string, { main_balance: number; cashback_balance: number; referral_balance: number }> = {};
    try {
      const names = ["user_wallets", "wallets"];
      for (const n of names) {
        const snap = await db.collection(n).limit(1000).get();
        for (const d of snap.docs) {
          const x: any = d.data() || {};
          const uidKey = String(x.userId || d.id || "").toLowerCase();
          const emailKey = String(x.user_email || x.userEmail || "").toLowerCase();
          const mb = Number(x.mainBalance || x.main_balance || x.balance || 0);
          const cb = Number(x.cashbackBalance || x.cashback_balance || 0);
          const rb = Number(x.referralBalance || x.referral_balance || 0);
          const value = { main_balance: mb, cashback_balance: cb, referral_balance: rb };
          if (uidKey) {
            balances[uidKey] = value;
          }
          if (emailKey) {
            balances[emailKey] = value;
          }
        }
      }
    } catch {}
    const users = baseUsers.map((u) => {
      const uidKey = String(u.uid || u.id || "").toLowerCase();
      const emailKey = String(u.email || "").toLowerCase();
      const profile = profiles[uidKey] || profiles[emailKey];
      const bal = balances[uidKey] || balances[emailKey];
      const phone = u.phone || (profile ? profile.phone : "");
      const displayName = u.displayName || (profile ? profile.displayName : "");
      return {
        id: u.id,
        displayName,
        email: u.email,
        phone,
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
        let resolvedUid = "";
        let resolvedEmail = "";
        try {
          if (userId.includes("@")) {
            const u = await getAuth().getUserByEmail(userId);
            resolvedUid = String(u.uid || "").toLowerCase();
            resolvedEmail = String(u.email || userId || "").toLowerCase();
          } else {
            const u = await getAuth().getUser(userId);
            resolvedUid = String(u.uid || userId || "").toLowerCase();
            resolvedEmail = String(u.email || "").toLowerCase();
          }
        } catch {
          if (userId.includes("@")) {
            resolvedEmail = userId.toLowerCase();
          } else {
            resolvedUid = userId.toLowerCase();
          }
        }
        const targetIds = Array.from(new Set([resolvedUid, resolvedEmail].filter(Boolean)));
        const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        await db.collection("admin_transactions").doc(id).set({
          id,
          user_email: userId,
          amount,
          status: "success",
          type: "credit",
          createdAt: Date.now(),
        });
        const keyA = walletType === "cashback" ? "cashback_balance" : walletType === "referral" ? "referral_balance" : "main_balance";
        const keyB = walletType === "cashback" ? "cashbackBalance" : walletType === "referral" ? "referralBalance" : "mainBalance";
        for (const tid of targetIds) {
          const uw = db.collection("user_wallets").doc(tid);
          const snap = await uw.get();
          const dataUW: any = snap.exists ? (snap.data() as any) : {};
          const startUW = walletType === "cashback"
            ? Number(dataUW.cashback_balance || dataUW.cashbackBalance || 0)
            : walletType === "referral"
            ? Number(dataUW.referral_balance || dataUW.referralBalance || 0)
            : Number(dataUW.main_balance || dataUW.mainBalance || dataUW.balance || 0);
          const updatedUW: any = { [keyA]: startUW + amount, [keyB]: startUW + amount, updated_at: Date.now() };
          if (walletType === "main") updatedUW.balance = startUW + amount;
          await uw.set(updatedUW, { merge: true });
          const w = db.collection("wallets").doc(tid);
          const wsnap = await w.get();
          const dataW: any = wsnap.exists ? (wsnap.data() as any) : {};
          const startW = walletType === "cashback"
            ? Number(dataW.cashback_balance || dataW.cashbackBalance || 0)
            : walletType === "referral"
            ? Number(dataW.referral_balance || dataW.referralBalance || 0)
            : Number(dataW.main_balance || dataW.mainBalance || dataW.balance || 0);
          const updatedW: any = { [keyA]: startW + amount, [keyB]: startW + amount, updated_at: Date.now() };
          if (walletType === "main") updatedW.balance = startW + amount;
          await w.set(updatedW, { merge: true });
        }
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
        let resolvedUid = "";
        let resolvedEmail = "";
        try {
          if (userId.includes("@")) {
            const u = await getAuth().getUserByEmail(userId);
            resolvedUid = String(u.uid || "").toLowerCase();
            resolvedEmail = String(u.email || userId || "").toLowerCase();
          } else {
            const u = await getAuth().getUser(userId);
            resolvedUid = String(u.uid || userId || "").toLowerCase();
            resolvedEmail = String(u.email || "").toLowerCase();
          }
        } catch {
          if (userId.includes("@")) {
            resolvedEmail = userId.toLowerCase();
          } else {
            resolvedUid = userId.toLowerCase();
          }
        }
        const targetIds = Array.from(new Set([resolvedUid, resolvedEmail].filter(Boolean)));
        const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        await db.collection("admin_transactions").doc(id).set({
          id,
          user_email: userId,
          amount,
          status: "success",
          type: "debit",
          createdAt: Date.now(),
        });
        const keyA = walletType === "cashback" ? "cashback_balance" : walletType === "referral" ? "referral_balance" : "main_balance";
        const keyB = walletType === "cashback" ? "cashbackBalance" : walletType === "referral" ? "referralBalance" : "mainBalance";
        for (const tid of targetIds) {
          const uw = db.collection("user_wallets").doc(tid);
          const snap = await uw.get();
          const dataUW: any = snap.exists ? (snap.data() as any) : {};
          const startUW = walletType === "cashback"
            ? Number(dataUW.cashback_balance || dataUW.cashbackBalance || 0)
            : walletType === "referral"
            ? Number(dataUW.referral_balance || dataUW.referralBalance || 0)
            : Number(dataUW.main_balance || dataUW.mainBalance || dataUW.balance || 0);
          const updatedUW: any = { [keyA]: startUW - amount, [keyB]: startUW - amount, updated_at: Date.now() };
          if (walletType === "main") updatedUW.balance = startUW - amount;
          await uw.set(updatedUW, { merge: true });
          const w = db.collection("wallets").doc(tid);
          const wsnap = await w.get();
          const dataW: any = wsnap.exists ? (wsnap.data() as any) : {};
          const startW = walletType === "cashback"
            ? Number(dataW.cashback_balance || dataW.cashbackBalance || 0)
            : walletType === "referral"
            ? Number(dataW.referral_balance || dataW.referralBalance || 0)
            : Number(dataW.main_balance || dataW.mainBalance || dataW.balance || 0);
          const updatedW: any = { [keyA]: startW - amount, [keyB]: startW - amount, updated_at: Date.now() };
          if (walletType === "main") updatedW.balance = startW - amount;
          await w.set(updatedW, { merge: true });
        }
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
    const email = String((req.query?.email as string) || "").trim();
    const uid = String((req.query as any)?.uid || "").trim();
    if (!email && !uid) return res.json([]);
    try {
      const db = getFirestore();
      const names = ["admin_transactions", "transactions", "wallet_transactions"];
      for (const n of names) {
        let rows: any[] = [];
        if (email) {
          const queries = [
            db.collection(n).where("user_email", "==", email).limit(500).get(),
            db.collection(n).where("user", "==", email).limit(500).get(),
            db.collection(n).where("userEmail", "==", email).limit(500).get(),
            db.collection(n).where("email", "==", email).limit(500).get(),
          ];
          const snaps = await Promise.allSettled(queries);
          for (const s of snaps) {
            if (s.status === "fulfilled") {
              const snap = s.value;
              if (!snap.empty) {
                rows = rows.concat(
                  snap.docs.map((d) => {
                    const x: any = d.data() || {};
                    return {
                      id: d.id,
                      user: x.user || x.user_email || x.userEmail || x.email || x.userId || "",
                      amount: Number(x.amount || 0),
                      status: x.status || "success",
                      type: x.type || "transaction",
                      providerStatus: x.providerStatus || x.provider_status || "",
                      providerErrorCode: x.providerErrorCode || x.provider_error_code || "",
                      providerErrorMessage: x.providerErrorMessage || x.provider_error_message || "",
                      providerRaw: x.providerRaw || x.provider_raw || null,
                      createdAt: x.createdAt || x.timestamp || Date.now(),
                    };
                  }),
                );
              }
            }
          }
        }
        if (uid) {
          const queries = [
            db.collection(n).where("userId", "==", uid).limit(500).get(),
            db.collection(n).where("uid", "==", uid).limit(500).get(),
          ];
          const snaps = await Promise.allSettled(queries);
          for (const s of snaps) {
            if (s.status === "fulfilled") {
              const snap = s.value;
              if (!snap.empty) {
                rows = rows.concat(
                  snap.docs.map((d) => {
                    const x: any = d.data() || {};
                    return {
                      id: d.id,
                      user: x.user || x.user_email || x.userEmail || x.email || x.userId || "",
                      amount: Number(x.amount || 0),
                      status: x.status || "success",
                      type: x.type || "transaction",
                      providerStatus: x.providerStatus || x.provider_status || "",
                      providerErrorCode: x.providerErrorCode || x.provider_error_code || "",
                      providerErrorMessage: x.providerErrorMessage || x.provider_error_message || "",
                      providerRaw: x.providerRaw || x.provider_raw || null,
                      createdAt: x.createdAt || x.timestamp || Date.now(),
                    };
                  }),
                );
              }
            }
          }
        }
        if (rows.length > 0) {
          const map: Record<string, any> = {};
          for (const r of rows) map[r.id] = r;
          const list = Object.values(map);
          list.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
          return res.json(list);
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
              user: x.user || x.user_email || x.userEmail || x.email || x.userId || "",
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
              user: x.user || x.user_email || x.userEmail || x.email || x.userId || "",
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
          user: x.user || x.user_email || x.userEmail || x.email || x.userId || "",
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

  app.get("/api/admin/finance/system", adminAuth, async (_req: Request, res: Response) => {
    const makePeriod = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d.getTime();
    };
    try {
      const db = getFirestore();
      const txNames = ["transactions", "admin_transactions", "wallet_transactions"];
      const depositsSnap = await db.collection("wallet_deposits").orderBy("createdAt", "desc").limit(2000).get();
      const deposits = depositsSnap.docs.map(d => d.data() || {});
      const collectTx = async () => {
        let rows: any[] = [];
        for (const n of txNames) {
          const snap = await db.collection(n).orderBy("createdAt", "desc").limit(3000).get();
          if (!snap.empty) {
            rows = rows.concat(
              snap.docs.map(d => {
                const x: any = d.data() || {};
                return {
                  id: d.id,
                  userId: x.userId || "",
                  user: x.user || x.user_email || x.userEmail || x.email || "",
                  userPrice: Number(x.userPrice || x.amount || 0),
                  providerCost: Number(x.providerCost || 0),
                  smsCost: Number(x.smsCost || 0),
                  serviceType: String(x.serviceType || x.type || ""),
                  status: String(x.status || ""),
                  createdAt: Number(x.createdAt || 0),
                };
              }),
            );
          }
        }
        return rows;
      };
      const transactions = await collectTx();
      const allWallets: Array<{ main: number }> = [];
      for (const n of ["wallets", "user_wallets"]) {
        const snap = await db.collection(n).limit(2000).get();
        if (!snap.empty) {
          allWallets.push(
            ...snap.docs.map(d => {
              const x: any = d.data() || {};
              return { main: Number(x.mainBalance || x.main_balance || x.balance || 0) };
            }),
          );
        }
      }
      const requiredProviderBalance = allWallets.reduce((s, w) => s + Number(w.main || 0), 0);
      const computeBucket = (startTs: number) => {
        const dep = deposits.filter(d => Number(d.createdAt || 0) >= startTs).reduce((s, d) => s + Number(d.amount || 0), 0);
        const tx = transactions.filter(t => Number(t.createdAt || 0) >= startTs);
        const provider = tx.reduce((s, t) => s + Number(t.providerCost || 0), 0);
        const sms = tx.reduce((s, t) => s + Number(t.smsCost || 0), 0);
        const revenue = tx.filter(t => String(t.status || "") === "success").reduce((s, t) => s + Number(t.userPrice || 0), 0);
        const net = revenue - provider - sms;
        return { deposits: dep, providerCost: provider, smsCost: sms, netProfit: net };
      };
      const daily = computeBucket(makePeriod(1));
      const weekly = computeBucket(makePeriod(7));
      const monthly = computeBucket(makePeriod(30));
      res.json({ daily, weekly, monthly, requiredProviderBalance });
    } catch {
      res.json({ daily: { deposits: 0, providerCost: 0, smsCost: 0, netProfit: 0 }, weekly: { deposits: 0, providerCost: 0, smsCost: 0, netProfit: 0 }, monthly: { deposits: 0, providerCost: 0, smsCost: 0, netProfit: 0 }, requiredProviderBalance: 0 });
    }
  });

  app.get("/api/admin/finance/analytics", adminAuth, async (req: Request, res: Response) => {
    const rawEmail = String((req.query?.email as string) || "").trim();
    const rawUid = String((req.query as any)?.uid || "").trim();
    const email = rawEmail.toLowerCase();
    const uid = rawUid.toLowerCase();
    const scope: "system" | "user" = (rawEmail || rawUid) ? "user" : "system";
    const startParam = (req.query as any)?.start;
    const endParam = (req.query as any)?.end;
    const startTs = startParam !== undefined && startParam !== ""
      ? Number(startParam)
      : undefined;
    const endTs = endParam !== undefined && endParam !== ""
      ? Number(endParam)
      : undefined;
    const makePeriod = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d.getTime();
    };
    let providerBalanceRequired = 0;
    let walletBalance = 0;
    try {
      const db = getFirestore();
      const txNames = ["transactions", "admin_transactions", "wallet_transactions"];
      const depositsSnap = await db.collection("wallet_deposits").orderBy("createdAt", "desc").limit(1000).get();
      const depositsAll = depositsSnap.docs.map(d => d.data() || {});
      const depositsScoped = scope === "user"
        ? depositsAll.filter(d => {
            const u = String((d.user as string) || (d.user_email as string) || (d.userId as string) || "").toLowerCase();
            return (email && u === email) || (uid && u === uid);
          })
        : depositsAll;
      const depositsFiltered = depositsScoped.filter(d => {
        const t = Number(d.createdAt || 0);
        if (startTs !== undefined && t < startTs) return false;
        if (endTs !== undefined && t > endTs) return false;
        return true;
      });
      let transactions: any[] = [];
      for (const n of txNames) {
        const snap = await db.collection(n).orderBy("createdAt", "desc").limit(1000).get();
        if (!snap.empty) {
          const rows = snap.docs.map(d => {
            const x: any = d.data() || {};
            const status = String(x.status || "");
            const type = String(x.type || "").toLowerCase();
            const serviceType = String(x.serviceType || x.type || "");
            const isService =
              (!!serviceType && !["credit", "debit", "transfer", "wallet", "funding"].includes(type)) ||
              pickNumber(x, ["providerCost", "priceApi", "price_api"]) > 0;
            const userPrice = pickNumber(x, ["userPrice", "priceUser", "price_user", "amount", "user_amount", "paid", "userPaid"]);
            let providerCost = pickNumber(x, ["providerCost", "priceApi", "price_api", "apiPrice", "provider_price", "providerPrice", "cost", "serviceCost"]);
            
            // If providerCost is missing, try to derive it from profit
            if (providerCost <= 0) {
              const profit = pickNumber(x, ["profit", "adminProfit", "admin_profit", "commission", "gain"]);
              if (profit > 0 && userPrice > 0) {
                providerCost = userPrice - profit;
              }
            }
            const smsCost = Number((x as any).sms_cost ?? (x as any).smsCost ?? 0);
            return {
              id: d.id,
              userId: x.userId || "",
              user: x.user || x.user_email || x.userEmail || x.email || x.userId || "",
              userPrice,
              providerCost,
              smsCost,
              serviceType,
              status,
              createdAt: getCreatedMs(x.createdAt),
              isService,
              raw: x,
            };
          });
          const filteredBase = rows.filter(r => r.isService);
          const scoped = scope === "user"
            ? filteredBase.filter(r => {
                const uId = String(r.userId || "").toLowerCase();
                const uEmail = String(r.user || "").toLowerCase();
                return (email && uEmail === email) || (uid && uId === uid);
              })
            : filteredBase;
          const timeFiltered = scoped.filter(t => {
            const tt = Number(t.createdAt || 0);
            if (startTs !== undefined && tt < startTs) return false;
            if (endTs !== undefined && tt > endTs) return false;
            return true;
          });
          transactions = transactions.concat(
            timeFiltered.map(t => {
              const x: any = t.raw || {};
              const s = String(t.status || "").toLowerCase();
              const ps = String(x.providerStatus || x.provider_status || "");
              const pe = String(x.providerErrorCode || x.provider_error_code || "");
              const pm = String(x.providerErrorMessage || x.provider_error_message || "");
              const se = String(x.error || x.errorMessage || "");
              const failureSource =
                s === "success"
                  ? ""
                  : (pe || ps || pm)
                  ? "provider"
                  : se
                  ? "system"
                  : "unknown";
              const failureReason = s === "success" ? "" : (pm || pe || ps || se || "");
              return { ...t, failureSource, failureReason };
            }),
          );
        }
      }
      transactions.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

      if (scope === "user") {
        for (const n of ["wallets", "user_wallets"]) {
          const doc = await db.collection(n).doc(rawUid || rawEmail).get();
          if (doc.exists) {
            const x: any = doc.data() || {};
            walletBalance = Number(x.mainBalance || x.main_balance || x.balance || 0);
            break;
          }
        }
        const validTx = transactions.filter(t => 
          String(t.status || "").toLowerCase() === "success" && 
          Number(t.providerCost || 0) > 0 && 
          Number(t.userPrice || 0) > 0
        );
        const rateDen = validTx.reduce((s, t) => s + Number(t.userPrice || 0), 0);
        const rateNum = validTx.reduce((s, t) => s + Number(t.providerCost || 0), 0);
        const providerRate = rateDen > 0 ? rateNum / rateDen : 1;
        providerBalanceRequired = walletBalance * providerRate;
      } else {
        const allWallets: Array<{ main: number }> = [];
        for (const n of ["wallets", "user_wallets"]) {
          const snap = await db.collection(n).limit(2000).get();
          if (!snap.empty) {
            allWallets.push(
              ...snap.docs.map(d => {
                const x: any = d.data() || {};
                return { main: Number(x.mainBalance || x.main_balance || x.balance || 0) };
              }),
            );
          }
        }
        const totalMain = allWallets.reduce((s, w) => s + Number(w.main || 0), 0);
        const validTx = transactions.filter(t => 
          String(t.status || "").toLowerCase() === "success" && 
          Number(t.providerCost || 0) > 0 && 
          Number(t.userPrice || 0) > 0
        );
        const rateDen = validTx.reduce((s, t) => s + Number(t.userPrice || 0), 0);
        const rateNum = validTx.reduce((s, t) => s + Number(t.providerCost || 0), 0);
        const providerRate = rateDen > 0 ? rateNum / rateDen : 1;
        providerBalanceRequired = totalMain * providerRate;
      }

      const computeBucket = (bucketStart: number) => {
        const dep = depositsFiltered
          .filter(d => Number(d.createdAt || 0) >= bucketStart)
          .reduce((s, d) => s + Number(d.amount || 0), 0);
        const tx = transactions.filter(t => Number(t.createdAt || 0) >= bucketStart);
        const txSuccess = tx.filter(t => String(t.status || "").toLowerCase() === "success");
        const provider = txSuccess.reduce((s, t) => {
          let c = Number(t.providerCost || 0);
          if (c <= 0) c = Number(t.userPrice || 0) * providerRate;
          return s + c;
        }, 0);
        const sms = txSuccess.reduce((s, t) => s + Number(t.smsCost || 0), 0);
        const revenue = txSuccess.reduce((s, t) => s + Number(t.userPrice || 0), 0);
        const net = revenue - provider - sms;
        return { deposits: dep, providerCost: provider, smsCost: sms, netProfit: net };
      };

      const daily = computeBucket(makePeriod(1));
      const weekly = computeBucket(makePeriod(7));
      const monthly = computeBucket(makePeriod(30));

      const depositsTotal = depositsFiltered.reduce((s, d) => s + Number(d.amount || 0), 0);
      const successTxAll = transactions.filter(t => String(t.status || "").toLowerCase() === "success");
      const providerCostTotal = successTxAll.reduce((s, t) => {
        let c = Number(t.providerCost || 0);
        if (c <= 0) c = Number(t.userPrice || 0) * providerRate;
        return s + c;
      }, 0);
      const smsCostTotal = successTxAll.reduce((s, t) => s + Number(t.smsCost || 0), 0);
      const revenueTotal = successTxAll.reduce((s, t) => s + Number(t.userPrice || 0), 0);
      const netProfitTotal = revenueTotal - providerCostTotal - smsCostTotal;

      res.json({
        scope,
        providerBalanceRequired,
        walletBalance: scope === "user" ? walletBalance : 0,
        daily,
        weekly,
        monthly,
        totals: { depositsTotal, providerCostTotal, smsCostTotal, netProfitTotal },
        transactions,
      });
    } catch {
      res.json({
        scope,
        providerBalanceRequired: 0,
        walletBalance: scope === "user" ? 0 : 0,
        daily: { deposits: 0, providerCost: 0, smsCost: 0, netProfit: 0 },
        weekly: { deposits: 0, providerCost: 0, smsCost: 0, netProfit: 0 },
        monthly: { deposits: 0, providerCost: 0, smsCost: 0, netProfit: 0 },
        totals: { depositsTotal: 0, providerCostTotal: 0, smsCostTotal: 0, netProfitTotal: 0 },
        transactions: [],
      });
    }
  });

  app.get("/api/admin/finance/user", adminAuth, async (req: Request, res: Response) => {
    const email = String((req.query?.email as string) || "").toLowerCase();
    const uid = String((req.query as any)?.uid || "").toLowerCase();
    if (!email && !uid) return res.status(400).json({ message: "uid or email required" });
    try {
      const db = getFirestore();
      const txNames = ["transactions", "admin_transactions", "wallet_transactions"];
      const depositsSnap = await db.collection("wallet_deposits").orderBy("createdAt", "desc").limit(2000).get();
      const depositsAll = depositsSnap.docs.map(d => d.data() || {});
      const deposits = depositsAll.filter(d => {
        const u = String((d.user as string) || (d.user_email as string) || (d.userId as string) || "").toLowerCase();
        return (email && u === email) || (uid && u === uid);
      });
      let transactions: any[] = [];
      for (const n of txNames) {
        const snap = await db.collection(n).orderBy("createdAt", "desc").limit(2000).get();
        if (!snap.empty) {
          const rows = snap.docs.map(d => {
            const x: any = d.data() || {};
            return {
              id: d.id,
              userId: x.userId || "",
              user: x.user || x.user_email || x.userEmail || x.email || "",
              userPrice: Number(x.userPrice || x.amount || 0),
              providerCost: Number(x.providerCost || 0),
              smsCost: Number(x.smsCost || 0),
              serviceType: String(x.serviceType || x.type || ""),
              status: String(x.status || ""),
              createdAt: Number(x.createdAt || 0),
            };
          });
          const filtered = rows.filter(r => {
            const uId = String(r.userId || "").toLowerCase();
            const uEmail = String(r.user || "").toLowerCase();
            return (email && (uEmail === email)) || (uid && (uId === uid));
          });
          transactions = transactions.concat(filtered);
        }
      }
      transactions.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
      let walletBalance = 0;
      for (const n of ["wallets", "user_wallets"]) {
        const doc = await db.collection(n).doc(uid || email).get();
        if (doc.exists) {
          const x: any = doc.data() || {};
          walletBalance = Number(x.mainBalance || x.main_balance || x.balance || 0);
          break;
        }
      }
      const totalDeposited = deposits.reduce((s, d) => s + Number(d.amount || 0), 0);
      const totalSpent = transactions.filter(t => String(t.status || "") === "success").reduce((s, t) => s + Number(t.userPrice || 0), 0);
      const totalProviderCost = transactions.reduce((s, t) => s + Number(t.providerCost || 0), 0);
      const totalSmsCost = transactions.reduce((s, t) => s + Number(t.smsCost || 0), 0);
      const netProfit = totalSpent - totalProviderCost - totalSmsCost;
      const recent = transactions.slice(0, 50);
      const rateDen = recent.reduce((s, t) => s + Number(t.userPrice || 0), 0);
      const rateNum = recent.reduce((s, t) => s + Number(t.providerCost || 0), 0);
      const providerRate = rateDen > 0 ? rateNum / rateDen : 1;
      const avgSms = recent.length > 0 ? recent.reduce((s, t) => s + Number(t.smsCost || 0), 0) / recent.length : 0;
      const riskProviderBalance = walletBalance * providerRate;
      const riskSmsCost = avgSms;
      const riskExpectedProfit = walletBalance - riskProviderBalance - riskSmsCost;
      res.json({
        walletBalance,
        totalDeposited,
        totalSpent,
        totalProviderCost,
        totalSmsCost,
        netProfit,
        transactions,
        risk: { providerBalanceRequired: riskProviderBalance, smsCost: riskSmsCost, expectedProfit: riskExpectedProfit },
      });
    } catch {
      res.json({ walletBalance: 0, totalDeposited: 0, totalSpent: 0, totalProviderCost: 0, totalSmsCost: 0, netProfit: 0, transactions: [], risk: { providerBalanceRequired: 0, smsCost: 0, expectedProfit: 0 } });
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
