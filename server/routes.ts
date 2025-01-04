// Type declarations for modules without types
declare module 'xlsx-populate';
declare module 'pdfkit';

import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { employees, leaves, inventoryItems, dailyAchievements } from "@db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import XlsxPopulate from "xlsx-populate";
import PDFDocument from "pdfkit";
import { format, parseISO, startOfMonth, endOfMonth, differenceInDays, isWithinInterval } from "date-fns";
import { tr } from "date-fns/locale";

export function registerRoutes(app: Express): Server {
  // API güvenlik kontrolü
  const requireAuth = (req: any, res: any, next: any) => {
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

  // Employees
  app.get("/api/employees", async (req, res) => {
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
      await db
        .delete(employees)
        .where(eq(employees.id, parseInt(req.params.id)))
        .returning();
      res.json({ message: "Personel silindi" });
    } catch (error: any) {
      res.status(400).send("Personel silinemedi: " + error.message);
    }
  });

  // Leaves (İzinler)
  app.get("/api/leaves", async (req, res) => {
    try {
      const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;
      const allLeaves = await db.query.leaves.findMany({
        where: employeeId ? eq(leaves.employeeId, employeeId) : undefined,
        orderBy: (leaves, { desc }) => [desc(leaves.startDate)],
      });
      res.json(allLeaves);
    } catch (error: any) {
      res.status(500).send("İzin listesi alınamadı: " + error.message);
    }
  });

  app.post("/api/leaves", async (req, res) => {
    try {
      const leave = await db.insert(leaves).values(req.body).returning();
      res.json(leave[0]);
    } catch (error: any) {
      res.status(400).send("İzin eklenemedi: " + error.message);
    }
  });

  // İzin silme endpoint'i eklendi
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
  app.get("/api/reports/excel", async (req, res) => {
    try {
      const employeeId = parseInt(req.query.employeeId as string);
      const date = req.query.date as string;

      if (!employeeId || !date) {
        return res.status(400).send("Personel ID ve tarih zorunludur");
      }

      const [year, month] = date.split("-").map(Number);
      const startDate = startOfMonth(new Date(year, month - 1));
      const endDate = endOfMonth(new Date(year, month - 1));

      const employee = await db.query.employees.findFirst({
        where: eq(employees.id, employeeId),
      });

      if (!employee) {
        return res.status(404).send("Personel bulunamadı");
      }

      // Tüm yıl için izinleri al
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31);

      const employeeLeaves = await db.query.leaves.findMany({
        where: and(
          eq(leaves.employeeId, employeeId),
          gte(leaves.startDate, yearStart.toISOString()),
          lte(leaves.endDate, yearEnd.toISOString())
        ),
        orderBy: (leaves, { asc }) => [asc(leaves.startDate)],
      });

      // Excel dosyası oluştur
      const workbook = await XlsxPopulate.fromBlankAsync();
      const sheet = workbook.sheet(0);

      // Stil tanımlamaları
      const headerStyle = {
        bold: true,
        fontSize: 16,
        horizontalAlignment: "center",
        fontColor: "0000FF"
      };

      const subHeaderStyle = {
        bold: true,
        fontSize: 11,
        fill: "F0F0F0"
      };

      const tableHeaderStyle = {
        bold: true,
        fill: "E0E0E0",
        horizontalAlignment: "center",
        border: true
      };

      // Başlık
      sheet.cell("A1").value("Personel İzin Raporu").style(headerStyle);
      sheet.range("A1:E1").merged(true);

      // Personel bilgileri
      sheet.cell("A3").value("Personel Adı:").style(subHeaderStyle);
      sheet.cell("B3").value(`${employee.firstName} ${employee.lastName}`);
      sheet.cell("A4").value("Pozisyon:").style(subHeaderStyle);
      sheet.cell("B4").value(employee.position || "-");
      sheet.cell("A5").value("Dönem:").style(subHeaderStyle);
      sheet.cell("B5").value(format(startDate, "MMMM yyyy", { locale: tr }));

      // Seçili ay için izin detayları tablosu
      sheet.cell("A7").value("AYLIK İZİN DETAYLARI").style(headerStyle);
      sheet.range("A7:D7").merged(true);

      sheet.cell("A8").value("Başlangıç").style(tableHeaderStyle);
      sheet.cell("B8").value("Bitiş").style(tableHeaderStyle);
      sheet.cell("C8").value("Süre (Gün)").style(tableHeaderStyle);
      sheet.cell("D8").value("Not").style(tableHeaderStyle);

      let row = 9;
      let monthlyTotalDays = 0;

      employeeLeaves
        .filter(leave => {
          const leaveStart = parseISO(leave.startDate);
          const leaveEnd = parseISO(leave.endDate);
          return isWithinInterval(leaveStart, { start: startDate, end: endDate }) ||
            isWithinInterval(leaveEnd, { start: startDate, end: endDate }) ||
            (leaveStart <= startDate && leaveEnd >= endDate);
        })
        .forEach((leave) => {
          const start = parseISO(leave.startDate);
          const end = parseISO(leave.endDate);
          const days = differenceInDays(end, start) + 1;
          monthlyTotalDays += days;

          sheet.cell(`A${row}`).value(format(start, "dd.MM.yyyy")).style({ border: true });
          sheet.cell(`B${row}`).value(format(end, "dd.MM.yyyy")).style({ border: true });
          sheet.cell(`C${row}`).value(days).style({ border: true, horizontalAlignment: "center" });
          sheet.cell(`D${row}`).value(leave.reason).style({ border: true });
          row++;
        });

      // Aylık toplam
      sheet.cell(`A${row + 1}`).value("Aylık Toplam İzin:").style({ bold: true });
      sheet.cell(`C${row + 1}`).value(monthlyTotalDays).style({ bold: true, horizontalAlignment: "center" });

      // Yıllık özet tablosu
      row += 4;
      sheet.cell(`A${row}`).value("YILLIK İZİN ÖZETİ").style(headerStyle);
      sheet.range(`A${row}:D${row}`).merged(true);
      row++;

      sheet.cell(`A${row}`).value("Ay").style(tableHeaderStyle);
      sheet.cell(`B${row}`).value("İzin Günü").style(tableHeaderStyle);
      sheet.range(`C${row}:D${row}`).merged(true).value("Not").style(tableHeaderStyle);
      row++;

      let yearlyTotal = 0;
      for (let m = 0; m < 12; m++) {
        const monthStart = new Date(year, m, 1);
        const monthEnd = endOfMonth(monthStart);
        let monthlyDays = 0;
        const monthlyLeaves = employeeLeaves.filter(leave => {
          const leaveStart = parseISO(leave.startDate);
          const leaveEnd = parseISO(leave.endDate);
          return isWithinInterval(leaveStart, { start: monthStart, end: monthEnd }) ||
            isWithinInterval(leaveEnd, { start: monthStart, end: monthEnd }) ||
            (leaveStart <= monthStart && leaveEnd >= monthEnd);
        });

        monthlyLeaves.forEach(leave => {
          const start = parseISO(leave.startDate);
          const end = parseISO(leave.endDate);
          const effectiveStart = start < monthStart ? monthStart : start;
          const effectiveEnd = end > monthEnd ? monthEnd : end;
          monthlyDays += differenceInDays(effectiveEnd, effectiveStart) + 1;
        });

        yearlyTotal += monthlyDays;

        sheet.cell(`A${row}`).value(format(monthStart, "MMMM", { locale: tr })).style({ border: true });
        sheet.cell(`B${row}`).value(monthlyDays).style({ border: true, horizontalAlignment: "center" });
        sheet.range(`C${row}:D${row}`).merged(true).style({ border: true }).value(
          monthlyDays > 0 ? monthlyLeaves.map(l => l.reason).join(", ") : "-"
        );
        row++;
      }

      // Yıllık toplam
      sheet.cell(`A${row}`).value("Yıllık Toplam:").style({ bold: true });
      sheet.cell(`B${row}`).value(yearlyTotal).style({ bold: true, horizontalAlignment: "center" });

      // Sütun genişlikleri
      sheet.column("A").width(15);
      sheet.column("B").width(15);
      sheet.column("C").width(12);
      sheet.column("D").width(40);

      const buffer = await workbook.outputAsync();
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=izin-raporu-${format(startDate, "yyyy-MM")}.xlsx`);
      res.send(buffer);

    } catch (error: any) {
      console.error("Excel rapor hatası:", error);
      res.status(500).send("Rapor oluşturulamadı: " + error.message);
    }
  });

  app.get("/api/reports/pdf", async (req, res) => {
    try {
      const employeeId = parseInt(req.query.employeeId as string);
      const date = req.query.date as string;

      if (!employeeId || !date) {
        return res.status(400).send("Personel ID ve tarih zorunludur");
      }

      const [year, month] = date.split("-").map(Number);
      const startDate = startOfMonth(new Date(year, month - 1));
      const endDate = endOfMonth(new Date(year, month - 1));

      const employee = await db.query.employees.findFirst({
        where: eq(employees.id, employeeId),
      });

      if (!employee) {
        return res.status(404).send("Personel bulunamadı");
      }

      // Tüm yıl için izinleri al
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31);

      const employeeLeaves = await db.query.leaves.findMany({
        where: and(
          eq(leaves.employeeId, employeeId),
          gte(leaves.startDate, yearStart.toISOString()),
          lte(leaves.endDate, yearEnd.toISOString())
        ),
        orderBy: (leaves, { asc }) => [asc(leaves.startDate)],
      });

      // PDF dosyası oluştur
      const doc = new PDFDocument({
        size: "A4",
        margin: 50,
        info: {
          Title: 'İzin Raporu',
          Author: 'İK Yönetim Sistemi',
        }
      });

      // PDF akışını başlat
      const chunks: any[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => {
        const result = Buffer.concat(chunks);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=izin-raporu-${format(startDate, "yyyy-MM")}.pdf`);
        res.send(result);
      });

      // Başlık
      doc.fontSize(24)
        .fillColor('#1e40af')
        .text('İzin Raporu', { align: 'center' });

      doc.moveDown();

      // Personel bilgileri
      doc.fontSize(12)
        .fillColor('#374151');

      doc.text(`Personel: ${employee.firstName} ${employee.lastName}`);
      doc.text(`Pozisyon: ${employee.position || "-"}`);
      doc.text(`Dönem: ${format(startDate, "MMMM yyyy", { locale: tr })}`);

      doc.moveDown();

      // Seçili ay için izin detayları
      doc.fontSize(16)
        .fillColor('#1e40af')
        .text('Aylık İzin Detayları');

      doc.moveDown();

      // Tablo başlıkları
      doc.fontSize(11)
        .fillColor('#374151');

      let yPos = doc.y;
      const colWidths = [100, 100, 60, 200];
      const headers = ['Başlangıç', 'Bitiş', 'Gün', 'Not'];
      let xPos = 50;

      headers.forEach((header, i) => {
        doc.text(header, xPos, yPos);
        xPos += colWidths[i];
      });

      doc.moveDown();

      // İzin detayları
      let monthlyTotal = 0;

      const monthlyLeaves = employeeLeaves.filter(leave => {
        const leaveStart = parseISO(leave.startDate);
        const leaveEnd = parseISO(leave.endDate);
        return isWithinInterval(leaveStart, { start: startDate, end: endDate }) ||
          isWithinInterval(leaveEnd, { start: startDate, end: endDate }) ||
          (leaveStart <= startDate && leaveEnd >= endDate);
      });

      monthlyLeaves.forEach((leave) => {
        const start = parseISO(leave.startDate);
        const end = parseISO(leave.endDate);
        const days = differenceInDays(end, start) + 1;
        monthlyTotal += days;

        xPos = 50;
        doc.text(format(start, "dd.MM.yyyy"), xPos, doc.y);
        xPos += colWidths[0];
        doc.text(format(end, "dd.MM.yyyy"), xPos, doc.y);
        xPos += colWidths[1];
        doc.text(`${days} gün`, xPos, doc.y);
        xPos += colWidths[2];
        doc.text(leave.reason || "-", xPos, doc.y);
        doc.moveDown();
      });

      doc.moveDown()
        .fontSize(12)
        .text(`Aylık Toplam: ${monthlyTotal} gün`, { underline: true });

      doc.moveDown(2);

      // Yıllık özet
      doc.fontSize(16)
        .fillColor('#1e40af')
        .text('Yıllık İzin Özeti');

      doc.moveDown();

      // Yıllık tablo
      doc.fontSize(11)
        .fillColor('#374151');

      let yearlyTotal = 0;
      const months = Array.from({ length: 12 }, (_, i) => {
        const monthDate = new Date(year, i, 1);
        const monthEnd = endOfMonth(monthDate);
        let monthlyDays = 0;

        const monthlyLeaves = employeeLeaves.filter(leave => {
          const leaveStart = parseISO(leave.startDate);
          const leaveEnd = parseISO(leave.endDate);
          return isWithinInterval(leaveStart, { start: monthDate, end: monthEnd }) ||
            isWithinInterval(leaveEnd, { start: monthDate, end: monthEnd }) ||
            (leaveStart <= monthDate && leaveEnd >= monthEnd);
        });

        monthlyLeaves.forEach(leave => {
          const start = parseISO(leave.startDate);
          const end = parseISO(leave.endDate);
          const effectiveStart = start < monthDate ? monthDate : start;
          const effectiveEnd = end > monthEnd ? monthEnd : end;
          monthlyDays += differenceInDays(effectiveEnd, effectiveStart) + 1;
        });

        yearlyTotal += monthlyDays;

        return {
          name: format(monthDate, "MMMM", { locale: tr }),
          days: monthlyDays,
          notes: monthlyDays > 0 ? monthlyLeaves.map(l => l.reason).join(", ") : "-"
        };
      });

      months.forEach(month => {
        xPos = 50;
        doc.text(month.name, xPos, doc.y);
        xPos += 100;
        doc.text(`${month.days} gün`, xPos, doc.y);
        xPos += 60;
        doc.text(month.notes, xPos, doc.y);
        doc.moveDown();
      });

      doc.moveDown()
        .fontSize(12)
        .text(`Yıllık Toplam: ${yearlyTotal} gün`, { underline: true });

      // Footer
      doc.fontSize(8)
        .fillColor('#6b7280')
        .text(
          'Bu rapor otomatik olarak oluşturulmuştur.',
          { align: 'center' }
        );

      // PDF'i sonlandır
      doc.end();

    } catch (error: any) {
      console.error("PDF rapor hatası:", error);
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

  const httpServer = createServer(app);
  return httpServer;
}