import { createMiddleware, createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const requireAdminAuth = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { data: role, error } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();

    if (error || !role) {
      throw new Error("Unauthorized: Admin access required");
    }

    return next();
  });

export const getAdminData = createServerFn({ method: "GET" })
  .middleware([requireAdminAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [orders, profiles, products, verifications] = await Promise.all([
      supabaseAdmin.from("orders").select("*, products(title)").order("created_at", { ascending: false }),
      supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("products").select("*").order("created_at", { ascending: false }),
      supabaseAdmin.from("verifications").select("*").order("created_at", { ascending: false }),
    ]);

    const firstError = orders.error ?? profiles.error ?? products.error ?? verifications.error;
    if (firstError) throw new Error(firstError.message);

    return {
      orders: orders.data ?? [],
      profiles: profiles.data ?? [],
      products: products.data ?? [],
      verifications: verifications.data ?? [],
    };
  });

export const updateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "confirmed", "delivered", "cancelled"]),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("orders").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const updateVerificationStatus = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["approved", "info_required", "suspended", "rejected"]),
        notes: z.string().max(2000).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const current = await supabaseAdmin
      .from("verifications")
      .select("status, admin_notes")
      .eq("id", data.id)
      .single();

    if (current.error) throw new Error(current.error.message);

    const { error } = await supabaseAdmin
      .from("verifications")
      .update({
        status: data.status,
        admin_notes: data.notes ?? current.data.admin_notes,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (error) throw new Error(error.message);

    const auditInsert = await supabaseAdmin.from("verification_audit").insert({
      verification_id: data.id,
      reviewer_id: context.userId,
      action: data.status,
      previous_status: current.data.status,
      new_status: data.status,
      notes: data.notes ?? null,
    });

    if (auditInsert.error) throw new Error(auditInsert.error.message);

    return { success: true };
  });

export const moderateProductStatus = createServerFn({ method: "POST" })
  .middleware([requireAdminAuth])
  .inputValidator((data) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["approved", "rejected", "requires_changes"]),
        patch: z.record(z.string(), z.any()).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("products")
      .update({
        moderation_status: data.status,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
        available: data.status === "approved",
        ...(data.patch ?? {}),
      })
      .eq("id", data.id);

    if (error) throw new Error(error.message);
    return { success: true };
  });