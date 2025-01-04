// Type declarations for modules without types
declare module 'xlsx-populate';
declare module 'pdfkit';

import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { employees, leaves, inventoryItems } from "@db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import XlsxPopulate from "xlsx-populate";
import PDFDocument from "pdfkit";
import { format, parseISO, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
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

      const employeeLeaves = await db.query.leaves.findMany({
        where: and(
          eq(leaves.employeeId, employeeId),
          gte(leaves.startDate, startDate.toISOString()),
          lte(leaves.endDate, endDate.toISOString())
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

      // İzin detayları tablosu
      sheet.cell("A7").value("Başlangıç").style(tableHeaderStyle);
      sheet.cell("B7").value("Bitiş").style(tableHeaderStyle);
      sheet.cell("C7").value("Süre (Gün)").style(tableHeaderStyle);
      sheet.cell("D7").value("Not").style(tableHeaderStyle);

      let row = 8;
      let totalDays = 0;

      employeeLeaves.forEach((leave) => {
        const start = parseISO(leave.startDate);
        const end = parseISO(leave.endDate);
        const days = differenceInDays(end, start) + 1;
        totalDays += days;

        sheet.cell(`A${row}`).value(format(start, "dd.MM.yyyy")).style({ border: true });
        sheet.cell(`B${row}`).value(format(end, "dd.MM.yyyy")).style({ border: true });
        sheet.cell(`C${row}`).value(days).style({ border: true, horizontalAlignment: "center" });
        sheet.cell(`D${row}`).value(leave.reason).style({ border: true });
        row++;
      });

      // Toplam
      sheet.cell(`A${row + 1}`).value("Toplam İzin Günü:").style({ bold: true });
      sheet.cell(`C${row + 1}`).value(totalDays).style({ bold: true, horizontalAlignment: "center" });

      // Otomatik sütun genişliği
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

      const employeeLeaves = await db.query.leaves.findMany({
        where: and(
          eq(leaves.employeeId, employeeId),
          gte(leaves.startDate, startDate.toISOString()),
          lte(leaves.endDate, endDate.toISOString())
        ),
        orderBy: (leaves, { asc }) => [asc(leaves.startDate)],
      });

      // PDF dosyası oluştur
      const doc = new PDFDocument({
        size: "A4",
        margins: {
          top: 50,
          bottom: 50,
          left: 50,
          right: 50,
        },
        info: {
          Title: 'Personel İzin Raporu',
          Author: 'İK Yönetim Sistemi',
        }
      });

      // PDF akışını başlat
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => {
        const result = Buffer.concat(chunks);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename=izin-raporu-${format(startDate, "yyyy-MM")}.pdf`);
        res.send(result);
      });

      // Türkçe karakter desteği için font ekle
      doc.registerFont('Arial', 'Helvetica');

      // Logo ve başlık
      doc.fontSize(24)
         .font('Arial')
         .fillColor('#1e40af')
         .text('Personel İzin Raporu', { align: 'center' });

      doc.moveDown(2);

      // Personel bilgileri
      doc.fontSize(12)
         .font('Arial')
         .fillColor('#374151');

      const infoTable = {
        headers: ['Personel', 'Pozisyon', 'Dönem'],
        rows: [[
          `${employee.firstName} ${employee.lastName}`,
          employee.position || '-',
          format(startDate, "MMMM yyyy", { locale: tr })
        ]]
      };

      // Info table
      const infoColumnWidth = 150;
      const startY = doc.y;

      // Headers
      infoTable.headers.forEach((header, i) => {
        doc.font('Arial-Bold')
           .text(header, 50 + (i * infoColumnWidth), startY);
      });

      // Data
      infoTable.rows[0].forEach((cell, i) => {
        doc.font('Arial')
           .text(cell, 50 + (i * infoColumnWidth), startY + 25);
      });

      doc.moveDown(3);

      // İzin detayları tablosu
      const tableTop = doc.y;
      const columnWidth = 130;

      // Tablo başlıkları
      doc.font('Arial-Bold')
         .fontSize(11)
         .fillColor('#1e40af');

      ['Başlangıç', 'Bitiş', 'Süre', 'Not'].forEach((header, i) => {
        doc.text(header, 50 + (i * columnWidth), tableTop);
      });

      doc.moveDown();

      // Tablo içeriği
      let currentY = doc.y;
      let totalDays = 0;

      doc.font('Arial')
         .fontSize(10)
         .fillColor('#374151');

      employeeLeaves.forEach((leave) => {
        const start = parseISO(leave.startDate);
        const end = parseISO(leave.endDate);
        const days = differenceInDays(end, start) + 1;
        totalDays += days;

        // Her satır için arka plan
        doc.rect(45, currentY - 5, 500, 25)
           .fill('#f8fafc');

        doc.fillColor('#374151')
           .text(format(start, "dd.MM.yyyy"), 50, currentY)
           .text(format(end, "dd.MM.yyyy"), 50 + columnWidth, currentY)
           .text(`${days} gün`, 50 + (2 * columnWidth), currentY)
           .text(leave.reason || "-", 50 + (3 * columnWidth), currentY);

        currentY += 30;
      });

      // Toplam
      doc.moveDown()
         .font('Arial-Bold')
         .text(`Toplam İzin Günü: ${totalDays} gün`, { underline: true });

      // Footer
      const bottomOfPage = doc.page.height - 50;
      doc.fontSize(8)
         .fillColor('#6b7280')
         .text(
           'Bu rapor otomatik olarak oluşturulmuştur.',
           50,
           bottomOfPage,
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

  const httpServer = createServer(app);
  return httpServer;
}