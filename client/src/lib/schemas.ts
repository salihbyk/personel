import { z } from "zod";

const emergencyContactSchema = z.object({
  relationship: z.string().min(1, "İlişki türü gereklidir"),
  name: z.string().min(1, "İsim gereklidir"),
  phone: z.string().min(1, "Telefon numarası gereklidir"),
});

export const employeeSchema = z.object({
  firstName: z.string().min(1, "Ad gereklidir"),
  lastName: z.string().min(1, "Soyad gereklidir"),
  email: z.string().optional(),
  phone: z.string().min(1, "Telefon numarası gereklidir"),
  address: z.string().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  salary: z.string().min(1, "Maaş gereklidir").transform((val) => parseFloat(val)),
  joinDate: z.string().optional(),
  emergencyContacts: z.array(emergencyContactSchema).default([]),
  totalLeaveAllowance: z.string().transform((val) => parseFloat(val)).default("30"),
});

export const inventoryItemSchema = z.object({
  name: z.string().min(1, "Eşya adı gereklidir"),
  type: z.string().min(1, "Eşya türü gereklidir"),
  serialNumber: z.string().optional(),
  condition: z.enum(["yeni", "iyi", "orta", "kötü"], {
    errorMap: () => ({ message: "Lütfen eşyanın durumunu seçin" }),
  }),
  notes: z.string().optional(),
  assignedTo: z.number().optional(),
  assignedAt: z.string().optional(),
  returnedAt: z.string().optional(),
});

export const leaveSchema = z.object({
  employeeId: z.number(),
  startDate: z.string(),
  endDate: z.string(),
  type: z.enum(["izin", "hastalık", "diğer"]),
  status: z.enum(["beklemede", "onaylandı", "reddedildi"]),
  reason: z.string().min(1, "İzin nedeni gereklidir"),
});

export const salarySchema = z.object({
  employeeId: z.number(),
  amount: z.number().positive("Salary must be positive"),
  effectiveDate: z.string(),
});

export type EmergencyContact = z.infer<typeof emergencyContactSchema>;
export type InventoryItem = z.infer<typeof inventoryItemSchema>;