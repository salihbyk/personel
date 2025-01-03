import { z } from "zod";

export const employeeSchema = z.object({
  firstName: z.string().min(1, "Ad gereklidir"),
  lastName: z.string().min(1, "Soyad gereklidir"),
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  phone: z.string().min(1, "Telefon numarası gereklidir"),
  address: z.string().min(1, "Adres gereklidir"),
  position: z.string().min(1, "Pozisyon gereklidir"),
  department: z.string().min(1, "Departman gereklidir"),
  salary: z.string().min(1, "Maaş gereklidir").transform((val) => parseFloat(val)),
  joinDate: z.string().min(1, "İşe başlama tarihi gereklidir"),
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