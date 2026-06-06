import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/use-auth";
import { useCurrency, formatPrice } from "@/lib/currency";
import { Users, Package, ShoppingBasket, Phone, MapPin, Mail, BadgeCheck, ClipboardCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const { user, isAdmin, loading, rolesLoaded } = useAuth();
  const { currency } = useCurrency();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [reviewV, setReviewV] = useState<any>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { router.navigate({ to: "/auth" }); return; }
    if (!rolesLoaded) return;
    if (!isAdmin) router.navigate({ to: "/" });
  }, [user, isAdmin, loading, rolesLoaded, router]);

  useEffect(() => {
    if (!isAdmin || !user) return;
    load();
    const onFocus = () => load();
    const ch = supabase.channel(`admin-notif-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        load();
      })
      .subscribe();
    const id = window.setInterval(load, 30000);
    window.addEventListener("focus", onFocus);
    return () => { supabase.removeChannel(ch); window.clearInterval(id); window.removeEventListener("focus", onFocus); };
  }, [isAdmin, user?.id]);

  async function load() {
    const [o, p, pr, v] = await Promise.all([
      supabase.from("orders").select("*, products(title)").order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("verifications").select("*").order("created_at", { ascending: false }),
    ]);
    const firstError = o.error ?? p.error ?? pr.error ?? v.error;
    if (firstError) {
      toast.error(firstError.message);
      return;
    }
    setOrders(o.data ?? []);
    setProfiles(p.data ?? []);
    setProducts(pr.data ?? []);
    setVerifications(v.data ?? []);
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
    { label: "Listings", value: products.length, icon: Package },
    { label: "KYC", value: verifications.filter((v) => v.status === "pending").length, icon: BadgeCheck },
  ];

  function buyerOf(o: any) { return profiles.find((p) => p.id === o.buyer_id); }
  function sellerOf(o: any) { return profiles.find((p) => p.id === o.seller_id); }

  const queue = products.filter((p) => p.moderation_status !== "approved" && p.moderation_status !== "rejected");

  async function setVerificationStatus(id: string, status: string, notes?: string) {
    const v = verifications.find((x) => x.id === id);
    const { error } = await (supabase as any).from("verifications")
      .update({ status, admin_notes: notes ?? v?.admin_notes, reviewed_by: user!.id, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    await (supabase as any).from("verification_audit").insert({
      verification_id: id, reviewer_id: user!.id, action: status,
      previous_status: v?.status, new_status: status, notes,
    });
    toast.success("Verification updated");
    setReviewV(null);
  }

  async function moderateProduct(id: string, status: string, patch: any = {}) {
    const { error } = await (supabase as any).from("products")
      .update({
        moderation_status: status,
        reviewed_by: user!.id,
        reviewed_at: new Date().toISOString(),
        available: status === "approved" ? true : false,
        ...patch,
      })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Listing ${status}`);
    setEditProduct(null);
    load();
  }

  return (
    <AppShell>
      <section className="bg-hero text-primary-foreground px-5 py-6 rounded-b-[2.5rem]">
        <h1 className="font-display text-2xl font-bold">Admin Control</h1>
        <p className="text-xs text-primary-foreground/80">Middleman dashboard · all contacts visible</p>
        <div className="grid grid-cols-4 gap-2 mt-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-primary-foreground/15 backdrop-blur rounded-2xl p-2 text-center">
              <s.icon className="w-4 h-4 mx-auto opacity-70" />
              <div className="text-lg font-bold mt-0.5">{s.value}</div>
              <div className="text-[10px] opacity-80">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="px-5 pt-6">
        <Tabs defaultValue="orders">
          <TabsList className="grid grid-cols-5 w-full h-auto">
            <TabsTrigger value="queue" className="text-[11px]">Queue</TabsTrigger>
            <TabsTrigger value="kyc" className="text-[11px]">KYC</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="products">All</TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="space-y-2 mt-4">
            <p className="text-xs text-muted-foreground">Edit, then approve to publish. {queue.length} pending.</p>
            {queue.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Queue empty 🌾</p>}
            {queue.map((p) => {
              const s = profiles.find((x) => x.id === p.seller_id);
              return (
                <Card key={p.id} className="p-3 shadow-card border-0 space-y-2">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 rounded-xl bg-secondary overflow-hidden shrink-0">
                      {p.image_url && <img src={p.image_url} alt="" className="w-full h-full object-cover"/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{p.title}</div>
                      <div className="text-[11px] text-muted-foreground">{p.category} · {p.grade ?? "—"} · {p.variety ?? "—"}</div>
                      <div className="text-xs font-bold text-primary">{formatPrice(p.price_ugx,p.price_usd,currency)} / {p.unit}</div>
                      <div className="text-[11px] text-muted-foreground truncate">by {s?.full_name ?? "—"} · {s?.phone ?? ""}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 rounded-full" onClick={()=>setEditProduct(p)}>Edit & Review</Button>
                    <Button size="sm" className="flex-1 rounded-full" onClick={()=>moderateProduct(p.id,"approved")}>Approve</Button>
                    <Button size="sm" variant="destructive" className="rounded-full" onClick={()=>moderateProduct(p.id,"rejected")}>Reject</Button>
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="kyc" className="space-y-2 mt-4">
            {verifications.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No verifications yet.</p>}
            {verifications.map((v) => (
              <Card key={v.id} className="p-3 shadow-card border-0 space-y-1">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-sm">{v.full_legal_name ?? "—"}</div>
                    <div className="text-[11px] text-muted-foreground">{v.district} · {v.crops}</div>
                    <div className="text-[11px] text-muted-foreground">{v.contact_number} · {v.momo_network} {v.momo_number}</div>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wide bg-secondary px-2 py-0.5 rounded-full">{v.status}</span>
                </div>
                <Button size="sm" variant="outline" className="w-full rounded-full mt-1" onClick={()=>setReviewV(v)}>Review</Button>
              </Card>
            ))}
          </TabsContent>

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

      <ProductEditDialog product={editProduct} onClose={()=>setEditProduct(null)} onSave={moderateProduct}/>
      <VerificationReviewDialog v={reviewV} onClose={()=>setReviewV(null)} onAction={setVerificationStatus}/>
    </AppShell>
  );
}

function ProductEditDialog({ product, onClose, onSave }:{
  product: any; onClose: ()=>void; onSave: (id: string, status: string, patch?: any)=>void;
}) {
  const [data, setData] = useState<any>(null);
  useEffect(()=> { setData(product); }, [product?.id]);
  if (!data) return null;
  const set = (k: string, v: any) => setData({ ...data, [k]: v });
  return (
    <Dialog open={!!product} onOpenChange={(o)=>!o && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">Review & Edit Listing</DialogTitle></DialogHeader>
        <div className="space-y-2 text-sm">
          <label className="block"><span className="text-xs">Title</span><Input value={data.title ?? ""} onChange={(e)=>set("title", e.target.value)}/></label>
          <label className="block"><span className="text-xs">Description</span><Textarea rows={3} value={data.description ?? ""} onChange={(e)=>set("description", e.target.value)}/></label>
          <div className="grid grid-cols-2 gap-2">
            <label><span className="text-xs">Price UGX</span><Input type="number" value={data.price_ugx ?? 0} onChange={(e)=>set("price_ugx", Number(e.target.value))}/></label>
            <label><span className="text-xs">Price USD</span><Input type="number" step="0.01" value={data.price_usd ?? 0} onChange={(e)=>set("price_usd", Number(e.target.value))}/></label>
            <label><span className="text-xs">Unit</span><Input value={data.unit ?? ""} onChange={(e)=>set("unit", e.target.value)}/></label>
            <label><span className="text-xs">Qty</span><Input type="number" value={data.quantity_available ?? 0} onChange={(e)=>set("quantity_available", Number(e.target.value))}/></label>
          </div>
          <label className="block"><span className="text-xs">Moderation notes (internal)</span><Textarea rows={2} value={data.moderation_notes ?? ""} onChange={(e)=>set("moderation_notes", e.target.value)}/></label>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1 rounded-full" onClick={()=>onSave(data.id, "approved", {
              title: data.title, description: data.description, price_ugx: data.price_ugx, price_usd: data.price_usd,
              unit: data.unit, quantity_available: data.quantity_available, moderation_notes: data.moderation_notes,
            })}>Save & Approve</Button>
            <Button variant="outline" className="rounded-full" onClick={()=>onSave(data.id, "requires_changes", { moderation_notes: data.moderation_notes })}>Request Changes</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VerificationReviewDialog({ v, onClose, onAction }:{
  v: any; onClose: ()=>void; onAction: (id: string, status: string, notes?: string)=>void;
}) {
  const [notes, setNotes] = useState("");
  useEffect(()=> setNotes(v?.admin_notes ?? ""), [v?.id]);
  if (!v) return null;
  return (
    <Dialog open={!!v} onOpenChange={(o)=>!o && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">Verification Review</DialogTitle></DialogHeader>
        <div className="space-y-2 text-sm">
          <Row label="Name" value={v.full_legal_name}/>
          <Row label="Phone" value={v.contact_number}/>
          <Row label="Email" value={v.email}/>
          <Row label="Location" value={[v.district, v.parish, v.village].filter(Boolean).join(", ")}/>
          <Row label="Crops" value={v.crops}/>
          <Row label="Acres" value={v.acres?.toString()}/>
          <Row label="Bags" value={v.bags_available?.toString()}/>
          <Row label="Availability" value={v.availability_timeline}/>
          <Row label="MoMo" value={`${v.momo_network ?? ""} ${v.momo_number ?? ""} (${v.momo_name ?? ""})`}/>
          {(v.farm_photos?.length || v.crop_photos?.length) ? (
            <div className="grid grid-cols-3 gap-1 pt-2">
              {[...(v.farm_photos ?? []), ...(v.crop_photos ?? [])].map((src: string, i: number)=>(
                <a key={i} href={src} target="_blank" rel="noreferrer"><img src={src} alt="" className="aspect-square w-full object-cover rounded-lg"/></a>
              ))}
            </div>
          ) : null}
          <label className="block pt-2"><span className="text-xs">Admin notes (visible to farmer)</span>
            <Textarea rows={2} value={notes} onChange={(e)=>setNotes(e.target.value)}/></label>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button className="rounded-full" onClick={()=>onAction(v.id,"approved",notes)}>Approve</Button>
            <Button variant="outline" className="rounded-full" onClick={()=>onAction(v.id,"info_required",notes)}>Request Info</Button>
            <Button variant="outline" className="rounded-full" onClick={()=>onAction(v.id,"suspended",notes)}>Suspend</Button>
            <Button variant="destructive" className="rounded-full" onClick={()=>onAction(v.id,"rejected",notes)}>Reject</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right truncate">{value || "—"}</span>
    </div>
  );
}
