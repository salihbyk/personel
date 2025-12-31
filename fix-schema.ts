import { db } from "./db";
import { sql } from "drizzle-orm";

async function fixSchema() {
  try {
    await db.execute(sql`ALTER TABLE inventory_items ALTER COLUMN assigned_to DROP NOT NULL`);
    console.log("Constraint kaldırıldı!");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

fixSchema();
