var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import "dotenv/config";
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// db/index.ts
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

// db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  achievementRelations: () => achievementRelations,
  dailyAchievements: () => dailyAchievements,
  employeeRelations: () => employeeRelations,
  employees: () => employees,
  insertDailyAchievementSchema: () => insertDailyAchievementSchema,
  insertEmployeeSchema: () => insertEmployeeSchema,
  insertInventoryItemSchema: () => insertInventoryItemSchema,
  insertLeaveSchema: () => insertLeaveSchema,
  insertUserSchema: () => insertUserSchema,
  insertVehicleSchema: () => insertVehicleSchema,
  inventoryItemRelations: () => inventoryItemRelations,
  inventoryItems: () => inventoryItems,
  leaveRelations: () => leaveRelations,
  leaves: () => leaves,
  selectDailyAchievementSchema: () => selectDailyAchievementSchema,
  selectEmployeeSchema: () => selectEmployeeSchema,
  selectInventoryItemSchema: () => selectInventoryItemSchema,
  selectLeaveSchema: () => selectLeaveSchema,
  selectUserSchema: () => selectUserSchema,
  selectVehicleSchema: () => selectVehicleSchema,
  users: () => users,
  vehicles: () => vehicles
});
import { pgTable, text, serial, date, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  address: text("address"),
  position: text("position"),
  department: text("department"),
  salary: numeric("salary").notNull(),
  joinDate: date("join_date"),
  emergencyContacts: jsonb("emergency_contacts").$type().default([]),
  totalLeaveAllowance: numeric("total_leave_allowance").default("30"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  plate: text("plate").unique().notNull(),
  mileage: numeric("mileage").notNull(),
  inspectionDate: date("inspection_date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var employeeRelations = relations(employees, ({ many }) => ({
  leaves: many(leaves),
  achievements: many(dailyAchievements),
  inventoryItems: many(inventoryItems)
}));
var insertUserSchema = createInsertSchema(users);
var selectUserSchema = createSelectSchema(users);
var insertEmployeeSchema = createInsertSchema(employees);
var selectEmployeeSchema = createSelectSchema(employees);
var insertVehicleSchema = createInsertSchema(vehicles);
var selectVehicleSchema = createSelectSchema(vehicles);
var leaves = pgTable("leaves", {
  id: serial("id").primaryKey(),
  employeeId: serial("employee_id").references(() => employees.id).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var dailyAchievements = pgTable("daily_achievements", {
  id: serial("id").primaryKey(),
  employeeId: serial("employee_id").references(() => employees.id).notNull(),
  date: date("date").notNull(),
  type: text("type", { enum: ["STAR", "CHEF", "X"] }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  condition: text("condition").notNull(),
  notes: text("notes"),
  assignedTo: serial("assigned_to").references(() => employees.id, { onDelete: "set null" }),
  assignedAt: timestamp("assigned_at"),
  returnedAt: timestamp("returned_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var leaveRelations = relations(leaves, ({ one }) => ({
  employee: one(employees, {
    fields: [leaves.employeeId],
    references: [employees.id]
  })
}));
var achievementRelations = relations(dailyAchievements, ({ one }) => ({
  employee: one(employees, {
    fields: [dailyAchievements.employeeId],
    references: [employees.id]
  })
}));
var inventoryItemRelations = relations(inventoryItems, ({ one }) => ({
  employee: one(employees, {
    fields: [inventoryItems.assignedTo],
    references: [employees.id]
  })
}));
var selectLeaveSchema = createSelectSchema(leaves);
var insertLeaveSchema = createInsertSchema(leaves);
var insertDailyAchievementSchema = createInsertSchema(dailyAchievements);
var selectDailyAchievementSchema = createSelectSchema(dailyAchievements);
var insertInventoryItemSchema = createInsertSchema(inventoryItems);
var selectInventoryItemSchema = createSelectSchema(inventoryItems);

// db/index.ts
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var db = drizzle({
  connection: process.env.DATABASE_URL,
  schema: schema_exports,
  ws
});

// server/routes.ts
import { eq, and, gte, lte, desc } from "drizzle-orm";
import XlsxPopulate from "xlsx-populate";
import { format as format2, parseISO, startOfMonth, endOfMonth, differenceInDays } from "date-fns";
import { tr as tr2 } from "date-fns/locale";

// server/utils/mailer.ts
import nodemailer from "nodemailer";
import Handlebars from "handlebars";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
var emailTemplate = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding: 15px 0;
      background-color: #f5f5f5;
      border-radius: 5px;
    }
    .logo {
      max-width: 220px;
      height: auto;
    }
    .content {
      background: #f9f9f9;
      padding: 20px;
      border-radius: 5px;
    }
    .vehicle-info {
      margin-top: 20px;
      padding: 15px;
      background: #fff;
      border-radius: 5px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      border-left: 4px solid #2c3e50;
    }
    .warning {
      color: #d63031;
      font-weight: bold;
      font-size: 16px;
    }
    .footer {
      margin-top: 20px;
      padding-top: 15px;
      border-top: 1px solid #e0e0e0;
      font-size: 12px;
      color: #666;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://europatrans.com.tr/wp-content/themes/transport/assets/images/logo.png" alt="Europa Trans Logo" class="logo">
      <h2>Ara\xE7 Muayene Bildirimi</h2>
    </div>
    <div class="content">
      <p>Say\u0131n \u0130lgili,</p>
      <p>Ara\xE7 muayene tarihi yakla\u015Fan ara\xE7 bilgileri a\u015Fa\u011F\u0131dad\u0131r:</p>
      <div class="vehicle-info">
        <p><strong>Ara\xE7:</strong> {{vehicleName}}</p>
        <p><strong>Plaka:</strong> {{plate}}</p>
        <p><strong>Muayene Tarihi:</strong> {{inspectionDate}}</p>
        <p class="warning">\u26A0\uFE0F Muayene tarihine {{remainingDays}} g\xFCn kald\u0131!</p>
      </div>
      <p>L\xFCtfen gerekli haz\u0131rl\u0131klar\u0131 yap\u0131n\u0131z.</p>
      <br>
      <p>Sayg\u0131lar\u0131m\u0131zla,<br>Europa Trans Lojistik</p>
    </div>
    <div class="footer">
      <p>Bu e-posta otomatik olarak g\xF6nderilmi\u015Ftir. L\xFCtfen yan\u0131tlamay\u0131n\u0131z.</p>
      <p>\xA9 ${(/* @__PURE__ */ new Date()).getFullYear()} Europa Trans Lojistik - T\xFCm Haklar\u0131 Sakl\u0131d\u0131r</p>
    </div>
  </div>
</body>
</html>
`;
var template = Handlebars.compile(emailTemplate);
var transporter = nodemailer.createTransport({
  host: "smtp.yandex.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});
async function sendVehicleInspectionReminder(vehicle, daysRemaining) {
  console.log(`Preparing email for vehicle: ${vehicle.name} (${vehicle.plate}), inspection date: ${vehicle.inspectionDate}, days remaining: ${daysRemaining}`);
  if (!process.env.EMAIL_USER) {
    throw new Error("EMAIL_USER environment variable is not set");
  }
  if (!process.env.EMAIL_PASSWORD) {
    throw new Error("EMAIL_PASSWORD environment variable is not set");
  }
  const html = template({
    vehicleName: vehicle.name,
    plate: vehicle.plate,
    inspectionDate: format(vehicle.inspectionDate, "d MMMM yyyy", { locale: tr }),
    remainingDays: daysRemaining
  });
  console.log(`Email template generated, sending from: ${process.env.EMAIL_USER} to: info@europatrans.com.tr`);
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: "info@europatrans.com.tr",
      subject: `Ara\xE7 Muayene Hat\u0131rlatmas\u0131 - ${vehicle.plate} - ${daysRemaining} G\xFCn Kald\u0131`,
      html
    });
    console.log("Email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}
async function sendTestMail() {
  console.log("Starting test mail process...");
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error(
      "Email credentials are missing: ",
      !process.env.EMAIL_USER ? "EMAIL_USER is missing" : "",
      !process.env.EMAIL_PASSWORD ? "EMAIL_PASSWORD is missing" : ""
    );
    return {
      success: false,
      message: "Email kimlik bilgileri eksik. L\xFCtfen sistem y\xF6neticisine ba\u015Fvurun."
    };
  }
  console.log(`Using email: ${process.env.EMAIL_USER}`);
  const testVehicle = {
    name: "Test Ara\xE7",
    plate: "34TEST123",
    inspectionDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1e3)
    // 20 gün sonrası
  };
  try {
    console.log(`Testing email with vehicle: ${testVehicle.name} (${testVehicle.plate})`);
    console.log("Testing SMTP connection...");
    await transporter.verify();
    console.log("SMTP connection verified successfully");
    const info = await sendVehicleInspectionReminder(testVehicle, 20);
    console.log("Test mail g\xF6nderildi:", info.messageId);
    return {
      success: true,
      message: "Test maili ba\u015Far\u0131yla g\xF6nderildi. Mail ID: " + info.messageId
    };
  } catch (error) {
    console.error("Test mail g\xF6nderimi hatas\u0131:", error);
    let errorMessage = error.message;
    if (error.code === "EAUTH") {
      errorMessage = "Yandex mail sunucusu i\xE7in kimlik do\u011Frulama hatas\u0131. Kullan\u0131c\u0131 ad\u0131 veya \u015Fifre yanl\u0131\u015F olabilir.";
    } else if (error.code === "ESOCKET" || error.code === "ECONNECTION") {
      errorMessage = "Yandex mail sunucusuna ba\u011Flan\u0131lam\u0131yor. \u0130nternet ba\u011Flant\u0131n\u0131z\u0131 kontrol edin veya sunucu durum bilgilerini kontrol edin.";
    } else if (error.code === "ETIMEDOUT") {
      errorMessage = "Mail sunucusuna ba\u011Flant\u0131 zaman a\u015F\u0131m\u0131na u\u011Frad\u0131. Daha sonra tekrar deneyin.";
    }
    return {
      success: false,
      message: errorMessage,
      details: error.toString(),
      code: error.code || "UNKNOWN"
    };
  }
}

// server/routes.ts
function registerRoutes(app2) {
  const requireAuth = (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Giri\u015F yap\u0131lmad\u0131");
    }
    next();
  };
  app2.post("/api/test-mail", async (_req, res) => {
    console.log("Test email endpoint triggered");
    try {
      const result = await sendTestMail();
      if (result.success) {
        console.log("Test email was successful");
        res.json({
          success: true,
          message: result.message
        });
      } else {
        console.error("Test email failed:", result.message);
        res.status(500).json({
          success: false,
          message: result.message,
          details: result.details || "No additional details",
          code: result.code || "UNKNOWN"
        });
      }
    } catch (error) {
      console.error("Unexpected error in test mail endpoint:", error);
      res.status(500).json({
        success: false,
        message: `Beklenmeyen bir hata olu\u015Ftu: ${error.message}`,
        details: error.stack
      });
    }
  });
  app2.use("/api/employees", requireAuth);
  app2.use("/api/leaves", requireAuth);
  app2.use("/api/inventory", requireAuth);
  app2.use("/api/reports", requireAuth);
  app2.use("/api/vehicles", requireAuth);
  app2.get("/api/vehicles", async (_req, res) => {
    try {
      const allVehicles = await db.query.vehicles.findMany({
        orderBy: [desc(vehicles.createdAt)]
      });
      res.json(allVehicles);
    } catch (error) {
      console.error("Ara\xE7 listesi al\u0131namad\u0131:", error);
      res.status(500).send("Ara\xE7 listesi al\u0131namad\u0131: " + error.message);
    }
  });
  app2.get("/api/vehicles/:id", async (req, res) => {
    try {
      const vehicle = await db.query.vehicles.findFirst({
        where: eq(vehicles.id, parseInt(req.params.id))
      });
      if (!vehicle) {
        return res.status(404).send("Ara\xE7 bulunamad\u0131");
      }
      res.json(vehicle);
    } catch (error) {
      console.error("Ara\xE7 bilgisi al\u0131namad\u0131:", error);
      res.status(500).send("Ara\xE7 bilgisi al\u0131namad\u0131: " + error.message);
    }
  });
  app2.post("/api/vehicles", async (req, res) => {
    try {
      const vehicle = await db.insert(vehicles).values(req.body).returning();
      res.json(vehicle[0]);
    } catch (error) {
      console.error("Ara\xE7 eklenemedi:", error);
      res.status(400).send("Ara\xE7 eklenemedi: " + error.message);
    }
  });
  app2.put("/api/vehicles/:id", async (req, res) => {
    try {
      const vehicle = await db.update(vehicles).set(req.body).where(eq(vehicles.id, parseInt(req.params.id))).returning();
      res.json(vehicle[0]);
    } catch (error) {
      console.error("Ara\xE7 g\xFCncellenemedi:", error);
      res.status(400).send("Ara\xE7 g\xFCncellenemedi: " + error.message);
    }
  });
  app2.delete("/api/vehicles/:id", async (req, res) => {
    try {
      const result = await db.delete(vehicles).where(eq(vehicles.id, parseInt(req.params.id))).returning();
      if (result.length === 0) {
        return res.status(404).send("Ara\xE7 bulunamad\u0131");
      }
      res.json({ message: "Ara\xE7 silindi", vehicle: result[0] });
    } catch (error) {
      console.error("Ara\xE7 silinemedi:", error);
      res.status(500).send("Ara\xE7 silinemedi: " + error.message);
    }
  });
  app2.get("/api/employees", async (_req, res) => {
    try {
      const allEmployees = await db.query.employees.findMany();
      res.json(allEmployees);
    } catch (error) {
      res.status(500).send("Personel listesi al\u0131namad\u0131: " + error.message);
    }
  });
  app2.get("/api/employees/:id", async (req, res) => {
    try {
      const employee = await db.query.employees.findFirst({
        where: eq(employees.id, parseInt(req.params.id))
      });
      if (!employee) {
        return res.status(404).send("Personel bulunamad\u0131");
      }
      res.json(employee);
    } catch (error) {
      res.status(500).send("Personel bilgisi al\u0131namad\u0131: " + error.message);
    }
  });
  app2.post("/api/employees", async (req, res) => {
    try {
      const employee = await db.insert(employees).values(req.body).returning();
      res.json(employee[0]);
    } catch (error) {
      res.status(400).send("Personel eklenemedi: " + error.message);
    }
  });
  app2.put("/api/employees/:id", async (req, res) => {
    try {
      const employee = await db.update(employees).set(req.body).where(eq(employees.id, parseInt(req.params.id))).returning();
      res.json(employee[0]);
    } catch (error) {
      res.status(400).send("Personel g\xFCncellenemedi: " + error.message);
    }
  });
  app2.delete("/api/employees/:id", async (req, res) => {
    try {
      const employeeId = parseInt(req.params.id);
      await db.delete(leaves).where(eq(leaves.employeeId, employeeId));
      await db.delete(dailyAchievements).where(eq(dailyAchievements.employeeId, employeeId));
      await db.update(inventoryItems).set({ assignedTo: null, assignedAt: null }).where(eq(inventoryItems.assignedTo, employeeId));
      const result = await db.delete(employees).where(eq(employees.id, employeeId)).returning();
      if (result.length === 0) {
        return res.status(404).send("Personel bulunamad\u0131");
      }
      res.json({ message: "Personel silindi", employee: result[0] });
    } catch (error) {
      console.error("Personel silme hatas\u0131:", error);
      res.status(500).send("Personel silinemedi: " + error.message);
    }
  });
  app2.post("/api/leaves/bulk", async (req, res) => {
    try {
      const { employeeIds, startDate, endDate, reason } = req.body;
      if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
        return res.status(400).send("En az bir personel se\xE7ilmelidir");
      }
      if (!startDate || !endDate) {
        return res.status(400).send("Ba\u015Flang\u0131\xE7 ve biti\u015F tarihi gereklidir");
      }
      const createdLeaves = await db.transaction(async (tx) => {
        const leavePromises = employeeIds.map(
          (employeeId) => tx.insert(leaves).values({
            employeeId,
            startDate,
            endDate,
            reason: reason || null,
            type: "ANNUAL",
            status: "APPROVED"
          }).returning()
        );
        return await Promise.all(leavePromises);
      });
      res.json(createdLeaves.flat());
    } catch (error) {
      console.error("Toplu izin ekleme hatas\u0131:", error);
      res.status(400).send("\u0130zinler eklenemedi: " + error.message);
    }
  });
  app2.get("/api/leaves", async (req, res) => {
    try {
      const employeeId = req.query.employeeId ? parseInt(req.query.employeeId) : void 0;
      const conditions = [];
      if (employeeId) {
        conditions.push(eq(leaves.employeeId, employeeId));
      }
      const allLeaves = await db.query.leaves.findMany({
        where: conditions.length > 0 ? and(...conditions) : void 0,
        orderBy: [desc(leaves.startDate)]
      });
      res.json(allLeaves);
    } catch (error) {
      res.status(500).send("\u0130zin listesi al\u0131namad\u0131: " + error.message);
    }
  });
  app2.post("/api/leaves", async (req, res) => {
    try {
      const leave = await db.insert(leaves).values(req.body).returning();
      res.json(leave[0]);
    } catch (error) {
      res.status(400).send("\u0130zin eklenemedi: " + error.message);
    }
  });
  app2.delete("/api/leaves/:id", async (req, res) => {
    try {
      const result = await db.delete(leaves).where(eq(leaves.id, parseInt(req.params.id))).returning();
      if (result.length === 0) {
        return res.status(404).send("\u0130zin bulunamad\u0131");
      }
      res.json({ message: "\u0130zin silindi", leave: result[0] });
    } catch (error) {
      console.error("\u0130zin silme hatas\u0131:", error);
      res.status(500).send("\u0130zin silinemedi: " + error.message);
    }
  });
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
  app2.get("/api/reports/excel", async (req, res) => {
    try {
      const employeeId = req.query.employeeId ? parseInt(req.query.employeeId) : void 0;
      const date2 = req.query.date;
      if (!date2) {
        return res.status(400).send("Tarih zorunludur");
      }
      const [year, month] = date2.split("-").map(Number);
      const startDate = startOfMonth(new Date(year, month - 1));
      const endDate = endOfMonth(new Date(year, month - 1));
      const workbook = await XlsxPopulate.fromBlankAsync();
      const sheet = workbook.sheet(0);
      if (employeeId) {
        const employee = await db.query.employees.findFirst({
          where: eq(employees.id, employeeId)
        });
        if (!employee) {
          return res.status(404).send("Personel bulunamad\u0131");
        }
        const employeeLeaves = await db.query.leaves.findMany({
          where: and(
            eq(leaves.employeeId, employeeId),
            gte(leaves.startDate, startDate.toISOString()),
            lte(leaves.endDate, endDate.toISOString())
          ),
          orderBy: (leaves2, { asc }) => [asc(leaves2.startDate)]
        });
        sheet.cell("A1").value("PERSONEL \u0130Z\u0130N RAPORU").style(headerStyle);
        sheet.range("A1:E1").merged(true);
        sheet.cell("A3").value("\u015Eirket Ad\u0131").style(subHeaderStyle);
        sheet.range("A3:B3").merged(true);
        sheet.cell("A4").value("Personel:").style(subHeaderStyle);
        sheet.cell("B4").value(`${employee.firstName} ${employee.lastName}`).style(cellStyle);
        sheet.cell("A5").value("Pozisyon:").style(subHeaderStyle);
        sheet.cell("B5").value(employee.position || "-").style(cellStyle);
        sheet.cell("A6").value("D\xF6nem:").style(subHeaderStyle);
        sheet.cell("B6").value(format2(startDate, "MMMM yyyy", { locale: tr2 })).style(cellStyle);
        sheet.cell("A8").value("\u0130Z\u0130N DETAYLARI").style(headerStyle);
        sheet.range("A8:D8").merged(true);
        sheet.cell("A9").value("Ba\u015Flang\u0131\xE7").style(tableHeaderStyle);
        sheet.cell("B9").value("Biti\u015F").style(tableHeaderStyle);
        sheet.cell("C9").value("G\xFCn").style(tableHeaderStyle);
        sheet.cell("D9").value("Not").style(tableHeaderStyle);
        let row = 10;
        let totalDays = 0;
        employeeLeaves.forEach((leave) => {
          const start = parseISO(leave.startDate);
          const end = parseISO(leave.endDate);
          const days = differenceInDays(end, start) + 1;
          totalDays += days;
          sheet.cell(`A${row}`).value(format2(start, "dd.MM.yyyy")).style(cellStyle);
          sheet.cell(`B${row}`).value(format2(end, "dd.MM.yyyy")).style(cellStyle);
          sheet.cell(`C${row}`).value(days).style({ ...cellStyle, horizontalAlignment: "center" });
          sheet.cell(`D${row}`).value(leave.reason || "-").style(cellStyle);
          row++;
        });
        sheet.cell(`A${row + 1}`).value("TOPLAM").style(subHeaderStyle);
        sheet.cell(`C${row + 1}`).value(totalDays).style({ ...subHeaderStyle, horizontalAlignment: "center" });
      } else {
        const allEmployees = await db.query.employees.findMany({
          orderBy: (employees2, { asc }) => [asc(employees2.firstName), asc(employees2.lastName)]
        });
        sheet.cell("A1").value("PERSONEL \u0130Z\u0130N \xD6ZET RAPORU").style(headerStyle);
        sheet.range("A1:F1").merged(true);
        sheet.cell("A3").value("\u015Eirket Ad\u0131").style(subHeaderStyle);
        sheet.range("A3:B3").merged(true);
        sheet.cell("A4").value("D\xF6nem:").style(subHeaderStyle);
        sheet.cell("B4").value(format2(startDate, "MMMM yyyy", { locale: tr2 })).style(cellStyle);
        let currentRow = 6;
        sheet.cell(`A${currentRow}`).value("Ad Soyad").style(tableHeaderStyle);
        sheet.cell(`B${currentRow}`).value("Pozisyon").style(tableHeaderStyle);
        sheet.cell(`C${currentRow}`).value("\u0130zin Ba\u015Flang\u0131\xE7").style(tableHeaderStyle);
        sheet.cell(`D${currentRow}`).value("\u0130zin Biti\u015F").style(tableHeaderStyle);
        sheet.cell(`E${currentRow}`).value("Toplam G\xFCn").style(tableHeaderStyle);
        sheet.cell(`F${currentRow}`).value("Not").style(tableHeaderStyle);
        currentRow++;
        for (const employee of allEmployees) {
          const employeeLeaves = await db.query.leaves.findMany({
            where: and(
              eq(leaves.employeeId, employee.id),
              gte(leaves.startDate, startDate.toISOString()),
              lte(leaves.endDate, endDate.toISOString())
            ),
            orderBy: (leaves2, { asc }) => [asc(leaves2.startDate)]
          });
          if (employeeLeaves.length > 0) {
            employeeLeaves.forEach((leave) => {
              const start = parseISO(leave.startDate);
              const end = parseISO(leave.endDate);
              const days = differenceInDays(end, start) + 1;
              sheet.cell(`A${currentRow}`).value(`${employee.firstName} ${employee.lastName}`).style(cellStyle);
              sheet.cell(`B${currentRow}`).value(employee.position || "-").style(cellStyle);
              sheet.cell(`C${currentRow}`).value(format2(start, "dd.MM.yyyy")).style(cellStyle);
              sheet.cell(`D${currentRow}`).value(format2(end, "dd.MM.yyyy")).style(cellStyle);
              sheet.cell(`E${currentRow}`).value(days).style({ ...cellStyle, horizontalAlignment: "center" });
              sheet.cell(`F${currentRow}`).value(leave.reason || "-").style(cellStyle);
              currentRow++;
            });
          } else {
            sheet.cell(`A${currentRow}`).value(`${employee.firstName} ${employee.lastName}`).style(cellStyle);
            sheet.cell(`B${currentRow}`).value(employee.position || "-").style(cellStyle);
            sheet.range(`C${currentRow}:F${currentRow}`).merged(true).value("\u0130zin Bulunmuyor").style({ ...cellStyle, horizontalAlignment: "center" });
            currentRow++;
          }
        }
        sheet.column("A").width(25);
        sheet.column("B").width(20);
        sheet.column("C").width(15);
        sheet.column("D").width(15);
        sheet.column("E").width(12);
        sheet.column("F").width(30);
      }
      const buffer = await workbook.outputAsync();
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=izin-raporu-${format2(startDate, "yyyy-MM")}.xlsx`);
      res.send(buffer);
    } catch (error) {
      console.error("Excel rapor hatas\u0131:", error);
      res.status(500).send("Rapor olu\u015Fturulamad\u0131: " + error.message);
    }
  });
  app2.get("/api/inventory", async (req, res) => {
    try {
      const employeeId = req.query.employeeId ? parseInt(req.query.employeeId) : void 0;
      const items = await db.query.inventoryItems.findMany({
        where: employeeId ? eq(inventoryItems.assignedTo, employeeId) : void 0,
        orderBy: (items2, { desc: desc2 }) => [desc2(items2.createdAt)]
      });
      res.json(items);
    } catch (error) {
      res.status(500).send("Envanter listesi al\u0131namad\u0131: " + error.message);
    }
  });
  app2.post("/api/inventory", async (req, res) => {
    try {
      const { name, notes, assignedTo } = req.body;
      if (!name) {
        return res.status(400).send("E\u015Fya ad\u0131 gereklidir");
      }
      const newItem = {
        name,
        notes: notes || null,
        type: "di\u011Fer",
        condition: "yeni",
        assignedTo: assignedTo || null,
        assignedAt: assignedTo ? /* @__PURE__ */ new Date() : null
      };
      const item = await db.insert(inventoryItems).values(newItem).returning();
      res.json(item[0]);
    } catch (error) {
      console.error("Envanter ekleme hatas\u0131:", error);
      res.status(400).send("Envanter \xF6\u011Fesi eklenemedi: " + error.message);
    }
  });
  app2.put("/api/inventory/:id", async (req, res) => {
    try {
      const { name, notes } = req.body;
      if (!name) {
        return res.status(400).send("E\u015Fya ad\u0131 gereklidir");
      }
      const updatedItem = await db.update(inventoryItems).set({
        name,
        notes: notes || null
      }).where(eq(inventoryItems.id, parseInt(req.params.id))).returning();
      res.json(updatedItem[0]);
    } catch (error) {
      console.error("Envanter g\xFCncelleme hatas\u0131:", error);
      res.status(500).send("Envanter \xF6\u011Fesi g\xFCncellenemedi: " + error.message);
    }
  });
  app2.delete("/api/inventory/:id", async (req, res) => {
    try {
      const result = await db.delete(inventoryItems).where(eq(inventoryItems.id, parseInt(req.params.id))).returning();
      if (result.length === 0) {
        return res.status(404).send("Envanter \xF6\u011Fesi bulunamad\u0131");
      }
      res.json({ message: "Envanter \xF6\u011Fesi silindi", item: result[0] });
    } catch (error) {
      console.error("Envanter silme hatas\u0131:", error);
      res.status(500).send("Envanter \xF6\u011Fesi silinemedi: " + error.message);
    }
  });
  app2.get("/api/achievements", async (req, res) => {
    try {
      const employeeId = req.query.employeeId ? parseInt(req.query.employeeId) : void 0;
      const startDate = req.query.startDate ? req.query.startDate : void 0;
      const endDate = req.query.endDate ? req.query.endDate : void 0;
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
    } catch (error) {
      console.error("Ba\u015Far\u0131 listesi al\u0131namad\u0131:", error);
      res.status(500).send("Ba\u015Far\u0131 listesi al\u0131namad\u0131: " + error.message);
    }
  });
  app2.post("/api/achievements", async (req, res) => {
    try {
      const achievement = await db.insert(dailyAchievements).values(req.body).returning();
      res.json(achievement[0]);
    } catch (error) {
      console.error("Ba\u015Far\u0131 eklenemedi:", error);
      res.status(400).send("Ba\u015Far\u0131 eklenemedi: " + error.message);
    }
  });
  app2.put("/api/achievements/:id", async (req, res) => {
    try {
      const achievement = await db.update(dailyAchievements).set(req.body).where(eq(dailyAchievements.id, parseInt(req.params.id))).returning();
      res.json(achievement[0]);
    } catch (error) {
      console.error("Ba\u015Far\u0131 g\xFCncellenemedi:", error);
      res.status(400).send("Ba\u015Far\u0131 g\xFCncellenemedi: " + error.message);
    }
  });
  app2.delete("/api/achievements/:id", async (req, res) => {
    try {
      await db.delete(dailyAchievements).where(eq(dailyAchievements.id, parseInt(req.params.id))).returning();
      res.json({ message: "Ba\u015Far\u0131 silindi" });
    } catch (error) {
      console.error("Ba\u015Far\u0131 silinemedi:", error);
      res.status(400).send("Ba\u015Far\u0131 silinemedi: " + error.message);
    }
  });
  app2.get("/api/achievements/excel", async (req, res) => {
    try {
      const date2 = req.query.date;
      const employeeId = req.query.employeeId ? parseInt(req.query.employeeId) : void 0;
      if (!date2) {
        return res.status(400).send("Tarih zorunludur");
      }
      const [year, month] = date2.split("-").map(Number);
      const reportStartDate = startOfMonth(new Date(year, month - 1));
      const reportEndDate = endOfMonth(new Date(year, month - 1));
      const workbook = await XlsxPopulate.fromBlankAsync();
      const sheet = workbook.sheet(0);
      const headerStyle2 = {
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
      const subHeaderStyle2 = {
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
      const tableHeaderStyle2 = {
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
      const cellStyle2 = {
        fontSize: 10,
        border: {
          top: { style: "thin", color: "E9ECEF" },
          bottom: { style: "thin", color: "E9ECEF" },
          left: { style: "thin", color: "E9ECEF" },
          right: { style: "thin", color: "E9ECEF" }
        }
      };
      if (employeeId) {
        const employee = await db.query.employees.findFirst({
          where: eq(employees.id, employeeId)
        });
        if (!employee) {
          return res.status(404).send("Personel bulunamad\u0131");
        }
        const achievements = await db.query.dailyAchievements.findMany({
          where: and(
            eq(dailyAchievements.employeeId, employeeId),
            gte(dailyAchievements.date, reportStartDate.toISOString()),
            lte(dailyAchievements.date, reportEndDate.toISOString())
          ),
          orderBy: (achievements2, { asc }) => [asc(achievements2.date)]
        });
        sheet.cell("A1").value("Personel Performans Raporu").style(headerStyle2);
        sheet.range("A1:E1").merged(true);
        sheet.cell("A3").value("Personel Ad\u0131:").style(subHeaderStyle2);
        sheet.cell("B3").value(`${employee.firstName} ${employee.lastName}`);
        sheet.cell("A4").value("Pozisyon:").style(subHeaderStyle2);
        sheet.cell("B4").value(employee.position || "-");
        sheet.cell("A5").value("D\xF6nem:").style(subHeaderStyle2);
        sheet.cell("B5").value(format2(reportStartDate, "MMMM yyyy", { locale: tr2 }));
        sheet.cell("A7").value("AYLIK PERFORMANS DETAYLARI").style(headerStyle2);
        sheet.range("A7:D7").merged(true);
        sheet.cell("A8").value("Tarih").style(tableHeaderStyle2);
        sheet.cell("B8").value("Tip").style(tableHeaderStyle2);
        sheet.cell("C8").value("Not").style(tableHeaderStyle2);
        let currentRow = 9;
        const stats = {
          STAR: 0,
          CHEF: 0,
          X: 0
        };
        achievements.forEach((achievement) => {
          const achievementDate = parseISO(achievement.date);
          stats[achievement.type]++;
          sheet.cell(`A${currentRow}`).value(format2(achievementDate, "dd.MM.yyyy")).style({ border: true });
          sheet.cell(`B${currentRow}`).value({
            "STAR": "Y\u0131ld\u0131z",
            "CHEF": "\u015Eef",
            "X": "Zarar"
          }[achievement.type]).style({ border: true });
          sheet.cell(`C${currentRow}`).value(achievement.notes || "-").style({ border: true });
          currentRow++;
        });
        currentRow += 2;
        sheet.cell(`A${currentRow}`).value("AYLIK \xD6ZET").style(headerStyle2);
        sheet.range(`A${currentRow}:C${currentRow}`).merged(true);
        currentRow++;
        sheet.cell(`A${currentRow}`).value("Y\u0131ld\u0131z:").style(subHeaderStyle2);
        sheet.cell(`B${currentRow}`).value(stats.STAR);
        currentRow++;
        sheet.cell(`A${currentRow}`).value("\u015Eef:").style(subHeaderStyle2);
        sheet.cell(`B${currentRow}`).value(stats.CHEF);
        currentRow++;
        sheet.cell(`A${currentRow}`).value("Zarar:").style(subHeaderStyle2);
        sheet.cell(`B${currentRow}`).value(stats.X);
        sheet.column("A").width(15);
        sheet.column("B").width(15);
        sheet.column("C").width(40);
      } else {
        const allEmployees = await db.query.employees.findMany();
        sheet.cell("A1").value("Ayl\u0131k Performans Raporu").style(headerStyle2);
        sheet.range("A1:F1").merged(true);
        sheet.cell("A3").value("D\xF6nem:").style(subHeaderStyle2);
        sheet.cell("B3").value(format2(reportStartDate, "MMMM yyyy", { locale: tr2 }));
        let currentRow = 5;
        sheet.cell(`A${currentRow}`).value("Ad Soyad").style(tableHeaderStyle2);
        sheet.cell(`B${currentRow}`).value("Pozisyon").style(tableHeaderStyle2);
        sheet.cell(`C${currentRow}`).value("Y\u0131ld\u0131z").style(tableHeaderStyle2);
        sheet.cell(`D${currentRow}`).value("\u015Eef").style(tableHeaderStyle2);
        sheet.cell(`E${currentRow}`).value("Zarar").style(tableHeaderStyle2);
        sheet.cell(`F${currentRow}`).value("Toplam").style(tableHeaderStyle2);
        currentRow++;
        for (const employee of allEmployees) {
          const achievements = await db.query.dailyAchievements.findMany({
            where: and(
              eq(dailyAchievements.employeeId, employee.id),
              gte(dailyAchievements.date, reportStartDate.toISOString()),
              lte(dailyAchievements.date, reportEndDate.toISOString())
            ),
            orderBy: (achievements2, { asc }) => [asc(achievements2.date)]
          });
          const stats = {
            STAR: achievements.filter((a) => a.type === "STAR").length,
            CHEF: achievements.filter((a) => a.type === "CHEF").length,
            X: achievements.filter((a) => a.type === "X").length
          };
          sheet.cell(`A${currentRow}`).value(`${employee.firstName} ${employee.lastName}`).style({ border: true });
          sheet.cell(`B${currentRow}`).value(employee.position || "-").style({ border: true });
          sheet.cell(`C${currentRow}`).value(stats.STAR).style({ border: true, horizontalAlignment: "center" });
          sheet.cell(`D${currentRow}`).value(stats.CHEF).style({ border: true, horizontalAlignment: "center" });
          sheet.cell(`E${currentRow}`).value(stats.X).style({ border: true, horizontalAlignment: "center" });
          sheet.cell(`F${currentRow}`).value(stats.STAR + stats.CHEF + stats.X).style({ border: true, horizontalAlignment: "center" });
          currentRow++;
        }
        currentRow++;
        sheet.cell(`A${currentRow}`).value("TOPLAM").style(subHeaderStyle2);
        sheet.range(`A${currentRow}:B${currentRow}`).merged(true);
        sheet.cell(`C${currentRow}`).formula(`=SUM(C6:C${currentRow - 2})`).style(subHeaderStyle2);
        sheet.cell(`D${currentRow}`).formula(`=SUM(D6:D${currentRow - 2})`).style(subHeaderStyle2);
        sheet.cell(`E${currentRow}`).formula(`=SUM(E6:E${currentRow - 2})`).style(subHeaderStyle2);
        sheet.cell(`F${currentRow}`).formula(`=SUM(F6:F${currentRow - 2})`).style(subHeaderStyle2);
        sheet.column("A").width(30);
        sheet.column("B").width(20);
        sheet.column("C").width(15);
        sheet.column("D").width(15);
        sheet.column("E").width(15);
        sheet.column("F").width(15);
      }
      const buffer = await workbook.outputAsync();
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename=performans-raporu-${format2(reportStartDate, "yyyy-MM")}.xlsx`);
      res.send(buffer);
    } catch (error) {
      console.error("Excel rapor hatas\u0131:", error);
      res.status(500).send("Rapor olu\u015Fturulamad\u0131: " + error.message);
    }
  });
  app2.get("/api/achievements", async (req, res) => {
    try {
      const employeeId = req.query.employeeId ? parseInt(req.query.employeeId) : void 0;
      const startDate = req.query.startDate ? req.query.startDate : void 0;
      const endDate = req.query.endDate ? req.query.endDate : void 0;
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
    } catch (error) {
      console.error("Ba\u015Far\u0131 listesi al\u0131namad\u0131:", error);
      res.status(500).send("Ba\u015Far\u0131 listesi al\u0131namad\u0131: " + error.message);
    }
  });
  app2.post("/api/achievements", async (req, res) => {
    try {
      const achievement = await db.insert(dailyAchievements).values(req.body).returning();
      res.json(achievement[0]);
    } catch (error) {
      console.error("Ba\u015Far\u0131 eklenemedi:", error);
      res.status(400).send("Ba\u015Far\u0131 eklenemedi: " + error.message);
    }
  });
  app2.put("/api/achievements/:id", async (req, res) => {
    try {
      const achievement = await db.update(dailyAchievements).set(req.body).where(eq(dailyAchievements.id, parseInt(req.params.id))).returning();
      res.json(achievement[0]);
    } catch (error) {
      console.error("Ba\u015Far\u0131 g\xFCncellenemedi:", error);
      res.status(400).send("Ba\u015Far\u0131 g\xFCncellenemedi: " + error.message);
    }
  });
  app2.delete("/api/achievements/:id", async (req, res) => {
    try {
      await db.delete(dailyAchievements).where(eq(dailyAchievements.id, parseInt(req.params.id))).returning();
      res.json({ message: "Ba\u015Far\u0131 silindi" });
    } catch (error) {
      console.error("Ba\u015Far\u0131 silinemedi:", error);
      res.status(400).send("Ba\u015Far\u0131 silinemedi: " + error.message);
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2, { dirname as dirname2 } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path, { dirname } from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var vite_config_default = defineConfig({
  plugins: [react(), runtimeErrorOverlay(), themePlugin()],
  resolve: {
    alias: {
      "@db": path.resolve(__dirname, "db"),
      "@": path.resolve(__dirname, "client", "src")
    }
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true
  }
});

// server/vite.ts
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = dirname2(__filename2);
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        if (msg.includes("[TypeScript] Found 0 errors. Watching for file changes")) {
          log("no errors found", "tsc");
          return;
        }
        if (msg.includes("[TypeScript] ")) {
          const [errors, summary] = msg.split("[TypeScript] ", 2);
          log(`${summary} ${errors}\x1B[0m`, "tsc");
          return;
        } else {
          viteLogger.error(msg, options);
          process.exit(1);
        }
      }
    },
    server: {
      middlewareMode: true,
      hmr: { server }
    },
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        __dirname2,
        "..",
        "client",
        "index.html"
      );
      const template2 = await fs.promises.readFile(clientTemplate, "utf-8");
      const page = await vite.transformIndexHtml(url, template2);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(__dirname2, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/auth.ts
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { eq as eq2 } from "drizzle-orm";
var scryptAsync = promisify(scrypt);
var crypto = {
  hash: async (password) => {
    const salt = randomBytes(16).toString("hex");
    const buf = await scryptAsync(password, salt, 64);
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword, storedPassword) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = await scryptAsync(
      suppliedPassword,
      salt,
      64
    );
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  }
};
function setupAuth(app2) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings = {
    secret: process.env.REPL_ID || "secure-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: app2.get("env") === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1e3
      // 24 saat
    },
    store: new MemoryStore({
      checkPeriod: 864e5
      // 24 saatte bir temizle
    })
  };
  if (app2.get("env") === "production") {
    app2.set("trust proxy", 1);
  }
  app2.use(session(sessionSettings));
  app2.use(passport.initialize());
  app2.use(passport.session());
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await db.query.users.findFirst({
          where: eq2(users.username, "admin")
        });
        if (!user) {
          return done(null, false, { message: "Hatal\u0131 \u015Fifre." });
        }
        const isMatch = await crypto.compare(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Hatal\u0131 \u015Fifre." });
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
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await db.query.users.findFirst({
        where: eq2(users.id, id)
      });
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
  app2.post("/api/init", async (req, res) => {
    try {
      const existingUser = await db.query.users.findFirst({
        where: eq2(users.username, "admin")
      });
      if (!existingUser) {
        const hashedPassword = await crypto.hash("E112233T");
        await db.insert(users).values({
          username: "admin",
          password: hashedPassword
        });
      }
      res.json({ message: "Admin kullan\u0131c\u0131s\u0131 haz\u0131r" });
    } catch (error) {
      console.error("Admin kullan\u0131c\u0131s\u0131 olu\u015Fturma hatas\u0131:", error);
      res.status(500).json({ message: error.message });
    }
  });
  app2.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Login hatas\u0131:", err);
        return next(err);
      }
      if (!user) {
        return res.status(400).send(info.message ?? "Giri\u015F ba\u015Far\u0131s\u0131z");
      }
      req.logIn(user, (err2) => {
        if (err2) {
          console.error("Session olu\u015Fturma hatas\u0131:", err2);
          return next(err2);
        }
        return res.json({
          message: "Giri\u015F ba\u015Far\u0131l\u0131",
          user: { id: user.id, username: user.username }
        });
      });
    })(req, res, next);
  });
  app2.post("/api/logout", (req, res) => {
    const username = req.user?.username;
    req.logout((err) => {
      if (err) {
        console.error("Logout hatas\u0131:", err);
        return res.status(500).send("\xC7\u0131k\u0131\u015F ba\u015Far\u0131s\u0131z");
      }
      res.json({ message: "\xC7\u0131k\u0131\u015F ba\u015Far\u0131l\u0131" });
      console.log(`Kullan\u0131c\u0131 \xE7\u0131k\u0131\u015F yapt\u0131: ${username}`);
    });
  });
  app2.get("/api/user", (req, res) => {
    if (req.isAuthenticated()) {
      return res.json(req.user);
    }
    res.status(401).send("Giri\u015F yap\u0131lmad\u0131");
  });
}

// server/jobs/inspectionReminder.ts
import cron from "node-cron";
import { differenceInDays as differenceInDays2, format as format3 } from "date-fns";
import { tr as tr3 } from "date-fns/locale";
var REMINDER_DAYS = [20, 10, 3];
function startInspectionReminderJob() {
  cron.schedule("0 9 * * *", async () => {
    console.log(
      "Starting daily vehicle inspection reminder check:",
      format3(/* @__PURE__ */ new Date(), "dd MMMM yyyy HH:mm:ss", { locale: tr3 })
    );
    try {
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.error("Email credentials missing, inspection reminders will not be sent");
        return;
      }
      const allVehicles = await db.query.vehicles.findMany();
      console.log(`Found ${allVehicles.length} vehicles to check for reminders`);
      const today = /* @__PURE__ */ new Date();
      let remindersSent = 0;
      let remindersSkipped = 0;
      for (const vehicle of allVehicles) {
        try {
          const inspectionDate = new Date(vehicle.inspectionDate);
          const daysUntilInspection = differenceInDays2(
            inspectionDate,
            today
          );
          if (daysUntilInspection <= 30) {
            console.log(`Vehicle ${vehicle.name} (${vehicle.plate}) has inspection in ${daysUntilInspection} days on ${format3(inspectionDate, "dd.MM.yyyy")}`);
          }
          if (REMINDER_DAYS.includes(daysUntilInspection)) {
            console.log(`Sending reminder for vehicle ${vehicle.name} (${vehicle.plate}) - ${daysUntilInspection} days remaining`);
            await sendVehicleInspectionReminder({
              name: vehicle.name,
              plate: vehicle.plate,
              inspectionDate
            }, daysUntilInspection);
            console.log(`\u2705 Reminder sent for vehicle ${vehicle.plate} - ${daysUntilInspection} days remaining`);
            remindersSent++;
          } else {
            remindersSkipped++;
          }
        } catch (vError) {
          console.error(`Error processing vehicle ${vehicle.plate}:`, vError);
        }
      }
      console.log(`Inspection reminder job completed: ${remindersSent} reminders sent, ${remindersSkipped} vehicles skipped`);
    } catch (error) {
      console.error("Fatal error in inspection reminder job:", error);
    }
  });
  console.log("Vehicle inspection reminder job scheduled for 9:00 AM daily");
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  try {
    let retryCount = 0;
    const maxRetries = 3;
    while (retryCount < maxRetries) {
      try {
        await db.query.users.findFirst();
        log("Veritaban\u0131 ba\u011Flant\u0131s\u0131 ba\u015Far\u0131l\u0131");
        break;
      } catch (error) {
        retryCount++;
        log(`Veritaban\u0131 ba\u011Flant\u0131 denemesi ${retryCount}/${maxRetries} ba\u015Far\u0131s\u0131z:`);
        console.error(error);
        if (retryCount === maxRetries) {
          log("Maksimum ba\u011Flant\u0131 denemesi a\u015F\u0131ld\u0131, uygulama kapat\u0131l\u0131yor.");
          process.exit(1);
        }
        await new Promise((resolve) => setTimeout(resolve, 5e3));
      }
    }
    startInspectionReminderJob();
    log("Muayene hat\u0131rlat\u0131c\u0131 job'\u0131 ba\u015Flat\u0131ld\u0131");
    setupAuth(app);
    const server = registerRoutes(app);
    app.use((err, _req, res, _next) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Sunucu Hatas\u0131";
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
    const PORT = 5e3;
    server.listen(PORT, "0.0.0.0", () => {
      log(`Sunucu ${PORT} portunda \xE7al\u0131\u015F\u0131yor`);
    });
  } catch (error) {
    log("Ba\u015Flang\u0131\xE7 hatas\u0131:");
    console.error(error);
    process.exit(1);
  }
})();
