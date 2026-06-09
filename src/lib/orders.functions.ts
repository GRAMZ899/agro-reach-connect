import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createOrderSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive().max(100000),
  buyerPhone: z.string().trim().min(7).max(20),
  buyerLocation: z.string().trim().min(2).max(200),
  notes: z.string().trim().max(500).nullable().optional(),
  currency: z.enum(["UGX", "USD"]),
});

export const createOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => createOrderSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: product, error: productError } = await context.supabase
      .from("products")
      .select("id, price_ugx, price_usd, quantity_available, moderation_status, available")
      .eq("id", data.productId)
      .single();

    if (productError || !product) {
      throw new Error(productError?.message || "Product not found");
    }

    if (!product.available || product.moderation_status !== "approved") {
      throw new Error("This listing is not available for orders");
    }

    const availableQty = Number(product.quantity_available ?? 0);
    if (data.quantity > availableQty) {
      throw new Error(`Only ${availableQty} available - please reduce your quantity`);
    }

    const totalUgx = Number(product.price_ugx ?? 0) * data.quantity;
    const totalUsd = Number(product.price_usd ?? 0) * data.quantity;

    const { error } = await context.supabase.from("orders").insert({
      product_id: data.productId,
      buyer_id: context.userId,
      quantity: data.quantity,
      total_ugx: totalUgx,
      total_usd: totalUsd,
      currency: data.currency,
      buyer_location: data.buyerLocation,
      buyer_phone: data.buyerPhone,
      notes: data.notes ?? null,
    } as any);

    if (error) throw new Error(error.message);
    return { success: true };
  });