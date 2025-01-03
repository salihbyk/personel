import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is missing. Please make sure the database is provisioned.",
  );
}

// Veritabanı havuzu oluştur
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: true,
  connectionTimeoutMillis: 5000,
  wsClient: ws,
});

// Drizzle ORM instance'ı oluştur
export const db = drizzle(pool, { 
  schema,
  logger: true,
});