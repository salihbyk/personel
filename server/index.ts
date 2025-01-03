import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "@db";
import path from "path";

const app = express();

// Temel middleware kurulumu
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS ayarları
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// İstek loglama middleware'i
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

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Veritabanı bağlantısını kontrol et
    await db.query.employees.findMany().execute();
    log("Veritabanı bağlantısı başarılı");

    // Route'ları kaydet
    const server = registerRoutes(app);

    // Genel hata yakalayıcı
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Sunucu Hatası";
      log(`Hata: ${status} - ${message}`);
      res.status(status).json({ message });
    });

    // Development modunda Vite'ı kur
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      // Production modunda statik dosyaları serve et
      const distPath = path.resolve(__dirname, "public");
      app.use(express.static(distPath));

      // Client-side routing için tüm istekleri index.html'e yönlendir
      app.get("*", (req, res) => {
        if (!req.path.startsWith("/api")) {
          res.sendFile(path.resolve(distPath, "index.html"));
        }
      });
    }

    // ALWAYS serve the app on port 5000
    const PORT = 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`Sunucu ${PORT} portunda ${app.get("env")} modunda çalışıyor`);
    });
  } catch (error) {
    log("Başlangıç hatası:");
    console.error(error);
    process.exit(1);
  }
})();