import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { useCurrency, formatPrice } from "@/lib/currency";
import { Users, Package, ShoppingBasket, Phone, MapPin, Mail } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const { user, isAdmin, loading, rolesLoaded } = useAuth();
  const { currency } = useCurrency();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.navigate({ to: "/auth" }); return; }
    if (!rolesLoaded) return;
    if (!isAdmin) router.navigate({ to: "/" });
  }, [user, isAdmin, loading, rolesLoaded, router]);

  useEffect(() => {
    if (!isAdmin) return;
    load();
    const ch = supabase.channel("admin-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        toast.info("Order activity");
        load();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isAdmin]);

  async function load() {
    const [o, p, pr] = await Promise.all([
      supabase.from("orders").select("*, products(title)").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("*").order("created_at", { ascending: false }),
    ]);
    setOrders(o.data ?? []);
    setProfiles(p.data ?? []);
    setProducts(pr.data ?? []);
  }

  function sellerProfileOf(p: any) { return profiles.find((x) => x.id === p.seller_id); }

  async function setStatus(id: string, status: string) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Updated");
  }

  if (loading || !rolesLoaded) {
    return <AppShell><div className="p-10 text-center text-muted-foreground text-sm">Loading admin…</div></AppShell>;
  }
  if (!isAdmin) return <AppShell><div className="p-6 text-center text-muted-foreground">Access denied.</div></AppShell>;

  const stats = [
    { label: "Orders", value: orders.length, icon: ShoppingBasket },
    { label: "Users", value: profiles.length, icon: Users },
    { label: "Products", value: products.length, icon: Package },
  ];

  function buyerOf(o: any) { return profiles.find((p) => p.id === o.buyer_id); }
  function sellerOf(o: any) { return profiles.find((p) => p.id === o.seller_id); }

  return (
    <AppShell>
      <section className="bg-hero text-primary-foreground px-5 py-6 rounded-b-[2.5rem]">
        <h1 className="font-display text-2xl font-bold">Admin Control</h1>
        <p className="text-xs text-primary-foreground/80">Middleman dashboard · all contacts visible</p>
        <div className="grid grid-cols-3 gap-2 mt-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-primary-foreground/15 backdrop-blur rounded-2xl p-3 text-center">
              <s.icon className="w-4 h-4 mx-auto opacity-70" />
              <div className="text-xl font-bold mt-1">{s.value}</div>
              <div className="text-[10px] opacity-80">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="px-5 pt-6">
        <Tabs defaultValue="orders">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
          </TabsList>

          <TabsContent value="orders" className="space-y-2 mt-4">
            {orders.map((o) => {
              const buyer = buyerOf(o); const seller = sellerOf(o);
              return (
                <Card key={o.id} className="p-3 shadow-card border-0 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-sm">{o.products?.title}</div>
                      <div className="text-xs text-muted-foreground">Qty {o.quantity} · {new Date(o.created_at).toLocaleString()}</div>
                    </div>
                    <div className="font-bold text-primary text-sm">{formatPrice(o.total_ugx, o.total_usd, currency)}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-muted rounded-xl p-2">
                    <div>
                      <div className="font-semibold uppercase text-[9px] tracking-wide text-muted-foreground mb-1">Buyer</div>
                      <div className="font-medium">{buyer?.full_name ?? "—"}</div>
                      <div className="flex items-center gap-1 text-muted-foreground"><Mail className="w-3 h-3" />{buyer?.email}</div>
                      <div className="flex items-center gap-1 text-muted-foreground"><Phone className="w-3 h-3" />{o.buyer_phone}</div>
                      <div className="flex items-center gap-1 text-muted-foreground"><MapPin className="w-3 h-3" />{o.buyer_location}</div>
                    </div>
                    <div>
                      <div className="font-semibold uppercase text-[9px] tracking-wide text-muted-foreground mb-1">Seller</div>
                      <div className="font-medium">{seller?.full_name ?? "—"}</div>
                      <div className="flex items-center gap-1 text-muted-foreground"><Mail className="w-3 h-3" />{seller?.email}</div>
                      <div className="flex items-center gap-1 text-muted-foreground"><Phone className="w-3 h-3" />{seller?.phone}</div>
                      <div className="flex items-center gap-1 text-muted-foreground"><MapPin className="w-3 h-3" />{seller?.location}</div>
                    </div>
                  </div>
                  {o.notes && <p className="text-xs italic text-muted-foreground">Note: {o.notes}</p>}
                  <Select value={o.status} onValueChange={(v) => setStatus(o.id, v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </Card>
              );
            })}
            {orders.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No orders yet.</p>}
          </TabsContent>

          <TabsContent value="users" className="space-y-2 mt-4">
            {profiles.map((p) => (
              <Card key={p.id} className="p-3 shadow-card border-0">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-sm">{p.full_name || "Unnamed"}</div>
                    <span className="text-[10px] uppercase font-bold tracking-wide bg-accent/30 px-2 py-0.5 rounded-full">{p.account_type}</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                  <div className="flex items-center gap-1"><Mail className="w-3 h-3" />{p.email}</div>
                  <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{p.phone}</div>
                  <div className="flex items-center gap-1"><MapPin className="w-3 h-3" />{p.location}</div>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="products" className="space-y-2 mt-4">
            {products.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No products listed yet.</p>}
            {products.map((p) => {
              const s = sellerProfileOf(p);
              return (
                <Card key={p.id} className="p-3 shadow-card border-0 flex gap-3 items-center">
                  <div className="w-14 h-14 rounded-xl bg-secondary overflow-hidden shrink-0">
                    {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{p.title}</div>
                    <div className="text-xs text-primary font-bold">{formatPrice(p.price_ugx, p.price_usd, currency)} / {p.unit}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {p.quantity_available} {p.unit} left · {p.location}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      by {s?.full_name ?? "—"} · {s?.phone ?? ""}
                    </div>
                  </div>
                  <span className={`text-[9px] uppercase font-bold tracking-wide px-2 py-0.5 rounded-full ${p.available ? "bg-success/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                    {p.available ? "Live" : "Sold"}
                  </span>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
