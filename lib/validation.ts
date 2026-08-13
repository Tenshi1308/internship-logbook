import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter")
    .max(100, "Nama maksimal 100 karakter"),
  nim: z
    .string()
    .trim()
    .min(5, "NIM tidak valid")
    .max(20, "NIM tidak valid"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email tidak valid")
    .max(255, "Email terlalu panjang"),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .max(100, "Password maksimal 100 karakter"),
  scheme: z
    .string()
    .trim()
    .min(1, "Skema wajib diisi")
    .max(100, "Skema maksimal 100 karakter"),
  partner: z
    .string()
    .trim()
    .min(1, "Mitra wajib diisi")
    .max(100, "Mitra maksimal 100 karakter"),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email tidak valid")
    .max(255, "Email terlalu panjang"),
  password: z
    .string()
    .min(1, "Password wajib diisi")
    .max(100, "Password maksimal 100 karakter"),
});

export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid");

export const weekNumberSchema = z.coerce
  .number({ error: "Minggu ke- harus berupa angka" })
  .int("Minggu ke- harus berupa angka bulat")
  .min(1, "Minggu ke- minimal 1")
  .max(52, "Minggu ke- maksimal 52");

export const createReportSchema = z
  .object({
    weekNumber: weekNumberSchema,
    startDate: dateOnlySchema,
    endDate: dateOnlySchema,
  })
  .refine(
    (data) => data.endDate >= data.startDate,
    {
      message: "Tanggal selesai tidak boleh sebelum tanggal mulai",
      path: ["endDate"],
    }
  );

export const reportInfoSchema = z
  .object({
    weekNumber: weekNumberSchema,
    startDate: dateOnlySchema,
    endDate: dateOnlySchema,
    status: z.enum(["DRAFT", "COMPLETED"]),
  })
  .refine(
    (data) => data.endDate >= data.startDate,
    {
      message: "Tanggal selesai tidak boleh sebelum tanggal mulai",
      path: ["endDate"],
    }
  );

export const timeSchema = z
  .string()
  .regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/, "Format jam harus HH:MM");

export const saveDaySchema = z.object({
  reportId: z.string().min(1, "Laporan tidak valid"),
  date: dateOnlySchema,
  startTime: timeSchema,
  endTime: timeSchema,
  location: z
    .string()
    .trim()
    .min(1, "Lokasi wajib diisi")
    .max(100, "Lokasi maksimal 100 karakter"),
});

export const activityDescriptionSchema = z
  .string()
  .trim()
  .min(1, "Kegiatan tidak boleh kosong")
  .max(1000, "Kegiatan maksimal 1000 karakter");

export const aiDescriptionSchema = z
  .string()
  .trim()
  .min(1, "Deskripsi tidak boleh kosong")
  .max(4000, "Deskripsi maksimal 4000 karakter");

export const photoCaptionSchema = z
  .string()
  .trim()
  .max(300, "Keterangan maksimal 300 karakter");

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ReportInfoInput = z.infer<typeof reportInfoSchema>;
export type SaveDayInput = z.infer<typeof saveDaySchema>;
