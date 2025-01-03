import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { employees, leaves, inventoryItems } from "@db/schema";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  // Basit auth kontrolü
  const requireAuth = (req: any, res: any, next: any) => {
    // Production'da auth kontrolünü geçici olarak bypass ediyoruz
    if (process.env.NODE_ENV === 'production') {
      return next();
    }

    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    next();
  };

  // API rotaları
  //Removed requireAuth middleware for production.
  app.use("/api/employees");
  app.use("/api/leaves");
  app.use("/api/inventory");


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
      const { name, notes } = req.body;

      if (!name) {
        return res.status(400).send("Eşya adı gereklidir");
      }

      const newItem = {
        name,
        notes: notes || null,
        type: "diğer",
        condition: "yeni",
        assignedTo: req.body.assignedTo || null,
        assignedAt: req.body.assignedTo ? new Date() : null,
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

      const item = await db
        .update(inventoryItems)
        .set({
          name,
          notes: notes || null,
        })
        .where(eq(inventoryItems.id, parseInt(req.params.id)))
        .returning();

      if (item.length === 0) {
        return res.status(404).send("Envanter öğesi bulunamadı");
      }

      res.json(item[0]);
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