// Type declarations for modules without types
declare module 'xlsx-populate' {
  interface Workbook {
    sheet(index: number): Sheet;
    outputAsync(): Promise<Buffer>;
  }

  interface Sheet {
    cell(ref: string): Cell;
    range(range: string): Range;
    column(col: string): Column;
  }

  interface Cell {
    value(value?: any): Cell;
    formula(formula: string): Cell;
    style(style: any): Cell;
  }

  interface Range {
    merged(merged: boolean): Range;
    style(style: any): Range;
    value(value: any): Range;
  }

  interface Column {
    width(width: number): void;
  }

  const XlsxPopulate: {
    fromBlankAsync(): Promise<Workbook>;
  };
  export = XlsxPopulate;
}

declare module 'pdfkit' {
  class PDFDocument {
    constructor(options?: any);
    on(event: string, callback: (chunk: Buffer) => void): void;
    fontSize(size: number): this;
    fillColor(color: string): this;
    text(text: string, options?: any): this;
    moveDown(): this;
    end(): void;
  }
  export = PDFDocument;
}

import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { employees, leaves, inventoryItems, dailyAchievements } from "@db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import XlsxPopulate from "xlsx-populate";
//import PDFDocument from "pdfkit"; // Removed PDFDocument import
import { format, parseISO, startOfMonth, endOfMonth, differenceInDays, isWithinInterval } from "date-fns";
import { tr } from "date-fns/locale";
import type { SQL } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  // API güvenlik kontrolü
  const requireAuth = (req: Request, res: Response, next: Function) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Giriş yapılmadı");
    }
    next();
  };

  // Tüm API rotalarında auth kontrolü
  app.use("/api/employees", requireAuth);
  app.use("/api/leaves", requireAuth);
  app.use("/api/inventory", requireAuth);
  app.use("/api/reports", requireAuth);

  // Get employees
  app.get("/api/employees", async (_req, res) => {
    try {
      const allEmployees = await db.query.employees.findMany();
      res.json(allEmployees);
    } catch (error: any) {
      res.status(500).send("Personel listesi alınamadı: " + error.message);
    }
  });

  app.get("/api/employees/:id", async (req, res) => {
    try {
      const employee = await db.query.employees.findFirst({
        where: eq(employees.id, parseInt(req.params.id)),
      });

      if (!employee) {
        return res.status(404).send("Personel bulunamadı");
      }

      res.json(employee);
    } catch (error: any) {
      res.status(500).send("Personel bilgisi alınamadı: " + error.message);
    }
  });

  app.post("/api/employees", async (req, res) => {
    try {
      const employee = await db.insert(employees).values(req.body).returning();
      res.json(employee[0]);
    } catch (error: any) {
      res.status(400).send("Personel eklenemedi: " + error.message);
    }
  });

  app.put("/api/employees/:id", async (req, res) => {
    try {
      const employee = await db
        .update(employees)
        .set(req.body)
        .where(eq(employees.id, parseInt(req.params.id)))
        .returning();
      res.json(employee[0]);
    } catch (error: any) {
      res.status(400).send("Personel güncellenemedi: " + error.message);
    }
  });

  app.delete("/api/employees/:id", async (req, res) => {
    try {
      const employeeId = parseInt(req.params.id);

      // Önce bağlı kayıtları sil
      await db.delete(leaves).where(eq(leaves.employeeId, employeeId));
      await db.delete(dailyAchievements).where(eq(dailyAchievements.employeeId, employeeId));
      await db.update(inventoryItems)
        .set({ assignedTo: null, assignedAt: null })
        .where(eq(inventoryItems.assignedTo, employeeId));

      // Sonra personeli sil
      const result = await db
        .delete(employees)
        .where(eq(employees.id, employeeId))
        .returning();

      if (result.length === 0) {
        return res.status(404).send("Personel bulunamadı");
      }

      res.json({ message: "Personel silindi", employee: result[0] });
    } catch (error: any) {
      console.error("Personel silme hatası:", error);
      res.status(500).send("Personel silinemedi: " + error.message);
    }
  });

  // Bulk leave management
  app.post("/api/leaves/bulk", async (req, res) => {
    try {
      const { employeeIds, startDate, endDate, reason } = req.body;

      if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
        return res.status(400).send("En az bir personel seçilmelidir");
      }

      if (!startDate || !endDate) {
        return res.status(400).send("Başlangıç ve bitiş tarihi gereklidir");
      }

      const createdLeaves = await db.transaction(async (tx) => {
        const leavePromises = employeeIds.map((employeeId) =>
          tx.insert(leaves).values({
            employeeId,
            startDate,
            endDate,
            reason: reason || null,
            type: "ANNUAL",
            status: "APPROVED",
          }).returning()
        );

        return await Promise.all(leavePromises);
      });

      res.json(createdLeaves.flat());
    } catch (error: any) {
      console.error("Toplu izin ekleme hatası:", error);
      res.status(400).send("İzinler eklenemedi: " + error.message);
    }
  });

  // Get leaves
  app.get("/api/leaves", async (req, res) => {
    try {
      const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;
      const conditions: SQL<unknown>[] = [];

      if (employeeId) {
        conditions.push(eq(leaves.employeeId, employeeId));
      }

      const allLeaves = await db.query.leaves.findMany({
        where: conditions.length > 0 ? and(...conditions) : undefined,
        orderBy: [desc(leaves.startDate)],
      });
      res.json(allLeaves);
    } catch (error: any) {
      res.status(500).send("İzin listesi alınamadı: " + error.message);
    }
  });

  // Create leave
  app.post("/api/leaves", async (req, res) => {
    try {
      const leave = await db.insert(leaves).values(req.body).returning();
      res.json(leave[0]);
    } catch (error: any) {
      res.status(400).send("İzin eklenemedi: " + error.message);
    }
  });

  app.delete("/api/leaves/:id", async (req, res) => {
    try {
      const result = await db.delete(leaves)
        .where(eq(leaves.id, parseInt(req.params.id)))
        .returning();

      if (result.length === 0) {
        return res.status(404).send("İzin bulunamadı");
      }

      res.json({ message: "İzin silindi", leave: result[0] });
    } catch (error: any) {
      console.error("İzin silme hatası:", error);
      res.status(500).send("İzin silinemedi: " + error.message);
    }
  });
  // Raporlama API'leri
  // Header stili ve tablo tasarımı için stil tanımlamaları
  const headerStyle = {
    bold: true,
    fontSize: 16,
    horizontalAlignment: "center",
    fontColor: "0000FF",
    fill: {
      type: "pattern",
      pattern: "solid",
      fgColor: "F8F9FA"
    },
    border: {
      top: { style: "thin", color: "E9ECEF" },
      bottom: { style: "thin", color: "E9ECEF" },
      left: { style: "thin", color: "E9ECEF" },
      right: { style: "thin", color: "E9ECEF" }
    }
  };

  const subHeaderStyle = {
    bold: true,
    fontSize: 11,
    fill: {
      type: "pattern",
      pattern: "solid",
      fgColor: "F8F9FA"
    },
    border: {
      top: { style: "thin", color: "E9ECEF" },
      bottom: { style: "thin", color: "E9ECEF" },
      left: { style: "thin", color: "E9ECEF" },
      right: { style: "thin", color: "E9ECEF" }
    }
  };

  const tableHeaderStyle = {
    bold: true,
    fontSize: 10,
    horizontalAlignment: "center",
    fill: {
      type: "pattern",
      pattern: "solid",
      fgColor: "F1F3F5"
    },
    border: {
      top: { style: "thin", color: "DEE2E6" },
      bottom: { style: "thin", color: "DEE2E6" },
      left: { style: "thin", color: "DEE2E6" },
      right: { style: "thin", color: "DEE2E6" }
    }
  };

  const cellStyle = {
    fontSize: 10,
    border: {
      top: { style: "thin", color: "E9ECEF" },
      bottom: { style: "thin", color: "E9ECEF" },
      left: { style: "thin", color: "E9ECEF" },
      right: { style: "thin", color: "E9ECEF" }
    }
  };

  app.get("/api/reports/excel", async (req, res) => {
    try {
      const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;
      const date = req.query.date as string;

      if (!date) {
        return res.status(400).send("Tarih zorunludur");
      }

      const [year, month] = date.split("-").map(Number);
      const startDate = startOfMonth(new Date(year, month - 1));
      const endDate = endOfMonth(new Date(year, month - 1));

      const workbook = await XlsxPopulate.fromBlankAsync();
      const sheet = workbook.sheet(0);

      if (employeeId) {
        // Tek personel detaylı raporu
        const employee = await db.query.employees.findFirst({
          where: eq(employees.id, employeeId),
        });

        if (!employee) {
          return res.status(404).send("Personel bulunamadı");
        }

        const leaves = await db.query.leaves.findMany({
          where: and(
            eq(leaves.employeeId, employeeId),
            gte(leaves.startDate, startDate.toISOString()),
            lte(leaves.endDate, endDate.toISOString())
          ),
          orderBy: (leaves, { asc }) => [asc(leaves.startDate)],
        });

        // Header
        sheet.cell("A1").value("PERSONEL İZİN RAPORU").style(headerStyle);
        sheet.range("A1:E1").merged(true);

        // Logo veya şirket adı alanı
        sheet.cell("A3").value("Şirket Adı").style(subHeaderStyle);
        sheet.range("A3:B3").merged(true);

        // Rapor detayları
        sheet.cell("A4").value("Personel:").style(subHeaderStyle);
        sheet.cell("B4").value(`${employee.firstName} ${employee.lastName}`).style(cellStyle);
        sheet.cell("A5").value("Pozisyon:").style(subHeaderStyle);
        sheet.cell("B5").value(employee.position || "-").style(cellStyle);
        sheet.cell("A6").value("Dönem:").style(subHeaderStyle);
        sheet.cell("B6").value(format(startDate, "MMMM yyyy", { locale: tr })).style(cellStyle);

        // Detay tablosu başlığı
        sheet.cell("A8").value("İZİN DETAYLARI").style(headerStyle);
        sheet.range("A8:D8").merged(true);

        // Tablo başlıkları
        sheet.cell("A9").value("Başlangıç").style(tableHeaderStyle);
        sheet.cell("B9").value("Bitiş").style(tableHeaderStyle);
        sheet.cell("C9").value("Gün").style(tableHeaderStyle);
        sheet.cell("D9").value("Not").style(tableHeaderStyle);

        let row = 10;
        let totalDays = 0;

        leaves.forEach((leave) => {
          const start = parseISO(leave.startDate);
          const end = parseISO(leave.endDate);
          const days = differenceInDays(end, start) + 1;
          totalDays += days;

          sheet.cell(`A${row}`).value(format(start, "dd.MM.yyyy")).style(cellStyle);
          sheet.cell(`B${row}`).value(format(end, "dd.MM.yyyy")).style(cellStyle);
          sheet.cell(`C${row}`).value(days).style({ ...cellStyle, horizontalAlignment: "center" });
          sheet.cell(`D${row}`).value(leave.reason || "-").style(cellStyle);
          row++;
        });

        // Toplam satırı
        sheet.cell(`A${row + 1}`).value("TOPLAM").style(subHeaderStyle);
        sheet.cell(`C${row + 1}`).value(totalDays).style({ ...subHeaderStyle, horizontalAlignment: "center" });

      } else {
        // Tüm personeller için özet rapor
        const allEmployees = await db.query.employees.findMany({
          orderBy: (employees, { asc }) => [asc(employees.firstName), asc(employees.lastName)],
        });

        // Header
        sheet.cell("A1").value("PERSONEL İZİN ÖZET RAPORU").style(headerStyle);
        sheet.range("A1:F1").merged(true);

        // Rapor bilgileri
        sheet.cell("A3").value("Şirket Adı").style(subHeaderStyle);
        sheet.range("A3:B3").merged(true);
        sheet.cell("A4").value("Dönem:").style(subHeaderStyle);
        sheet.cell("B4").value(format(startDate, "MMMM yyyy", { locale: tr })).style(cellStyle);

        // Tablo başlıkları
        let currentRow = 6;
        sheet.cell(`A${currentRow}`).value("Ad Soyad").style(tableHeaderStyle);
        sheet.cell(`B${currentRow}`).value("Pozisyon").style(tableHeaderStyle);
        sheet.cell(`C${currentRow}`).value("İzin Başlangıç").style(tableHeaderStyle);
        sheet.cell(`D${currentRow}`).value("İzin Bitiş").style(tableHeaderStyle);
        sheet.cell(`E${currentRow}`).value("Toplam Gün").style(tableHeaderStyle);
        sheet.cell(`F${currentRow}`).value("Not").style(tableHeaderStyle);
        currentRow++;

        // Her personel için izinleri listele
        for (const employee of allEmployees) {
          const leaves = await db.query.leaves.findMany({
            where: and(
              eq(leaves.employeeId, employee.id),
              gte(leaves.startDate, startDate.toISOString()),
              lte(leaves.endDate, endDate.toISOString())
            ),
            orderBy: (leaves, { asc }) => [asc(leaves.startDate)],
          });

          if (leaves.length > 0) {
            leaves.forEach((leave) => {
              const start = parseISO(leave.startDate);
              const end = parseISO(leave.endDate);
              const days = differenceInDays(end, start) + 1;

              sheet.cell(`A${currentRow}`).value(`${employee.firstName} ${employee.lastName}`).style(cellStyle);
              sheet.cell(`B${currentRow}`).value(employee.position || "-").style(cellStyle);
              sheet.cell(`C${currentRow}`).value(format(start, "dd.MM.yyyy")).style(cellStyle);
              sheet.cell(`D${currentRow}`).value(format(end, "dd.MM.yyyy")).style(cellStyle);
              sheet.cell(`E${currentRow}`).value(days).style({ ...cellStyle, horizontalAlignment: "center" });
              sheet.cell(`F${currentRow}`).value(leave.reason || "-").style(cellStyle);
              currentRow++;
            });
          } else {
            sheet.cell(`A${currentRow}`).value(`${employee.firstName} ${employee.lastName}`).style(cellStyle);
            sheet.cell(`B${currentRow}`).value(employee.position || "-").style(cellStyle);
            sheet.range(`C${currentRow}:F${currentRow}`).merged(true).value("İzin Bulunmuyor").style({ ...cellStyle, horizontalAlignment: "center" });
            currentRow++;
          }
        }

        // Sütun genişlikleri
        sheet.column("A").width(25);
        sheet.column("B").width(20);
        sheet.column("C").width(15);
        sheet.column("D").width(15);
        sheet.column("E").width(12);
        sheet.column("F").width(30);
      }

      const buffer = await workbook.outputAsync();
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=izin-raporu-${format(startDate, "yyyy-MM")}.xlsx`);
      res.send(buffer);

    } catch (error: any) {
      console.error("Excel rapor hatası:", error);
      res.status(500).send("Rapor oluşturulamadı: " + error.message);
    }
  });

  // Inventory Items (Envanter)
  app.get("/api/inventory", async (req, res) => {
    try {
      const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;
      const items = await db.query.inventoryItems.findMany({
        where: employeeId ? eq(inventoryItems.assignedTo, employeeId) : undefined,
        orderBy: (items, { desc }) => [desc(items.createdAt)],
      });
      res.json(items);
    } catch (error: any) {
      res.status(500).send("Envanter listesi alınamadı: " + error.message);
    }
  });

  app.post("/api/inventory", async (req, res) => {
    try {
      const { name, notes, assignedTo } = req.body;

      if (!name) {
        return res.status(400).send("Eşya adı gereklidir");
      }

      const newItem = {
        name,
        notes: notes || null,
        type: "diğer",
        condition: "yeni",
        assignedTo: assignedTo || null,
        assignedAt: assignedTo ? new Date() : null,
      };

      const item = await db.insert(inventoryItems).values(newItem).returning();
      res.json(item[0]);
    } catch (error: any) {
      console.error("Envanter ekleme hatası:", error);
      res.status(400).send("Envanter öğesi eklenemedi: " + error.message);
    }
  });

  app.put("/api/inventory/:id", async (req, res) => {
    try {
      const { name, notes } = req.body;

      if (!name) {
        return res.status(400).send("Eşya adı gereklidir");
      }

      const updatedItem = await db
        .update(inventoryItems)
        .set({
          name,
          notes: notes || null,
        })
        .where(eq(inventoryItems.id, parseInt(req.params.id)))
        .returning();

      res.json(updatedItem[0]);
    } catch (error: any) {
      console.error("Envanter güncelleme hatası:", error);
      res.status(500).send("Envanter öğesi güncellenemedi: " + error.message);
    }
  });

  app.delete("/api/inventory/:id", async (req, res) => {
    try {
      const result = await db
        .delete(inventoryItems)
        .where(eq(inventoryItems.id, parseInt(req.params.id)))
        .returning();

      if (result.length === 0) {
        return res.status(404).send("Envanter öğesi bulunamadı");
      }

      res.json({ message: "Envanter öğesi silindi", item: result[0] });
    } catch (error: any) {
      console.error("Envanter silme hatası:", error);
      res.status(500).send("Envanter öğesi silinemedi: " + error.message);
    }
  });

  // Daily Achievements API Routes
  app.get("/api/achievements", async (req, res) => {
    try {
      const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;
      const startDate = req.query.startDate ? req.query.startDate as string : undefined;
      const endDate = req.query.endDate ? req.query.endDate as string : undefined;

      let query = db.select().from(dailyAchievements);

      if (employeeId) {
        query = query.where(eq(dailyAchievements.employeeId, employeeId));
      }

      if (startDate && endDate) {
        query = query.where(
          and(
            gte(dailyAchievements.date, startDate),
            lte(dailyAchievements.date, endDate)
          )
        );
      }

      query = query.orderBy(desc(dailyAchievements.date));

      const achievements = await query;
      res.json(achievements);
    } catch (error: any) {
      console.error("Başarı listesi alınamadı:", error);
      res.status(500).send("Başarı listesi alınamadı: " + error.message);
    }
  });

  app.post("/api/achievements", async (req, res) => {
    try {
      const achievement = await db.insert(dailyAchievements).values(req.body).returning();
      res.json(achievement[0]);
    } catch (error: any) {
      console.error("Başarı eklenemedi:", error);
      res.status(400).send("Başarı eklenemedi: " + error.message);
    }
  });

  app.put("/api/achievements/:id", async (req, res) => {
    try {
      const achievement = await db
        .update(dailyAchievements)
        .set(req.body)
        .where(eq(dailyAchievements.id, parseInt(req.params.id)))
        .returning();
      res.json(achievement[0]);
    } catch (error: any) {
      console.error("Başarı güncellenemedi:", error);
      res.status(400).send("Başarı güncellenemedi: " + error.message);
    }
  });

  app.delete("/api/achievements/:id", async (req, res) => {
    try {
      await db
        .delete(dailyAchievements)
        .where(eq(dailyAchievements.id, parseInt(req.params.id)))
        .returning();
      res.json({ message: "Başarı silindi" });
    } catch (error: any) {
      console.error("Başarı silinemedi:", error);
      res.status(400).send("Başarı silinemedi: " + error.message);
    }
  });

  // Fix the achievements Excel report section
  app.get("/api/achievements/excel", async (req, res) => {
    try {
      const date = req.query.date as string;
      const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;

      if (!date) {
        return res.status(400).send("Tarih zorunludur");
      }

      const [year, month] = date.split("-").map(Number);
      const reportStartDate = startOfMonth(new Date(year, month - 1));
      const reportEndDate = endOfMonth(new Date(year, month - 1));

      const workbook = await XlsxPopulate.fromBlankAsync();
      const sheet = workbook.sheet(0);

      // Define styles
      const headerStyle = {
        bold: true,
        fontSize: 16,
        horizontalAlignment: "center",
        fontColor: "0000FF",
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: "F8F9FA"
        },
        border: {
          top: { style: "thin", color: "E9ECEF" },
          bottom: { style: "thin", color: "E9ECEF" },
          left: { style: "thin", color: "E9ECEF" },
          right: { style: "thin", color: "E9ECEF" }
        }
      };

      const subHeaderStyle = {
        bold: true,
        fontSize: 11,
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: "F8F9FA"
        },
        border: {
          top: { style: "thin", color: "E9ECEF" },
          bottom: { style: "thin", color: "E9ECEF" },
          left: { style: "thin", color: "E9ECEF" },
          right: { style: "thin", color: "E9ECEF" }
        }
      };

      const tableHeaderStyle = {
        bold: true,
        fontSize: 10,
        horizontalAlignment: "center",
        fill: {
          type: "pattern",
          pattern: "solid",
          fgColor: "F1F3F5"
        },
        border: {
          top: { style: "thin", color: "DEE2E6" },
          bottom: { style: "thin", color: "DEE2E6" },
          left: { style: "thin", color: "DEE2E6" },
          right: { style: "thin", color: "DEE2E6" }
        }
      };

      const cellStyle = {
        fontSize: 10,
        border: {
          top: { style: "thin", color: "E9ECEF" },
          bottom: { style: "thin", color: "E9ECEF" },
          left: { style: "thin", color: "E9ECEF" },
          right: { style: "thin", color: "E9ECEF" }
        }
      };

      if (employeeId) {
        // Single employee detailed report
        const employee = await db.query.employees.findFirst({
          where: eq(employees.id, employeeId),
        });

        if (!employee) {
          return res.status(404).send("Personel bulunamadı");
        }

        const achievements = await db.query.dailyAchievements.findMany({
          where: and(
            eq(dailyAchievements.employeeId, employeeId),
            gte(dailyAchievements.date, reportStartDate.toISOString()),
            lte(dailyAchievements.date, reportEndDate.toISOString())
          ),
          orderBy: (achievements, { asc }) => [asc(achievements.date)],
        });

        // Header and employee info
        sheet.cell("A1").value("Personel Performans Raporu").style(headerStyle);
        sheet.range("A1:E1").merged(true);

        sheet.cell("A3").value("Personel Adı:").style(subHeaderStyle);
        sheet.cell("B3").value(`${employee.firstName} ${employee.lastName}`);
        sheet.cell("A4").value("Pozisyon:").style(subHeaderStyle);
        sheet.cell("B4").value(employee.position || "-");
        sheet.cell("A5").value("Dönem:").style(subHeaderStyle);
        sheet.cell("B5").value(format(reportStartDate, "MMMM yyyy", { locale: tr }));

        // Achievement details table
        sheet.cell("A7").value("AYLIK PERFORMANS DETAYLARI").style(headerStyle);
        sheet.range("A7:D7").merged(true);

        sheet.cell("A8").value("Tarih").style(tableHeaderStyle);
        sheet.cell("B8").value("Tip").style(tableHeaderStyle);
        sheet.cell("C8").value("Not").style(tableHeaderStyle);

        let currentRow = 9;
        const stats = {
          STAR: 0,
          CHEF: 0,
          X: 0,
        };

        achievements.forEach((achievement) => {
          const achievementDate = parseISO(achievement.date);
          stats[achievement.type as keyof typeof stats]++;

          sheet.cell(`A${currentRow}`).value(format(achievementDate, "dd.MM.yyyy")).style({ border: true });
          sheet.cell(`B${currentRow}`).value({
            'STAR': 'Yıldız',
            'CHEF': 'Şef',
            'X': 'Zarar'
          }[achievement.type]).style({ border: true });
          sheet.cell(`C${currentRow}`).value(achievement.notes || "-").style({ border: true });
          currentRow++;
        });

        // Monthly summary
        currentRow += 2;
        sheet.cell(`A${currentRow}`).value("AYLIK ÖZET").style(headerStyle);
        sheet.range(`A${currentRow}:C${currentRow}`).merged(true);
        currentRow++;

        sheet.cell(`A${currentRow}`).value("Yıldız:").style(subHeaderStyle);
        sheet.cell(`B${currentRow}`).value(stats.STAR);
        currentRow++;

        sheet.cell(`A${currentRow}`).value("Şef:").style(subHeaderStyle);
        sheet.cell(`B${currentRow}`).value(stats.CHEF);
        currentRow++;

        sheet.cell(`A${currentRow}`).value("Zarar:").style(subHeaderStyle);
        sheet.cell(`B${currentRow}`).value(stats.X);

        // Column widths
        sheet.column("A").width(15);
        sheet.column("B").width(15);
        sheet.column("C").width(40);

      } else {
        // Summary report for all employees
        const allEmployees = await db.query.employees.findMany();

        // Header
        sheet.cell("A1").value("Aylık Performans Raporu").style(headerStyle);
        sheet.range("A1:F1").merged(true);

        sheet.cell("A3").value("Dönem:").style(subHeaderStyle);
        sheet.cell("B3").value(format(reportStartDate, "MMMM yyyy", { locale: tr }));

        // Table headers
        let currentRow = 5;
        sheet.cell(`A${currentRow}`).value("Ad Soyad").style(tableHeaderStyle);
        sheet.cell(`B${currentRow}`).value("Pozisyon").style(tableHeaderStyle);
        sheet.cell(`C${currentRow}`).value("Yıldız").style(tableHeaderStyle);
        sheet.cell(`D${currentRow}`).value("Şef").style(tableHeaderStyle);
        sheet.cell(`E${currentRow}`).value("Zarar").style(tableHeaderStyle);
        sheet.cell(`F${currentRow}`).value("Toplam").style(tableHeaderStyle);
        currentRow++;

        // Employee performance data
        for (const employee of allEmployees) {
          const achievements = await db.query.dailyAchievements.findMany({
            where: and(
              eq(dailyAchievements.employeeId, employee.id),
              gte(dailyAchievements.date, reportStartDate.toISOString()),
              lte(dailyAchievements.date, reportEndDate.toISOString())
            ),
            orderBy: (achievements, { asc }) => [asc(achievements.date)],
          });

          const stats = {
            STAR: achievements.filter(a => a.type === 'STAR').length,
            CHEF: achievements.filter(a => a.type === 'CHEF').length,
            X: achievements.filter(a => a.type === 'X').length,
          };

          sheet.cell(`A${currentRow}`).value(`${employee.firstName} ${employee.lastName}`).style({ border: true });
          sheet.cell(`B${currentRow}`).value(employee.position || "-").style({ border: true });
          sheet.cell(`C${currentRow}`).value(stats.STAR).style({ border: true, horizontalAlignment: "center" });
          sheet.cell(`D${currentRow}`).value(stats.CHEF).style({ border: true, horizontalAlignment: "center" });
          sheet.cell(`E${currentRow}`).value(stats.X).style({ border: true, horizontalAlignment: "center" });
          sheet.cell(`F${currentRow}`).value(stats.STAR + stats.CHEF + stats.X).style({ border: true, horizontalAlignment: "center" });
          currentRow++;
        }

        // Totals row
        currentRow++;
        sheet.cell(`A${currentRow}`).value("TOPLAM").style(subHeaderStyle);
        sheet.range(`A${currentRow}:B${currentRow}`).merged(true);

        // Total formulas
        sheet.cell(`C${currentRow}`).formula(`=SUM(C6:C${currentRow - 2})`).style(subHeaderStyle);
        sheet.cell(`D${currentRow}`).formula(`=SUM(D6:D${currentRow - 2})`).style(subHeaderStyle);
        sheet.cell(`E${currentRow}`).formula(`=SUM(E6:E${currentRow - 2})`).style(subHeaderStyle);
        sheet.cell(`F${currentRow}`).formula(`=SUM(F6:F${currentRow - 2})`).style(subHeaderStyle);

        // Column widths
        sheet.column("A").width(30);
        sheet.column("B").width(20);
        sheet.column("C").width(15);
        sheet.column("D").width(15);
        sheet.column("E").width(15);
        sheet.column("F").width(15);
      }

      const buffer = await workbook.outputAsync();
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=performans-raporu-${format(reportStartDate, "yyyy-MM")}.xlsx`);
      res.send(buffer);

    } catch (error: any) {
      console.error("Excel rapor hatası:", error);
      res.status(500).send("Rapor oluşturulamadı: " + error.message);
    }
  });

  // Daily Achievements API Routes
  app.get("/api/achievements", async (req, res) => {
    try {
      const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;
      const startDate = req.query.startDate ? req.query.startDate as string : undefined;
      const endDate = req.query.endDate ? req.query.endDate as string : undefined;

      let query = db.select().from(dailyAchievements);

      if (employeeId) {
        query = query.where(eq(dailyAchievements.employeeId, employeeId));
      }

      if (startDate && endDate) {
        query = query.where(
          and(
            gte(dailyAchievements.date, startDate),
            lte(dailyAchievements.date, endDate)
          )
        );
      }

      query = query.orderBy(desc(dailyAchievements.date));

      const achievements = await query;
      res.json(achievements);
    } catch (error: any) {
      console.error("Başarı listesi alınamadı:", error);
      res.status(500).send("Başarı listesi alınamadı: " + error.message);
    }
  });

  app.post("/api/achievements", async (req, res) => {
    try {
      const achievement = await db.insert(dailyAchievements).values(req.body).returning();
      res.json(achievement[0]);
    } catch (error: any) {
      console.error("Başarı eklenemedi:", error);
      res.status(400).send("Başarı eklenemedi: " + error.message);
    }
  });

  app.put("/api/achievements/:id", async (req, res) => {
    try {
      const achievement = await db
        .update(dailyAchievements)
        .set(req.body)
        .where(eq(dailyAchievements.id, parseInt(req.params.id)))
        .returning();
      res.json(achievement[0]);
    } catch (error: any) {
      console.error("Başarı güncellenemedi:", error);
      res.status(400).send("Başarı güncellenemedi: " + error.message);
    }
  });

  app.delete("/api/achievements/:id", async (req, res) => {
    try {
      await db
        .delete(dailyAchievements)
        .where(eq(dailyAchievements.id, parseInt(req.params.id)))
        .returning();
      res.json({ message: "Başarı silindi" });
    } catch (error: any) {
      console.error("Başarı silinemedi:", error);
      res.status(400).send("Başarı silinemedi: " + error.message);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}