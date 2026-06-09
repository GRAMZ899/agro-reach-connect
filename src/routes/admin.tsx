import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import {
  getAdminData,
  moderateProductStatus,
  updateOrderStatus,
  updateVerificationStatus,
} from "@/lib/admin.functions";
import { useAuth } from "@/lib/use-auth";
import { formatPrice, useCurrency } from "@/lib/currency";
import { BadgeCheck, Mail, MapPin, Package, Phone, ShoppingBasket, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const { user, isAdmin, loading, rolesLoaded } = useAuth();
  const { currency } = useCurrency();
  const router = useRouter();
  const fetchAdminData = useServerFn(getAdminData);
  const mutateOrderStatus = useServerFn(updateOrderStatus);
  const mutateVerificationStatus = useServerFn(updateVerificationStatus);
  const mutateProductStatus = useServerFn(moderateProductStatus);
  const [orders, setOrders] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [verifications, setVerifications] = useState<any[]>([]);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [reviewV, setReviewV] = useState<any>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.navigate({ to: "/auth" });
      return;
    }
    if (!rolesLoaded) return;
    if (!isAdmin) router.navigate({ to: "/" });
  }, [user, isAdmin, loading, rolesLoaded, router]);

  useEffect(() => {
    if (!isAdmin || !user) return;
    load();
    const onFocus = () => load();
    const channel = supabase
      .channel(`admin-notifications-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => load(),
      )
      .subscribe();

    window.addEventListener("focus", onFocus);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
  }, [isAdmin, user?.id]);

  async function load() {
    try {
      const data = await fetchAdminData();
      setOrders(data.orders ?? []);
      setProfiles(data.profiles ?? []);
      setProducts(data.products ?? []);
      setVerifications(data.verifications ?? []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load admin data");
    }
  }

  async function setStatus(id: string, status: "pending" | "confirmed" | "delivered" | "cancelled") {
    try {
      await mutateOrderStatus({ data: { id, status } });
      toast.success("Order updated");
      load();
    } catch (error: any) {
      toast.error(error.message || "Failed to update status");
    }
  }

  async function setVerificationStatus(
    id: string,
    status: "approved" | "info_required" | "suspended" | "rejected",
    notes?: string,
  ) {
    try {
      await mutateVerificationStatus({ data: { id, status, notes } });
      toast.success("Verification updated");
      setReviewV(null);
      load();
    } catch (error: any) {
      toast.error(error.message || "Failed to update verification");
    }
  }

  async function moderateProduct(id: string, status: "approved" | "rejected" | "requires_changes", patch: any = {}) {
    try {
      await mutateProductStatus({ data: { id, status, patch } });
      toast.success(`Listing ${status.replace("_", " ")}`);
      setEditProduct(null);
      load();
    } catch (error: any) {
      toast.error(error.message || "Failed to moderate product");
    }
  }

  const queue = useMemo(
    () => products.filter((p) => p.moderation_status !== "approved" && p.moderation_status !== "rejected"),
    [products],
  );

  const stats = [
    { label: "Orders", value: orders.length, icon: ShoppingBasket },
    { label: "Users", value: profiles.length, icon: Users },
    { label: "Listings", value: products.length, icon: Package },
    { label: "KYC", value: verifications.filter((v) => v.status === "pending").length, icon: BadgeCheck },
  ];

  function buyerOf(order: any) {
    return profiles.find((profile) => profile.id === order.buyer_id);
  }

  function sellerOf(order: any) {
    return profiles.find((profile) => profile.id === order.seller_id);
  }

  if (loading || !rolesLoaded) {
    return (
      <AppShell>
        <div className="p-10 text-center text-sm text-muted-foreground">Loading admin…</div>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <div className="p-6 text-center text-muted-foreground">Access denied.</div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="bg-hero text-primary-foreground px-5 py-6 rounded-b-[2.5rem]">
        <h1 className="font-display text-2xl font-bold">Admin Control</h1>
        <p className="text-xs text-primary-foreground/80">Moderation, verification and order coordination</p>
        <div className="grid grid-cols-4 gap-2 mt-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-primary-foreground/15 backdrop-blur rounded-2xl p-2 text-center">
              <stat.icon className="w-4 h-4 mx-auto opacity-70" />
              <div className="text-lg font-bold mt-0.5">{stat.value}</div>
              <div className="text-[10px] opacity-80">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="px-5 pt-6">
        <Tabs defaultValue="queue">
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
            {queue.map((product) => {
              const seller = sellerOf(product) ?? profiles.find((profile) => profile.id === product.seller_id);
              return (
                <Card key={product.id} className="p-3 shadow-card border-0 space-y-2">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 rounded-xl bg-secondary overflow-hidden shrink-0">
                      {product.image_url && <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{product.title}</div>
                      <div className="text-[11px] text-muted-foreground">{product.category} · {product.grade ?? "—"} · {product.variety ?? "—"}</div>
                      <div className="text-xs font-bold text-primary">{formatPrice(product.price_ugx, product.price_usd, currency)} / {product.unit}</div>
                      <div className="text-[11px] text-muted-foreground truncate">by {seller?.full_name ?? "—"} · {seller?.phone ?? ""}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 rounded-full" onClick={() => setEditProduct(product)}>
                      Edit & Review
                    </Button>
                    <Button size="sm" className="flex-1 rounded-full" onClick={() => moderateProduct(product.id, "approved")}>
                      Approve
                    </Button>
                    <Button size="sm" variant="destructive" className="rounded-full" onClick={() => moderateProduct(product.id, "rejected")}>
                      Reject
                    </Button>
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="kyc" className="space-y-2 mt-4">
            {verifications.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No verifications yet.</p>}
            {verifications.map((verification) => (
              <Card key={verification.id} className="p-3 shadow-card border-0 space-y-1">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-sm">{verification.full_legal_name ?? "—"}</div>
                    <div className="text-[11px] text-muted-foreground">{verification.district} · {verification.crops}</div>
                    <div className="text-[11px] text-muted-foreground">{verification.contact_number} · {verification.momo_network} {verification.momo_number}</div>
                  </div>
                  <span className="text-[10px] uppercase font-bold tracking-wide bg-secondary px-2 py-0.5 rounded-full">{verification.status}</span>
                </div>
                <Button size="sm" variant="outline" className="w-full rounded-full mt-1" onClick={() => setReviewV(verification)}>
                  Review
                </Button>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="orders" className="space-y-2 mt-4">
            {orders.map((order) => {
              const buyer = buyerOf(order);
              const seller = sellerOf(order);
              return (
                <Card key={order.id} className="p-3 shadow-card border-0 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-sm">{order.products?.title}</div>
                      <div className="text-xs text-muted-foreground">Qty {order.quantity} · {new Date(order.created_at).toLocaleString()}</div>
                    </div>
                    <div className="font-bold text-primary text-sm">{formatPrice(order.total_ugx, order.total_usd, currency)}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-muted rounded-xl p-2">
                    <div>
                      <div className="font-semibold uppercase text-[9px] tracking-wide text-muted-foreground mb-1">Buyer</div>
                      <div className="font-medium">{buyer?.full_name ?? "—"}</div>
                      <div className="flex items-center gap-1 text-muted-foreground"><Mail className="w-3 h-3" />{buyer?.email}</div>
                      <div className="flex items-center gap-1 text-muted-foreground"><Phone className="w-3 h-3" />{order.buyer_phone}</div>
                      <div className="flex items-center gap-1 text-muted-foreground"><MapPin className="w-3 h-3" />{order.buyer_location}</div>
                    </div>
                    <div>
                      <div className="font-semibold uppercase text-[9px] tracking-wide text-muted-foreground mb-1">Seller</div>
                      <div className="font-medium">{seller?.full_name ?? "—"}</div>
                      <div className="flex items-center gap-1 text-muted-foreground"><Mail className="w-3 h-3" />{seller?.email}</div>
                      <div className="flex items-center gap-1 text-muted-foreground"><Phone className="w-3 h-3" />{seller?.phone}</div>
                      <div className="flex items-center gap-1 text-muted-foreground"><MapPin className="w-3 h-3" />{seller?.location}</div>
                    </div>
                  </div>
                  {order.notes && <p className="text-xs italic text-muted-foreground">Note: {order.notes}</p>}
                  <Select value={order.status} onValueChange={(value) => setStatus(order.id, value as any)}>
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
            {profiles.map((profile) => (
              <Card key={profile.id} className="p-3 shadow-card border-0">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-sm">{profile.full_name || "Unnamed"}</div>
                    <span className="text-[10px] uppercase font-bold tracking-wide bg-accent/30 px-2 py-0.5 rounded-full">{profile.account_type}</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
                  <div className="flex items-center gap-1"><Mail className="w-3 h-3" />{profile.email}</div>
                  <div className="flex items-center gap-1"><Phone className="w-3 h-3" />{profile.phone}</div>
                  <div className="flex items-center gap-1"><MapPin className="w-3 h-3" />{profile.location}</div>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="products" className="space-y-2 mt-4">
            {products.map((product) => (
              <Card key={product.id} className="p-3 shadow-card border-0 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">{product.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{product.location}</div>
                  <div className="text-xs font-bold text-primary">{formatPrice(product.price_ugx, product.price_usd, currency)} / {product.unit}</div>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wide bg-secondary px-2 py-0.5 rounded-full">{product.moderation_status}</span>
              </Card>
            ))}
            {products.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No listings yet.</p>}
          </TabsContent>
        </Tabs>
      </div>

      <ProductEditDialog product={editProduct} onClose={() => setEditProduct(null)} onSave={moderateProduct} />
      <VerificationReviewDialog v={reviewV} onClose={() => setReviewV(null)} onAction={setVerificationStatus} />
    </AppShell>
  );
}

function ProductEditDialog({
  product,
  onClose,
  onSave,
}: {
  product: any;
  onClose: () => void;
  onSave: (id: string, status: "approved" | "rejected" | "requires_changes", patch?: any) => void;
}) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    setData(product);
  }, [product?.id]);

  if (!data) return null;

  const set = (key: string, value: any) => setData({ ...data, [key]: value });

  return (
    <Dialog open={!!product} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Review & Edit Listing</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <label className="block">
            <span className="text-xs">Title</span>
            <Input value={data.title ?? ""} onChange={(e) => set("title", e.target.value)} />
          </label>
          <label className="block">
            <span className="text-xs">Description</span>
            <Textarea rows={3} value={data.description ?? ""} onChange={(e) => set("description", e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className="text-xs">Price UGX</span>
              <Input type="number" value={data.price_ugx ?? 0} onChange={(e) => set("price_ugx", Number(e.target.value))} />
            </label>
            <label>
              <span className="text-xs">Price USD</span>
              <Input type="number" step="0.01" value={data.price_usd ?? 0} onChange={(e) => set("price_usd", Number(e.target.value))} />
            </label>
            <label>
              <span className="text-xs">Unit</span>
              <Input value={data.unit ?? ""} onChange={(e) => set("unit", e.target.value)} />
            </label>
            <label>
              <span className="text-xs">Qty</span>
              <Input type="number" value={data.quantity_available ?? 0} onChange={(e) => set("quantity_available", Number(e.target.value))} />
            </label>
          </div>
          <label className="block">
            <span className="text-xs">Moderation notes</span>
            <Textarea rows={2} value={data.moderation_notes ?? ""} onChange={(e) => set("moderation_notes", e.target.value)} />
          </label>
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1 rounded-full"
              onClick={() =>
                onSave(data.id, "approved", {
                  title: data.title,
                  description: data.description,
                  price_ugx: data.price_ugx,
                  price_usd: data.price_usd,
                  unit: data.unit,
                  quantity_available: data.quantity_available,
                  moderation_notes: data.moderation_notes,
                })
              }
            >
              Save & Approve
            </Button>
            <Button variant="outline" className="rounded-full" onClick={() => onSave(data.id, "requires_changes", { moderation_notes: data.moderation_notes })}>
              Request Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VerificationReviewDialog({
  v,
  onClose,
  onAction,
}: {
  v: any;
  onClose: () => void;
  onAction: (id: string, status: "approved" | "info_required" | "suspended" | "rejected", notes?: string) => void;
}) {
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setNotes(v?.admin_notes ?? "");
  }, [v?.id]);

  if (!v) return null;

  return (
    <Dialog open={!!v} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Verification Review</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <Row label="Name" value={v.full_legal_name} />
          <Row label="Phone" value={v.contact_number} />
          <Row label="Email" value={v.email} />
          <Row label="Location" value={[v.district, v.parish, v.village].filter(Boolean).join(", ")} />
          <Row label="Crops" value={v.crops} />
          <Row label="Acres" value={v.acres?.toString()} />
          <Row label="Bags" value={v.bags_available?.toString()} />
          <Row label="Availability" value={v.availability_timeline} />
          <Row label="MoMo" value={`${v.momo_network ?? ""} ${v.momo_number ?? ""} (${v.momo_name ?? ""})`} />
          {v.farm_photos?.length || v.crop_photos?.length ? (
            <div className="grid grid-cols-3 gap-1 pt-2">
              {[...(v.farm_photos ?? []), ...(v.crop_photos ?? [])].map((src: string, index: number) => (
                <a key={index} href={src} target="_blank" rel="noreferrer">
                  <img src={src} alt="Verification evidence" className="aspect-square w-full object-cover rounded-lg" />
                </a>
              ))}
            </div>
          ) : null}
          <label className="block pt-2">
            <span className="text-xs">Admin notes</span>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button className="rounded-full" onClick={() => onAction(v.id, "approved", notes)}>Approve</Button>
            <Button variant="outline" className="rounded-full" onClick={() => onAction(v.id, "info_required", notes)}>Request Info</Button>
            <Button variant="outline" className="rounded-full" onClick={() => onAction(v.id, "suspended", notes)}>Suspend</Button>
            <Button variant="destructive" className="rounded-full" onClick={() => onAction(v.id, "rejected", notes)}>Reject</Button>
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
