import { pgTable, text, serial, date, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const employees = pgTable("employees", {
  id: serial("id").primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").unique().notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  position: text("position").notNull(),
  department: text("department").notNull(),
  joinDate: date("join_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const salaries = pgTable("salaries", {
  id: serial("id").primaryKey(),
  employeeId: serial("employee_id").references(() => employees.id).notNull(),
  amount: numeric("amount").notNull(),
  effectiveDate: date("effective_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

export const employeeRelations = relations(employees, ({ many }) => ({
  salaries: many(salaries),
  leaves: many(leaves),
}));

export const salaryRelations = relations(salaries, ({ one }) => ({
  employee: one(employees, {
    fields: [salaries.employeeId],
    references: [employees.id],
  }),
}));

export const leaveRelations = relations(leaves, ({ one }) => ({
  employee: one(employees, {
    fields: [leaves.employeeId],
    references: [employees.id],
  }),
}));

export const insertEmployeeSchema = createInsertSchema(employees);
export const selectEmployeeSchema = createSelectSchema(employees);
export const insertSalarySchema = createInsertSchema(salaries);
export const selectSalarySchema = createSelectSchema(salaries);
export const insertLeaveSchema = createInsertSchema(leaves);
export const selectLeaveSchema = createSelectSchema(leaves);

export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type Salary = typeof salaries.$inferSelect;
export type NewSalary = typeof salaries.$inferInsert;
export type Leave = typeof leaves.$inferSelect;
export type NewLeave = typeof leaves.$inferInsert;
