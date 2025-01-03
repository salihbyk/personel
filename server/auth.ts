import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

// Güvenli şifreleme işlemleri
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
    }
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "secure-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: app.get("env") === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 saat
    },
    store: new MemoryStore({
      checkPeriod: 86400000, // 24 saatte bir temizle
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport stratejisi
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await db.query.users.findFirst({
          where: eq(users.username, username),
        });

        if (!user) {
          return done(null, false, { message: "Hatalı kullanıcı adı veya şifre." });
        }

        const isMatch = await crypto.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Hatalı kullanıcı adı veya şifre." });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
      });
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Admin kullanıcısı oluşturma (sadece development ortamında)
  app.post("/api/init", async (req, res) => {
    try {
      // Mevcut kullanıcıları kontrol et
      const existingUser = await db.query.users.findFirst({
        where: eq(users.username, "admin"),
      });

      if (!existingUser) {
        // Admin kullanıcısı oluştur
        const hashedPassword = await crypto.hash("E112233T");
        await db.insert(users).values({
          username: "admin",
          password: hashedPassword,
        });
      }

      res.json({ message: "Admin kullanıcısı hazır" });
    } catch (error: any) {
      console.error("Admin kullanıcısı oluşturma hatası:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User, info: IVerifyOptions) => {
      if (err) {
        console.error("Login hatası:", err);
        return next(err);
      }

      if (!user) {
        return res.status(400).send(info.message ?? "Giriş başarısız");
      }

      req.logIn(user, (err) => {
        if (err) {
          console.error("Session oluşturma hatası:", err);
          return next(err);
        }

        return res.json({
          message: "Giriş başarılı",
          user: { id: user.id, username: user.username },
        });
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    const username = req.user?.username;
    req.logout((err) => {
      if (err) {
        console.error("Logout hatası:", err);
        return res.status(500).send("Çıkış başarısız");
      }

      res.json({ message: "Çıkış başarılı" });
      console.log(`Kullanıcı çıkış yaptı: ${username}`);
    });
  });

  // Kullanıcı bilgisi endpoint
  app.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      return res.json(req.user);
    }

    res.status(401).send("Giriş yapılmadı");
  });
}