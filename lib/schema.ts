import { z } from "zod";

// クライアント → /api/checkout への入力
export const checkoutRequestSchema = z.object({
  productId: z.string().min(1).max(64),
  quantity: z.number().int().min(1).max(10),
  pickupDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 形式で指定"),
  pickupTimeSlot: z.enum(["am", "pm"]),
  customerName: z.string().min(1).max(40),
  customerNote: z.string().max(500).optional(),
  liffIdToken: z.string().min(10),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;

// LIFF ID Token verify レスポンス（必要部分のみ）
export const liffIdTokenPayloadSchema = z.object({
  iss: z.string(),
  sub: z.string(),
  aud: z.string(),
  exp: z.number(),
  iat: z.number(),
  name: z.string().optional(),
});

export type LiffIdTokenPayload = z.infer<typeof liffIdTokenPayloadSchema>;
