import { db } from "./db";
import { employees, leaves, vehicles, inventoryItems, dailyAchievements } from "./db/schema";
import * as fs from "fs";
import { sql } from "drizzle-orm";

async function importData() {
  console.log("Veri aktarımı başlıyor...");

  // JSON dosyasını oku
  const jsonData = JSON.parse(
    fs.readFileSync("europatrans_yedek_2025-12-30_11-33.json", "utf-8")
  );

  try {
    // Sadece eksik verileri ekle (employees, vehicles ve leaves zaten aktarılmış)
    console.log("Envanter ve başarı kayıtları aktarılıyor...");
    
    // Önce sadece inventory ve achievements temizle
    await db.delete(dailyAchievements);
    await db.delete(inventoryItems);

    // Employees - zaten aktarıldı, atla
    console.log("Personeller zaten aktarılmış, atlanıyor...");

    // Vehicles - zaten aktarıldı, atla
    console.log("Araçlar zaten aktarılmış, atlanıyor...");

    // Leaves - zaten aktarıldı, atla
    console.log("İzinler zaten aktarılmış, atlanıyor...");

    // Inventory Items - assignedTo alanı null değer kabul etmiyor, bu yüzden sadece temel alanları ekliyoruz
    if (jsonData.inventoryItems && jsonData.inventoryItems.length > 0) {
      console.log(`${jsonData.inventoryItems.length} envanter öğesi aktarılıyor...`);
      for (const item of jsonData.inventoryItems) {
        // assignedTo null ise SQL'de raw query kullan
        if (item.assignedTo) {
          await db.insert(inventoryItems).values({
            id: item.id,
            name: item.name,
            type: item.type,
            condition: item.condition,
            notes: item.notes || null,
            assignedTo: item.assignedTo,
            assignedAt: item.assignedAt ? new Date(item.assignedAt) : null,
            returnedAt: item.returnedAt ? new Date(item.returnedAt) : null,
            createdAt: new Date(item.createdAt),
            updatedAt: new Date(item.updatedAt),
          });
        } else {
          // assignedTo null olduğunda raw SQL kullan
          await db.execute(sql`
            INSERT INTO inventory_items (id, name, type, condition, notes, assigned_to, assigned_at, returned_at, created_at, updated_at)
            VALUES (${item.id}, ${item.name}, ${item.type}, ${item.condition}, ${item.notes || null}, NULL, NULL, NULL, ${new Date(item.createdAt)}, ${new Date(item.updatedAt)})
          `);
        }
      }
      await db.execute(sql`SELECT setval('inventory_items_id_seq', (SELECT MAX(id) FROM inventory_items))`);
      console.log("Envanter öğeleri aktarıldı!");
    }

    // Daily Achievements
    if (jsonData.dailyAchievements && jsonData.dailyAchievements.length > 0) {
      console.log(`${jsonData.dailyAchievements.length} başarı kaydı aktarılıyor...`);
      for (const achievement of jsonData.dailyAchievements) {
        await db.insert(dailyAchievements).values({
          id: achievement.id,
          employeeId: achievement.employeeId,
          date: achievement.date,
          type: achievement.type as 'STAR' | 'CHEF' | 'X',
          notes: achievement.notes || null,
          createdAt: new Date(achievement.createdAt),
          updatedAt: new Date(achievement.updatedAt),
        });
      }
      await db.execute(sql`SELECT setval('daily_achievements_id_seq', (SELECT MAX(id) FROM daily_achievements))`);
      console.log("Başarı kayıtları aktarıldı!");
    }

    console.log("\n✅ Tüm veriler başarıyla aktarıldı!");
    process.exit(0);
  } catch (error) {
    console.error("Hata:", error);
    process.exit(1);
  }
}

importData();
