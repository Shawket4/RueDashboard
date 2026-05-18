import { z } from "zod";
import { ROLES } from "@/shared/config/constants";

export const userBaseSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email().nullish().or(z.literal("")),
  phone: z.string().trim().nullish(),
  role: z.enum(ROLES),
  is_active: z.boolean().default(true),
});

export const createUserSchema = userBaseSchema.extend({
  org_id: z.string().min(1),
  pin: z.string().regex(/^\d{4,6}$/, "4–6 digit PIN").optional().or(z.literal("")),
  password: z.string().min(6).optional().or(z.literal("")),
});

export const updateUserSchema = userBaseSchema.extend({
  pin: z.string().regex(/^\d{4,6}$/, "4–6 digit PIN").optional().or(z.literal("")),
  password: z.string().min(6).optional().or(z.literal("")),
});

export type CreateUserValues = z.infer<typeof createUserSchema>;
export type UpdateUserValues = z.infer<typeof updateUserSchema>;
