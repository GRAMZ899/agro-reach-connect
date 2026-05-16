import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const schema = z.object({
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
  price_ugx: z.coerce.number().min(0).max(1e10),
  price_usd: z.coerce.number().min(0).max(1e7),
  unit: z.string().trim().min(1).max(20),
  quantity_available: z.coerce.number().min(0).max(1e7),
  location: z.string().trim().min(2).max(120),
  category: z.string().trim().max(40).optional(),
});

export function ProductForm({
  open,
  onOpenChange,
  sellerId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sellerId: string;
  onSaved?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceUgx, setPriceUgx] = useState("");
  const [priceUsd, setPriceUsd] = useState("");
  const [unit, setUnit] = useState("kg");
  const [qty, setQty] = useState("10");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("Vegetables");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function pick(f: File | null) {
    setFile(f);
    if (f) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  }

  async function submit() {
    const parsed = schema.safeParse({
      title, description, price_ugx: priceUgx, price_usd: priceUsd, unit,
      quantity_available: qty, location, category,
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setLoading(true);
    let image_url: string | null = null;
    if (file) {
      const path = `${sellerId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("products").upload(path, file, { upsert: false });
      if (upErr) { toast.error(upErr.message); setLoading(false); return; }
      image_url = supabase.storage.from("products").getPublicUrl(path).data.publicUrl;
    }
    const { error } = await supabase.from("products").insert({
      ...parsed.data,
      description: parsed.data.description ?? null,
      category: parsed.data.category ?? null,
      seller_id: sellerId,
      image_url,
      available: true,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Product posted!");
    onSaved?.();
    onOpenChange(false);
    setTitle(""); setDescription(""); setPriceUgx(""); setPriceUsd("");
    setQty("10"); setLocation(""); setFile(null); setPreview(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-display">Post a Product</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <label className="block">
            <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-border bg-muted flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition">
              {preview ? (
                <img src={preview} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <ImageIcon className="w-8 h-8" />
                  <span className="text-xs">Tap to add photo</span>
                </div>
              )}
            </div>
            <input type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" size="sm" className="rounded-full"
              onClick={() => (document.querySelector('input[capture]') as HTMLInputElement)?.click()}>
              <Camera className="w-4 h-4 mr-1" /> Camera
            </Button>
            <Button type="button" variant="outline" size="sm" className="rounded-full"
              onClick={() => { const i = document.createElement("input"); i.type="file"; i.accept="image/*";
                i.onchange = (e: any) => pick(e.target.files?.[0] ?? null); i.click(); }}>
              <Upload className="w-4 h-4 mr-1" /> Gallery
            </Button>
          </div>

          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Fresh Tomatoes" /></div>
          <div><Label>Category</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={500} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Price (UGX)</Label><Input type="number" min="0" value={priceUgx} onChange={(e) => setPriceUgx(e.target.value)} /></div>
            <div><Label>Price (USD)</Label><Input type="number" min="0" step="0.01" value={priceUsd} onChange={(e) => setPriceUsd(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Unit</Label><Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="kg, bunch…" /></div>
            <div><Label>Qty available</Label><Input type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} /></div>
          </div>
          <div><Label>Farm location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="District, Village" /></div>
          <Button onClick={submit} disabled={loading} className="w-full rounded-full">
            {loading ? "Posting…" : "Post Product"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
