import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@db/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is missing. Please make sure the database is provisioned.",
  );
}

// Create the database connection
const sql = neon(process.env.DATABASE_URL);

// Create Drizzle ORM instance
export const db = drizzle(sql, { 
  schema,
  logger: true,
});