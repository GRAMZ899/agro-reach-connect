import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ProductCard, type ProductRow } from "@/components/ProductCard";
import { OrderDialog } from "@/components/OrderDialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/use-auth";
import { useCurrency } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { Search, Sprout } from "lucide-react";

export const Route = createFileRoute("/browse")({ component: Browse });

function Browse() {
  const { user, profile } = useAuth();
  const { currency } = useCurrency();
  const router = useRouter();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<ProductRow | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("public-products")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function load() {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("available", true)
      .order("created_at", { ascending: false });
    setProducts((data ?? []) as any);
  }

  const filtered = products.filter((p) =>
    !q || p.title.toLowerCase().includes(q.toLowerCase()) || p.location.toLowerCase().includes(q.toLowerCase())
  );

  function handleOrder(p: ProductRow) {
    if (!user) { router.navigate({ to: "/auth" }); return; }
    setSelected(p);
    setOpen(true);
  }

  return (
    <AppShell>
      <div className="px-5 pt-4 pb-4">
        <h1 className="font-display text-2xl font-bold">Fresh Market</h1>
        <p className="text-xs text-muted-foreground">Direct from African farms · live</p>
        <div className="relative mt-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search produce or location…" className="pl-9 rounded-full bg-muted border-0" />
        </div>
      </div>
      <div className="px-5 grid grid-cols-2 gap-3">
        {filtered.map((p) => (
          <ProductCard key={p.id} product={p} currency={currency} onOrder={handleOrder} />
        ))}
      </div>
      {filtered.length === 0 && (
        <div className="px-5 pt-16 text-center text-muted-foreground">
          <Sprout className="w-12 h-12 mx-auto opacity-50" />
          <p className="mt-3 text-sm">No products yet. Check back soon!</p>
        </div>
      )}
      {user && (
        <OrderDialog
          product={selected}
          open={open}
          onOpenChange={setOpen}
          currency={currency}
          buyerId={user.id}
          defaultPhone={profile?.phone ?? ""}
          defaultLocation={profile?.location ?? ""}
        />
      )}
    </AppShell>
  );
}
