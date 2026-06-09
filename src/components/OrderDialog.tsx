import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatPrice, type Currency } from "@/lib/currency";
import { createOrder } from "@/lib/orders.functions";
import type { ProductRow } from "./ProductCard";
import { z } from "zod";

const schema = z.object({
  quantity: z.coerce.number().min(0.1).max(100000),
  buyer_phone: z.string().trim().min(7).max(20),
  buyer_location: z.string().trim().min(2).max(200),
  notes: z.string().trim().max(500).optional(),
});

export function OrderDialog({
  product,
  open,
  onOpenChange,
  currency,
  buyerId,
  defaultPhone,
  defaultLocation,
}: {
  product: ProductRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currency: Currency;
  buyerId: string;
  defaultPhone?: string;
  defaultLocation?: string;
}) {
  const [qty, setQty] = useState("1");
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [location, setLocation] = useState(defaultLocation ?? "");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const createOrderFn = useServerFn(createOrder);

  if (!product) return null;
  const total_ugx = Number(qty || 0) * Number(product.price_ugx || 0);
  const total_usd = Number(qty || 0) * Number(product.price_usd || 0);
  const numQty = Number(qty || 0);
  const overStock = numQty > Number(product.quantity_available || 0);

  async function submit() {
    const parsed = schema.safeParse({ quantity: qty, buyer_phone: phone, buyer_location: location, notes });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    if (parsed.data.quantity > Number(product!.quantity_available || 0)) {
      toast.error(`Only ${product!.quantity_available} ${product!.unit} available`);
      return;
    }
    setLoading(true);
    try {
      await createOrderFn({
        data: {
          productId: product!.id,
          quantity: parsed.data.quantity,
          buyerPhone: parsed.data.buyer_phone,
          buyerLocation: parsed.data.buyer_location,
          notes: parsed.data.notes ?? null,
          currency,
        },
      });
    } catch (error: any) {
      setLoading(false);
      toast.error(error.message || "Failed to place order");
      return;
    }
    setLoading(false);
    toast.success("Order placed! The admin will coordinate delivery.");
    onOpenChange(false);
    setQty("1");
    setNotes("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Order {product.title}</DialogTitle>
          <DialogDescription>Your contact stays private. Only the admin sees it.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between">
              <Label>Quantity ({product.unit})</Label>
              <span className="text-[11px] text-muted-foreground">{product.quantity_available} {product.unit} available</span>
            </div>
            <Input type="number" min="0.1" max={product.quantity_available} step="0.1" value={qty} onChange={(e) => setQty(e.target.value)} />
            {overStock && <p className="text-[11px] text-destructive mt-1">Exceeds available stock</p>}
          </div>
          <div>
            <Label>Your phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+256 7…" />
          </div>
          <div>
            <Label>Delivery location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="District, Town" />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} />
          </div>
          <div className="bg-muted p-3 rounded-xl flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-bold text-primary text-lg">{formatPrice(total_ugx, total_usd, currency)}</span>
          </div>
          <Button onClick={submit} disabled={loading || overStock || numQty <= 0} className="w-full rounded-full">
            {loading ? "Placing…" : "Place Order"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
