import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { employees, leaves, inventoryItems } from "@db/schema";
import { eq } from "drizzle-orm";

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

  // Employees
  app.get("/api/employees", async (req, res) => {
    const allEmployees = await db.query.employees.findMany();
    res.json(allEmployees);
  });

  app.get("/api/employees/:id", async (req, res) => {
    const employee = await db.query.employees.findFirst({
      where: eq(employees.id, parseInt(req.params.id)),
    });

    if (!employee) {
      return res.status(404).send("Personel bulunamadı");
    }

    res.json(employee);
  });

  app.post("/api/employees", async (req, res) => {
    try {
      const employee = await db.insert(employees).values(req.body).returning();
      res.json(employee[0]);
    } catch (error: any) {
      res.status(400).send(error.message);
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
      res.status(400).send(error.message);
    }
  });

  // Leaves
  app.get("/api/leaves", async (req, res) => {
    const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;
    const allLeaves = await db.query.leaves.findMany({
      where: employeeId ? eq(leaves.employeeId, employeeId) : undefined,
      orderBy: (leaves, { desc }) => [desc(leaves.startDate)],
    });
    res.json(allLeaves);
  });

  app.post("/api/leaves", async (req, res) => {
    try {
      const leave = await db.insert(leaves).values(req.body).returning();
      res.json(leave[0]);
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  });

  // Inventory Items
  app.get("/api/inventory", async (req, res) => {
    const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;
    const items = await db.query.inventoryItems.findMany({
      where: employeeId ? eq(inventoryItems.assignedTo, employeeId) : undefined,
      orderBy: (items, { desc }) => [desc(items.createdAt)],
    });
    res.json(items);
  });

  app.post("/api/inventory", async (req, res) => {
    try {
      const item = await db.insert(inventoryItems).values(req.body).returning();
      res.json(item[0]);
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}