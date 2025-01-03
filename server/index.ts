import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupAuth } from "./auth";
import { db } from "@db";

const app = express();

// Temel middleware kurulumu
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
    // Veritabanı bağlantısını kontrol et ve yeniden deneme mekanizması
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        await db.query.users.findFirst();
        log("Veritabanı bağlantısı başarılı");
        break;
      } catch (error) {
        retryCount++;
        log(`Veritabanı bağlantı denemesi ${retryCount}/${maxRetries} başarısız:`);
        console.error(error);

        if (retryCount === maxRetries) {
          log("Maksimum bağlantı denemesi aşıldı, uygulama kapatılıyor.");
          process.exit(1);
        }

        // 5 saniye bekle ve tekrar dene
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // Auth sistemi kurulumu
    setupAuth(app);

    // Route'ları kaydet
    const server = registerRoutes(app);

    // Genel hata yakalayıcı
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Sunucu Hatası";

      log(`Hata: ${status} - ${message}`);
      if (err.stack) {
        log(`Stack: ${err.stack}`);
      }

      res.status(status).json({ message });
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const PORT = 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    log("Başlangıç hatası:");
    console.error(error);
    process.exit(1);
  }
})();