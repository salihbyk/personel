import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { employees, leaves, inventoryItems } from "@db/schema";
import { eq } from "drizzle-orm";
import { setupAuth } from "./auth";

export function registerRoutes(app: Express): Server {
  // Auth sistemi kurulumu
  setupAuth(app);

  // Employees
  app.get("/api/employees", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    const allEmployees = await db.query.employees.findMany();
    res.json(allEmployees);
  });

  app.get("/api/employees/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    const employee = await db.query.employees.findFirst({
      where: eq(employees.id, parseInt(req.params.id)),
    });

    if (!employee) {
      return res.status(404).send("Employee not found");
    }

    res.json(employee);
  });

  app.post("/api/employees", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    try {
      const employee = await db.insert(employees).values(req.body).returning();
      res.json(employee[0]);
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  });

  app.put("/api/employees/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
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

  app.delete("/api/employees/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    await db.delete(employees).where(eq(employees.id, parseInt(req.params.id)));
    res.status(204).send();
  });

  // Inventory Items
  app.get("/api/inventory", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;

    const items = await db.query.inventoryItems.findMany({
      where: employeeId ? eq(inventoryItems.assignedTo, employeeId) : undefined,
      orderBy: (items, { desc }) => [desc(items.createdAt)],
    });

    res.json(items);
  });

  app.post("/api/inventory", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    try {
      const item = await db.insert(inventoryItems).values(req.body).returning();
      res.json(item[0]);
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  });

  app.put("/api/inventory/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    try {
      const item = await db
        .update(inventoryItems)
        .set(req.body)
        .where(eq(inventoryItems.id, parseInt(req.params.id)))
        .returning();
      res.json(item[0]);
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  });

  app.delete("/api/inventory/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    try {
      await db.delete(inventoryItems).where(eq(inventoryItems.id, parseInt(req.params.id)));
      res.status(204).send();
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  });

  // Leaves
  app.get("/api/leaves", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    const employeeId = req.query.employeeId ? parseInt(req.query.employeeId as string) : undefined;

    const allLeaves = await db.query.leaves.findMany({
      where: employeeId ? eq(leaves.employeeId, employeeId) : undefined,
      orderBy: (leaves, { desc }) => [desc(leaves.startDate)],
    });

    res.json(allLeaves);
  });

  app.post("/api/leaves", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    try {
      const leave = await db.insert(leaves).values(req.body).returning();
      res.json(leave[0]);
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  });

  app.put("/api/leaves/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    const leave = await db
      .update(leaves)
      .set(req.body)
      .where(eq(leaves.id, parseInt(req.params.id)))
      .returning();
    res.json(leave[0]);
  });

  app.delete("/api/leaves/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Unauthorized");
    }
    try {
      await db.delete(leaves).where(eq(leaves.id, parseInt(req.params.id)));
      res.status(204).send();
    } catch (error: any) {
      res.status(400).send(error.message);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}