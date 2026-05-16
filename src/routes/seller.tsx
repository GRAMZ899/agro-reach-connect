import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Package, Bell, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { useCurrency } from "@/lib/currency";
import { formatPrice } from "@/lib/currency";
import { ProductForm } from "@/components/ProductForm";
import { toast } from "sonner";

export const Route = createFileRoute("/seller")({ component: SellerHome });

interface SellerOrder {
  id: string;
  product_id: string;
  product_title: string;
  quantity: number;
  total_ugx: number;
  total_usd: number;
  currency: string;
  status: string;
  created_at: string;
}

function SellerHome() {
  const { user, isSeller, loading } = useAuth();
  const { currency } = useCurrency();
  const router = useRouter();
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/auth" });
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase
      .channel(`seller-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: `seller_id=eq.${user.id}` },
        (payload) => {
          toast.success(`New order received!`, { description: `Quantity: ${(payload.new as any).quantity}` });
          load();
        })
      .on("postgres_changes", { event: "*", schema: "public", table: "products", filter: `seller_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  async function load() {
    if (!user) return;
    const [{ data: p }, { data: o }] = await Promise.all([
      supabase.from("products").select("*").eq("seller_id", user.id).order("created_at", { ascending: false }),
      supabase.from("seller_orders").select("*").order("created_at", { ascending: false }),
    ]);
    setProducts(p ?? []);
    setOrders((o as any) ?? []);
  }

  async function remove(id: string) {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removed");
  }

  if (!user || !isSeller) {
    return <AppShell><div className="p-6 text-center text-sm text-muted-foreground">Sign in as a farmer to access this.</div></AppShell>;
  }

  const pending = orders.filter((o) => o.status === "pending").length;

  return (
    <AppShell>
      <section className="bg-hero text-primary-foreground px-5 py-6 rounded-b-[2.5rem]">
        <h1 className="font-display text-2xl font-bold">My Farm</h1>
        <p className="text-xs text-primary-foreground/80">Manage your produce & orders</p>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="bg-primary-foreground/15 backdrop-blur rounded-2xl p-3">
            <div className="text-2xl font-bold">{products.length}</div>
            <div className="text-xs opacity-80">Products listed</div>
          </div>
          <div className="bg-primary-foreground/15 backdrop-blur rounded-2xl p-3 relative">
            <div className="text-2xl font-bold">{pending}</div>
            <div className="text-xs opacity-80">Pending orders</div>
            {pending > 0 && <Bell className="w-4 h-4 absolute top-3 right-3 animate-pulse" />}
          </div>
        </div>
      </section>

      <div className="px-5 pt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-bold">Your Products</h2>
          <Button size="sm" onClick={() => setOpen(true)} className="rounded-full">
            <Plus className="w-4 h-4 mr-1" /> Post
          </Button>
        </div>
        {products.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            <Package className="w-10 h-10 mx-auto opacity-40" />
            <p className="mt-2">No products yet. Post your first!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {products.map((p) => (
              <Card key={p.id} className="p-3 flex gap-3 items-center shadow-card border-0">
                <div className="w-14 h-14 rounded-xl bg-secondary overflow-hidden shrink-0">
                  {p.image_url && <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{p.title}</div>
                  <div className="text-xs text-primary font-bold">{formatPrice(p.price_ugx, p.price_usd, currency)} / {p.unit}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(p.id)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </Card>
            ))}
          </div>
        )}

        <h2 className="font-display text-lg font-bold mt-8 mb-3">Recent Orders</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No orders yet.</p>
        ) : (
          <div className="space-y-2">
            {orders.slice(0, 20).map((o) => (
              <Card key={o.id} className="p-3 shadow-card border-0">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-sm">{o.product_title}</div>
                    <div className="text-xs text-muted-foreground">Qty: {o.quantity}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-primary text-sm">{formatPrice(o.total_ugx, o.total_usd, currency)}</div>
                    <span className="text-[10px] uppercase font-bold tracking-wide bg-accent/30 px-2 py-0.5 rounded-full">{o.status}</span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2">
                  Buyer details are handled privately by the admin team.
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ProductForm open={open} onOpenChange={setOpen} sellerId={user.id} onSaved={load} />
    </AppShell>
  );
}
