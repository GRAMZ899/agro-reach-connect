import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { useCurrency, formatPrice } from "@/lib/currency";
import { Package } from "lucide-react";

export const Route = createFileRoute("/orders")({ component: OrdersPage });

function OrdersPage() {
  const { user, loading } = useAuth();
  const { currency } = useCurrency();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => { if (!loading && !user) router.navigate({ to: "/auth" }); }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase.channel(`orders-notif-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from("orders")
      .select("*, products(title, image_url)")
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false });
    setOrders(data ?? []);
  }

  return (
    <AppShell>
      <div className="px-5 pt-6">
        <h1 className="font-display text-2xl font-bold">My Orders</h1>
        <p className="text-xs text-muted-foreground">Track everything you've ordered</p>
        <div className="space-y-2 mt-4">
          {orders.map((o) => (
            <Card key={o.id} className="p-3 flex gap-3 items-center shadow-card border-0">
              <div className="w-14 h-14 rounded-xl bg-secondary overflow-hidden shrink-0">
                {o.products?.image_url && <img src={o.products.image_url} alt="" className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm">{o.products?.title ?? "Product"}</div>
                <div className="text-xs text-muted-foreground">Qty {o.quantity} · {new Date(o.created_at).toLocaleDateString()}</div>
                <span className="text-[10px] uppercase font-bold tracking-wide bg-accent/30 px-2 py-0.5 rounded-full inline-block mt-1">{o.status}</span>
              </div>
              <div className="font-bold text-primary text-sm">{formatPrice(o.total_ugx, o.total_usd, currency)}</div>
            </Card>
          ))}
          {orders.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto opacity-40" />
              <p className="mt-2 text-sm">No orders yet</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
