import { pgTable, text, serial, date, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const employees = pgTable("employees", {
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const leaves = pgTable("leaves", {
  id: serial("id").primaryKey(),
  employeeId: serial("employee_id").references(() => employees.id).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  type: text("type").notNull(), // vacation, sick, personal
  status: text("status").notNull(), // pending, approved, rejected
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const performances = pgTable("performances", {
  id: serial("id").primaryKey(),
  employeeId: serial("employee_id").references(() => employees.id).notNull(),
  date: date("date").notNull(),
  type: text("type").notNull(), // review, achievement, warning, goal
  title: text("title").notNull(),
  description: text("description").notNull(),
  rating: numeric("rating"), // 1-5 rating for reviews
  metrics: jsonb("metrics"), // Flexible metrics storage
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const employeeRelations = relations(employees, ({ many }) => ({
  leaves: many(leaves),
  performances: many(performances),
}));

export const leaveRelations = relations(leaves, ({ one }) => ({
  employee: one(employees, {
    fields: [leaves.employeeId],
    references: [employees.id],
  }),
}));

export const performanceRelations = relations(performances, ({ one }) => ({
  employee: one(employees, {
    fields: [performances.employeeId],
    references: [employees.id],
  }),
}));

export const insertEmployeeSchema = createInsertSchema(employees);
export const selectEmployeeSchema = createSelectSchema(employees);
export const insertLeaveSchema = createInsertSchema(leaves);
export const selectLeaveSchema = createSelectSchema(leaves);
export const insertPerformanceSchema = createInsertSchema(performances);
export const selectPerformanceSchema = createSelectSchema(performances);

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type Leave = typeof leaves.$inferSelect;
export type NewLeave = typeof leaves.$inferInsert;
export type Performance = typeof performances.$inferSelect;
export type NewPerformance = typeof performances.$inferInsert;