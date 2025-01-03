import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
import { employees, leaves, salaries } from "@db/schema";
import { eq } from "drizzle-orm";

export function registerRoutes(app: Express): Server {
  // Employees
  app.get("/api/employees", async (_req, res) => {
    const allEmployees = await db.query.employees.findMany({
      with: {
        salaries: true,
        leaves: true,
      },
    });
    res.json(allEmployees);
  });

  app.post("/api/employees", async (req, res) => {
    const employee = await db.insert(employees).values(req.body).returning();
    res.json(employee[0]);
  });

  app.put("/api/employees/:id", async (req, res) => {
    const employee = await db
      .update(employees)
      .set(req.body)
      .where(eq(employees.id, parseInt(req.params.id)))
      .returning();
    res.json(employee[0]);
  });

  app.delete("/api/employees/:id", async (req, res) => {
    await db.delete(employees).where(eq(employees.id, parseInt(req.params.id)));
    res.status(204).send();
  });

  // Leaves
  app.get("/api/leaves", async (_req, res) => {
    const allLeaves = await db.query.leaves.findMany({
      with: {
        employee: true,
      },
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

  // Salaries
  app.get("/api/salaries", async (_req, res) => {
    const allSalaries = await db.query.salaries.findMany({
      with: {
        employee: true,
      },
    });
    res.json(allSalaries);
  });

  app.post("/api/salaries", async (req, res) => {
    const salary = await db.insert(salaries).values(req.body).returning();
    res.json(salary[0]);
  });

  const httpServer = createServer(app);
  return httpServer;
}
