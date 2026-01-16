import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import fs from "fs";
import path from "path";

function loadEnvFiles() {
  const files = [".env", ".env.local"];
  // search both process cwd and project subdir for robustness
  const here = (() => {
    try {
      const url = new URL(import.meta.url);
      const p = url.pathname;
      return path.dirname(p);
    } catch {
      return process.cwd();
    }
  })();
  const searchDirs = [
    process.cwd(),
    here,
    path.resolve(here, ".."), // server/
    path.resolve(here, "../.."), // web/admin/
  ];
  for (const dir of searchDirs) {
    for (const name of files) {
      const p = path.resolve(dir, name);
      if (!fs.existsSync(p)) continue;
      const text = fs.readFileSync(p, "utf8");
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        const key = m[1];
        let val = m[2];
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
}
loadEnvFiles();

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Basic CORS for admin panel → backend communication
const allowedOrigins = new Set<string>(
  [
    process.env.ADMIN_ORIGIN,
    process.env.ADMIN_FRONTEND_ORIGIN,
    process.env.VITE_ADMIN_ORIGIN,
    process.env.ADMIN_PANEL_ORIGIN,
  ]
    .filter((x) => typeof x === "string" && x.trim().length > 0)
    .map((x) => x!.trim().replace(/^`|`$/g, "")),
);
app.use((req, res, next) => {
  const origin = String(req.headers.origin || "");
  if (origin && (allowedOrigins.size === 0 || allowedOrigins.has(origin))) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Credentials", "true");
  }
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Admin-Email");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  // Avoid `reusePort` on Windows where it's not supported (ENOTSUP).
  const listenOptions: any = { port };
  // Bind to all interfaces on non-windows, otherwise bind to localhost
  if (process.platform !== "win32") {
    listenOptions.host = "0.0.0.0";
    listenOptions.reusePort = true;
  }

  httpServer.listen(listenOptions, () => {
    log(`serving on port ${port}`);
  });
})();
