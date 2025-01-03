import { z } from "zod";

export const employeeSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  address: z.string().min(1, "Address is required"),
  position: z.string().min(1, "Position is required"),
  department: z.string().min(1, "Department is required"),
  joinDate: z.string().min(1, "Join date is required"),
});

export const leaveSchema = z.object({
  employeeId: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  type: z.enum(["vacation", "sick", "personal"]),
  status: z.enum(["pending", "approved", "rejected"]),
  reason: z.string().min(1, "Reason is required"),
});

export const salarySchema = z.object({
  employeeId: z.number(),
  amount: z.number().positive("Salary must be positive"),
  effectiveDate: z.string(),
});
