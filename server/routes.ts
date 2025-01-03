import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { employees, leaves } from "@db/schema";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  // Employees
  app.get("/api/employees", async (_req, res) => {
    const allEmployees = await db.query.employees.findMany();
    res.json(allEmployees);
  });

  app.get("/api/employees/:id", async (req, res) => {
    const employee = await db.query.employees.findFirst({
      where: eq(employees.id, parseInt(req.params.id)),
    });

    if (!employee) {
      return res.status(404).send("Employee not found");
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

  app.delete("/api/employees/:id", async (req, res) => {
    await db.delete(employees).where(eq(employees.id, parseInt(req.params.id)));
    res.status(204).send();
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
    const leave = await db.insert(leaves).values(req.body).returning();
    res.json(leave[0]);
  });

  app.put("/api/leaves/:id", async (req, res) => {
    const leave = await db
      .update(leaves)
      .set(req.body)
      .where(eq(leaves.id, parseInt(req.params.id)))
      .returning();
    res.json(leave[0]);
  });

  app.delete("/api/leaves/:id", async (req, res) => {
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