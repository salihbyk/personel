import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { employees, leaves, inventoryItems } from "@db/schema";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  // Employees
  app.get("/api/employees", async (req, res) => {
    try {
      const allEmployees = await db.query.employees.findMany();
      res.json(allEmployees);
    } catch (error: any) {
      console.error("Employees error:", error);
      res.status(500).json([]);
    }
  });

  app.get("/api/employees/:id", async (req, res) => {
    try {
      const employee = await db.query.employees.findFirst({
        where: eq(employees.id, parseInt(req.params.id)),
      });

      if (!employee) {
        return res.status(404).json([]);
      }

      res.json(employee);
    } catch (error: any) {
      console.error("Employee detail error:", error);
      res.status(500).json([]);
    }
  });

  app.post("/api/employees", async (req, res) => {
    try {
      const employee = await db.insert(employees).values(req.body).returning();
      res.json(employee[0]);
    } catch (error: any) {
      console.error("Employee create error:", error);
      res.status(400).json(null);
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
      console.error("Employee update error:", error);
      res.status(400).json(null);
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
      console.error("Employee delete error:", error);
      res.status(400).json(null);
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
      console.error("Leaves error:", error);
      res.status(500).json([]);
    }
  });

  app.post("/api/leaves", async (req, res) => {
    try {
      const leave = await db.insert(leaves).values(req.body).returning();
      res.json(leave[0]);
    } catch (error: any) {
      console.error("Leave create error:", error);
      res.status(400).json(null);
    }
  });

  app.delete("/api/leaves/:id", async (req, res) => {
    try {
      const result = await db.delete(leaves)
        .where(eq(leaves.id, parseInt(req.params.id)))
        .returning();

      if (result.length === 0) {
        return res.status(404).json(null);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Leave delete error:", error);
      res.status(500).json(null);
    }
  });

  // Inventory
  app.get("/api/inventory", async (req, res) => {
    try {
      const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;
      const items = await db.query.inventoryItems.findMany({
        where: employeeId ? eq(inventoryItems.assignedTo, employeeId) : undefined,
        orderBy: (items, { desc }) => [desc(items.createdAt)],
      });
      res.json(items);
    } catch (error: any) {
      console.error("Inventory error:", error);
      res.status(500).json([]);
    }
  });

  app.post("/api/inventory", async (req, res) => {
    try {
      const { name, notes } = req.body;

      if (!name) {
        return res.status(400).json(null);
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
      console.error("Inventory create error:", error);
      res.status(400).json(null);
    }
  });

  app.put("/api/inventory/:id", async (req, res) => {
    try {
      const { name, notes } = req.body;

      if (!name) {
        return res.status(400).json(null);
      }

      const item = await db
        .update(inventoryItems)
        .set({ name, notes: notes || null })
        .where(eq(inventoryItems.id, parseInt(req.params.id)))
        .returning();

      if (item.length === 0) {
        return res.status(404).json(null);
      }

      res.json(item[0]);
    } catch (error: any) {
      console.error("Inventory update error:", error);
      res.status(500).json(null);
    }
  });

  app.delete("/api/inventory/:id", async (req, res) => {
    try {
      const result = await db
        .delete(inventoryItems)
        .where(eq(inventoryItems.id, parseInt(req.params.id)))
        .returning();

      if (result.length === 0) {
        return res.status(404).json(null);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Inventory delete error:", error);
      res.status(500).json(null);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}