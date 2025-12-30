import { type Express, type Request, type Response, type NextFunction } from "express";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import jwt from "jsonwebtoken";
import { db } from "@db";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);
const JWT_SECRET = process.env.SESSION_SECRET || "super-secret-jwt-key-2025";

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
    interface Request {
      user?: {
        id: number;
        username: string;
      };
    }
  }
}

// JWT token doğrulama middleware
export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: "Giriş yapılmadı" });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(401).json({ message: "Token geçersiz" });
    }
    req.user = user;
    next();
  });
}

export function setupAuth(app: Express) {
  // Admin kullanıcısı oluşturma
  app.post("/api/init", async (req, res) => {
    try {
      const existingUser = await db.query.users.findFirst({
        where: eq(users.username, "admin"),
      });

      if (!existingUser) {
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

  // Login endpoint - JWT token döndürür
  app.post("/api/login", async (req, res) => {
    try {
      const { password } = req.body;

      const user = await db.query.users.findFirst({
        where: eq(users.username, "admin"),
      });

      if (!user) {
        return res.status(400).json({ message: "Kullanıcı bulunamadı" });
      }

      const isMatch = await crypto.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: "Hatalı şifre" });
      }

      // JWT token oluştur
      const token = jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.json({
        message: "Giriş başarılı",
        token,
        user: { id: user.id, username: user.username },
      });
    } catch (error: any) {
      console.error("Login hatası:", error);
      res.status(500).json({ message: "Sunucu hatası" });
    }
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    res.json({ message: "Çıkış başarılı" });
  });

  // Kullanıcı bilgisi endpoint - token ile doğrulama
  app.get("/api/user", authenticateToken, (req, res) => {
    res.json(req.user);
  });
}
