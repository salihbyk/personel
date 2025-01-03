import { pgTable, text, serial, date, numeric, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

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
  emergencyContacts: jsonb("emergency_contacts").$type<EmergencyContact[]>().default([]),
  totalLeaveAllowance: numeric("total_leave_allowance").default("30"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  condition: text("condition").notNull(),
  notes: text("notes"),
  assignedTo: serial("assigned_to").references(() => employees.id, { onDelete: 'set null' }).notNull(),
  assignedAt: timestamp("assigned_at"),
  returnedAt: timestamp("returned_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const leaves = pgTable("leaves", {
  id: serial("id").primaryKey(),
  employeeId: serial("employee_id").references(() => employees.id).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  type: text("type").notNull(),
  status: text("status").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const performances = pgTable("performances", {
  id: serial("id").primaryKey(),
  employeeId: serial("employee_id").references(() => employees.id).notNull(),
  date: date("date").notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  rating: numeric("rating"),
  metrics: jsonb("metrics"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const employeeRelations = relations(employees, ({ many }) => ({
  leaves: many(leaves),
  performances: many(performances),
  inventoryItems: many(inventoryItems),
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

export const inventoryItemRelations = relations(inventoryItems, ({ one }) => ({
  employee: one(employees, {
    fields: [inventoryItems.assignedTo],
    references: [employees.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertEmployeeSchema = createInsertSchema(employees);
export const selectEmployeeSchema = createSelectSchema(employees);
export const insertLeaveSchema = createInsertSchema(leaves);
export const selectLeaveSchema = createSelectSchema(leaves);
export const insertPerformanceSchema = createInsertSchema(performances);
export const selectPerformanceSchema = createSelectSchema(performances);
export const insertInventoryItemSchema = createInsertSchema(inventoryItems);
export const selectInventoryItemSchema = createSelectSchema(inventoryItems);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Employee = typeof employees.$inferSelect;
export type NewEmployee = typeof employees.$inferInsert;
export type Leave = typeof leaves.$inferSelect;
export type NewLeave = typeof leaves.$inferInsert;
export type Performance = typeof performances.$inferSelect;
export type NewPerformance = typeof performances.$inferInsert;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type NewInventoryItem = typeof inventoryItems.$inferInsert;

export type EmergencyContact = {
  relationship: string;
  name: string;
  phone: string;
};