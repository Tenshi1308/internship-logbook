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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
